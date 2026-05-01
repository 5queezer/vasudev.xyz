---
title: "Lanzando soporte del protocolo A2A en Rust: 7 inconvenientes que nadie te advierte"
date: 2026-03-25
description: "Lo que aprendí al añadir soporte para el protocolo Agent-to-Agent a un framework de agentes de código abierto."
images: ["/images/shipping-a2a-protocol-support-in-rust-og.png"]
author: "Christian Pojoni"
tags: ["rust", "a2a", "security"]
series: ["Field Notes"]
translationHash: "e290bfc379275379386cba67f78293e5"
chunkHashes: "a794b355e8c4a403,7d3e0b3378417e09,aa7513a6486f8faf,a825fb9bc8a4bae3,5dea57e52b8e70d4,28ed198a8cd428fc,685d9c5b09d7dcf3,6eadb412a20580a0,7262b64366b7ff90,e9307644648922c1"
---
[El protocolo A2A (Agent-to-Agent)](https://github.com/google/A2A) es el estándar abierto de Google para la interoperabilidad entre agentes: descubrimiento, delegación de tareas, gestión del ciclo de vida a través de HTTP/JSON‑RPC. Se sitúa al lado de MCP de la misma forma en que TCP está al lado de USB: uno conecta agentes con agentes, el otro conecta agentes con herramientas.

Recientemente envié [PR #4166](https://github.com/5queezer/hrafn/pull/4166) añadiendo soporte nativo de A2A a Hrafn. Eso implica tanto un servidor JSON‑RPC 2.0 entrante como una herramienta cliente saliente, escritas en Rust. El PR superó 40 pruebas y se ejecutó de extremo a extremo en cinco instancias de Raspberry Pi Zero 2 W. En el camino me topé con cada borde afilado que la especificación no menciona.

**La especificación de A2A está limpia en papel. Los bordes de seguridad te atraparán en producción.**
## 1. Las tarjetas de agente no están autenticadas por diseño, y eso está bien

La especificación de A2A dice que `GET /.well-known/agent-card.json` debe ser accesible públicamente. Sin token bearer, sin clave API. Instinto inicial: eso es una fuga de información.

No lo es. La tarjeta de agente es metadatos (nombre, descripción, capacidades, URL del endpoint). Piensa en ella como DNS para agentes. No pondrías DNS detrás de autenticación.

El verdadero truco: si derivás `public_url` de la dirección de enlace de tu gateway, filtras la topología interna de tu red. `0.0.0.0:3000` en una tarjeta de agente le dice a un atacante exactamente dónde sondear. Siempre requiere un `public_url` explícito en la configuración, y emite una advertencia de inicio si falta.

```rust
if a2a_config.public_url.is_none() {
    warn!(
        "A2A agent card will expose internal bind address. \
         Set [a2a].public_url to avoid leaking network topology."
    );
}
```
## 2. La comparación de tokens bearer debe ser de tiempo constante

Si tu servidor A2A acepta tokens bearer, necesitas una comparación de tiempo constante. No porque tu modelo de amenaza incluya ataques de temporización de estados nación contra un framework de bots de Telegram, sino porque te cuesta exactamente dos líneas y elimina toda una clase de vulnerabilidades.

El operador estándar `==` en strings hace short‑circuit en el primer byte que no coincide. Un atacante que pueda medir los tiempos de respuesta con suficiente precisión podría forzar los tokens byte a byte. ¿Improbable? Sí. ¿Preventable? También sí.

```rust
use subtle::ConstantTimeEq;

fn verify_token(provided: &str, expected: &str) -> bool {
    let provided_bytes = provided.as_bytes();
    let expected_bytes = expected.as_bytes();
    if provided_bytes.len() != expected_bytes.len() {
        return false;
    }
    provided_bytes.ct_eq(expected_bytes).into()
}
```

El crate `subtle` te brinda `ct_eq`. Úsalo. La comprobación de longitud antes de la comparación es intencional. La longitud en sí no es secreta (está en tu configuración), y evita la asignación de un búfer de tamaño fijo.
## 3. La protección contra SSRF es más difícil de lo que crees

Tu herramienta cliente A2A permite que el agente llame a URLs arbitrarias: `discover https://agent.example.com`. Eso está a una llamada HTTP de `discover http://169.254.169.254/latest/meta-data/` en cualquier instancia en la nube.

Bloquear IPs privadas parece sencillo hasta que te das cuenta de que:

**IPv4 mapeado a IPv6 evade las comprobaciones ingenuas.** `::ffff:127.0.0.1` es localhost. `::ffff:169.254.169.254` es el endpoint de metadatos de la nube. Tu lista de bloqueo necesita manejar ambas familias de direcciones.

**La resolución DNS ocurre dos veces.** Validas el nombre de host, se resuelve a una IP pública. Tu cliente HTTP se conecta, pero el DNS ha cambiado (rebinding DNS). Ahora estás alcanzando una IP interna. Esto es una brecha TOCTOU (tiempo de comprobación, tiempo de uso). La única solución real es resolver DNS tú mismo, validar la IP y luego conectar directamente a esa IP.

**Los redireccionamientos reabren la puerta.** Validas la URL inicial, pero el servidor te redirige a `http://localhost:8080/admin`. Tu política de redirección debe volver a validar cada salto.

```rust
fn is_private_ip(ip: &IpAddr) -> bool {
    match ip {
        IpAddr::V4(v4) => {
            v4.is_loopback()
                || v4.is_private()
                || v4.is_link_local()
                || v4.octets()[0..2] == [169, 254] // metadata
        }
        IpAddr::V6(v6) => {
            v6.is_loopback()
                || is_ipv4_mapped_private(v6)  // ::ffff:10.x.x.x etc.
        }
    }
}
```

Documenta la brecha TOCTOU con honestidad. Dejé un comentario en el código y una nota en el PR: "DNS rebinding TOCTOU acknowledged. Peer allowlist planned in [#4643](https://github.com/5queezer/hrafn/issues/4643)."
## 4. A2A en el mismo host rompe tu propia protección SSRF

Aquí está la ironía: construí una protección SSRF que bloquea localhost. Luego desplegué cinco instancias de Hrafn en una única Raspberry Pi, y no podían comunicarse entre sí.

A2A multi‑instancia en el mismo host es un caso de uso legítimo. Múltiples agentes especializados en una máquina se comunican a través de `localhost:300X`. Pero tu lista de bloqueo SSRF simplemente lo bloqueó.

La solución es un bypass condicional (`allow_local`), derivado de la configuración en lugar de la entrada del usuario:

```rust
let allow_local = a2a_config
    .public_url
    .as_ref()
    .map(|u| is_local_url(u))
    .unwrap_or(false);
```

Si tu propio `public_url` apunta a localhost, claramente estás ejecutando localmente, por lo que se esperan llamadas salientes a localhost. Si `public_url` es un dominio real, localhost sigue bloqueado.

Riesgo residual conocido: `allow_local` es un bypass general. Una lista de permitidos de pares (IP/puertos específicos) es la corrección a largo plazo adecuada. Implementa el bypass, documenta el riesgo y abre el issue de seguimiento.
## 5. TaskStore necesita un límite, o tendrás un DoS gratuito

Las tareas A2A son con estado. Cada `message/send` crea una entrada de tarea. Si almacenas las tareas en memoria (razonable para la v1), un atacante puede enviar 100 000 solicitudes y agotar tu heap.

Límitalas. Yo usé 10 000 con una respuesta 503 cuando está lleno:

```rust
const MAX_TASKS: usize = 10_000;

async fn create_task(&self, task: Task) -> Result<(), A2aError> {
    let store = self.tasks.read().await;
    if store.len() >= MAX_TASKS {
        return Err(A2aError::ServiceUnavailable);
    }
    drop(store);
    self.tasks.write().await.insert(task.id.clone(), task);
    Ok(())
}
```

Una constante, una verificación, un camino de error. Sin política de expulsión en la v1. Esa es la complejidad para el seguimiento. El límite por sí solo evita el bloqueo.

¿Por qué 10 000? Aproximación: cada `Task` ocupa entre 2 y 4 KB serializado. 10 K tareas = 20‑40 MB. Aceptable en una Pi Zero 2 W con 512 MB de RAM. Ajusta según el hardware objetivo.
## 6. Los mensajes de error son un canal de información

Cuando falla una solicitud entrante de A2A, ¿qué devuelves?

```json
{"error": {"code": -32600, "message": "Task abc-123 not found in store"}}
```

Acabas de confirmar que `abc-123` es un formato válido de ID de tarea y que tu almacén está indexado por él. Un atacante puede enumerar los IDs de tareas.

Redacta los errores salientes. Registra el detalle completo del lado del servidor:

```rust
// Al llamador:
Err(json_rpc_error(-32600, "invalid request"))

// En tus registros:
error!(task_id = %id, "task not found in store");
```

Error genérico para el llamador. Error específico en tus registros. El mismo principio que en aplicaciones web, pero fácil de olvidar cuando construyes un manejador de protocolo y piensas en respuestas útiles de JSON‑RPC.
## 7. La herramienta existe pero el modelo no la ve

Esto me costó una tarde de depuración.

La herramienta A2A estaba registrada en el registro de herramientas de Hrafn. `cargo test` pasó. La pasarela servía tarjetas de agente. Pero cuando realmente ejecuté una instancia y le pedí que contactara a otro agente, el modelo no tenía idea de que la herramienta existía.

El problema: Hrafn usa una lista de descripciones de herramientas basada en texto en su prompt de sistema de bootstrap para modelos que no admiten llamadas a funciones nativas (como algunas variantes de OpenAI Codex). La herramienta estaba en el registro pero no en el arreglo `tool_descs` que se inyecta en el prompt.

```rust
if config.a2a.enabled {
    tool_descs.push((
        "a2a",
        "Communicate with remote A2A-compatible agents. Actions: \
         'discover', 'send', 'status', 'result'.",
    ));
}
```

Lección: prueba todo el flujo. Las pruebas unitarias demostraron que la herramienta funcionaba cuando se llamaba. Las pruebas de integración demostraron que la pasarela aceptaba solicitudes. Pero el modelo nunca llamó a la herramienta porque no sabía que existía. Las pruebas E2E (inferencia real del modelo hablando con puntos finales reales) capturaron lo que las pruebas unitarias no pudieron.
## Lo que omití (intencionalmente)

El PR explícitamente no incluye:

* **Streaming SSE.** A2A lo soporta, pero las solicitudes/respuestas síncronas cubren el 90 % de los casos de uso. El streaming es aditivo, no fundamental.
* **mTLS/OAuth.** Los tokens Bearer son suficientes para el modelo de confianza (mismo host, pares conocidos). La autenticación basada en certificados es una complejidad de nivel empresarial para un despliegue en Raspberry Pi. Ver también: [Adding OAuth 2.1 to a Self-Hosted MCP Server](/blog/adding-oauth-mcp-server-gotchas/).
* **Registro de agentes.** El descubrimiento es manual (configuras la URL). El registro automático/mDNS está planeado en el issue posterior.
* **Desalojo de tareas.** El límite de 10 K es una barrera rígida, no una caché LRU. Suficiente para la v1.

Cada “no incluido” es una decisión de alcance, no una brecha. La descripción del PR enumera cada uno con un enlace al issue de seguimiento. Los revisores pueden ver exactamente qué se consideró y se pospuso.
## La configuración que demostró que funciona

Cinco instancias de Hrafn en una única Raspberry Pi Zero 2 W (ARM de cuatro núcleos, 512 MB), cada una con una personalidad distinta (Kerf, Sentinel, Architect, Critic, Researcher), comunicándose mediante A2A en los puertos localhost 3001‑3005. Respaldado por gpt-5.1-codex-mini.

La instancia A descubre la tarjeta de agente de la instancia B, envía una tarea ("revisa este código en busca de problemas de seguridad"), recibe una respuesta a través de la canalización estándar `process_message`. No hay orquestación personalizada. La capa A2A es simplemente otro canal de entrada.

Si funciona en una Pi Zero, funciona en cualquier lugar.

Lee la implementación completa en [PR #4166](https://github.com/5queezer/hrafn/pull/4166). Cada truco mencionado arriba corresponde a un commit específico con pruebas. Si estás integrando A2A en tu propio framework, comienza con la protección SSRF en `a2a_client.rs` y la capacidad TaskStore en `task_store.rs`. El seguimiento para el descubrimiento de pares y mDNS LAN está registrado en [#4643](https://github.com/5queezer/hrafn/issues/4643).

---

*Christian Pojoni desarrolla [Hrafn](https://github.com/5queezer/hrafn), un runtime de agentes en Rust para hardware de borde. Más en [vasudev.xyz](https://vasudev.xyz).*

*La imagen de portada de este post fue generada por IA.*
---
title: "Envío de soporte para el protocolo A2A en Rust: 7 errores que nadie advierte"
date: 2026-03-25
description: "Lo que aprendíal agregar soporte de protocolo agente-agente a un marco de agentes de código abierto."
images: ["/images/shipping-a2a-protocol-support-in-rust-og.png"]
author: "Christian Pojoni"
tags: ["rust", "a2a", "security"]
series: ["Field Notes"]
translationHash: "e49e1a8762cabb38544bf8328b98c93d"
chunkHashes: "464e3e41b8d8b968,7d3e0b3378417e09,aa7513a6486f8faf,a825fb9bc8a4bae3,5dea57e52b8e70d4,28ed198a8cd428fc,685d9c5b09d7dcf3,6eadb412a20580a0,7262b64366b7ff90,e9307644648922c1"
---
The [A2A (Agent-to-Agent) protocol](https://github.com/google/A2A) es el estándar abierto de Google para la interoperabilidad de agentes: descubrimiento, delegación de tareas, gestión del ciclo de vida sobre HTTP/JSON-RPC. Se sitúa junto a MCP de la misma manera que TCP se sitúa junto a USB: uno conecta agentes con agentes, el otro conecta agentes con herramientas.

Recientemente envié [PR #4166](https://github.com/5queezer/hrafn/pull/4166) añadiendo soporte nativo de A2A a Hrafn. Eso significa tanto un servidor JSON-RPC 2.0 inbound como una herramienta cliente outbound, escrita en Rust. La PR pasó 40 pruebas y ejecutó E2E en cinco instancias de Raspberry Pi Zero 2 W. En el camino descubrí cada borde afilado que la especificación no menciona.

**La especificación A2A es limpia en papel. Las aristas de seguridad te cortarán en producción.**
## 1. Lastarjetas de agente son una opción no autenticada por diseño, y está bien

**La especificación A2A es limpia en papel. Los bordes de seguridad te van a cortar en producción.** The A2A spec says `GET /.well-know...` The [A2A (Agent-to-Agent) protocol](https://google.github.io/A2A/) is Google's open standard for agent interoperability: discovery, task delegation, lifecycle management over HTTP/JSON-RPC. It sits next to MCP the way TCP sits next to USB: one connects agents to agents, the other connects agents to tools.

Recientemente envié [PR #4166](https://github.com/5queezer/hrafn/pull/4166) añadiendo soporte nativo A2A a Hrafn. Eso significa tanto un servidor JSON-RPC 2.0 entrante como una herramienta cliente saliente, escritos en Rust. La PR pasó 40 pruebas y ejecutó E2E en cinco Raspberry Pi Zero 2 W. En el proceso golpeé cada borde afilado que la especificación no menciona.

**La especificación A2A es limpia en papel. Los bordes de seguridad te van a cortar en producción.**
## 1. Agent Cards sonsin autenticación por diseño, y está bienLa especificación A2A indica que `GET /.well-known/agent-card.json` debe ser públicamente accesible. No se requiere token portador ni clave API. La primera intuición: se trata de una filtración de información.

No lo es. La tarjeta de agente es metadatos (nombre, descripción, capacidades, URL de endpoint). Piensa en ella como DNS para agentes. No colocarías DNS detrás de autenticación.

El verdadero problema: si obtienes `public_url` a partir de la dirección de enlace de tu gateway, filtras tu topología de red interna. `0.0.0.0:3000` en una tarjeta de agente indica a un atacante exactamente dónde sondear. Siempre requiere una `public_url` explícita en la configuración, y emite una advertencia de inicio si falta.

```rust
if a2a_config.public_url.is_none() {
    warn!(
        "A2A agent card will expose internal bind address. \
         Set [a2a].public_url to avoid leaking network topology."
    );
}
```
##2. Comparación de tokens Bearer debe ser constante en tiempo

Si tu servidor A2A acepta tokens Bearer, necesitas una comparación de tiempo constante. No porque tu modelo de amenaza incluya ataques de tiempo a nivel de Estado-nación en un framework de bots de Telegram, sino porque te cuesta exactamente dos líneas y elimina una clase completa de vulnerabilidades.

El operador estándar `==` en cadenas corta en el primer byte desigual. Un atacante que pueda medir los tiempos de respuesta con suficiente precisión puede forzar por fuerza bruta los tokens byte a byte. ¿Poco probable? Sí. ¿Prevencible? También sí.

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

El crata `subtle` te proporciona `ct_eq`. Úsalo. La verificación de longitud antes de la comparación es intencional. La longitud en sí no es un secreto (está en tu configuración), y evita asignar un búfer de tamaño fijo.
## 3. La protección SSRF es más difícil de lo que piensas

Tu herramienta cliente A2A permite al agente llamar a URLs arbitrarias: `discover https://agent.example.com`. Eso es una llamada HTTP de distancia de `discover http://169.254.169.254/latest/meta-data/` en cualquier instancia en la nube.

**Bypass de IPv4-mapped IPv6 evita comprobaciones ingenuas.** `::ffff:127.0.0.1` es localhost. `::ffff:169.254.169.254` es el punto final de metadatos de la nube. Tu lista de bloqueo necesita manejar ambos tipos de direcciones.

La resolución DNS ocurre dos veces. Validas el hostname, se resuelve a una IP pública. Tu cliente HTTP se conecta, pero DNS cambia (DNS rebinding). Ahora estás alcanzando una IP interna. Esto es un hueco TOCTOU (time-of-check, time-of-use). La única solución real es resolver el DNS tú mismo, validar la IP y conectarte a esa IP directamente.

**Los redirecciones vuelven a abrir la puerta.** Validas la URL inicial, pero el servidor te redirige a `http://localhost:8080/admin`. Tu política de redirección necesita volver a validar cada salto.

```rust
fn is_private_ip(ip: &IpAddr) -> bool {
    match ip {
        IpAddr::V4(v4) => {
            v4.is_loopback()
                || v4.is_private()
                || v4.octets()[0..2] == [169, 254] // metadata
        }
        IpAddr::V6(v6) => {
            v6.is_loopback()
                || is_ipv4_mapped_private(v6)  // ::ffff:10.x.x.x etc.
        }
    }
}
```

Documenta la brecha TOCTOU honestamente. Dejé un comentario en el código y una nota en el PR: "DNS rebinding TOCTOU acknowledged. Peer allowlist planned in [#4643](https://github.com/5queezer/hrafn/issues/4643)."
## 4. Same-host A2A breaks your own SSRF protection

Aquí está la ironía: construí una protección SSRF que bloquea localhost. Luego desplegué cinco instancias de Hrafn en una sola Raspberry Pi, y no podían comunicarse entre sí.

Same-host multi-instance A2A is a legitimate use case. Multiple specialized agents on one machine communicate over `localhost:300X`. But your SSRF blocklist just blocked it.

La solución es un bypass condicional (`allow_local`), derivado de la configuración en lugar de la entrada del usuario:

```rust
let allow_local = a2a_config
    .public_url    .as_ref()
    .map(|u| is_local_url(u))
    .unwrap_or(false);
```

Si tu propia `public_url` apunta a localhost, claramente estás ejecutando localmente, por lo que las llamadas salientes a localhost son esperadas. Si `public_url` es un dominio real, localhost permanece bloqueado.

Riesgo residual conocido: `allow_local` es un bypass genérico. Una lista de permisos de pares (IPs/puertos específicos) es la solución a largo plazo correcta. Implementa el bypass, documenta el riesgo y abre el seguimiento correspondiente.
## 5. TaskStore necesita un límite, o tendrás un DoS gratuito

Las tareas A2A son estado. Cada `message/send` crea una entrada de tarea. Si almacenas tareas en memoria (razonable para v1), un atacante puede enviar 100 000 solicitudes y agotar tu heap.

Límítalo. Usé 10 000 con una respuesta 503 cuando se llena:

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

Una constante, una comprobación y una ruta de error. No hay política de evicción en v1. Esa complejidad es para el seguimiento. El límite por sí solo evita el colapso.

¿Por qué 10 000? En una estimación rápida: cada `Task` tiene aproximadamente 2‑4 KB serializados. 10K tasks = 20‑40 MB. Aceptable en una Raspberry Pi Zero 2 W con 512 MB de RAM. Ajusta según tu hardware objetivo.
## 6. Los mensajes de error son un canal de informaciónCuando una solicitud A2A entrante falla, ¿qué devuelves?

```json
{"error": {"code": -32600, "message": "Task abc-123 not found in store"}}
```

Acabas de confirmar que `abc-123` es un formato válido de ID de tarea y que tu store está indexado por él. Un atacante puede enumerar IDs de tareas.

Redacta errores salientes. Registra los detalles completos del lado del servidor:

```rust
// To the caller:
Err(json_rpc_error(-32600, "invalid request"))

// In your logs:
error!(task_id = %id, "task not found in store");
```

Error genérico para el llamador. Error específico en tus logs. El mismo principio que en aplicaciones web, pero es fácil olvidarlo cuando construyes un manejador de protocolo y piensas en respuestas JSON-RPC útiles.
##7. La herramienta existe pero el modelo no la ve

Esta me costó una tarde de depuración.

La herramienta A2A se registró en el registro de herramientas de Hrafn. `cargo test` pasó. El gateway sirvió tarjetas de agente. Pero cuando ejecuté una instancia y le pedí que contactara a otro agente, el modelo no tenía idea de que la herramienta existiera.

El problema: Hrafn usa una lista descriptiva basada en texto del sistema para los modelos que no soportan llamadas a funciones nativas (como algunas variantes de OpenAI Codex). La herramienta estaba en el registro pero no en el array `tool_descs` que se inyecta en el prompt.

```rust
if config.a2a.enabled {
    tool_descs.push((
        "a2a",
        "Communicate with remote A2A-compatible agents. Actions: \
         'discover', 'send', 'status', 'result'.",
    ));
}
```

Lección: pruebe el camino completo. Las pruebas unitarias demostraron que la herramienta funcionaba cuando se llamaba. Las pruebas de integración demostraron que el gateway aceptó las solicitudes. Pero el modelo nunca llamó a la herramienta porque no sabía que existía. Las pruebas E2E (inferencia real del modelo hablando con endpoints reales) detectaron lo que las pruebas unitarias no podían.
---
## Qué dejé fuera(intencionalmente)

La PR explícitamente no incluye:

* **SSE streaming.** El protocolo A2A lo soporta, pero la solicitud/respuesta sincrónica cubre el 90 % de los casos de uso. El streaming es aditivo, no fundamental.
* **mTLS/OAuth.** Los tokens Bearer son suficientes para el modelo de confianza (mismo host, pares conocidos). La autenticación basada en certificados es complejidad de nivel empresarial para una implementación en Pi. See also: [Adding OAuth 2.1 to a Self-Hosted MCP Server](/blog/adding-oauth-mcp-server-gotchas/).
* **Agent registry.** El descubrimiento es manual (configuras la URL tú mismo). El registro automático/mDNS está planeado en el issue de seguimiento.
* **Task eviction.** El límite de 10K es una pared dura, no una caché LRU. Suficiente para v1.
## La configuración que lo demostró funciona

Cinco instancias de Hrafn en una sola Raspberry Pi Zero 2 W (ARM de cuatro núcleos, 512 MB), cada una con una personalidad distinta (Kerf, Sentinel, Architect, Critic, Researcher), comunicándose vía A2A en puertos locales 3001‑3005. Soportado por gpt-5.1-codex-mini.

La Instancia A descubre la tarjeta de agente de la Instancia B, envía una tarea (“review this code for security issues”), recibe una respuesta a través del canal estándar `process_message`. Sin orquestación personalizada. La capa A2A es solo otro canal de entrada.

Si funciona en un Pi Zero, funciona en cualquier lugar.

Lee la implementación completa en [PR #4166](https://github.com/5queezer/hrafn/pull/4166). Cada uno de los puntos anteriores se corresponde con un commit específico que incluye pruebas. Si estás construyendo A2A en tu propio framework, empieza por la protección SSRF en `a2a_client.rs` y el límite de TaskStore en `task_store.rs`. La eventualidad para el descubrimiento de pares y el mDNS en LAN se registra en [#4643](https://github.com/5queezer/hrafn/issues/4643).

---

*Christian Pojoni construye [Hrafn](https://github.com/5queezer/hrafn), un runtime de agentes en Rust para hardware de borde. Más en [vasudev.xyz](https://vasudev.xyz).*

*La imagen de portada de esta publicación fue generada por IA.*

## The setup thatproved it works

Cinco instancias de Hrafn en una sola Raspberry Pi Zero 2 W (cuádruple núcleo ARM, 512 MB), cada una con una personalidad distinta (Kerf, Sentinel, Architect, Critic, Researcher), comunicándose vía A2A en puertos locales 3001-3005. Soportado por gpt-5.1-codex-mini.

La instancia A descubre la tarjeta de agente de la instancia B, envía una tarea ("revisar este código en busca de problemas de seguridad"), recibe una respuesta a través del canal estándar `process_message`. No hay orquestación personalizada. La capa A2A es solo otro canal de entrada.

Si funciona en un Pi Zero, funciona en cualquier lugar.

Lee la implementación completa en [PR #4166](https://github.com/5queezer/hrafn/pull/4166). Cada gotcha anterior se mapea a un commit específico con pruebas. Si estás construyendo A2A en tu propio framework, comienza con la protección SSRF en `a2a_client.rs` y el límite de TaskStore en `task_store.rs`. El seguimiento para descubrimiento de pares y mDNS en LAN se registra en [#4643](https://github.com/5queezer/hrafn/issues/4643).

---

*Christian Pojoni crea [Hrafn](https://github.com/5queezer/hrafn), un runtime de agentes en Rust para hardware de borde. Más en [vasudev.xyz](https://vasudev.xyz).*

*La imagen de portada de esta entrada fue generada por IA.*

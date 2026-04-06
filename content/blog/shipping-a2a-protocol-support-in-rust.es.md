---
title: "Implementación de Soporte del Protocolo A2A en Rust: 7 Trampas que Nadie Te Advierte"
date: 2026-03-25
description: "Lo que aprendí al agregar soporte de protocolo de agente a agente a un marco de agentes de código abierto."
images: ["/images/shipping-a2a-protocol-support-in-rust-og.png"]
author: "Christian Pojoni"
tags: ["rust", "a2a", "security"]
translationHash: "e20081003cfc70b752cd153b45a8210b"
---
El [protocolo A2A (Agent-to-Agent)](https://google.github.io/A2A/) es el estándar abierto de Google para la interoperabilidad entre agentes: descubrimiento, delegación de tareas y gestión del ciclo de vida sobre HTTP/JSON-RPC. Se sitúa junto a MCP de la misma manera que TCP se sitúa junto a USB: uno conecta agentes con agentes, y el otro conecta agentes con herramientas.

Recientemente publiqué la [PR #4166](https://github.com/5queezer/hrafn/pull/4166) añadiendo soporte nativo para A2A a Hrafn: tanto un servidor JSON-RPC 2.0 de entrada como una herramienta cliente de salida, escritas en Rust. La PR superó 40 pruebas y se ejecutó E2E en cinco instancias Raspberry Pi Zero 2 W. En el proceso, me topé con cada uno de los escollos que la especificación omite.

**La especificación A2A es impecable sobre el papel; sus aristas de seguridad te cortarán en producción.**

## 1. Las Agent Cards no están autenticadas por diseño -- y eso está bien

La especificación de A2A indica que `GET /.well-known/agent-card.json` debe ser accesible públicamente. Sin bearer token, sin clave de API. Primer instinto: eso es una fuga de información.

No lo es. La Agent Card contiene metadatos: nombre, descripción, capacidades, URL del endpoint. Piénsalo como el DNS para los agentes. No se suele poner el DNS detrás de una autenticación.

El verdadero problema: si derivas `public_url` a partir de la dirección de enlace (bind address) de tu gateway, estarás filtrando la topología de tu red interna. Un `0.0.0.0:3000` en una Agent Card le dice a un atacante exactamente dónde sondear. Exige siempre un `public_url` explícito en la configuración y emite una advertencia al inicio si falta.

```rust
if a2a_config.public_url.is_none() {
    warn!(
        "A2A agent card will expose internal bind address. \
         Set [a2a].public_url to avoid leaking network topology."
    );
}
```

## 2. La comparación de bearer tokens debe ser en tiempo constante

Si tu servidor A2A acepta bearer tokens, necesitas una comparación en tiempo constante. No porque tu modelo de amenazas incluya ataques de temporización por parte de estados-nación contra un framework de bots de Telegram, sino porque te cuesta exactamente dos líneas y elimina toda una clase de vulnerabilidades.

El `==` estándar en cadenas de caracteres hace un corto circuito en el primer byte no coincidente. Un atacante que pueda medir los tiempos de respuesta con suficiente precisión puede forzar los tokens byte por byte. ¿Poco probable? Sí. ¿Prevenible? También.

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

La crate `subtle` te ofrece `ct_eq`. Úsalo. La comprobación de longitud antes de la comparación es intencional: la longitud en sí no es un secreto (está en tu configuración) y evita asignar un búfer de tamaño fijo.

## 3. La protección contra SSRF es más difícil de lo que piensas

Tu herramienta cliente A2A permite al agente llamar a URL arbitrarias: `discover https://agent.example.com`. Eso está a una llamada HTTP de distancia de `discover http://169.254.169.254/latest/meta-data/` en cualquier instancia en la nube.

Bloquear IPs privadas parece sencillo hasta que te das cuenta:

**Las direcciones IPv4 mapeadas en IPv6 se saltan las comprobaciones básicas.** `::ffff:127.0.0.1` es localhost. `::ffff:169.254.169.254` es el endpoint de metadatos de la nube. Tu lista de bloqueo debe manejar ambas familias de direcciones.

**La resolución DNS ocurre dos veces.** Validas el nombre de host, se resuelve en una IP pública. Tu cliente HTTP se conecta, pero el DNS ha cambiado (DN rebinding). Ahora estás accediendo a una IP interna. Esta es una brecha TOCTOU (time-of-check, time-of-use). La única solución real es resolver el DNS tú mismo, validar la IP y luego conectarte directamente a esa IP.

**Las redirecciones vuelven a abrir la puerta.** Validas la URL inicial, pero el servidor te redirige con un 302 a `http://localhost:8080/admin`. Tu política de redirección necesita revalidar cada salto.

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

Documenta la brecha TOCTOU con honestidad. Dejé un comentario en el código y una nota en la PR: "Brecha TOCTOU por DNS rebinding reconocida; lista de pares permitidos planeada en [#4643](https://github.com/5queezer/hrafn/issues/4643)."

## 4. A2A en el mismo host rompe tu propia protección contra SSRF

Aquí está la ironía: construí una protección contra SSRF que bloquea localhost. Luego implementé cinco instancias de Hrafn en una única Raspberry Pi, y no podían comunicarse entre sí.

A2A multiinstancia en el mismo host es un caso de uso legítimo: múltiples agentes especializados en una máquina, comunicándose a través de `localhost:300X`. Pero tu lista de bloqueo SSRF acaba de impedirlo.

La solución es una omisión condicional (`allow_local`), derivada de la configuración y no de la entrada del usuario:

```rust
let allow_local = a2a_config
    .public_url
    .as_ref()
    .map(|u| is_local_url(u))
    .unwrap_or(false);
```

Si tu propia `public_url` apunta a localhost, es evidente que te estás ejecutando localmente, por lo que las llamadas salientes a localhost son esperadas. Si `public_url` es un dominio real, localhost permanece bloqueado.

Riesgo residual conocido: `allow_local` es una omisión general. Una lista de pares permitidos (IPs/puertos específicos) es la solución correcta a largo plazo. Publica la excepción, documenta el riesgo y crea el issue de seguimiento.

## 5. TaskStore necesita un límite, o te expones a un DoS gratuito

Las tareas A2A tienen estado. Cada `message/send` crea una entrada de tarea. Si almacenas las tareas en memoria (razonable para la v1), un atacante puede enviar 100 000 solicitudes y agotar tu heap.

Ponle un límite. Yo usé 10 000 con una respuesta 503 cuando está lleno:

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

Una constante, una comprobación, una ruta de error. Sin política de expulsión en la v1; eso es complejidad para el seguimiento. El límite por sí solo previene el colapso.

¿Por qué 10 000? Cálculo rápido: cada `Task` ocupa aproximadamente 2-4 KB serializado. 10K tareas = 20-40 MB. Aceptable en una Pi Zero 2 W con 512 MB de RAM. Ajústalo según tu hardware objetivo.

## 6. Los mensajes de error son un canal de información

Cuando falla una solicitud A2A entrante, ¿qué devuelves?

```json
{"error": {"code": -32600, "message": "Task abc-123 not found in store"}}
```

Acabas de confirmar que `abc-123` es un formato válido de ID de tarea y que tu almacén está indexado por él. Un atacante puede enumerar los ID de tareas.

Oculta los errores salientes. Registra el detalle completo en el lado del servidor:

```rust
// To the caller:
Err(json_rpc_error(-32600, "invalid request"))

// In your logs:
error!(task_id = %id, "task not found in store");
```

Error genérico para el solicitante. Error específico en tus registros. El mismo principio que en las aplicaciones web, pero fácil de olvidar cuando estás construyendo un manejador de protocolos y pensando en términos de respuestas JSON-RPC útiles.

## 7. La herramienta existe, pero el modelo no puede verla

Esta me costó una tarde de depuración.

La herramienta A2A estaba registrada en el registro de herramientas de Hrafn. `cargo test` pasó. El gateway servía las Agent Cards. Pero cuando realmente ejecuté una instancia y le pedí que contactara a otro agente, el modelo no tenía ni idea de que la herramienta existía.

El problema: Hrafn utiliza una lista de descripciones de herramientas basada en texto en su prompt de sistema de inicio para modelos que no soportan llamada nativa a funciones (como algunas variantes de OpenAI Codex). La herramienta estaba en el registro, pero no en el array `tool_descs` que se inyecta en el prompt.

```rust
if config.a2a.enabled {
    tool_descs.push((
        "a2a",
        "Communicate with remote A2A-compatible agents. Actions: \
         'discover', 'send', 'status', 'result'.",
    ));
}
```

Lección: prueba la ruta completa. Las pruebas unitarias demostraron que la herramienta funcionaba al ser llamada. Las pruebas de integración demostraron que el gateway aceptaba solicitudes. Pero el modelo nunca llamó a la herramienta porque no sabía que existía. Las pruebas E2E (inferencia real del modelo hablando con endpoints reales) captaron lo que las pruebas unitarias pasaron por alto.

---

## Lo que dejé fuera (intencionalmente)

La PR explícitamente no incluye:

* **Streaming SSE** -- A2A lo soporta, pero la solicitud/respuesta síncrona cubre el 90 % de los casos de uso. El streaming es aditivo, no fundamental.
* **mTLS/OAuth** -- Los bearer token son suficientes para el modelo de confianza (mismo host, pares conocidos). La autenticación basada en certificados es una complejidad de nivel empresarial para un despliegue en una Pi. Ver también: [Adding OAuth 2.1 to a Self-Hosted MCP Server](/blog/adding-oauth-mcp-server-gotchas/).
* **Registro de Agentes** -- El descubrimiento es manual (configuras la URL). El registro automático/mDNS está planeado en el issue de seguimiento.
* **Expulsión de tareas (Task eviction)** -- El límite de 10K es un muro rígido, no una caché LRU. Suficiente para la v1.

Cada "no incluido" es una decisión de alcance, no una deficiencia. La descripción de la PR enumera cada uno con un enlace al issue de seguimiento. Los revisores pueden ver exactamente qué se consideró y qué se pospuso.

## La configuración que demostró que funciona

Cinco instancias de Hrafn en una única Raspberry Pi Zero 2 W (ARM de cuatro núcleos, 512 MB), cada una con una personalidad distinta (Kerf, Sentinel, Architect, Critic, Researcher), comunicándose vía A2A en localhost en los puertos 3001-3005. Respaldadas por gpt-5.1-codex-mini.

La instancia A descubre la Agent Card de la instancia B, envía una tarea ("revisa este código en busca de problemas de seguridad") y recibe una respuesta a través del pipeline estándar `process_message`. Sin orquestación personalizada. La capa A2A es solo otro canal de entrada.

Si funciona en una Pi Zero, funciona en cualquier lugar.

Lee la implementación completa en [PR #4166](https://github.com/5queezer/hrafn/pull/4166); cada escollo mencionado arriba se corresponde con un commit específico con pruebas. Si estás integrando A2A en tu propio framework, empieza con la protección SSRF en `a2a_client.rs` y el límite de TaskStore en `task_store.rs`. El seguimiento para el descubrimiento de pares y mDNS en LAN se rastrea en [#4643](https://github.com/5queezer/hrafn/issues/4643).

---

*Escribo sobre sistemas, seguridad y la intersección de los agentes de IA con infraestructura real en [vasudev.xyz](https://vasudev.xyz).*

*La imagen de portada de esta publicación fue generada por IA.*
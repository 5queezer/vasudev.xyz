---
title: "Lanzar soporte para el protocolo A2A en Rust: 7 trampas de las que nadie te advierte"
date: 2026-03-25
description: "Lo que aprendí al agregar compatibilidad con el protocolo Agent-to-Agent a un framework de agentes de código abierto."
author: "Christian Pojoni"
tags: ["rust", "a2a", "security", "hrafn"]
translationHash: "dd52c5bc11589c42cbd1fbb029dd25ad"
---
El [protocolo A2A (Agent-to-Agent)](https://google.github.io/A2A/) es el estándar abierto de Google para la interoperabilidad de agentes: descubrimiento, delegación de tareas y gestión del ciclo de vida sobre HTTP/JSON-RPC. Se sitúa junto a MCP de la misma manera que TCP se sitúa junto a USB: uno conecta agentes con agentes, el otro conecta agentes con herramientas.

Recientemente publiqué el [PR #4166](https://github.com/5queezer/hrafn/pull/4166), que añade soporte nativo de A2A a Hrafn: tanto un servidor JSON-RPC 2.0 entrante como una herramienta de cliente saliente, escritos en Rust. El PR superó 40 pruebas y se ejecutó en E2E a través de cinco instancias de Raspberry Pi Zero 2 W. En el camino, me topé con cada trampa que la especificación no menciona.

**La especificación A2A es limpia en el papel; los bordes de seguridad te cortarán en producción.**

## 1. Las Agent Cards no requieren autenticación por diseño -- y está bien así

La especificación A2A dice que `GET /.well-known/agent-card.json` debe ser accesible públicamente. Sin bearer token, sin API key. El primer instinto: eso es una fuga de información.

No lo es. La agent card son metadatos: nombre, descripción, capacidades, URL del endpoint. Piensa en ello como el DNS para agentes. No pondrías el DNS detrás de un sistema de autenticación.

La verdadera trampa: si derivas `public_url` a partir de la dirección de bind de tu gateway, filtras la topología de tu red interna. `0.0.0.0:3000` en una agent card le dice a un atacante exactamente dónde sondear. Exige siempre una `public_url` explícita en la configuración y emite una advertencia al inicio si falta.

```rust
if a2a_config.public_url.is_none() {
    warn!(
        "A2A agent card will expose internal bind address. \
         Set [a2a].public_url to avoid leaking network topology."
    );
}
```

## 2. La comparación de bearer tokens debe ser de tiempo constante

Si tu servidor A2A acepta bearer tokens, necesitas una comparación de tiempo constante. No porque tu modelo de amenazas incluya ataques de temporización patrocinados por estados-nación contra un framework de bots de Telegram, sino porque te cuesta exactamente dos líneas y elimina una clase completa de vulnerabilidades.

El `==` estándar en cadenas usa evaluación de cortocircuito y se detiene en el primer byte que no coincide. Un atacante que pueda medir los tiempos de respuesta con suficiente precisión puede forzar por fuerza bruta (brute-force) los tokens byte a byte. ¿Poco probable? Sí. ¿Prevenible? También sí.

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

El crate `subtle` te proporciona `ct_eq`. Úsalo. La verificación de longitud antes de la comparación es intencional: la longitud en sí no es un secreto (está en tu configuración) y evita asignar un buffer de tamaño fijo.

## 3. La protección contra SSRF es más difícil de lo que piensas

Tu herramienta de cliente A2A permite al agente llamar a URLs arbitrarias: `discover https://agent.example.com`. Eso está a solo una llamada HTTP de `discover http://169.254.169.254/latest/meta-data/` en cualquier instancia en la nube.

Bloquear IPs privadas parece simple hasta que te das cuenta:

**IPv4 mapeado en IPv6 evade las comprobaciones ingenuas.** `::ffff:127.0.0.1` es localhost. `::ffff:169.254.169.254` es el endpoint de metadatos de la nube. Tu lista de bloqueo necesita manejar ambas familias de direcciones.

**La resolución DNS ocurre dos veces.** Validas el nombre de host, se resuelve a una IP pública. Tu cliente HTTP se conecta, pero el DNS ha cambiado (DNS rebinding). Ahora estás alcanzando una IP interna. Esto es una brecha TOCTOU (time-of-check, time-of-use). La única solución real es resolver el DNS tú mismo, validar la IP y luego conectarte directamente a esa IP.

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

Documenta la brecha TOCTOU con honestidad. Dejé un comentario en el código y una nota en el PR: "Brecha TOCTOU por DNS rebinding reconocida; lista de permisos (allowlist) de pares planificada en [#4643](https://github.com/5queezer/hrafn/issues/4643)."

## 4. El A2A en el mismo host rompe tu propia protección SSRF

Aquí está la ironía: construí una protección SSRF que bloquea localhost. Luego desplegué cinco instancias de Hrafn en una única Raspberry Pi y no podían comunicarse entre sí.

El A2A multiinstancia en un mismo host es un caso de uso legítimo: múltiples agentes especializados en una misma máquina, comunicándose a través de `localhost:300X`. Pero tu lista de bloqueo SSRF lo acaba de bloquear.

La solución es un bypass condicional (`allow_local`), derivado de la configuración en lugar de la entrada del usuario:

```rust
let allow_local = a2a_config
    .public_url
    .as_ref()
    .map(|u| is_local_url(u))
    .unwrap_or(false);
```

Si tu propia `public_url` apunta a localhost, claramente estás ejecutando de forma local, por lo que se esperan llamadas salientes a localhost. Si `public_url` es un dominio real, localhost permanece bloqueado.

Riesgo residual conocido: `allow_local` es un bypass general. Una lista de permisos (allowlist) de pares (IPs/puertos específicos) es la solución correcta a largo plazo. Despliega el bypass, documenta el riesgo, crea la issue de seguimiento.

## 5. El TaskStore necesita un límite, o tendrás un DoS gratuito

Las tareas A2A mantienen estado. Cada `message/send` crea una entrada de tarea. Si almacenas las tareas en memoria (razonable para la v1), un atacante puede enviar 100 000 solicitudes y agotar tu heap.

Ponle un límite. Usé 10 000 con una respuesta 503 cuando se llena:

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

Una constante, una comprobación, una ruta de error. Sin política de expulsión en la v1: eso es complejidad para el seguimiento. Solo el límite evita el colapso.

¿Por qué 10 000? Estimación rápida: cada `Task` ocupa aproximadamente 2-4 KB serializado. 10K tareas = 20-40 MB. Aceptable en una Pi Zero 2 W con 512 MB de RAM. Ajusta según tu hardware objetivo.

## 6. Los mensajes de error son un canal de información

Cuando una solicitud A2A entrante falla, ¿qué devuelves?

```json
{"error": {"code": -32600, "message": "Task abc-123 not found in store"}}
```

Acabas de confirmar que `abc-123` es un formato válido de ID de tarea y que tu store está indexado por él. Un atacante puede enumerar los ID de las tareas.

Redacta los errores salientes. Registra el detalle completo en el lado del servidor:

```rust
// To the caller:
Err(json_rpc_error(-32600, "invalid request"))

// In your logs:
error!(task_id = %id, "task not found in store");
```

Error genérico para el solicitante. Error específico en tus logs. Mismo principio que en las aplicaciones web, pero fácil de olvidar cuando estás construyendo un manejador de protocolos y piensas en términos de respuestas JSON-RPC útiles.

## 7. La herramienta existe, pero el modelo no puede verla

Esta me costó una tarde de depuración.

La herramienta A2A estaba registrada en el registro de herramientas de Hrafn. `cargo test` pasó. El gateway servía agent cards. Pero cuando ejecuté realmente una instancia y le pedí que contactara a otro agente, el modelo no tenía ni idea de que la herramienta existía.

El problema: Hrafn utiliza una lista de descripciones de herramientas basada en texto en su prompt de sistema de arranque para modelos que no admiten llamadas a funciones nativas (como algunas variantes de OpenAI Codex). La herramienta estaba en el registro, pero no en el array `tool_descs` que se inyecta en el prompt.

```rust
if config.a2a.enabled {
    tool_descs.push((
        "a2a",
        "Communicate with remote A2A-compatible agents. Actions: \
         'discover', 'send', 'status', 'result'.",
    ));
}
```

Lección: prueba la ruta completa. Las pruebas unitarias demostraron que la herramienta funcionaba al ser llamada. Las pruebas de integración demostraron que el gateway aceptaba las solicitudes. Pero el modelo nunca llamó a la herramienta porque no sabía que existía. Las pruebas E2E (inferencia real del modelo hablando con endpoints reales) detectaron lo que las pruebas unitarias no pudieron.

---

## Lo que dejé fuera (intencionadamente)

El PR explícitamente no incluye:

* **SSE streaming** -- A2A lo admite, pero la solicitud/respuesta síncrona cubre el 90 % de los casos de uso. El streaming es aditivo, no fundamental.
* **mTLS/OAuth** -- Los bearer tokens son suficientes para el modelo de confianza (mismo host, pares conocidos). La autenticación basada en certificados es complejidad de nivel empresarial para un despliegue en Pi. Véase también: [Adding OAuth 2.1 to a Self-Hosted MCP Server](/blog/adding-oauth-mcp-server-gotchas/).
* **Agent registry** -- El descubrimiento es manual (configuras la URL). El registro automático/mDNS está planificado en la issue de seguimiento.
* **Task eviction** -- El límite de 10K es un muro estricto, no una caché LRU. Suficiente para la v1.

Cada "no incluido" es una decisión de alcance, no un vacío. La descripción del PR enumera cada uno con un enlace a la issue de seguimiento. Los revisores pueden ver exactamente qué se consideró y se aplazó.

## La configuración que demostró que funciona

Cinco instancias de Hrafn en una única Raspberry Pi Zero 2 W (ARM de cuatro núcleos, 512 MB), cada una con una personalidad distinta (Kerf, Sentinel, Architect, Critic, Researcher), comunicándose vía A2A en los puertos localhost 3001-3005. Respaldadas por gpt-5.1-codex-mini.

La instancia A descubre la agent card de la instancia B, envía una tarea ("revisa este código en busca de problemas de seguridad") y recibe una respuesta a través del pipeline estándar `process_message`. Sin orquestación personalizada. La capa A2A es solo otro canal de entrada.

Si funciona en una Pi Zero, funciona en cualquier lugar.

Lee la implementación completa en [PR #4166](https://github.com/5queezer/hrafn/pull/4166): cada trampa mencionada anteriormente corresponde a un commit específico con pruebas. Si estás integrando A2A en tu propio framework, comienza con la protección SSRF en `a2a_client.rs` y el límite del TaskStore en `task_store.rs`. El seguimiento para el descubrimiento de pares y LAN mDNS está registrado en [#4643](https://github.com/5queezer/hrafn/issues/4643).

---

*Escribo sobre sistemas, seguridad y la intersección de los agentes de IA con la infraestructura real en [vasudev.xyz](https://vasudev.xyz).*
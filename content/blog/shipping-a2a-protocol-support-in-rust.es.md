---
title: "Implementar soporte para A2A Protocol en Rust: 7 trampas de las que nadie te advierte"
date: 2026-03-25
description: "Lo que aprendí al añadir soporte de protocolo agente a agente a un framework de agentes de código abierto."
author: "Christian Pojoni"
tags: ["rust", "a2a", "security", "hrafn"]
translationHash: "b940abc59c347db0bbb28561f88a2c4a"
---
El [protocolo A2A (Agent-to-Agent)](https://google.github.io/A2A/) es el estándar abierto de Google para la interoperabilidad de agentes: descubrimiento, delegación de tareas, gestión del ciclo de vida a través de HTTP/JSON-RPC. Está junto a MCP de la misma manera que TCP está junto a USB: uno conecta agentes con agentes, el otro conecta agentes con herramientas.

Recientemente envié [PR #4166](https://github.com/5queezer/hrafn/pull/4166) que añade soporte nativo A2A a Hrafn, tanto un servidor JSON-RPC 2.0 entrante como una herramienta cliente saliente, escritos en Rust. El PR pasó 40 pruebas y se ejecutó de extremo a extremo en cinco instancias de Raspberry Pi Zero 2 W. En el camino, me topé con todos los bordes afilados que la especificación no menciona.

**La especificación A2A es limpia en papel; los bordes de seguridad te cortarán en producción.**

## 1. Las tarjetas de agentes no están autenticadas por diseño, y eso está bien

La especificación A2A dice que `GET /.well-known/agent-card.json` debe ser accesible públicamente. Sin token de portador, sin clave de API. Primer instinto: eso es una fuga de información.

No lo es. La tarjeta de agente es metadatos: nombre, descripción, capacidades, URL del punto final. Piénsalo como DNS para agentes. No pondrías DNS detrás de autenticación.

El verdadero problema: si derivas `public_url` de la dirección de enlace de tu puerta de enlace, filtras tu topología de red interna. `0.0.0.0:3000` en una tarjeta de agente le dice a un atacante exactamente dónde sondar. Siempre requiere un `public_url` explícito en la configuración y emite una advertencia de inicio si falta.

```rust
if a2a_config.public_url.is_none() {
    warn!(
        "La tarjeta de agente A2A expondrá la dirección de enlace interna. \
         Establece [a2a].public_url para evitar filtrar la topología de la red."
    );
}
```

## 2. La comparación de tokens de portador debe ser de tiempo constante

Si tu servidor A2A acepta tokens de portador, necesitas una comparación de tiempo constante. No porque tu modelo de amenazas incluya ataques de temporización de nivel estatal en un marco de bot de Telegram, sino porque te cuesta exactamente dos líneas y elimina una clase entera de vulnerabilidades.

El estándar `==` en cadenas cortocircuita en el primer byte que no coincide. Un atacante que puede medir los tiempos de respuesta con suficiente precisión puede fuerza bruta los tokens byte por byte. ¿Improbable? Sí. ¿Evitable? También sí.

```rust
use subtle::ConstantTimeEq;

fn verify_token(provided: &str, expected: &str) -> bool {
    let provided_bytes = provided.as_bytes();
    let expected_bytes = expected.as_bytes();
    if provided_bytes.len()!= expected_bytes.len() {
        return false;
    }
    provided_bytes.ct_eq(expected_bytes).into()
}
```

La caja `subtle` te da `ct_eq`. Úsalo. La verificación de longitud antes de la comparación es intencional: la longitud en sí no es secreta (está en tu configuración) y evita asignar un búfer de tamaño fijo.

## 3. La protección SSRF es más difícil de lo que crees

Tu herramienta cliente A2A permite que el agente llame a URLs arbitrarios: `discover https://agent.example.com`. Eso está a una llamada HTTP de distancia de `discover http://169.254.169.254/latest/meta-data/` en cualquier instancia de la nube.

Bloquear IPs privadas parece simple hasta que te das cuenta de que:

**IPv4 mapeado a IPv6 evita las comprobaciones ingenuas.** `::ffff:127.0.0.1` es localhost. `::ffff:169.254.169.254` es el punto final de metadatos en la nube. Tu lista negra necesita manejar ambas familias de direcciones.

**La resolución de DNS ocurre dos veces.** Validas el nombre de host, se resuelve en una IP pública. Tu cliente HTTP se conecta, pero el DNS ha cambiado (revinculación de DNS). Ahora estás golpeando una IP interna. Esta es una brecha de TOCTOU (tiempo de comprobación, tiempo de uso). La única solución real es resolver el DNS tú mismo, validar la IP y luego conectarte a esa IP directamente.

**Las redirecciones abren la puerta de nuevo.** Validas la URL inicial, pero el servidor te redirige a `http://localhost:8080/admin`. Tu política de redireccionamiento necesita revalidar cada salto.

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

Documenta el espacio en blanco de TOCTOU honestamente. Dejé un comentario en el código y una nota en el PR: "Se reconoce el TOCTOU de revinculación de DNS; se planea una lista de permitidos de pares en [#4643](https://github.com/5queezer/hrafn/issues/4643)."

## 4. A2A del mismo host rompe tu propia protección SSRF

Aquí está la ironía: construí una protección SSRF que bloquea localhost. Luego desplegué cinco instancias de Hrafn en una sola Raspberry Pi, y no podían comunicarse entre sí.

El A2A de múltiples instancias en el mismo host es un caso de uso legítimo: múltiples agentes especializados en una máquina, comunicándose a través de `localhost:300X`. Pero tu lista negra de SSRF acaba de bloquearlo.

La solución es un bypass condicional (`allow_local`), derivado de la configuración en lugar de la entrada del usuario:

```rust
let allow_local = a2a_config
   .public_url
   .as_ref()
   .map(|u| is_local_url(u))
   .unwrap_or(false);
```

Si tu propio `public_url` apunta a localhost, claramente estás ejecutando localmente, por lo que las llamadas salientes a localhost son esperadas. Si `public_url` es un dominio real, localhost permanece bloqueado.

Riesgo residual conocido: `allow_local` es un bypass general. Una lista de permitidos de pares (IPs/puertos específicos) es la solución correcta a largo plazo. Implementa el bypass, documenta el riesgo, presenta el problema de seguimiento.

## 5. TaskStore necesita un límite, o obtienes un DoS gratis

Las tareas A2A son con estado. Cada `message/send` crea una entrada de tarea. Si almacenas tareas en memoria (razonable para v1), un atacante puede enviar 100,000 solicitudes y agotar tu heap.

Limítalo. Usé 10,000 con una respuesta 503 cuando está lleno:

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

Una constante, una verificación, una ruta de error. Sin política de desalojo en v1, esa es la complejidad para el seguimiento. El límite solo evita el accidente.

¿Por qué 10,000? Borrador: cada `Task` es aproximadamente 2-4 KB serializado. 10K tareas = 20-40 MB. Aceptable en un Pi Zero 2 W con 512 MB de RAM. Ajusta para tu hardware objetivo.

## 6. Los mensajes de error son un canal de información

Cuando una solicitud A2A entrante falla, ¿qué devuelves?

```json
{"error": {"code": -32600, "message": "Task abc-123 not found in store"}}
```

Acabas de confirmar que `abc-123` es un formato de ID de tarea válido y que tu almacén está vinculado a él. Un atacante puede enumerar los IDs de tareas.

Edita los errores salientes. Registra el detalle completo del lado del servidor:

```rust
// Al llamante:
Err(json_rpc_error(-32600, "invalid request"))

// En tus registros:
error!(task_id = %id, "task not found in store");
```

Error genérico al llamante. Error específico en tus registros. El mismo principio que las aplicaciones web, pero fácil de olvidar cuando estás construyendo un manejador de protocolo y pensando en términos de respuestas útiles de JSON-RPC.

## 7. La herramienta existe pero el modelo no puede verla

Esta me costó una tarde de depuración.

La herramienta A2A estaba registrada en el registro de herramientas de Hrafn. `cargo test` pasó. La puerta de enlace sirvió tarjetas de agente. Pero cuando realmente ejecuté una instancia y le pedí que se contactara con otro agente, el modelo no tenía idea de que la herramienta existía.

El problema: Hrafn usa una lista de descripción de herramientas basada en texto en su indicación del sistema de arranque para modelos que no admiten la llamada de funciones nativas (como algunas variantes de OpenAI Codex). La herramienta estaba en el registro pero no en la matriz `tool_descs` que se inyecta en la indicación.

```rust
if config.a2a.enabled {
    tool_descs.push((
        "a2a",
        "Comunícate con agentes A2A compatibles remotos. Acciones: \
         'discover', 'send', 'status', 'result'.",
    ));
}
```

Lección: prueba el camino completo. Las pruebas unitarias demostraron que la herramienta funcionaba cuando se llamaba. Las pruebas de integración demostraron que la puerta de enlace aceptaba solicitudes. Pero el modelo nunca llamó a la herramienta porque no sabía que existía. Las pruebas E2E, la inferencia real del modelo hablando con puntos finales reales, capturaron lo que las pruebas unitarias no pudieron.

---

## Lo que dejé fuera (intencionalmente)

El PR explícitamente no incluye:

* **Transmisión SSE**: A2A lo admite, pero la solicitud/respuesta sincrónica cubre el 90% de los casos de uso. La transmisión es aditiva, no fundamental.
* **mTLS/OAuth**: Los tokens de portador son suficientes para el modelo de confianza (mismo host, pares conocidos). La autenticación basada en certificados es una complejidad de nivel empresarial para un despliegue de Pi. Vea también: [Agregar OAuth 2.1 a un servidor MCP autohospedado](/blog/adding-oauth-mcp-server-gotchas/).
* **Registro de agentes**: El descubrimiento es manual (configuras la URL). El registro automático/mDNS está planificado en el tema de seguimiento.
* **Desalojo de tareas**: El límite de 10K es un muro duro, no un caché LRU. Lo suficientemente bueno para v1.

Cada "no incluido" es una decisión de alcance, no una brecha. La descripción del PR enumera cada uno con un enlace al tema de seguimiento. Los revisores pueden ver exactamente qué se consideró y pospuso.

## La configuración que demostró que funciona

Cinco instancias de Hrafn en una sola Raspberry Pi Zero 2 W (ARM de cuatro núcleos, 512 MB), cada una con una persona distinta (Kerf, Sentinel, Architect, Critic, Researcher), comunicándose a través de A2A en puertos locales 3001-3005. Respaldado por gpt-5.1-codex-mini.

La instancia A descubre la tarjeta de agente de la instancia B, envía una tarea ("revisar este código en busca de problemas de seguridad"), recibe una respuesta a través del pipeline `process_message` estándar. Sin orquestación personalizada. La capa A2A es solo otro canal de entrada.

Si se ejecuta en un Pi Zero, se ejecuta en cualquier lugar.

Lee la implementación completa en [PR #4166](https://github.com/5queezer/hrafn/pull/4166): cada problema mencionado anteriormente se asigna a un compromiso específico con pruebas. Si estás integrando A2A en tu propio marco, comienza con la protección SSRF en `a2a_client.rs` y el límite de TaskStore en `task_store.rs`. El seguimiento para el descubrimiento de pares y el mDNS de LAN se realiza en [#4643](https://github.com/5queezer/hrafn/issues/4643).

---

*Escribo sobre sistemas, seguridad y la intersección de agentes de IA con infraestructura real en [vasudev.xyz](https://vasudev.xyz).*
---
title: "Un error de Sablier que no era Sablier: 4 cosas a tener en cuenta al rastrear una falla de plugin de Traefik"
date: 2026-04-19
description: "Rastreando un error intermitente 'invalid middleware' en Sablier a una dependencia oculta de inicio introducida por una refactorización de Traefik 3.5.3."
images: ["/images/a-sablier-bug-that-wasnt-sablier-og.png"]
author: "Christian Pojoni"
tags: ["architecture", "traefik"]
series: ["Field Notes"]
translationHash: "62d5bb434393d26d88b269a846a4d471"
chunkHashes: "278fb8e0d3039274,3f0837a5defbadbd,f708ca20c36b3bef,e5046a30363c021b,e01a6962bd409a3c,8039547e1da5ce63,fc60ce853b1e37de,13c2b64fff8f853e,74f4f3ff014f6406,7f670ac6c5113213"
---
[Sablier](https://github.com/sablierapp/sablier) te brinda escala a cero al estilo Cloud‑Run para contenedores Docker auto‑alojados. Las solicitudes llegan a un middleware de proxy inverso, el middleware despierta el contenedor objetivo bajo demanda y el contenedor se apaga nuevamente después de un tiempo de inactividad. Pasé una tarde rastreando un error intermitente de `invalid middleware` que los usuarios de Sablier han estado reportando durante meses. El error no estaba en Sablier. El trabajo produjo tres artefactos públicos: un [repositorio de reproducción determinista](https://github.com/5queezer/sablier-traefik-repro), un [issue ascendente](https://github.com/traefik/traefik/issues/13005) y un [PR de corrección](https://github.com/traefik/traefik/pull/13006). Aquí tienes cuatro cosas que vale la pena saber antes de depurar tu próximo error de `invalid middleware`.

**Una refactorización lanzada en una versión puntual de Traefik hizo que silenciosamente cada inicio de plugin dependiera de que `plugins.traefik.io` fuera accesible, y ningún propietario de middleware estaba en posición de notarlo.**
## 1. El error estaba en la refactorización, no en la funcionalidad

El síntoma apareció en el rastreador de Sablier como `invalid middleware "whoami-sablier@file" configuration: invalid middleware type or middleware does not exist`. Sablier envía un plugin de Traefik, así que naturalmente allí es donde los usuarios presentaban el problema. No era un bug de Sablier.

Traefik v3.5.3 incorporó [PR #12035, que refactorizó el sistema de plugins](https://github.com/traefik/traefik/pull/12035). La refactorización dividió un cliente monolítico en un `Manager`, un `Downloader` y nueva lógica de verificación de hashes. Lo que las notas de la versión no señalaron es que esta forma acopla *todos* los arranques de plugins a la accesibilidad de `plugins.traefik.io`. La ruta `Manager.InstallPlugin` llama incondicionalmente a `Downloader.Download`, luego a `Downloader.Check`. Cada llamada contacta el registro. Cualquier falla aborta la instalación.

El bloque de código afectado en v3.5.3 es lo suficientemente corto como para reproducirlo completo:

```go
func (m *Manager) InstallPlugin(ctx context.Context, plugin Descriptor) error {
    hash, err := m.downloader.Download(ctx, plugin.ModuleName, plugin.Version)
    if err != nil {
        return fmt.Errorf("unable to download plugin %s: %w", plugin.ModuleName, err)
    }
    if plugin.Hash != "" {
        if plugin.Hash != hash { /* ... */ }
    } else {
        err = m.downloader.Check(ctx, plugin.ModuleName, plugin.Version, hash)
        if err != nil {
            return fmt.Errorf("unable to check archive integrity of the plugin %s: %w", plugin.ModuleName, err)
        }
    }
    return m.unzip(plugin.ModuleName, plugin.Version)
}
```

**El título del issue de Sablier señalaba el síntoma. La descripción del PR de Traefik describía el cambio. Ninguno mencionó el acoplamiento.** La única forma de ver el panorama completo fue leer el diff de Traefik mientras tenías presente el síntoma de Sablier.
## 2. "Esporádico" casi siempre es una dependencia oculta

El primer intento de reproducción fue obvio. Reiniciar Traefik en un bucle ajustado, golpear el endpoint, buscar en los logs el error, informar cuántos reinicios fueron necesarios hasta que apareciera. Ejecuté cincuenta iteraciones en una red doméstica. Cero disparos.

Eso es diagnóstico. Cuando no puedes forzar un error mediante la sincronización o la cadencia de reinicios, la variable no es el tiempo. Es la accesibilidad de alguna dependencia externa que no sabías que estaba en la ruta.

La reproducción determinista es una sobrescritura de Docker de una sola línea:

```yaml
# docker-compose.netblock.yml
services:
  traefik:
    extra_hosts:
      - "plugins.traefik.io:127.0.0.1"
```

Esto asigna el registro a localhost dentro del contenedor, de modo que la llamada de instalación recibe `connection refused`. La tasa de disparo pasa de cero en cincuenta a ciento por ciento en cada inicio. La misma técnica funciona para cualquier error "esporádico tras reinicio" donde sospechas una llamada de red oculta. Bloquea la dependencia sospechada y observa qué se rompe.

**Cuando no puedas reproducir mediante la sincronización, deja de variar la sincronización. Comienza a variar lo que el proceso puede alcanzar.**
## 3. `ResetAll()` es un martillo sorprendentemente grande

La cascada vale la pena recorrer paso a paso. El fallo de instalación de un plugin devuelve un error hasta `SetupRemotePlugins`, que llama a `manager.ResetAll()`. Ese método elimina todo el directorio de archivos, no solo el archivo del plugin problemático. Entonces cada middleware en la configuración del operador que hace referencia a *cualquier* plugin registra su propio error `invalid middleware type or middleware does not exist`, porque el directorio fuente del plugin ha sido eliminado bajo él.

Así, un único pico de red transitorio contra un plugin configurado desactiva todos los middleware respaldados por plugins en la implementación. Un usuario de Sablier ve un error de Sablier. El mantenedor de Sablier ve un problema bloqueado en upstream. El mantenedor de Traefik ve una refactorización que pasó la revisión.

Esto es un patrón. Un controlador de errores que amplía su radio de explosión más allá del componente que falló producirá informes de error que parecen no estar relacionados con la causa subyacente. **El radio de explosión de un controlador de errores importa más que el error que captura.** Cuando un reintento, un reinicio o una alternativa abarcan varios subsistemas, alguien aguas abajo reportará el bug equivocado.

La corrección en [PR #13006](https://github.com/traefik/traefik/pull/13006) reduce el radio de explosión. Cuando `Download` falla contra el registro y un archivo previamente descargado para el mismo plugin y versión está en disco, la instalación recurre a ese archivo en caché en lugar de eliminar el entorno del plugin. Una falla de `integrity check` se tolera *solo* en esa ruta alternativa, porque el archivo en caché se validó en la instalación exitosa anterior. Una falla de `Check` después de un `Download` *exitoso* sigue siendo fatal, por lo que el contenido recién descargado aún debe pasar la integridad. El anclaje de hash mediante `plugin.Hash` se aplica siempre. Un archivo, cuatro casos de prueba.
## 4. Un problema bloqueado no es un problema muerto

La misma causa raíz se había reportado como [#12137](https://github.com/traefik/traefik/issues/12137) meses antes. Ese issue se cerró automáticamente como `frozen-due-to-age` y el bloqueo de issues obsoletos del repositorio impide nuevos comentarios. Cuando el hilo de Sablier acumuló suficientes informes como para parecer un patrón, el issue relevante de Traefik era inaccesible.

Abrir un issue nuevo con una reproducción determinística, un puntero concreto a la causa raíz en el PR que lo introdujo y un menú de opciones de solución aparece en una superficie diferente de la atención del mantenedor que un hilo encuestado pero bloqueado. Crea una nueva señal de triaje. Le da a los revisores algo a lo que adjuntar un PR. Y brinda a los futuros usuarios un hilo abierto para buscar.

Si te encuentras con un issue bloqueado que aún está activo en la práctica, abre uno nuevo. Enlaza el anterior en el primer párrafo para que la historia no se pierda. Adjunta un repositorio de reproducción, no solo una traza de pila. El costo de un issue nuevo son unos minutos. El costo de que los usuarios se topen con el mismo obstáculo seis meses después son horas, multiplicado por la cantidad de usuarios.
## Lo que omití

Tres cosas que pospuse intencionalmente y listé explícitamente en la descripción del PR original.

Una segunda variante de reproducción para el caso del plugin en caché. Los usuarios en producción encuentran este error al reiniciar con el archivo del plugin ya en disco, lo que sigue una ruta de código ligeramente distinta a la del primer arranque. La reproducción del primer arranque fue suficiente para demostrar el mecanismo y guiar el diseño de la solución. Ejecutar de nuevo con un volumen pre‑poblado añadiría confianza pero no cambiaría el resultado.

Dos formas alternativas de solución. Una bandera de configuración `experimental.plugins.offline: true` (opt‑in del operador, sin cambio de comportamiento para los demás) y un `Check()` asincrónico posterior al inicio (desacopla completamente el arranque pero añade concurrencia a una ruta antes sencilla). Ambas están en el issue original como opciones. Si los mantenedores prefieren alguna sobre el enfoque del PR, la forma implica un día de trabajo y un nuevo PR.

Una prueba de integración de Traefik que ejercite el aislamiento de red al estilo `extra_hosts` de extremo a extremo. Las tres pruebas unitarias en el PR ejercitan las nuevas ramas directamente mediante un descargador simulado. Una prueba de extremo a extremo sería, sin duda, mejor. También fue una tangente que decidí no ampliar en el PR. Si un mantenedor la solicita, es fácil añadirla.
## Desplegado en producción

El Traefik parcheado está ejecutándose en mi propia caja Coolify‑on‑Hetzner al momento de escribir esto. Antes del cambio la caja estaba anclada en 7,2 GiB de 7,5 GiB de memoria residente con 4 GiB de swap en uso, dominada por servidores MCP inactivos y aplicaciones Coolify de bajo tráfico que en conjunto atendían quizá una docena de peticiones al día. El fallback de archivo en caché es lo que me permitió conectar Sablier a ellos. Cada reinicio del Traefik parcheado desde entonces ha recargado el plugin Sablier desde el archivo local sin una ida y vuelta al registro, que es la segunda variante de reproducción que diferí en la descripción del PR.

Ocho servidores MCP y cuatro aplicaciones Coolify ahora están detrás de Sablier con una ventana de inactividad de diez minutos. La caja ha recuperado 3,1 GiB de memoria residente y 2 GiB de swap. La latencia de activación en la estrategia bloqueante va de 300 ms a 10 s según el arranque en frío del contenedor, lo cual es aceptable para cargas de trabajo que ven tráfico escaso. Quiero más ciclos de reinicio y un fallo real del registro en la línea de tiempo antes de afirmar que la propiedad se mantiene en general, pero la forma del despliegue coincide con el escenario que la corrección aborda.

Un detalle específico de Traefik surgió durante el despliegue. El proveedor docker elimina un router en el momento en que su contenedor subyacente se detiene, por lo que el middleware Sablier nunca se dispara en la siguiente petición y el cliente ve un 503 en lugar de la ruta de activación. La solución es un router de proveedor de archivos con mayor prioridad que el de etiquetas docker, apuntando al contenedor por su nombre DNS de docker, con el middleware Sablier adjunto. Ese router persiste sin importar el estado del contenedor. Coolify lo complica un poco porque cada redeploy crea un contenedor con un nombre nuevo con sufijo UUID, por lo que la URL del router de proveedor de archivos debe regenerarse. La pequeña herramienta de sincronización que mantiene esa configuración alineada con los nombres actuales de los contenedores vive como un [gist](https://gist.github.com/5queezer/f838aaa5e0690da5df04ce44f8f67266) si alguien quiere copiar la forma.
## Posdata: qué falló en producción

La ventana de inactividad de diez minutos se mantuvo para los ocho servidores MCP gestionados con compose. Las cuatro aplicaciones gestionadas por Coolify no la sobrevivieron. Dentro de un día de habilitar las etiquetas, el bucle de reconciliación de Coolify había marcado cada una de ellas como `exited:unhealthy` y finalmente eliminó el contenedor por completo. Sablier perdió su referencia de grupo en la siguiente actualización del docker-socket y la siguiente solicitud recibió un 404 del demonio Sablier en lugar de la ruta de activación.

El mecanismo es obvio en retrospectiva. Sablier hiberna llamando a `docker stop`. El bucle de salud de Coolify ve un contenedor en estado `exited` donde espera `running`, decide que la aplicación se bloqueó y, finalmente, lo elimina como basura. Las pilas gestionadas con compose no tienen este problema porque `docker compose` con `restart: unless-stopped` deja un contenedor detenido en `docker ps -a` indefinidamente y el proveedor docker de Sablier sigue rastreándolo. El despertar funciona.

**Si algo más en tu pila también reconcilia el estado del contenedor, Sablier y esa cosa lucharán. El perdedor de esa lucha es quien el orquestador elimine como basura primero.** La pila MCP ahora está hibernando como se anunciaba. Las aplicaciones de Coolify han vuelto a estar siempre activas. Un proveedor de Sablier que tradujera los eventos de activación en llamadas a la API de Coolify `/deploy` lo haría funcionar porque Coolify controlaría el ciclo de vida, pero nadie lo ha construido, yo incluido.
## Reforzado antes de la primera revisión

Mi primer borrador de la solución toleraba cualquier fallo de verificación de integridad siempre que existiera un archivo comprimido en caché al inicio de `InstallPlugin`. Al releerlo noté que `Download` sobrescribe el archivo comprimido al completarse con éxito, por lo que “el archivo existía al inicio” no demostraba que el contenido en disco fuera el previamente validado. Un desajuste de integridad después de la descarga habría pasado inadvertido como una advertencia, que es exactamente la propiedad que la verificación de integridad debe imponer. La versión actual usa una bandera `fallback` que se establece solo cuando `Download` falla por sí mismo. El conjunto de pruebas ahora afirma que un fallo de `Check` después de una `Download` exitosa sigue siendo fatal. El historial de commits en el PR muestra la progresión. Construye tus propias puertas de tolerancia de forma estrecha. Cada `if` que permite que un fallo pase es una invariancia que debes defender en la revisión.
## Pruébalo tú mismo

Los tres artefactos son públicos. El [repositorio de reproducción](https://github.com/5queezer/sablier-traefik-repro) tarda treinta segundos en clonarse y ejecutarse. El [issue upstream](https://github.com/traefik/traefik/issues/13005) y el [PR de corrección](https://github.com/traefik/traefik/pull/13006) están abiertos al momento de escribir esto. Si estás ejecutando Traefik con cualquier plugin, verifica que `plugins.traefik.io` sea accesible desde tu contenedor de Traefik en cada inicio. Si no es consistentemente accesible, estás a un fallo de red de que todos los middleware basados en plugins se vuelvan inválidos de golpe.

---

*Christian Pojoni construye infraestructura y depura bugs que te despiertan a las 3 AM. Más en [vasudev.xyz](https://vasudev.xyz).*

*La imagen de portada de esta publicación fue generada por IA.*
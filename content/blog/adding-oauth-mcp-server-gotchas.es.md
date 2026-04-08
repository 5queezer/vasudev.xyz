---
title: "Añadiendo OAuth 2.1 a un Servidor MCP Autohospedado: 4 trampas de la trinchera"
date: 2026-03-25
description: "¿Qué se rompió cuando conectéclaude.ai a mi propia instancia de Reactive Resume mediante OAuth?"
images: ["/images/adding-oauth-mcp-server-gotchas-og.png"]
author: "Christian Pojoni"
tags: ["typescript", "mcp", "oauth"]
series: ["Field Notes"]
translationHash: "bd114518f187f28ca585d6705de68751"
chunkHashes: "a5a819c5e64b8e57,d3bb3fec7b569eeb,d08f4bf02c40372d,58ef9e41ba4ef7d8,4eaf9f6c399894ba,db1e3d7423007539,651655b1329fc8fa"
---
```
MCP (Model Context Protocol) permite a los asistentes de IA llamar a herramientas en servidores remotos. Pero si tu servidor MCP es autoalojado, claude.ai necesita autenticarse contra las cuentas de tus usuarios, no contra la de Anthropic. Eso significa que tu servidor necesita convertirse en un proveedor completo de OAuth 2.1: Registro dinámico de clientes, Código de autorización con PKCE, intercambio de tokens.

Presenté [PR #2829](https://github.com/amruthpillai/reactive-resume/pull/2829) para agregar esto a [Reactive Resume](https://github.com/amruthpillai/reactive-resume), el creador de currículums de código abierto. Seis commits, una refactorización intermedia del PR después de que el mantenedor señaló una depreciación, y varias horas de depuración de cadenas de autenticación. Esto es la parte OAuth de [esa historia](/blog/shipping-a2a-protocol-support-in-rust/).

**MCP OAuth funciona, pero la especificación deja cuatro trampas que los tutoriales pasan por alto.**
```
## 1. Tuservidor MCP necesita dos endpoints .well-known, no uno

Cuando claude.ai se conecta a un endpoint MCP personalizado, no solo envía un POST a tu URL. Primero busca metadatos de OAuth. La especificación de autenticación de MCP requiere dos endpoints de descubrimiento:

`GET /.well-known/oauth-authorization-server` devuelve el Metadata del Servidor de Autorización OAuth 2.0 (RFC 8414). Le indica a los clientes a dónde autorizar, dónde intercambiar tokens y qué flujos de autorización (grant types) apoyas.

`GET /.well-known/oauth-protected-resource` devuelve el Metadata del Recurso Protegido (RFC 9728). Describe qué recurso es, qué scopes necesita y dónde encontrar el servidor de autorización.

Si omites alguno de ellos, claude.ai falla silenciosamente al conectar. No muestra mensaje de error, ni reintento. Simplemente no ofrece el botón «Connect». Perdí una hora por esto porque el endpoint `oauth-protected-resource` no estaba en ningún tutorial que encontré. Sólo lo descubrí leyendo la especificación de autenticación de MCP directamente.

```typescript
// .well-known/oauth-authorization-server
return json({
  issuer: authBaseUrl,
  authorization_endpoint: `${authBaseUrl}/api/auth/oauth/authorize`,
  token_endpoint: `${authBaseUrl}/api/auth/oauth/token`,
  registration_endpoint: `${authBaseUrl}/api/auth/oauth/register`,
  response_types_supported: ["code"],
  grant_types_supported: ["authorization_code", "refresh_token"],
  code_challenge_methods_supported: ["S256"],
});
```

Ambos endpoints deben devolver JSON, deben estar en las rutas exactas especificadas, y ambos deben coincidir en la URL del servidor de autorización. Si `issuer` en uno no coincide con `authorization_server` en el otro, el cliente rechaza la configuración.
## 2. Labiblioteca de autenticación que elegiste podría quedar en desuso a mitad de PR

Reactive Resume usa better-auth para la autenticación. better-auth incluye un plugin `mcp()` que gestiona el Registro Dinámico de Clientes y la gestión de tokens. Perfecto. Tres líneas de configuración y tienes OAuth para MCP.

Construí todo el PR alrededor de ello, lo desplegué en Cloud Run, verifiqué que funcionaba de extremo a extremo con claude.ai, y marqué el PR listo para revisión.

La respuesta del mantenedor [response](https://github.com/amruthpillai/reactive-resume/pull/2829#issuecomment-1):

> El plugin MCP pronto quedará en desuso [...] ¿Podrías refactorizar el PR para usar el OAuth Provider Plugin en su lugar?

Tenía razón. La documentación de better-auth ya tenía una nota de deprecación que apuntaba a `@better-auth/oauth-provider`. El nuevo plugin es más general (no específico de MCP), usa tokens JWT en lugar de tokens opacos, y requiere la gestión de claves JWKS.

La refactorización tocó todos los archivos relacionados con la autenticación. La búsqueda de tokens opacos mediante `getMcpSession()` se convirtió en verificación de JWT mediante `verifyAccessToken()`. El esquema de base de datos cambió también. `oauthApplication` pasó a llamarse `oauthClient` (RFC 7591 compatible), y aparecieron nuevas tablas para `oauthRefreshToken` y `jwks`.

La lección no es "chequear las deprecaciones primero". Es que la herramienta de autenticación MCP está avanzando rápidamente ahora. Lo que elijas hoy podría quedar obsoleto el próximo mes. Mantén tu lógica de OAuth detrás de un adaptador delgado para que la refactorización sea mecánica, no arquitectura.
## 3. Tu cadena de autenticación tiene más capas de las que crees

El flujo OAuth funcionó. Cada llamada a una herramienta falló con `Unauthorized`.

El problema: Reactive Resume usa oRPC para su capa de API. El contexto de oRPC tiene su propia cadena de autenticación, independiente de la autenticación del endpoint MCP. Cuando una herramienta llama a `listResumes`, oRPC busca una cookie de sesión o una clave API. No sabe nada de tokens Bearer OAuth.

El endpoint MCP autenticó al usuario. Luego llamó a un procedimiento oRPC. oRPC no encontró ninguna cookie ni clave API. `Unauthorized`.

La solución: propagar el token Bearer a través de la cadena de autenticación de oRPC.

```typescript// En el constructor del contexto oRPCconst bearer = headers.get("authorization")?.replace("Bearer ", "");
if (bearer) {
  const token = await verifyOAuthToken(bearer);
  if (token?.userId) {
    const user = await db.query.user.findFirst({
      where: eq(userTable.id, token.userId),
    });
    if (user) return { user };
  }
}
```

The deeper lesson: in any system where auth happens at a gateway layer (MCP endpoint) and then gets forwarded to an inner layer (oRPC), you need to verify that the inner layer accepts the same credential format. If it doesn't, you have two options: pass the resolved user context through, or teach the inner layer to understand the new credential type. I chose the latter because it's more robust against future tool additions.

Y incluso después de arreglar la cadena de autenticación, una segunda sorpresa: `getMcpSession()` (y su sucesor `verifyAccessToken()`) devuelve un objeto `OAuthAccessToken` con un campo `userId`, no con un campo `user`. Necesitas una consulta de base de datos adicional:

```typescriptconst token = await verifyAccessToken(bearer);
const user = await db.query.user.findFirst({
  where: eq(userTable.id, token.userId),
});
```

En cualquier implementación de OAuth, la verificación del token y la resolución del usuario son dos pasos separados. No asumas que la biblioteca los fusiona.
## 4. Compatibilidad hacia atrás significa dos caminos de autenticación para siempre

Reactive Resume ya tenía autenticación MCP mediante encabezados `x-api-key`. Los usuarios existentes tienen configuradas claves API. Eliminar esa funcionalidad y obligar a todos a reautenticarse mediante OAuth rompería todas las integraciones existentes.

Así que el extremo MCP ahora tiene un camino de autenticación dual:

```typescript
// Try OAuth Bearer first
const bearer = headers.get("authorization")?.replace("Bearer ", "");
if (bearer) {
  const session = await verifyOAuthToken(bearer);
  if (session?.userId) { /* authenticated */ }
}

// Fall back to API key
const apiKey = headers.get("x-api-key");
if (apiKey) {
  const user = await verifyApiKey(apiKey);
  if (user) { /* authenticated */ }
}

// Neither worked
return new Response("Unauthorized", {
  status: 401,
  headers: { "WWW-Authenticate": "Bearer" },
});
```

El orden es importante: primero Bearer, después API key. Si se verifica la clave API primero y el usuario envía una clave API mal formada junto con un token Bearer válido, la verificación de la clave API podría lanzar una excepción antes de que se ejecute la ruta Bearer.

Y el encabezado `WWW-Authenticate: Bearer` en la respuesta 401 es requerido por la especificación MCP. Sin él, claude.ai no sabe iniciar el flujo OAuth. Simplemente trata el endpoint como permanentemente inaccesible.

La ruta de clave API seguirá existiendo después de esta PR. Eliminarla es un cambio rompiendo la compatibilidad que requiere un plan de migración y una línea de tiempo de deprecación.

Un detalle más: `verifyApiKey` puede lanzar una excepción con entradas malformadas. Envolverla en try-catch evita registros de errores ruidosos cuando falla el análisis del token. El código original usaba coincidencias de cadena en los mensajes de error (`error.message.includes("...")`). La versión refactorizada usa `instanceof AuthError`, que es seguro tipado y no fallará si el mensaje de error cambia.
- **Token refresh.** El OAuthProvider plugin maneja automáticamente la renovación de tokens. No necesitaba lógica personalizada.  
- **Scope enforcement.** Todas las MCP tools reciben acceso completo del usuario. Es adecuado para un constructor de currículum personal, pero no lo es para un SaaS multi‑tenante.  
- **Rate limiting on the OAuth endpoints.** Dynamic Client Registration está abierto por diseño (RFC 7591). Cualquiera puede registrarse. La limitación de velocidad está en la lista de pendientes del mantenedor.  
- **Consent screen.** better-auth's OAuth Provider omite la pantalla de consentimiento para aplicaciones de primera parte. Si Reactive Resume llega a ser un proveedor OAuth para aplicaciones de terceros, se necesita una UI de consentimiento.
## La configuración que lo demostró funcionarReactive Resume autohospedado en Google Cloud Run (europe-west1), PostgreSQL en Neon.tech (plan gratuito). El flujo OAuth se completa en menos de 2 segundos: claude.ai descubre los puntos finales, se registra dinámicamente, redirige a la página de inicio de sesión, intercambia el código y comienza a realizar llamadas a herramientas. El listado de resúmenes, lectura y parcheo funcionan todos a través del token portador.

El flujo se ha demostrado completo en Cloud Run. La PR se ha fusionado y la funcionalidad se lanzará en la próxima versión.

Si estás añadiendo OAuth a tu propio servidor MCP, lee [PR #2829](https://github.com/amruthpillai/reactive-resume/pull/2829) para la implementación completa. Cada inconveniente mencionado se corresponde con un commit específico. Para probar el resultado, apunta claude.ai a tu propia instancia de Reactive Resume y conéctala vía OAuth. Mi configuración se ejecuta en [resume.vasudev.xyz](https://resume.vasudev.xyz).

---

*Christian Pojoni construye integraciones MCP para herramientas de código abierto. Más en [vasudev.xyz](https://vasudev.xyz).*

*La imagen de portada de esta publicación fue generada por IA.*

## The setup that proved it worksReactive Resume autoalojado en Google Cloud Run (europe-west1), PostgreSQL en Neon.tech (plan gratuito). El flujo de OAuth se completa en menos de 2 segundos: claude.ai descubre los extremos, se registra dinámicamente, redirige a la página de inicio de sesión, intercambia el código y empieza a hacer llamadas a herramientas. La listado de currículums, la lectura y la parcheo funcionan todos a través de Bearer token.

El flujo se ha demostrado de extremo a extremo en Cloud Run. La PR ha sido fusionada y la función se incluirá en la próxima versión.

Si estás añadiendo OAuth a tu propio servidor MCP, lee [PR #2829](https://github.com/amruthpillai/reactive-resume/pull/2829) para la implementación completa. Cada problema anterior se corresponde con un commit específico. Para probar el resultado, apunta claude.ai a tu propia instancia de Reactive Resume y conéctala mediante OAuth. Mi configuración se ejecuta en [resume.vasudev.xyz](https://resume.vasudev.xyz).

---

*Christian Pojoni construye integraciones MCP para herramientas de código abierto. Más en [vasudev.xyz](https://vasudev.xyz).*

*La imagen de portada de esta publicación fue generada por IA.*
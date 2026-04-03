---
title: "Añadir OAuth 2.1 a un servidor MCP autoalojado: 4 problemas reales desde la trinchera"
date: 2026-03-25
description: "Qué falló cuando conecté claude.ai a mi propia instancia de Reactive Resume vía OAuth."
author: "Christian Pojoni"
tags: ["typescript", "mcp", "oauth", "reactive-resume"]
translationHash: "db236276b0881a2df0e66e8452ffbcf2"
---
El MCP (Model Context Protocol) permite a los asistentes de IA llamar a herramientas en servidores remotos. Pero si tu servidor MCP es autoalojado, claude.ai necesita autenticarse contra tus cuentas de usuario, no contra las de Anthropic. Eso significa que tu servidor debe convertirse en un proveedor de OAuth 2.1: registro dinámico de clientes, código de autorización con PKCE e intercambio de tokens.

Envié el [PR #2829](https://github.com/amruthpillai/reactive-resume/pull/2829) para añadir esto a [Reactive Resume](https://github.com/amruthpillai/reactive-resume), el constructor de currículums de código abierto. Seis commits, una refactorización a mitad del PR después de que el mantenedor señalara una obsolescencia, y varias horas depurando cadenas de autenticación. Este es el lado de OAuth de [esa historia](/blog/shipping-a2a-protocol-support-in-rust/).

**El OAuth para MCP funciona, pero la especificación deja cuatro trampas que los tutoriales pasan por alto.**

## 1. Tu servidor MCP necesita dos endpoints `.well-known`, no uno

Cuando claude.ai se conecta a un endpoint MCP personalizado, no solo hace un POST a tu URL. Primero sondea los metadatos de OAuth. La especificación de autenticación de MCP requiere dos endpoints de descubrimiento:

`GET /.well-known/oauth-authorization-server` devuelve los metadatos del servidor de autorización OAuth 2.0 (RFC 8414): dónde autorizar, dónde intercambiar tokens y qué tipos de concesión soportas.

`GET /.well-known/oauth-protected-resource` devuelve los metadatos del recurso protegido (RFC 9728): qué recurso es, qué ámbitos necesita y dónde encontrar el servidor de autorización.

Si falta cualquiera de los dos, claude.ai falla silenciosamente al conectarse. Sin mensaje de error, sin reintento. Simplemente no muestra el botón "Connect". Perdí una hora por esto porque el endpoint `oauth-protected-resource` no aparecía en ningún tutorial que encontré. Solo lo descubrí leyendo la especificación de autenticación de MCP directamente.

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

Ambos endpoints deben devolver JSON, ambos deben estar en las rutas exactas especificadas y ambos deben coincidir en la URL del servidor de autorización. Si `issuer` en uno no coincide con `authorization_server` en el otro, el cliente rechaza la configuración.

## 2. La biblioteca de autenticación que elegiste podría quedar obsoleta a mitad del PR

Reactive Resume utiliza better-auth para la autenticación. better-auth incluye un complemento `mcp()` que gestiona el registro dinámico de clientes y la administración de tokens. Perfecto: tres líneas de configuración y ya tienes OAuth para MCP.

Construí todo el PR en torno a ello, lo desplegué en Cloud Run, verifiqué que funcionaba de punta a punta con claude.ai y marqué el PR como listo para revisión.

La [respuesta](https://github.com/amruthpillai/reactive-resume/pull/2829#issuecomment-1) del mantenedor:

> The MCP plugin is soon to be deprecated [...] Could you refactor the PR to make use of the OAuth Provider Plugin instead?

Tenía razón. La documentación de better-auth ya tenía un aviso de obsolescencia que apuntaba a `@better-auth/oauth-provider`. El nuevo complemento es más general (no específico para MCP), utiliza tokens JWT en lugar de tokens opacos, y requiere la gestión de claves JWKS.

La refactorización tocó todos los archivos relacionados con la autenticación. La búsqueda de tokens opacos mediante `getMcpSession()` pasó a ser la verificación de JWT mediante `verifyAccessToken()`. El esquema de la base de datos cambió: `oauthApplication` se convirtió en `oauthClient` (compatible con RFC 7591) y aparecieron nuevas tablas para `oauthRefreshToken` y `jwks`.

La lección no es "revisa las obsolescencias primero", sino que las herramientas de autenticación para MCP están evolucionando rápidamente ahora mismo. Lo que elijas hoy podría quedar obsoleto el próximo mes. Mantén tu lógica de OAuth detrás de un adaptador ligero para que la refactorización sea mecánica y no arquitectónica.

## 3. Tu cadena de autenticación tiene más capas de las que crees

El flujo de OAuth funcionaba. Cada llamada a herramienta fallaba con `Unauthorized`.

El problema: Reactive Resume utiliza oRPC para su capa de API. El contexto de oRPC tiene su propia cadena de autenticación, separada de la autenticación del endpoint MCP. Cuando una herramienta llama a `listResumes`, oRPC busca una cookie de sesión o una clave de API. No sabe nada acerca de los tokens Bearer de OAuth.

El endpoint MCP autenticaba al usuario. Luego llamaba a un procedimiento oRPC. oRPC no veía ninguna cookie ni ninguna clave de API. `Unauthorized`.

La solución: propagar el token Bearer a través de la cadena de autenticación de oRPC.

```typescript
// En el generador de contexto de oRPC
const bearer = headers.get("authorization")?.replace("Bearer ", "");
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

La lección más profunda: en cualquier sistema donde la autenticación ocurre en una capa de puerta de enlace (endpoint MCP) y luego se reenvía a una capa interna (oRPC), debes verificar que la capa interna acepte el mismo formato de credencial. Si no lo hace, tienes dos opciones: pasar el contexto de usuario resuelto o enseñar a la capa interna a entender el nuevo tipo de credencial. Elegí lo segundo porque es más robusto ante futuras adiciones de herramientas.

E incluso después de arreglar la cadena de autenticación, una segunda sorpresa: `getMcpSession()` (y su sucesor `verifyAccessToken()`) devuelve un objeto `OAuthAccessToken` con un campo `userId`, no un campo `user`. Necesitas una búsqueda separada en la base de datos:

```typescript
const token = await verifyAccessToken(bearer);
const user = await db.query.user.findFirst({
  where: eq(userTable.id, token.userId),
});
```

En cualquier implementación de proveedor OAuth, la verificación del token y la resolución del usuario son dos pasos separados. No asumas que la biblioteca los fusiona.

## 4. La compatibilidad con versiones anteriores significa dos rutas de autenticación para siempre

Reactive Resume ya tenía autenticación MCP mediante encabezados `x-api-key`. Los usuarios existentes tienen claves de API configuradas. Eliminarlo por completo y obligar a todos a volver a autenticarse vía OAuth rompería todas las integraciones existentes.

Por lo tanto, el endpoint MCP ahora tiene una ruta de autenticación dual:

```typescript
// Prueba OAuth Bearer primero
const bearer = headers.get("authorization")?.replace("Bearer ", "");
if (bearer) {
  const session = await verifyOAuthToken(bearer);
  if (session?.userId) { /* autenticado */ }
}

// Vuelve a la clave de API
const apiKey = headers.get("x-api-key");
if (apiKey) {
  const user = await verifyApiKey(apiKey);
  if (user) { /* autenticado */ }
}

// Ninguna funcionó
return new Response("Unauthorized", {
  status: 401,
  headers: { "WWW-Authenticate": "Bearer" },
});
```

El orden importa. Bearer primero, clave de API después. Si verificas la clave de API primero y el usuario envía una clave de API malformada junto con un token Bearer válido, la verificación de la clave de API podría lanzar un error antes de que se ejecute la ruta Bearer.

Y el encabezado `WWW-Authenticate: Bearer` en la respuesta 401 es obligatorio según la especificación de MCP. Sin él, claude.ai no sabe que debe iniciar el flujo de OAuth; simplemente trata el endpoint como permanentemente inaccesible.

La ruta de la clave de API sobrevivirá a este PR. Eliminarla es un cambio que rompe la compatibilidad y requiere un plan de migración y una cronología de obsolescencia.

Otra sutileza: `verifyApiKey` puede lanzar un error ante una entrada malformada. Envolverlo en un try-catch evita registros de error ruidosos por intentos fallidos de análisis de tokens. El código original usaba coincidencia de cadenas en los mensajes de error (`error.message.includes("...")`). La versión refactorizada utiliza `instanceof AuthError`, que es segura en cuanto a tipos y no se romperá si cambia el mensaje de error.

## Lo que dejé fuera

- **Actualización de tokens (Token refresh)**: el complemento OAuth Provider gestiona los tokens de actualización automáticamente. No necesité lógica personalizada.
- **Aplicación de ámbitos (Scope enforcement)**: todas las herramientas de MCP obtienen acceso completo de usuario. Está bien para un constructor de currículums personal, pero no para un SaaS multiinquilino.
- **Limitación de tasa en los endpoints de OAuth**: el registro dinámico de clientes está abierto por diseño (RFC 7591). Cualquiera puede registrarse. La limitación de tasa está en la lista de tareas pendientes del mantenedor.
- **Pantalla de consentimiento**: el OAuth Provider de better-auth omite la pantalla de consentimiento para aplicaciones propias. Si Reactive Resume llega a convertirse en un proveedor OAuth para aplicaciones de terceros, se necesitará una interfaz de consentimiento.

## La configuración que demostró que funciona

Reactive Resume autoalojado en Google Cloud Run (europe-west1), PostgreSQL en Neon.tech (capa gratuita). El flujo de OAuth se completa en menos de 2 segundos: claude.ai descubre los endpoints, se registra dinámicamente, redirige a la página de inicio de sesión, intercambia el código y comienza a realizar llamadas a herramientas. La lista, lectura y modificación de currículums funcionan todas a través del token Bearer.

El flujo está probado de extremo a extremo en Cloud Run. El PR ha sido fusionado y la función se incluirá en el próximo lanzamiento.

Si estás añadiendo OAuth a tu propio servidor MCP, revisa el [PR #2829](https://github.com/amruthpillai/reactive-resume/pull/2829) para ver la implementación completa: cada problema mencionado arriba corresponde a un commit específico. Para probar el resultado, apunta claude.ai a tu propia instancia de Reactive Resume y conéctate vía OAuth. Mi configuración está disponible en [resume.vasudev.xyz](https://resume.vasudev.xyz).

---

*Escribo sobre sistemas, seguridad y la intersección de los agentes de IA con la infraestructura real en [vasudev.xyz](https://vasudev.xyz).*
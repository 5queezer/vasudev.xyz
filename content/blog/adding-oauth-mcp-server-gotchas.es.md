---
title: "Añadiendo OAuth 2.1 a un Self-Hosted MCP Server: 4 Gotchas de la Trinchera"
date: 2026-03-25
description: "¿Qué se rompió cuando conecté claude.ai a mi propia instancia Reactive Resume a través de OAuth?"
images: ["/images/adding-oauth-mcp-server-gotchas-og.png"]
images: ["/images/adding-oauth-mcp-server-gotchas-og.png"]
author: "Christian Pojoni"
tags: ["typescript", "mcp", "oauth"]
translationHash: "5d543c955badade7d5a27c1c01c3d9d1"
---
# MCP (Model Context Protocol) permite que asistentes de IA llamen a herramientas en servidores remotos. Pero si tu servidor MCP está autohospedado, claude.ai necesita autenticarse contra tus cuentas de usuario, no contra las de Anthropic. Eso significa que tu servidor debe convertirse en un proveedor completo de OAuth 2.1: registro dinámico de clientes, flujo de código de autorización con PKCE y intercambio de tokens.

Presenté [PR #2829](https://github.com/amruthpillai/reactive-resume/pull/2829) para añadir esto a [Reactive Resume](https://github.com/amruthpillai/reactive-resume), el constructor de CV de código abierto. Seis commits, una refactorización intermedia del PR después de que el mantenedor señaló una deprecación y varias horas de depuración de cadenas de autenticación. Esta es la parte OAuth de esa historia](/blog/shipping-a2a-protocol-support-in-rust/).

**MCP OAuth funciona, pero la especificación deja cuatro trampas que los tutoriales omiten.**

## 1. Tu MCP server necesita dos endpoints .well-known, no uno

Cuando claude.ai se conecta a un endpoint MCP personalizado, no solo hace POST a tu URL. Primero probea para descubrir metadatos de OAuth. La especificación de autenticación de MCP requiere dos endpoints de descubrimiento:

`GET /.well-known/oauth-authorization-server` devuelve los metadatos del servidor de autorización OAuth 2.0 (RFC 8414). Le indica a los clientes dónde autorizar, dónde intercambiar tokens y qué flujos de concesión admite.

`GET /.well-known/oauth-protected-resource` devuelve los metadatos del recurso protegido (RFC 9728). Describe qué recurso es, qué scopes necesita y dónde encontrar el servidor de autorización.

Faltar cualquiera de los dos y claude.ai falla silenciosamente al conectarse. Sin mensaje de error, sin reintento. Simplemente no muestra el botón “Connect”. Perdí una hora por esto porque el endpoint `oauth-protected-resource` no estaba en ningún tutorial que encontré. Lo descubrí leyendo la especificación de autenticación de MCP directamente.

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

## 2. La librería de autenticación que elegiste podría quedar obsoleta a mitad de PR

Reactive Resume usa `better-auth` para la autenticación. `better-auth` incluye un plugin `mcp()` que maneja el registro dinámico de clientes y la gestión de tokens. Perfecto. Tres líneas de configuración y tendrás OAuth para MCP.

Construí todo el PR con él, lo desplegué a Cloud Run, verifiqué que funcionaba end‑to‑end con claude.ai y marqué el PR listo para revisión.

La respuesta del mantenedor fue:

> The MCP plugin is soon to be deprecated [...] Could you refactor the PR to make use of the OAuth Provider Plugin instead?

Tenía razón. La documentación de `better-auth` ya tenía una nota de deprecación que apuntaba a `@better-auth/oauth-provider`. El nuevo plugin es más general (no está acotado a MCP), usa JWT en lugar de tokens opacos y requiere gestión de claves JWKS.

La refactorización tocó todos los archivos relacionados con autenticación. La búsqueda de sesión opaca mediante `getMcpSession()` se convirtió en verificación de JWT mediante `verifyAccessToken()`. El esquema de base de datos cambió también. `oauthApplication` pasó a llamarse `oauthClient` (conforme a RFC 7591), y aparecieron nuevas tablas para `oauthRefreshToken` y `jwks`.

La lección no es “revisar deprecated antes”, sino que la herramienta de autenticación MCP está evolucionando rápido. Lo que elijas hoy podría quedar obsoleto el próximo mes. Mantén tu lógica OAuth detrás de un adaptador fino para que la refactorización sea mecánica, no arquitectónica.

## 3. Tu cadena de autenticación tiene más capas de lo que crees

El flujo OAuth funcionaba. Cada llamada a herramienta fallaba con `Unauthorized`.

El problema: Reactive Resume usa oRPC para su capa de API. El contexto de oRPC tiene su propia cadena de autenticación, independiente de la autenticación del endpoint MCP. Cuando una herramienta llama a `listResumes`, oRPC busca una cookie de sesión o una API key. No conoce los tokens Bearer de OAuth.

El endpoint MCP autenticaba al usuario. Luego llamaba a un procedimiento oRPC. oRPC no encontraba cookie ni API key. `Unauthorized`.

La solución: propagar el token Bearer a través de la cadena de autenticación de oRPC.

```typescript
// En el constructor del contexto oRPC
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

La lección más profunda: en cualquier sistema donde la autenticación ocurra en una capa de gateway (endpoint MCP) y luego se forward a una capa interna (oRPC), necesitas asegurarte de que la capa interna acepte el mismo formato de credencial. Si no lo hace, tienes dos opciones: pasar el contexto de usuario resuelto, o enseñarle a la capa interna a entender el nuevo tipo de credencial. Yo opté por la segunda porque es más robusta ante futuras herramientas.

Incluso después de arreglar la cadena de autenticación, una segunda sorpresa: `getMcpSession()` (y su sucesor `verifyAccessToken()`) devuelve un objeto `OAuthAccessToken` con un campo `userId`, no con un campo `user`. Necesitas una búsqueda adicional en la base de datos:

```typescriptconst token = await verifyAccessToken(bearer);
const user = await db.query.user.findFirst({
  where: eq(userTable.id, token.userId),
});
```

En cualquier implementación de OAuth, la verificación del token y la resolución del usuario son dos pasos separados. No asumas que la librería los fusiona automáticamente.

## 4. La compatibilidad hacia atrás implica dos rutas de autenticación

Reactive Resume ya tenía autenticación MCP mediante encabezados `x-api-key`. Los usuarios existentes tienen API keys configuradas. Eliminar esa vía y obligar a todos a re‑autenticarse vía OAuth rompería todas las integraciones existentes.

Por eso, el endpoint MCP ahora tiene una ruta dual de autenticación:

```typescript
// Intentar OAuth Bearer primero
const bearer = headers.get("authorization")?.replace("Bearer ", "");
if (bearer) {
  const session = await verifyOAuthToken(bearer);
  if (session?.userId) { /* autenticado */ }
}

// Fallback a API keyconst apiKey = headers.get("x-api-key");
if (apiKey) {
  const user = await verifyApiKey(apiKey);
  if (user) { /* autenticado */ }
}

// Ninguno de los dos funcionó
return new Response("Unauthorized", {
  status: 401,
  headers: { "WWW-Authenticate": "Bearer" },
});
```

El orden es importante: Bearer primero, API key después. Si verificas la API key primero y el usuario envía una API key malformed junto a un token Bearer válido, la verificación de la API key podría lanzar una excepción antes de que se ejecute el camino Bearer.

Y el encabezado `WWW-Authenticate: Bearer` en la respuesta 401 es obligatorio según la especificación MCP. Sin él, claude.ai no sabe iniciar el flujo OAuth; simplemente considera el endpoint como permanentemente inaccesible.

La ruta de API key seguirá existiendo. Quitarla sería un cambio rompiendo que necesita un plan de migración y una línea de tiempo de deprecación.

Un detalle más sutil: `verifyApiKey` puede lanzar una excepción al procesar entradas malformadas. Envuélvela en try‑catch para evitar logs ruidosos de fallos en la parsin del token. La versión original usaba coincidencias de cadena en `error.message`; la versión refactorizada usa `instanceof AuthError`, que es segura de tipo y no romperá si el mensaje de error cambia.

## Lo que dejé fuera

- **Refresh de tokens.** El plugin OAuth Provider gestiona los refresh tokens automáticamente. No necesité lógica personalizada.
- **Fuerza de alcance.** Todas las herramientas MCP obtienen acceso completo del usuario. Está bien para un builder de CV personal, no para un SaaS multi‑tenant.
- **Rate limiting en los endpoints OAuth.** El registro dinámico de clientes está abierto por diseño (RFC 7591). El límite de rate es una TODO del mantenedor.
- **Pantalla de consentimiento.** El plugin OAuth Provider de `better-auth` omite la pantalla de consentimiento para apps de primera parte. Si Reactive Resume llegara a ser un proveedor OAuth de terceros, necesitarías una UI de consentimiento.

## La configuración que lo probó

Reactive Resume autohospedado en Google Cloud Run (europe‑west1), PostgreSQL en Neon.tech (plan gratuito). El flujo OAuth completa en menos de 2 segundos: claude.ai descubre los endpoints, se registra dinámicamente, redirige a la página de login, intercambia el código y comienza a hacer llamadas a herramientas. Listar, leer y editar resumes funcionan a través del token Bearer. El flujo está demostrado end‑to‑end en Cloud Run. El PR se fusionó y la característica se incluye en la próxima versión.

Si estás añadiendo OAuth a tu propio servidor MCP, revisa [PR #2829](https://github.com/amruthpillai/reactive-resume/pull/2829) para la implementación completa. Cada trampa mencionada arriba corresponde a un commit específico. Para probar el resultado, apunta a tu propia instancia de Reactive Resume con claude.ai y conéctala vía OAuth. Mi configuración se ejecuta en [resume.vasudev.xyz](https://resume.vasudev.xyz).

---

*Christian Pojoni construye integraciones MCP para herramientas de código abierto. Más en [vasudev.xyz](https://vasudev.xyz).*

*La imagen de portada de esta publicación fue generada por IA.*
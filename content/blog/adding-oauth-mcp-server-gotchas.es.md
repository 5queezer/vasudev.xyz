---
title: "Agregar OAuth 2.1 a un servidor MCP autohospedado: 4 trampas detectadas en la práctica"
date: 2026-03-25
description: "Qué falló cuando conecté claude.ai a mi propia instancia de Reactive Resume mediante OAuth."
images: ["/images/adding-oauth-mcp-server-gotchas-og.png"]
author: "Christian Pojoni"
tags: ["typescript", "mcp", "oauth"]
translationHash: "59290bbbb76267a112a064d6ee271b13"
---
**MCP OAuth funciona, pero la especificación deja cuatro trampas que los tutoriales omiten.**

MCP (Model Context Protocol) permite a los asistentes de IA llamar a herramientas en servidores remotos. Pero si tu servidor MCP es autoalojado, claude.ai necesita autenticarse contra tus cuentas de usuario, no contra las de Anthropic. Eso significa que tu servidor debe convertirse en un proveedor OAuth 2.1 -- Registro dinámico de clientes, Código de autorización con PKCE, intercambio de tokens.

Presenté [PR #2829](https://github.com/amruthpillai/reactive-resume/pull/2829) para añadir esto a [Reactive Resume](https://github.com/amruthpillai/reactive-resume), el creador de currículums de código abierto. Seis commits, una refactorización a mitad de PR después de que el mantenedor marcó una deprecación, y varias horas depurando cadenas de autenticación. Esto es la parte OAuth de [esa historia](/blog/shipping-a2a-protocol-support-in-rust/).

## 1. Tu servidor MCP necesita dos endpoints .well-known, no uno

Cuando claude.ai se conecta a un endpoint MCP personalizado, no solo envía un POST a tu URL. Primero busca metadatos de OAuth. La especificación de autenticación MCP requiere dos endpoint de descubrimiento:

`GET /.well-known/oauth-authorization-server` devuelve el Metadata del Servidor de Autorización OAuth 2.0 (RFC 8414) -- dónde autorizar, dónde intercambiar tokens, qué tipos de concesión admite.

`GET /.well-known/oauth-protected-resource` devuelve el Metadata del Recurso Protegido (RFC 9728) -- qué recurso es, qué scopes necesita, y dónde encontrar el servidor de autorización.

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

Si falta alguno, claude.ai falla silenciosamente al conectar. No muestra mensaje de error, ni reintento. Simplemente no muestra el botón de "Connect". Perdí una hora por esto porque el endpoint `oauth-protected-resource` no estaba en ningún tutorial que encontré. Lo descubrí leyendo directamente la especificación de autenticación MCP.

## 2. La biblioteca de autenticación que elegiste podría quedar en desuso a mitad de PR

Reactive Resume usa better-auth para la autenticación. Better-auth incluye un plugin `mcp()` que gestiona Dynamic Client Registration y la gestión de tokens. Perfecto -- tres líneas de configuración y tienes OAuth para MCP.

Construí toda la PR alrededor de ello, la implementé en Cloud Run, verifiqué que funcionaba de extremo a extremo con claude.ai, y marqué la PR como lista para revisión.

La respuesta del mantenedor [https://github.com/amruthpillai/reactive-resume/pull/2829#issuecomment-1]:

> El plugin MCP pronto quedará en desuso [...] ¿Podrías refactorizar la PR para usar el OAuth Provider Plugin en su lugar?

Tenía razón. La documentación de better-auth ya tenía un aviso de deprecación que apuntaba a `@better-auth/oauth-provider`. El nuevo plugin es más general (no específico de MCP), usa tokens JWT en lugar de tokens opacos, y requiere la gestión de claves JWKS.

La refactorización tocó todos los archivos relacionados con autenticación. La búsqueda de tokens opacos mediante `getMcpSession()` se convirtió en verificación de JWT mediante `verifyAccessToken()`. El esquema de base de datos cambió -- `oauthApplication` pasó a llamarse `oauthClient` (cumpliendo RFC 7591), y aparecieron nuevas tablas para `oauthRefreshToken` y `jwks`.

La lección no es "revisar las deprecaciones primero" -- es que la herramienta de autenticación MCP está evolucionando rápidamente. Lo que elijas hoy podría quedar obsoleto el próximo mes. Mantén tu lógica OAuth detrás de un adaptador delgado para que la refactorización sea mecánica, no arquitectónica.

## 3. Tu cadena de autenticación tiene más capas de lo que piensan

El flujo OAuth funcionaba. Cada llamada a una herramienta fallaba con `Unauthorized`.

El problema: Reactive Resume usa oRPC para su capa de API. El contexto de oRPC tiene su propia cadena de autenticación -- separada de la autenticación del endpoint MCP. Cuando una herramienta llama a `listResumes`, oRPC busca una cookie de sesión o una clave API. No conoce tokens Bearer de OAuth.

```typescript
// In the oRPC context builder
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

La lección más profunda: en cualquier sistema donde la autenticación ocurre en una capa de puerta de enlace (endpoint MCP) y luego se reenvía a una capa interna (oRPC), debes verificar que la capa interna acepte el mismo formato de credencial. Si no lo hace, tienes dos opciones: pasar el contexto de usuario resuelto, o enseñar a la capa interna a entender el nuevo tipo de credencial. Elegí la segunda porque es más robusta ante futuras adiciones de herramientas.

Y even after fixing the auth chain, a second surprise: `getMcpSession()` (and its successor `verifyAccessToken()`) returns an `OAuthAccessToken` object with a `userId` field, not a `user` field. You need a separate database lookup:

```typescript
const token = await verifyAccessToken(bearer);
const user = await db.query.user.findFirst({
  where: eq(userTable.id, token.userId),
});
```

En cualquier implementación de proveedor OAuth, la verificación del token y la resolución del usuario son dos pasos separados. No asumas que la biblioteca los combina.

## 4. La compatibilidad hacia atrás significa dos caminos de autenticación para siempre

Reactive Resume ya tenía autenticación MCP mediante encabezados `x-api-key`. Los usuarios existentes tienen claves API configuradas. Eliminar eso y obligar a todos a reautenticarse mediante OAuth rompería cada integración existente.

Así que el endpoint MCP ahora tiene un camino de autenticación dual:

```typescript// Try OAuth Bearer first
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

El orden es importante. Primero Bearer, luego API key. Si verificas la clave API primero y el usuario envía una clave API mal formada junto con un token Bearer válido, la verificación de la clave API podría lanzar una excepción antes de que se ejecute la ruta Bearer.

Y el encabezado `WWW-Authenticate: Bearer` en la respuesta 401 es obligatorio según la especificación MCP. Sin él, claude.ai no sabe iniciar el flujo OAuth -- simplemente trata el endpoint como permanentemente inaccesible.

El camino de la clave API seguirá existiendo después de esta PR. Eliminarlo es un cambio rompiendo, que necesita un plan de migración y una línea de tiempo de deprecación.

Un detalle más: `verifyApiKey` puede lanzar una excepción con entrada malformada. Envuelvela en try-catch para evitar logs ruidosos por intentos fallidos de análisis de tokens. El código original usaba coincidencia de cadenas en `error.message.includes("...")`. La versión refactorizada usa `instanceof AuthError` -- seguro por tipos y no romperá si cambia el mensaje de error.

## Lo que dejé fuera

- Token refresh -- el plugin OAuth Provider maneja refresh tokens automáticamente. No necesitaba lógica personalizada.
- Scope enforcement -- todas las herramientas MCP obtienen acceso completo al usuario. Está bien para un creador de currículums personal, no está bien para un SaaS multiarrendador.
- Rate limiting on the OAuth endpoints -- Dynamic Client Registration es abierto por diseño (RFC 7591). Cualquiera puede registrarse. El limitado de velocidad está en la lista de pendientes del mantenedor.
- Consent screen -- better-auth's OAuth Provider omite la pantalla de consentimiento para apps de primera parte. Si Reactive Resume alguna vez se convierte en un proveedor OAuth para apps de terceros, se necesita una UI de consentimiento.

## La configuración que demostró que funciona

Reactive Resume autoalojado en Google Cloud Run (europe-west1), PostgreSQL en Neon.tech (plan gratuito). El flujo OAuth se completa en menos de 2 segundos: claude.ai descubre los endpoints, se registra dinámicamente, redirige a la página de inicio de sesión, intercambia el código y comienza a hacer llamadas a herramientas. Listar, leer y parchear currículums funciona todo a través del token Bearer.

El flujo está demostrado end-to-end en Cloud Run. La PR se ha fusionado y la función se lanzará en la próxima versión.

Si estás añadiendo OAuth a tu propio servidor MCP, lee [PR #2829](https://github.com/amruthpillai/reactive-resume/pull/2829) para ver la implementación completa -- cada trampa mencionada se corresponde con un commit específico. Para probar el resultado, apunta claude.ai a tu propia instancia de Reactive Resume y conéctala vía OAuth. Mi configuración se ejecuta en [resume.vasudev.xyz](https://resume.vasudev.xyz).

Escribo sobre sistemas, seguridad y la intersección de agentes de IA con infraestructura real en [vasudev.xyz](https://vasudev.xyz).

*La imagen de portada de esta publicación fue generada por IA.*
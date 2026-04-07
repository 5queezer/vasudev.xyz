---
title: "Añadiendo OAuth 2.1 a un Servidor MCP Autohospedado: 4 Trucos de la Trinchera"
date: 2026-03-25
description: "¿Qué se rompió cuando conecté claude.ai a mi propia instancia de Reactive Resume mediante OAuth?"
images: ["/images/adding-oauth-mcp-server-gotchas-og.png"]
images: ["/images/adding-oauth-mcp-server-gotchas-og.png"]
images: ["/images/adding-oauth-mcp-server-gotchas-og.png"]
author: "Christian Pojoni"
tags: ["typescript", "mcp", "oauth"]
translationHash: "ae7a96698783113f55c1ffdf69cd7add"
---
MCP (Model Context Protocol) permite que asistentes de IA llamen a herramientas en servidores remotos. Pero si tu servidor MCP es autohospedado, claude.ai necesita autenticarse contra tus cuentas de usuario, no contra las de Anthropic. Eso significa que tu servidor debe convertirse en un proveedor de OAuth 2.1 — Registro dinámico de clientes, Código de autorización con PKCE, intercambio de tokens.

Presenté [PR #2829](https://github.com/amruthpillai/reactive-resume/pull/2829) para añadir esto a [Reactive Resume](https://github.com/amruthpillai/reactive-resume), el constructor de currículums de código abierto. Seis commits, una refactorización a mitad de PR después de que el mantenedor señaló una deprecación, y varias horas de depuración de cadenas de autenticación. Esta es la parte de OAuth de [esa historia](/blog/shipping-a2a-protocol-support-in-rust/).

**MCP OAuth funciona, pero la especificación deja cuatro trampas que los tutoriales omiten.**

## 1. Tu servidor MCP necesita dos endpoints .well-known, no uno

Cuando claude.ai se conecta a un endpoint MCP personalizado, no solo publica en tu URL. Primero busca metadatos de OAuth. La especificación de autenticación de MCP requiere dos endpoints de descubrimiento:

`GET /.well-known/oauth-authorization-server` devuelve los Metadatos del Servidor de Autorización OAuth 2.0 (RFC 8414) — dónde autorizar, dónde intercambiar tokens, qué tipos de concesión admites.

`GET /.well-known/oauth-protected-resource` devuelve los Metadatos del Recurso Protegido (RFC 9728) — qué recurso es, qué scopes necesita, y dónde encontrar el servidor de autorización.

Ambos endpoints deben devolver JSON, ambos deben estar en las rutas exactas especificadas, y ambos deben estar de acuerdo en la URL del servidor de autorización. Si `issuer` en uno no coincide con `authorization_server` en el otro, el cliente rechaza la configuración.

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

Ambos endpoints deben regresar JSON, ambos deben estar en las rutas exactas indicadas, y ambos deben coincidir en la URL del servidor de autorización. Si `issuer` de uno no coincide con `authorization_server` del otro, el cliente rechaza la configuración.

## 2. La librería de autenticación que elegiste podría quedar obsoleta a mitad de PR

Reactive Resume usa better-auth para la autenticación. Better-auth incluye un plugin `mcp()` que gestiona el Registro dinámico de clientes y la gestión de tokens. Perfecto — solo tres líneas de configuración y tendrás OAuth para MCP.

Construí todo el PR alrededor de ello, lo desplegué a Cloud Run, verifiqué que funcionaba end‑to‑end con claude.ai, y marqué el PR listo para revisión.

La respuesta del mantenedor [aquí](https://github.com/amruthpillai/reactive-resume/pull/2829#issuecomment-1):

> El plugin MCP pronto quedará obsoleto [...] ¿Podrías refactorizar el PR para usar el plugin OAuth Provider en su lugar?

Tenía razón. La documentación de better-auth ya tenía una nota de deprecación que apuntaba a `@better-auth/oauth-provider`. El nuevo plugin es más general (no específico de MCP), usa tokens JWT en lugar de tokens opacos, y requiere la gestión de claves JWKS.

La refactorización tocó todos los archivos relacionados con autenticación. La búsqueda de tokens opacos mediante `getMcpSession()` se convirtió en verificación de JWT mediante `verifyAccessToken()`. El esquema de base de datos cambió — `oauthApplication` se convirtió en `oauthClient` (compatible con RFC 7591), y se añadieron tablas nuevas para `oauthRefreshToken` y `jwks`.

La lección no es "checar por deprecaciones primero" — es que la herramienta de autenticación de MCP está evolucionando rápidamente ahora. Lo que elijas hoy podría quedar obsoleto el próximo mes. Mantén tu lógica OAuth detrás de un adaptador delgado para que el refactor sea mecánico, no arquitectónico.

## 3. Tu cadena de autenticación tiene más capas de lo que piensas

El flujo de OAuth funcionó. Cada llamada a herramienta falló con `Unauthorized`.

El problema: Reactive Resume usa oRPC para su capa de API. El contexto oRPC tiene su propia cadena de autenticación — separada de la autenticación del endpoint MCP. Cuando una herramienta llama a `listResumes`, oRPC busca una cookie de sesión o una clave API. No conoce los tokens Bearer de OAuth.

El endpoint MCP autenticó al usuario. Luego llamó a un procedimiento oRPC. oRPC no encontró cookie ni clave API. `Unauthorized`.

La solución: propagar el token Bearer a través de la cadena de autenticación oRPC.

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

La lección más profunda: en cualquier sistema donde la autenticación ocurra en una capa de gateway (endpoint MCP) y luego se reenvíe a una capa interna (oRPC), debes verificar que la capa interna acepte el mismo formato de credencial. Si no lo hace, tienes dos opciones: pasar el contexto de usuario resuelto, o enseñar a la capa interna a entender el nuevo tipo de credencial. Elegí la segunda porque es más robusta frente a futuras adiciones de herramientas.

## 4. La compatibilidad hacia atrás implica dos caminos de autenticación para siempre

Reactive Resume ya tenía autenticación MCP mediante encabezados `x-api-key`. Los usuarios existentes ya tienen claves API configuradas. Eliminar eso y obligar a todos a reautenticarse mediante OAuth rompería todas las integraciones existentes.

Por lo tanto, el endpoint MCP ahora tiene un camino de autenticación dual:

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

El orden importa. Primero Bearer, luego clave API. Si verificas la clave API primero y el usuario envía una clave API malformada junto con un token Bearer válido, la verificación de la clave API podría lanzar una excepción antes de que se ejecute la ruta Bearer.

Y el encabezado `WWW-Authenticate: Bearer` en la respuesta 401 es requerido por la especificación MCP. Sin él, claude.ai no sabe iniciar el flujo OAuth — simplemente trata el endpoint como permanentemente inaccesible.

El camino de clave API seguirá existiendo después de este PR. Eliminarlo es un cambio quebrantador que necesita un plan de migración y una línea de tiempo de deprecación.

Y `verifyApiKey` puede lanzar una excepción con entradas malformadas. Envolverlo en try-catch evita registros de error ruidosos por intentos fallidos de análisis de tokens. El código original usaba coincidencia de cadenas en `error.message.includes("...")`. La versión refactorizada usa `instanceof AuthError` — es más seguro tipando y no falla si el mensaje de error cambia.

## Lo que dejé afuera

- **Token refresh** — el plugin OAuth Provider gestiona automáticamente los tokens de actualización. No necesitaba lógica personalizada.
- **Scope enforcement** — todas las herramientas MCP reciben acceso completo al usuario. Está bien para un constructor de currículums personal, no está bien para un SaaS multi‑arrendador.
- **Rate limiting on the OAuth endpoints** — Registro dinámico de clientes está abierto por diseño (RFC 7591). Cualquiera puede registrar. El límite de velocidad está en la lista TODO del mantenedor.
- **Consent screen** — OAuth Provider de better-auth omite la pantalla de consentimiento para aplicaciones de primera parte. Si Reactive Resume llegara a ser un proveedor OAuth para aplicaciones de terceros, se necesitaría una UI de consentimiento.

La configuración que demostró que funciona

Reactive Resume autohospedado en Google Cloud Run (europe-west1), PostgreSQL en Neon.tech (plan gratuito). El flujo OAuth se completa en menos de 2 segundos: claude.ai descubre los endpoints, se registra dinámicamente, redirige a la página de inicio de sesión, intercambia el código y comienza a hacer llamadas a herramientas. Listar, leer y editar currículums funciona todo a través del token Bearer.

El flujo está probado end‑to‑end en Cloud Run. El PR ha sido fusionado y la característica se lanzará en la próxima versión.

Si estás añadiendo OAuth a tu propio servidor MCP, lee [PR #2829](https://github.com/amruthpillai/reactive-resume/pull/2829) para la implementación completa — cada trampa mencionada arriba corresponde a un commit específico. Para probar el resultado, apunta claude.ai a tu propia instancia de Reactive Resume y conéctala vía OAuth. Mi configuración funciona en [resume.vasudev.xyz](https://resume.vasudev.xyz).

---

*Escribo sobre sistemas, seguridad, e la intersección de agentes de IA con infraestructura real en [vasudev.xyz](https://vasudev.xyz).*

*La imagen de portada de esta publicación fue generada por IA.*
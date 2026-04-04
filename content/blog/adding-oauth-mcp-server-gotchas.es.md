---
title: "Añadir OAuth 2.1 a un servidor MCP autoalojado: 4 obstáculos en la práctica"
date: 2026-03-25
description: "Qué falló cuando conecté claude.ai a mi propia instancia de Reactive Resume mediante OAuth."
author: "Christian Pojoni"
tags: ["typescript", "mcp", "oauth"]
translationHash: "c658be89c2d27b45c1b88a920e4e3940"
---
El MCP (Model Context Protocol) permite a los asistentes de IA invocar herramientas en servidores remotos. Pero si tu servidor MCP está autoalojado, claude.ai necesita autenticarse contra tus cuentas de usuario, no contra las de Anthropic. Eso significa que tu servidor tiene que convertirse en un proveedor de OAuth 2.1: registro dinámico de clientes, código de autorización con PKCE, intercambio de tokens.

Envié el [PR #2829](https://github.com/amruthpillai/reactive-resume/pull/2829) para añadir esto a [Reactive Resume](https://github.com/amruthpillai/reactive-resume), el generador de currículums de código abierto. Seis commits, una refactorización a mitad del PR después de que el mantenedor señalara una deprecación, y varias horas depurando cadenas de autenticación. Este es el lado de OAuth de [esa historia](/blog/shipping-a2a-protocol-support-in-rust/).

**OAuth para MCP funciona, pero la especificación deja cuatro trampas que los tutoriales pasan por alto.**

## 1. Tu servidor MCP necesita dos endpoints .well-known, no uno

Cuando claude.ai se conecta a un endpoint MCP personalizado, no solo hace un POST a tu URL. Primero sondea en busca de metadatos de OAuth. La especificación de autenticación de MCP requiere dos endpoints de descubrimiento:

`GET /.well-known/oauth-authorization-server` devuelve los metadatos del servidor de autorización OAuth 2.0 (RFC 8414): dónde autorizar, dónde intercambiar tokens y qué tipos de grant soportas.

`GET /.well-known/oauth-protected-resource` devuelve los metadatos del recurso protegido (RFC 9728): qué recurso es, qué scopes necesita y dónde encontrar el servidor de autorización.

Si falta cualquiera de los dos, claude.ai falla silenciosamente al conectarse. Sin mensaje de error, sin reintento. Simplemente no muestra el botón "Connect". Perdí una hora con esto porque el endpoint `oauth-protected-resource` no aparecía en ningún tutorial que encontré. Solo lo descubrí leyendo directamente la especificación de autenticación de MCP.

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

Ambos endpoints deben devolver JSON, ambos deben estar en las rutas exactas especificadas y ambos deben coincidir en la URL del servidor de autorización. Si el `issuer` en uno no coincide con `authorization_server` en el otro, el cliente rechaza la configuración.

## 2. La librería de autenticación que elegiste podría quedar deprecada a mitad del PR

Reactive Resume utiliza better-auth para la autenticación. Better-auth incluye un plugin `mcp()` que maneja el registro dinámico de clientes y la gestión de tokens. Perfecto: tres líneas de configuración y ya tienes OAuth para MCP.

Construí todo el PR basándome en ello, lo desplegué en Cloud Run, verifiqué que funcionaba de extremo a extremo con claude.ai y marqué el PR como listo para revisión.

La [respuesta](https://github.com/amruthpillai/reactive-resume/pull/2829#issuecomment-1) del mantenedor:

> El plugin de MCP pronto quedará deprecado [...] ¿Podrías refactorizar el PR para utilizar en su lugar el OAuth Provider Plugin?

Tenía razón. La documentación de better-auth ya tenía un aviso de deprecación que apuntaba a `@better-auth/oauth-provider`. El nuevo plugin es más general (no específico de MCP), utiliza tokens JWT en lugar de tokens opacos y requiere gestión de claves JWKS.

La refactorización tocó todos los archivos relacionados con la autenticación. La búsqueda de tokens opacos mediante `getMcpSession()` se convirtió en verificación JWT mediante `verifyAccessToken()`. El esquema de la base de datos cambió: `oauthApplication` pasó a ser `oauthClient` (compatible con RFC 7591), y aparecieron nuevas tablas para `oauthRefreshToken` y `jwks`.

La lección no es "revisa las deprecaciones primero", sino que las herramientas de autenticación para MCP avanzan muy rápido ahora mismo. Lo que elijas hoy podría quedar obsoleto el próximo mes. Mantén tu lógica de OAuth detrás de un adaptador delgado para que la refactorización sea mecánica, no arquitectónica.

## 3. Tu cadena de autenticación tiene más capas de las que piensas

El flujo de OAuth funcionaba. Cada llamada a herramientas fallaba con `Unauthorized`.

El problema: Reactive Resume utiliza oRPC para su capa de API. El contexto de oRPC tiene su propia cadena de autenticación, separada de la autenticación del endpoint MCP. Cuando una herramienta llama a `listResumes`, oRPC busca una cookie de sesión o una clave API. No sabe nada sobre tokens OAuth Bearer.

El endpoint MCP autenticaba al usuario. Luego llamaba a un procedimiento de oRPC. oRPC no veía ninguna cookie ni clave API. `Unauthorized`.

La solución: propagar el token Bearer a través de la cadena de autenticación de oRPC.

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

La lección más profunda: en cualquier sistema donde la autenticación ocurre en una capa de puerta de enlace (endpoint MCP) y luego se reenvía a una capa interna (oRPC), necesitas verificar que la capa interna acepte el mismo formato de credencial. Si no lo hace, tienes dos opciones: pasar el contexto de usuario resuelto, o enseñar a la capa interna a entender el nuevo tipo de credencial. Elegí lo segundo porque es más robusto ante futuras adiciones de herramientas.

E incluso después de arreglar la cadena de autenticación, una segunda sorpresa: `getMcpSession()` (y su sucesor `verifyAccessToken()`) devuelve un objeto `OAuthAccessToken` con un campo `userId`, no un campo `user`. Necesitas una consulta separada a la base de datos:

```typescript
const token = await verifyAccessToken(bearer);
const user = await db.query.user.findFirst({
  where: eq(userTable.id, token.userId),
});
```

En cualquier implementación de proveedor OAuth, la verificación del token y la resolución del usuario son dos pasos separados. No asumas que la biblioteca los combina.

## 4. La compatibilidad hacia atrás significa dos rutas de autenticación para siempre

Reactive Resume ya tenía autenticación MCP mediante cabeceras `x-api-key`. Los usuarios existentes tienen claves API configuradas. Eliminar eso y forzar a todos a volver a autenticarse vía OAuth rompería todas las integraciones existentes.

Por lo tanto, el endpoint MCP ahora tiene una ruta de autenticación dual:

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

El orden importa. Bearer primero, clave API segundo. Si verificas la clave API primero y el usuario envía una clave API malformada junto con un token Bearer válido, la verificación de la clave API podría lanzar una excepción antes de que se ejecute la ruta Bearer.

Y la cabecera `WWW-Authenticate: Bearer` en la respuesta 401 es requerida por la especificación de MCP. Sin ella, claude.ai no sabe que debe iniciar el flujo de OAuth; simplemente trata el endpoint como permanentemente inaccesible.

La ruta de clave API sobrevivirá a este PR. Eliminarla es un cambio incompatible que necesita un plan de migración y un calendario de deprecación.

Un detalle más: `verifyApiKey` puede lanzar excepciones con entradas malformadas. Envolverla en un try-catch evita registros de error ruidosos por intentos fallidos de análisis de tokens. El código original usaba coincidencia de strings en mensajes de error (`error.message.includes("...")`). La versión refactorizada usa `instanceof AuthError`: segura en cuanto a tipos y no se romperá si cambia el mensaje de error.

## Lo que dejé fuera

- **Refresco de tokens** -- el plugin OAuth Provider maneja los refresh tokens automáticamente. No necesité lógica personalizada.
- **Aplicación de scopes** -- todas las herramientas de MCP obtienen acceso completo al usuario. Perfecto para un generador de currículums personal, no tanto para un SaaS multiinquilino.
- **Rate limiting en los endpoints de OAuth** -- el registro dinámico de clientes está abierto por diseño (RFC 7591). Cualquiera puede registrarse. El rate limiting está en la lista de pendientes del mantenedor.
- **Pantalla de consentimiento** -- el OAuth Provider de better-auth omite la pantalla de consentimiento para aplicaciones propias. Si Reactive Resume alguna vez se convierte en un proveedor OAuth para aplicaciones de terceros, será necesaria una interfaz de consentimiento.

## La configuración que demostró que funciona

Reactive Resume autoalojado en Google Cloud Run (europe-west1), PostgreSQL en Neon.tech (capa gratuita). El flujo de OAuth se completa en menos de 2 segundos: claude.ai descubre los endpoints, se registra dinámicamente, redirige a la página de inicio de sesión, intercambia el código y comienza a realizar llamadas a herramientas. El listado, lectura y aplicación de parches a los currículums funcionan todos a través del token Bearer.

El flujo está probado de extremo a extremo en Cloud Run. El PR ha sido fusionado y la función se publicará con la próxima versión.

Si estás añadiendo OAuth a tu propio servidor MCP, lee el [PR #2829](https://github.com/amruthpillai/reactive-resume/pull/2829) para ver la implementación completa: cada trampa mencionada se corresponde con un commit específico. Para probar el resultado, apunta claude.ai a tu propia instancia de Reactive Resume y conéctate vía OAuth. Mi configuración funciona en [resume.vasudev.xyz](https://resume.vasudev.xyz).

---

*Escribo sobre sistemas, seguridad y la intersección de los agentes de IA con infraestructura real en [vasudev.xyz](https://vasudev.xyz).*
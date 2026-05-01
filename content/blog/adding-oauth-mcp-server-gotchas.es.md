---
title: "Agregar OAuth 2.1 a un servidor MCP autogestionado: 4 problemas desde el frente"
date: 2026-03-25
description: "¿Qué se rompió cuando conecté claude.ai a mi propia instancia de Reactive Resume vía OAuth?"
images: ["/images/adding-oauth-mcp-server-gotchas-og.png"]
author: "Christian Pojoni"
tags: ["typescript", "mcp", "oauth"]
series: ["Field Notes"]
translationHash: "c80e75aa728e9520e437feeab02f9d09"
chunkHashes: "1a0ca76a3309f99b,d3bb3fec7b569eeb,d08f4bf02c40372d,58ef9e41ba4ef7d8,4eaf9f6c399894ba,db1e3d7423007539,651655b1329fc8fa"
---
MCP (Model Context Protocol) permite que los asistentes de IA llamen herramientas en servidores remotos. Pero si tu servidor MCP está auto‑alojado, claude.ai necesita autenticarse contra tus cuentas de usuario, no contra las de Anthropic. Eso significa que tu servidor debe convertirse en un proveedor completo de OAuth 2.1: registro dinámico de clientes, código de autorización con PKCE, intercambio de tokens.

Presenté el [PR #2829](https://github.com/amruthpillai/reactive-resume/pull/2829) para añadir esto a [Reactive Resume](https://github.com/amruthpillai/reactive-resume), el creador de currículums de código abierto. Seis commits, una refactorización a medio PR después de que el mantenedor señalara una deprecación, y varias horas depurando cadenas de autenticación. Esta es la parte de OAuth de [esa historia](/blog/shipping-a2a-protocol-support-in-rust/).

**OAuth de MCP funciona, pero la especificación deja cuatro trampas que los tutoriales omiten.**
## 1. Su servidor MCP necesita dos endpoints .well-known, no uno

Cuando claude.ai se conecta a un endpoint MCP personalizado, no solo hace POST a su URL. Primero sondea los metadatos de OAuth. La especificación de autenticación MCP requiere dos endpoints de descubrimiento:

`GET /.well-known/oauth-authorization-server` devuelve los Metadatos del Servidor de Autorización OAuth 2.0 (RFC 8414). Indica a los clientes dónde autorizar, dónde intercambiar tokens y qué tipos de concesión soporta.

`GET /.well-known/oauth-protected-resource` devuelve los Metadatos del Recurso Protegido (RFC 9728). Describe qué recurso es, qué alcances necesita y dónde encontrar el servidor de autorización.

Si falta alguno, claude.ai falla silenciosamente al conectar. No hay mensaje de error, no hay reintento. Simplemente no muestra el botón "Connect". Perdí una hora por esto porque el endpoint `oauth-protected-resource` no estaba en ninguno de los tutoriales que encontré. Sólo lo descubrí leyendo directamente la especificación de autenticación MCP.

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

Reactive Resume usa **better-auth** para la autenticación. **better-auth** incluye un plugin `mcp()` que gestiona el Registro Dinámico de Clientes y la gestión de tokens. Perfecto. Tres líneas de configuración y tienes OAuth para MCP.

Construí todo el PR alrededor de eso, lo desplegué en Cloud Run, verifiqué que funcionara de extremo a extremo con claude.ai y marcó el PR como listo para revisión.

La [respuesta](https://github.com/amruthpillai/reactive-resume/pull/2829#issuecomment-1) del mantenedor:

> El plugin MCP será pronto obsoleto [...] ¿Podrías refactorizar el PR para usar el Plugin de Proveedor OAuth en su lugar?

Tenía razón. La documentación de **better-auth** ya incluía un aviso de deprecación que señalaba a `@better-auth/oauth-provider`. El nuevo plugin es más genérico (no específico de MCP), usa tokens JWT en lugar de tokens opacos y requiere la gestión de claves JWKS.

La refactorización tocó todos los archivos relacionados con la autenticación. La búsqueda del token opaco mediante `getMcpSession()` pasó a ser la verificación de JWT mediante `verifyAccessToken()`. El esquema de la base de datos también cambió. `oauthApplication` se convirtió en `oauthClient` (compatible con RFC 7591) y aparecieron nuevas tablas para `oauthRefreshToken` y `jwks`.

La lección no es “comprobar primero las deprecaciones”. Es que las herramientas de autenticación de MCP están avanzando rápidamente en este momento. Lo que elijas hoy podría quedar supersedido el próximo mes. Mantén tu lógica OAuth detrás de un adaptador delgado para que la refactorización sea mecánica, no arquitectónica.
## 3. Tu cadena de autenticación tiene más capas de lo que piensas

El flujo OAuth funcionó. Cada llamada de herramienta falló con `Unauthorized`.

El problema: Reactive Resume usa oRPC para su capa API. El contexto oRPC tiene su propia cadena de autenticación, separada de la autenticación del punto final MCP. Cuando una herramienta llama a `listResumes`, oRPC verifica si hay una cookie de sesión o una clave API. No reconoce los tokens Bearer de OAuth.

El punto final MCP autenticó al usuario. Luego llamó a un procedimiento oRPC. oRPC no vio cookie ni clave API. `Unauthorized`.

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

La lección más profunda: en cualquier sistema donde la autenticación ocurre en una capa de puerta de enlace (punto final MCP) y luego se reenvía a una capa interna (oRPC), necesitas verificar que la capa interna acepte el mismo formato de credencial. Si no lo hace, tienes dos opciones: pasar el contexto de usuario resuelto a través de la cadena, o enseñar a la capa interna a entender el nuevo tipo de credencial. Elegí lo último porque es más robusto frente a futuras incorporaciones de herramientas.

Y aún después de arreglar la cadena de autenticación, una segunda sorpresa: `getMcpSession()` (y su sucesor `verifyAccessToken()`) devuelve un objeto `OAuthAccessToken` con un campo `userId`, no un campo `user`. Necesitas una búsqueda separada en la base de datos:

```typescript
const token = await verifyAccessToken(bearer);
const user = await db.query.user.findFirst({
  where: eq(userTable.id, token.userId),
});
```

En cualquier implementación de proveedor OAuth, la verificación del token y la resolución del usuario son dos pasos separados. No supongas que la biblioteca los combina.
## 4. La compatibilidad hacia atrás implica dos rutas de autenticación para siempre

Reactive Resume ya tenía autenticación MCP mediante encabezados `x-api-key`. Los usuarios existentes tienen claves API configuradas. Eliminar eso y obligar a todos a re‑autenticar mediante OAuth rompería cada integración existente.

Así que el endpoint MCP ahora tiene una ruta de autenticación dual:

```typescript
// Intentar OAuth Bearer primero
const bearer = headers.get("authorization")?.replace("Bearer ", "");
if (bearer) {
  const session = await verifyOAuthToken(bearer);
  if (session?.userId) { /* autenticado */ }
}

// Recurir a la clave API
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

El orden es importante. Bearer primero, clave API segundo. Si revisas la clave API primero y el usuario envía una clave API malformada junto con un token Bearer válido, la verificación de la clave API podría lanzar una excepción antes de que se ejecute la ruta Bearer.

Y el encabezado `WWW-Authenticate: Bearer` en la respuesta 401 es obligatorio según la especificación MCP. Sin él, claude.ai no sabe iniciar el flujo OAuth. Simplemente trata el endpoint como permanentemente inaccesible.

La ruta de clave API sobrevivirá a este PR. Eliminarla sería un cambio de ruptura que necesita un plan de migración y una cronología de deprecación.

Un detalle más sutil: `verifyApiKey` puede lanzar una excepción con entrada malformada. Envolverlo en try‑catch evita registros de error ruidosos por intentos fallidos de análisis de token. El código original usaba coincidencia de cadenas en los mensajes de error (`error.message.includes("...")`). La versión refactorizada usa `instanceof AuthError`, que es segura en tiempo de tipo y no se romperá si el mensaje de error cambia.
## Lo que omití

- **Actualización del token.** El plugin OAuth Provider maneja los tokens de actualización automáticamente. No necesité lógica personalizada.
- **Aplicación de alcances.** Todas las herramientas MCP obtienen acceso total al usuario. Está bien para un creador de currículums personal, pero no es adecuado para un SaaS multicliente.
- **Limitación de velocidad en los endpoints OAuth.** El Registro Dinámico de Clientes está abierto por diseño (RFC 7591). Cualquiera puede registrarse. La limitación de velocidad está pendiente en la lista de tareas del mantenedor.
- **Pantalla de consentimiento.** El OAuth Provider de better-auth omite la pantalla de consentimiento para aplicaciones de primera parte. Si Reactive Resume alguna vez se convierte en un proveedor OAuth para aplicaciones de terceros, se necesitará una interfaz de consentimiento.
## La configuración que demostró que funciona

Reactive Resume autoalojado en Google Cloud Run (europe-west1), PostgreSQL en Neon.tech (nivel gratuito). El flujo OAuth se completa en menos de 2 segundos: claude.ai descubre los endpoints, se registra dinámicamente, redirige a la página de inicio de sesión, intercambia el código y comienza a realizar llamadas a herramientas. La lista, lectura y parcheo de currículos funcionan a través del token Bearer.

El flujo está demostrado de extremo a extremo en Cloud Run. El PR ha sido fusionado y la funcionalidad se incluirá en la próxima versión.

Si estás añadiendo OAuth a tu propio servidor MCP, lee [PR #2829](https://github.com/amruthpillai/reactive-resume/pull/2829) para la implementación completa. Cada problema mencionado arriba corresponde a un commit específico. Para probar el resultado, apunta claude.ai a tu propia instancia de Reactive Resume y conéctate mediante OAuth. Mi configuración está disponible en [resume.vasudev.xyz](https://resume.vasudev.xyz).

---

*Christian Pojoni crea integraciones MCP para herramientas de código abierto. Más en [vasudev.xyz](https://vasudev.xyz).*

*La imagen de portada de esta publicación fue generada por IA.*
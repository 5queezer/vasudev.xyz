---
title: "OAuth 2.1 zu einem selbst gehosteten MCP-Server hinzufügen: 4 Fallstricke aus der Praxis"
date: 2026-03-25
description: "Was ist kaputt, wenn ich claude.ai mit meiner eigenen Reactive Resume-Instanz über OAuth verkabelt habe?"
author: "Christian Pojoni"
tags: ["typescript", "mcp", "oauth"]
translationHash: "c658be89c2d27b45c1b88a920e4e3940"
---
MCP (Model Context Protocol) ermöglicht es KI-Assistenten, Tools auf entfernten Servern aufzurufen. Wenn Ihr MCP-Server jedoch selbst gehostet wird, muss sich claude.ai an Ihren Nutzerkonten authentifizieren, nicht an denen von Anthropic. Das bedeutet, dass Ihr Server zu einem OAuth-2.1-Provider werden muss – inklusive Dynamic Client Registration, Authorization Code mit PKCE und Token Exchange.

Ich habe [PR #2829](https://github.com/amruthpillai/reactive-resume/pull/2829) eingereicht, um dies zu [Reactive Resume](https://github.com/amruthpillai/reactive-resume), dem Open-Source-Lebenslauf-Builder, hinzuzufügen. Sechs Commits, ein Refactoring mitten im PR, nachdem der Maintainer eine Deprecation angemerkt hatte, und mehrere Stunden Debugging von Auth-Chains. Dies ist die OAuth-Seite von [dieser Geschichte](/blog/shipping-a2a-protocol-support-in-rust/).

**MCP OAuth funktioniert, aber die Spezifikation birgt vier Fallstricke, die Tutorials übergehen.**

## 1. Ihr MCP-Server benötigt zwei `.well-known`-Endpoints, nicht nur einen

Wenn sich claude.ai mit einem benutzerdefinierten MCP-Endpoint verbindet, sendet es nicht einfach nur ein POST an Ihre URL. Zuerst prüft es auf OAuth-Metadaten. Die MCP-Auth-Spezifikation verlangt zwei Discovery-Endpoints:

`GET /.well-known/oauth-authorization-server` gibt die OAuth-2.0-Authorization-Server-Metadaten (RFC 8414) zurück – wo autorisiert wird, wo Tokens ausgetauscht werden und welche Grant Types unterstützt werden.

`GET /.well-known/oauth-protected-resource` gibt die Protected-Resource-Metadaten (RFC 9728) zurück – um welche Ressource es sich handelt, welche Scopes sie benötigt und wo der Authorization Server zu finden ist.

Fehlt einer von beiden, schlägt die Verbindung zu claude.ai stillschweigend fehl. Keine Fehlermeldung, kein Retry. Der „Connect“-Button wird einfach nicht angezeigt. Ich habe eine Stunde damit verloren, weil der `oauth-protected-resource`-Endpoint in keinem der gefundenen Tutorials auftauchte. Ich habe ihn erst entdeckt, indem ich die MCP-Auth-Spezifikation direkt gelesen habe.

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

Beide Endpoints müssen JSON zurückgeben, sich exakt auf den angegebenen Pfaden befinden und hinsichtlich der Authorization-Server-URL übereinstimmen. Wenn `issuer` in dem einen nicht mit `authorization_server` im anderen übereinstimmt, lehnt der Client die Konfiguration ab.

## 2. Die gewählte Auth-Bibliothek könnte mitten im PR als veraltet markiert werden

Reactive Resume nutzt better-auth für die Authentifizierung. Better-auth liefert ein `mcp()`-Plugin mit, das sich um Dynamic Client Registration und Token-Management kümmert. Perfekt – drei Zeilen Konfig und schon haben Sie OAuth für MCP.

Ich habe den gesamten PR darauf aufgebaut, auf Cloud Run deployed, die End-to-End-Funktionalität mit claude.ai verifiziert und den PR als bereit für Review markiert.

Die [Antwort](https://github.com/amruthpillai/reactive-resume/pull/2829#issuecomment-1) des Maintainers:

> Das MCP-Plugin wird in Kürze als veraltet markiert [...] Könntest du den PR umschreiben, um stattdessen das OAuth-Provider-Plugin zu nutzen?

Er hatte recht. Die better-auth-Dokumentation enthielt bereits einen Deprecation-Hinweis, der auf `@better-auth/oauth-provider` verwies. Das neue Plugin ist allgemeiner (nicht MCP-spezifisch), verwendet JWT-Tokens statt Opaque Tokens und erfordert ein JWKS-Key-Management.

Das Refactoring betraf jede auth-bezogene Datei. Die Opaque-Token-Suche über `getMcpSession()` wurde zur JWT-Verifizierung über `verifyAccessToken()`. Das Datenbankschema änderte sich – `oauthApplication` wurde zu `oauthClient` (RFC-7591-konform), und neue Tabellen für `oauthRefreshToken` und `jwks` kamen hinzu.

Die Lehre lautet nicht „prüfe zuerst auf Verdeprecated-Markierungen“ – sondern dass sich die MCP-Auth-Tooling-Landschaft aktuell sehr schnell bewegt. Was auch immer Sie heute auswählen, könnte schon nächsten Monat abgelöst werden. Halten Sie Ihre OAuth-Logik hinter einem dünnen Adapter, damit das Refactoring mechanisch und nicht architektonisch ist.

## 3. Ihre Auth-Chain hat mehr Schichten, als Sie denken

Der OAuth-Flow funktionierte. Jeder Tool-Aufruf scheiterte mit `Unauthorized`.

Das Problem: Reactive Resume nutzt oRPC für seine API-Schicht. Der oRPC-Kontext hat eine eigene Auth-Chain – getrennt von der Auth des MCP-Endpoints. Wenn ein Tool `listResumes` aufruft, prüft oRPC auf einen Session-Cookie oder einen API-Key. Es weiß nichts von OAuth-Bearer-Tokens.

Der MCP-Endpoint authentisierte den Nutzer. Dann rief er eine oRPC-Prozedur auf. oRPC sah keinen Cookie und keinen API-Key. `Unauthorized`.

Die Lösung: Das Bearer-Token durch die oRPC-Auth-Chain propagieren.

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

Die tiefere Lehre: In jedem System, in dem die Authentifizierung auf einer Gateway-Ebene (MCP-Endpoint) stattfindet und dann an eine innere Schicht (oRPC) weitergeleitet wird, müssen Sie sicherstellen, dass die innere Schicht dasselbe Credential-Format akzeptiert. Wenn nicht, haben Sie zwei Optionen: den aufgelösten Nutzerkontext durchreichen oder der inneren Schicht beibringen, den neuen Credential-Typ zu verstehen. Ich habe mich für Letzteres entschieden, da es robuster gegenüber zukünftigen Tool-Erweiterungen ist.

Und selbst nach dem Fix der Auth-Chain folgte eine zweite Überraschung: `getMcpSession()` (und sein Nachfolger `verifyAccessToken()`) gibt ein `OAuthAccessToken`-Objekt mit einem `userId`-Feld zurück, nicht einem `user`-Feld. Sie benötigen einen separaten Datenbank-Lookup:

```typescript
const token = await verifyAccessToken(bearer);
const user = await db.query.user.findFirst({
  where: eq(userTable.id, token.userId),
});
```

Bei jeder OAuth-Provider-Implementierung sind Token-Verifizierung und Nutzerauflösung zwei separate Schritte. Gehen Sie nicht davon aus, dass die Bibliothek diese zusammenführt.

## 4. Abwärtskompatibilität bedeutet zwei Auth-Pfade für immer

Reactive Resume hatte bereits eine MCP-Auth via `x-api-key`-Header. Bestehende Nutzer haben API-Keys konfiguriert. Das Entfernen und das Erzwingen einer erneuten Authentifizierung via OAuth für alle würde jede bestehende Integration beschädigen.

Der MCP-Endpoint verfügt nun über einen dualen Auth-Pfad:

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

Die Reihenfolge ist wichtig. Bearer zuerst, API-Key zweitens. Wenn Sie zuerst den API-Key prüfen und der Nutzer einen fehlerhaften API-Key zusammen mit einem gültigen Bearer-Token sendet, könnte die API-Key-Prüfung einen Fehler werfen, bevor der Bearer-Pfad durchläuft.

Und der `WWW-Authenticate: Bearer`-Header in der 401-Antwort wird von der MCP-Spezifikation verlangt. Ohne ihn weiß claude.ai nicht, dass es den OAuth-Flow starten soll – es behandelt den Endpoint einfach als dauerhaft nicht erreichbar.

Der API-Key-Pfad wird diesen PR überdauern. Seine Entfernung ist ein Breaking Change, der einen Migrationsplan und einen Deprecation-Zeitplan erfordert.

Eine weitere Feinheit: `verifyApiKey` kann bei fehlerhaften Eingaben einen Fehler werfen. Das Einbetten in try-catch verhindert laute Fehlerlogs von fehlgeschlagenen Token-Parsing-Versuchen. Der ursprüngliche Code nutzte String-Matching für Fehlermeldungen (`error.message.includes("...")`). Die refaktorierte Version nutzt `instanceof AuthError` – typsicher und bricht nicht, wenn sich die Fehlermeldung ändert.

## Was ich ausgelassen habe

- **Token Refresh** -- das OAuth-Provider-Plugin verwaltet Refresh Tokens automatisch. Ich benötigte keine eigene Logik.
- **Scope Enforcement** -- alle MCP-Tools erhalten vollen Nutzerzugriff. Für einen persönlichen Lebenslauf-Builder in Ordnung, für eine Multi-Tenant-SaaS nicht.
- **Rate Limiting an den OAuth-Endpoints** -- Dynamic Client Registration ist standardmäßig offen (RFC 7591). Jeder kann sich registrieren. Rate Limiting steht auf der TODO-Liste des Maintainers.
- **Consent Screen** -- better-auths OAuth Provider überspringt den Consent Screen für First-Party-Apps. Falls Reactive Resume jemals ein OAuth-Provider für Dritt-Apps wird, wird eine Consent-UI benötigt.

## Das Setup, das den Beweis erbrachte

Selbst gehostetes Reactive Resume auf Google Cloud Run (europe-west1), PostgreSQL auf Neon.tech (Free Tier). Der OAuth-Flow ist in unter 2 Sekunden abgeschlossen: claude.ai entdeckt die Endpoints, registriert sich dynamisch, leitet zur Login-Seite weiter, tauscht den Code aus und beginnt mit Tool-Aufrufen. Das Auflisten, Lesen und Patchen von Lebensläufen funktioniert alles über das Bearer-Token.

Der Flow ist auf Cloud Run End-to-End bewiesen. Der PR wurde gemerged und das Feature wird mit dem nächsten Release ausgeliefert.

Falls Sie OAuth zu Ihrem eigenen MCP-Server hinzufügen, lesen Sie [PR #2829](https://github.com/amruthpillai/reactive-resume/pull/2829) für die vollständige Implementierung -- jeder der genannten Fallstricke entspricht einem bestimmten Commit. Um das Ergebnis zu testen, richten Sie claude.ai auf Ihre eigene Reactive-Resume-Instanz und verbinden Sie sich via OAuth. Mein Setup läuft unter [resume.vasudev.xyz](https://resume.vasudev.xyz).

---

*Ich schreibe über Systeme, Sicherheit und die Schnittstelle von KI-Agenten mit realer Infrastruktur unter [vasudev.xyz](https://vasudev.xyz).*
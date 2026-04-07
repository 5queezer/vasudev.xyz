---
title: "Hinzufügen von OAuth 2.1 zu einem Self‑Hosted MCP Server: 4 Fallstricke aus der Praxis"
date: 2026-03-25
description: "Was ist schiefgelaufen, als ich claude.ai zu meiner eigenen Reactive Resume-Instanz über OAuth verbunden habe?"
images: ["/images/adding-oauth-mcp-server-gotchas-og.png"]
images: ["/images/adding-oauth-mcp-server-gotchas-og.png"]
images: ["/images/adding-oauth-mcp-server-gotchas-og.png"]
author: "Christian Pojoni"
tags: ["typescript", "mcp", "oauth"]
translationHash: "ae7a96698783113f55c1ffdf69cd7add"
---
MCP (Model Context Protocol) ermöglicht es KI-Assistenten, Tools auf entfernten Servern aufzurufen. Wenn Ihr MCP-Server jedoch selbst gehostet wird, muss sich claude.ai gegenüber Ihren Benutzerkonten authentifizieren, nicht gegenüber denen von Anthropic. Das bedeutet, dass Ihr Server zu einem OAuth-2.1-Provider werden muss – Dynamic Client Registration, Authorization Code with PKCE, Token Exchange.

Ich habe [PR #2829](https://github.com/amruthpillai/reactive-resume/pull/2829) eingereicht, um dies zu [Reactive Resume](https://github.com/amruthpillai/reactive-resume), dem Open-Source-Lebenslauf-Builder, hinzuzufügen. Sechs Commits, ein Refactoring mitten im PR, nachdem der Maintainer auf eine Deprecation hingewiesen hatte, und mehrere Stunden Debugging von Auth-Chains. Das ist die OAuth-Seite von [dieser Geschichte](/blog/shipping-a2a-protocol-support-in-rust/).

**MCP OAuth funktioniert, aber die Spezifikation lässt vier Fallstricke offen, die Tutorials übergehen.**

## 1. Ihr MCP-Server benötigt zwei .well-known-Endpoints, nicht nur einen

Wenn sich claude.ai mit einem benutzerdefinierten MCP-Endpoint verbindet, sendet es nicht einfach nur einen POST-Request an Ihre URL. Zuerst prüft es auf OAuth-Metadaten. Die MCP-Auth-Spezifikation erfordert zwei Discovery-Endpoints:

`GET /.well-known/oauth-authorization-server` gibt die OAuth-2.0-Authorization-Server-Metadaten zurück (RFC 8414) – wo die Autorisierung stattfindet, wo Tokens ausgetauscht werden und welche Grant Types unterstützt werden.

`GET /.well-known/oauth-protected-resource` gibt die Protected-Resource-Metadaten zurück (RFC 9728) – um welche Ressource es sich handelt, welche Scopes benötigt werden und wo sich der Authorization Server befindet.

Fehlt einer von beiden, schlägt die Verbindung von claude.ai stillschweigend fehl. Keine Fehlermeldung, kein Retry. Es wird einfach kein Button „Connect“ angeboten. Ich habe dadurch eine Stunde verloren, weil der `oauth-protected-resource`-Endpoint in keinem der gefundenen Tutorials vorkam. Ich habe ihn erst entdeckt, indem ich die MCP-Auth-Spezifikation direkt gelesen habe.

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

Beide Endpoints müssen JSON zurückgeben, beide müssen exakt auf den angegebenen Pfaden liegen und beide müssen sich auf die URL des Authorization Servers einigen. Wenn `issuer` in dem einen nicht mit `authorization_server` in dem anderen übereinstimmt, lehnt der Client die Konfiguration ab.

## 2. Die von Ihnen gewählte Auth-Bibliothek könnte mitten im PR als deprecated markiert werden

Reactive Resume nutzt better-auth für die Authentifizierung. Better-auth wird mit einem `mcp()`-Plugin ausgeliefert, das Dynamic Client Registration und Token-Management übernimmt. Perfekt – drei Zeilen Konfiguration und schon verfügt man über OAuth für MCP.

Ich habe den gesamten PR darauf aufgebaut, auf Cloud Run deployed, die Ende-zu-Ende-Funktionalität mit claude.ai überprüft und den PR als „ready for review“ markiert.

Die [Antwort](https://github.com/amruthpillai/reactive-resume/pull/2829#issuecomment-1) des Maintainers:

> Das MCP-Plugin wird bald als deprecated markiert [...] Könntest du den PR so refactoren, dass stattdessen das OAuth Provider Plugin genutzt wird?

Er hatte recht. Die better-auth-Dokumentation enthielt bereits eine Deprecation-Warnung, die auf `@better-auth/oauth-provider` verwies. Das neue Plugin ist allgemeiner (nicht MCP-spezifisch), nutzt JWT-Tokens statt opaque Tokens und erfordert JWKS-Schlüsselverwaltung.

Das Refactoring betraf jede auth-bezogene Datei. Die Suche nach opaque Tokens über `getMcpSession()` wurde zur JWT-Verifizierung über `verifyAccessToken()`. Das Datenbankschema änderte sich – `oauthApplication` wurde zu `oauthClient` (RFC-7591-konform), und neue Tabellen für `oauthRefreshToken` und `jwks` kamen hinzu.

Die Lehre daraus ist nicht „prüfe zuerst auf Deprecations“ – sondern dass sich die MCP-Auth-Tooling-Landschaft gerade schnell bewegt. Was auch immer Sie heute wählen, könnte nächsten Monat überholt sein. Halten Sie Ihre OAuth-Logik hinter einem dünnen Adapter, sodass das Refactoring mechanisch und nicht architektonisch wird.

## 3. Ihre Auth-Chain hat mehr Schichten, als Sie denken

Der OAuth-Flow funktionierte. Jeder Tool-Aufruf schlug mit `Unauthorized` fehl.

Das Problem: Reactive Resume verwendet oRPC für seine API-Schicht. Der oRPC-Kontext hat seine eigene Auth-Chain – getrennt von der Auth des MCP-Endpoints. Wenn ein Tool `listResumes` aufruft, prüft oRPC auf einen Session-Cookie oder einen API-Key. OAuth-Bearer-Tokens sind ihm unbekannt.

Der MCP-Endpoint authentifizier den Benutzer. Anschließend ruft er eine oRPC-Prozedur auf. oRPC sieht keinen Cookie und keinen API-Key. `Unauthorized`.

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

Die tiefere Erkenntnis: In jedem System, in dem die Authentifizierung auf einer Gateway-Schicht (MCP-Endpoint) stattfindet und dann an eine innere Schicht (oRPC) weitergeleitet wird, müssen Sie sicherstellen, dass die innere Schicht dasselbe Credential-Format akzeptiert. Falls nicht, haben Sie zwei Optionen: den aufgelösten Benutzerkontext durchreichen oder der inneren Schicht beibringen, den neuen Credential-Typ zu verstehen. Ich habe mich für Letzteres entschieden, da es robuster gegenüber zukünftigen Tool-Erweiterungen ist.

Und selbst nach dem Fixen der Auth-Chain gab es eine zweite Überraschung: `getMcpSession()` (und sein Nachfolger `verifyAccessToken()`) gibt ein `OAuthAccessToken`-Objekt mit einem `userId`-Feld zurück, nicht mit einem `user`-Feld. Sie benötigen einen separaten Datenbank-Lookup:

```typescript
const token = await verifyAccessToken(bearer);
const user = await db.query.user.findFirst({
  where: eq(userTable.id, token.userId),
});
```

Bei jeder OAuth-Provider-Implementierung sind Token-Verifizierung und Benutzer-Auflösung zwei separate Schritte. Gehen Sie nicht davon aus, dass die Bibliothek sie zusammenführt.

## 4. Abwärtskompatibilität bedeutet für immer zwei Auth-Pfade

Reactive Resume verfügte bereits über MCP-Authentifizierung via `x-api-key`-Headers. Bestehende Benutzer haben API-Keys konfiguriert. Das einfach zu entfernen und jeden zur erneuten Authentifizierung via OAuth zu zwingen, würde jede bestehende Integration kaputt machen.

Daher verfügt der MCP-Endpoint nun über einen dualen Auth-Pfad:

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

Die Reihenfolge ist wichtig. Zuerst Bearer, dann API-Key. Wenn Sie zuerst den API-Key prüfen und der Benutzer einen fehlerhaften API-Key zusammen mit einem gültigen Bearer-Token sendet, könnte die API-Key-Prüfung einen Fehler werfen, bevor der Bearer-Pfad ausgeführt wird.

Und der `WWW-Authenticate: Bearer`-Header in der 401-Antwort wird von der MCP-Spezifikation verlangt. Ohne ihn weiß claude.ai nicht, dass es den OAuth-Flow initiieren soll – es behandelt den Endpoint einfach als dauerhaft unerreichbar.

Der API-Key-Pfad wird diesen PR überdauern. Ihn zu entfernen, ist ein Breaking Change, der einen Migrationsplan und einen Zeitplan für die Deprecation erfordert.

Noch eine Feinheit: `verifyApiKey` kann bei fehlerhafter Eingabe einen Fehler werfen. Das Einbetten in einen try-catch-Block verhindert laute Error-Logs durch fehlgeschlagene Token-Parsing-Versuche. Der ursprüngliche Code nutzte String-Matching bei Fehlermeldungen (`error.message.includes("...")`). Die refactorte Version nutzt `instanceof AuthError` – typsicher und bricht nicht, wenn sich die Fehlermeldung ändert.

## Was ich ausgelassen habe

- **Token Refresh** – das OAuth Provider Plugin verarbeitet Refresh Tokens automatisch. Ich benötigte keine eigene Logik.
- **Scope Enforcement** – alle MCP-Tools erhalten vollen Benutzerzugriff. Für einen persönlichen Lebenslauf-Builder in Ordnung, für ein Multi-Tenant-SaaS jedoch nicht.
- **Rate Limiting bei den OAuth-Endpoints** – Dynamic Client Registration ist standardmäßig offen (RFC 7591). Jeder kann sich registrieren. Rate Limiting steht auf der TODO-Liste des Maintainers.
- **Consent Screen** – better-auths OAuth Provider überspringt den Consent Screen für First-Party-Apps. Falls Reactive Resume jemals OAuth-Provider für Third-Party-Apps wird, ist eine Consent-UI erforderlich.

## Das Setup, das beweist, dass es funktioniert

Selbst gehostetes Reactive Resume auf Google Cloud Run (europe-west1), PostgreSQL auf Neon.tech (Free Tier). Der OAuth-Flow läuft in unter 2 Sekunden ab: claude.ai entdeckt die Endpoints, registriert sich dynamisch, leitet zur Login-Seite weiter, tauscht den Code aus und beginnt mit Tool-Aufrufen. Das Auflisten, Lesen und Patchen von Lebensläufen funktioniert alles über das Bearer-Token.

Der Flow ist auf Cloud Run Ende-zu-Ende erprobt. Der PR wurde gemerget und das Feature wird mit dem nächsten Release ausgeliefert.

Wenn Sie OAuth zu Ihrem eigenen MCP-Server hinzufügen möchten, lesen Sie [PR #2829](https://github.com/amruthpillai/reactive-resume/pull/2829) für die vollständige Implementierung – jeder der oben genannten Fallstricke entspricht einem bestimmten Commit. Um das Ergebnis zu testen, richten Sie claude.ai auf Ihre eigene Reactive-Resume-Instanz und verbinden Sie sich via OAuth. Mein Setup läuft unter [resume.vasudev.xyz](https://resume.vasudev.xyz).

---

*Auf [vasudev.xyz](https://vasudev.xyz) schreibe ich über Systeme, Sicherheit und die Schnittstelle von KI-Agenten mit echter Infrastruktur.*

*Das Titelbild dieses Beitrags wurde von einer KI generiert.*
---
title: "OAuth 2.1 zu einem selbst gehosteten MCP-Server hinzufügen: 4 Stolpersteine aus der Praxis"
date: 2026-03-25
description: "Was schiefging, als ich claude.ai über OAuth mit meiner eigenen Reactive-Resume-Instanz verbunden habe."
images: ["/images/adding-oauth-mcp-server-gotchas-og.png"]
images: ["/images/adding-oauth-mcp-server-gotchas-og.png"]
author: "Christian Pojoni"
tags: ["typescript", "mcp", "oauth"]
translationHash: "983d145d5e2c04cbfd2c833373572316"
---
MCP (Model Context Protocol) ermöglicht es KI-Assistenten, Tools auf entfernten Servern aufzurufen. Wenn dein MCP-Server jedoch selbst gehostet ist, muss sich claude.ai an deinen Benutzerkonten authentifizieren, nicht an denen von Anthropic. Das bedeutet, dein Server muss zu einem OAuth 2.1-Anbieter werden – Dynamic Client Registration, Authorization Code with PKCE, Token Exchange.

Ich habe [PR #2829](https://github.com/amruthpillai/reactive-resume/pull/2829) eingereicht, um dies zu [Reactive Resume](https://github.com/amruthpillai/reactive-resume), dem Open-Source-Lebenslauf-Builder, hinzuzufügen. Sechs Commits, ein Refactoring mitten im PR, nachdem der Maintainer auf eine Veraltung hingewiesen hatte, und mehrere Stunden Debugging von Auth-Chains. Das ist die OAuth-Seite von [dieser Geschichte](/blog/shipping-a2a-protocol-support-in-rust/).

**MCP OAuth funktioniert, aber die Spezifikation birgt vier Fallstricke, die Tutorials auslassen.**

## 1. Dein MCP-Server benötigt zwei .well-known-Endpunkte, nicht einen

Wenn sich claude.ai mit einem benutzerdefinierten MCP-Endpunkt verbindet, sendet es nicht einfach ein POST an deine URL. Es prüft zuerst auf OAuth-Metadaten. Die MCP-Auth-Spezifikation verlangt zwei Discovery-Endpunkte:

`GET /.well-known/oauth-authorization-server` gibt die OAuth 2.0 Authorization Server Metadata (RFC 8414) zurück – wohin zur Autorisierung, wohin zum Token-Austausch, welche Grant Types du unterstützt.

`GET /.well-known/oauth-protected-resource` gibt die Protected Resource Metadata (RFC 9728) zurück – um welche Ressource es sich handelt, welche Scopes sie benötigt und wo der Authorization Server zu finden ist.

Fehlt einer von beiden, schlägt die Verbindung von claude.ai stillschweigend fehl. Keine Fehlermeldung, kein erneuter Versuch. Der „Connect“-Button wird einfach nicht angeboten. Ich habe eine Stunde damit verschwendet, weil der `oauth-protected-resource`-Endpunkt in keinem Tutorial vorkam, das ich gefunden hatte. Ich habe ihn erst entdeckt, als ich die MCP-Auth-Spezifikation direkt gelesen habe.

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

Beide Endpunkte müssen JSON zurückgeben, sich exakt auf den angegebenen Pfaden befinden und sich auf die URL des Authorization Servers einigen. Stimmt `issuer` im einen nicht mit `authorization_server` im anderen überein, lehnt der Client die Konfiguration ab.

## 2. Die gewählte Auth-Bibliothek könnte mitten im PR als veraltet markiert werden

Reactive Resume verwendet better-auth für die Authentifizierung. Better-auth liefert ein `mcp()`-Plugin mit, das Dynamic Client Registration und Token-Management übernimmt. Perfekt – drei Zeilen Konfiguration und du hast OAuth für MCP.

Ich habe den gesamten PR darauf aufgebaut, auf Cloud Run deployed, verifiziert, dass er mit claude.ai end-to-end funktioniert, und den PR als bereit zur Review markiert.

Die [Antwort](https://github.com/amruthpillai/reactive-resume/pull/2829#issuecomment-1) des Maintainers:

> Das MCP-Plugin wird bald als veraltet markiert [...] Könntest du den PR refactoren, um stattdessen das OAuth Provider Plugin zu nutzen?

Er hatte recht. Die better-auth-Dokumentation enthielt bereits einen Veraltungshinweis mit Verweis auf `@better-auth/oauth-provider`. Das neue Plugin ist allgemeiner (nicht MCP-spezifisch), nutzt JWT-Tokens statt opaken Tokens und erfordert JWKS-Schlüsselmanagement.

Das Refactoring betraf jede Datei, die mit der Authentifizierung zu tun hatte. Die Suche nach opaken Tokens über `getMcpSession()` wurde zur JWT-Verifizierung über `verifyAccessToken()`. Das Datenbankschema änderte sich – `oauthApplication` wurde zu `oauthClient` (RFC 7591-konform), und neue Tabellen für `oauthRefreshToken` und `jwks` tauchten auf.

Die Lehre lautet nicht „prüfe zuerst auf Veraltungen“, sondern dass sich MCP-Auth-Tooling derzeit rasant weiterentwickelt. Was du heute auswählst, könnte nächsten Monat bereits überholt sein. Halte deine OAuth-Logik hinter einem dünnen Adapter, damit das Refactoring mechanisch und nicht architektonisch ist.

## 3. Deine Auth-Chain hat mehr Schichten, als du denkst

Der OAuth-Flow funktionierte. Jeder Tool-Aufruf scheiterte mit `Unauthorized`.

Das Problem: Reactive Resume nutzt oRPC für seine API-Schicht. Der oRPC-Kontext hat seine eigene Auth-Chain – getrennt von der MCP-Endpunkt-Auth. Wenn ein Tool `listResumes` aufruft, prüft oRPC nach einem Session-Cookie oder einem API-Key. OAuth-Bearer-Tokens sind ihm unbekannt.

Der MCP-Endpunkt hat den Benutzer authentifiziert. Dann rief er eine oRPC-Prozedur auf. oRPC sah weder Cookie noch API-Key. `Unauthorized`.

Die Lösung: Den Bearer-Token durch die oRPC-Auth-Chain propagieren.

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

Die tiefere Erkenntnis: In jedem System, bei dem die Authentifizierung auf einer Gateway-Ebene (MCP-Endpunkt) stattfindet und dann an eine innere Schicht (oRPC) weitergeleitet wird, musst du sicherstellen, dass die innere Schicht dasselbe Credential-Format akzeptiert. Falls nicht, hast du zwei Optionen: den aufgelösten Benutzerkontext durchreichen oder der inneren Schicht beibringen, den neuen Credential-Typ zu verstehen. Ich habe mich für Letzteres entschieden, da es robuster gegenüber zukünftigen Tool-Erweiterungen ist.

Und selbst nach der Reparatur der Auth-Chain folgte eine zweite Überraschung: `getMcpSession()` (und sein Nachfolger `verifyAccessToken()`) gibt ein `OAuthAccessToken`-Objekt mit einem `userId`-Feld zurück, nicht mit einem `user`-Feld. Du benötigst einen separaten Datenbank-Lookup:

```typescript
const token = await verifyAccessToken(bearer);
const user = await db.query.user.findFirst({
  where: eq(userTable.id, token.userId),
});
```

Bei jeder OAuth-Provider-Implementierung sind Token-Verifizierung und Benutzer-Auflösung zwei separate Schritte. Geh nicht davon aus, dass die Bibliothek sie zusammenfasst.

## 4. Abwärtskompatibilität bedeutet für immer zwei Auth-Pfade

Reactive Resume verfügte bereits über eine MCP-Authentifizierung über `x-api-key`-Header. Bestehende Benutzer haben API-Keys konfiguriert. Das herauszureißen und alle zu zwingen, sich per OAuth neu zu authentifizieren, würde jede bestehende Integration beschädigen.

Daher verfügt der MCP-Endpunkt nun über einen dualen Auth-Pfad:

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

Die Reihenfolge ist entscheidend. Bearer zuerst, API-Key zweitens. Prüfst du zuerst den API-Key und der Benutzer sendet einen fehlerhaften API-Key zusammen mit einem gültigen Bearer-Token, könnte die API-Key-Prüfung einen Fehler auslösen, bevor der Bearer-Pfad überhaupt ausgeführt wird.

Und der `WWW-Authenticate: Bearer`-Header in der 401-Antwort wird von der MCP-Spezifikation verlangt. Ohne ihn weiß claude.ai nicht, dass es den OAuth-Flow starten soll – es behandelt den Endpunkt einfach als dauerhaft unerreichbar.

Der API-Key-Pfad wird diesen PR überdauern. Seine Entfernung ist ein Breaking Change, der einen Migrationsplan und einen Zeitplan für die Veraltung erfordert.

Eine weitere Feinheit: `verifyApiKey` kann bei fehlerhafter Eingabe einen Fehler auslösen. Das Einbetten in try-catch verhindert laute Error-Logs durch fehlgeschlagene Token-Parsing-Versuche. Der ursprüngliche Code nutzte String-Matching für Fehlermeldungen (`error.message.includes("...")`). Die refactorte Version verwendet `instanceof AuthError` – typensicher und bricht nicht, wenn sich die Fehlermeldung ändert.

## Was ich ausgelassen habe

- **Token Refresh** – Das OAuth Provider Plugin verwaltet Refresh Tokens automatisch. Ich benötigte keine eigene Logik.
- **Scope-Enforcement** – Alle MCP-Tools erhalten vollen Benutzerzugriff. Für einen persönlichen Lebenslauf-Builder in Ordnung, für eine Multi-Tenant-SaaS jedoch nicht.
- **Rate Limiting an den OAuth-Endpunkten** – Dynamic Client Registration ist standardmäßig offen (RFC 7591). Jeder kann sich registrieren. Rate Limiting steht auf der TODO-Liste des Maintainers.
- **Consent Screen** – better-auths OAuth Provider überspringt die Einwilligungsseite für First-Party-Apps. Sollte Reactive Resume jemals OAuth-Provider für Drittanbieter-Apps werden, wird eine Consent-UI benötigt.

## Das Setup, das beweist, dass es funktioniert

Selbst gehostetes Reactive Resume auf Google Cloud Run (europe-west1), PostgreSQL auf Neon.tech (kostenloser Tarif). Der OAuth-Flow ist in unter 2 Sekunden abgeschlossen: claude.ai entdeckt die Endpunkte, registriert sich dynamisch, leitet zur Login-Seite weiter, tauscht den Code aus und beginnt mit Tool-Aufrufen. Auflisten, Lesen und Patchen von Lebensläufen funktionieren allesamt über den Bearer-Token.

Der Flow ist auf Cloud Run end-to-end bewiesen. Der PR wurde gemerged und das Feature wird mit dem nächsten Release ausgeliefert.

Wenn du OAuth zu deinem eigenen MCP-Server hinzufügst, lies [PR #2829](https://github.com/amruthpillai/reactive-resume/pull/2829) für die vollständige Implementierung – jeder der oben genannten Fallstricke ist einem bestimmten Commit zugeordnet. Um das Ergebnis zu testen, richte claude.ai auf deine eigene Reactive Resume-Instanz ein und verbinde dich per OAuth. Mein Setup läuft unter [resume.vasudev.xyz](https://resume.vasudev.xyz).

---

*Ich schreibe über Systeme, Sicherheit und die Schnittstelle von KI-Agenten mit echter Infrastruktur auf [vasudev.xyz](https://vasudev.xyz).*

*Das Titelbild dieses Beitrags wurde von einer KI generiert.*
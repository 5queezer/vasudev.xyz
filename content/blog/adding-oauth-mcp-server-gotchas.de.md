---
title: "OAuth 2.1 zu einem Self-Hosted MCP Server hinzufügen: 4 Fallstricke aus den Schützengräben"
date: 2026-03-25
description: "Was brach, als ich claude.ai über OAuth mit meiner eigenen Reactive Resume‑Instanz verkabelt habe?"
images: ["/images/adding-oauth-mcp-server-gotchas-og.png"]
images: ["/images/adding-oauth-mcp-server-gotchas-og.png"]
author: "Christian Pojoni"
tags: ["typescript", "mcp", "oauth"]
series: ["Field Notes"]
translationHash: "afc9f66fc5259621feb4327254e2ba23"
chunkHashes: "4e531ee75752b1c8,d3bb3fec7b569eeb,d08f4bf02c40372d,58ef9e41ba4ef7d8,4eaf9f6c399894ba,db1e3d7423007539,651655b1329fc8fa"
---
MCP (ModelContext Protocol) ermöglicht KI‑Assistenten, Tools auf entfernten Servern aufzurufen. Wenn Ihr selbstgehosteter MCP‑Server jedoch läuft, muss sich claude.ai gegen die Konten Ihrer Benutzer authentifizieren, nicht gegen die von Anthropic. Das bedeutet, Ihr Server muss einen vollständigen OAuth 2.1‑Anbieter werden: Dynamic Client Registration, Authorization Code with PKCE, token exchange.

Ich habe [PR #2829](https://github.com/amruthpillai/reactive-resume/pull/2829) eingereicht, um das hinzuzufügen zu [Reactive Resume](https://github.com/amruthpillai/reactive-resume), dem Open‑Source‑Lebenslauf‑Builder. Sechs Commits, eine mittendrin‑Refaktorisierung nach dem Maintainer einen Deprecation‑Hinweis flaggte, und mehrere Stunden Debugging von Auth‑Ketten. Das ist die OAuth‑Seite dieser [Geschichte](/blog/shipping-a2a-protocol-support-in-rust/).

**MCP OAuth funktioniert, aber die Spezifikation lässt vier Fallstricke offen, die Tutorials überspringen.**
## 1. Dein MCP-Server benötigt zwei `.well-known`-Endpunkte, nicht einenMCP (Model Context Protocol) lässt KI-Assistenten Tools auf Remote-Servern aufrufen. Wenn jedoch dein MCP-Server selbst gehostet ist, benötigt claude.ai eine Authentifizierung gegen deine Benutzerkonten, nicht gegen die von Anthropic. Das bedeutet, dein Server muss einen vollständigen OAuth 2.1-Provider werden: Dynamic Client Registration, Authorization Code mit PKCE, Token Exchange.

Ich habe [PR #2829](https://github.com/amruthpillai/reactive-resume/pull/2829) eingereicht, um das zu [Reactive Resume](https://github.com/amruthpillai/reactive-resume), dem Open-Source-Lebenslauf-Builder, hinzuzufügen. Sechs Commits, ein mid-PR-Refactor nach dem Maintainer eine Deprecation markiert hatte, und mehrere Stunden Debugging von Auth-Chains. Das ist die OAuth-Seite von [that story](/blog/shipping-a2a-protocol-support-in-rust/).

**MCP OAuth funktioniert, aber die Spezifikation lässt vier Fallen zurück, die Tutorials überspringen.**
##1. Dein MCP-Server benötigt zwei .well-known-Endpunkte, nicht nur einenWenn claude.ai sich mit einem benutzerdefinierten MCP-Endpunkt verbindet, POSTet es nicht einfach an deine URL. Zuerst wird nach OAuth-Metadaten gefragt. Die MCP-Auth-Spezifikation erfordert zwei Entdeckungsendpunkte:

`GET /.well-known/oauth-authorization-server` gibt die OAuth 2.0 Authorization Server Metadata (RFC 8414) zurück. Sie zeigt Clients, wo sie autorisieren, wo sie Tokens austauschen können und welche Grant‑Types unterstützt werden.

`GET /.well-known/oauth-protected-resource` gibt die Protected Resource Metadata (RFC 9728) zurück. Sie beschreibt, um welchen Ressourcen‑Typ es sich handelt, welche Scopes benötigt werden und wo der Authorization‑Server zu finden ist.

Fehlt einer der beiden Endpunkte, verbindet sich claude.ai stillschweigend und kann nicht verbunden werden. Es gibt keine Fehlermeldung, keinenRetry. Es bietet einfach keine „Connect“-Schaltfläche. Ich habe dafür eine Stunde gebraucht, weil der `oauth-protected-resource`-Endpunkt in keinem Tutorial erwähnt wurde, das ich gefunden habe. Ich habe ihn nur entdeckt, indem ich die MCP‑Auth‑Spezifikation direkt gelesen habe.

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

Beide Endpunkte müssen JSON zurückgeben, beide müssen exakt die angegebenen Pfade haben, und beide müssen sich auf die gleiche Authorization‑Server‑URL einigen. Wenn `issuer` in einem nicht mit `authorization_server` im anderen übereinstimmt, wird die Konfiguration vom Client abgelehnt.
## 2. Die von dir gewählte Auth-Bibliothek könnte während des PRs veraltet werden

Reactive Resume verwendet better-auth für die Authentifizierung. Better-auth stellt ein `mcp()`‑Plugin bereit, das Dynamic Client Registration und Token‑Management abwickelt. Perfekt. Mit nur drei Konfigurationszeilen erhältst du OAuth für MCP.

Ich habe die gesamte PR darauf basieren lassen, auf Cloud Run bereitgestellt und end‑zu‑end mit claude.ai getestet – die PR wurde als bereit für Review markiert.

Die Antwort des Maintainers [antwortet](https://github.com/amruthpillai/reactive-resume/pull/2829#issuecomment-1):

> Das MCP‑plugin wird bald veraltet sein [...] Könntest du die PR umstrukturieren, um das OAuth Provider Plugin zu verwenden?

Er hatte recht. Die Dokumentation von better-auth enthielt bereits eine Deprecation‑Notice, die auf `@better-auth/oauth-provider` verweist. Das neue Plugin ist allgemeiner (nicht MCP‑spezifisch), verwendet JWT‑Tokens statt Opaque‑Tokens und erfordert JWKS‑Schlüssel‑Management.

Der Refactor hat jede auth‑bezogene Datei berührt. Opaque‑Token‑Lookup über ``getMcpSession()`` wurde durch JWT‑Verifizierung über ``verifyAccessToken()`` ersetzt. Das Datenbankschema wurde ebenfalls geändert. ``oauthApplication`` wurde zu ``oauthClient`` (RFC 7591 konform), und neue Tabellen für ``oauthRefreshToken`` und ``jwks`` wurden hinzugefügt.

Die Lehre ist nicht „ zuerst nach Deprecations suchen.“ Es ist, dass die MCP‑Auth‑Toolchain gerade schnell voranschreitet. Was du heute wählst, könnte nächsten Monat überholt sein. Halte deine OAuth‑Logik hinter einem dünnen Adapter bereit, damit der Refactor mechanisch und nicht architektonisch ist.
## 3. DeineAuth-Kette hat mehr Ebenen, als du denkst

Der OAuth‑Flow funktionierte. Jeder Tool‑Aufruf schlug mit `Unauthorized` fehl.

Das Problem: Reactive Resume verwendet oRPC für seine API‑Schicht. Der oRPC‑Kontext hat seine eigene Auth‑Kette, getrennt von der MCP‑Endpoint‑Authentifizierung. Wenn ein Tool `listResumes` aufruft, prüft oRPC nach einem Sitzungs‑Cookie oder einem API‑Schlüssel. Es kennt keine OAuth Bearer tokens.

Der MCP‑Endpoint hat den Benutzer authentifiziert. Dann rief er ein oRPC‑Verfahren auf. oRPC bemerkte kein Cookie und keinen API‑Schlüssel. `Unauthorized`.

Die Lösung: den Bearer‑token durch die oRPC‑Auth‑Kette weiterleiten.

```typescript
// Im oRPC‑Kontext‑Builder
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

Die tiefere Lehre: In jedem System, in dem die Authentifizierung auf einer Gateways‑Ebene (MCP‑Endpoint) erfolgt und anschließend an eine innere Ebene (oRPC) weitergereicht wird, muss geprüft werden, dass die innere Ebene das gleiche Credential‑Format akzeptiert. Wenn nicht, gibt es zwei Optionen: den gelösten Benutzer‑Kontext weiterreichen oder der inneren Ebene das neue Credential‑Format beibringen. Ich wählte letztere, weil es robuster gegenüber zukünftigen Tool‑Hinzufügungen ist.

Und selbst nach dem Fix der Auth‑Kette kam ein zweiter Schock: `getMcpSession()` (und seine Nachfolgerin `verifyAccessToken()`) gibt ein `OAuthAccessToken`‑Objekt mit einem `userId`‑Feld, nicht ein `user`‑Feld zurück. Man benötigt einen separaten Datenbank‑Lookup:

```typescript
const token = await verifyAccessToken(bearer);
const user = await db.query.user.findFirst({
  where: eq(userTable.id, token.userId),
});
```

In jeder OAuth‑Provider‑Implementierung sind Token‑Verifizierung und Benutzerauflösung zwei separate Schritte. Gehe nicht davon aus, dass die Bibliothek beides zusammenführt.
##4. Rückwärtskompatibilität bedeutet zwei Auth‑Pfad für immer

Reactive Resume hatte bereits MCP‑Auth über `x-api-key`‑Header. Bestehende Nutzer haben API‑Schlüssel konfiguriert. Das Entfernen und das Erzwingen einer Neuanmeldung per OAuth für alle würde jede bestehende Integration zerstören.

Der MCP‑Endpoint hat jetzt einen dualen Auth‑Pfad:

```typescript
// Try OAuth Bearer firstconst bearer = headers.get("authorization")?.replace("Bearer ", "");
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

Die Reihenfolge ist wichtig. Zuerst Bearer, dann API‑Schlüssel. Wenn Sie zuerst den API‑Schlüssel prüfen und der Benutzer gleichzeitig einen fehlerhaften API‑Schlüssel sowie ein gültiges Bearer‑Token sendet, könnte die API‑Schlüssel‑Überprüfung einen Fehler auslösen, bevor der Bearer‑Pfad ausgeführt wird.

Und der `WWW-Authenticate: Bearer`‑Header in der 401‑Antwort ist gemäß der MCP‑Spezifikation erforderlich. Ohne ihn weiß claude.ai nicht, dass ein OAuth‑Flow gestartet werden soll. Sie behandelt den Endpoint einfach als dauerhaft nicht erreichbar.

Der API‑Schlüssel‑Pfad wird über diese PR hinaus bestehen. Seine Entfernung ist eine breaking change, die einen Migrationsplan und einen Deprecation‑Zeitplan erfordert.

Eine weitere Feinheit: `verifyApiKey` kann bei fehlerhaften Eingaben einen Fehler werfen. Ein Einbetten in try‑catch verhindert lautes Logging bei fehlgeschlagenen Token‑Parsing‑Versuchen. Die refaktorierte Version verwendet `instanceof AuthError`, was typsicher ist und nicht bricht, wenn sich die Fehlermeldung ändert.
## Was ich weggelassen habe

- **Token refresh.** Der OAuth Provider‑Plugin behandelt Refresh‑Tokens automatisch. Ich brauchte keine benutzerdefinierte Logik.
- **Scope enforcement.** Alle MCP‑Tools erhalten vollen Benutzerzugriff. Das ist okay für einen persönlichen Lebenslauf‑Builder, nicht okay für eine Multi‑Tenant‑SaaS.
- **Rate limiting on the OAuth endpoints.** Dynamic Client Registration ist nach Design offen (RFC 7591). Jeder kann sich registrieren. Das Rate Limiting steht auf der TODO des Maintainers.
- **Consent screen.** better-auths OAuth Provider überspringt das Consent‑Screen für First‑Party‑Apps. Wenn Reactive Resume jemals ein OAuth Provider für third‑Party‑Apps wird, wird eine Consent‑UI benötigt.
## Die Einrichtung, die esfunktioniert

Selbstgehostetes Reactive Resume auf Google Cloud Run (europe-west1), PostgreSQL auf Neon.tech (Free‑Tarif). Der OAuth‑Flow beendet sich in unter 2 Sekunden: claude.ai entdeckt Endpunkte, registriert sie dynamisch, leitet zum Anmelde‑Page weiter, tauscht den Code aus und beginnt mit Tool‑Aufrufen. Auflisten, Lesen und Patchen von Lebensläufen funktionieren alles über das Bearer‑Token.

Der Flow ist end‑to‑end auf Cloud Run nachgewiesen. Der Pull Request wurde gemerged und das Feature kommt in der nächsten Version.

Wenn du OAuth zu deinem eigenen MCP‑Server hinzufügst, lies [PR #2829](https://github.com/amruthpillai/reactive-resume/pull/2829) für die vollständige Implementierung. Jeder Gotcha above mappt zu einem bestimmten Commit. Um das Ergebnis auszuprobieren, zeige claude.ai auf deine eigene Reactive Resume‑Instanz und verbinde dich per OAuth. Mein Setup läuft unter [resume.vasudev.xyz](https://resume.vasudev.xyz).

---

*Christian Pojoni baut MCP‑Integrationen für Open‑Source‑Tools. Mehr unter [vasudev.xyz](https://vasudev.xyz).*

*Das Cover‑Bild für diesen Beitrag wurde von KI erzeugt.*

## Die Einrichtung,die funktioniert

Selbstgehostetes Reactive Resume auf Google Cloud Run (europe-west1), PostgreSQL auf Neon.tech (Free-Tarif). Der OAuth-Flow beendet in weniger als 2 Sekunden: claude.ai entdeckt Endpunkte, registriert sie dynamisch, leitet zur Anmeldeseite um, tauscht den Code aus und startet Toolaufrufe. Auf Planung, Lesen und Patchen des Lebenslaufs erfolgt alles über den Bearer token.

Der Flow ist end-to-end auf Cloud Run nachgewiesen. Der PR wurde merged und das Feature wird in der nächsten Release bereitgestellt.

Wenn Sie OAuth zu Ihrem eigenen MCP server hinzufügen, lesen Sie [PR #2829](https://github.com/amruthpillai/reactive-resume/pull/2829) für die vollständige Implementierung. Jede Gotcha oben entspricht einem bestimmten commit. Um das Ergebnis auszuprobieren, zeigen Sie claude.ai auf Ihre eigene Reactive Resume Instanz und verbinden Sie sich via OAuth. Mein Setup läuft bei [resume.vasudev.xyz](https://resume.vasudev.xyz).

---

*Christian Pojoni baut MCP-Integrationen für Open-Source-Tools. Weitere Informationen bei [vasudev.xyz](https://vasudev.xyz).*

*Das Cover-Image für diesen Beitrag wurde von KI generiert.*
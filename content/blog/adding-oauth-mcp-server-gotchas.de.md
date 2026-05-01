---
title: "OAuth 2.1 zu einem selbstgehosteten MCP-Server hinzufügen: 4 Fallstricke aus dem Feld"
date: 2026-03-25
description: "Was kaputt ging, als ich claude.ai mit meiner eigenen Reactive Resume‑Instanz via OAuth verbunden habe."
images: ["/images/adding-oauth-mcp-server-gotchas-og.png"]
images: ["/images/adding-oauth-mcp-server-gotchas-og.png"]
images: ["/images/adding-oauth-mcp-server-gotchas-og.png"]
author: "Christian Pojoni"
tags: ["typescript", "mcp", "oauth"]
series: ["Field Notes"]
translationHash: "8f3fdad2810ea7eca7c68918f49995f3"
chunkHashes: "e2bee7820010391d,d3bb3fec7b569eeb,d08f4bf02c40372d,58ef9e41ba4ef7d8,4eaf9f6c399894ba,db1e3d7423007539,651655b1329fc8fa"
---
MCP (Model Context Protocol) lässt KI‑Assistenten Werkzeuge auf entfernten Servern aufrufen. Aber wenn Ihr MCP‑Server selbst gehostet wird, muss sich claude.ai gegen Ihre Benutzerkonten authentifizieren, nicht gegen die von Anthropic. Das bedeutet, Ihr Server muss ein vollständiger OAuth 2.1‑Anbieter werden: Dynamische Client‑Registrierung, Autorisierungscode mit PKCE, Token‑Austausch.

Ich habe [PR #2829](https://github.com/amruthpillai/reactive-resume/pull/2829) eingereicht, um dies zu [Reactive Resume](https://github.com/amruthpillai/reactive-resume), dem Open‑Source‑Lebenslauf‑Builder, hinzuzufügen. Sechs Commits, ein mid‑PR‑Refactor, nachdem der Maintainer eine Deprecation markiert hatte, und mehrere Stunden Debugging der Auth‑Ketten. Dies ist die OAuth‑Seite dieser [Geschichte](/blog/shipping-a2a-protocol-support-in-rust/).

**MCP OAuth funktioniert, aber die Spezifikation lässt vier Fallen offen, die Tutorials übersehen.**
## 1. Ihr MCP‑Server benötigt zwei .well-known‑Endpunkte, nicht nur einen

Wenn sich **claude.ai** mit einem benutzerdefinierten MCP‑Endpunkt verbindet, führt es nicht einfach nur einen POST zu Ihrer URL aus. Zunächst wird nach OAuth‑Metadaten gesucht. Das MCP‑Auth‑Spec verlangt zwei Discovery‑Endpunkte:

`GET /.well-known/oauth-authorization-server` liefert die **OAuth 2.0 Authorization Server Metadata** (RFC 8414). Sie gibt an, wo sich der Autorisierungs‑Endpoint befindet, wo Tokens ausgetauscht werden können und welche Grant‑Typen unterstützt werden.

`GET /.well-known/oauth-protected-resource` liefert die **Protected Resource Metadata** (RFC 9728). Sie beschreibt, welche Ressource das ist, welche Scopes benötigt werden und wo der Autorisierungs‑Server zu finden ist.

Fehlt einer von beiden, schlägt **claude.ai** stillschweigend beim Verbinden fehl. Keine Fehlermeldung, kein Retry. Der „Connect“-Button wird einfach nicht angezeigt. Ich habe eine Stunde damit verloren, weil der `oauth-protected-resource`‑Endpunkt in keinem der von mir gefundenen Tutorials auftauchte. Ich habe ihn erst entdeckt, indem ich das MCP‑Auth‑Spec direkt gelesen habe.

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

Beide Endpunkte müssen JSON zurückgeben, beide müssen exakt unter den angegebenen Pfaden erreichbar sein, und beide müssen dieselbe URL für den Autorisierungs‑Server angeben. Stimmen `issuer` im einen und `authorization_server` im anderen nicht überein, verwirft der Client die Konfiguration.
## 2. Die von dir gewählte Auth‑Bibliothek könnte mitten im PR veraltet sein

Reactive Resume verwendet **better-auth** für die Authentifizierung. **better-auth** liefert ein `mcp()`‑Plugin, das die Dynamic Client Registration und das Token‑Management übernimmt. Perfekt. Drei Zeilen Konfiguration und du hast OAuth für MCP.

Ich habe den gesamten PR darum herum gebaut, ihn auf Cloud Run deployed, end‑to‑end mit claude.ai verifiziert und den PR zur Review freigegeben.

Die Antwort des Maintainers [response](https://github.com/amruthpillai/reactive-resume/pull/2829#issuecomment-1):

> Das MCP‑Plugin wird bald veraltet sein [...] Könntest du den PR refaktorieren, um stattdessen das OAuth Provider Plugin zu benutzen?

Er hatte recht. Die **better-auth**‑Dokumentation enthielt bereits einen Deprecation‑Hinweis, der zu `@better-auth/oauth-provider` verwies. Das neue Plugin ist allgemeiner (nicht MCP‑spezifisch), verwendet JWT‑Tokens anstelle von undurchsichtigen Tokens und erfordert JWKS‑Key‑Management.

Der Refactor berührte jede auth‑bezogene Datei. Die undurchsichtige Token‑Abfrage via `getMcpSession()` wurde zu JWT‑Verifizierung via `verifyAccessToken()`. Auch das Datenbankschema änderte sich. `oauthApplication` wurde zu `oauthClient` (RFC 7591‑konform) und neue Tabellen für `oauthRefreshToken` und `jwks` tauchten auf.

Die Lehre ist nicht „zuerst nach Deprecations suchen“. Sie lautet: Das MCP‑Auth‑Tooling entwickelt sich gerade rasant. Was du heute auswählst, könnte nächsten Monat schon überholt sein. Halte deine OAuth‑Logik hinter einem dünnen Adapter, damit der Refactor mechanisch statt architektonisch ist.
## 3. Ihre Auth-Kette hat mehr Ebenen, als Sie denken

Der OAuth‑Ablauf funktionierte. Jeder Tool‑Aufruf schlug mit `Unauthorized` fehl.

Das Problem: Reactive Resume nutzt oRPC für seine API‑Schicht. Der oRPC‑Kontext hat seine eigene Auth‑Kette, getrennt von der Authentifizierung des MCP‑Endpoints. Wenn ein Tool `listResumes` aufruft, prüft oRPC ein Session‑Cookie oder einen API‑Key. Es kennt keine OAuth‑Bearer‑Tokens.

Der MCP‑Endpoint authentifizierte den Nutzer. Anschließend rief er eine oRPC‑Prozedur auf. oRPC sah kein Cookie und keinen API‑Key. `Unauthorized`.

Die Lösung: Den Bearer‑Token durch die oRPC‑Auth‑Kette propagieren.

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

Die tiefere Lektion: In jedem System, in dem die Authentifizierung auf einer Gateway‑Ebene (MCP‑Endpoint) stattfindet und dann an eine innere Ebene (oRPC) weitergereicht wird, muss sichergestellt sein, dass die innere Ebene dasselbe Anmeldeformat akzeptiert. Wenn nicht, haben Sie zwei Optionen: Den aufgelösten Nutzer‑Kontext weitergeben oder der inneren Ebene beibringen, den neuen Anmeldetyp zu verstehen. Ich habe Letzteres gewählt, weil es robuster gegenüber zukünftigen Tool‑Erweiterungen ist.

Und selbst nach der Korrektur der Auth‑Kette gibt es eine zweite Überraschung: `getMcpSession()` (und sein Nachfolger `verifyAccessToken()`) liefert ein `OAuthAccessToken`‑Objekt mit einem `userId`‑Feld, nicht einem `user`‑Feld. Sie benötigen einen separaten Datenbank‑Lookup:

```typescript
const token = await verifyAccessToken(bearer);
const user = await db.query.user.findFirst({
  where: eq(userTable.id, token.userId),
});
```

In jeder OAuth‑Provider‑Implementierung sind Token‑Verifizierung und Nutzer‑Auflösung zwei separate Schritte. Gehen Sie nicht davon aus, dass die Bibliothek sie zusammenführt.
## 4. Rückwärtskompatibilität bedeutet zwei Authentifizierungswege für immer

Reactive Resume hatte bereits MCP‑Authentifizierung über `x-api-key`‑Header. Bestehende Nutzer haben API‑Schlüssel konfiguriert. Diese zu entfernen und alle dazu zu zwingen, sich über OAuth neu zu authentifizieren, würde jede bestehende Integration brechen.

Deshalb hat der MCP‑Endpunkt jetzt einen dualen Authentifizierungsweg:

```typescript
// Versuche zuerst OAuth Bearer
const bearer = headers.get("authorization")?.replace("Bearer ", "");
if (bearer) {
  const session = await verifyOAuthToken(bearer);
  if (session?.userId) { /* authentifiziert */ }
}

// Fallback zu API‑Schlüssel
const apiKey = headers.get("x-api-key");
if (apiKey) {
  const user = await verifyApiKey(apiKey);
  if (user) { /* authentifiziert */ }
}

// Keines hat funktioniert
return new Response("Unauthorized", {
  status: 401,
  headers: { "WWW-Authenticate": "Bearer" },
});
```

Die Reihenfolge ist wichtig. Bearer zuerst, API‑Schlüssel danach. Wenn du zuerst den API‑Schlüssel prüfst und der Nutzer einen fehlerhaften API‑Schlüssel zusammen mit einem gültigen Bearer‑Token sendet, könnte die API‑Schlüssel‑Prüfung eine Ausnahme werfen, bevor der Bearer‑Pfad ausgeführt wird.

Und der Header `WWW-Authenticate: Bearer` in der 401‑Antwort ist laut MCP‑Spezifikation erforderlich. Ohne ihn weiß claude.ai nicht, dass es den OAuth‑Flow starten soll. Es behandelt den Endpunkt einfach als dauerhaft nicht erreichbar.

Der API‑Schlüssel‑Pfad wird dieses PR überdauern. Seine Entfernung wäre ein breaking change, der einen Migrationsplan und einen Deprecation‑Zeitplan erfordert.

Noch ein subtiler Punkt: `verifyApiKey` kann bei fehlerhafter Eingabe eine Ausnahme werfen. Das Einwickeln in try‑catch verhindert laute Fehlermeldungen bei fehlgeschlagenen Token‑Parsing‑Versuchen. Der ursprüngliche Code nutzte String‑Vergleiche auf Fehlermeldungen (`error.message.includes("...")`). Die refaktorierte Version verwendet `instanceof AuthError`, was typensicher ist und nicht bricht, wenn sich die Fehlermeldung ändert.
## Was ich weggelassen habe

- **Token-Aktualisierung.** Das OAuth‑Provider‑Plugin kümmert sich automatisch um Refresh‑Tokens. Ich brauchte keine eigene Logik.
- **Durchsetzung von Scopes.** Alle MCP‑Tools erhalten vollen Benutzerzugriff. In Ordnung für einen persönlichen Lebenslauf‑Generator, nicht jedoch für ein Multi‑Tenant‑SaaS.
- **Rate‑Limiting an den OAuth‑Endpunkten.** Die Dynamic Client Registration ist per Design offen (RFC 7591). Jeder kann sich registrieren. Rate‑Limiting steht noch auf der To‑Do‑Liste des Maintain​ers.
- **Consent‑Screen.** Der OAuth‑Provider von better‑auth überspringt den Consent‑Screen für First‑Party‑Apps. Sollte Reactive Resume jemals zum OAuth‑Provider für Drittanbieter‑Apps werden, ist ein Consent‑UI erforderlich.
## Das Setup, das bewies, dass es funktioniert

Selbstgehostetes Reactive Resume auf Google Cloud Run (europe-west1), PostgreSQL bei Neon.tech (kostenlose Stufe). Der OAuth‑Ablauf schließt in unter 2 Sekunden ab: claude.ai entdeckt Endpunkte, registriert dynamisch, leitet zur Anmeldeseite weiter, tauscht den Code aus und beginnt, Tool‑Aufrufe zu tätigen. Auflisten, Lesen und Patchen von Lebensläufen funktionieren alle über das Bearer‑Token.

Der Ablauf ist End‑zu‑End auf Cloud Run bewiesen. Der PR wurde gemerged und das Feature wird mit dem nächsten Release ausgeliefert.

Wenn du OAuth zu deinem eigenen MCP‑Server hinzufügst, lies [PR #2829](https://github.com/amruthpillai/reactive-resume/pull/2829) für die vollständige Implementierung. Jeder oben genannte Stolperstein entspricht einem konkreten Commit. Um das Ergebnis auszuprobieren, zeige claude.ai auf deine eigene Reactive‑Resume‑Instanz und verbinde dich via OAuth. Mein Setup läuft unter [resume.vasudev.xyz](https://resume.vasudev.xyz).

---

*Christian Pojoni entwickelt MCP‑Integrationen für Open‑Source‑Tools. Mehr unter [vasudev.xyz](https://vasudev.xyz).*

*Das Titelbild für diesen Beitrag wurde von KI generiert.*
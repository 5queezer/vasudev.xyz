---
title: "Hinzufügen von OAuth 2.1 zu einem Self‑Hosted MCP Server: 4 Fallstricke aus der Praxis"
date: 2026-03-25
description: "Was ist kaputt,als ich claude.ai zu meiner eigenen Reactive Resume-Instanz über OAuth angeschlossen habe?"
images: ["/images/adding-oauth-mcp-server-gotchas-og.png"]
images: ["/images/adding-oauth-mcp-server-gotchas-og.png"]
author: "Christian Pojoni"
tags: ["typescript", "mcp", "oauth"]
translationHash: "5d543c955badade7d5a27c1c01c3d9d1"
---
**MCP OAuth funktioniert, aberdie Spec lässt vier Fallen offen, die Tutorials überspringen.**  

MCP (Model Context Protocol) lässt KI‑Assistenten Tools auf entfernten Servern aufrufen. Wenn dein MCP‑Server jedoch selbst gehostet ist, muss sich claude.ai gegen deine Benutzerkonten authentifizieren – nicht gegen die von Anthropic. Das bedeutet, dein Server muss ein vollständiger OAuth‑2.1‑Anbieter werden: Dynamic Client Registration, Authorization Code mit PKCE, Token‑Austausch.

Ich habe [PR #2829](https://github.com/amruthpillai/reactive-resume/pull/2829) eingereicht, um das in [Reactive Resume](https://github.com/amruthpillai/reactive-resume), dem Open‑Source‑Lebenslauf‑Builder, hinzuzufügen. Sechs Commits, ein mittlerer Refactor im PR, nachdem der Maintainer eine Deprecation flaggte, und mehrere Stunden Debugging der Auth‑Ketten. Das ist die OAuth‑Seite [dieser Geschichte](/blog/shipping-a2a-protocol-support-in-rust/).

**MCP OAuth funktioniert, aber die Spec lässt vier Fallen offen, die Tutorials überspringen.**

## 1. Dein MCP‑Server benötigt zwei `.well-known`‑Endpoints, nicht einen

Wenn sich claude.ai mit einem benutzerdefinierten MCP‑Endpoint verbindet, führt sie keinen direkten POST an deine URL aus. Zuerst erkundigt sie sich nach den OAuth‑Metadaten. Die MCP‑Auth‑Spec verlangt zwei Entdeckung‑Endpoints:

`GET /.well-known/oauth-authorization-server` gibt die OAuth 2.0 Authorization Server Metadata (RFC 8414) zurück. Sie informiert Clients, wo sie autorisieren dürfen, wo Token ausgetauscht werden können und welche Grant‑Types unterstützt werden.

`GET /.well-known/oauth-protected-resource` gibt die Protected Resource Metadata (RFC 9728) zurück. Sie beschreibt, um welches Resource es sich handelt, welche Scopes benötigt werden und wo der Authorization Server zu finden ist.

Fehlt einer der beiden Endpoints, schlägt die Verbindung von claude.ai stumm fehl. Keine Fehlermeldung, keinRetry. Der „Connect“-Button erscheint einfach nicht. Ich habe dafür eine Stunde gebraucht, weil das `oauth-protected-resource`‑Endpoint in keinem Tutorial vorkam. Ich entdeckte es erst, indem ich die MCP‑Auth‑Spec selbst las.

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

Beide Endpoints müssen JSON zurückliefern, beide müssen exakt die genannten Pfade verwenden, und beide müssen sich über die Authorization‑Server‑URL einig sein. Wenn `issuer` in einem nicht mit `authorization_server` in dem anderen übereinstimmt, weist der Client die Konfiguration zurück.

## 2. Die Auth‑Bibliothek, die du gewählt hast, kann mittendurch PR veraltet werden

Reactive Resume nutzt `better-auth` für die Authentifizierung. `better-auth` liefert ein `mcp()`‑Plugin, das Dynamic Client Registration und Token‑Management übernimmt. Perfekt – drei Konfigurationszeilen und du hast OAuth für MCP.

Ich baute den gesamten PR darum herum, deployte auf Cloud Run, verifizierte die End‑zu‑End‑Verbindung mit claude.ai und markierte den PR als bereit für Review.

Die Reaktion des Maintainers war:

> The MCP plugin is soon to be deprecated [...] Could you refactor the PR to make use of the OAuth Provider Plugin instead?

Er hatte recht. Die `better-auth`‑Docs zeigten bereits eine Deprecation‑Hinweis, die zu `@better-auth/oauth-provider` führt. Das neue Plugin ist allgemeiner (nicht MCP‑spezifisch), verwendet JWT‑Tokens statt Opaque‑Tokens und erfordert JWKS‑Key‑Management.

Der Refactor berührte jede Auth‑Datei. Der Lookup von Opaque‑Tokens via `getMcpSession()` wurde zu JWT‑Verifizierung via `verifyAccessToken()`. Die Datenbankschema‑Änderungen umfassten: `oauthApplication` wurde zu `oauthClient` (RFC 7591‑konform), und neue Tabellen für `oauthRefreshToken` und `jwks` kamen hinzu.

Die Lektion ist nicht „erst nach Deprecations suchen“, sondern dass MCP‑Auth‑Werkzeuge gerade stark im Wandel sind. Was du heute wählst, könnte nächsten Monat überholt sein. Halte deine OAuth‑Logik hinter einem dünnen Adapter, damit ein Refactor mechanisch, nicht architektonisch, ist.

## 3. Deine Auth‑Kette hat mehr Ebenen, als du denkst

Der OAuth‑Flow funktionierte. Jeder Tool‑Aufruf fehlte jedoch mit `Unauthorized`.

Das Problem: Reactive Resume nutzt oRPC für seine API‑Ebene. Der oRPC‑Context hat seine eigene Auth‑Kette, getrennt von der MCP‑Endpoint‑Auth. Wenn ein Tool `listResumes` aufruft, prüft oRPC auf ein Session‑Cookie oder eine API‑Key. Es kennt keine OAuth‑Bearer‑Tokens.

Der MCP‑Endpoint authentifizierte den Nutzer. Dann rief er ein oRPC‑Verfahren auf. oRPC sah kein Cookie und keine API‑Key. `Unauthorized`.

Die Lösung: den Bearer‑Token durch die oRPC‑Auth‑Kette weiterzuleiten.

```typescript// In the oRPC context builder
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

Die tiefere Lektion: In jedem System, wo Auth auf einer Gateway‑Ebene (MCP‑Endpoint) stattfindet und dann an eine innere Ebene (oRPC) weitergeleitet wird, musst du sicherstellen, dass die innere Ebene denselben Credential‑Typ akzeptiert. Wenn nicht, hast du zwei Optionen: den gelösten Nutzer‑Kontext weiterreichen oder der inneren Ebene beibringen, den neuen Credential‑Typ zu verstehen. Ich wählte Letzteres, weil es robuster ist.

Und selbst nach dem Fix der Auth‑Kette kam eine zweite Überraschung: `getMcpSession()` (und sein Nachfolger `verifyAccessToken()`) liefert ein `OAuthAccessToken`‑Objekt mit einem `userId`‑Feld, nicht mit einem `user`‑Feld. Du brauchst einen separaten Datenbank‑Lookup:

```typescript
const token = await verifyAccessToken(bearer);
const user = await db.query.user.findFirst({
  where: eq(userTable.id, token.userId),
});
```

Bei jedem OAuth‑Anbieter sind Token‑Verifizierung und Nutzer‑Auflösung zwei separate Schritte. Geh nicht davon aus, dass die Bibliothek das für dich erledigt.

## 4. Rückwärtskompatibilität bedeutet zwei Auth‑Pfade für immer

Reactive Resume hatte bereits MCP‑Auth über `x-api-key`‑Header. Bestehende Nutzer haben API‑Keys konfiguriert. Ein komplettes Abschalten und erzwingen von OAuth‑Authentifizierung würde alle bestehenden Integrationen brechen.

Deshalb hat der MCP‑Endpoint jetzt einen dualen Auth‑Pfad:

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

// Neither workedreturn new Response("Unauthorized", {
  status: 401,
  headers: { "WWW-Authenticate": "Bearer" },
});
```

Die Reihenfolge ist wichtig. Zuerst Bearer, dann API‑Key. Wenn du zuerst die API‑Key‑Prüfung machst und der Nutzer ein malformed API‑Key zusammen mit einem gültigen Bearer‑Token sendet, könnte die API‑Key‑Prüfung bereits einen Fehler werfen, bevor der Bearer‑Pfad ausgeführt wird.

Und der `WWW-Authenticate: Bearer`‑Header in der 401‑Antwort ist von der MCP‑Spec verpflichtend. Ohne ihn weiß claude.ai nicht, dass es einen OAuth‑Flow starten soll. Es behandelt den Endpoint einfach als dauerhaft nicht erreichbar.

Der API‑Key‑Pfad wird noch lange bestehen bleiben. Sein Entfernen wäre eine breaking change, die einen Migrationsplan und einen Deprecation‑Zeitplan erfordert.

Ein weiteres subtiles Detail: `verifyApiKey` kann bei fehlerhaftem Input einen Ausnahme‑Wert werfen. Das Einhüllen in try‑catch verhindert lautes Logging bei fehlgeschlagenen Token‑Parsing‑Versuchen. Der ursprüngliche Code nutzte String‑Matching auf `error.message.includes(...)`. Die refaktorierte Version nutzt `instanceof AuthError`, was typsicher ist und nicht bricht, wenn sich die Fehlermeldung ändert.

## Was ich weggelassen habe

- **Token‑Refresh.** Das OAuth‑Provider‑Plugin kümmert sich automatisch um Refresh‑Tokens. Ich brauchte keine eigene Logik.
- **Scope‑Enforcement.** Alle MCP‑Tools erhalten vollen Nutzungszugriff. Das ist für einen persönlichen Lebenslauf‑Builder in Ordnung, für ein Multi‑Tenant‑SaaS jedoch nicht angemessen.
- **Rate‑Limiting der OAuth‑Endpoints.** Die Dynamic Client Registration ist per Definition offen (RFC 7591). Rate‑Limiting steht auf der TODO‑Liste des Maintainers.
- **Consent‑Screen.** Das OAuth‑Provider‑Plugin von better‑auth überspringt die Consent‑Screen für First‑Party‑Apps. Sollte Reactive Resume jemals ein OAuth‑Provider für Dritt‑Party‑Apps werden, wäre eine Consent‑UI nötig.

## Die Einrichtung, die bewies, dass es funktioniert

Selbstgehostetes Reactive Resume auf Google Cloud Run (europe‑west1), PostgreSQL bei Neon.tech (Free‑Tier). Der OAuth‑Flow completes in unter 2 Sekunden: claude.ai entdeckt die Endpoints, registriert sich dynamisch, leitet zum Login‑Page weiter, tauscht den Code ein und beginnt mit Tool‑Aufrufen. Auflisten, Lesen und Patchen von Lebensläufen funktionieren über das Bearer‑Token.

Der Flow ist end‑zu‑End auf Cloud Run getestet. Der PR wurde merged und das Feature erscheint in der nächsten Version.

Wenn du OAuth zu deinem eigenen MCP‑Server hinzufügen willst, schau dir [PR #2829](https://github.com/amruthpillai/reactive-resume/pull/2829) für die komplette Implementierung an. Jede oben beschriebene Fallfalle entspricht einem konkreten Commit. Um das Ergebnis auszuprobieren, leite claude.ai auf deine eigene Reactive‑Resume‑Instanz und verbinde dich per OAuth. Meine Einrichtung läuft unter [resume.vasudev.xyz](https://resume.vasudev.xyz).

---

*Christian Pojoni baut MCP‑Integrationen für Open‑Source‑Tools. Mehr bei [vasudev.xyz](https://vasudev.xyz).*

*Das Cover‑Bild für diesen Beitrag wurde von KI generiert.*
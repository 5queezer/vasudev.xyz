---
title: "Hinzufügen von OAuth2.1 zu einem Self‑Hosted MCP Server: 4 Fallstricke aus der Praxis"
date: 2026-03-25
description: "Was kaputtging, als ich claude.ai über OAuth an meine eigene Reactive Resume-Instanz angebunden habe."
images: ["/images/adding-oauth-mcp-server-gotchas-og.png"]
author: "Christian Pojoni"
tags: ["typescript", "mcp", "oauth"]
translationHash: "59290bbbb76267a112a064d6ee271b13"
---
MCP (Model Context Protocol) ermöglicht KI‑Assistenten, Tools auf Remote‑Servern aufzurufen. Wenn dein MCP‑Server jedoch lokal gehostet ist, benötigt claude.ai zur Authentifizierung gegen deine Benutzerkonten, nicht gegen die von Anthropic. Das bedeutet, dein Server muss als OAuth 2.1‑Provider fungieren – Dynamic Client Registration, Authorization Code mit PKCE, Token‑Austausch.  

Ich submitting [PR #2829](https://github.com/amruthpillai/reactive-resume/pull/2829) zum Hinzufügen zu [Reactive Resume](https://github.com/amruthpillai/reactive-resume), dem Open‑Source‑Lebenslauf‑Builder. Sechs Commits, ein mittleres Refactoring im PR nach dem Hinweis des Maintainers über eine Deprecation und mehrere Stunden Debugging von Auth‑Ketten. Das ist die OAuth‑Seite von [dieser Geschichte](/blog/shipping-a2a-protocol-support-in-rust/).  

**MCP OAuth funktioniert, aber die Spezifikation lässt vier Fallstricke übrig, die Tutorials überspringen.**  

## 1. Dein MCP‑Server benötigt zwei `.well-known`-Endpoints, nicht nur einen  

Wenn claude.ai eine benutzerdefinierte MCP‑Endpoint verbindet, POSTet es nicht einfach zu deiner URL. Zuerst sucht es nach OAuth‑Metadaten. Die MCP‑Auth‑Spezifikation verlangt zwei Entdeckungs‑Endpoints:  

`GET /.well-known/oauth-authorization-server` gibt die OAuth 2.0 Authorization Server Metadata (RFC 8414) zurück – wo autorisiert wird, wo Token ausgetauscht werden, welche Grant‑Types unterstützt werden.  

`GET /.well-known/oauth-protected-resource` gibt die Protected Resource Metadata (RFC 9728) zurück – um welches Resource es sich handelt, welche Scopes benötigt werden und wo der Authorization Server zu finden ist.  

Fehlt einer der beiden, schlägt die Verbindung von claude.ai silently fehl. Keine Fehlermeldung, kein Retry. Es erscheint einfach keine „Verbinden“-Schaltfläche. Ich habe dafür eine Stunde verloren, weil das `oauth-protected-resource`‑Endpoint in keiner mir bekannten Tutorial stand. Ich entdeckte es erst, indem ich die MCP‑Auth‑Spezifikation las.  

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

Beide Endpoints müssen JSON zurückgeben, beide müssen sich an den exakt angegebenen Pfaden befinden, und beide müssen sich im Hinblick auf die Authorization‑Server‑URL einig sein. Wenn `issuer` in einem nicht mit `authorization_server` in dem anderen übereinstimmt, weist der Client die Konfiguration zurück.  

## 2. Die Auth‑Bibliothek, die du gewählt hast, könnte mitten im PR veraltet werden  Reactive Resume verwendet better-auth für die Authentifizierung. Better-auth liefert ein `mcp()`‑Plugin, das Dynamic Client Registration und Token‑Management übernimmt. Perfekt – mit drei Konfigurationen hast du OAuth für MCP.  

Ich baute das gesamte PR darum herum, deployte es auf Cloud Run, verifizierte, dass es end‑zu‑end mit claude.ai funktioniert, und markierte das PR als bereit für Review.  Der Maintainer antwortete [so](https://github.com/amruthpillai/reactive-resume/pull/2829#issuecomment-1):  

> The MCP plugin is soon to be deprecated [...] Could you refactor the PR to make use of the OAuth Provider Plugin instead?  

Er hatte recht. Die better-auth‑Dokumentation enthielt bereits eine Deprecation‑Hinweis, die auf `@better-auth/oauth-provider` verwies. Das neue Plugin ist allgemeiner (nicht MCP‑spezifisch), nutzt JWT‑Tokens anstelle von opaken Tokens und erfordert JWKS‑Key‑Management.  

Das Refactoring betraf jede Auth‑bezogene Datei. Die Lookup‑Methode für opake Tokens mittels `getMcpSession()` wurde durch JWT‑Verifizierung mittels `verifyAccessToken()` ersetzt. Die Datenbankschema änderte sich – `oauthApplication` wurde zu `oauthClient` (RFC 7591‑konform) und es erschienen neue Tabellen für `oauthRefreshToken` und `jwks`.  

Die Lehre besteht nicht darin, zuerst nach Deprecations zu suchen – es ist, dass MCP‑Auth‑Tooling sich derzeit rapid entwickelt. Was du heute wählst, könnte nächsten Monat überholt sein. Halte deine OAuth‑Logik hinter einem dünnen Adapter, damit das Refactoring mechanisch, nicht architecturally, erfolgt.  

## 3. Deine Auth‑Kette hat mehr Schichten als du denkst  

Der OAuth‑Flow funktionierte. Jeder Tool‑Aufruf schlug jedoch mit `Unauthorized` fehl.  

Das Problem: Reactive Resume nutzt oRPC für seine API‑Schicht. Der oRPC‑Kontext hat seine eigene Auth‑Kette – getrennt von der MCP‑Endpoint‑Authentifizierung. Wenn ein Tool `listResumes` aufruft, prüft oRPC nach einem Session‑Cookie oder einer API‑Key. Es kennt OAuth‑Bearer‑Tokens nicht.  

Der MCP‑Endpoint authentifizierte den Benutzer. Anschließend rief er ein oRPC‑Verfahren auf. oRPC sah weder ein Cookie noch eine API‑Key. `Unauthorized`.  

Die Lösung: den Bearer‑Token durch die oRPC‑Auth‑Kette weiterleiten.  

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

Die tiefere Lehre: In jedem System, in dem Authigcke auf einer Gateway‑Schicht (MCP‑Endpoint) stattfindet und dann an eine innere Schicht (oRPC) weitergeleitet wird, muss überprüft werden, ob die innere Schicht das gleiche Credential‑Format akzeptiert. Wenn nicht, hast du zwei Optionen: den gelösten Benutzerkontext weitergeben oder die innere Schicht dazu bringen, das neue Credential‑Typ zu verstehen. Ich wählte Letzteres, weil es robuster gegenüber zukünftigen Tool‑Erweiterungen ist.  

Und selbst nach dem Fix der Auth‑Kette folgte ein zweiter Schock: `getMcpSession()` (und dessen Nachfolger `verifyAccessToken()`) gibt ein `OAuthAccessToken`‑Objekt mit einem `userId`‑Feld, nicht mit einem `user`‑Feld zurück. Du musst eine separate Datenbankabfrage durchführen:  ```typescript
const token = await verifyAccessToken(bearer);
const user = await db.query.user.findFirst({
  where: eq(userTable.id, token.userId),
});
```  

Bei jeder OAuth‑Provider‑Implementierung sind Token‑Verifizierung und Benutzerauflösung zwei separate Schritte. Gehe nicht davon aus, dass die Bibliothek sie zusammenführt.  ## 4. Rückwärtskompatibilität bedeutet für immer zwei Auth‑Pfade  Reactive Resume hatte bereits MCP‑Auth über `x-api-key`‑Header. Bestehende Nutzer hatten API‑Keys konfiguriert. Wäre das alles entfernt und alle müssten sich über OAuth neu authentifizieren, würden alle bestehenden Integrationen broken.  

Daher hat der MCP‑Endpoint jetzt einen dualen Auth‑Pfad:  

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

Die Reihenfolge ist wichtig. Zuerst Bearer, dann API‑Key. Wenn du zuerst den API‑Key prüfst und der Benutzer ein fehlerhaftes API‑Key zusammen mit einem gültigen Bearer‑Token sendet, könnte der API‑Key‑Check vor dem Bearer‑Pfad ausgelöst werden.  

Und der `WWW-Authenticate: Bearer`‑Header in der 401‑Antwort ist gemäß der MCP‑Spezifikation erforderlich. Ohne ihn weiß claude.ai nicht, dass ein OAuth‑Flow initiiert werden soll – es behandelt den Endpoint einfach als dauerhaft nicht erreichbar.  

Der API‑Key‑Pfad wird über dieses PR hinausleben. Seine Entfernung ist eine Bruchänderung, die einen Migrationsplan und eine Deprecation‑Zeitplanung erfordert.  

Eine weitere Nuance: `verifyApiKey` kann bei fehlerhaftem Input einen Fehler werfen. Das Umwickeln in try‑catch verhindert lautes Logging bei fehlgeschlagenen Token‑Parsing‑Versuchen. Der originale Code nutzte String‑Matching bei Fehlermeldungen (`error.message.includes("...")`). Die refaktorierte Version verwendet `instanceof AuthError` – typensicher und bricht nicht ab, wenn sich die Fehlermeldung ändert.  

## Was ich weggelassen habe  

- **Token refresh** -- das OAuth‑Provider‑Plugin kümmert sich automatisch um Refresh‑Tokens. Ich brauchte keine eigenen Logiken.  
- **Scope enforcement** -- alle MCP‑Tools erhalten vollen Benutzerzugriff. Das ist in Ordnung für einen persönlichen Lebenslauf‑Builder, nicht jedoch für ein Multi‑Tenant‑SaaS.  - **Rate limiting on the OAuth endpoints** -- Dynamic Client Registration ist nach Design offen (RFC 7591). Jeder kann sich registrieren. Rate‑Limiting steht auf der TODO‑Liste des Maintainers.  - **Consent screen** -- better-auths OAuth‑Provider überspringt für First‑Party‑Apps die Einwilligungs‑Oberfläche. Wenn Reactive Resume jemals ein OAuth‑Provider für Drittanbieter‑Apps werden soll, wird ein Einwilligungs‑UI benötigt.  

## Der Setup, der funktioniert hat  

Selbstgehostetes Reactive Resume auf Google Cloud Run (europe‑west1), PostgreSQL auf Neon.tech (Free‑Tier). Der OAuth‑Flow schließt in unter 2 Sekunden ab: claude.ai entdeckt Endpoints, registriert sich dynamisch, leitet zum Anmeldeseiten weiter, tauscht den Code ein und beginnt mit Tool‑Aufrufen. Resume‑Auflistung, Lesen und Patchen funktionieren alles über den Bearer‑Token.  

Der Flow ist end‑zu‑Ende auf Cloud Run bewiesen. Der PR wurde merged und die Funktion erscheint in der nächsten Version.  Wenn du OAuth zu deinem eigenen MCP‑Server hinzufügst, lese [PR #2829](https://github.com/amruthpillai/reactive-resume/pull/2829) für die vollständige Implementierung – jeder oben genannte Gotcha mapping zu einem spezifischen Commit. Um das Ergebnis auszuprobieren, zeige claude.ai auf deine eigene Reactive Resume‑Instanz und verbinde dich per OAuth. Mein Setup läuft unter [resume.vasudev.xyz](https://resume.vasudev.xyz).  

---  

*Ich schreibe über Systeme, Sicherheit und die Schnittstelle von KI‑Agenten mit realistischer Infrastruktur auf [vasudev.xyz](https://vasudev.xyz).*  

*Das Cover‑Bild für diesen Beitrag wurde von KI erzeugt.*
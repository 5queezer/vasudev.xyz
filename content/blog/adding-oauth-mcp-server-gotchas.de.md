---
title: "OAuth 2.1 zu einem selbst gehosteten MCP Server hinzufügen: 4 Fallstricke aus der Praxis"
date: 2026-03-25
description: "Was kaputtging, als ich claude.ai über OAuth mit meiner eigenen Reactive Resume-Instanz verbunden habe."
author: "Christian Pojoni"
tags: ["typescript", "mcp", "oauth"]
translationHash: "db236276b0881a2df0e66e8452ffbcf2"
---
MCP (Model Context Protocol) ermöglicht es KI-Assistenten, Tools auf entfernten Servern aufzurufen. Wenn dein MCP-Server jedoch selbst gehostet ist, muss sich claude.ai gegenüber deinen Benutzerkonten authentifizieren, nicht gegenüber denen von Anthropic. Das bedeutet, dein Server muss zu einem OAuth-2.1-Anbieter werden – Dynamic Client Registration, Authorization Code mit PKCE, Token-Austausch.

Ich habe [PR #2829](https://github.com/amruthpillai/reactive-resume/pull/2829) eingereicht, um dies zu [Reactive Resume](https://github.com/amruthpillai/reactive-resume), dem Open-Source-Lebenslauf-Builder, hinzuzufügen. Sechs Commits, ein Mid-PR-Refactoring, nachdem der Maintainer auf eine Deprecation hingewiesen hatte, und mehrere Stunden Debugging von Auth-Chains. Das ist die OAuth-Seite von [dieser Geschichte](/blog/shipping-a2a-protocol-support-in-rust/).

**MCP OAuth funktioniert, aber die Spezifikation birgt vier Fallen, die Tutorials überspringen.**

## 1. Dein MCP-Server benötigt zwei .well-known-Endpunkte, nicht nur einen

Wenn sich claude.ai mit einem benutzerdefinierten MCP-Endpunkt verbindet, sendet es nicht einfach ein POST an deine URL. Zuerst prüft es auf OAuth-Metadaten. Die MCP-Auth-Spezifikation erfordert zwei Discovery-Endpunkte:

`GET /.well-known/oauth-authorization-server` gibt die OAuth-2.0-Authorization-Server-Metadaten zurück (RFC 8414) – wo autorisiert wird, wo Tokens ausgetauscht werden und welche Grant Types du unterstützt.

`GET /.well-known/oauth-protected-resource` gibt die Protected-Resource-Metadaten zurück (RFC 9728) – um welche Ressource es sich handelt, welche Scopes benötigt werden und wo der Authorization Server zu finden ist.

Fehlt einer von beiden, schlägt die Verbindung von claude.ai stillschweigend fehl. Keine Fehlermeldung, kein Retry. Es wird einfach keine „Connect"-Schaltfläche angeboten. Ich habe eine Stunde damit verbracht, weil der `oauth-protected-resource`-Endpunkt in keinem der gefundenen Tutorials auftauchte. Ich habe ihn erst entdeckt, indem ich die MCP-Auth-Spezifikation direkt gelesen habe.

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

Beide Endpunkte müssen JSON zurückgeben, sich exakt an den angegebenen Pfaden befinden und sich auf die URL des Authorization Servers einigen. Wenn `issuer` in dem einen nicht mit `authorization_server` in dem anderen übereinstimmt, lehnt der Client die Konfiguration ab.

## 2. Die Auth-Bibliothek, die du gewählt hast, könnte mitten im PR deprecated werden

Reactive Resume nutzt better-auth für die Authentifizierung. Better-auth liefert ein `mcp()`-Plugin mit, das Dynamic Client Registration und Token-Management übernimmt. Perfekt – drei Zeilen Konfiguration und du hast OAuth für MCP.

Ich habe den gesamten PR darauf aufgebaut, auf Cloud Run deployed, verifiziert, dass es end-to-end mit claude.ai funktioniert, und den PR als ready for review markiert.

Die [Antwort](https://github.com/amruthpillai/reactive-resume/pull/2829#issuecomment-1) des Maintainers:

> Das MCP-Plugin wird bald deprecated sein [...] Könntest du den PR refactoren, um stattdessen das OAuth Provider Plugin zu nutzen?

Er hatte recht. Die better-auth-Dokumentation enthielt bereits einen Deprecation-Hinweis auf `@better-auth/oauth-provider`. Das neue Plugin ist allgemeiner (nicht MCP-spezifisch), verwendet JWT-Tokens anstelle von Opaque-Tokens und erfordert JWKS-Key-Management.

Das Refactoring betraf jede auth-bezogene Datei. Die Opaque-Token-Suche via `getMcpSession()` wurde zur JWT-Verifikation via `verifyAccessToken()`. Das Datenbankschema änderte sich – `oauthApplication` wurde zu `oauthClient` (RFC-7591-konform) und neue Tabellen für `oauthRefreshToken` und `jwks` kamen hinzu.

Die Lektion ist nicht „prüfe zuerst auf Deprecations" – sie ist, dass sich die MCP-Auth-Tooling gerade extrem schnell bewegt. Was du heute auswählst, könnte nächsten Monat überholt sein. Halte deine OAuth-Logik hinter einem dünnen Adapter, damit das Refactoring mechanisch und nichtarchitektonisch abläuft.

## 3. Deine Auth-Chain hat mehr Schichten, als du denkst

Der OAuth-Flow funktionierte. Jeder Tool-Aufruf schlug mit `Unauthorized` fehl.

Das Problem: Reactive Resume nutzt oRPC für seine API-Schicht. Der oRPC-Kontext hat seine eigene Auth-Chain – separat von der MCP-Endpunkt-Auth. Wenn ein Tool `listResumes` aufruft, prüft oRPC auf ein Session-Cookie oder einen API-Key. Es kennt keine OAuth-Bearer-Tokens.

Der MCP-Endpunkt hat den Benutzer authentifiziert. Dann rief er eine oRPC-Prozedur auf. oRPC sah kein Cookie und keinen API-Key. `Unauthorized`.

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

Die tiefere Lektion: In jedem System, bei dem die Auth auf einer Gateway-Ebene (MCP-Endpunkt) stattfindet und dann an eine innere Ebene (oRPC) weitergeleitet wird, musst du sicherstellen, dass die innere Ebene dasselbe Credential-Format akzeptiert. Falls nicht, hast du zwei Optionen: den aufgelösten Benutzerkontext durchreichen oder der inneren Ebene beibringen, den neuen Credential-Typ zu verstehen. Ich habe Letzteres gewählt, da es robuster gegenüber zukünftigen Tool-Erweiterungen ist.

Und selbst nach der Behebung der Auth-Chain folgte eine zweite Überraschung: `getMcpSession()` (und sein Nachfolger `verifyAccessToken()`) gibt ein `OAuthAccessToken`-Objekt mit einem `userId`-Feld zurück, kein `user`-Feld. Du benötigst eine separate Datenbankabfrage:

```typescript
const token = await verifyAccessToken(bearer);
const user = await db.query.user.findFirst({
  where: eq(userTable.id, token.userId),
});
```

Bei jeder OAuth-Provider-Implementierung sind Token-Verifikation und Benutzer-Auflösung zwei separate Schritte. Geh nicht davon aus, dass die Bibliothek sie zusammenführt.

## 4. Abwärtskompatibilität bedeutet zwei Auth-Pfade für immer

Reactive Resume hatte bereits MCP-Auth via `x-api-key`-Headern. Bestehende Benutzer haben API-Keys konfiguriert. Das herauszureißen und alle zu einer erneuten Authentifizierung via OAuth zu zwingen, würde jede bestehende Integration zerstören.

Der MCP-Endpunkt hat jetzt also einen doppelten Auth-Pfad:

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

Die Reihenfolge ist entscheidend. Zuerst Bearer, dann API-Key. Wenn du zuerst den API-Key prüfst und der Benutzer einen fehlerhaften API-Key zusammen mit einem gültigen Bearer-Token sendet, könnte die API-Key-Prüfung einen Fehler werfen, bevor der Bearer-Pfad durchlaufen wird.

Und der `WWW-Authenticate: Bearer`-Header in der 401-Antwort wird von der MCP-Spezifikation gefordert. Ohne ihn weiß claude.ai nicht, dass es den OAuth-Flow starten soll – es behandelt den Endpunkt einfach als dauerhaft unerreichbar.

Der API-Key-Pfad wird diesen PR überleben. Seine Entfernung ist ein Breaking Change, der einen Migrationsplan und einen Deprecation-Zeitplan erfordert.

Noch eine Feinheit: `verifyApiKey` kann bei fehlerhafter Eingabe werfen. Das Einbetten in ein try-catch verhindert laute Fehlerprotokolle durch fehlgeschlagene Token-Parsing-Versuche. Der ursprüngliche Code nutzte String-Matching für Fehlermeldungen (`error.message.includes("...")`). Die refaktorierte Version verwendet `instanceof AuthError` – typsicher und bricht nicht, wenn sich die Fehlermeldung ändert.

## Was ich ausgelassen habe

- **Token-Refresh** – das OAuth-Provider-Plugin verwaltet Refresh-Tokens automatisch. Ich brauchte keine benutzerdefinierte Logik.
- **Scope-Erzwingung** – alle MCP-Tools erhalten vollen Benutzerzugriff. Für einen persönlichen Lebenslauf-Builder in Ordnung, für ein Multi-Tenant-SaaS nicht.
- **Rate Limiting an den OAuth-Endpunkten** – Dynamic Client Registration ist standardmäßig offen (RFC 7591). Jeder kann sich registrieren. Rate Limiting steht auf der TODO-Liste des Maintainers.
- **Zustimmungsbildschirm (Consent Screen)** – better-auths OAuth Provider überspringt den Zustimmungsbildschirm für First-Party-Apps. Falls Reactive Resume jemals zum OAuth-Provider für Drittanbieter-Apps wird, ist eine Consent-UI nötig.

## Das Setup, das den Beweis angetreten hat

Selbst gehostetes Reactive Resume auf Google Cloud Run (europe-west1), PostgreSQL auf Neon.tech (Free Tier). Der OAuth-Flow ist in unter 2 Sekunden abgeschlossen: claude.ai entdeckt die Endpunkte, registriert sich dynamisch, leitet auf die Login-Seite weiter, tauscht den Code aus und beginnt mit Tool-Aufrufen. Das Auflisten, Lesen und Patchen von Lebensläufen funktioniert alles über das Bearer-Token.

Der Flow ist end-to-end auf Cloud Run getestet. Der PR wurde gemerged und das Feature wird mit dem nächsten Release ausgeliefert.

Wenn du OAuth zu deinem eigenen MCP-Server hinzufügst, lies [PR #2829](https://github.com/amruthpillai/reactive-resume/pull/2829) für die vollständige Implementierung – jeder der oben genannten Fallstricke entspricht einem spezifischen Commit. Um das Ergebnis zu testen, richte claude.ai auf deine eigene Reactive-Resume-Instanz aus und verbinde es via OAuth. Mein Setup läuft unter [resume.vasudev.xyz](https://resume.vasudev.xyz).

---

*Ich schreibe über Systeme, Sicherheit und die Schnittstelle von KI-Agenten mit echter Infrastruktur unter [vasudev.xyz](https://vasudev.xyz).*
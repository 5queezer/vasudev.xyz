---
title: "Hinzufügen von OAuth 2.1 zu einem selbstgehosteten MCP-Server: 4 Stolperstellen aus der Front"
date: 2026-03-25
description: "Was ist kaputt gegangen, als ich claude.ai über OAuth an meine eigene Reactive Resume-Instanz verbunden hatte."
author: "Christian Pojoni"
tags: ["typescript", "mcp", "oauth", "reactive-resume"]
translationHash: "8fed84f3af19da3af97348cc8d302f47"
---
MCP (Modell-Kontext-Protokoll) ermöglicht KI-Assistenten, Tools auf Remote-Servern aufzurufen. Allerdings erfordert ein selbstgehosteter MCP-Server, dass claude.ai sich gegen Ihre Benutzerkonten, nicht gegen die von Anthropic, authentifizieren muss. Das bedeutet: Ihr Server muss ein OAuth 2.1 Anbieter werden – Dynamic Client Registration, Authorization Code mit PKCE und Tokenwechsel. Ich habe [PR #2829](https://github.com/amruthpillai/reactive-resume/pull/2829) eingereicht, um diese Änderung in [Reactive Resume](https://github.com/amruthpillai/reactive-resume), der Open-Source-Plattform zum Erstellen von Lebensläufen, einzubetten. Siebzehn Commits, eine Refaktorisierung in der Mitte des PRs nach der Warnung des Maintainers wegen einer veralteten Abhängigkeit, und mehrere Stunden Debugging der Authentifizierungsflüsse. Dies ist die OAuth-Seite der [offenen Geschichte](/blog/shipping-a2a-protocol-support-in-rust/): **MCP OAuth funktioniert, aber die Spezifikation enthält vier häufig übersehene Fallstricke, die Tutorials nicht behandeln.**

## 1. Der MCP-Server benötigt zwei .well-known-Endpunkte, nicht nur einen  
Wenn claude.ai mit einem benutzerdefinierten MCP-Endpunkt verbindet, befragt er zunächst Metadata über OAuth. Die MCP-Spezifikation verlangt zwei Entdeckungsendpunkte:  
- `GET /.well-known/oauth-authorization-server`: Gibt die OAuth 2.0 Authorization Server Metadata (RFC 8414) zurück – Autorisierungs- und Tokenendpunkte, unterstützte Grant Types.  
- `GET /.well-known/oauth-protected-resource`: Gibt die Protected Resource Metadata (RFC 9728) zurück – den Ressourcentyp, erforderliche Scopes und den lokalisierten Autorisierungsserver.  

Fehlt einer dieser Endpunkte, zeigt claude.ai stumm kein „Connect“-Feld an. Das habe ich eine Stunde lang ignoriert, bis ich den zweiten Endpunkt im MCP-Auth-Spezifikation selbst entdeckt habe:

```typescript
// .well-known/oauth-authorization-server Rückgabe
json({
  issuer: authBaseUrl,
  authorization_endpoint: `${authBaseUrl}/api/auth/oauth/authorize`,
  token_endpoint: `${authBaseUrl}/api/auth/oauth/token`,
  registration_endpoint: `${authBaseUrl}/api/auth/oauth/register`,
  response_types_supported: ["code"],
  grant_types_supported: ["authorization_code", "refresh_token"],
  code_challenge_methods_supported: ["S256"],
});
```

Beide Endpunkte müssen JSON-Rückgabewerte liefern und auf exakten Pfaden existieren. Der `issuer` im einen und `authorization_server` im anderen müssen übereinstimmen – andernfalls lehnt der Client die Konfiguration ab.

## 2. Die gewählte Auth-Bibliothek könnte deaktiviert werden  
Reactive Resume nutzt `better-auth` für Authentifizierung. Der `mcp()`-Plugin vereinfacht OAuth-Datenregisterung und Token-Management. Perfekt – nur drei Zeilen Konfiguration für MCP-OAuth. Ich basierte meine PR darauf, testete die Implementierung auf Cloud Run und verifizierte den vollen Fluss mit claude.ai. Die Antwort des Maintainers:  
> "Der MCP-Plugin wird bald veraltet. Könntest du stattdessen das OAuth Provider Plugin nutzen?"  

Er hat Recht. Der neue plugin ist allgemeiner (nicht MCP-spezifisch), nutzt JWT anstelle reiner Vorlagen-Token und erfordert JWKS-Schlüsselverwaltung. Die Refaktorisierung betraf jede Authentifizierungsdatei: Vorlagen-Token-Abfrage via `getMcpSession()` wurde zu JWT-Validierung mit `verifyAccessToken()`. Die Datenbank-Struktur änderte sich – `oauthApplication` wurde zu `oauthClient` (entsprechend RFC 7591), neue Tabellen für `oauthRefreshToken` und `jwks` hinzugefügt. Die Lehre: Tooling in MCP-OAuth entwickelt sich schnell. Egal was du wählst – es kann nächstes Jahr übertroffen werden. Halte OAuth-Logik klar getrennt, um architektonische Änderungen zu vermeiden.

## 3. Die Authentifizierungskette hat mehr Ebenen, als erwartet  
Der OAuth-Fluss funktionierte. Tatsächlich fehlschlagen jedoch alle Tool-Aufrufe mit `Unauthorized`. Das Problem: Reactive Resume nutzt oRPC für die API-Schicht. oRPC hat eigene Authentifizierung – getrennt von dem MCP-Endpunkt. Wenn ein Tool `listResumes` aufruft, prüft oRPC auf Cookie oder API Key. OAuth-Bearer-Token werden ignoriert. Die Korrektur: Übertrage das Bearer-Token durch die oRPC-Authentifizierung:

```typescript
// In oRPC Context Builder
const bearer = headers.get("authorization")?.replace("Bearer ", "");
if (bearer) {
  const token = await verifyOAuthToken(bearer);
  if (token?.userId) {
    const user = await db.query.user.findFirst({ 
      where: eq(userTable.id, token.userId) 
    });
    if (user) return { user };
  }
}
```

Die tiefere Lehre: In Systemen mit Authentifizierungsschichten (z.B. Gateway + innerer Dienst) muss jede Schicht denselben Anmeldeweg akzeptieren. Entweder propagierst du den Benutzerkontext weiter oder du erteilst dem inneren System Wissen über die neuen Anmeldearten. Ich entschied mich für letzteres – stabiler für zukünftige Toolhubs.

Hinweis: `verifyAccessToken()` gibt ein `userId`, nicht `user`. Beim Datenbankzugriff triffst du auf:  
```typescript
const token = await verifyAccessToken(bearer);
const user = await db.query.user.findFirst({ 
  where: eq(userTable.id, token.userId) 
});
```

Token-Validierung und Benutzerresolution sind explizit getrennte Schritte. Nehme niemals an, dass eine Bibliothek diese Schritte für dich kombiniert.

## 4. Backward Compatibility erfordert zwei Authentifizierungswege  
Reactive Resume unterstützte bereits MCP über `x-api-key` Header. Bestehende Nutzer haben API Keys eingerichtet. Das Ripping-Away dieses Systems und Übergang zu OAuth würde bestehende Integrationen brechen. Die Lösung: doppelter Authentifizierungsweg mit Priorisierung:  
```typescript
// Zuerst OAuth-Bearer-Token versuchen
const bearer = headers.get("authorization")?.replace("Bearer ", "");
if (bearer) {
  const session = await verifyOAuthToken(bearer);
  if (session?.userId) /* authentifiziert */;
}

// Rückgriff auf API Key
const apiKey = headers.get("x-api-key");
if (apiKey) {
  const user = await verifyApiKey(apiKey);
  if (user) /* authentifiziert */;
}

// Weder Stimmt?
return new Response("Unauthorized", { 
  status: 401, 
  headers: { "WWW-Authenticate": "Bearer" } 
});
```

Die Reihenfolge der Prüfungen ist entscheidend. Hat der Client einen ungültigen API Key neben einem funktionsfähigen Bearer-Token? Die API Key-Prüfung könnte abstürzen – halte die Anfrage also durch den ersten Pfad um. Außerdem erfordert `WWW-Authenticate: Bearer` die MCP-Spezifikation. Ohne es startet claude.ai nie den OAuth-Fluss – es betrachtet das Endpunkt als dauerhaft nicht erreichbar.

Die neue Implementierung behält die Legacy-Methode bei. Ihr Auslöschen als Breaking Change erfordert eine Migrationsstrategie und einen Entfernungszeitplan.

## Was ich ausgelassen habe  
- **Token-Refresh** – Das Plugin von `better-auth` übernimmt automatische Refresh-Tokens. Kein eigenes Logikbedarf.  
- **Scope-Prüfungen** – Alle MCP-Tools erhalten vollen User-Zugriff. Sinnvoll für ein persönliches Tool, nicht für SaaS mit Rollentrennung.  
- **Rate Limiting** – Oft übersehen: Dynamic Client Registration ist nach RFC 7591 offen. Jeder kann sich registrieren. Rate Limiting steht noch auf der TODO-Liste des Maintainers.  
- **Einwilligungsbildschirm** – `better-auth` überspringt diesen für erste Parteiausgaben. Für externe Tools wäre ein Zustimmungsdialog nötig.

## Die erfolgreiche Konfiguration  
Selbstgehostete Reactive Resume-Instanz auf Google Cloud Run (europe-west1), PostgreSQL auf Neon.tech (kostenloser Tarif). Der OAuth-Fluss dauert unter 2 Sekunden: claude.ai entdeckt Endpunkte, registriert sich dynamisch, leitet zum Login-Portal weiter, tauscht den Code aus und macht Tool-Calls. Das Endergebnis – Lebenslauf-Tools, deren Statusausgabe, Patchen – funktioniert mit Bearer-Token. Die Funktionalität ist über einen Cloud Run auf [resume.vasudev.xyz](https://resume.vasudev.xyz) zugreifbar.

Die PR mit dem vollständigen Code steht unter [#2829](https://github.com/amruthpillai/reactive-resume/pull/2829). Nutze sie, um deinen MCP-Server einzurichten. Um Role-2-Offset zu testen, setupke deinen eigenen Reactive Resume-Server – der funktioniert bereits!

*Anmerkung zur Systemarchitektur und Sicherheit auf [vasudev.xyz](https://vasudev.xyz)*
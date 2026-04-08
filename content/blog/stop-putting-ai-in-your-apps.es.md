---
title: "Deja demeter IA en tus apps. Pon tus apps en IA."
date: 2026-03-27
description: "Por quélas funcionalidades de IA dentro de aplicaciones tradicionales son regresivas, y cómo MCP invierte la arquitectura."
author: "Christian Pojoni"
tags: ["mcp", "ai", "architecture"]
images: ["/images/ai-architecture.png"]
translationHash: "27829ec3ed0912b2c4ba37e469e8f14b"
---
I triedAirtable recently. It has AI features now. A little text box inside the app where you can ask questions about your data. It felt wrong immediately, and it took me a few days to articulate why.

The AI window inside Airtable doesn't know who I am. It's a stranger sitting inside someone else's house, asking me to explain everything from scratch.

Meanwhile, my actual AI, Claude, knows all of that. It has my memories, my custom skills, my context across dozens of conversations. The only thing it was missing was access to my data in NocoDB.

So I built that access. And the difference is night and day.

**La IA debe orquestar tus aplicaciones, no vivir dentro de ellas.**

## **The Architecture is Backwards**

Every SaaS company right now is racing to add an AI chat window to their product. Notion has one. Airtable has one. Jira has one. They're all building the same thing: a stateless LLM endpoint with access to one app's data and zero context about the user.

This is the wrong architecture. It optimizes for the vendor's lock-in, not for the user's workflow.

Think about what actually matters in an AI interaction: context. Who is this person? What are they working on? What do they prefer? What have they tried before? A generic AI window inside a database app will never have that. It can't. The context lives outside the app.

## MCP Flips It

The [Model Context Protocol](https://modelcontextprotocol.io/) inverts the architecture. Instead of putting a thin AI layer inside each app, you give your AI thick connections to all your apps. The AI becomes the orchestrator. The apps become data sources.

In my setup, Claude is the command center. It has memories from hundreds of past conversations, custom skills I built for specific workflows like job search, incident logging, and blog writing, and MCP connections to NocoDB (my CRM), Gmail, Google Calendar, Google Drive, and Notion.

When I say "update the status on my NocoDB application and draft a follow-up email," Claude does both. It knows which application I mean because we discussed it yesterday. It knows my email tone because it's written 50 drafts for me. No app-native AI window can do that.

## What This Actually Looks Like

I track my job applications in NocoDB. Here's what a typical interaction looks like:

I tell Claude: "Check my inbox for new recruiter emails, evaluate the roles, and update NocoDB."

Claude searches Gmail, reads the threads, evaluates each role against a custom psychological profile I built with it, covering work style preferences, communication patterns, autonomy needs, and culture fit markers, then creates or updates records in NocoDB with a match score and reasoning. Not keyword matching. Actual fit assessment for long-term satisfaction on both sides. One sentence from me, four tools coordinated, full context preserved.

Try doing that with Airtable's AI chat box.

## Why NocoDB, Not Airtable

Airtable's AI features are a walled garden. They work inside Airtable, with Airtable's model, on Airtable's terms. You can't swap the AI. You can't bring your own context. You can't extend it.

NocoDB es software de código abierto, se ejecuta sobre Postgres, y ahora soporta autenticación MCP estándar gracias a mi reciente [OAuth 2.1 PR](https://github.com/nocodb/nocodb/issues/13363). Eso significa que cualquier cliente de IA compatible con MCP puede conectarse a él con flujos OAuth adecuados, no con tokens de API copiados y pegados desde una página de configuración.

The difference isn't cosmetic. It's architectural. With NocoDB + MCP, the AI layer is yours. You choose the model. You own the context. You decide what gets connected.

## The Uncomfortable Implication

If the AI orchestrates the tools instead of living inside them, then the tools themselves become commoditized. Your database, your email client, your project tracker: they're all just data stores with APIs. The value shifts to the orchestration layer: the AI that knows you, remembers your context, and coordinates across everything.

This is uncomfortable for SaaS companies that built moats around user lock-in. When your AI can talk to any database through MCP, the specific project management tool you use matters about as much as which brand of USB cable you plug in.

## LimitationsThis setup is not turnkey. It requires a power-user willingness to wire up MCP servers, manage OAuth flows, and debug tool integrations. It assumes you trust your AI client with cross-app access to your data, which is a real trust decision, not a checkbox. And it works for a single user with a single AI context. Team-scale orchestration, shared memory, and access controls do not exist yet.

## Build the Bridge, Not the Island

If you're building a product today, don't bolt an AI chat window onto your app. Instead, make your app a great MCP server. Expose clean APIs, support standard auth (OAuth 2.1, not custom tokens), and let the user's AI talk to your data.

The best tools in the MCP era won't be the ones with the fanciest built-in AI. They'll be the ones that expose clean MCP endpoints and get out of the way, like NocoDB does today and like Notion and Airtable eventually will have to.

Want to see what this looks like in practice? I added [OAuth 2.1 MCP support to NocoDB](https://github.com/nocodb/nocodb/issues/13363), including RFC 8414 Discovery, RFC 7591 Dynamic Client Registration, and RFC 9728 Protected Resource Metadata. Browse [the fork](https://github.com/5queezer/nocodb), try connecting Claude to your own NocoDB instance, and see how the architecture feels when the AI sits on top instead of inside.

---

*Christian Pojoni construye infraestructura de agentes de IA. Más en [vasudev.xyz](https://vasudev.xyz).*

*La imagen de portada de esta publicación fue generada por IA.*
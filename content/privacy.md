---
title: "Privacy"
date: 2026-05-01
description: "How vasudev.xyz handles site, comment, and AI agent data."
---

This site is a static Hugo site hosted on GitHub Pages. It does not run a general analytics script.

## AI agent

The on-site AI agent is powered by a Cloudflare Worker that sends chat requests to an OpenRouter hosted model. The agent may also send server-side traces to Langfuse so I can debug failures, understand which pages trigger useful questions, and improve the agent.

The trace can include your chat messages, the agent response, the page URL, the site language, the chat mode, timestamps, model metadata, latency, error status, and an anonymous session ID stored in session storage. The session ID is used to group messages during one browser session. It is not intended to identify you across visits.

Please do not enter sensitive personal information into the agent.

The legal basis is legitimate interest in operating and improving the site agent. Agent traces are not used for advertising or sold to third parties.

## Processors

The site and agent may use these service providers:

- GitHub Pages for static hosting.
- Cloudflare Workers for the agent endpoint.
- OpenRouter for model inference.
- Langfuse for agent observability.
- Giscus and GitHub for comments, if you choose to comment.

## Comments

Comments are provided through Giscus and GitHub Discussions. If you comment, GitHub processes your GitHub account data and the comment content according to GitHub's own terms and privacy policy.

## Contact and deletion

If you want an agent trace or comment-related reference removed, contact me through the links on the site and include enough context to find the relevant interaction, such as the approximate date, page, and message text.

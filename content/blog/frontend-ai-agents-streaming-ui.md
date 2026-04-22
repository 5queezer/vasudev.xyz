---
title: "Streaming UI from AI Agents: 4 Approaches Ranked"
date: 2026-04-12
tags: ["ai", "agents", "frontend", "architecture"]
description: "AG-UI, A2UI, Vercel AI SDK streamUI, and Kombai take four different bets on how agents should build interfaces. One question decides which wins."
images: ["/images/frontend-ai-agents-streaming-ui-og.png"]
images: ["/images/frontend-ai-agents-streaming-ui-og.png"]
author: "Christian Pojoni"
---


Every AI agent today talks through a chat window. User asks a question, agent streams tokens back, maybe with a code block. The entire frontend is a glorified terminal emulator.

Four projects bet that agents should stream real interfaces instead of text. They disagree violently on how.

**The protocols split on one question: should the agent send executable code, structured data, or interaction events?**

Your answer determines your security model, your framework coupling, and whether your agent can build UI for anything besides a browser tab.

## The Comparison

| | Vercel AI SDK (streamUI) | AG-UI | A2UI | Kombai |
|---|---|---|---|---|
| **What ships** | React Server Components | Interaction events | Declarative JSON UI trees | Generated source code |
| **Transport** | RSC streaming | SSE, bi-directional events | Progressive JSON streaming | HTTP (batch) |
| **Framework lock** | Next.js + React | Any (protocol-level) | Any (protocol-level) | Outputs React, Vue, HTML |
| **Security model** | Trusted execution | Event schema validation | Whitelisted component catalog | Static output, no runtime risk |
| **Cross-platform** | Web only | Web | Flutter, Angular, Lit (React planned) | Web |
| **Agent integration** | Built into AI SDK tools | LangGraph, CrewAI, CopilotKit | Any agent via JSON | Standalone (Figma input) |
| **GitHub** | [Vercel/ai](https://github.com/vercel/ai) (~23K stars) | [ag-ui-protocol/ag-ui](https://github.com/ag-ui-protocol/ag-ui) (~13K stars) | [google/A2UI](https://github.com/google/A2UI) (~14K stars) | Closed source |
| **License** | Apache 2.0 | MIT | Apache 2.0 | Proprietary |
| **Pick when** | You own the agent and the Next.js frontend | You need agent observability and human-in-the-loop | You need cross-platform from untrusted agents | You're converting Figma designs to code |

That's the dashboard. Now the opinions.

---

## Vercel AI SDK: Stream the Component

Vercel's [AI SDK](https://github.com/vercel/ai) (~23K GitHub stars) lets your agent return full React Server Components instead of text. The model calls a tool, the tool returns JSX, the framework streams it to the browser. No WebSocket plumbing. No manual SSE setup. The component appears progressively as the model generates it.

```tsx
const result = streamUI({
  model: openai('gpt-4o'),
  prompt: 'Show a weather dashboard for Vienna',
  tools: {
    weather: {
      description: 'Get weather data for a city',
      parameters: z.object({ city: z.string() }),
      generate: async function* ({ city }) {
        yield <WeatherSkeleton />
        const data = await getWeather(city)
        return <WeatherCard data={data} />
      }
    }
  }
})
```

Here's what the tutorials skip: `streamUI` lives in the AI SDK RSC module, which Vercel marked **experimental** and [paused development on in October 2024](https://sdk.vercel.ai/docs). The recommended path in AI SDK 6 is AI SDK UI. You stream tool call data or objects via `useChat` and `useObject`, then render components client-side. The RSC approach still works, but Vercel is betting on client-side rendering instead.

That matters because the original pitch for `streamUI` was "stream full server components from your agent." The current recommendation is closer to "stream structured data, render locally." Which, if you squint, is the same direction A2UI is going, just without the protocol-level security.

You're also locked to React and Next.js. Your agent sends executable component trees. That means full trust between agent and frontend. Fine for first-party agents. Dangerous the moment you accept tool output from third parties. There is no sandboxing layer in the protocol.

**Use it** if you own both the agent and the Next.js app and accept the experimental status. **Skip it** if your agents come from external sources, or if "web only" is a constraint you can't accept.

---

## AG-UI: Stream the Thinking

[AG-UI](https://github.com/ag-ui-protocol/ag-ui) (~13K GitHub stars) takes a fundamentally different approach. Instead of streaming UI components, it streams interaction events: messages, typing indicators, thinking steps, tool calls, state updates. The frontend interprets these events however it wants.

```
event: TEXT_MESSAGE_START
event: TOOL_CALL_START  {name: "getWeather", args: {city: "Vienna"}}
event: TOOL_CALL_END    {result: {temp: 22, condition: "sunny"}}
event: STATE_SNAPSHOT   {weather: {temp: 22}}
event: TEXT_MESSAGE_CONTENT "It's 22°C and sunny in Vienna."
```

Built by the [CopilotKit](https://github.com/CopilotKit/CopilotKit) team, AG-UI treats agent-frontend communication as a standardized event bus. Your agent emits typed events. Your frontend subscribes and renders. The protocol supports sub-agents, so you can watch an orchestrator delegate work and stream every step for human-in-the-loop review.

This is the only protocol in the comparison that prioritizes debuggability. You can inspect every event, replay agent decisions, and build UIs that show the thinking process alongside the results. Integrations exist for [LangGraph](https://github.com/langchain-ai/langgraph), [CrewAI](https://github.com/crewAIInc/crewAI), and [Mastra](https://github.com/mastra-ai/mastra).

The trade-off is clear: AG-UI gives you events, not interfaces. You still build every component yourself. The protocol tells you *what the agent did*. You decide *what the user sees*.

**Use it** if you're building agentic experiences where users need to see and override what the agent is doing at each step. **Skip it** if you want the agent to generate the UI itself.

---

## A2UI: Stream the Description

[A2UI](https://github.com/google/A2UI) (~14K GitHub stars) from Google is the most ambitious entry. The agent sends pure JSON describing a component tree: cards, buttons, text fields, charts. No executable code. The client maintains a whitelisted catalog of trusted components and maps each JSON node to its native widget.

```json
{
  "type": "Card",
  "children": [
    {"type": "Heading", "content": "Weather in Vienna"},
    {"type": "Chart", "chartType": "line", "data": [18, 22, 19, 24]},
    {"type": "Text", "content": "Current: 22°C, sunny"}
  ]
}
```

Today, official renderers exist for Flutter, Angular, and Lit. React and SwiftUI are planned but not shipped yet. The architectural promise is one JSON description for every platform. The client controls all styling, animations, and state management. The agent controls only structure and data.

The security model is the standout. Agents can only request components from the client's approved catalog. [Schema validation](https://developers.googleblog.com/introducing-a2ui-an-open-project-for-agent-driven-interfaces/) runs on every message. If the agent sends something outside the whitelist, it gets rejected and the LLM self-corrects. This eliminates UI injection entirely. The other protocols don't address injection at the protocol level.

The progressive streaming works well: the agent starts with a skeleton, then fills data as it arrives. In multi-agent systems, an orchestrator can [inspect and modify UI payloads](https://www.griddynamics.com/blog/ai-agent-for-ui-a2ui) from sub-agents before rendering. That composability is unique to the declarative approach.

A2UI stays deliberately narrow. No transport spec, no auth spec, no styling rules. It describes UI intent and nothing else. It's also pre-1.0. The spec is still evolving and the ecosystem is thin.

**Use it** if you need cross-platform rendering from semi-trusted or untrusted agents. **Skip it** if you need production stability today.

---

## Kombai: The Odd One Out

[Kombai](https://www.kombai.com) does not belong in the same category as the other three, and that's worth saying upfront. It's not a streaming protocol. It's a commercial AI agent (VS Code extension + Figma plugin) that converts designs into frontend code across 400+ framework targets.

Where streamUI, AG-UI, and A2UI solve runtime agent-to-user communication, Kombai solves development-time code generation. Feed it a Figma file, an image, or a written prompt. It outputs component-based code for React, Next.js, Svelte, Flutter, Tailwind, MUI, or whatever your stack uses. That code goes through your normal review and deploy process. No runtime agent. No streaming protocol. The product is SOC 2 certified and does not train on customer data.

I'm including it because it represents a different position on the spectrum: the agent builds the UI at development time, not at runtime. That makes Kombai complementary rather than competitive. You could use Kombai to generate the component catalog that A2UI agents reference at runtime. Or use it to scaffold the React components that streamUI serves.

Kombai is closed source and proprietary (free tier at 300 credits/month, paid from $20/month). No GitHub repo for the core product.

**Use it** if you're converting Figma designs to production code. **Skip it** if you're looking for runtime agent-to-UI streaming. Different problem entirely.

---

## The Real Divide

The comparison table is useful but it hides the architectural question that actually matters.

Vercel's streamUI sends **code**. The agent produces React components. Maximum expressiveness, maximum trust required. This is the native app model applied to AI: the agent is the developer, shipping UI at runtime.

A2UI sends **data**. The agent describes what it wants, the client decides how to render. Maximum safety, constrained expressiveness. This is the web content model: the agent is an author, the client is the browser.

AG-UI sends **events**. It sends what the agent is doing, and the frontend decides what to show. This is the observability model: the agent does its work, the UI is a monitoring dashboard.

Each model is correct for its trust boundary. First-party agents on your own infrastructure? Stream code. Third-party agents from external services? Require declarative data. Complex multi-agent orchestration where humans need to intervene? Stream events.

Here's the thing most comparisons miss: AG-UI and A2UI are designed to be complementary. AG-UI defines *how* the agent and frontend communicate (the transport). A2UI defines *what* UI to render (the content). You could run A2UI payloads over AG-UI events. CopilotKit already hosts a [Generative UI Playground](https://github.com/CopilotKit/generative-ui) showing AG-UI, A2UI, and MCP Apps working together. The real architecture might not be "pick one" but "layer them."

The mistake is picking a protocol based on feature count or GitHub stars. Pick based on who controls the agent and who bears the risk of a bad render.

## What I Left Out

* **MCP's relationship to these protocols.** MCP connects agents to tools. These protocols connect agents to users. They're complementary layers. But the overlap in AG-UI's "tool call" events and streamUI's "tool-generated UI" pattern deserves its own post.

* **Performance benchmarks.** None of these protocols publish latency comparisons for first-paint time, progressive rendering speed, or event throughput under load. If you run benchmarks, I want the numbers.

* **Anthropic's approach.** Claude's artifacts and streaming tool use represent a fifth model where the platform handles rendering. Worth comparing but architecturally distinct from open protocols.

* **The iframe question.** Chainlit, Gradio, and similar frameworks solve agent UI by embedding iframes. It works for isolation. None of the four protocols here address that pattern, and the reasons are interesting.

---

Read the specs and decide by trust boundary, not hype. If you control both sides, [streamUI](https://sdk.vercel.ai/docs) gives you the most with the least effort. If you don't control the agent, [A2UI](https://a2ui.org)'s whitelist model is the only one that addresses injection at the protocol level. If you need visibility into multi-agent workflows, [AG-UI](https://github.com/ag-ui-protocol/ag-ui) is the only protocol that makes the thinking visible.

---

*Christian Pojoni evaluates agent interface protocols. More at [vasudev.xyz](https://vasudev.xyz).*

*The cover image for this post was generated by AI.*

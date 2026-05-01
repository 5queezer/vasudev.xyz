---
title: "Streaming UI from AI Agents: 5 Tools Ranked"
date: 2026-04-12
lastmod: 2026-05-01
tags: ["ai", "agents", "frontend", "architecture"]
agentQuestions:
  - "Which streaming UI tool wins and why?"
  - "How do AG-UI and Vercel AI SDK differ?"
  - "What architecture matters for agent UI?"
description: "AG-UI, A2UI, Vercel AI SDK, TanStack AI, and Kombai take different bets on how agents should build interfaces. The architectural question decides which wins."
images: ["/images/frontend-ai-agents-streaming-ui-og.png"]
author: "Christian Pojoni"
---





Every AI agent today talks through a chat window. User asks a question, agent streams tokens back, maybe with a code block. The entire frontend is a glorified terminal emulator.

Five tools bet that agents should stream real interfaces instead of text. They disagree on how, and two of them disagree only on the details.

**The protocols split on one question: should the agent send executable code, structured data, or interaction events?**

Your answer determines your security model, your framework coupling, and whether your agent can build UI for anything besides a browser tab.

## The Comparison

| | Vercel AI SDK | TanStack AI | AG-UI | A2UI | Kombai |
|---|---|---|---|---|---|
| **What ships** | Tool output (RSC paused) | Tool output (client render) | Interaction events | Declarative JSON UI trees | Generated source code |
| **Transport** | SSE, RSC streaming | SSE, HTTP streaming, async iterables, RPC | SSE, bi-directional events | Progressive JSON streaming | HTTP (batch) |
| **Framework lock** | Next.js leaning, React first | Framework-agnostic core (React, Solid, Preact) | Any (protocol-level) | Any (protocol-level) | Outputs React, Vue, HTML |
| **Security model** | Trusted execution | sandboxed code (Node, Workers, QuickJS) | Event schema validation | Whitelisted component catalog | Static output, no runtime risk |
| **Cross-platform** | Web only | Web | Web | Flutter, Angular, Lit (React planned) | Web |
| **MCP support** | Native (AI SDK 6) | Not yet | Indirect via tool-call events | N/A | N/A |
| **GitHub** | [Vercel/ai](https://github.com/vercel/ai) (~23K stars) | [TanStack/ai](https://github.com/tanstack/ai) (~2.6K, alpha) | [ag-ui-protocol/ag-ui](https://github.com/ag-ui-protocol/ag-ui) (~13K stars) | [google/A2UI](https://github.com/google/A2UI) (~14K stars) | Closed source |
| **License** | Apache 2.0 | MIT | MIT | Apache 2.0 | Proprietary |
| **Pick when** | You ship on Vercel and want the AI Gateway | You want portability and per-model type narrowing | You need agent observability and human-in-the-loop | You need cross-platform from untrusted agents | You're converting Figma designs to code |

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

You're also leaning hard on React and Next.js. Your agent sends executable component trees in the RSC path, which means full trust between agent and frontend. Fine for first-party agents. Dangerous the moment you accept tool output from third parties. There is no sandboxing layer in the SDK.

What the SDK has gained since the streamUI pause is the rest of a platform. AI SDK 6 ships native [MCP support](https://sdk.vercel.ai/docs), durable agent abstractions like `ToolLoopAgent` and `DurableAgent`, and optional integration with the [AI Gateway](https://vercel.com/kb/guide/vercel-ai-sdk-vs-tanstack-ai) (one endpoint for 20+ providers, automatic failover, zero markup for teams on Vercel). The SDK is now less about generative UI and more about the agent runtime around it.

**Use it** if you ship on Vercel and want the gateway, MCP, and durable agents in one box. **Skip it** if you need cross-platform output, or if Next.js coupling is friction you cannot pay.

---

## TanStack AI: Same Bet, Different Priors

[TanStack AI](https://github.com/tanstack/ai) (~2.6K stars, alpha as of January 2026) is the same architectural bet as the modern Vercel SDK. Tools run on the server, the model calls them, the client renders the result. The split is everything that wraps that loop.

The core is framework-agnostic. A single headless `ChatClient` ships adapters for React, Solid, and Preact. Vue and Svelte are planned. There is no RSC story and the team [explicitly rejected](https://tanstack.com/ai/latest/docs/comparison/vercel-ai-sdk) that path. That puts TanStack AI roughly where the Vercel SDK has landed after pausing streamUI, just without the Next.js gravity.

```ts
const weather = defineTool({
  schema: z.object({ city: z.string() }),
  server: async ({ city }) => getWeather(city),
  client: ({ result }) => <WeatherCard data={result} />,
})
```

Three things stand out from the spec.

First, isomorphic tool definitions. One schema validates on both sides and the `server` and `client` halves share it. The Vercel SDK splits the same tool across two files and asks you to keep them in sync. The [LogRocket benchmark](https://blog.logrocket.com/tanstack-vs-vercel-ai-library-react/) clocks ten tools at roughly 600 lines on Vercel against 300 on TanStack AI. Most of the savings is duplication that no longer exists.

Second, per-model type narrowing. Picking a specific model (not just a provider) actually changes the inferred options and response types. Vercel narrows by provider. If your code branches on model capabilities, the difference is visible in the type checker.

Third, sandboxed code execution drivers. TanStack ships isolate runtimes for Node, Cloudflare Workers, and QuickJS so model-generated code runs in a confined VM. Vercel does not provide this at the SDK layer. The trust calculus shifts. You can accept code from less-trusted models without rolling your own sandbox.

What you give up: MCP and the platform. TanStack AI has no MCP integration today and no AI Gateway equivalent. If you are deploying through Vercel, the gateway alone is reason to stay. If you are not, the gateway is dead weight and the lock is the cost.

The other catch is maturity. Alpha software, breaking changes between minor versions, ~2.6K stars against Vercel's ~23K. Adopt accordingly.

**Use it** if you want a portable, type-strict SDK that does not assume Next.js, and you can wait out the alpha. **Skip it** if you need MCP, durable agent abstractions, or the AI Gateway today.

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

Vercel's streamUI sent **code**. The agent produced React components, the server streamed them. Maximum expressiveness, maximum trust required. Vercel paused that path in October 2024.

What replaced it, in both AI SDK 6 and TanStack AI, is streaming **tool output**. The agent calls a typed tool, the result returns to the client, the client renders. The agent never produces UI directly. Same trust assumption, narrower surface. The split inside this camp is portability versus platform. TanStack rejects framework lock and adds sandboxed code execution. Vercel keeps MCP, durable agents, and the gateway.

A2UI sends **data**. The agent describes what it wants, the client decides how to render. Maximum safety, constrained expressiveness. This is the web content model: the agent is an author, the client is the browser.

AG-UI sends **events**. It sends what the agent is doing, and the frontend decides what to show. This is the observability model: the agent does its work, the UI is a monitoring dashboard.

Each model is correct for its trust boundary. First-party agents on your own infrastructure? Stream tool output through whichever SDK matches your platform. Third-party agents from external services? Require declarative data. Complex multi-agent orchestration where humans need to intervene? Stream events.

Here's the thing most comparisons miss: AG-UI and A2UI are designed to be complementary. AG-UI defines *how* the agent and frontend communicate (the transport). A2UI defines *what* UI to render (the content). You could run A2UI payloads over AG-UI events. CopilotKit already hosts a [Generative UI Playground](https://github.com/CopilotKit/generative-ui) showing AG-UI, A2UI, and MCP Apps working together. The real architecture might not be "pick one" but "layer them."

The mistake is picking a protocol based on feature count or GitHub stars. Pick based on who controls the agent and who bears the risk of a bad render.

## What I Left Out

* **MCP's relationship to these protocols.** MCP connects agents to tools. These protocols connect agents to users. They're complementary layers. But the overlap in AG-UI's "tool call" events and streamUI's "tool-generated UI" pattern deserves its own post.

* **Performance benchmarks.** None of these protocols publish latency comparisons for first-paint time, progressive rendering speed, or event throughput under load. If you run benchmarks, I want the numbers.

* **Anthropic's approach.** Claude's artifacts and streaming tool use represent a fifth model where the platform handles rendering. Worth comparing but architecturally distinct from open protocols.

* **The iframe question.** Chainlit, Gradio, and similar frameworks solve agent UI by embedding iframes. It works for isolation. None of the four protocols here address that pattern, and the reasons are interesting.

---

Read the specs and decide by trust boundary, not hype. If you ship on Vercel and want MCP, the gateway, and durable agents in one box, the [Vercel SDK](https://sdk.vercel.ai/docs) is the path of least resistance. If you want the same architecture without Next.js gravity and with sandboxed execution, [TanStack AI](https://tanstack.com/ai) is the credible alternative once the alpha settles. If you don't control the agent, [A2UI](https://a2ui.org)'s whitelist model is the only one that addresses injection at the protocol level. If you need visibility into multi-agent workflows, [AG-UI](https://github.com/ag-ui-protocol/ag-ui) is the only protocol that makes the thinking visible.

---

*Christian Pojoni evaluates agent interface protocols. More at [vasudev.xyz](https://vasudev.xyz).*

*The cover image for this post was generated by AI.*

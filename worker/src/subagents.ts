export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type SubagentAction = "direct" | "subagents";

export type SubagentWorkerBrief = {
  name: "context_reader" | "technical_reviewer" | "synthesis_planner";
  objective: string;
  focus: string;
  expectedOutput: string;
};

export type SubagentPlan = {
  action: SubagentAction;
  reason: string;
  score: number;
  workers: SubagentWorkerBrief[];
};

export type PlanContext = {
  mode?: string;
  postContentLength?: number;
};

export type WorkerPromptInput = {
  originalPrompt: string;
  messages: ChatMessage[];
  postContent?: string;
  mode?: string;
  lang?: string;
};

export type SubagentWorkerResult = {
  name: string;
  status: "completed" | "failed";
  output: string;
  error?: string;
  latencyMs?: number;
};

const COMPLEXITY_TERMS = [
  "analyze",
  "analyse",
  "compare",
  "architecture",
  "tradeoff",
  "tradeoffs",
  "risk",
  "risks",
  "review",
  "debug",
  "optimize",
  "optimise",
  "implementation",
  "technical",
  "strategy",
  "synthesize",
  "synthesise",
  "across",
  "multi",
  "deep",
];

const SIMPLE_QUESTION = /^(what|who|when|where|why|how|can you summarize|summarize|explain)\b/i;

export function planSubagents(prompt: string, context: PlanContext = {}): SubagentPlan {
  const text = normalize(prompt);
  const termScore = COMPLEXITY_TERMS.filter((term) => hasTerm(text, term)).length;
  const lengthScore = text.length > 180 ? 1 : 0;
  const broadContextScore = context.mode === "index" && (hasTerm(text, "blog") || hasTerm(text, "across")) ? 1 : 0;
  const score = termScore + lengthScore + broadContextScore;

  if (score < 2 && SIMPLE_QUESTION.test(prompt.trim())) {
    return {
      action: "direct",
      reason: "Simple low-risk question; answer directly without subagent latency.",
      score,
      workers: [],
    };
  }

  if (score < 3) {
    return {
      action: "direct",
      reason: "Prompt does not need multi-perspective analysis.",
      score,
      workers: [],
    };
  }

  return {
    action: "subagents",
    reason: "Prompt benefits from parallel context reading, technical review, and answer planning.",
    score,
    workers: createDefaultWorkers(),
  };
}

export function buildWorkerMessages(worker: SubagentWorkerBrief, input: WorkerPromptInput): ChatMessage[] {
  const postContent = trimForPrompt(input.postContent ?? "", 12000);
  const recentMessages = input.messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .slice(-8)
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n");

  return [
    {
      role: "system",
      content: [
        "You are a bounded specialist subagent for vasudev.xyz chat.",
        "Complete only your assigned brief. Do not address the user directly.",
        "Return concise findings with evidence, caveats, and uncertainty.",
        "Do not invent biographical facts.",
      ].join(" "),
    },
    {
      role: "user",
      content: [
        `Worker name: ${worker.name}`,
        `Objective: ${worker.objective}`,
        `Focus: ${worker.focus}`,
        `Expected output: ${worker.expectedOutput}`,
        `Original prompt: ${input.originalPrompt}`,
        `Mode: ${input.mode ?? "unknown"}`,
        `Language: ${input.lang ?? "unknown"}`,
        recentMessages ? `Recent conversation:\n${recentMessages}` : "Recent conversation: none",
        postContent ? `Available page or post content:\n${postContent}` : "Available page or post content: none",
      ].join("\n\n"),
    },
  ];
}

export function buildSynthesisMessages(input: {
  originalMessages: ChatMessage[];
  plan: SubagentPlan;
  workerResults: SubagentWorkerResult[];
}): ChatMessage[] {
  const workerSummary = input.workerResults.map((result) => {
    if (result.status === "failed") return `${result.name} failed: ${result.error ?? "unknown error"}`;
    return `${result.name} completed:\n${result.output}`;
  }).join("\n\n");

  return [
    {
      role: "system",
      content: [
        "You are the on-site agent for vasudev.xyz.",
        "Synthesize specialist findings into one concise, helpful answer.",
        "Use the findings as evidence, but do not mention internal subagent mechanics unless useful.",
        "Call out uncertainty and failed checks when they affect confidence.",
      ].join(" "),
    },
    ...input.originalMessages.filter((message) => message.role === "user" || message.role === "assistant").slice(-12),
    {
      role: "user",
      content: [
        `Routing reason: ${input.plan.reason}`,
        "Specialist findings:",
        workerSummary || "No specialist findings were available.",
        "Now answer the user's latest request directly.",
      ].join("\n\n"),
    },
  ];
}

function createDefaultWorkers(): SubagentWorkerBrief[] {
  return [
    {
      name: "context_reader",
      objective: "Ground the answer in the current post, page, or blog context.",
      focus: "Relevant claims, examples, definitions, and constraints from supplied content.",
      expectedOutput: "A short evidence list with exact context and uncertainty.",
    },
    {
      name: "technical_reviewer",
      objective: "Review technical claims, risks, tradeoffs, and edge cases.",
      focus: "Architecture, implementation realism, privacy, performance, and verification burden.",
      expectedOutput: "Concise technical caveats and validation points.",
    },
    {
      name: "synthesis_planner",
      objective: "Plan the clearest final answer for the user intent.",
      focus: "Answer structure, omitted context, likely follow-up needs, and safe wording.",
      expectedOutput: "A compact answer outline with confidence notes.",
    },
  ];
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function hasTerm(text: string, term: string) {
  return new RegExp(`\\b${escapeRegExp(term).replace(/\\s+/g, "\\s+")}\\b`).test(text);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function trimForPrompt(value: string, maxChars: number) {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars)}\n\n[Content truncated for subagent context]`;
}

---
title: "Why AI Agents Need a Settlement Layer, and Why It Might Be NEAR"
date: 2026-03-25
description: "A2A gives agents a way to talk. It doesn't give them a way to pay. NEAR is positioning itself as the financial backend for autonomous agents. Here's what works, what doesn't, and what's missing."
author: "Christian Pojoni"
tags: ["near", "a2a", "blockchain", "agents", "escrow"]
draft: true
---

A2A gives agents a way to talk. It doesn't give them a way to pay.

After shipping A2A protocol support in Rust, one thing became obvious: the protocol handles discovery, task delegation, and lifecycle management. It does not handle payment. Agent A delegates a task to Agent B. Agent B completes it. Now what? Who pays whom, how, and what happens if Agent A disagrees with the result?

A2A is HTTP for agents. It needs a settlement layer the same way HTTP needed payment rails. NEAR Protocol is making the most aggressive bet that it will be that layer. Here's what I found when I looked under the hood.

## The thesis: AI agents are the next users of blockchain

NEAR co-founder Illia Polosukhin argues that blockchain's future isn't consumer wallets or DeFi dashboards. It's autonomous agents transacting on behalf of humans. The human interacts with the AI. The AI interacts with the blockchain. The blockchain handles identity, settlement, and trust.

This reframes the adoption problem. Crypto never had its "AI moment" because end users don't want to manage seed phrases and gas fees. But agents don't care about UX. An agent can sign transactions, manage keys, and pay gas fees without complaining about the experience. Blockchain becomes invisible infrastructure, not a product.

The question isn't whether agents will transact on-chain. The question is which chain.

## NEAR's stack for agents, piece by piece

NEAR has shipped five components that matter for agent infrastructure. Each solves a real problem, but they're at very different maturity levels.

### NEAR Intents

The cross-chain execution layer. You state what you want ("swap 100 USDC for ETH"), and solvers compete to fulfill it. Over $7 billion in cumulative volume across 35+ chains. This is the most production-ready piece.

For agents, Intents abstracts away chain fragmentation. An agent doesn't need to know which DEX has the best price on which chain. It declares an intent, and the solver network handles routing. That's a meaningful simplification for any agent that needs to move value.

### Chain Abstraction (near.com)

A consumer wallet that hides blockchain complexity behind email login and FaceID. Cross-chain swaps, portfolio management, and peer-to-peer settlement in one interface.

For agents, this matters less directly. But it establishes the identity layer. A human user has a crystal.near account. Their agents operate on that account with delegated permissions. The account model (human-readable names, multi-key access control) is better suited for agent delegation than Ethereum's raw address model.

### Confidential Intents

Restricted-visibility transactions built into the Intents layer. Balances, transfers, and trading activity stay private. Execution remains verifiable on-chain, but details are only visible to authorized parties.

This solves a real problem: if Agent A pays Agent B for a code review, that transaction is on a public ledger. A competitor can see what Agent A is paying for services, how often, and how much. Confidential Intents make the payment private while keeping the settlement verifiable. For institutional use, this is non-negotiable.

### IronClaw

An open-source agent runtime built in Rust, deployed in encrypted TEE (Trusted Execution Environment) enclaves on NEAR AI Cloud. Credentials are injected at runtime and never exposed to tools. Third-party tools run in sandboxed WebAssembly containers. All tool activity is audit-logged.

This is where it gets interesting for the A2A story. IronClaw could host A2A server agents. The A2A protocol handles communication (discovery, messaging, task lifecycle). IronClaw handles execution security (credential isolation, prompt injection protection, sandbox enforcement). The two are complementary: A2A is the network layer, IronClaw is the runtime layer.

### Nightshade 3.0

The sharding upgrade that separates consensus from execution and adds a private shard. NEAR claims 1M+ TPS with sub-second finality.

For agents performing high-frequency micro-transactions (pay-per-task, pay-per-inference), throughput and gas costs matter. NEAR's gas fees are fractions of a cent. Ethereum L1 is orders of magnitude more expensive. Solana is fast but has had reliability issues under load. NEAR's sharding approach scales horizontally -- more shards, more capacity -- without the single-shard bottleneck.

## Where A2A meets NEAR: three integration patterns

None of these exist today. They're architectural patterns that become possible when you combine the two.

### Pattern 1: Prepaid Escrow per Task

The simplest model. Client agent creates a task via A2A `message/send`. The task ID maps to a NEAR smart contract that holds escrowed funds. On task completion (A2A status = "completed"), the contract releases payment to the server agent's NEAR account.

```rust
// NEAR smart contract (near-sdk-rs)
#[near]
impl TaskEscrow {
    #[payable]
    pub fn create_task(&mut self, task_id: String) {
        let deposit = env::attached_deposit();
        assert!(deposit > 0, "Must attach payment");
        self.tasks.insert(&task_id, &TaskRecord {
            client: env::predecessor_account_id(),
            amount: deposit,
            status: TaskStatus::Pending,
        });
    }

    pub fn complete_task(&mut self, task_id: String) {
        let task = self.tasks.get(&task_id).expect("Task not found");
        assert_eq!(
            env::predecessor_account_id(),
            self.oracle,
            "Only oracle can complete"
        );
        Promise::new(self.agent_account.clone()).transfer(task.amount);
        self.tasks.remove(&task_id);
    }
}
```

The oracle is the bridge between A2A and NEAR. It watches A2A task status and calls `complete_task` when the task finishes. In v1, this is a simple off-chain service. In v2, it could be a NEAR contract that verifies A2A task signatures.

Works well for: deterministic tasks (file conversion, API aggregation, data extraction). Tasks where completion is binary and objectively verifiable.

### Pattern 2: Reputation-Gated Settlement

On-chain reputation per agent, based on task completion rate and client ratings. Agents with high reputation get faster settlement (shorter escrow lock period). New agents wait longer.

This solves the cold-start problem without a human arbiter. An agent that has completed 1,000 tasks with 99% satisfaction gets paid immediately. A new agent waits 24 hours for the client to dispute.

The reputation data lives on-chain (immutable, verifiable). The A2A Agent Card could reference the on-chain reputation score, so client agents can factor it into their delegation decisions before sending a task.

### Pattern 3: Kleros Escalation for Disputes

Optimistic resolution as the default: tasks auto-complete after a challenge period. If the client disputes, the case escalates to Kleros, a decentralized arbitration protocol on Ethereum/Gnosis with game-theoretic juror selection.

Kleros already has an MCP server for AI agent integration. Connecting A2A task disputes to Kleros would create a full stack: A2A for communication, NEAR for settlement, Kleros for arbitration. Three protocols, three layers, no central authority.

The gap: Kleros is too slow and expensive for micro-tasks (juror staking, voting rounds, appeal periods). It only makes sense for high-value tasks where the dispute amount justifies the arbitration cost. For micro-tasks, optimistic resolution with reputation penalties is more practical.

## What's missing (the honest part)

### No native payment primitive in A2A

A2A has no concept of payment. The spec covers discovery, messaging, task management, and streaming. There is no "pay" method, no invoice format, no settlement callback. Any payment integration is custom plumbing on top.

This is by design -- A2A is a communication protocol, not a financial protocol. But it means every agent marketplace will build its own payment layer, creating fragmentation. A standardized payment extension for A2A (even just a "payment_info" field in the Agent Card) would accelerate adoption.

### No agent identity standard linking A2A to NEAR

An A2A Agent Card has a name, description, capabilities, and endpoint URL. A NEAR account has a human-readable name and key pairs. There's no standard way to say "this A2A agent is controlled by this NEAR account." Verifiable linking of off-chain agent identity to on-chain payment identity is unsolved.

### NEAR's agent ecosystem is marketing-heavy, code-light

NEAR talks about "the agentic economy" and "AI agents as primary blockchain users." The infrastructure pieces (Intents, IronClaw, Confidential Intents) are real. But the actual agent-to-blockchain integration is thin. There's no SDK for "build an A2A agent that settles on NEAR." There's no reference implementation of an escrow contract for agent tasks. The pieces exist separately, but nobody has wired them together.

### The market doesn't exist yet

Agent-to-agent payment volume is effectively zero today. Building settlement infrastructure for a market that doesn't exist is a timing bet. NEAR could be two years early. Or it could be exactly on time if the agent economy materializes in 2027 as the agentic AI hype suggests.

## The smallest test

If you want to validate whether A2A + NEAR settlement works, here's the cheapest experiment:

1. Deploy two A2A agents (one client, one server). The ZeroClaw A2A implementation works, or use the Python A2A SDK.
2. Write a NEAR escrow contract with three methods: `create_task`, `complete_task`, `cancel_task`. The `near-sdk-rs` examples have everything you need.
3. Build a thin oracle service that watches A2A task status and calls the NEAR contract on completion.
4. Run a task. Verify the funds move.

Total cost: an afternoon of development, a few cents in NEAR gas fees. You'll learn more about both protocols from wiring them together than from reading whitepapers.

## Where this goes

A2A is the HTTP layer. MCP is the USB layer. NEAR could be the Visa layer. But Visa wasn't built by a blockchain foundation -- it was built by banks that had existing transaction volume. The agent settlement layer will be built by whoever has the agents first, not whoever has the best blockchain.

NEAR's bet is that by providing the runtime (IronClaw), the identity layer (near accounts), and the settlement layer (Intents), agents will naturally gravitate to the stack. That's a coherent strategy. The execution risk is that agents don't need a dedicated settlement chain -- they could just use Stripe, or Lightning, or stablecoins on any L2.

The interesting question isn't "will agents pay each other?" -- they will. The question is whether that payment will flow through a blockchain at all, or through existing payment rails with better developer experience and regulatory clarity.

---

*Previous post: [Shipping A2A Protocol Support in Rust: 7 Gotchas Nobody Warns You About](/blog/shipping-a2a-protocol-support-rust-gotchas/)*

*I write about systems, security, and the intersection of AI agents with real infrastructure at [vasudev.xyz](/).*

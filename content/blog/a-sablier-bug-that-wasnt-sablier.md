---
title: "A Sablier Bug That Wasn't Sablier: 4 Gotchas from Tracing a Traefik Plugin Failure"
date: 2026-04-19
description: "Tracing a sporadic 'invalid middleware' error in Sablier to a hidden startup dependency introduced by a Traefik 3.5.3 refactor."
images: ["/images/a-sablier-bug-that-wasnt-sablier-og.png"]
author: "Christian Pojoni"
tags: ["architecture", "traefik"]
series: ["Field Notes"]
---


[Sablier](https://github.com/sablierapp/sablier) gives you Cloud-Run-style scale-to-zero for self-hosted Docker containers. Requests hit a reverse-proxy middleware, the middleware wakes the target container on demand, and the container shuts down again after an idle timeout. I spent an afternoon tracing a sporadic `invalid middleware` error that Sablier users have been reporting for months. The bug was not in Sablier. The work produced three public artifacts: a [deterministic reproduction repo](https://github.com/5queezer/sablier-traefik-repro), an upstream [issue](https://github.com/traefik/traefik/issues/13005), and a [fix PR](https://github.com/traefik/traefik/pull/13006). Here are four things worth knowing before you debug your next `invalid middleware` error.

**A refactor shipped in a Traefik point release quietly made every plugin startup depend on `plugins.traefik.io` being reachable, and no single middleware owner was positioned to notice.**

## 1. The bug lived in the refactor, not the feature

The symptom landed in Sablier's tracker as `invalid middleware "whoami-sablier@file" configuration: invalid middleware type or middleware does not exist`. Sablier ships a Traefik plugin, so naturally that is where users file. It was not Sablier's bug.

Traefik v3.5.3 merged [PR #12035, which refactored the plugin system](https://github.com/traefik/traefik/pull/12035). The refactor split a monolithic client into a `Manager`, a `Downloader`, and new hash-verification plumbing. What the release notes did not flag is that this shape couples *every* plugin startup to `plugins.traefik.io` reachability. The `Manager.InstallPlugin` path unconditionally calls `Downloader.Download`, then `Downloader.Check`. Either call hits the registry. Either failure aborts install.

The affected code block on v3.5.3 is short enough to reproduce in full:

```go
func (m *Manager) InstallPlugin(ctx context.Context, plugin Descriptor) error {
    hash, err := m.downloader.Download(ctx, plugin.ModuleName, plugin.Version)
    if err != nil {
        return fmt.Errorf("unable to download plugin %s: %w", plugin.ModuleName, err)
    }
    if plugin.Hash != "" {
        if plugin.Hash != hash { /* ... */ }
    } else {
        err = m.downloader.Check(ctx, plugin.ModuleName, plugin.Version, hash)
        if err != nil {
            return fmt.Errorf("unable to check archive integrity of the plugin %s: %w", plugin.ModuleName, err)
        }
    }
    return m.unzip(plugin.ModuleName, plugin.Version)
}
```

**The Sablier issue title pointed at the symptom. The Traefik PR description described the change. Neither mentioned the coupling.** The only way to see the full picture was to read the Traefik diff while holding the Sablier symptom in your head.

## 2. "Sporadic" is almost always a hidden dependency

The first reproduction attempt was an obvious one. Restart Traefik in a tight loop, hit the endpoint, grep the logs for the error, report how many restarts until it appears. I ran fifty iterations on a home network. Zero triggers.

That is diagnostic. When you cannot force a bug via timing or restart cadence, the variable is not timing. It is the reachability of some external dependency you did not know was in the path.

The deterministic reproduction is a one-line Docker override:

```yaml
# docker-compose.netblock.yml
services:
  traefik:
    extra_hosts:
      - "plugins.traefik.io:127.0.0.1"
```

This maps the registry to localhost inside the container, so the install call gets `connection refused`. Trigger rate jumps from zero in fifty to one hundred percent on every start. The same technique works for any "sporadic after restart" bug where you suspect a hidden network call. Block the suspected dependency, watch what breaks.

**When you cannot reproduce via timing, stop varying timing. Start varying what the process can reach.**

## 3. `ResetAll()` is a surprisingly big hammer

The cascade is worth stepping through. One plugin's install failure returns an error up to `SetupRemotePlugins`, which calls `manager.ResetAll()`. That method wipes the entire archives directory, not just the offending plugin's archive. Then every middleware in the operator's configuration that references *any* plugin logs its own `invalid middleware type or middleware does not exist` error, because the plugin source directory has been removed out from under it.

So a single transient network blip against one configured plugin disables every plugin-backed middleware in the deployment. A Sablier user sees a Sablier error. The Sablier maintainer sees a locked-down upstream issue. The Traefik maintainer sees a refactor that passed review.

This is a pattern. An error handler that widens its blast radius beyond the component that failed will produce error reports that look unrelated to the underlying cause. **The blast radius of an error handler matters more than the error it catches.** When a retry, a reset, or a fallback spans multiple subsystems, someone downstream will report the wrong bug.

The fix in [PR #13006](https://github.com/traefik/traefik/pull/13006) narrows the blast radius. When `Download` fails against the registry and a previously-downloaded archive for the same plugin and version is on disk, the install falls back to that cached archive instead of wiping the plugin environment. An `integrity check` failure is tolerated *only* in that fallback path, because the cached archive was validated on the prior successful install. A `Check` failure after a *successful* `Download` stays fatal, so freshly-downloaded content still has to pass integrity. Hash pinning via `plugin.Hash` is always enforced. One file, four test cases.

## 4. A locked issue is not a dead issue

The same root cause had been filed as [#12137](https://github.com/traefik/traefik/issues/12137) months earlier. That issue was auto-closed as `frozen-due-to-age` and the repository's stale-issue lock prevents new comments. By the time the Sablier thread had accumulated enough reports to look like a pattern, the relevant Traefik issue was unreachable.

Filing a fresh issue with a deterministic reproduction, a concrete root-cause pointer to the introducing PR, and a menu of fix options lands on a different surface of maintainer attention than a polled-but-locked thread. It creates a new triage signal. It gives reviewers something to attach a PR to. And it gives future users an open thread to search for.

If you are running into a locked issue that is still live in the wild, file a fresh one. Link the old one in the first paragraph so history is not lost. Attach a repro repo, not just a stack trace. The cost of a new issue is a few minutes. The cost of users hitting the same wall six months later is hours, multiplied by the number of users.

## What I left out

Three things I intentionally deferred and listed explicitly in the upstream PR description.

A second reproduction variant for the cached-plugin case. Production users hit this bug on restart with the plugin archive already on disk, which is a slightly different code path than first-start. The first-start repro was enough to prove the mechanism and drive the fix design. Rerunning with a pre-populated volume would add confidence but not change the outcome.

Two alternative fix shapes. An `experimental.plugins.offline: true` config flag (operator opt-in, zero behaviour change for everyone else) and an async post-startup `Check()` (decouples startup entirely but adds concurrency to a formerly straightforward path). Both are in the upstream issue as options. If maintainers prefer either over the in-PR approach, the shape is a day of work and a new PR.

A Traefik integration test that exercises `extra_hosts`-style network isolation end-to-end. The three unit tests in the PR exercise the new branches directly via a mock downloader. An end-to-end test would be strictly better. It was also a tangent I chose not to expand the PR with. If a maintainer asks for it, it is easy to add.

## Deployed in production

The patched Traefik is running on my own Coolify-on-Hetzner box at the time of writing. Before the switch the box was pinned at 7.2 GiB of 7.5 GiB resident memory with 4 GiB of swap in use, dominated by idle MCP servers and low-traffic Coolify applications that collectively served perhaps a dozen requests per day. The cached-archive fallback is what let me wire Sablier onto them at all. Every restart of the patched Traefik since has reloaded the Sablier plugin from the local archive without a registry round-trip, which is the second reproduction variant I deferred in the PR description.

Eight MCP servers and four Coolify applications now sit behind Sablier with a ten-minute idle window. The box has recovered 3.1 GiB of resident memory and 2 GiB of swap. Wake-up latency on the blocking strategy runs 300 ms to 10 seconds depending on container cold-start, which is acceptable for workloads that see sparse traffic. I want more restart cycles and a real registry flake on the timeline before claiming the property holds broadly, but the shape of the deployment matches the scenario the fix targets.

One Traefik-specific gotcha surfaced during the rollout. The docker provider drops a router the moment its backing container stops, so the Sablier middleware never fires on the next request and the caller sees a 503 instead of the wake-up path. The fix is a file-provider router at higher priority than the docker-label one, pointing at the container by docker DNS name, with the Sablier middleware attached. That router persists regardless of container state. Coolify makes this slightly harder because every redeploy creates a container with a new UUID-suffixed name, so the file-provider router URL has to be regenerated. The small sync tool that keeps that config aligned with the current container names lives as a [gist](https://gist.github.com/5queezer/f838aaa5e0690da5df04ce44f8f67266) if anyone wants to copy the shape.

## Postscript: what broke in production

The ten-minute idle window held for the eight compose-managed MCP servers. The four Coolify-managed applications did not survive it. Within a day of enabling the labels, Coolify's reconcile loop had marked every one of them `exited:unhealthy` and eventually removed the container entirely. Sablier lost its group reference on the next docker-socket refresh and the next request got a 404 from the Sablier daemon instead of the wake path.

The mechanism is obvious in hindsight. Sablier hibernates by calling `docker stop`. Coolify's health loop sees a container in `exited` state where it expects `running`, decides the application crashed, and eventually garbage-collects. Compose-managed stacks do not have this problem because `docker compose` with `restart: unless-stopped` leaves a stopped container in `docker ps -a` indefinitely and Sablier's docker provider keeps tracking it. Wake-up works.

**If something else in your stack also reconciles container state, Sablier and that thing will fight. The loser of that fight is whichever one the orchestrator garbage-collects first.** The MCP stack is now hibernating as advertised. The Coolify applications are back to always-on. A Sablier provider that translated wake events into Coolify API `/deploy` calls would make it work because Coolify would own the lifecycle, but no one has built it, myself included.

## Tightened before the first review

My first draft of the fix tolerated any integrity-check failure whenever a cached archive existed at the start of `InstallPlugin`. On re-read I noticed that `Download` overwrites the archive on success, so "archive existed at start" did not prove the on-disk content was the previously-validated one. A post-download integrity mismatch would have slipped through as a warning, which is exactly the property the integrity check is supposed to enforce. The current version uses a `fallback` flag set only when `Download` itself failed. The test suite now asserts that a `Check` failure after a successful `Download` stays fatal. The commit history on the PR shows the progression. Build your own tolerance gates narrowly. Every `if` that lets a failure through is an invariant you have to defend in review.

## Try it yourself

The three artifacts are public. The [reproduction repo](https://github.com/5queezer/sablier-traefik-repro) takes thirty seconds to clone and run. The [upstream issue](https://github.com/traefik/traefik/issues/13005) and the [fix PR](https://github.com/traefik/traefik/pull/13006) are open at the time of writing. If you are running Traefik with any plugin, check whether `plugins.traefik.io` is reachable from your Traefik container on every start. If it is not consistently reachable, you are one network blip away from every plugin-backed middleware going invalid at once.

---

*Christian Pojoni builds infrastructure and debugs bugs that wake you at 3 AM. More at [vasudev.xyz](https://vasudev.xyz).*

*The cover image for this post was generated by AI.*

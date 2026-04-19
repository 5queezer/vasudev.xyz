# ADR-0002: GitHub Pages as the deployment target

- Status: Accepted
- Date: 2025-01-15

## Context

The site needs a hosting target that costs nothing, has no cold start, and
does not add an operational burden. The site is fully static (see ADR-0001).
The repo is on GitHub, so CI is already GitHub Actions.

## Decision

Deploy the built Hugo site to GitHub Pages via `.github/workflows/deploy.yml`
on every push to master. Custom domain vasudev.xyz points at the Pages site.

## Consequences

Zero hosting cost. No server to patch. TLS is handled by GitHub. Deploy
latency is tied to the GitHub Actions queue, which is occasionally slow but
acceptable for a blog. No request-time dynamic behavior is possible, which
constrains future features (search, comments, analytics) to client-side or
third-party solutions.

## Alternatives considered

### Alternative A: Netlify

Preview deploys per PR are attractive. Rejected because the free tier limits
and the extra vendor relationship were not worth the feature gain for a
single-author blog.

### Alternative B: Cloudflare Pages

Similar to Netlify with better edge performance. Rejected for the same
vendor-sprawl reason and because GitHub Pages is already integrated with the
code host.

### Alternative C: Self-hosted on a VPS

Maximum control. Rejected because the operational cost outweighs any benefit
for a static blog. TLS certs, patching, and monitoring are all work the
author does not want to do.

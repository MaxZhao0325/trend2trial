---
name: deploy
description: Deploy the static web site to GitHub Pages (or preview).
---

Deploy the trend2trial static site. Argument: $ARGUMENTS (e.g. "preview" or "production").

Prerequisites check — abort if any fail:

1. Ensure apps/web exists and has a build script.
2. Run pnpm lint && pnpm test && pnpm build to verify everything passes.
3. Confirm git working tree is clean (no uncommitted changes).

Deploy target:

- **preview**: Build the site and serve locally for inspection.
  - pnpm --filter web build
  - npx serve apps/web/dist
  - Print the local URL.

- **production**: Build and deploy to GitHub Pages.
  - pnpm --filter web build
  - Use gh-pages or gh CLI to push apps/web/dist to the gh-pages branch.
  - Command: npx gh-pages -d apps/web/dist
  - Print the live URL: https://{owner}.github.io/trend2trial/

After deploy, print a summary: version deployed, target, URL.
Do NOT deploy to production without explicit user confirmation.

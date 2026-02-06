---
name: release
description: Cut a new release — bump version, generate changelog, create GitHub release.
---

Release workflow for trend2trial. Argument format: $ARGUMENTS (e.g. "patch", "minor", "major", or explicit "v0.2.0").

Steps:

1. Read current version from package.json.
2. Determine next version based on $ARGUMENTS (default: patch).
3. Run all quality gates before proceeding:
   - pnpm lint
   - pnpm test
   - pnpm build
     If any gate fails, stop and report the error. Do NOT skip.
4. Generate CHANGELOG entry:
   - Collect commits since last tag: git log $(git describe --tags --abbrev=0 2>/dev/null || echo "")..HEAD --oneline
   - Group by type: feat / fix / docs / chore
   - Prepend to CHANGELOG.md
5. Bump version in root package.json and any packages/\*/package.json.
6. Commit: "release: v{version}"
7. Create git tag: v{version}
8. Print next manual step: git push --follow-tags && gh release create v{version} --generate-notes

Do NOT push or publish automatically — the user decides when to push.

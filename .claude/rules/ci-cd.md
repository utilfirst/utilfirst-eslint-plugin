# CI/CD

- Adopt a new action or dependency version a week after release rather than on publish day (most supply-chain advisories surface within days of release, so a week's delay catches them before the pin)
- Default `GITHUB_TOKEN` to `permissions: contents: read` at the workflow top level and widen per job only where needed (a publish job adds `id-token: write` for OIDC)
- Pin every third-party GitHub Actions `uses:` to a full-length commit SHA, with a trailing `# vX.Y.Z` comment for readability and Dependabot updates (a tag can be repointed at malicious code while a SHA cannot)
- Publish to npm through OIDC trusted publishing rather than a long-lived `NPM_TOKEN`, after `npm install -g npm@latest` when the runner's bundled version predates the requirement (trusted publishing needs npm 11.5.1 and Node 22.14.0 or newer)
- Resolve an action's pin from a live source before adopting it (`gh api repos/OWNER/REPO/releases/latest` for the current major, `gh api repos/OWNER/REPO/git/refs/tags/TAG --jq .object.sha` for the SHA the tag points at)
- Set `persist-credentials: false` on `actions/checkout` steps that never push (the default leaves the token in `.git/config` for every later step to read)

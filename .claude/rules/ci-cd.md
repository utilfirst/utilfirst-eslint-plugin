# CI/CD

- Adopt a new action or dependency version a week after release rather than on publish day, except for security-fix-only patch releases (a week's delay catches supply-chain advisories that surface within days of release before the pin lands)
- Default `GITHUB_TOKEN` to `permissions: contents: read` at the workflow top level and widen per job only where needed (a publish job adds `id-token: write` for OIDC)
- Pin every third-party GitHub Actions `uses:` to a full-length commit SHA, with a trailing `# vX.Y.Z` comment for readability and Dependabot updates (a tag can be repointed at malicious code while a SHA cannot)
- Publish to npm through OIDC trusted publishing rather than a long-lived `NPM_TOKEN` (trusted publishing needs npm 11.5.1+ and Node 22.14.0+, so `npm install -g npm@latest` in the workflow when the runner's bundled version is older)
- Set `persist-credentials: false` on `actions/checkout` steps that never push (the default leaves the token in `.git/config` for every later step to read)

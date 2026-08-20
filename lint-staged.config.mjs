// Per-file fixers run before the whole-project type-aware check.
/** @type {import("lint-staged").Configuration} */
export default {
  "*": "prettier --ignore-unknown --write",
  "*.{js,cjs,mjs,ts,tsx}": "oxlint --fix",
  "{*.json,*.js,*.mjs,*.ts}": () => "oxlint .",
};

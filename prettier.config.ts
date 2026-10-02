import type { Config } from "prettier";

const config: Config = {
  proseWrap: "never",
  quoteProps: "consistent",
  plugins: [
    "@utilfirst/prettier-plugin",
    "prettier-plugin-organize-imports",
    "prettier-plugin-packagejson",
    "prettier-plugin-sh",
    "prettier-plugin-sort-json",
  ],
};

export default config;

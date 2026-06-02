/** @type {import("prettier").Config} */
const config = {
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

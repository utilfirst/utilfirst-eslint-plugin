import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execPath } from "node:process";
import { pathToFileURL } from "node:url";

const ruleName = "utilfirst/no-unknown-type-aliases";
const fixtureSource = "type Payload = unknown;\n";

await mkdir(".tmp", { recursive: true });

const testDirectory = await mkdtemp(join(".tmp", "package-test-"));

const runtimeDirectory = await mkdtemp(
  join(tmpdir(), "utilfirst-package-test-"),
);

try {
  execFileSync("pnpm", ["pack", "--pack-destination", testDirectory]);

  const testDirectoryEntries = await readdir(testDirectory);

  const archiveNames = testDirectoryEntries.filter((name) =>
    name.endsWith(".tgz"),
  );

  if (archiveNames.length !== 1 || archiveNames[0] === undefined) {
    throw new Error("Package smoke test expected one tarball");
  }

  execFileSync("tar", ["-xzf", archiveNames[0]], {
    cwd: testDirectory,
  });

  const packageDirectory = resolve(testDirectory, "package");
  const entryPath = join(packageDirectory, "dist/index.js");
  const oxlintConfigPath = join(packageDirectory, "dist/oxlint.js");

  const entryUrl = pathToFileURL(entryPath).href;
  const oxlintConfigUrl = pathToFileURL(oxlintConfigPath).href;

  const eslintUrl = import.meta.resolve("eslint");
  const typescriptEslintUrl = import.meta.resolve("typescript-eslint");

  const eslintConsumer = `import { Linter } from ${JSON.stringify(eslintUrl)};
import tseslint from ${JSON.stringify(typescriptEslintUrl)};
import plugin from ${JSON.stringify(entryUrl)};
import { oxlintBaseConfig } from ${JSON.stringify(oxlintConfigUrl)};
const ruleName = ${JSON.stringify(ruleName)};
const messages = new Linter().verify(${JSON.stringify(fixtureSource)}, [{
  languageOptions: { parser: tseslint.parser },
  plugins: { utilfirst: plugin },
  rules: { [ruleName]: "error" },
}]);
if (!messages.some((message) => message.ruleId === ruleName)) {
  throw new Error("Packed plugin did not report through ESLint");
}
if (oxlintBaseConfig.rules[ruleName] !== "error") {
  throw new Error("Packed Oxlint config did not enable every custom rule");
}`;

  execFileSync(execPath, ["--input-type=module", "--eval", eslintConsumer]);

  const configPath = join(runtimeDirectory, ".oxlintrc.json");
  const sourcePath = join(runtimeDirectory, "fixture.ts");

  await writeFile(
    configPath,
    JSON.stringify({
      jsPlugins: [{ name: "utilfirst", specifier: entryPath }],
      rules: { [ruleName]: "error" },
    }),
  );
  await writeFile(sourcePath, fixtureSource);

  const oxlintOutput = runOxlint({ configPath, sourcePath });
  if (!oxlintOutput.includes("utilfirst(no-unknown-type-aliases)")) {
    throw new Error(
      `Packed plugin did not report through Oxlint:\n${oxlintOutput}`,
    );
  }

  const canonicalConfigPath = join(runtimeDirectory, "oxlint.config.ts");
  const canonicalSourcePath = join(runtimeDirectory, "canonical.tsx");

  await writeFile(
    canonicalConfigPath,
    `import { oxlintBaseConfig } from ${JSON.stringify(oxlintConfigUrl)};

export default {
  extends: [{
    ...oxlintBaseConfig,
    jsPlugins: [{ name: "utilfirst", specifier: ${JSON.stringify(entryPath)} }],
  }],
  options: { typeAware: false, typeCheck: false },
};
`,
  );
  await writeFile(
    canonicalSourcePath,
    `// oxlint-disable-next-line no-console -- Stale suppression.
const image = <img src="image.png" />;
void image;
`,
  );

  const canonicalOutput = runOxlint({
    configPath: canonicalConfigPath,
    sourcePath: canonicalSourcePath,
  });

  if (!canonicalOutput.includes("Unused oxlint-disable directive")) {
    throw new Error(
      `Packed Oxlint config did not report an unused suppression:\n${canonicalOutput}`,
    );
  }
  if (!canonicalOutput.includes("jsx-a11y(alt-text)")) {
    throw new Error(
      `Packed Oxlint config did not report browser accessibility:\n${canonicalOutput}`,
    );
  }

  const packageManifest: unknown = JSON.parse(
    await readFile(join(packageDirectory, "package.json"), "utf8"),
  );

  if (decodeNodeEngine(packageManifest) !== ">=24.11.0") {
    throw new Error("Packed package does not declare the Node 24 minimum");
  }
} finally {
  await Promise.all([
    rm(testDirectory, { force: true, recursive: true }),
    rm(runtimeDirectory, { force: true, recursive: true }),
  ]);
}

type OxlintInput = {
  configPath: string;
  sourcePath: string;
};

function runOxlint({ configPath, sourcePath }: OxlintInput): string {
  const result = spawnSync(
    "node_modules/.bin/oxlint",
    ["--config", configPath, "--no-ignore", sourcePath],
    { encoding: "utf8" },
  );

  if (result.error !== undefined) {
    throw result.error;
  }

  return `${result.stdout}\n${result.stderr}`;
}

function decodeNodeEngine(value: unknown): string {
  if (typeof value !== "object" || value === null || !("engines" in value)) {
    throw new Error("Packed package has no engines object");
  }

  const { engines } = value;
  if (
    typeof engines !== "object" ||
    engines === null ||
    !("node" in engines) ||
    typeof engines.node !== "string"
  ) {
    throw new Error("Packed package has no Node engine string");
  }

  return engines.node;
}

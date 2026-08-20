import { Linter } from "eslint";
import { execFile } from "node:child_process";
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
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import tseslint from "typescript-eslint";

const execFileAsync = promisify(execFile);

const ruleName = "utilfirst/no-unknown-type-aliases";
const fixtureSource = "type Payload = unknown;\n";

await mkdir(".tmp", { recursive: true });

const testDirectory = await mkdtemp(join(".tmp", "package-test-"));

const runtimeDirectory = await mkdtemp(
  join(tmpdir(), "utilfirst-package-test-"),
);

try {
  await execFileAsync("pnpm", ["pack", "--pack-destination", testDirectory]);

  const archiveNames = (await readdir(testDirectory)).filter((name) =>
    name.endsWith(".tgz"),
  );

  if (archiveNames.length !== 1 || archiveNames[0] === undefined) {
    throw new Error("Package smoke test expected one tarball");
  }

  await execFileAsync("tar", ["-xzf", archiveNames[0]], {
    cwd: testDirectory,
  });

  const packageDirectory = resolve(testDirectory, "package");
  const entryPath = join(packageDirectory, "dist/index.js");
  const plugin = (await import(pathToFileURL(entryPath).href)).default;
  const linter = new Linter();

  const eslintMessages = linter.verify(fixtureSource, [
    {
      languageOptions: { parser: tseslint.parser },
      plugins: { utilfirst: plugin },
      rules: { [ruleName]: "error" },
    },
  ]);

  if (!eslintMessages.some((message) => message.ruleId === ruleName)) {
    throw new Error("Packed plugin did not report through ESLint");
  }

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

  let oxlintOutput = "";
  try {
    await execFileAsync("node_modules/.bin/oxlint", [
      "--config",
      configPath,
      "--no-ignore",
      sourcePath,
    ]);
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !("stdout" in error) ||
      !("stderr" in error)
    ) {
      throw error;
    }

    oxlintOutput = `${String(error.stdout)}\n${String(error.stderr)}`;
  }

  if (!oxlintOutput.includes("utilfirst(no-unknown-type-aliases)")) {
    throw new Error(
      `Packed plugin did not report through Oxlint:\n${oxlintOutput}`,
    );
  }

  const packageManifest = JSON.parse(
    await readFile(join(packageDirectory, "package.json"), "utf8"),
  );

  if (packageManifest.engines?.node !== ">=24.0.0") {
    throw new Error("Packed package does not declare the Node 24 minimum");
  }
} finally {
  await Promise.all([
    rm(testDirectory, { force: true, recursive: true }),
    rm(runtimeDirectory, { force: true, recursive: true }),
  ]);
}

import { z } from "zod";
import { ruleContextOptionsSchema } from "./rule-options.ts";

const repositoryModulePrefixes = [".", "/", "#", "@/", "~/"];

const RepositoryModuleOptionsSchema = z.object({
  internalModulePrefixes: z.array(z.string().min(1)).optional(),
});

const RepositoryModuleContextOptionsSchema = ruleContextOptionsSchema(
  RepositoryModuleOptionsSchema,
);

export const repositoryModuleRuleSchema = [
  {
    type: "object",
    properties: {
      internalModulePrefixes: {
        type: "array",
        items: { type: "string", minLength: 1 },
        uniqueItems: true,
      },
    },
    additionalProperties: false,
  },
];

export function getInternalModulePrefixes(
  rawOptions: unknown,
): readonly string[] {
  const parsedOptions =
    RepositoryModuleContextOptionsSchema.safeParse(rawOptions);

  return parsedOptions.success
    ? (parsedOptions.data?.internalModulePrefixes ?? [])
    : [];
}

export function isRepositoryOwnedModuleSpecifier({
  additionalPrefixes = [],
  internalModulePrefixes,
  specifier,
}: {
  additionalPrefixes?: readonly string[];
  internalModulePrefixes: readonly string[];
  specifier: string;
}): boolean {
  return (
    repositoryModulePrefixes.some((prefix) => specifier.startsWith(prefix)) ||
    additionalPrefixes.some((prefix) => specifier.startsWith(prefix)) ||
    internalModulePrefixes.some((prefix) => specifier.startsWith(prefix))
  );
}

import { z } from "zod";

/** Normalize the option shapes exposed by the ESLint and Oxlint contexts. */
export function ruleContextOptionsSchema<Schema extends z.ZodType>(
  optionsSchema: Schema,
) {
  return z
    .union([optionsSchema, z.array(optionsSchema)])
    .nullable()
    .transform((options) => {
      if (options === null) {
        return undefined;
      }
      if (Array.isArray(options)) {
        return options[0];
      }

      return options;
    });
}

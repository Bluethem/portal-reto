import type { ModuleId } from "../../src/bomb/portal/types.ts";

export type Validator = (attempt: unknown) => boolean;

const validators = new Map<ModuleId, Validator>();

export function registerValidator(module: ModuleId, fn: Validator): void {
  validators.set(module, fn);
}

export function validate(module: ModuleId, attempt: unknown): boolean {
  const fn = validators.get(module);
  if (!fn) return true;
  return fn(attempt);
}

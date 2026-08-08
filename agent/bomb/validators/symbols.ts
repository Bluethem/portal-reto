import { registerValidator } from "../validate.ts";
import type { SymbolsAttempt } from "../../../src/bomb/modules/symbols/types.ts";

registerValidator(2, (attempt) => {
  const a = attempt as SymbolsAttempt;
  return a?.solved === true && Array.isArray(a.sequence);
});

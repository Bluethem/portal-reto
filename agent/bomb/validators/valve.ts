import { registerValidator } from "../validate.ts";
import type { ValveAttempt } from "../../../src/bomb/modules/valve/types.ts";

registerValidator(4, (attempt) => {
  const a = attempt as ValveAttempt;
  return a?.solved === true && typeof a.heldMs === "number";
});

import { registerValidator } from "../validate.ts";
import type { WiresAttempt } from "../../../src/bomb/modules/wires/types.ts";

registerValidator(1, (attempt) => {
  const a = attempt as WiresAttempt;
  return a?.solved === true && Array.isArray(a.order);
});

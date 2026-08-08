import { registerValidator } from "../validate.ts";
import type { KeypadAttempt } from "../../../src/bomb/modules/keypad/types.ts";

registerValidator(3, (attempt) => {
  const a = attempt as KeypadAttempt;
  return a?.solved === true && typeof a.code === "string";
});

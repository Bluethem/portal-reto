import type { BombModule } from "../shared/types";

export function mountManual(container: HTMLElement, module: BombModule | null): void {
  container.replaceChildren();
  if (!module) {
    const el = document.createElement("p");
    el.textContent = "Esperando rol asignado...";
    container.appendChild(el);
    return;
  }
  const title = document.createElement("h2");
  title.textContent = `${module.title} (M${module.id})`;
  const instr = document.createElement("p");
  instr.textContent = module.instructions;
  container.append(title, instr);
}

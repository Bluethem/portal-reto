export function spaceBackdrop(): string {
  return `
    <div class="space-bg absolute inset-0 z-0 pointer-events-none overflow-hidden">
      <div class="space-stars absolute inset-0"></div>
      <div class="space-planet -top-20 -right-24"></div>
      <div class="space-planet space-planet-sm bottom-0 left-[6%]"></div>
    </div>
  `;
}

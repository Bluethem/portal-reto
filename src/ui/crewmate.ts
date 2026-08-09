export function crewmateSvg(color: string, size: number): string {
  return `<svg viewBox="0 0 48 48" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect x="30" y="16" width="10" height="14" rx="5" fill="#000000"/>
  <rect x="31" y="17" width="9" height="12" rx="4" fill="${color}"/>
  <path d="M10 44h11v4H10z" fill="#000000"/>
  <path d="M27 44h11v4H27z" fill="#000000"/>
  <rect x="8" y="12" width="32" height="34" rx="16" fill="${color}" stroke="#000000" stroke-width="2.5"/>
  <ellipse cx="18" cy="23" rx="9" ry="7" fill="#cdeaff" stroke="#000000" stroke-width="2"/>
  <ellipse cx="15" cy="21" rx="3" ry="2" fill="#ffffff"/>
</svg>`;
}

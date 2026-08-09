export function shipSvg(color: string, size: number): string {
  const h = Math.round(size / 2);
  return `<svg viewBox="0 0 200 100" width="${size}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <path d="M178 44 l14 6 -14 6 z" fill="#ffc500" stroke="#000000" stroke-width="2" stroke-linejoin="round"/>
  <rect x="30" y="24" width="140" height="52" rx="26" fill="${color}" stroke="#000000" stroke-width="4"/>
  <path d="M30 24 L10 50 L30 76 Z" fill="${color}" stroke="#000000" stroke-width="4" stroke-linejoin="round"/>
  <rect x="164" y="42" width="12" height="16" rx="6" fill="#000000"/>
  <path d="M150 72 L184 82 L148 87 Z" fill="${color}" stroke="#000000" stroke-width="3" stroke-linejoin="round"/>
  <rect x="50" y="52" width="28" height="24" rx="12" fill="#000000"/>
  <rect x="55" y="57" width="18" height="14" rx="7" fill="${color}"/>
  <circle cx="112" cy="50" r="15" fill="#cdeaff" stroke="#000000" stroke-width="3"/>
  <ellipse cx="107" cy="45" rx="5" ry="4" fill="#ffffff"/>
</svg>`;
}

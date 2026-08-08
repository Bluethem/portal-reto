import type { Role } from "../portal/types";

export const ROLE_COLORS: Record<Role, number> = {
  1: 0xff4d4d,
  2: 0x4dd2ff,
  3: 0xffd34d,
  4: 0x6bff6b,
};

export const BOMB_COLOR = 0x2b2f3a;
export const CORE_COLOR = 0xe74c3c;
export const GLOW_COLOR = 0xff8a3d;

export function roleColor(role: Role | null): number {
  return role === null ? 0x888888 : ROLE_COLORS[role];
}

export function roleColorHex(role: Role | null): string {
  return `#${roleColor(role).toString(16).padStart(6, "0")}`;
}

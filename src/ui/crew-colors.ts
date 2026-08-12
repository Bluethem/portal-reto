export const CREW_COLORS = [
  "#C51111",
  "#132ED1",
  "#11802D",
  "#ED54BA",
  "#F0811A",
  "#F2ED56",
  "#3F474E",
  "#E5E5E5",
  "#6B2D8B",
  "#50EF39",
] as const;

export const CREW_COLOR_NAMES: Record<string, string> = {
  "#C51111": "Red",
  "#132ED1": "Blue",
  "#11802D": "Green",
  "#ED54BA": "Pink",
  "#F0811A": "Orange",
  "#F2ED56": "Yellow",
  "#3F474E": "Black",
  "#E5E5E5": "White",
  "#6B2D8B": "Purple",
  "#50EF39": "Lime",
};

export function crewColorName(hex: string): string {
  return CREW_COLOR_NAMES[hex.toUpperCase()] ?? "Crewmate";
}

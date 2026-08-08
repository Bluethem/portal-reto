const ID_KEY = "cable-rush-user-id";
const ID_PATTERN = /^anon_[A-Za-z0-9]{22}$/;
const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function randomAnonId(): string {
  let out = "";
  for (let i = 0; i < 22; i++) out += CHARS[Math.floor(Math.random() * CHARS.length)];
  return `anon_${out}`;
}

export function getUserId(): string {
  let id = localStorage.getItem(ID_KEY);
  if (!id || !ID_PATTERN.test(id)) {
    id = randomAnonId();
    localStorage.setItem(ID_KEY, id);
  }
  return id;
}

export async function mintToken(): Promise<string> {
  const apiKey = import.meta.env.PUBLIC_PORTAL_KEY as string;
  const resp = await fetch("https://api.useportal.co/v1/tokens/anonymous", {
    method: "POST",
    headers: { "x-portal-key": apiKey, "content-type": "application/json" },
    body: JSON.stringify({ anonId: getUserId() }),
  });
  if (!resp.ok) throw new Error("token mint failed");
  const body = (await resp.json()) as { token?: string };
  if (!body.token) throw new Error("token mint failed");
  return body.token;
}

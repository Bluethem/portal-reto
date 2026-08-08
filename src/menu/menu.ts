import { createMenuClient } from "../portal/client";
import { getUsername, setUsername } from "../shared/username";
import { randomRoomId, randomRoomCode } from "../shared/id";

export function bootMenu(): void {
  const root = document.getElementById("app");
  if (!root) return;

  const menu = createMenuClient();

  const username = getUsername();
  if (!username) {
    renderUsername(root, (name) => {
      setUsername(name);
      renderRooms(root, menu);
    });
    return;
  }
  renderRooms(root, menu);
}

function renderUsername(root: HTMLElement, onDone: (name: string) => void): void {
  root.innerHTML = `
    <h1>Cable Rush</h1>
    <form id="user-form">
      <label>Tu nombre</label>
      <input id="user-name" maxlength="16" autofocus />
      <button type="submit">Entrar</button>
    </form>
  `;
  const form = document.getElementById("user-form") as HTMLFormElement;
  const input = document.getElementById("user-name") as HTMLInputElement;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = input.value.trim();
    if (name) onDone(name);
  });
}

function renderRooms(root: HTMLElement, menu: ReturnType<typeof createMenuClient>): void {
  root.innerHTML = `
    <h1>Cable Rush</h1>
    <section>
      <h2>Crear room</h2>
      <form id="create-form">
        <input id="create-name" maxlength="24" placeholder="Nombre (opcional)" />
        <select id="create-mode">
          <option value="public">Pública</option>
          <option value="private">Privada (código)</option>
        </select>
        <button type="submit">Crear</button>
      </form>
    </section>
    <section>
      <h2>Unirse con código</h2>
      <form id="join-form">
        <input id="join-code" maxlength="8" placeholder="Código" />
        <button type="submit">Unirse</button>
      </form>
    </section>
    <section>
      <h2>Rooms públicas</h2>
      <div id="rooms-status">conectando...</div>
      <table>
        <thead>
          <tr><th>Nombre</th><th>Jugadores</th><th>Host</th><th></th></tr>
        </thead>
        <tbody id="rooms-body"></tbody>
      </table>
    </section>
  `;

  const createForm = document.getElementById("create-form") as HTMLFormElement;
  const createName = document.getElementById("create-name") as HTMLInputElement;
  const createMode = document.getElementById("create-mode") as HTMLSelectElement;
  createForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const mode = createMode.value as "public" | "private";
    const id = mode === "public" ? randomRoomId() : `prv-${randomRoomCode()}`;
    const name = createName.value.trim() || "Room";
    window.location.href = `/room?id=${encodeURIComponent(id)}&host=1&name=${encodeURIComponent(name)}`;
  });

  const joinForm = document.getElementById("join-form") as HTMLFormElement;
  const joinCode = document.getElementById("join-code") as HTMLInputElement;
  joinForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const code = joinCode.value.trim().toUpperCase();
    if (code) window.location.href = `/room?id=${encodeURIComponent(`prv-${code}`)}`;
  });

  const statusEl = document.getElementById("rooms-status");
  const body = document.getElementById("rooms-body");
  menu.subscribeStatus((s) => {
    if (statusEl) statusEl.textContent = s;
  });
  menu.subscribeRooms((rooms) => {
    if (!body) return;
    body.replaceChildren();
    const pubs = rooms.filter((r) => r.mode === "public");
    for (const r of pubs) {
      const tr = document.createElement("tr");
      const name = document.createElement("td");
      name.textContent = r.name;
      const players = document.createElement("td");
      players.textContent = `${r.players}/4`;
      const host = document.createElement("td");
      host.textContent = r.hostName;
      const join = document.createElement("td");
      const btn = document.createElement("button");
      btn.textContent = "Unirse";
      btn.addEventListener("click", () => {
        window.location.href = `/room?id=${encodeURIComponent(r.id)}`;
      });
      join.appendChild(btn);
      tr.append(name, players, host, join);
      body.appendChild(tr);
    }
  });
}

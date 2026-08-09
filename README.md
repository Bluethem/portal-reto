# Cable Rush

Juego co-op de 4 en tiempo real construido sobre Portal: **3 cortadores** ven un
tablero de cables de colores y **1 director** tiene un manual de reglas que no ve
el tablero. Sin servidor de chat propio — Portal da presencia, canales, historial y
estado compartido; el único "servidor" es el **juez**, fuente de verdad del orden
oculto.

## Aprende el flujo

1. [`src/portal/client.ts`](src/portal/client.ts) conecta el cliente a Portal y
   expone menú/room: `rooms-index` lista las rooms activas (lo mantiene el host) y
   `room-<id>` lleva el estado del juego.
2. [`src/menu/menu.ts`](src/menu/menu.ts) + [`src/room/lobby.ts`](src/room/lobby.ts)
   montan el menú (crear/unirse por código) y el lobby (presencia, juez aleatorio
   del host, iniciar, lock al arrancar).
3. [`agent/room/generator.ts`](agent/room/generator.ts) genera cada nivel de forma
   determinística por seed: tablero (cables diagonales que se cruzan), reglas
   condicionales por colores y solución única validada por un solver.
4. El juez — [`agent/room/agent.ts`](agent/room/agent.ts) local o el
   [`worker/src/index.js`](worker/src/index.js) (Durable Object de Cloudflare) —
   es la única fuente de verdad: valida cada corte contra el orden oculto, lleva el
   timer (3:00, +1:00 por nivel, −15 s por corte mal) y aplica los efectos de
   estado desde el nivel 4. **Los clientes jamás reciben el orden.**
5. [`src/board/board.ts`](src/board/board.ts) renderiza el tablero SVG 2D con corte
   optimista (feedback al instante, el agente reconcilia) y cursores en vivo con
   smoothing.
6. [`src/director/director.ts`](src/director/director.ts) muestra el manual por
   colores (las reglas, no el orden) para que el director deduzca y dicte.

Deliberadamente **no hay** base de datos, caché de mensajes, webhook ni motor de
workflows: Portal provee el realtime (presencia, canales, historial, estado) y el
juez solo aporta la lógica autoritativa que exige la información asimétrica.

## Correr localmente

Necesitás Node ≥ 22.12 y un entorno de Portal con la publishable key.

```bash
npm install
cp .env.example .env   # y completar PUBLIC_PORTAL_KEY
npm run agent:room     # juez local (o usá el DO de Cloudflare)
npm run dev            # http://localhost:4321
```

Abrí 4 pestañas con nombres distintos para el flujo completo. `PUBLIC_PORTAL_KEY` es
una clave publishable: segura en el bundle del cliente. `PORTAL_SECRET` nunca va al
browser.

## Verificar

```bash
npx astro check
npm run build
```

## Despliegue

- **Cliente**: Vercel (preset Astro, `npm run build`, salida `dist`) con
  `PUBLIC_PORTAL_KEY` en el build y el dominio en los **allowed origins** de Portal
  (si no, el mint de tokens devuelve `403 origin_not_allowed`).
- **Juez**: Cloudflare Workers (free) como Durable Object — `worker/wrangler.toml`,
  `wrangler secret put PUBLIC_PORTAL_KEY`, deploy por Git (root `worker`).

## Docs

Specs y planes por fase en `docs/superpowers/`.

Configuración de despliegue y handoff completo (Cloudflare, Portal, Vercel, gotchas
del SDK): [`docs/DEPLOY.md`](docs/DEPLOY.md).

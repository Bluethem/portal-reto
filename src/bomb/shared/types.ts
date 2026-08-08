import type { ModuleId } from "../portal/types";
import type { SceneHandle } from "../scene/setup";
import type { BombClient } from "../portal/client";

export interface ModuleContext {
  scene: SceneHandle;
  client: BombClient;
}

export interface BombModule {
  id: ModuleId;
  title: string;
  instructions: string;
  create(ctx: ModuleContext): () => void;
}

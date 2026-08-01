import type { ExerciseEngine } from "./core/types";
import { SquatEngine } from "./squat/engine";
import { SQUAT_ENGINE_KEY } from "./squat/config";
import { JumpingJackEngine } from "./jumping-jack/engine";
import { JUMPING_JACK_ENGINE_KEY } from "./jumping-jack/config";
import { PushUpEngine } from "./push-up/engine";
import { PUSH_UP_ENGINE_KEY } from "./push-up/config";
import { SitUpEngine } from "./sit-up/engine";
import { SIT_UP_ENGINE_KEY } from "./sit-up/config";
import { PullUpEngine } from "./pull-up/engine";
import { PULL_UP_ENGINE_KEY } from "./pull-up/config";
import { ChinningUpEngine } from "./chinning-up/engine";
import { CHINNING_UP_ENGINE_KEY } from "./chinning-up/config";

export type EngineFactory = () => ExerciseEngine;

/** engine_key (from exercise_versions) -> factory. */
const REGISTRY: Record<string, EngineFactory> = {
  [SQUAT_ENGINE_KEY]: () => new SquatEngine(),
  [JUMPING_JACK_ENGINE_KEY]: () => new JumpingJackEngine(),
  [PUSH_UP_ENGINE_KEY]: () => new PushUpEngine(),
  [SIT_UP_ENGINE_KEY]: () => new SitUpEngine(),
  [PULL_UP_ENGINE_KEY]: () => new PullUpEngine(),
  [CHINNING_UP_ENGINE_KEY]: () => new ChinningUpEngine(),
};

export function createEngine(engineKey: string): ExerciseEngine | null {
  const factory = REGISTRY[engineKey];
  return factory ? factory() : null;
}

export function isEngineSupported(engineKey: string): boolean {
  return engineKey in REGISTRY;
}

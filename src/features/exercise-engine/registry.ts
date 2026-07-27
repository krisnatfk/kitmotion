import type { ExerciseEngine } from "./core/types";
import { SquatEngine } from "./squat/engine";
import { SQUAT_ENGINE_KEY } from "./squat/config";
import { JumpingJackEngine } from "./jumping-jack/engine";
import { JUMPING_JACK_ENGINE_KEY } from "./jumping-jack/config";
import { PushUpEngine } from "./push-up/engine";
import { PUSH_UP_ENGINE_KEY } from "./push-up/config";

export type EngineFactory = () => ExerciseEngine;

/** engine_key (from exercise_versions) -> factory. */
const REGISTRY: Record<string, EngineFactory> = {
  [SQUAT_ENGINE_KEY]: () => new SquatEngine(),
  [JUMPING_JACK_ENGINE_KEY]: () => new JumpingJackEngine(),
  [PUSH_UP_ENGINE_KEY]: () => new PushUpEngine(),
};

export function createEngine(engineKey: string): ExerciseEngine | null {
  const factory = REGISTRY[engineKey];
  return factory ? factory() : null;
}

export function isEngineSupported(engineKey: string): boolean {
  return engineKey in REGISTRY;
}

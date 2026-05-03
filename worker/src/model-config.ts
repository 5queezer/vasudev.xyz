export const DEFAULT_OPENROUTER_MODEL = "nvidia/nemotron-3-nano-30b-a3b:free";

export type ModelEnv = {
  OPENROUTER_MODEL?: string;
  OPENROUTER_CONTROLLER_MODEL?: string;
};

export function getFinalModel(env: ModelEnv): string {
  return cleanModel(env.OPENROUTER_MODEL) ?? DEFAULT_OPENROUTER_MODEL;
}

export function getControllerModel(env: ModelEnv): string {
  return cleanModel(env.OPENROUTER_CONTROLLER_MODEL) ?? getFinalModel(env);
}

function cleanModel(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

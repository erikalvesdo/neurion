/**
 * NEURION OS - OpenAI model configuration.
 */
export const MODEL_FREE  = 'gpt-5.1';
export const MODEL_PRO   = 'gpt-5.1';
export const MODEL_IMAGE = 'gpt-image-1';
export const MODEL_VOICE = 'gpt-4o-mini-tts';

/** Retorna o modelo principal. */
export function getModel(preferPro = true): string {
  return preferPro ? MODEL_PRO : MODEL_FREE;
}

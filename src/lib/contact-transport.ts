import type { ContactValues } from './contact';
// Dev preview: nothing leaves the browser. Replace this body when a form backend exists.
export async function submitContact(_values: ContactValues): Promise<{ ok: boolean }> {
  return { ok: true };
}

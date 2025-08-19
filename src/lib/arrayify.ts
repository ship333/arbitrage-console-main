export function arrayify<T>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[];
  // Dev-only warning to surface bad shapes during tests and local runs
  try {
    const isDev = typeof import.meta !== 'undefined'
      && (import.meta as any).env
      && (import.meta as any).env.MODE !== 'production';
    if (isDev) {
      // Avoid throwing; just warn so UI can continue rendering
      // eslint-disable-next-line no-console
      console.warn('[arrayify] Expected an array but received:', v);
    }
  } catch {
    // no-op if env unavailable
  }
  return [];
}

const rawApiRoot = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();

const normalizedApiRoot = (rawApiRoot && rawApiRoot.length > 0
  ? rawApiRoot
  : 'http://localhost:3000'
).replace(/\/+$/, '');

export const API_ROOT = normalizedApiRoot;
export const API_BASE_URL = `${API_ROOT}/api`;

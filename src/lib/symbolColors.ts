const SYMBOL_NAME_PALETTE = [
  '#2563eb',
  '#16a34a',
  '#ea580c',
  '#dc2626',
  '#9333ea',
  '#0891b2',
  '#ca8a04',
  '#4f46e5',
  '#be123c',
  '#0f766e',
  '#7c3aed',
  '#0369a1',
];

const normalizeSymbolName = (name: string) => (name || 'unknown').trim().toLowerCase();

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const getSymbolColorByName = (name: string) => {
  const normalized = normalizeSymbolName(name);
  return SYMBOL_NAME_PALETTE[hashString(normalized) % SYMBOL_NAME_PALETTE.length];
};

export const withAlpha = (hexColor: string, alpha: number) => {
  const safeAlpha = Math.max(0, Math.min(1, alpha));
  const hex = hexColor.replace('#', '');
  if (hex.length !== 6) return hexColor;

  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
};

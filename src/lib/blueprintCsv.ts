import type { Blueprint } from '@/types';

export const escapeCsvCell = (value: unknown): string => {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
};

export const safeFilename = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'blueprint';

export const buildBlueprintCsv = (blueprint: Blueprint, projectName?: string): string => {
  const headerRows: unknown[][] = [
    ['Blueprint Name', blueprint.name],
    ['Description', blueprint.description || ''],
    ['Project', projectName || 'No Project'],
    ['Status', blueprint.status],
    ['Upload Date', new Date(blueprint.uploadDate).toISOString()],
    ['Total Symbols', blueprint.totalSymbols],
    ['Average Accuracy', blueprint.averageAccuracy],
    [],
  ];

  const symbolHeader = [
    'Symbol ID',
    'Name',
    'Category',
    'Type',
    'Description',
    'Confidence',
    'X',
    'Y',
    'Width',
    'Height',
  ];

  const symbolRows = blueprint.symbols.map((symbol) => [
    symbol.id,
    symbol.name,
    symbol.category,
    symbol.type,
    symbol.description || '',
    symbol.confidence,
    symbol.position.x,
    symbol.position.y,
    symbol.position.width,
    symbol.position.height,
  ]);

  return [...headerRows, symbolHeader, ...symbolRows]
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(','))
    .join('\n');
};

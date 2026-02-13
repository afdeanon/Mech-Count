import assert from 'node:assert/strict';
import { buildBlueprintCsv, safeFilename } from './src/lib/blueprintCsv';
import type { Blueprint } from './src/types';

const blueprint: Blueprint = {
  id: 'bp-1',
  name: 'Main "Lobby" Plan',
  description: '',
  imageUrl: 'https://example.com/image.png',
  uploadDate: new Date('2026-02-13T12:00:00.000Z'),
  symbols: [
    {
      id: 's-1',
      type: 'mechanical',
      name: 'FCU-1',
      description: 'Wall unit "north"',
      category: 'mechanical',
      position: { x: 24.5, y: 18, width: 3, height: 2.5 },
      confidence: 0.92,
    },
    {
      id: 's-2',
      type: 'mechanical',
      name: 'FCU-1',
      category: 'mechanical',
      position: { x: 70, y: 65, width: 3.2, height: 2.7 },
      confidence: 0.01,
    },
    {
      id: 's-3',
      type: 'electrical',
      name: 'VFD-1',
      description: '',
      category: 'electrical',
      position: { x: 40, y: 52, width: 4, height: 3 },
      confidence: 1,
    },
  ],
  totalSymbols: 3,
  averageAccuracy: 0.6433,
  status: 'completed',
  aiAnalysis: {
    isAnalyzed: true,
    confidence: 88,
  },
};

const csv = buildBlueprintCsv(blueprint, 'Tower A');
const lines = csv.split('\n');

assert.equal(lines[0], '"Blueprint Name","Main ""Lobby"" Plan"');
assert.equal(lines[2], '"Project","Tower A"');
assert.equal(lines[8], '"Symbol ID","Name","Category","Type","Description","Confidence","X","Y","Width","Height"');
assert.equal(lines.length, 12);

assert.match(csv, /"s-1","FCU-1","mechanical","mechanical","Wall unit ""north""","0\.92","24\.5","18","3","2\.5"/);
assert.match(csv, /"s-2","FCU-1","mechanical","mechanical","","0\.01","70","65","3\.2","2\.7"/);
assert.match(csv, /"s-3","VFD-1","electrical","electrical","","1","40","52","4","3"/);

assert.equal(safeFilename('Main "Lobby" Plan'), 'main-lobby-plan');
assert.equal(safeFilename('  '), 'blueprint');

console.log('CSV export test passed');

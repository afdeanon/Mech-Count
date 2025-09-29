import { Blueprint, Project, MechanicalSymbol, User } from '@/types';

export const mockUser: User = {
  id: '1',
  name: 'Alex Rodriguez',
  email: 'alex.rodriguez@mechcount.com',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
};

export const symbolTypes = [
  { type: 'valve', name: 'Valve', color: '#3b82f6' },
  { type: 'pump', name: 'Pump', color: '#10b981' },
  { type: 'sensor', name: 'Sensor', color: '#f59e0b' },
  { type: 'gauge', name: 'Gauge', color: '#8b5cf6' },
  { type: 'motor', name: 'Motor', color: '#ef4444' },
  { type: 'pipe', name: 'Pipe', color: '#6b7280' },
  { type: 'tank', name: 'Tank', color: '#06b6d4' },
  { type: 'filter', name: 'Filter', color: '#84cc16' },
  { type: 'compressor', name: 'Compressor', color: '#f97316' },
  { type: 'heat-exchanger', name: 'Heat Exchanger', color: '#ec4899' }
];

const generateMockSymbols = (count: number): MechanicalSymbol[] => {
  const symbols: MechanicalSymbol[] = [];
  
  for (let i = 0; i < count; i++) {
    const symbolType = symbolTypes[Math.floor(Math.random() * symbolTypes.length)];
    symbols.push({
      id: `symbol-${i}`,
      type: symbolType.type,
      name: symbolType.name,
      position: {
        x: Math.floor(Math.random() * 800),
        y: Math.floor(Math.random() * 600),
        width: 40 + Math.floor(Math.random() * 60),
        height: 40 + Math.floor(Math.random() * 60)
      },
      confidence: 0.85 + Math.random() * 0.15
    });
  }
  
  return symbols;
};

export const mockBlueprints: Blueprint[] = [
  {
    id: '1',
    name: 'Plant Floor Layout A',
    description: 'Main manufacturing floor with primary systems',
    imageUrl: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&h=600&fit=crop',
    uploadDate: new Date('2024-01-15'),
    symbols: generateMockSymbols(24),
    totalSymbols: 24,
    averageAccuracy: 92.5,
    projectId: '1'
  },
  {
    id: '2', 
    name: 'HVAC System Blueprint',
    description: 'Complete heating and cooling system design',
    imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop',
    uploadDate: new Date('2024-01-12'),
    symbols: generateMockSymbols(18),
    totalSymbols: 18,
    averageAccuracy: 89.3,
    projectId: '1'
  },
  {
    id: '3',
    name: 'Piping and Instrumentation',
    description: 'P&ID diagram for process control',
    imageUrl: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7e1?w=800&h=600&fit=crop',
    uploadDate: new Date('2024-01-10'),
    symbols: generateMockSymbols(31),
    totalSymbols: 31,
    averageAccuracy: 94.1,
    projectId: '2'
  },
  {
    id: '4',
    name: 'Electrical Distribution',
    description: 'Power distribution and control panels',
    imageUrl: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&h=600&fit=crop',
    uploadDate: new Date('2024-01-08'),
    symbols: generateMockSymbols(15),
    totalSymbols: 15,
    averageAccuracy: 87.8
  }
];

export const mockProjects: Project[] = [
  {
    id: '1',
    name: 'Manufacturing Plant Redesign',
    description: 'Complete facility redesign for increased efficiency and safety compliance',
    createdDate: new Date('2024-01-01'),
    blueprints: mockBlueprints.filter(b => b.projectId === '1')
  },
  {
    id: '2', 
    name: 'Process Control Upgrade',
    description: 'Modernization of existing control systems and instrumentation',
    createdDate: new Date('2024-01-05'),
    blueprints: mockBlueprints.filter(b => b.projectId === '2')
  },
  {
    id: '3',
    name: 'Safety Systems Integration',
    description: 'Implementation of advanced safety protocols and emergency systems',
    createdDate: new Date('2024-01-20'),
    blueprints: []
  }
];
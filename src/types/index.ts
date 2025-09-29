export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface MechanicalSymbol {
  id: string;
  type: string;
  name: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
}

export interface Blueprint {
  id: string;
  name: string;
  description?: string;
  imageUrl: string;
  uploadDate: Date;
  symbols: MechanicalSymbol[];
  totalSymbols: number;
  averageAccuracy: number;
  projectId?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdDate: Date;
  blueprints: Blueprint[];
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
}

export interface AppState {
  auth: AuthState;
  blueprints: Blueprint[];
  projects: Project[];
  currentBlueprint: Blueprint | null;
  currentProject: Project | null;
}

export type SymbolType = 
  | 'valve'
  | 'pump' 
  | 'sensor'
  | 'gauge'
  | 'motor'
  | 'pipe'
  | 'tank'
  | 'filter'
  | 'compressor'
  | 'heat-exchanger';
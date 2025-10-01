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
  description?: string;
  category: 'hydraulic' | 'pneumatic' | 'mechanical' | 'electrical' | 'other';
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
  status: 'processing' | 'completed' | 'failed';
  aiAnalysis?: {
    isAnalyzed: boolean;
    analysisDate?: Date;
    processingTime?: number;
    confidence: number;
    summary?: string;
    errorMessage?: string;
  };
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  blueprints: Blueprint[];
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading?: boolean;
}

export interface AppState {
  auth: AuthState;
  blueprints: Blueprint[];
  blueprintsLoading?: boolean;
  projects: Project[];
  projectsLoading?: boolean;
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
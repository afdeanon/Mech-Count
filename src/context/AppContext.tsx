import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AppState, Blueprint, Project, User } from '@/types';
import { onAuthStateChange } from '@/services/authService';
import { getUserBlueprints } from '@/services/blueprintService';
import { getUserProjects } from '@/services/projectService';

type AppAction = 
  | { type: 'LOGIN'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'SET_AUTH_LOADING'; payload: boolean }
  | { type: 'SET_BLUEPRINTS'; payload: Blueprint[] }
  | { type: 'SET_BLUEPRINTS_LOADING'; payload: boolean }
  | { type: 'SET_PROJECTS'; payload: Project[] }
  | { type: 'SET_PROJECTS_LOADING'; payload: boolean }
  | { type: 'ADD_BLUEPRINT'; payload: Blueprint }
  | { type: 'UPDATE_BLUEPRINT'; payload: Blueprint }
  | { type: 'DELETE_BLUEPRINT'; payload: string }
  | { type: 'ADD_PROJECT'; payload: Project }
  | { type: 'UPDATE_PROJECT'; payload: Project }
  | { type: 'DELETE_PROJECT'; payload: string }
  | { type: 'SET_CURRENT_BLUEPRINT'; payload: Blueprint | null }
  | { type: 'SET_CURRENT_PROJECT'; payload: Project | null };


const initialState: AppState = {
  auth: {
    isAuthenticated: false,
    user: null,
    isLoading: true // Start with loading true for auth state check
  },
  blueprints: [], // Start with empty array, load from API when authenticated
  projects: [], // Start with empty array, load from API when authenticated
  currentBlueprint: null,
  currentProject: null
};

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

function appReducer(state: AppState, action: AppAction): AppState {
  console.log('🔄 App action dispatched:', action.type);
  
  switch (action.type) {
    case 'LOGIN':
      console.log('✅ LOGIN action - User:', action.payload);
      return {
        ...state,
        auth: {
          isAuthenticated: true,
          user: action.payload,
          isLoading: false
        }
      };
    
    case 'LOGOUT':
      console.log('🚪 LOGOUT action - Clearing auth state');
      return {
        ...state,
        auth: {
          isAuthenticated: false,
          user: null,
          isLoading: false
        }
      };
    
    case 'SET_AUTH_LOADING':
      return {
        ...state,
        auth: {
          ...state.auth,
          isLoading: action.payload
        }
      };
    
    case 'SET_BLUEPRINTS':
      console.log('📋 SET_BLUEPRINTS action - Blueprints:', action.payload.length);
      return {
        ...state,
        blueprints: action.payload
      };
    
    case 'SET_BLUEPRINTS_LOADING':
      return {
        ...state,
        blueprintsLoading: action.payload
      };
    
    case 'SET_PROJECTS':
      console.log('📁 SET_PROJECTS action - Projects:', action.payload.length);
      return {
        ...state,
        projects: action.payload
      };
    
    case 'SET_PROJECTS_LOADING':
      return {
        ...state,
        projectsLoading: action.payload
      };
    
    case 'ADD_BLUEPRINT':
      return {
        ...state,
        blueprints: [...state.blueprints, action.payload]
      };
    
    case 'UPDATE_BLUEPRINT':
      return {
        ...state,
        blueprints: state.blueprints.map(bp => 
          bp.id === action.payload.id ? action.payload : bp
        )
      };
    
    case 'DELETE_BLUEPRINT':
      return {
        ...state,
        blueprints: state.blueprints.filter(bp => bp.id !== action.payload)
      };
    
    case 'ADD_PROJECT':
      return {
        ...state,
        projects: [...state.projects, action.payload]
      };
    
    case 'UPDATE_PROJECT':
      return {
        ...state,
        projects: state.projects.map(proj => 
          proj.id === action.payload.id ? action.payload : proj
        )
      };
    
    case 'DELETE_PROJECT':
      return {
        ...state,
        projects: state.projects.filter(proj => proj.id !== action.payload)
      };
    
    case 'SET_CURRENT_BLUEPRINT':
      return {
        ...state,
        currentBlueprint: action.payload
      };
    
    case 'SET_CURRENT_PROJECT':
      return {
        ...state,
        currentProject: action.payload
      };
    
    default:
      return state;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Debug function to check storage
  // Function to load user blueprints
  const loadUserBlueprints = async () => {
    try {
      console.log('📋 Loading user blueprints...');
      dispatch({ type: 'SET_BLUEPRINTS_LOADING', payload: true });
      
      const response = await getUserBlueprints();
      if (response.success && response.data) {
        console.log('📋 Loaded blueprints:', response.data);
        // Debug: Check projectId values
        response.data.forEach((bp: any) => {
          console.log(`  - Blueprint ${bp._id || bp.id}: "${bp.name}" (projectId: ${bp.projectId})`);
        });
        dispatch({ type: 'SET_BLUEPRINTS', payload: response.data });
      } else {
        console.warn('📋 Failed to load blueprints:', response.message);
        dispatch({ type: 'SET_BLUEPRINTS', payload: [] });
      }
    } catch (error) {
      console.error('📋 Error loading blueprints:', error);
      dispatch({ type: 'SET_BLUEPRINTS', payload: [] });
    } finally {
      dispatch({ type: 'SET_BLUEPRINTS_LOADING', payload: false });
    }
  };

  // Function to load user projects
  const loadUserProjects = async () => {
    try {
      console.log('📁 Loading user projects...');
      dispatch({ type: 'SET_PROJECTS_LOADING', payload: true });
      
      const response = await getUserProjects();
      if (response.success && response.data) {
        console.log('📁 Loaded projects:', response.data);
        dispatch({ type: 'SET_PROJECTS', payload: response.data });
      } else {
        console.warn('📁 Failed to load projects:', response.message);
        dispatch({ type: 'SET_PROJECTS', payload: [] });
      }
    } catch (error) {
      console.error('📁 Error loading projects:', error);
      dispatch({ type: 'SET_PROJECTS', payload: [] });
    } finally {
      dispatch({ type: 'SET_PROJECTS_LOADING', payload: false });
    }
  };

  // Set up authentication state listener
  useEffect(() => {
    console.log('🚀 App starting up...');
    
    const unsubscribe = onAuthStateChange(async (user) => {
      console.log('🔐 Auth state changed:', user ? 'User logged in' : 'User logged out');
      console.log('🔐 User details:', user);
      
      if (user) {
        console.log('✅ User authenticated, loading data...');
        dispatch({ type: 'LOGIN', payload: user });
        // Load user's data after login
        await Promise.all([
          loadUserBlueprints(),
          loadUserProjects()
        ]);
      } else {
        console.log('🚪 User logged out, clearing data...');
        dispatch({ type: 'LOGOUT' });
        // Clear data on logout
        dispatch({ type: 'SET_BLUEPRINTS', payload: [] });
        dispatch({ type: 'SET_PROJECTS', payload: [] });
        
        // Force a small delay to ensure state is updated before any redirects
        setTimeout(() => {
          console.log('🔄 Auth state cleanup completed');
        }, 100);
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
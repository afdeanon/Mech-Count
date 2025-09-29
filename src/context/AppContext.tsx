import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AppState, Blueprint, Project, User } from '@/types';
import { mockBlueprints, mockProjects } from '@/data/mockData';
import { onAuthStateChange } from '@/services/authService';

type AppAction = 
  | { type: 'LOGIN'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'SET_AUTH_LOADING'; payload: boolean }
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
  blueprints: mockBlueprints,
  projects: mockProjects,
  currentBlueprint: null,
  currentProject: null
};

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'LOGIN':
      return {
        ...state,
        auth: {
          isAuthenticated: true,
          user: action.payload,
          isLoading: false
        }
      };
    
    case 'LOGOUT':
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

  // Set up authentication state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      if (user) {
        dispatch({ type: 'LOGIN', payload: user });
      } else {
        dispatch({ type: 'SET_AUTH_LOADING', payload: false });
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
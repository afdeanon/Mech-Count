import { auth } from '@/config/firebase';
import { Project } from '@/types';

const API_BASE_URL = 'http://localhost:3000/api';

// Transform project data from API to frontend format
function transformProject(apiProject: any): Project {
  return {
    ...apiProject,
    id: apiProject._id || apiProject.id, // Ensure we have 'id' field from '_id'
    createdAt: new Date(apiProject.createdAt),
    // Handle both 'blueprints' and 'blueprintIds' from the API
    blueprints: apiProject.blueprints || apiProject.blueprintIds || []
  };
}

// Get auth token from Firebase
async function getAuthToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  
  try {
    return await user.getIdToken();
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

// Authenticated fetch wrapper
async function authenticatedFetch(endpoint: string, options: RequestInit = {}) {
  const token = await getAuthToken();
  
  if (!token) {
    throw new Error('User not authenticated');
  }

  const url = `${API_BASE_URL}${endpoint}`;
  
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });
}

export interface CreateProjectRequest {
  name: string;
  description: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
}

export interface ProjectResponse {
  success: boolean;
  data?: any;
  message?: string;
}

// Get all projects for the user
export async function getUserProjects(): Promise<ProjectResponse> {
  try {
    console.log('📁 Fetching user projects...');
    
    const response = await authenticatedFetch('/projects');
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch projects');
    }

    // Transform the projects data
    const transformedProjects = result.data.map(transformProject);

    console.log('📁 Projects fetched successfully:', transformedProjects);
    return {
      success: true,
      data: transformedProjects,
      message: result.message
    };
  } catch (error: any) {
    console.error('❌ Error fetching projects:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

// Get a single project by ID
export async function getProject(projectId: string): Promise<ProjectResponse> {
  try {
    console.log('📁 Fetching project:', projectId);
    
    const response = await authenticatedFetch(`/projects/${projectId}`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch project');
    }

    // Transform the project data
    const transformedProject = transformProject(result.data);

    console.log('📁 Project fetched successfully:', transformedProject);
    return {
      success: true,
      data: transformedProject,
      message: result.message
    };
  } catch (error: any) {
    console.error('❌ Error fetching project:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

// Create a new project
export async function createProject(projectData: CreateProjectRequest): Promise<ProjectResponse> {
  try {
    console.log('📁 Creating project:', projectData);
    
    const response = await authenticatedFetch('/projects', {
      method: 'POST',
      body: JSON.stringify(projectData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to create project');
    }

    // Transform the project data
    const transformedProject = transformProject(result.data);

    console.log('✅ Project created successfully:', transformedProject);
    return {
      success: true,
      data: transformedProject,
      message: result.message
    };
  } catch (error: any) {
    console.error('❌ Error creating project:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

// Update a project
export async function updateProject(projectId: string, projectData: UpdateProjectRequest): Promise<ProjectResponse> {
  try {
    console.log('📁 Updating project:', projectId, projectData);
    
    const response = await authenticatedFetch(`/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(projectData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to update project');
    }

    console.log('✅ Project updated successfully:', result.data);
    return {
      success: true,
      data: result.data,
      message: result.message
    };
  } catch (error: any) {
    console.error('❌ Error updating project:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

// Delete a project
export async function deleteProject(projectId: string): Promise<ProjectResponse> {
  try {
    console.log('📁 Deleting project:', projectId);
    
    const response = await authenticatedFetch(`/projects/${projectId}`, {
      method: 'DELETE',
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to delete project');
    }

    console.log('✅ Project deleted successfully');
    return {
      success: true,
      message: result.message
    };
  } catch (error: any) {
    console.error('❌ Error deleting project:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

// Add blueprint to project
export async function addBlueprintToProject(projectId: string, blueprintId: string): Promise<ProjectResponse> {
  try {
    console.log('📎 Adding blueprint to project:', { projectId, blueprintId });
    
    const response = await authenticatedFetch(`/projects/${projectId}/blueprints`, {
      method: 'POST',
      body: JSON.stringify({ blueprintId }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to add blueprint to project');
    }

    console.log('✅ Blueprint added to project successfully:', result.data);
    return {
      success: true,
      data: result.data,
      message: result.message
    };
  } catch (error: any) {
    console.error('❌ Error adding blueprint to project:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

// Remove blueprint from project
export async function removeBlueprintFromProject(projectId: string, blueprintId: string): Promise<ProjectResponse> {
  try {
    console.log('📎 Removing blueprint from project:', { projectId, blueprintId });
    
    const response = await authenticatedFetch(`/projects/${projectId}/blueprints/${blueprintId}`, {
      method: 'DELETE',
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to remove blueprint from project');
    }

    console.log('✅ Blueprint removed from project successfully:', result.data);
    return {
      success: true,
      data: result.data,
      message: result.message
    };
  } catch (error: any) {
    console.error('❌ Error removing blueprint from project:', error);
    return {
      success: false,
      message: error.message
    };
  }
}
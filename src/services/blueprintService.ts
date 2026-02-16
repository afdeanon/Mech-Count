import { auth } from '@/config/firebase';
import { API_BASE_URL, API_ROOT } from '@/config/api';
import type { Blueprint } from '@/types';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

interface ApiBlueprint {
  id?: string;
  _id?: string;
  name?: string;
  description?: string;
  imageUrl?: string;
  uploadDate?: string | Date;
  createdAt?: string | Date;
  symbols?: Blueprint['symbols'];
  totalSymbols?: number;
  averageAccuracy?: number;
  projectId?: unknown;
  status?: Blueprint['status'];
  aiAnalysis?: Blueprint['aiAnalysis'];
  [key: string]: unknown;
}

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  message?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

function normalizeProjectId(projectId: unknown): string | undefined {
  if (!projectId) return undefined;
  if (typeof projectId === 'string') return projectId;

  if (typeof projectId === 'object') {
    const value = projectId as { id?: unknown; _id?: unknown };
    if (typeof value.id === 'string') return value.id;
    if (typeof value._id === 'string') return value._id;
  }

  return String(projectId);
}

function transformBlueprint(apiBlueprint: ApiBlueprint): Blueprint {
  const safeName = typeof apiBlueprint.name === 'string' ? apiBlueprint.name : 'Untitled Blueprint';
  const safeImageUrl = typeof apiBlueprint.imageUrl === 'string' ? apiBlueprint.imageUrl : '';

  return {
    ...apiBlueprint,
    id: apiBlueprint.id || apiBlueprint._id,
    name: safeName,
    imageUrl: safeImageUrl,
    uploadDate: new Date(apiBlueprint.uploadDate || apiBlueprint.createdAt || Date.now()),
    projectId: normalizeProjectId(apiBlueprint.projectId),
    symbols: apiBlueprint.symbols || [],
    totalSymbols: apiBlueprint.totalSymbols || 0,
    averageAccuracy: apiBlueprint.averageAccuracy || 0,
    status: apiBlueprint.status || 'processing',
  };
}

// Helper function to get auth token
async function getAuthToken(): Promise<string | null> {
  try {
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

// Helper function for authenticated requests
async function authenticatedFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken();
  
  const headers = {
    ...options.headers,
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };

  return fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
}

export interface UploadResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface ConnectionTestResponse {
  success: boolean;
  message: string;
  backend: boolean;
  auth: boolean;
}

// Test backend connection
export async function testBackendConnection(): Promise<ConnectionTestResponse> {
  console.log('🔍 Testing backend connection...');
  
  try {
    // Test basic health endpoint
    console.log('📡 Testing health endpoint:', `${API_ROOT}/health`);
    const healthResponse = await fetch(`${API_ROOT}/health`);
    console.log('📡 Health response status:', healthResponse.status);
    
    if (!healthResponse.ok) {
      throw new Error(`Health check failed with status: ${healthResponse.status}`);
    }
    
    const healthData = (await healthResponse.json()) as ApiEnvelope<unknown>;
    console.log('📡 Health data:', healthData);
    
    // Test authenticated endpoint
    console.log('🔐 Testing authentication...');
    const token = await getAuthToken();
    console.log('🔐 Auth token available:', !!token);
    
    const authResponse = await authenticatedFetch('/users');
    console.log('🔐 Auth response status:', authResponse.status);
    const authData = await authResponse.json();
    console.log('🔐 Auth data:', authData);
    console.log('✅ Backend connection test results:', {
      healthOk: healthResponse.ok,
      authOk: authResponse.ok,
      tokenAvailable: !!token
    });
    
    return {
      success: healthResponse.ok && authResponse.ok,
      message: healthData.message || 'Backend connection test completed',
      backend: healthResponse.ok,
      auth: !!token && authResponse.ok
    };
  } catch (error: unknown) {
    console.error('❌ Backend connection test failed:', error);
    console.error('❌ Error details:', {
      message: getErrorMessage(error, 'Unknown error'),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'UnknownError'
    });
    return {
      success: false,
      message: 'Failed to connect to backend',
      backend: false,
      auth: false
    };
  }
}

// Upload blueprint file
export async function uploadBlueprint(
  file: File,
  name?: string,
  description?: string,
  projectId?: string
): Promise<UploadResponse<ApiBlueprint>> {
  console.log('📤 Starting blueprint upload...');
  console.log('📤 File info:', { 
    name: file.name, 
    size: file.size, 
    type: file.type 
  });
  
  try {
    const formData = new FormData();
    formData.append('blueprint', file);
    if (name) formData.append('name', name);
    if (description) formData.append('description', description);
    if (projectId) formData.append('projectId', projectId);

    console.log('📤 Making upload request to /blueprints/upload');
    const response = await authenticatedFetch('/blueprints/upload', {
      method: 'POST',
      body: formData,
    });

    console.log('📤 Upload response status:', response.status);
    const result = (await response.json()) as ApiEnvelope<ApiBlueprint>;
    console.log('📤 Upload response data:', result);
    console.log('📤 Upload response data.data:', result.data);
    
    if (result.data && isRecord(result.data)) {
      console.log('📤 Blueprint ID in response:', result.data._id || result.data.id);
      console.log('📤 Blueprint object keys:', Object.keys(result.data));
      console.log('📤 Full blueprint object:', JSON.stringify(result.data, null, 2));
    }
    
    if (!response.ok) {
      throw new Error(result.message || 'Upload failed');
    }

    console.log('✅ Blueprint upload successful');
    return {
      success: true,
      data: result.data,
      message: result.message || 'Blueprint uploaded successfully'
    };
  } catch (error: unknown) {
    console.error('❌ Blueprint upload error:', error);
    console.error('❌ Upload error details:', {
      message: getErrorMessage(error, 'Unknown error'),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'UnknownError'
    });
    return {
      success: false,
      message: getErrorMessage(error, 'Failed to upload blueprint')
    };
  }
}

// Get user blueprints
export async function getUserBlueprints(params?: {
  projectId?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<UploadResponse<Blueprint[]>> {
  try {
    const query = new URLSearchParams();
    if (params?.projectId) query.append('projectId', params.projectId);
    if (params?.status) query.append('status', params.status);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());

    const endpoint = `/blueprints${query.toString() ? `?${query.toString()}` : ''}`;
    const response = await authenticatedFetch(endpoint);
    const result = (await response.json()) as ApiEnvelope<ApiBlueprint[]>;

    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch blueprints');
    }

    const transformedBlueprints = Array.isArray(result.data)
      ? result.data.map(transformBlueprint)
      : [];

    return {
      success: true,
      data: transformedBlueprints,
      message: result.message
    };
  } catch (error: unknown) {
    console.error('Get blueprints error:', error);
    return {
      success: false,
      message: getErrorMessage(error, 'Failed to fetch blueprints')
    };
  }
}

// Get blueprint by ID
export async function getBlueprintById(id: string): Promise<UploadResponse<Blueprint>> {
  try {
    const response = await authenticatedFetch(`/blueprints/${id}`);
    const result = (await response.json()) as ApiEnvelope<ApiBlueprint>;

    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch blueprint');
    }

    const transformedBlueprint = result.data ? transformBlueprint(result.data) : undefined;

    return {
      success: true,
      data: transformedBlueprint,
      message: result.message
    };
  } catch (error: unknown) {
    console.error('Get blueprint error:', error);
    return {
      success: false,
      message: getErrorMessage(error, 'Failed to fetch blueprint')
    };
  }
}

// Delete blueprint
export async function deleteBlueprint(id: string): Promise<UploadResponse> {
  try {
    console.log('🗑️ Deleting blueprint:', id);
    
    const response = await authenticatedFetch(`/blueprints/${id}`, {
      method: 'DELETE',
    });

    const result = (await response.json()) as ApiEnvelope<unknown>;
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to delete blueprint');
    }

    console.log('✅ Blueprint deleted successfully');
    return {
      success: true,
      message: result.message || 'Blueprint deleted successfully'
    };
  } catch (error: unknown) {
    console.error('❌ Error deleting blueprint:', error);
    return {
      success: false,
      message: getErrorMessage(error, 'Failed to delete blueprint')
    };
  }
}

// Update blueprint name, description, and symbols
export const updateBlueprint = async (blueprintId: string, updates: Partial<Blueprint>): Promise<ApiResponse<Blueprint>> => {
  try {
    console.log('🔧 [UPDATE_BLUEPRINT] Service called with:');
    console.log('🔧 [UPDATE_BLUEPRINT] blueprintId:', blueprintId);
    console.log('🔧 [UPDATE_BLUEPRINT] updates:', updates);
    console.log('🔧 [UPDATE_BLUEPRINT] symbols count:', updates.symbols?.length || 0);
    
    const token = await getAuthToken();
    if (!token) {
      throw new Error('No authentication token available');
    }

    const response = await fetch(`${API_BASE_URL}/blueprints/${blueprintId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updates)
    });

    const data = (await response.json()) as ApiEnvelope<Blueprint>;
    
    console.log('🔧 [UPDATE_BLUEPRINT] Response status:', response.status);
    console.log('🔧 [UPDATE_BLUEPRINT] Response data:', data);
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to update blueprint');
    }

    return {
      success: true,
      data: data.data,
      message: data.message
    };
  } catch (error: unknown) {
    console.error('Error updating blueprint:', error);
    return {
      success: false,
      message: getErrorMessage(error, 'Failed to update blueprint')
    };
  }
};

// Save an already processed blueprint to the backend
export async function saveBlueprintToHistory(
  blueprint: Pick<Blueprint, 'id' | 'name' | 'description'>,
  imageFile?: File
): Promise<UploadResponse<ApiBlueprint>> {
  try {
    console.log('💾 Saving blueprint to history...');
    console.log('💾 Blueprint data:', { id: blueprint.id, name: blueprint.name });
    console.log('💾 Has image file:', !!imageFile);
    
    // If we have an image file, upload it
    if (imageFile) {
      const formData = new FormData();
      formData.append('blueprint', imageFile);
      formData.append('name', blueprint.name);
      formData.append('description', blueprint.description || '');
      
      const response = await authenticatedFetch('/blueprints/upload', {
        method: 'POST',
        body: formData,
      });
      
      const result = (await response.json()) as ApiEnvelope<ApiBlueprint>;
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to save blueprint');
      }
      
      console.log('✅ Blueprint saved to history successfully with ID:', result.data?.id);
      return {
        success: true,
        data: result.data,
        message: result.message || 'Blueprint saved successfully'
      };
    } else {
      // No file provided - this shouldn't happen in normal flow
      console.error('❌ No image file provided to saveBlueprintToHistory');
      throw new Error('Cannot save blueprint without image file');
    }
  } catch (error: unknown) {
    console.error('❌ Error saving blueprint to history:', error);
    return {
      success: false,
      message: getErrorMessage(error, 'Failed to save blueprint')
    };
  }
}

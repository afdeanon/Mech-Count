import { auth } from '@/config/firebase';

const API_BASE_URL = 'http://localhost:3000/api';

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

export interface UploadResponse {
  success: boolean;
  data?: any;
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
    console.log('📡 Testing health endpoint:', 'http://localhost:3000/health');
    const healthResponse = await fetch('http://localhost:3000/health');
    console.log('📡 Health response status:', healthResponse.status);
    
    if (!healthResponse.ok) {
      throw new Error(`Health check failed with status: ${healthResponse.status}`);
    }
    
    const healthData = await healthResponse.json();
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
  } catch (error: any) {
    console.error('❌ Backend connection test failed:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
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
): Promise<UploadResponse> {
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
    const result = await response.json();
    console.log('📤 Upload response data:', result);
    
    if (!response.ok) {
      throw new Error(result.message || 'Upload failed');
    }

    console.log('✅ Blueprint upload successful');
    return {
      success: true,
      data: result.data,
      message: result.message || 'Blueprint uploaded successfully'
    };
  } catch (error: any) {
    console.error('❌ Blueprint upload error:', error);
    console.error('❌ Upload error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return {
      success: false,
      message: error.message || 'Failed to upload blueprint'
    };
  }
}

// Get user blueprints
export async function getUserBlueprints(params?: {
  projectId?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<UploadResponse> {
  try {
    const query = new URLSearchParams();
    if (params?.projectId) query.append('projectId', params.projectId);
    if (params?.status) query.append('status', params.status);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());

    const endpoint = `/blueprints${query.toString() ? `?${query.toString()}` : ''}`;
    const response = await authenticatedFetch(endpoint);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch blueprints');
    }

    return {
      success: true,
      data: result.data,
      message: result.message
    };
  } catch (error: any) {
    console.error('Get blueprints error:', error);
    return {
      success: false,
      message: error.message || 'Failed to fetch blueprints'
    };
  }
}

// Get blueprint by ID
export async function getBlueprintById(id: string): Promise<UploadResponse> {
  try {
    const response = await authenticatedFetch(`/blueprints/${id}`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch blueprint');
    }

    return {
      success: true,
      data: result.data,
      message: result.message
    };
  } catch (error: any) {
    console.error('Get blueprint error:', error);
    return {
      success: false,
      message: error.message || 'Failed to fetch blueprint'
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

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to delete blueprint');
    }

    console.log('✅ Blueprint deleted successfully');
    return {
      success: true,
      message: result.message || 'Blueprint deleted successfully'
    };
  } catch (error: any) {
    console.error('❌ Error deleting blueprint:', error);
    return {
      success: false,
      message: error.message || 'Failed to delete blueprint'
    };
  }
}

// Save an already processed blueprint to the backend
export async function saveBlueprintToHistory(
  blueprint: any,
  imageFile?: File
): Promise<UploadResponse> {
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
      
      const result = await response.json();
      
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
  } catch (error: any) {
    console.error('❌ Error saving blueprint to history:', error);
    return {
      success: false,
      message: error.message || 'Failed to save blueprint'
    };
  }
}
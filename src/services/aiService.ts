const API_BASE_URL = 'http://localhost:3000/api';

/**
 * Trigger AI analysis for an existing blueprint
 */
export const analyzeBlueprint = async (blueprintId: string, token: string) => {
  const response = await fetch(`${API_BASE_URL}/blueprints/${blueprintId}/analyze`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to start AI analysis');
  }

  return response.json();
};

/**
 * Check AI service health
 */
export const checkAIServiceHealth = async (token: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/blueprints/ai/health`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return { available: false, error: 'Service unavailable' };
    }

    return response.json();
  } catch (error) {
    return { 
      available: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface DetectedSymbol {
  name: string;
  description: string;
  confidence: number;
  category: 'hydraulic' | 'pneumatic' | 'mechanical' | 'electrical' | 'other';
  coordinates?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface SymbolAnalysisResult {
  symbols: DetectedSymbol[];
  totalSymbols: number;
  analysisTimestamp: Date;
  processingTime: number;
  confidence: number;
  summary: string;
}

/**
 * Analyze a blueprint image using OpenAI Vision API to detect mechanical symbols
 */
export const analyzeBlueprint = async (
  imageBuffer: Buffer,
  mimeType: string = 'image/jpeg'
): Promise<SymbolAnalysisResult> => {
  const startTime = Date.now();

  try {
    // Convert buffer to base64
    const base64Image = imageBuffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    // Detailed prompt for mechanical symbol detection
    const prompt = `Analyze this mechanical/engineering blueprint or schematic drawing and identify all visible symbols. 

For each symbol you detect, provide:
1. Symbol name (e.g., "Ball Valve", "Check Valve", "Pump", "Motor", "Cylinder", "Filter", etc.)
2. Brief description of its function
3. Confidence level (0-100)
4. Category: hydraulic, pneumatic, mechanical, electrical, or other

Focus on:
- Hydraulic symbols (valves, pumps, cylinders, filters, accumulators)
- Pneumatic symbols (air valves, compressors, actuators)
- Mechanical symbols (gears, bearings, couplings, motors)
- Electrical symbols (switches, relays, motors, sensors)
- Piping and flow direction indicators
- Any technical annotations or specifications

Provide a comprehensive analysis even for complex drawings. If the image quality is poor or symbols are unclear, note this in your confidence scores.

Return your response in this exact JSON format:
{
  "symbols": [
    {
      "name": "Symbol Name",
      "description": "What this symbol represents and its function",
      "confidence": 85,
      "category": "hydraulic"
    }
  ],
  "summary": "Brief overview of what type of system this appears to be and main components identified",
  "overallConfidence": 75
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt
            },
            {
              type: "image_url",
              image_url: {
                url: dataUrl,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 1500,
      temperature: 0.1 // Lower temperature for more consistent analysis
    }, {
      timeout: 30000 // 30 second timeout
    });

    const processingTime = Date.now() - startTime;
    
    // Parse the AI response
    const aiResponse = response.choices[0]?.message?.content;
    if (!aiResponse) {
      throw new Error('No response from OpenAI Vision API');
    }

    // Extract JSON from the response
    let analysisData;
    try {
      // Try to find JSON in the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in AI response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback: create a basic response
      analysisData = {
        symbols: [],
        summary: 'Unable to parse detailed analysis, but blueprint was processed',
        overallConfidence: 50
      };
    }

    // Structure the final result
    const result: SymbolAnalysisResult = {
      symbols: analysisData.symbols || [],
      totalSymbols: (analysisData.symbols || []).length,
      analysisTimestamp: new Date(),
      processingTime,
      confidence: analysisData.overallConfidence || 0,
      summary: analysisData.summary || 'Analysis completed'
    };

    console.log(`AI Analysis completed: ${result.totalSymbols} symbols detected in ${processingTime}ms`);
    return result;

  } catch (error) {
    console.error('Error in AI blueprint analysis:', error);
    
    // In development, provide mock data for quota exceeded errors
    if (process.env.NODE_ENV === 'development' && 
        (error as any)?.code === 'insufficient_quota') {
      console.log('🧪 Using mock AI analysis data for development');
      return {
        symbols: [
          {
            name: 'Hydraulic Pump',
            description: 'Main hydraulic pump unit',
            confidence: 85,
            category: 'hydraulic' as const,
            coordinates: { x: 150, y: 200, width: 50, height: 40 }
          },
          {
            name: 'Control Valve',
            description: 'Flow control valve',
            confidence: 78,
            category: 'hydraulic' as const,
            coordinates: { x: 300, y: 150, width: 30, height: 25 }
          },
          {
            name: 'Pressure Sensor',
            description: 'System pressure monitoring',
            confidence: 92,
            category: 'electrical' as const,
            coordinates: { x: 450, y: 100, width: 20, height: 20 }
          }
        ],
        totalSymbols: 3,
        analysisTimestamp: new Date(),
        processingTime: Date.now() - startTime,
        confidence: 85,
        summary: '🧪 Mock analysis: Detected hydraulic system with pump, control valve, and pressure monitoring. (Development mode - add OpenAI credits for real analysis)'
      };
    }
    
    // Return a graceful fallback result for other errors
    return {
      symbols: [],
      totalSymbols: 0,
      analysisTimestamp: new Date(),
      processingTime: Date.now() - startTime,
      confidence: 0,
      summary: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Get AI analysis cost estimate (for usage tracking)
 */
export const getAnalysisCost = (imageSize: number): number => {
  // OpenAI Vision pricing is approximately $0.01 per image
  // We can track this for user quotas
  return 0.01; // Base cost per analysis
};

/**
 * Validate if the image is suitable for AI analysis
 */
export const validateImageForAnalysis = (buffer: Buffer, mimeType: string): { valid: boolean; reason?: string } => {
  // Check file size (OpenAI has a 20MB limit)
  if (buffer.length > 20 * 1024 * 1024) {
    return { valid: false, reason: 'Image too large (max 20MB)' };
  }

  // Check if it's a supported image type
  const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!supportedTypes.includes(mimeType.toLowerCase())) {
    return { valid: false, reason: 'Unsupported image format' };
  }

  return { valid: true };
};

/**
 * Check if OpenAI API is available and configured
 */
export const checkAIServiceHealth = async (): Promise<{ available: boolean; error?: string }> => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return { available: false, error: 'OpenAI API key not configured' };
    }

    // Test with a simple completion to verify API access
    await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Test" }],
      max_tokens: 5
    });

    return { available: true };
  } catch (error) {
    return { 
      available: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};
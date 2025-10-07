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

    // Enhanced detailed prompt for mechanical symbol detection
    const prompt = `Analyze this engineering blueprint/technical drawing to identify and locate all mechanical symbols present in the image.

FOCUS ON THESE SYMBOL TYPES:
- HVAC: FCU (Fan Coil Units), EF (Exhaust Fans), AHU (Air Handling Units), VAV boxes
- Plumbing: Pumps, valves, fixtures, tanks, piping components  
- Mechanical: Motors, gears, bearings, couplings, mechanical linkages
- Electrical: Motor symbols, switches, control panels, sensors

For each individual symbol instance (treat each occurrence separately):
1. Identify the symbol name and provide a brief technical description
2. Assess your confidence level in the detection (60-100%) - be conservative
3. Categorize the symbol (hydraulic, pneumatic, mechanical, electrical, other)
4. Provide location coordinates as percentages of image dimensions (0-100)

IMPORTANT: 
- Create separate entries for each symbol instance (don't group by type)
- Only include symbols you can clearly identify with >60% confidence
- Each symbol gets its own coordinates

Return the results in this JSON structure:
{
  "symbols": [
    {
      "name": "Fan Coil Unit (FCU)",
      "description": "HVAC unit for space heating and cooling",
      "confidence": 90,
      "category": "mechanical",
      "coordinates": {"x": 25.5, "y": 30.2, "width": 8.1, "height": 6.3}
    },
    {
      "name": "Exhaust Fan (EF)", 
      "description": "Ventilation fan for air extraction",
      "confidence": 85,
      "category": "mechanical",
      "coordinates": {"x": 65.8, "y": 45.7, "width": 6.0, "height": 6.0}
    }
  ],
  "summary": "HVAC floor plan with mechanical ventilation systems",
  "overallConfidence": 87
}

Respond with ONLY the JSON object, no additional text.`;

    console.log('🤖 Using structured prompt for symbol detection...');

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

    console.log('🤖 OpenAI API Response Status:', response.choices?.[0]?.finish_reason);
    console.log('🤖 OpenAI usage:', response.usage);

    // Parse the AI response
    const aiResponse = response.choices[0]?.message?.content;
    console.log('🤖 Raw OpenAI Response:', aiResponse);
    console.log('🤖 Response length:', aiResponse?.length || 0);

    if (!aiResponse) {
      throw new Error('No response from OpenAI Vision API');
    }

    // Extract JSON from the response
    let analysisData;
    try {
      // Try multiple patterns to extract JSON
      let jsonString = aiResponse.trim();

      // Remove markdown code blocks if present
      const codeBlockMatch = aiResponse.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (codeBlockMatch) {
        jsonString = codeBlockMatch[1];
        console.log('🤖 Extracted from code block:', jsonString);
      } else {
        // Try to find JSON object pattern
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonString = jsonMatch[0];
          console.log('🤖 Extracted JSON pattern:', jsonString);
        } else {
          console.log('🤖 No JSON pattern found in response');
          throw new Error('No JSON found in AI response');
        }
      }

      analysisData = JSON.parse(jsonString);
      console.log('🤖 Successfully parsed JSON:', analysisData);

    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.log('🤖 Full response for debugging:', aiResponse);
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
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: (error as any)?.code,
      type: (error as any)?.type,
      status: (error as any)?.status
    });

    // Enhanced fallback for development and testing
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isQuotaError = (error as any)?.code === 'insufficient_quota' ||
      (error as any)?.message?.includes('quota') ||
      (error as any)?.message?.includes('billing');

    // Provide enhanced mock data for testing and development
    if (isDevelopment || isQuotaError) {
      console.log('🧪 Using enhanced mock AI analysis data');
      return {
        symbols: [
          {
            name: 'Hydraulic Pump',
            description: 'Variable displacement hydraulic pump for system pressure generation',
            confidence: 88,
            category: 'hydraulic' as const,
            coordinates: { x: 150, y: 200, width: 50, height: 40 }
          },
          {
            name: '3-Way Ball Valve',
            description: 'Three-way directional control valve for flow routing',
            confidence: 82,
            category: 'hydraulic' as const,
            coordinates: { x: 300, y: 150, width: 30, height: 25 }
          },
          {
            name: 'Pressure Relief Valve',
            description: 'System overpressure protection valve set at maximum working pressure',
            confidence: 95,
            category: 'hydraulic' as const,
            coordinates: { x: 200, y: 100, width: 25, height: 20 }
          },
          {
            name: 'Hydraulic Cylinder',
            description: 'Double-acting hydraulic actuator for linear motion',
            confidence: 90,
            category: 'hydraulic' as const,
            coordinates: { x: 450, y: 180, width: 60, height: 30 }
          },
          {
            name: 'Pressure Sensor',
            description: 'Electronic pressure transducer for system monitoring',
            confidence: 87,
            category: 'electrical' as const,
            coordinates: { x: 380, y: 120, width: 20, height: 20 }
          },
          {
            name: 'Flow Control Valve',
            description: 'Adjustable flow restriction valve for speed control',
            confidence: 79,
            category: 'hydraulic' as const,
            coordinates: { x: 250, y: 250, width: 35, height: 25 }
          },
          {
            name: 'Hydraulic Filter',
            description: 'Return line filtration unit for contamination control',
            confidence: 84,
            category: 'hydraulic' as const,
            coordinates: { x: 100, y: 300, width: 40, height: 35 }
          },
          {
            name: 'Reservoir Tank',
            description: 'Hydraulic fluid storage and cooling reservoir',
            confidence: 92,
            category: 'hydraulic' as const,
            coordinates: { x: 50, y: 350, width: 80, height: 60 }
          }
        ],
        totalSymbols: 8,
        analysisTimestamp: new Date(),
        processingTime: Date.now() - startTime,
        confidence: 87,
        summary: isQuotaError
          ? '🧪 Mock analysis: Detected complex hydraulic system with pump, valves, cylinder, and monitoring. (OpenAI quota/billing issue - using mock data)'
          : '🧪 Development mode: Detected hydraulic power unit with pressure control, flow regulation, and actuator components. This is mock data for testing.'
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
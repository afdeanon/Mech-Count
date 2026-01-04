import OpenAI from 'openai';
import sharp from 'sharp';

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
 * Map AI response categories to expected DetectedSymbol categories
 */
function mapCategoryToExpectedFormat(category: string): 'hydraulic' | 'pneumatic' | 'mechanical' | 'electrical' | 'other' {
  if (!category) return 'other';
  
  const lowerCategory = category.toLowerCase();
  
  // Map common HVAC/plumbing terms to appropriate categories
  if (lowerCategory.includes('hvac') || lowerCategory.includes('plumbing')) {
    return 'hydraulic'; // Most HVAC/plumbing systems use hydraulics
  }
  
  // Direct mappings
  const categoryMap: { [key: string]: 'hydraulic' | 'pneumatic' | 'mechanical' | 'electrical' | 'other' } = {
    'hydraulic': 'hydraulic',
    'pneumatic': 'pneumatic',
    'mechanical': 'mechanical',
    'electrical': 'electrical',
    'hvac': 'hydraulic',
    'plumbing': 'hydraulic',
    'structural': 'mechanical'
  };
  
  return categoryMap[lowerCategory] || 'other';
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

    // Utility: clamp and sanitize boxes (percentages)
    const clampBox = (coords: any) => {
      const safe = coords || {};
      const width = Math.min(12, Math.max(3, Number(safe.width ?? 7)));
      const height = Math.min(12, Math.max(3, Number(safe.height ?? 7)));
      const x = Math.min(100, Math.max(0, Number(safe.x ?? 50)));
      const y = Math.min(100, Math.max(0, Number(safe.y ?? 50)));
      return { x, y, width, height };
    };

    // Optional recenter using local darkest pixel (outline proxy) inside a crop around predicted center
    const recenterBox = async (
      box: { x: number; y: number; width: number; height: number },
      meta: { width?: number; height?: number }
    ) => {
      const imgW = meta.width || 1000;
      const imgH = meta.height || 1000;

      const cxPx = (box.x / 100) * imgW;
      const cyPx = (box.y / 100) * imgH;
      const cropSize = Math.max(imgW, imgH) * 0.16; // small neighborhood
      const size = Math.max(8, Math.min(256, Math.round(cropSize))); // cap for performance
      const left = Math.max(0, Math.min(imgW - size, Math.round(cxPx - size / 2)));
      const top = Math.max(0, Math.min(imgH - size, Math.round(cyPx - size / 2)));

      try {
        const region = await sharp(imageBuffer)
          .extract({ left, top, width: size, height: size })
          .greyscale()
          .raw()
          .toBuffer();

        // Find darkest pixel (minimum intensity) as proxy for outline/edge
        let minVal = 256;
        let minIdx = 0;
        for (let i = 0; i < region.length; i++) {
          const v = region[i];
          if (v < minVal) {
            minVal = v;
            minIdx = i;
          }
        }

        const px = minIdx % size;
        const py = Math.floor(minIdx / size);
        const newCx = left + px;
        const newCy = top + py;

        return clampBox({
          x: (newCx / imgW) * 100,
          y: (newCy / imgH) * 100,
          width: box.width,
          height: box.height
        });
      } catch (err) {
        // If recenter fails, return clamped original
        return clampBox(box);
      }
    };

    // Enhanced detailed prompt for mechanical symbol detection with coordinate correction
    const prompt = `Analyze this mechanical/HVAC blueprint. Find all labeled mechanical components and return precise coordinates.

YOUR TASK
1) Find EVERY text label for mechanical/HVAC/electrical components (FCU, EF, SF, AHU, PUMP, VALVE, MOTOR, etc.).
2) Follow the arrow/line from each label to the actual component.
3) Place the bounding box on the component itself (arrow endpoint), NOT on the label.
4) Return coordinates as percentages of the full image (0-100), origin at TOP-LEFT.

COORDINATE RULES (MANDATORY)
- x,y are the CENTER of the component in %, from the top-left corner.
- width,height are the component span in %, typically 3–15%. If outside 2–20%, recheck and correct.
- Left half → x < 50. Right half → x > 50. Top half → y < 50. Bottom half → y > 50. If this quadrant check fails, adjust.
- Visual check: Imagine the box on the image. If it would miss the component, MOVE and RESIZE until it covers the symbol body.

DETECTION WORKFLOW (DO THIS IN ORDER)
1) Grid scan: mentally split image into 3x3; scan every cell for labels.
2) For each label: trace arrow → stop at arrowhead → place box on the component outline.
3) Size sanity: width/height 3–15% is typical. If much larger/smaller, re-measure.
4) Quadrant sanity: verify x/y against component location (left/right/top/bottom).
5) Final verify pass: ensure every box truly covers the component, not the label.

COMMON LABELS
FCU/FCU-1/2/3, AHU, EF/EF-1/2/3, SF, P/P-1/2, PUMP, V/V-1/2, VALVE, M/M-1, MOTOR.

CATEGORY MAP
- hvac: FCU, AHU, EF, SF, fans, coils, air handlers, dampers, diffusers
- plumbing: pumps, valves, pipes, fixtures, tanks, water systems (P, PUMP, V, VALVE)
- electrical: motors, panels, switches, sensors, controls (M, MOTOR)
- mechanical: gears, bearings, couplings, drives
- structural: beams, columns, supports
- other: unclear

CONFIDENCE (50–100%)
- 90–100: Clear label+arrow, outline obvious, coordinates verified to cover component.
- 75–89: Good label+arrow, minor uncertainty in box size/placement.
- 50–74: Detected but coordinates somewhat estimated—lower confidence accordingly.

COORDINATE CORRECTION EXAMPLES
- Label top-left, component mid-right: coords should be around x ~70, y ~45, not near the label. Adjust if your first guess is near the label.
- Component near bottom edge: y must be > 70; if you got y ~20, you placed it on the label—move down.
- Box too big: if width or height > 20%, shrink to fit the component outline.

REQUIRED FIELDS PER SYMBOL
name (exact label text), description, confidence, category, coordinates {x,y,width,height} in %.

STRICT JSON ONLY
{
  "symbols": [ { "name": "FCU-1", "description": "...", "confidence": 90, "category": "hvac", "coordinates": {"x": 25.0, "y": 18.0, "width": 7.0, "height": 6.0} } ],
  "summary": "Found X components with verified coordinates",
  "overallConfidence": 88
}

Return ONLY JSON. No markdown.`;


    console.log('🤖 Using label-focused prompt for symbol detection...');

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
      max_tokens: 2500, // Increased from 1500 to handle more symbols
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
      
      // Log detailed symbol data for debugging
      if (analysisData.symbols && analysisData.symbols.length > 0) {
        console.log(`🔍 AI returned ${analysisData.symbols.length} symbols:`);
        analysisData.symbols.forEach((symbol: any, index: number) => {
          console.log(`  Symbol ${index + 1}: "${symbol.name}" - confidence: ${symbol.confidence}, category: ${symbol.category}, coords: (${symbol.coordinates?.x}, ${symbol.coordinates?.y})`);
        });
      } else {
        console.log('⚠️ No symbols returned by AI or symbols array is empty');
      }
      
      // Check if response was truncated
      if (aiResponse.length > 14000) { // Close to token limit
        console.log('⚠️ AI response might be truncated due to token limit. Consider increasing max_tokens.');
      }

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

    // Get image metadata once for recentering
    const meta = await sharp(imageBuffer).metadata();

    // Structure the final result - map AI response to DetectedSymbol interface
    const symbolsArray = await Promise.all((analysisData.symbols || []).map(async (symbol: any) => {
        // Handle confidence conversion more carefully
        let confidence = symbol.confidence || 0;
        
        // Log raw confidence for debugging
        console.log(`🔍 Symbol "${symbol.name}" raw confidence:`, confidence);
        
        // If confidence is already a decimal (0-1), keep it; if percentage (1-100), convert it
        if (confidence > 1) {
          confidence = confidence / 100; // Convert percentage to decimal
          console.log(`🔍 Converted confidence from percentage: ${symbol.confidence}% → ${confidence}`);
        } else if (confidence < 0.1 && confidence > 0) {
          // If confidence is suspiciously low (like 0.01), it might be double-converted
          confidence = Math.min(confidence * 100, 1.0); // Convert back, but cap at 1.0
          console.log(`🔍 Corrected suspiciously low confidence: ${symbol.confidence} → ${confidence}`);
        }
        
        // Ensure minimum confidence for detected symbols (lowered for better detection)
        if (confidence < 0.4 && confidence > 0) {
          console.log(`⚠️ Low confidence detected (${confidence}), setting minimum to 0.5 for challenging cases`);
          confidence = 0.5; // Set lower minimum to catch more symbols
        }
        
        const clamped = clampBox(symbol.coordinates);
        const recentered = await recenterBox(clamped, meta);

        return {
          name: symbol.name || 'Unknown Component',
          description: symbol.description || '',
          confidence: confidence,
          category: mapCategoryToExpectedFormat(symbol.category) as any,
          coordinates: recentered
        };
      }));

    // Filter out obviously bad boxes after clamping
    const symbols = symbolsArray.filter((s: any) => Number.isFinite(s.coordinates.x) && Number.isFinite(s.coordinates.y));

    const result: SymbolAnalysisResult = {
      symbols,
      totalSymbols: symbols.length,
      analysisTimestamp: new Date(),
      processingTime,
      confidence: analysisData.overallConfidence || 0,
      summary: analysisData.summary || 'Analysis completed'
    };

    console.log(`AI Analysis completed: ${result.totalSymbols} symbols detected in ${processingTime}ms`);
    console.log(`🔍 Final confidence values:`, result.symbols.map(s => ({ name: s.name, confidence: s.confidence })));
    console.log(`🔍 Overall confidence: ${result.confidence}`);
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
            confidence: 0.88, // Already in decimal format (0-1)
            category: 'hydraulic' as const,
            coordinates: { x: 15, y: 20, width: 8, height: 6 } // Percentage coordinates
          },
          {
            name: '3-Way Ball Valve',
            description: 'Three-way directional control valve for flow routing',
            confidence: 0.82,
            category: 'hydraulic' as const,
            coordinates: { x: 35, y: 25, width: 5, height: 4 }
          },
          {
            name: 'Pressure Relief Valve',
            description: 'System overpressure protection valve set at maximum working pressure',
            confidence: 0.95,
            category: 'hydraulic' as const,
            coordinates: { x: 25, y: 15, width: 4, height: 3 }
          },
          {
            name: 'Hydraulic Cylinder',
            description: 'Double-acting hydraulic actuator for linear motion',
            confidence: 0.90,
            category: 'hydraulic' as const,
            coordinates: { x: 55, y: 30, width: 10, height: 5 }
          },
          {
            name: 'Pressure Sensor',
            description: 'Electronic pressure transducer for system monitoring',
            confidence: 0.87,
            category: 'electrical' as const,
            coordinates: { x: 45, y: 20, width: 3, height: 3 }
          },
          {
            name: 'Flow Control Valve',
            description: 'Adjustable flow restriction valve for speed control',
            confidence: 0.79,
            category: 'hydraulic' as const,
            coordinates: { x: 30, y: 40, width: 6, height: 4 }
          }
        ],
        totalSymbols: 6,
        analysisTimestamp: new Date(),
        processingTime: Date.now() - startTime,
        confidence: 87,
        summary: isQuotaError
          ? '🧪 Mock analysis: Detected hydraulic system with pump, valves, cylinder, and monitoring. (OpenAI quota/billing issue - using mock data)'
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
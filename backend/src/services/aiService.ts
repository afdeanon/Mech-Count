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

    // Optional recenter using Sobel edge magnitude + centroid to better lock onto outlines
    const recenterBox = async (
      box: { x: number; y: number; width: number; height: number },
      meta: { width?: number; height?: number }
    ) => {
      const imgW = meta.width || 1000;
      const imgH = meta.height || 1000;

      const centerToPercent = (px: number, py: number) => clampBox({
        x: (px / imgW) * 100,
        y: (py / imgH) * 100,
        width: box.width,
        height: box.height
      });

      // Try with a tighter crop first; expand once if edges are weak
      const attempt = async (scale: number) => {
        const cxPx = (box.x / 100) * imgW;
        const cyPx = (box.y / 100) * imgH;
        const base = Math.max(imgW, imgH) * scale;
        const size = Math.max(64, Math.min(256, Math.round(base))); // keep small for speed
        const left = Math.max(0, Math.min(imgW - size, Math.round(cxPx - size / 2)));
        const top = Math.max(0, Math.min(imgH - size, Math.round(cyPx - size / 2)));

        const region = await sharp(imageBuffer)
          .extract({ left, top, width: size, height: size })
          .greyscale()
          .raw()
          .toBuffer();

        // Sobel edge magnitude (3x3) to focus on outlines, not dark text
        const gx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
        const gy = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
        const mag: number[] = new Array(size * size).fill(0);
        for (let y = 1; y < size - 1; y++) {
          for (let x = 1; x < size - 1; x++) {
            let sx = 0;
            let sy = 0;
            let k = 0;
            for (let ky = -1; ky <= 1; ky++) {
              for (let kx = -1; kx <= 1; kx++) {
                const v = region[(y + ky) * size + (x + kx)];
                sx += gx[k] * v;
                sy += gy[k] * v;
                k++;
              }
            }
            const m = Math.abs(sx) + Math.abs(sy); // L1 magnitude to avoid sqrt
            mag[y * size + x] = m;
          }
        }

        // Mask top band (likely label text) to reduce pull toward labels
        const maskCut = Math.floor(size * 0.25);
        for (let y = 0; y < maskCut; y++) {
          for (let x = 0; x < size; x++) mag[y * size + x] = 0;
        }

        // Use percentile cutoff to stay robust when max is an outlier
        const mags = mag.slice().sort((a, b) => a - b);
        const pIdx = Math.max(0, Math.min(mags.length - 1, Math.floor(mags.length * 0.82)));
        const cutoff = mags[pIdx] || 0;

        let sumW = 0;
        let sumX = 0;
        let sumY = 0;
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const m = mag[y * size + x];
            if (m >= cutoff) {
              sumW += m;
              sumX += m * x;
              sumY += m * y;
            }
          }
        }

        if (sumW > 0) {
          const px = sumX / sumW;
          const py = sumY / sumW;
          return centerToPercent(left + px, top + py);
        }

        // Fallback: darkest-pixel centroid within unmasked area
        let minVal = 256;
        for (let i = maskCut * size; i < region.length; i++) {
          if (region[i] < minVal) minVal = region[i];
        }
        let darkW = 0;
        let darkX = 0;
        let darkY = 0;
        for (let y = maskCut; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const v = region[y * size + x];
            if (v === minVal) {
              darkW += 1;
              darkX += x;
              darkY += y;
            }
          }
        }
        if (darkW > 0) {
          const px = darkX / darkW;
          const py = darkY / darkW;
          return centerToPercent(left + px, top + py);
        }

        return null; // signal weak edges
      };

      try {
        const first = await attempt(0.08); // tighter crop
        if (first) return first;

        const second = await attempt(0.12); // expand once if no edges found
        if (second) return second;

        return clampBox(box);
      } catch {
        return clampBox(box);
      }
    };

    // Enhanced detailed prompt for mechanical symbol detection with coordinate correction
    const prompt = `You are analyzing a mechanical/HVAC blueprint. Your goal is to find ALL labeled mechanical components and return their precise coordinates.

⚠️ CRITICAL: You MUST find EVERY labeled component in the image. Scan systematically from top to bottom, left to right. Do not stop after finding a few - continue scanning until you've covered the entire blueprint.

STEP-BY-STEP PROCESS (FOLLOW IN ORDER):

STEP 1: SCAN FOR LABELS (SYSTEMATIC APPROACH)
Divide the image into a mental grid and scan each section thoroughly:
- Top row: left to right, looking for ALL labels
- Middle rows: left to right, looking for ALL labels  
- Bottom row: left to right, looking for ALL labels

Search for text labels of mechanical/HVAC/electrical components:
- FCU, FCU-1, FCU-2, FCU-3, FCU-01, FCU-02
- EF, EF-1, EF-2, EF-3, EF-01, EF-02
- SF, SF-1, SF-2, SF-01, SF-02
- AHU, AHU-1, AHU-2
- P, P-1, P-2, PUMP, PUMP-A, PUMP-B
- V, V-1, V-2, VALVE
- M, M-1, M-2, MOTOR
- Any numbered or lettered variations of mechanical equipment labels

STEP 2: TRACE TO COMPONENT
For each label found:
- If there's an arrow/leader line: follow it to the component symbol
- If no arrow: the component symbol is typically very close to the label
- The component is the graphical symbol (circle, rectangle, fan icon, etc.), NOT the text

STEP 3: PLACE BOUNDING BOX
Place the box ON THE COMPONENT SYMBOL ITSELF:
- x, y = center of the symbol (%, from top-left corner)
- width, height = size of the symbol (typically 3-12%)
- DO NOT place the box on the text label

STEP 4: VERIFY COORDINATES
Check each box placement:
- Left side of image → x should be < 50
- Right side of image → x should be > 50  
- Top half → y should be < 50
- Bottom half → y should be > 50
- If the component is in bottom-right but your y < 50, YOU PLACED IT ON THE LABEL - move the box down to the actual component

COORDINATE SYSTEM:
- Origin: top-left corner (0, 0)
- x increases going RIGHT (0 to 100)
- y increases going DOWN (0 to 100)
- All values are percentages of full image dimensions

SIZE GUIDELINES:
- Small valves/sensors: 2-5% width/height
- Medium FCU/pumps: 5-10% width/height  
- Large AHU/equipment: 10-12% width/height
- If you get width or height > 15%, you probably measured wrong - remeasure

CATEGORIES:
- hvac: FCU, AHU, EF, SF, fans, coils, air handlers, dampers, diffusers
- plumbing: pumps (P, PUMP), valves (V, VALVE), water heaters, tanks
- electrical: motors (M, MOTOR), panels, switches, controls
- mechanical: gears, bearings, couplings
- structural: beams, columns
- other: unclear category

CONFIDENCE SCORING:
- 95-100: Crystal clear label, obvious symbol, traced correctly
- 85-94: Clear label and symbol, minor placement uncertainty
- 70-84: Found label and symbol but coordinates are estimated
- 50-69: Uncertain detection or location

CRITICAL REMINDERS:
1. ⚠️ SCAN THE ENTIRE IMAGE SYSTEMATICALLY - divide into sections and check each one
2. ⚠️ COUNT all labeled components you can see - if you count 8 labels, you should return 8 symbols
3. The box goes on the SYMBOL, not the label text
4. Double-check your y-coordinates - if component is in lower half, y must be > 50
5. If the arrow clearly points to a component but the label is unreadable, include it with name "?" and describe what the component appears to be
6. Prefer dark/clear outlines; skip faint/light-gray background shapes
7. ⚠️ Before finishing, do a final pass to ensure you haven't missed any labeled components

OUTPUT (JSON ONLY, NO MARKDOWN):
{
  "symbols": [
    {
      "name": "FCU-1",
      "description": "Fan coil unit in upper right bedroom",
      "confidence": 92,
      "category": "hvac",
      "coordinates": {"x": 78.0, "y": 28.0, "width": 6.0, "height": 5.0}
    },
    {
      "name": "SF-2",
      "description": "Supply fan in left corridor",
      "confidence": 88,
      "category": "hvac",
      "coordinates": {"x": 22.0, "y": 45.0, "width": 7.0, "height": 6.0}
    },
    {
      "name": "EF-1",
      "description": "Exhaust fan in bathroom",
      "confidence": 85,
      "category": "hvac",
      "coordinates": {"x": 55.0, "y": 72.0, "width": 5.0, "height": 5.0}
    },
    {
      "name": "?",
      "description": "Arrow to pump-like symbol; label is illegible",
      "confidence": 78,
      "category": "mechanical",
      "coordinates": {"x": 46.0, "y": 62.0, "width": 7.0, "height": 6.0}
    }
  ],
  "summary": "Found 4 mechanical components across the entire blueprint after systematic scan",
  "overallConfidence": 85
}`;


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
      max_tokens: 4000, // Increased to handle blueprints with many symbols
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

      const rawName = typeof symbol.name === 'string' ? symbol.name.trim() : '';
      const name = rawName || '?';
      const description = symbol.description || (name === '?' ? 'Arrow-targeted component with unreadable label' : '');

      return {
        name,
        description,
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
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
const prompt = `You are analyzing a mechanical/HVAC blueprint floor plan to find ALL labeled mechanical components and return their precise coordinates.

🎯 PRIMARY GOAL: Find EVERY labeled mechanical component in this blueprint. Scan systematically and completely.

═══════════════════════════════════════════════════════════════════

SCANNING STRATEGY

Use a 3x3 grid approach - scan each section thoroughly:

    [Top-Left]      [Top-Center]      [Top-Right]
    [Middle-Left]   [Middle-Center]   [Middle-Right]  
    [Bottom-Left]   [Bottom-Center]   [Bottom-Right]

For each section:
1. Scan along the walls/perimeter first (most equipment is wall-mounted)
2. Then scan interior spaces
3. Look for both labels and leader lines
4. Check corners carefully
5. Use spatial context: nearby ductwork, plumbing lines, and room types (bathrooms, mechanical rooms) to identify likely equipment locations

═══════════════════════════════════════════════════════════════════

WHAT TO LOOK FOR

Common Equipment Labels on Residential/Commercial Floor Plans:

AIR HANDLING:
- FCU-1, FCU-2, FCU-3 (Fan Coil Units) - wall-mounted HVAC units
- AHU-1, AHU-2 (Air Handling Units)
- ERV-1, HRV-1 (Energy/Heat Recovery Ventilators)

VENTILATION:
- EF-1, EF-2 (Exhaust Fans) - typically in bathrooms/kitchens
- SF-1, SF-2 (Supply Fans) 
- RF-1 (Return Fan)
- Inline fans, bathroom fans, kitchen exhaust

CONTROLS & ELECTRICAL:
- EC-1, EC-2 (Electrical Controls or Equipment Controls)
- T-1, STAT-1 (Thermostats)
- VFD-1 (Variable Frequency Drive)

OTHER MECHANICAL:
- P-1, PUMP-1 (Pumps)
- V-1, VALVE-1 (Valves)
- Dryer booster fans, makeup air units

ANNOTATED TEXT (Informational, not components):
- "RUN IN TWO LINED JOIST BAYS"
- "DRYER BOOSTER FAN" (if pointing to a specific symbol, include it)
- "BATH", "KITCHEN" (room labels - skip these)

═══════════════════════════════════════════════════════════════════

LABEL PATTERNS & FORMATS

Equipment Tag Formats:
- [LETTERS]-[NUMBER]: FCU-1, EF-2, EC-3, SF-1
- [LETTERS][NUMBER]: FCU1, EF2
- Just letters: FCU, EF, SF (treat as component if it points to a symbol)

Location of Labels:
- Often OUTSIDE the floor plan boundary with leader lines pointing IN
- Sometimes directly adjacent to symbol (no leader line)
- Occasionally inside the symbol itself
- May be rotated/angled to fit space

═══════════════════════════════════════════════════════════════════

SYMBOL IDENTIFICATION

WHERE symbols typically appear:
- **At exterior walls**: FCU units, through-wall equipment
- **In bathrooms**: EF (exhaust fans) - small circles or squares on ceiling
- **In mechanical spaces**: larger equipment
- **Along ductwork runs**: inline fans, dampers

WHAT symbols look like:
- **FCU (Fan Coil Unit)**: Small rectangle or square, often at exterior wall, may show internal fan symbol
- **EF (Exhaust Fan)**: Small circle or square, usually ceiling-mounted (shown with circle symbol)
- **SF (Supply Fan)**: Similar to EF, may have directional arrow
- **EC (Electrical Control)**: Small rectangle or square symbol
- **Pumps**: Circle with "P" or curved impeller lines
- **Thermostats**: Small rectangle on wall

Symbol sizes on these plans:
- Very small (1-3%): thermostats, small fans, controls
- Small (2-5%): exhaust fans, FCUs, valves
- Medium (4-8%): larger equipment, grouped items

═══════════════════════════════════════════════════════════════════

TRACING LABELS TO SYMBOLS

LEADER LINE SCENARIOS:

1. **Label outside floor plan → Leader line points to wall-mounted equipment**
   - Follow the line (may be straight, angled, or curved)
   - Symbol is usually at the endpoint or very near it
   - Common for FCU, EF labels

2. **Label adjacent to symbol (no leader line)**
   - Symbol is within 1-2% distance of label
   - Usually directly beside, above, or below the label

3. **Label with arrow/callout**
   - Follow arrow to exact component
   - May cross multiple elements - trace carefully

4. **Multiple instances of same label** (e.g., two "FCU-1" labels)
   - Each label points to a separate physical unit
   - Create separate entries with different coordinates

═══════════════════════════════════════════════════════════════════

COORDINATE PLACEMENT RULES

⚠️ CRITICAL: Box the SYMBOL (the graphical equipment icon), NOT the text label!

RESOLUTION INDEPENDENCE:
- Images will have varying pixel dimensions (different widths and heights)
- ALWAYS express coordinates as PERCENTAGES (0-100) of total image dimensions
- DO NOT calculate or use absolute pixel values
- A symbol at 25% from the left edge = x: 25.0 (whether image is 500px or 5000px wide)

Coordinate System:
- Origin (0,0) = top-left corner
- X-axis: 0 (left edge) → 100 (right edge)
- Y-axis: 0 (top edge) → 100 (bottom edge)
- All values are percentages (0-100)

BOUNDING BOX SHAPE:
All bounding boxes must be:
- **Axis-aligned rectangles** (edges parallel to image edges, no rotation)
- **Tightly fitted** to the symbol with minimal padding
- **Excluding** the text label (unless label is inside the symbol)
- **Excluding** leader lines

For different symbol shapes:
- Circular symbols (fans, pumps): smallest square that fully contains the circle
- Rectangular symbols (FCUs, AHUs): match the rectangle's dimensions
- Irregular shapes: smallest rectangle containing the entire symbol

═══════════════════════════════════════════════════════════════════

COORDINATE CALCULATION METHOD

Follow this process for EACH symbol to ensure accuracy:

STEP 1 - Identify Symbol Boundaries (as percentages of image):
- Locate the leftmost edge of the symbol → x_left (e.g., 20%)
- Locate the rightmost edge of the symbol → x_right (e.g., 26%)
- Locate the topmost edge of the symbol → y_top (e.g., 15%)
- Locate the bottommost edge of the symbol → y_bottom (e.g., 20%)

STEP 2 - Calculate Center Point:
- x = (x_left + x_right) / 2
  Example: (20 + 26) / 2 = 23.0
- y = (y_top + y_bottom) / 2
  Example: (15 + 20) / 2 = 17.5

STEP 3 - Calculate Dimensions:
- width = x_right - x_left
  Example: 26 - 20 = 6.0
- height = y_bottom - y_top
  Example: 20 - 15 = 5.0

STEP 4 - Use Mental Grid for Calibration:
Imagine a 10×10 grid overlay (each cell = 10% × 10%):

     0   10   20   30   40   50   60   70   80   90  100
  0  ┌────┬────┬────┬────┬────┬────┬────┬────┬────┬────┐
 10  ├────┼────┼────┼────┼────┼────┼────┼────┼────┼────┤
 20  ├────┼────┼────┼────┼────┼────┼────┼────┼────┼────┤
 30  ├────┼────┼────┼────┼────┼────┼────┼────┼────┼────┤
 40  ├────┼────┼────┼────┼────┼────┼────┼────┼────┼────┤
 50  ├────┼────┼────┼────┼────┼────┼────┼────┼────┼────┤
 60  ├────┼────┼────┼────┼────┼────┼────┼────┼────┼────┤
 70  ├────┼────┼────┼────┼────┼────┼────┼────┼────┼────┤
 80  ├────┼────┼────┼────┼────┼────┼────┼────┼────┼────┤
 90  ├────┼────┼────┼────┼────┼────┼────┼────┼────┼────┤
100  └────┴────┴────┴────┴────┴────┴────┴────┴────┴────┘

- Symbol in grid cell (2,1) → approximately x=25, y=15
- Symbol spanning cells (7-8, 4-5) → approximately x=75, y=45, width=10, height=10

STEP 5 - Verify Using Multiple Methods:

Method 1 - Quadrant Check:
□ Symbol in top-left quadrant? → x should be 0-50 AND y should be 0-50
□ Symbol in top-right quadrant? → x should be 50-100 AND y should be 0-50
□ Symbol in bottom-left quadrant? → x should be 0-50 AND y should be 50-100
□ Symbol in bottom-right quadrant? → x should be 50-100 AND y should be 50-100

Method 2 - Edge Distance Check:
□ If symbol appears 20% from left edge → x should be ≈ 20
□ If symbol appears 15% from right edge → x should be ≈ 85 (100 - 15)
□ If symbol appears 10% from top edge → y should be ≈ 10
□ If symbol appears 25% from bottom edge → y should be ≈ 75 (100 - 25)

Method 3 - Size Sanity Check:
□ Small symbols (fans, valves): width and height typically 2-5%
□ Medium symbols (FCUs, pumps): width and height typically 4-8%
□ Large symbols (AHUs): width and height typically 8-15%
□ If calculated width or height > 20% → likely ERROR, remeasure

PRECISION REQUIREMENTS:
- Use ONE decimal place (e.g., 45.5, not 45.532 or 45)
- Round to nearest 0.5 (e.g., 23.7 → 23.5, 67.3 → 67.5, 89.8 → 90.0)
- Center coordinates (x, y): ±2% accuracy is acceptable
- Dimensions (width, height): ±1% accuracy is acceptable

═══════════════════════════════════════════════════════════════════

COMMON COORDINATE ERRORS TO AVOID

❌ ERROR 1: Measuring from Label Instead of Symbol
- Label outside plan at y=5, symbol inside at y=30
- Wrong: {y: 5.0} ✗
- Right: {y: 30.0} ✓

❌ ERROR 2: Including Label Text in Width/Height
- Symbol is 3% wide, label text adds 5% more width
- Wrong: {width: 8.0} ✗
- Right: {width: 3.0} ✓

❌ ERROR 3: Quadrant Mismatch
- Symbol clearly in bottom-right but coordinates show top-left
- Wrong: {x: 25.0, y: 20.0} ✗
- Right: {x: 75.0, y: 70.0} ✓

❌ ERROR 4: Unrealistic Dimensions
- Small exhaust fan with huge bounding box
- Wrong: {width: 25.0, height: 30.0} ✗
- Right: {width: 3.0, height: 3.0} ✓

═══════════════════════════════════════════════════════════════════

VALIDATION CHECKS

Before finalizing coordinates, verify:
- Symbol on LEFT half → x should be 0-50 ✓
- Symbol on RIGHT half → x should be 50-100 ✓
- Symbol in TOP half → y should be 0-50 ✓
- Symbol in BOTTOM half → y should be 50-100 ✓

Expected Symbol Sizes:
- Tiny (1-3%): small controls, sensors
- Small (2-5%): most fans, FCUs, thermostats
- Medium (4-8%): larger equipment
- ⚠️ If width or height > 15%, recheck your measurement

═══════════════════════════════════════════════════════════════════

EDGE CASES

- **Duplicate equipment labels**: If you see "FCU-1" twice, there are 2 separate FCU-1 units - create 2 entries
- **Unclear/illegible label**: Use name "?" with description of symbol
- **Descriptive text without symbol**: "DRYER BOOSTER FAN" text only → skip unless there's a symbol
- **Descriptive text WITH symbol**: "DRYER BOOSTER FAN" + fan symbol → include it with that name
- **Very faint symbols**: Include only if clearly intentional (not background grid lines)
- **Grouped equipment**: Label points to multiple items → try to identify each separately

═══════════════════════════════════════════════════════════════════

CONFIDENCE LEVELS

95-100: Label clear, symbol obvious, position certain
85-94:  Label and symbol both clear, minor position uncertainty  
70-84:  Partial obscurity or position estimation required
50-69:  Significant uncertainty
<50:    Skip - too uncertain to include

═══════════════════════════════════════════════════════════════════

CATEGORIES

- **hvac**: FCU, AHU, ERV, HRV, fans, air handlers, diffusers, grilles, ductwork equipment
- **ventilation**: EF, SF, RF, exhaust/supply/return fans, bathroom fans, kitchen hoods
- **plumbing**: pumps, valves, water heaters, drains
- **electrical**: EC, motors, panels, VFDs
- **controls**: thermostats, sensors, actuators, controllers
- **other**: unclear or doesn't fit above

═══════════════════════════════════════════════════════════════════

PRE-SUBMISSION CHECKLIST

□ Scanned all 9 grid sections?
□ Checked perimeter walls thoroughly (where most equipment is)?
□ Counted visible labels - does output match?
□ Verified boxes are on SYMBOLS not LABELS?
□ Checked that bottom-half components have y > 50?
□ Checked that right-half components have x > 50?
□ Included duplicate equipment instances separately?
□ Examined corners and edges?
□ Reasonable symbol sizes (mostly 1-8%)?
□ Used mental 10×10 grid to verify coordinate positions?
□ Coordinates expressed as percentages (0-100), not pixels?

═══════════════════════════════════════════════════════════════════

OUTPUT FORMAT

Return ONLY valid JSON with NO markdown backticks:

{
  "symbols": [
    {
      "name": "FCU-1",
      "description": "Fan coil unit on exterior wall in upper left bedroom",
      "confidence": 92,
      "category": "hvac",
      "coordinates": {"x": 35.0, "y": 25.0, "width": 3.5, "height": 3.0}
    },
    {
      "name": "EF-1",
      "description": "Exhaust fan in left bathroom, ceiling mounted",
      "confidence": 88,
      "category": "ventilation",
      "coordinates": {"x": 18.0, "y": 48.0, "width": 2.5, "height": 2.5}
    },
    {
      "name": "SF-2",
      "description": "Supply fan in lower mechanical area",
      "confidence": 85,
      "category": "ventilation",
      "coordinates": {"x": 52.0, "y": 78.0, "width": 3.0, "height": 3.0}
    }
  ],
  "summary": "Found X mechanical components through systematic 9-section scan. Perimeter walls and bathrooms examined carefully.",
  "totalComponentsFound": 3,
  "overallConfidence": 88,
  "scanningNotes": "Multiple FCU-1 units found. Small exhaust fans required careful examination. Some labels positioned outside floor plan boundary with leader lines."
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
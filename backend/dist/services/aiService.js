"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAIServiceHealth = exports.validateImageForAnalysis = exports.getAnalysisCost = exports.analyzeBlueprint = void 0;
const openai_1 = __importDefault(require("openai"));
const sharp_1 = __importDefault(require("sharp"));
// Initialize OpenAI client
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
const isRecord = (value) => typeof value === 'object' && value !== null;
/**
 * Map AI response categories to expected DetectedSymbol categories
 */
function mapCategoryToExpectedFormat(category) {
    if (!category)
        return 'other';
    const lowerCategory = category.toLowerCase().trim();
    const categoryMap = {
        hydraulic: 'hydraulic',
        plumbing: 'hydraulic',
        valve: 'hydraulic',
        pump: 'hydraulic',
        water: 'hydraulic',
        pneumatic: 'pneumatic',
        compressed_air: 'pneumatic',
        mechanical: 'mechanical',
        hvac: 'mechanical',
        ventilation: 'mechanical',
        fan: 'mechanical',
        structural: 'mechanical',
        controls: 'electrical',
        control: 'electrical',
        electrical: 'electrical',
        electric: 'electrical',
        vfd: 'electrical',
        motor: 'electrical',
        other: 'other',
        unknown: 'other'
    };
    if (categoryMap[lowerCategory]) {
        return categoryMap[lowerCategory];
    }
    if (lowerCategory.includes('hvac') || lowerCategory.includes('vent') || lowerCategory.includes('fan')) {
        return 'mechanical';
    }
    if (lowerCategory.includes('plumb') || lowerCategory.includes('hydra') || lowerCategory.includes('pump') || lowerCategory.includes('valve')) {
        return 'hydraulic';
    }
    if (lowerCategory.includes('elect') || lowerCategory.includes('control') || lowerCategory.includes('motor')) {
        return 'electrical';
    }
    return 'other';
}
const normalizeSymbolConfidence = (rawConfidence) => {
    const numeric = Number(rawConfidence);
    if (!Number.isFinite(numeric) || numeric <= 0)
        return 0;
    const decimal = numeric > 1 ? numeric / 100 : numeric;
    return Math.max(0, Math.min(1, decimal));
};
const normalizeOverallConfidence = (rawConfidence) => {
    const numeric = Number(rawConfidence);
    if (!Number.isFinite(numeric) || numeric <= 0)
        return 0;
    const percent = numeric <= 1 ? numeric * 100 : numeric;
    return Math.max(0, Math.min(100, percent));
};
/**
 * Analyze a blueprint image using OpenAI Vision API to detect mechanical symbols
 */
const analyzeBlueprint = async (imageBuffer, mimeType = 'image/jpeg') => {
    const startTime = Date.now();
    try {
        // Convert buffer to base64
        const base64Image = imageBuffer.toString('base64');
        const dataUrl = `data:${mimeType};base64,${base64Image}`;
        // Utility: clamp and sanitize boxes (percentages)
        const clampBox = (coords) => {
            const safe = isRecord(coords) ? coords : {};
            const width = Math.min(12, Math.max(3, Number(safe.width ?? 7)));
            const height = Math.min(12, Math.max(3, Number(safe.height ?? 7)));
            const x = Math.min(100, Math.max(0, Number(safe.x ?? 50)));
            const y = Math.min(100, Math.max(0, Number(safe.y ?? 50)));
            return { x, y, width, height };
        };
        // Optional recenter using Sobel edge magnitude + centroid to better lock onto outlines
        const recenterBox = async (box, meta) => {
            const imgW = meta.width || 1000;
            const imgH = meta.height || 1000;
            const centerToPercent = (px, py) => clampBox({
                x: (px / imgW) * 100,
                y: (py / imgH) * 100,
                width: box.width,
                height: box.height
            });
            // Try with a tighter crop first; expand once if edges are weak
            const attempt = async (scale) => {
                const cxPx = (box.x / 100) * imgW;
                const cyPx = (box.y / 100) * imgH;
                const base = Math.max(imgW, imgH) * scale;
                const size = Math.max(64, Math.min(256, Math.round(base))); // keep small for speed
                const left = Math.max(0, Math.min(imgW - size, Math.round(cxPx - size / 2)));
                const top = Math.max(0, Math.min(imgH - size, Math.round(cyPx - size / 2)));
                const region = await (0, sharp_1.default)(imageBuffer)
                    .extract({ left, top, width: size, height: size })
                    .greyscale()
                    .raw()
                    .toBuffer();
                // Sobel edge magnitude (3x3) to focus on outlines, not dark text
                const gx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
                const gy = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
                const mag = new Array(size * size).fill(0);
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
                    for (let x = 0; x < size; x++)
                        mag[y * size + x] = 0;
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
                    if (region[i] < minVal)
                        minVal = region[i];
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
                if (first)
                    return first;
                const second = await attempt(0.12); // expand once if no edges found
                if (second)
                    return second;
                return clampBox(box);
            }
            catch {
                return clampBox(box);
            }
        };
        const prompt = `You are a senior MEP plan reviewer. Detect labeled mechanical/HVAC components in this blueprint image.

Requirements:
- Return ONLY strict JSON (no markdown, no commentary).
- Find symbols, not room text.
- If a label has a leader line, box the symbol at the leader endpoint (not the label text).
- Include duplicates when the same tag appears at different locations (for example, two FCU-1 units).
- Ignore uncertain detections below 50 confidence.

Scanning process:
1. Scan top-left to top-right, then middle row, then bottom row.
2. In each section, check perimeter walls first, then interior spaces.
3. Check corners and boundary callouts outside the floor plan.

Coordinate rules:
- Use percentages only (0-100), origin at top-left.
- Coordinates represent the symbol box center and size:
  x, y = center point
  width, height = box dimensions
- Use axis-aligned boxes tightly around the symbol icon.
- Exclude label text and leader lines from the box.
- Typical symbol size is 1-12 percent of image width/height.

Output schema:
{
  "symbols": [
    {
      "name": "string",
      "description": "string",
      "confidence": 0-100,
      "category": "hydraulic|pneumatic|mechanical|electrical|other",
      "coordinates": {
        "x": 0-100,
        "y": 0-100,
        "width": 0-100,
        "height": 0-100
      }
    }
  ],
  "summary": "string",
  "overallConfidence": 0-100
}

Category guidance:
- mechanical: FCU, AHU, ERV, HRV, EF, SF, RF, fans, dampers, duct-related units
- hydraulic: pumps, valves, plumbing devices, water-side equipment
- electrical: motors, VFD, panels, controllers
- pneumatic: compressed-air components
- other: unclear class

Quality checks before returning:
- All coordinates are percentages and within 0-100.
- Each symbol has non-empty name and coordinates.
- Boxes are on symbol graphics, not text labels.`;
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
            temperature: 0.1, // Lower temperature for more consistent analysis
            response_format: { type: "json_object" }
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
        let analysisData = {};
        try {
            // Try multiple patterns to extract JSON
            let jsonString = aiResponse.trim();
            // Remove markdown code blocks if present
            const codeBlockMatch = aiResponse.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
            if (codeBlockMatch) {
                jsonString = codeBlockMatch[1];
                console.log('🤖 Extracted from code block:', jsonString);
            }
            else {
                // Try to find JSON object pattern
                const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    jsonString = jsonMatch[0];
                    console.log('🤖 Extracted JSON pattern:', jsonString);
                }
                else {
                    console.log('🤖 No JSON pattern found in response');
                    throw new Error('No JSON found in AI response');
                }
            }
            const parsed = JSON.parse(jsonString);
            analysisData = isRecord(parsed) ? parsed : {};
            console.log('🤖 Successfully parsed JSON:', analysisData);
            // Log detailed symbol data for debugging
            if (analysisData.symbols && analysisData.symbols.length > 0) {
                console.log(`🔍 AI returned ${analysisData.symbols.length} symbols:`);
                analysisData.symbols.forEach((symbol, index) => {
                    const coords = clampBox(symbol.coordinates);
                    console.log(`  Symbol ${index + 1}: "${symbol.name}" - confidence: ${symbol.confidence}, category: ${symbol.category}, coords: (${coords.x}, ${coords.y})`);
                });
            }
            else {
                console.log('⚠️ No symbols returned by AI or symbols array is empty');
            }
            // Check if response was truncated
            if (aiResponse.length > 14000) { // Close to token limit
                console.log('⚠️ AI response might be truncated due to token limit. Consider increasing max_tokens.');
            }
        }
        catch (parseError) {
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
        const meta = await (0, sharp_1.default)(imageBuffer).metadata();
        // Structure the final result - map AI response to DetectedSymbol interface
        const symbolsArray = await Promise.all((analysisData.symbols || []).map(async (symbol) => {
            const confidence = normalizeSymbolConfidence(symbol.confidence);
            console.log(`🔍 Symbol "${symbol.name}" normalized confidence:`, confidence);
            const clamped = clampBox(symbol.coordinates);
            const recentered = await recenterBox(clamped, meta);
            const rawName = typeof symbol.name === 'string' ? symbol.name.trim() : '';
            const name = rawName || '?';
            const description = symbol.description || (name === '?' ? 'Arrow-targeted component with unreadable label' : '');
            return {
                name,
                description,
                confidence: confidence,
                category: mapCategoryToExpectedFormat(symbol.category || ''),
                coordinates: recentered
            };
        }));
        // Filter out obviously bad boxes after clamping
        const symbols = symbolsArray.filter((s) => Number.isFinite(s.coordinates?.x) && Number.isFinite(s.coordinates?.y));
        const summary = typeof analysisData.summary === 'string' && analysisData.summary.trim().length > 0
            ? analysisData.summary
            : 'Analysis completed';
        const result = {
            symbols,
            totalSymbols: symbols.length,
            analysisTimestamp: new Date(),
            processingTime,
            confidence: normalizeOverallConfidence(analysisData.overallConfidence),
            summary
        };
        console.log(`AI Analysis completed: ${result.totalSymbols} symbols detected in ${processingTime}ms`);
        console.log(`🔍 Final confidence values:`, result.symbols.map(s => ({ name: s.name, confidence: s.confidence })));
        console.log(`🔍 Overall confidence: ${result.confidence}`);
        return result;
    }
    catch (error) {
        const errorObject = isRecord(error) ? error : {};
        const errorMessage = typeof errorObject.message === 'string' ? errorObject.message : 'Unknown error';
        const errorCode = typeof errorObject.code === 'string' ? errorObject.code : undefined;
        const errorType = typeof errorObject.type === 'string' ? errorObject.type : undefined;
        const errorStatus = typeof errorObject.status === 'number' ? errorObject.status : undefined;
        console.error('Error in AI blueprint analysis:', error);
        console.error('Error details:', {
            message: errorMessage,
            code: errorCode,
            type: errorType,
            status: errorStatus
        });
        // Enhanced fallback for development and testing
        const isDevelopment = process.env.NODE_ENV === 'development';
        const isQuotaError = errorCode === 'insufficient_quota' ||
            errorMessage.includes('quota') ||
            errorMessage.includes('billing');
        // Provide enhanced mock data for testing and development
        if (isDevelopment || isQuotaError) {
            console.log('🧪 Using enhanced mock AI analysis data');
            return {
                symbols: [
                    {
                        name: 'Hydraulic Pump',
                        description: 'Variable displacement hydraulic pump for system pressure generation',
                        confidence: 0.88, // Already in decimal format (0-1)
                        category: 'hydraulic',
                        coordinates: { x: 15, y: 20, width: 8, height: 6 } // Percentage coordinates
                    },
                    {
                        name: '3-Way Ball Valve',
                        description: 'Three-way directional control valve for flow routing',
                        confidence: 0.82,
                        category: 'hydraulic',
                        coordinates: { x: 35, y: 25, width: 5, height: 4 }
                    },
                    {
                        name: 'Pressure Relief Valve',
                        description: 'System overpressure protection valve set at maximum working pressure',
                        confidence: 0.95,
                        category: 'hydraulic',
                        coordinates: { x: 25, y: 15, width: 4, height: 3 }
                    },
                    {
                        name: 'Hydraulic Cylinder',
                        description: 'Double-acting hydraulic actuator for linear motion',
                        confidence: 0.90,
                        category: 'hydraulic',
                        coordinates: { x: 55, y: 30, width: 10, height: 5 }
                    },
                    {
                        name: 'Pressure Sensor',
                        description: 'Electronic pressure transducer for system monitoring',
                        confidence: 0.87,
                        category: 'electrical',
                        coordinates: { x: 45, y: 20, width: 3, height: 3 }
                    },
                    {
                        name: 'Flow Control Valve',
                        description: 'Adjustable flow restriction valve for speed control',
                        confidence: 0.79,
                        category: 'hydraulic',
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
exports.analyzeBlueprint = analyzeBlueprint;
/**
 * Get AI analysis cost estimate (for usage tracking)
 */
const getAnalysisCost = (imageSize) => {
    // OpenAI Vision pricing is approximately $0.01 per image
    // We can track this for user quotas
    return 0.01; // Base cost per analysis
};
exports.getAnalysisCost = getAnalysisCost;
/**
 * Validate if the image is suitable for AI analysis
 */
const validateImageForAnalysis = (buffer, mimeType) => {
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
exports.validateImageForAnalysis = validateImageForAnalysis;
/**
 * Check if OpenAI API is available and configured
 */
const checkAIServiceHealth = async () => {
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
    }
    catch (error) {
        return {
            available: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
};
exports.checkAIServiceHealth = checkAIServiceHealth;

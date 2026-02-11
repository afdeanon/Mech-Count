import { useState, useRef, useCallback, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Move, Brain, Clock, CheckCircle, XCircle, AlertCircle, Eye, EyeOff, Plus, Trash2, Pencil, MehIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Blueprint } from '@/types';
import { EnhancedSymbolAnalysis } from '@/components/AI/EnhancedSymbolAnalysis';

interface BlueprintViewerProps {
  blueprint: Blueprint;
  showSymbols?: boolean;
  onSymbolsChange?: (symbols: Blueprint['symbols']) => void;
}

export function BlueprintViewer({ blueprint, showSymbols = true, onSymbolsChange }: BlueprintViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggingSymbolId, setDraggingSymbolId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showSymbolOverlays, setShowSymbolOverlays] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0, offsetX: 0, offsetY: 0 });
  const [symbols, setSymbols] = useState(blueprint.symbols);
  const [isAddingSymbol, setIsAddingSymbol] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.5));
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (draggingSymbolId || isAddingSymbol) return; // block pan while dragging a box or adding symbol
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [pan, draggingSymbolId, isAddingSymbol]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && !draggingSymbolId) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  }, [isDragging, dragStart, draggingSymbolId]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDraggingSymbolId(null);
  }, []);

  // Calculate displayed image dimensions and position
  const updateImageDimensions = useCallback(() => {
    if (imageRef.current && wrapperRef.current) {
      const imageRect = imageRef.current.getBoundingClientRect();
      const wrapperRect = wrapperRef.current.getBoundingClientRect();

      setImageDimensions({
        width: imageRect.width,
        height: imageRect.height,
        offsetX: imageRect.left - wrapperRect.left,
        offsetY: imageRect.top - wrapperRect.top
      });

      console.log('📐 Image dimensions updated:', {
        displayedWidth: imageRect.width,
        displayedHeight: imageRect.height,
        offsetX: imageRect.left - wrapperRect.left,
        offsetY: imageRect.top - wrapperRect.top
      });
    }
  }, []);

  // Handle image load
  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
    updateImageDimensions();
  }, [updateImageDimensions]);

  // Helper function to convert percentage coordinates to pixels based on displayed image size
  const convertPercentageToPixels = useCallback((percentageCoords: { x: number; y: number; width: number; height: number }) => {
    if (!imageRef.current) {
      console.warn('🚫 Image ref not available for coordinate conversion');
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    const displayedWidth = imageRef.current.clientWidth;
    const displayedHeight = imageRef.current.clientHeight;

    const pixelCoords = {
      x: (percentageCoords.x / 100) * displayedWidth,
      y: (percentageCoords.y / 100) * displayedHeight,
      width: (percentageCoords.width / 100) * displayedWidth,
      height: (percentageCoords.height / 100) * displayedHeight
    };

    console.log(`📐 Converting coordinates for symbol:`, {
      percentage: percentageCoords,
      displaySize: { width: displayedWidth, height: displayedHeight },
      pixels: pixelCoords
    });

    return pixelCoords;
  }, []);

  const convertPixelsToPercentage = useCallback((pixelCoords: { x: number; y: number }) => {
    if (!imageRef.current) return { x: 0, y: 0 };
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((pixelCoords.x - rect.left) / rect.width) * 100;
    const y = ((pixelCoords.y - rect.top) / rect.height) * 100;
    return { x, y };
  }, []);

  // Keep local symbols in sync with incoming blueprint data
  useEffect(() => {
    setSymbols(blueprint.symbols);
  }, [blueprint.symbols]);

  // Global mouse move handler for smooth symbol dragging
  useEffect(() => {
    if (!draggingSymbolId) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const pct = convertPixelsToPercentage({ x: e.clientX, y: e.clientY });
      setSymbols(prev => {
        const updated = prev.map(s => {
          if (s.id !== draggingSymbolId) return s;
          const newX = Math.min(100 - s.position.width, Math.max(0, pct.x - dragOffset.x));
          const newY = Math.min(100 - s.position.height, Math.max(0, pct.y - dragOffset.y));
          return {
            ...s,
            position: {
              ...s.position,
              x: newX,
              y: newY,
            }
          };
        });
        onSymbolsChange?.(updated);
        return updated;
      });
    };

    const handleGlobalMouseUp = () => {
      setDraggingSymbolId(null);
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [draggingSymbolId, dragOffset, convertPixelsToPercentage, onSymbolsChange]);

  // Update dimensions on window resize
  useEffect(() => {
    const handleResize = () => {
      if (imageLoaded) {
        updateImageDimensions();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [imageLoaded, updateImageDimensions]);

  const normalizeCategory = (input: string): 'hydraulic' | 'pneumatic' | 'mechanical' | 'electrical' | 'other' => {
    const raw = (input || '').trim().toLowerCase();
    const aliasMap: Record<string, 'hydraulic' | 'pneumatic' | 'mechanical' | 'electrical' | 'other'> = {
      hvac: 'hydraulic',
      hydraulics: 'hydraulic',
      hydraulic: 'hydraulic',
      hydrolics: 'hydraulic',
      hydrolic: 'hydraulic',
      pneumatics: 'pneumatic',
      pneumatic: 'pneumatic',
      mech: 'mechanical',
      mechanical: 'mechanical',
      electric: 'electrical',
      electrical: 'electrical',
    };
    return aliasMap[raw] || 'other';
  };

  const handleImageClick = useCallback((e: React.MouseEvent) => {
    if (!isAddingSymbol) return;
    e.stopPropagation();

    const pct = convertPixelsToPercentage({ x: e.clientX, y: e.clientY });
    const name = prompt('Enter symbol name (e.g., FCU-4, EF-3):');
    if (!name) return;

    const categoryInput = prompt('Enter category (hydraulic/hvac, pneumatic, mechanical, electrical, other):') || 'other';
    const category = normalizeCategory(categoryInput);

    // Calculate average width/height of existing AI-detected symbols
    const aiSymbols = symbols.filter(s => !s.id?.startsWith('manual-'));
    let avgWidth = 6, avgHeight = 6;
    if (aiSymbols.length > 0) {
      avgWidth = aiSymbols.reduce((sum, s) => sum + (s.position?.width || 0), 0) / aiSymbols.length;
      avgHeight = aiSymbols.reduce((sum, s) => sum + (s.position?.height || 0), 0) / aiSymbols.length;
    }

    const newSymbol = {
      id: `manual-${Date.now()}`,
      name: name.trim(),
      description: 'Manually added symbol',
      category,
      type: category,
      position: {
        x: Math.max(0, Math.min(100 - avgWidth, pct.x - avgWidth / 2)),
        y: Math.max(0, Math.min(100 - avgHeight, pct.y - avgHeight / 2)),
        width: avgWidth,
        height: avgHeight,
      },
      confidence: 1.0,
    };

    setSymbols(prev => {
      const updated = [...prev, newSymbol];
      onSymbolsChange?.(updated);
      return updated;
    });
    setIsAddingSymbol(false);
  }, [isAddingSymbol, convertPixelsToPercentage, onSymbolsChange, symbols]);

  const handleDeleteSymbol = useCallback((symbolId: string) => {
    setSymbols(prev => {
      const updated = prev.filter(s => s.id !== symbolId);
      onSymbolsChange?.(updated);
      return updated;
    });
  }, [onSymbolsChange]);

  const handleRenameSymbol = useCallback((symbolId: string) => {
    const newName = prompt('Enter new symbol label (e.g., FCU-4, EF-3):');
    if (!newName) return;

    const newPartName = prompt('Enter mechanical part name/description (e.g., Supply fan, Pump, Motor):');

    const categoryInput = prompt('Enter category (hydraulic/hvac, pneumatic, mechanical, electrical, other):');
    setSymbols(prev => {
      const updated = prev.map(s => s.id === symbolId ? {
        ...s,
        name: newName.trim(),
        description: newPartName ? newPartName.trim() : s.description,
        category: categoryInput ? normalizeCategory(categoryInput) : s.category,
        type: categoryInput ? normalizeCategory(categoryInput) : s.type,
      } : s);
      onSymbolsChange?.(updated);
      return updated;
    });
  }, [onSymbolsChange]);

  const getSymbolColor = (category: string) => {
    const colors = {
      hydraulic: '#3b82f6',    // blue-500
      pneumatic: '#22c55e',    // green-500
      mechanical: '#f97316',   // orange-500
      electrical: '#eab308',   // yellow-500
      other: '#6b7280'         // gray-500
    };
    return colors[category as keyof typeof colors] || '#6b7280';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-yellow-500 animate-spin" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const blueprintWithLocalSymbols: Blueprint = {
    ...blueprint,
    symbols,
  };

  return (
    <div className="blueprint-viewer relative">

      {/* Floating Controls */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2 bg-white/80 rounded-lg shadow-lg p-2 border border-slate-200 ml-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={handleZoomIn}
          className="glass"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleZoomOut}
          className="glass"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleReset}
          className="glass"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
        {symbols.length > 0 && (
          <Button
            size="sm"
            variant={showSymbolOverlays ? "default" : "secondary"}
            onClick={() => setShowSymbolOverlays(!showSymbolOverlays)}
            className="glass"
            title={showSymbolOverlays ? "Hide symbol boxes" : "Show symbol boxes"}
          >
            {showSymbolOverlays ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </Button>
        )}
        <Button
          size="sm"
          variant={isAddingSymbol ? "default" : "secondary"}
          onClick={() => setIsAddingSymbol(!isAddingSymbol)}
          className="glass"
          title={isAddingSymbol ? "Cancel adding symbol" : "Add missing symbol"}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Title (left) - AI Analysis Status (right) */}
      <div className="flex justify-between items-center p-6 bg-white border-b border-slate-200">
        <div className="text-xl font-semibold text-foreground truncate max-w-[40vw]" title={blueprint.name}>{blueprint.name}</div>
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4" />
          {getStatusIcon(blueprint.status)}
          <span className="text-sm font-medium">
            {blueprint.aiAnalysis?.isAnalyzed ? 'AI Analyzed' : 'Processing...'}
          </span>
          {blueprint.aiAnalysis?.confidence > 0 && (
            <Badge variant="secondary" className="text-xs">
              {blueprint.aiAnalysis.confidence}% confidence
            </Badge>
          )}
          <div className="glass px-3 py-1 text-sm font-mono">
            {Math.round(zoom * 100)}%
          </div>
        </div>
      </div>
      {/* Viewer Container */}
      <div
        ref={containerRef}
        className={`w-full h-[700px] overflow-hidden bg-slate-50 relative ${isAddingSymbol ? 'cursor-crosshair' : 'cursor-move'
          }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {isAddingSymbol && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg pointer-events-none">
            Click on the blueprint to place a symbol
          </div>
        )}
        <div className="flex justify-center items-center h-full w-full">
          <div
            ref={wrapperRef}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
            }}
            className="relative origin-top-left transition-transform duration-100"
          >
            {/* Blueprint Image */}
            <img
              ref={imageRef}
              src={blueprint.imageUrl}
              alt={blueprint.name}
              className="max-w-none select-none"
              draggable={false}
              onLoad={handleImageLoad}
              onClick={handleImageClick}
              style={{
                width: '800px',
                height: 'auto', // Preserve aspect ratio
                objectFit: 'contain' // Prevent stretching
              }}
            />

            {/* Symbol Overlays */}
          {showSymbols && showSymbolOverlays && imageLoaded && symbols.map((symbol) => {
            // Convert percentage coordinates to pixels based on actual displayed image size
            const pixelPosition = convertPercentageToPixels(symbol.position);

            const startDragSymbol = (e: React.MouseEvent) => {
              e.stopPropagation();
              const pointer = { x: e.clientX, y: e.clientY };
              const pct = convertPixelsToPercentage(pointer);
              setDraggingSymbolId(symbol.id);
              setDragOffset({
                x: pct.x - symbol.position.x,
                y: pct.y - symbol.position.y,
              });
            };

            console.log('🎯 Rendering symbol:', {
              id: symbol.id,
              name: symbol.name,
              percentagePosition: symbol.position,
              pixelPosition: pixelPosition,
              category: symbol.category,
              confidence: symbol.confidence
            });

            return (
              <div
                key={symbol.id}
                className={`absolute border-3 bg-opacity-25 rounded-md hover:bg-opacity-40 shadow-lg group ${draggingSymbolId === symbol.id ? 'cursor-grabbing scale-105' : 'cursor-grab hover:scale-102'
                  }`}
                style={{
                  left: `${pixelPosition.x}px`,
                  top: `${pixelPosition.y}px`,
                  width: `${pixelPosition.width}px`,
                  height: `${pixelPosition.height}px`,
                  borderColor: getSymbolColor(symbol.category || 'other'),
                  backgroundColor: getSymbolColor(symbol.category || 'other') + '40',
                  borderWidth: draggingSymbolId === symbol.id ? '4px' : '3px',
                  borderStyle: 'solid',
                  transition: draggingSymbolId === symbol.id ? 'none' : 'all 0.2s'
                }}
                title={`${symbol.name}${symbol.description ? ': ' + symbol.description : ''} (${Math.round(symbol.confidence * 100)}% confidence) - Drag to reposition`}
                onMouseDown={startDragSymbol}
              >
                {/* Action Buttons (show on hover) */}
                <div className="absolute -top-3 -right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                  <button
                    className="w-6 h-6 bg-white border border-gray-200 hover:border-blue-500 text-gray-700 hover:text-blue-600 rounded-full flex items-center justify-center shadow-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRenameSymbol(symbol.id);
                    }}
                    title="Rename symbol"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    className="w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSymbol(symbol.id);
                    }}
                    title="Delete symbol"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                {/* Confidence Badge */}
                <div
                  className="absolute -top-6 left-0 text-xs font-bold text-white px-2 py-1 rounded-t-md shadow-sm"
                  style={{
                    backgroundColor: getSymbolColor(symbol.category || 'other'),
                    minWidth: 'fit-content'
                  }}
                >
                  {Math.round(symbol.confidence * 100)}%
                </div>

                {/* Symbol Name Label */}
                <div
                  className="absolute -bottom-6 left-0 text-xs font-medium text-gray-900 px-2 py-1 rounded-b-md shadow-sm max-w-32 truncate"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: `1px solid ${getSymbolColor(symbol.category || 'other')}`
                  }}
                >
                  {symbol.name}
                </div>

                {/* Center crosshair for precise positioning */}
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                  <div
                    className="w-3 h-3 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: getSymbolColor(symbol.category || 'other') }}
                  />
                </div>
              </div>
            );
          })}
          </div>
        </div>
      </div>
    </div>
  );
}

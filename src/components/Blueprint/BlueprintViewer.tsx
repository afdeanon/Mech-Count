import { useState, useRef, useCallback, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Move, Brain, Clock, CheckCircle, XCircle, AlertCircle, Eye, EyeOff, Plus, Trash2, Pencil, MehIcon, Save, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Blueprint } from '@/types';
import { EnhancedSymbolAnalysis } from '@/components/AI/EnhancedSymbolAnalysis';
import { getSymbolColorByName, withAlpha } from '@/lib/symbolColors';

interface BlueprintViewerProps {
  blueprint: Blueprint;
  showSymbols?: boolean;
  onSymbolsChange?: (symbols: Blueprint['symbols']) => void;
  hasUnsavedChanges?: boolean;
  onSaveChanges?: () => void;
  isSavingChanges?: boolean;
}

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se';
type OverlayShape = 'rectangle' | 'rounded' | 'circle' | 'diamond' | 'pill';

export function BlueprintViewer({
  blueprint,
  showSymbols = true,
  onSymbolsChange,
  hasUnsavedChanges = false,
  onSaveChanges,
  isSavingChanges = false,
}: BlueprintViewerProps) {
  const LOW_CONFIDENCE_THRESHOLD = 0.75;
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggingSymbolId, setDraggingSymbolId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizingSymbol, setResizingSymbol] = useState<{ id: string; handle: ResizeHandle } | null>(null);
  const [showSymbolOverlays, setShowSymbolOverlays] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0, offsetX: 0, offsetY: 0 });
  const [symbols, setSymbols] = useState(blueprint.symbols);
  const [history, setHistory] = useState<Blueprint['symbols'][]>([]);
  const [isAddingSymbol, setIsAddingSymbol] = useState(false);
  const [reviewLowConfidenceOnly, setReviewLowConfidenceOnly] = useState(false);

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
    if (draggingSymbolId || resizingSymbol || isAddingSymbol) return; // block pan while dragging/resizing/adding symbol
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [pan, draggingSymbolId, resizingSymbol, isAddingSymbol]);

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
    setResizingSymbol(null);
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

  // AI coordinates use center-point percentages, so convert center-based percentages to pixel box + center.
  const convertPercentageToPixels = useCallback((percentageCoords: { x: number; y: number; width: number; height: number }) => {
    if (!imageRef.current) {
      console.warn('🚫 Image ref not available for coordinate conversion');
      return { left: 0, top: 0, centerX: 0, centerY: 0, width: 0, height: 0 };
    }

    const displayedWidth = imageRef.current.clientWidth;
    const displayedHeight = imageRef.current.clientHeight;

    const width = (percentageCoords.width / 100) * displayedWidth;
    const height = (percentageCoords.height / 100) * displayedHeight;
    const centerX = (percentageCoords.x / 100) * displayedWidth;
    const centerY = (percentageCoords.y / 100) * displayedHeight;

    const pixelCoords = {
      left: centerX - width / 2,
      top: centerY - height / 2,
      centerX,
      centerY,
      width,
      height
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

  // Reset undo history only when switching to a different blueprint
  useEffect(() => {
    setHistory([]);
  }, [blueprint.id]);

  const cloneSymbols = useCallback((items: Blueprint['symbols']) =>
    items.map((symbol) => ({
      ...symbol,
      position: { ...symbol.position },
    })), []);

  const applySymbolsUpdate = useCallback((updater: (prev: Blueprint['symbols']) => Blueprint['symbols']) => {
    setSymbols((prev) => {
      const previousSnapshot = cloneSymbols(prev);
      const updated = updater(prev);
      setHistory((prevHistory) => [...prevHistory, previousSnapshot]);
      onSymbolsChange?.(updated);
      return updated;
    });
  }, [cloneSymbols, onSymbolsChange]);

  const handleUndo = useCallback(() => {
    setHistory((prevHistory) => {
      if (prevHistory.length === 0) return prevHistory;

      const lastState = prevHistory[prevHistory.length - 1];
      const restored = cloneSymbols(lastState);
      setSymbols(restored);
      onSymbolsChange?.(restored);

      return prevHistory.slice(0, -1);
    });
  }, [cloneSymbols, onSymbolsChange]);

  // Global mouse move handler for smooth symbol dragging/resizing
  useEffect(() => {
    if (!draggingSymbolId && !resizingSymbol) return;
    const MIN_SIZE_PERCENT = 1;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const pct = convertPixelsToPercentage({ x: e.clientX, y: e.clientY });
      setSymbols(prev => {
        const updated = prev.map(s => {
          if (draggingSymbolId && s.id === draggingSymbolId) {
            const halfWidth = s.position.width / 2;
            const halfHeight = s.position.height / 2;
            const newX = Math.min(100 - halfWidth, Math.max(halfWidth, pct.x - dragOffset.x));
            const newY = Math.min(100 - halfHeight, Math.max(halfHeight, pct.y - dragOffset.y));
            return {
              ...s,
              position: {
                ...s.position,
                x: newX,
                y: newY,
              }
            };
          }

          if (resizingSymbol && s.id === resizingSymbol.id) {
            let left = s.position.x - s.position.width / 2;
            let right = s.position.x + s.position.width / 2;
            let top = s.position.y - s.position.height / 2;
            let bottom = s.position.y + s.position.height / 2;
            const pointerX = Math.max(0, Math.min(100, pct.x));
            const pointerY = Math.max(0, Math.min(100, pct.y));

            switch (resizingSymbol.handle) {
              case 'nw':
                left = Math.min(right - MIN_SIZE_PERCENT, pointerX);
                top = Math.min(bottom - MIN_SIZE_PERCENT, pointerY);
                break;
              case 'ne':
                right = Math.max(left + MIN_SIZE_PERCENT, pointerX);
                top = Math.min(bottom - MIN_SIZE_PERCENT, pointerY);
                break;
              case 'sw':
                left = Math.min(right - MIN_SIZE_PERCENT, pointerX);
                bottom = Math.max(top + MIN_SIZE_PERCENT, pointerY);
                break;
              case 'se':
                right = Math.max(left + MIN_SIZE_PERCENT, pointerX);
                bottom = Math.max(top + MIN_SIZE_PERCENT, pointerY);
                break;
            }

            left = Math.max(0, left);
            right = Math.min(100, right);
            top = Math.max(0, top);
            bottom = Math.min(100, bottom);

            return {
              ...s,
              position: {
                ...s.position,
                x: (left + right) / 2,
                y: (top + bottom) / 2,
                width: Math.max(MIN_SIZE_PERCENT, right - left),
                height: Math.max(MIN_SIZE_PERCENT, bottom - top),
              }
            };
          }

          return s;
        });
        onSymbolsChange?.(updated);
        return updated;
      });
    };

    const handleGlobalMouseUp = () => {
      setDraggingSymbolId(null);
      setResizingSymbol(null);
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [draggingSymbolId, dragOffset, resizingSymbol, convertPixelsToPercentage, onSymbolsChange]);

  // ESC cancels add-symbol mode.
  useEffect(() => {
    if (!isAddingSymbol) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAddingSymbol(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddingSymbol]);

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
        x: Math.max(avgWidth / 2, Math.min(100 - avgWidth / 2, pct.x)),
        y: Math.max(avgHeight / 2, Math.min(100 - avgHeight / 2, pct.y)),
        width: avgWidth,
        height: avgHeight,
      },
      confidence: 1.0,
    };

    applySymbolsUpdate((prev) => [...prev, newSymbol]);
    setIsAddingSymbol(false);
  }, [isAddingSymbol, convertPixelsToPercentage, symbols, applySymbolsUpdate]);

  const handleDeleteSymbol = useCallback((symbolId: string) => {
    applySymbolsUpdate((prev) => prev.filter(s => s.id !== symbolId));
  }, [applySymbolsUpdate]);

  const handleMarkSymbolReviewed = useCallback((symbolId: string) => {
    applySymbolsUpdate((prev) => prev.map((s) => (
      s.id === symbolId
        ? {
            ...s,
            confidence: Math.max(s.confidence, 0.9),
          }
        : s
    )));
  }, [applySymbolsUpdate]);

  const handleRenameSymbol = useCallback((symbolId: string) => {
    const newName = prompt('Enter new symbol label (e.g., FCU-4, EF-3):');
    if (!newName) return;

    const newPartName = prompt('Enter mechanical part name/description (e.g., Supply fan, Pump, Motor):');

    const categoryInput = prompt('Enter category (hydraulic/hvac, pneumatic, mechanical, electrical, other):');
    applySymbolsUpdate((prev) => prev.map(s => s.id === symbolId ? {
        ...s,
        name: newName.trim(),
        description: newPartName ? newPartName.trim() : s.description,
        category: categoryInput ? normalizeCategory(categoryInput) : s.category,
        type: categoryInput ? normalizeCategory(categoryInput) : s.type,
      } : s));
  }, [applySymbolsUpdate]);

  const getSymbolColor = (symbolName: string) => getSymbolColorByName(symbolName);

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
  const lowConfidenceSymbols = symbols.filter((s) => s.confidence < LOW_CONFIDENCE_THRESHOLD);
  const visibleSymbols = reviewLowConfidenceOnly
    ? symbols.filter((s) => s.confidence < LOW_CONFIDENCE_THRESHOLD)
    : symbols;
  const viewerButtonBaseClass =
    'h-9 w-9 bg-white text-gray-700 border border-gray-300 hover:bg-[hsl(var(--brand-blue-100))] hover:text-[hsl(var(--brand-blue-700))] hover:border-[hsl(var(--brand-blue-300))] shadow-sm';
  const viewerButtonActiveClass =
    'bg-[hsl(var(--brand-blue-200))] text-[hsl(var(--brand-blue-900))] border-[hsl(var(--brand-blue-600))]';

  return (
    <div className="blueprint-viewer relative">

      {/* Floating Controls */}
      <TooltipProvider delayDuration={0}>
        <div className="absolute z-20 flex flex-col gap-2 left-1/2 -translate-x-1/2 bottom-3 md:bottom-auto md:left-0 md:top-1/2 md:-translate-y-1/2 md:translate-x-0 md:ml-2">
          <div className="inline-flex w-fit flex-col items-center gap-1 bg-white/80 rounded-lg shadow-lg p-1 border border-slate-200">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleZoomIn}
                  className={viewerButtonBaseClass}
                  title="Zoom in"
                  aria-label="Zoom in"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Zoom in</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleZoomOut}
                  className={viewerButtonBaseClass}
                  title="Zoom out"
                  aria-label="Zoom out"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Zoom out</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleReset}
                  className={viewerButtonBaseClass}
                  title="Back to default view"
                  aria-label="Back to default view"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Recenter view</TooltipContent>
            </Tooltip>
          </div>
          <div className="inline-flex w-fit flex-wrap justify-center gap-1 bg-white/80 rounded-lg shadow-lg p-1 border border-slate-200 md:flex-nowrap md:flex-col md:justify-start md:gap-1">
            {symbols.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setShowSymbolOverlays(!showSymbolOverlays)}
                  className={`${viewerButtonBaseClass} ${showSymbolOverlays ? viewerButtonActiveClass : ''}`}
                  title={showSymbolOverlays ? "Hide mechanical symbols" : "View mechanical symbols"}
                  aria-label={showSymbolOverlays ? "Hide mechanical symbols" : "View mechanical symbols"}
                >
                    {showSymbolOverlays ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {showSymbolOverlays ? "Hide symbols" : "View symbols"}
                </TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setIsAddingSymbol(!isAddingSymbol)}
                  className={`${viewerButtonBaseClass} ${isAddingSymbol ? viewerButtonActiveClass : ''}`}
                  title={isAddingSymbol ? "Cancel add symbol" : "Add symbol"}
                  aria-label={isAddingSymbol ? "Cancel add symbol" : "Add symbol"}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {isAddingSymbol ? "Cancel add symbol" : "Add symbol"}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleUndo}
                  className={viewerButtonBaseClass}
                  disabled={history.length === 0}
                  title="Undo last symbol change"
                  aria-label="Undo last symbol change"
                >
                  <Undo2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Undo last change</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </TooltipProvider>

      {/* AI Analysis Status (right) */}
      <div className="flex justify-end items-center p-3 md:p-6 bg-white border-b border-slate-200">
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            {getStatusIcon(blueprint.status)}
            <span className="text-xs sm:text-sm font-medium">
              {blueprint.aiAnalysis?.isAnalyzed ? 'AI Analyzed' : 'Processing...'}
            </span>
          </div>
        </div>
      </div>
      {/* Viewer Container */}
      <div
        ref={containerRef}
        className={`w-full h-[85vh] min-h-[420px] overflow-hidden bg-slate-50 relative ${isAddingSymbol ? 'cursor-crosshair' : 'cursor-move'
          }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {hasUnsavedChanges && (
          <div className="absolute top-3 left-3 z-20 glass px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-medium text-amber-700 max-w-[55%] truncate">
            Unsaved changes
          </div>
        )}
        {reviewLowConfidenceOnly && (
          <div className="absolute top-12 left-3 z-20 glass px-3 py-1 text-xs font-medium text-foreground">
            Reviewing low confidence ({lowConfidenceSymbols.length})
          </div>
        )}
        {isAddingSymbol && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 text-xs sm:text-sm font-medium text-blue-700 bg-blue-50/90 border border-blue-200 rounded-md px-3 py-1 backdrop-blur-sm">
            Click on the blueprint to place a symbol
          </div>
        )}
        {hasUnsavedChanges && onSaveChanges && (
          <div className="absolute top-3 right-3 z-20">
            <Button
              onClick={onSaveChanges}
              disabled={isSavingChanges}
              size="sm"
              variant="outline"
              className="gap-2 bg-white text-gray-700 border border-gray-300 hover:bg-[hsl(var(--brand-blue-100))] hover:text-[hsl(var(--brand-blue-700))] hover:border-[hsl(var(--brand-blue-300))]"
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">{isSavingChanges ? 'Saving...' : 'Save Changes'}</span>
              <span className="sm:hidden">{isSavingChanges ? 'Saving' : 'Save'}</span>
            </Button>
          </div>
        )}
        <div className="absolute bottom-16 md:bottom-3 left-3 z-20 glass px-2 sm:px-3 py-1 text-xs sm:text-sm font-mono">
          {Math.round(zoom * 100)}%
        </div>
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
                width: 'auto',
                height: 'auto', // Preserve aspect ratio
                maxWidth: '85vw',
                maxHeight: '85vh',
                objectFit: 'contain' // Prevent stretching
              }}
            />

            {/* Symbol Overlays */}
          {showSymbols && showSymbolOverlays && imageLoaded && visibleSymbols.map((symbol) => {
            // Convert percentage coordinates to pixels based on actual displayed image size
            const pixelPosition = convertPercentageToPixels(symbol.position);

            const startDragSymbol = (e: React.MouseEvent) => {
              e.stopPropagation();
              setHistory((prevHistory) => [...prevHistory, cloneSymbols(symbols)]);
              const pointer = { x: e.clientX, y: e.clientY };
              const pct = convertPixelsToPercentage(pointer);
              setDraggingSymbolId(symbol.id);
              setResizingSymbol(null);
              setDragOffset({
                x: pct.x - symbol.position.x,
                  y: pct.y - symbol.position.y,
                });
              };

            const startResizeSymbol = (e: React.MouseEvent, handle: ResizeHandle) => {
              e.stopPropagation();
              setHistory((prevHistory) => [...prevHistory, cloneSymbols(symbols)]);
              setDraggingSymbolId(null);
              setResizingSymbol({ id: symbol.id, handle });
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
                className={`absolute bg-opacity-25 rounded-md hover:bg-opacity-40 shadow-lg group ${draggingSymbolId === symbol.id ? 'cursor-grabbing scale-105' : 'cursor-grab hover:scale-102'
                  }`}
                style={{
                  left: `${pixelPosition.left}px`,
                  top: `${pixelPosition.top}px`,
                  width: `${pixelPosition.width}px`,
                  height: `${pixelPosition.height}px`,
                  borderColor: getSymbolColor(symbol.name),
                  backgroundColor: withAlpha(getSymbolColor(symbol.name), 0.25),
                  borderWidth: draggingSymbolId === symbol.id ? '3px' : '2px',
                  borderStyle: 'solid',
                  transition: draggingSymbolId === symbol.id ? 'none' : 'all 0.2s',
                }}
                title={`${symbol.name}${symbol.description ? ': ' + symbol.description : ''} (${Math.round(symbol.confidence * 100)}% confidence) - Drag to reposition`}
                onMouseDown={startDragSymbol}
              >
                {/* Center marker */}
                <div
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/80 shadow-sm pointer-events-none"
                  style={{
                    left: '50%',
                    top: '50%',
                    width: '8px',
                    height: '8px',
                    backgroundColor: getSymbolColor(symbol.name),
                  }}
                />
                {/* Resize Handles */}
                <button
                  className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-[2px] bg-white border border-gray-500 cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity"
                  onMouseDown={(e) => startResizeSymbol(e, 'nw')}
                  title="Resize"
                />
                <button
                  className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-[2px] bg-white border border-gray-500 cursor-nesw-resize opacity-0 group-hover:opacity-100 transition-opacity"
                  onMouseDown={(e) => startResizeSymbol(e, 'ne')}
                  title="Resize"
                />
                <button
                  className="absolute -bottom-1 -left-1 w-2.5 h-2.5 rounded-[2px] bg-white border border-gray-500 cursor-nesw-resize opacity-0 group-hover:opacity-100 transition-opacity"
                  onMouseDown={(e) => startResizeSymbol(e, 'sw')}
                  title="Resize"
                />
                <button
                  className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-[2px] bg-white border border-gray-500 cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity"
                  onMouseDown={(e) => startResizeSymbol(e, 'se')}
                  title="Resize"
                />
                {/* Name label: always above detection box */}
                <div className="absolute left-1/2 -translate-x-1/2 -top-8 z-10 group/name">
                  <div
                    className="text-[10px] font-semibold px-2 py-1 rounded-md shadow-sm truncate backdrop-blur-sm border max-w-36"
                    style={{
                      color: getSymbolColor(symbol.name),
                      backgroundColor: 'rgba(255, 255, 255, 0.82)',
                      borderColor: withAlpha(getSymbolColor(symbol.name), 0.4),
                    }}
                  >
                    {symbol.name}
                  </div>
                  <button
                    className="absolute top-1/2 -left-2 -translate-x-full -translate-y-1/2 w-6 h-6 bg-white border border-gray-200 hover:border-blue-500 text-gray-700 hover:text-blue-600 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover/name:opacity-100 transition-opacity duration-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRenameSymbol(symbol.id);
                    }}
                    title="Rename symbol"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <div className="absolute top-1/2 -right-2 translate-x-full -translate-y-1/2 flex gap-1 opacity-0 group-hover/name:opacity-100 transition-opacity duration-200">
                    {symbol.confidence < LOW_CONFIDENCE_THRESHOLD && (
                      <button
                        className="w-6 h-6 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center shadow-md"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkSymbolReviewed(symbol.id);
                        }}
                        title="Mark reviewed"
                      >
                        <CheckCircle className="w-3 h-3" />
                      </button>
                    )}
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
                </div>
                {/* Confidence label: always below detection box */}
                <div
                  className="absolute left-1/2 -translate-x-1/2 top-full mt-1 text-[10px] font-semibold px-2 py-1 rounded-md shadow-sm w-fit backdrop-blur-sm border pointer-events-none"
                  style={{
                    color: getSymbolColor(symbol.name),
                    backgroundColor: 'rgba(255, 255, 255, 0.82)',
                    borderColor: withAlpha(getSymbolColor(symbol.name), 0.4),
                  }}
                >
                  {Math.round(symbol.confidence * 100)}%
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

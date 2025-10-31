import { useState, useRef, useCallback, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Move, Brain, Clock, CheckCircle, XCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Blueprint } from '@/types';
import { EnhancedSymbolAnalysis } from '@/components/AI/EnhancedSymbolAnalysis';

interface BlueprintViewerProps {
  blueprint: Blueprint;
  showSymbols?: boolean;
}

export function BlueprintViewer({ blueprint, showSymbols = true }: BlueprintViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showSymbolOverlays, setShowSymbolOverlays] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0, offsetX: 0, offsetY: 0 });
  
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
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
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

  const getSymbolColor = (category: string) => {
    const colors = {
      hydraulic: '#3b82f6',
      pneumatic: '#10b981',
      mechanical: '#f59e0b',
      electrical: '#ef4444',
      other: '#6b7280'
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

  return (
    <div className="blueprint-viewer relative">
      {/* Controls */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
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
        {blueprint.symbols.length > 0 && (
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
      </div>

      {/* AI Analysis Status */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <div className="glass px-3 py-1 flex items-center gap-2">
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
        </div>
        <div className="glass px-3 py-1 text-sm font-mono">
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* Viewer Container */}
      <div
        ref={containerRef}
        className="w-full h-96 overflow-hidden cursor-move bg-slate-50 relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
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
            style={{ 
              width: '800px', 
              height: 'auto', // Preserve aspect ratio
              objectFit: 'contain' // Prevent stretching
            }}
          />

          {/* Symbol Overlays */}
          {showSymbols && showSymbolOverlays && blueprint.symbols.map((symbol) => {
            // Convert percentage coordinates to pixels based on actual displayed image size
            const pixelPosition = convertPercentageToPixels(symbol.position);
            
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
                className="absolute border-3 bg-opacity-25 rounded-md hover:bg-opacity-40 transition-all duration-200 cursor-pointer shadow-lg"
                style={{
                  left: `${pixelPosition.x}px`,
                  top: `${pixelPosition.y}px`,
                  width: `${pixelPosition.width}px`,
                  height: `${pixelPosition.height}px`,
                  borderColor: getSymbolColor(symbol.category || 'other'),
                  backgroundColor: getSymbolColor(symbol.category || 'other') + '40',
                  borderWidth: '3px',
                  borderStyle: 'solid'
                }}
                title={`${symbol.name}${symbol.description ? ': ' + symbol.description : ''} (${Math.round(symbol.confidence * 100)}% confidence)`}
              >
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

      {/* AI Analysis Results */}
      {showSymbols && blueprint.symbols.length > 0 && (
        <div className="mt-6">
          <EnhancedSymbolAnalysis blueprint={blueprint} />
        </div>
      )}
    </div>
  );
}
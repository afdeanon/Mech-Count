import { useState, useRef, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Move } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Blueprint } from '@/types';
import { symbolTypes } from '@/data/mockData';

interface BlueprintViewerProps {
  blueprint: Blueprint;
  showSymbols?: boolean;
}

export function BlueprintViewer({ blueprint, showSymbols = true }: BlueprintViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

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

  const getSymbolColor = (type: string) => {
    const symbolType = symbolTypes.find(s => s.type === type);
    return symbolType?.color || '#3b82f6';
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
      </div>

      {/* Zoom Level Indicator */}
      <div className="absolute top-4 right-4 z-10">
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
            src={blueprint.imageUrl}
            alt={blueprint.name}
            className="max-w-none select-none"
            draggable={false}
            style={{ width: '800px', height: '600px' }}
          />

          {/* Symbol Overlays */}
          {showSymbols && blueprint.symbols.map((symbol) => (
            <div
              key={symbol.id}
              className="absolute border-2 bg-opacity-20 rounded-sm animate-pulse"
              style={{
                left: symbol.position.x,
                top: symbol.position.y,
                width: symbol.position.width,
                height: symbol.position.height,
                borderColor: getSymbolColor(symbol.type),
                backgroundColor: getSymbolColor(symbol.type) + '33'
              }}
              title={`${symbol.name} (${Math.round(symbol.confidence * 100)}%)`}
            >
              <div
                className="text-xs font-mono text-white px-1 py-0.5 rounded-tl"
                style={{ backgroundColor: getSymbolColor(symbol.type) }}
              >
                {Math.round(symbol.confidence * 100)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      {showSymbols && (
        <div className="mt-4 p-4 bg-muted/30 rounded-lg">
          <h4 className="font-medium mb-2">Detected Symbols</h4>
          <div className="flex flex-wrap gap-3">
            {symbolTypes.map((type) => {
              const count = blueprint.symbols.filter(s => s.type === type.type).length;
              if (count === 0) return null;
              
              return (
                <div key={type.type} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: type.color }}
                  />
                  <span className="text-sm">
                    {type.name}: {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
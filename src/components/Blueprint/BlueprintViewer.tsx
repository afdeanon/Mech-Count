import { useState, useRef, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Move, Brain, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
              className="absolute border-2 bg-opacity-20 rounded-sm hover:bg-opacity-30 transition-all duration-200"
              style={{
                left: symbol.position.x,
                top: symbol.position.y,
                width: symbol.position.width,
                height: symbol.position.height,
                borderColor: getSymbolColor(symbol.category || 'other'),
                backgroundColor: getSymbolColor(symbol.category || 'other') + '33'
              }}
              title={`${symbol.name}${symbol.description ? ': ' + symbol.description : ''} (${Math.round(symbol.confidence * 100)}% confidence)`}
            >
              <div
                className="text-xs font-mono text-white px-1 py-0.5 rounded-tl"
                style={{ backgroundColor: getSymbolColor(symbol.category || 'other') }}
              >
                {Math.round(symbol.confidence * 100)}%
              </div>
              <div className="text-xs text-gray-800 px-1 py-0.5 bg-white bg-opacity-90 rounded-br max-w-20 truncate">
                {symbol.name}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Analysis Results */}
      {showSymbols && (
        <div className="mt-4 space-y-4">
          {/* AI Summary */}
          {blueprint.aiAnalysis?.summary && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-blue-600" />
                <h4 className="font-medium text-blue-900">AI Analysis Summary</h4>
              </div>
              <p className="text-sm text-blue-800">{blueprint.aiAnalysis.summary}</p>
              {blueprint.aiAnalysis.processingTime && (
                <p className="text-xs text-blue-600 mt-1">
                  Analysis completed in {blueprint.aiAnalysis.processingTime}ms
                </p>
              )}
            </div>
          )}

          {/* Symbol Categories */}
          <div className="p-4 bg-muted/30 rounded-lg">
            <h4 className="font-medium mb-3">Detected Symbols by Category</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {['hydraulic', 'pneumatic', 'mechanical', 'electrical', 'other'].map((category) => {
                const categorySymbols = blueprint.symbols.filter(s => s.category === category);
                if (categorySymbols.length === 0) return null;
                
                return (
                  <div key={category} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: getSymbolColor(category) }}
                    />
                    <span className="text-sm capitalize">
                      {category}: {categorySymbols.length}
                    </span>
                  </div>
                );
              })}
            </div>
            
            {/* Symbol Details */}
            {blueprint.symbols.length > 0 && (
              <div className="mt-4 pt-3 border-t border-muted">
                <h5 className="text-sm font-medium mb-2">Symbol Details</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  {blueprint.symbols.map((symbol) => (
                    <div key={symbol.id} className="flex items-center justify-between text-xs p-2 bg-background/50 rounded">
                      <span className="font-medium">{symbol.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {Math.round(symbol.confidence * 100)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
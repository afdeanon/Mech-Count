import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  CheckCircle, 
  Clock, 
  Zap, 
  Target,
  FileImage,
  Cog,
  Wrench,
  Gauge,
  Power,
  Plus
} from 'lucide-react';
import { Blueprint, MechanicalSymbol } from '@/types';

interface EnhancedSymbolAnalysisProps {
  blueprint: Blueprint;
}

const categoryIcons = {
  hydraulic: Gauge,
  pneumatic: Zap,
  mechanical: Cog,
  electrical: Power,
  other: Wrench
};

const categoryColors = {
  hydraulic: 'bg-blue-500',
  pneumatic: 'bg-green-500', 
  mechanical: 'bg-orange-500',
  electrical: 'bg-yellow-500',
  other: 'bg-gray-500'
};

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 90) return 'text-green-600';
  if (confidence >= 75) return 'text-blue-600';
  if (confidence >= 60) return 'text-yellow-600';
  return 'text-red-600';
};

const getConfidenceBadgeVariant = (confidence: number) => {
  if (confidence >= 90) return 'default';
  if (confidence >= 75) return 'secondary';
  return 'outline';
};

export function EnhancedSymbolAnalysis({ blueprint }: EnhancedSymbolAnalysisProps) {
  const { symbols, aiAnalysis } = blueprint;
  
  console.log('🔍 EnhancedSymbolAnalysis received:', {
    symbolsCount: symbols?.length || 0,
    symbols: symbols?.map(s => ({ name: s.name, confidence: s.confidence })) || [],
    aiAnalysis
  });
  
  // Separate manually added from AI-detected
  const manuallyAdded = symbols.filter(s => s.id.startsWith('manual-'));
  const aiDetected = symbols.filter(s => !s.id.startsWith('manual-'));
  
  // Group symbols by category
  const symbolsByCategory = symbols.reduce((acc, symbol) => {
    if (!acc[symbol.category]) {
      acc[symbol.category] = [];
    }
    acc[symbol.category].push(symbol);
    return acc;
  }, {} as Record<string, MechanicalSymbol[]>);

  // Calculate statistics
  const avgConfidence = symbols.length > 0 
    ? Math.round(symbols.reduce((sum, s) => sum + (s.confidence * 100), 0) / symbols.length)
    : 0;

  const highConfidenceCount = symbols.filter(s => s.confidence >= 0.9).length;
  const mediumConfidenceCount = symbols.filter(s => s.confidence >= 0.75 && s.confidence < 0.9).length;
  const lowConfidenceCount = symbols.filter(s => s.confidence < 0.75).length;

  return (
    <div className="space-y-6">
      {/* AI Analysis Summary */}
      {aiAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-blue-600" />
              AI Analysis Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="font-semibold text-green-900">Analysis Complete</div>
                  <div className="text-sm text-green-700">
                    {aiAnalysis.confidence}% overall confidence
                  </div>
                </div>
              </div>
              
              {aiAnalysis.processingTime && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-blue-900">
                      {(aiAnalysis.processingTime / 1000).toFixed(1)}s
                    </div>
                    <div className="text-sm text-blue-700">Processing time</div>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <div className="font-semibold text-purple-900">{symbols.length}</div>
                  <div className="text-sm text-purple-700">Symbols detected</div>
                </div>
              </div>
            </div>
            
            {aiAnalysis.summary && (
              <div className="bg-muted/30 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Analysis Summary</h4>
                <p className="text-sm text-muted-foreground">{aiAnalysis.summary}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Confidence Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Detection Confidence</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span>Average Confidence</span>
              <span className="font-medium">{avgConfidence}%</span>
            </div>
            <Progress value={avgConfidence} className="h-2" />
            
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{highConfidenceCount}</div>
                <div className="text-xs text-muted-foreground">High (90%+)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{mediumConfidenceCount}</div>
                <div className="text-xs text-muted-foreground">Medium (75-89%)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{lowConfidenceCount}</div>
                <div className="text-xs text-muted-foreground">Low (&lt;75%)</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Manually Added Symbols Section */}
      {manuallyAdded.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-purple-600" />
              Added Symbols
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {manuallyAdded.map((symbol) => (
                <div key={symbol.id} className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-sm text-purple-900">{symbol.name}</h4>
                    <Badge className="bg-purple-600 text-xs">100%</Badge>
                  </div>
                  {symbol.description && (
                    <p className="text-xs text-purple-700">{symbol.description}</p>
                  )}
                  <div className="text-xs text-purple-600 mt-2 capitalize">{symbol.category}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Symbols by Category */}
      <Card>
        <CardHeader>
          <CardTitle>Detected Symbols by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(symbolsByCategory).map(([category, categorySymbols]) => {
              const IconComponent = categoryIcons[category as keyof typeof categoryIcons] || Wrench;
              const colorClass = categoryColors[category as keyof typeof categoryColors] || 'bg-gray-500';
              
              return (
                <div key={category}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-8 h-8 ${colorClass} rounded-lg flex items-center justify-center`}>
                      <IconComponent className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="font-semibold capitalize">{category} Systems</h3>
                    <Badge variant="secondary">{categorySymbols.length} symbols</Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 ml-11">
                    {categorySymbols.map((symbol) => (
                      <div key={symbol.id} className="bg-muted/30 p-3 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-sm">{symbol.name}</h4>
                          <Badge 
                            variant={getConfidenceBadgeVariant(symbol.confidence * 100)}
                            className="text-xs"
                          >
                            {Math.round(symbol.confidence * 100)}%
                          </Badge>
                        </div>
                        {symbol.description && (
                          <p className="text-xs text-muted-foreground">{symbol.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {Object.keys(symbolsByCategory).indexOf(category) < Object.keys(symbolsByCategory).length - 1 && (
                    <Separator className="mt-4" />
                  )}
                </div>
              );
            })}
          </div>
          
          {symbols.length === 0 && (
            <div className="text-center py-8">
              <FileImage className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No symbols detected in this blueprint</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Total Symbol Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Total Symbols Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">{symbols.length}</div>
              <div className="text-sm text-blue-700 mt-1">Total Symbols</div>
              <div className="text-xs text-blue-600 mt-2">{aiDetected.length} detected + {manuallyAdded.length} added</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">{aiDetected.length}</div>
              <div className="text-sm text-green-700 mt-1">AI-Detected</div>
              <div className="text-xs text-green-600 mt-2">{Math.round((aiDetected.length / Math.max(1, symbols.length)) * 100)}% of total</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-3xl font-bold text-purple-600">{manuallyAdded.length}</div>
              <div className="text-sm text-purple-700 mt-1">Manually Added</div>
              <div className="text-xs text-purple-600 mt-2">{Math.round((manuallyAdded.length / Math.max(1, symbols.length)) * 100)}% of total</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
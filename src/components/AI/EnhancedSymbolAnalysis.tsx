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
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, CartesianGrid, XAxis, YAxis, Bar } from 'recharts';

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

const categoryColorsGraphs = {
  hydraulic: '#3b82f6',    // blue-500
  pneumatic: '#22c55e',    // green-500
  mechanical: '#f97316',   // orange-500
  electrical: '#eab308',   // yellow-500
  other: '#6b7280'         // gray-500
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
    // Capitalize first letter utility
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
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
                  <div className="font-semibold text-purple-900">{aiDetected.length}</div>
                  <div className="text-sm text-purple-700">Symbols detected</div>
                </div>
              </div>
            </div>
            {/* Detection Confidence Distribution */}
            <div className="space-y-3 mt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Detection Confidence</span>
                <span className="font-medium text-muted-foreground">{avgConfidence}% average</span>
              </div>
              <Progress value={avgConfidence} className="h-2" />
              <div className="grid grid-cols-3 gap-4 mt-3">
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
            {aiAnalysis.summary && (
              <div className="bg-muted/30 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Analysis Summary</h4>
                <p className="text-sm text-muted-foreground">{aiAnalysis.summary}</p>
              </div>
            )}
            {/* Visualization Section (now inside AI Analysis Summary) */}
            <div className="p-4 bg-muted/30 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Visualization</h3>
              <div className="flex flex-col md:flex-row gap-8 items-stretch w-full">
                {/* Donut Chart: Category Distribution */}
                <div className="flex-1 min-w-0 flex flex-col items-center justify-center">
                  <h4 className="text-sm font-medium mb-2">Category Distribution</h4>
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie
                        data={Object.entries(symbolsByCategory).map(([category, symbols]) => ({
                          name: category,
                          value: symbols.length,
                          fill: categoryColorsGraphs[category as keyof typeof categoryColorsGraphs] || '#6b7280'
                        }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) => `${capitalize(name)}: ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {Object.entries(symbolsByCategory).map(([category], index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={categoryColorsGraphs[category as keyof typeof categoryColorsGraphs] || '#6b7280'}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-background border rounded-lg p-2 shadow-lg">
                                <p className="font-medium capitalize">{payload[0].name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {payload[0].value} symbols ({((payload[0].value as number / symbols.length) * 100).toFixed(1)}%)
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Legend below donut */}
                  <div className="flex flex-wrap justify-center gap-3 mt-4">
                    {Object.entries(symbolsByCategory).map(([category]) => (
                      <div key={category} className="flex items-center gap-2">
                        <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: categoryColorsGraphs[category as keyof typeof categoryColorsGraphs] || '#6b7280' }}></span>
                        <span className="capitalize text-xs text-muted-foreground">{category}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Bar Graph: Mechanical Symbol Counts (color by category) */}
                <div className="flex-1 min-w-0 flex flex-col items-center justify-center">
                  <h4 className="text-sm font-medium mb-2">Mechanical Symbol Counts</h4>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={(() => {
                        const nameCounts: Record<string, { name: string; count: number; category: string }> = {};
                        symbols.forEach(symbol => {
                          if (!nameCounts[symbol.name]) {
                            nameCounts[symbol.name] = { name: symbol.name, count: 0, category: symbol.category };
                          }
                          nameCounts[symbol.name].count += 1;
                        });
                        return Object.values(nameCounts)
                          .sort((a, b) => b.count - a.count);
                      })()}
                      layout="vertical"
                      margin={{ top: 20, right: 30, left: 40, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis dataKey="name" type="category" width={100} tickFormatter={capitalize} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const category = payload[0].payload.category;
                            return (
                              <div className="bg-background border rounded-lg p-3 shadow-lg">
                                <p className="font-medium mb-2">{label}</p>
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="capitalize">Count:</span>
                                  <span className="font-medium">{payload[0].value}</span>
                                  <span className="capitalize ml-2" style={{ color: categoryColorsGraphs[category] || '#6b7280' }}>{category}</span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="count">
                        {(() => {
                          const nameCounts: Record<string, { name: string; count: number; category: string }> = {};
                          symbols.forEach(symbol => {
                            if (!nameCounts[symbol.name]) {
                              nameCounts[symbol.name] = { name: symbol.name, count: 0, category: symbol.category };
                            }
                            nameCounts[symbol.name].count += 1;
                          });
                          return Object.values(nameCounts)
                            .sort((a, b) => b.count - a.count)
                            .map((item, idx) => (
                              <Cell key={`bar-cell-${item.name}`} fill={categoryColorsGraphs[item.category as keyof typeof categoryColorsGraphs] || '#6b7280'} />
                            ));
                        })()}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
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
import React, { useState } from 'react';
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
  Search,
  Plus,
  Car,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Blueprint, MechanicalSymbol } from '@/types';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, CartesianGrid, XAxis, YAxis, Bar, Label } from 'recharts';

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

const getTableConfidenceColor = (confidence: number) => {
  if (confidence >= 0.85) return 'text-green-600 bg-green-50';
  if (confidence >= 0.70) return 'text-yellow-600 bg-yellow-50';
  return 'text-red-600 bg-red-50';
};

const getTableConfidenceIcon = (confidence: number) => {
  if (confidence >= 0.85) return <CheckCircle className="w-4 h-4" />;
  if (confidence >= 0.70) return <AlertTriangle className="w-4 h-4" />;
  return <AlertCircle className="w-4 h-4" />;
};

export function EnhancedSymbolAnalysis({ blueprint }: EnhancedSymbolAnalysisProps) {
  // Capitalize first letter utility
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const displayCategory = (category: string) =>
    category.toLowerCase() === 'hydraulic' ? 'HVAC' : capitalize(category);
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

  // State for expanded categories (all expanded by default)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(Object.keys(symbolsByCategory))
  );

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // Calculate statistics (AI-detected only for confidence distribution)
  const aiDetectedCount = aiDetected.length;
  const avgConfidence = aiDetectedCount > 0
    ? Math.round(aiDetected.reduce((sum, s) => sum + (s.confidence * 100), 0) / aiDetectedCount)
    : 0;

  const highConfidenceCount = aiDetected.filter(s => s.confidence >= 0.9).length;
  const mediumConfidenceCount = aiDetected.filter(s => s.confidence >= 0.75 && s.confidence < 0.9).length;
  const lowConfidenceCount = aiDetected.filter(s => s.confidence < 0.75).length;
  const categoryDistributionData = Object.entries(symbolsByCategory).map(([category, categorySymbols]) => ({
    name: category,
    value: categorySymbols.length,
    fill: categoryColorsGraphs[category as keyof typeof categoryColorsGraphs] || '#6b7280'
  }));
  const isSingleCategoryDistribution = categoryDistributionData.length === 1;
  const sourceSymbols = aiDetected.length > 0 ? aiDetected : symbols;
  const inferredBlueprintType = (() => {
    if (sourceSymbols.length === 0) return 'general mechanical blueprint';
    const categoryCounts = sourceSymbols.reduce<Record<string, number>>((acc, symbol) => {
      const key = (symbol.category || 'other').toLowerCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const [dominantCategory, dominantCount] = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];
    const dominantRatio = dominantCount / sourceSymbols.length;

    if (dominantRatio < 0.45) return 'mixed-discipline mechanical drawing';

    const typeByCategory: Record<string, string> = {
      hydraulic: 'hydraulic schematic',
      pneumatic: 'pneumatic diagram',
      electrical: 'electrical control schematic',
      mechanical: 'mechanical layout drawing',
      other: 'general mechanical blueprint',
    };

    return typeByCategory[dominantCategory] || 'general mechanical blueprint';
  })();
  const blueprintTypeSentence = `Overall, this appears to be a ${inferredBlueprintType}.`;

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
              <div className="border bg-muted/30 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Analysis Summary</h4>
                <p className="text-sm text-muted-foreground">{aiAnalysis.summary}</p>
                <p className="text-sm text-muted-foreground mt-2">{blueprintTypeSentence}</p>
              </div>
            )}
            {/* Visualization Section (now inside AI Analysis Summary) */}

          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Overall Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='mt-4'>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-gray-300 text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl font-bold text-gray-600">{symbols.length}</div>
                <div className="text-sm text-gray-700 mt-1">Total Symbols</div>
                <div className="text-xs text-gray-600 mt-2">{aiDetected.length} detected + {manuallyAdded.length} added</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">{aiDetected.length}</div>
                <div className="text-sm text-blue-700 mt-1">AI-Detected</div>
                <div className="text-xs text-blue-600 mt-2">{Math.round((aiDetected.length / Math.max(1, symbols.length)) * 100)}% of total</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-3xl font-bold text-purple-600">{manuallyAdded.length}</div>
                <div className="text-sm text-purple-700 mt-1">Manually Added</div>
                <div className="text-xs text-purple-600 mt-2">{Math.round((manuallyAdded.length / Math.max(1, symbols.length)) * 100)}% of total</div>
              </div>
            </div>
          </div>
          <div className='mt-4'>
            <h1 className="text-lg font-semibold text-foreground mb-2">Mechanical Count Overview</h1>

          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category Distribution - Left Box */}
            <div className="border rounded-lg p-6 bg-muted/30 flex flex-col">
              <h4 className="text-sm font-medium mb-4 text-center">Category Distribution</h4>
              <div className="flex-1 flex items-center justify-center">
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart margin={{ top: 16, right: 48, left: 48, bottom: 16 }}>
                    <Pie
                      data={categoryDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={isSingleCategoryDistribution ? 0 : 2}
                      startAngle={90}
                      endAngle={-270}
                      stroke="none"
                      dataKey="value"
                      label={
                        isSingleCategoryDistribution
                          ? ({ cx, cy }) => (
                            <text
                              x={Number(cx)}
                              y={Number(cy) - 120}
                              textAnchor="middle"
                              fill="hsl(var(--muted-foreground))"
                              fontSize={14}
                              fontWeight={500}
                            >
                              {`${displayCategory(categoryDistributionData[0].name)}: 100%`}
                            </text>
                          )
                          : ({ name, percent }) => `${displayCategory(String(name))}: ${(percent * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {Object.entries(symbolsByCategory).map(([category], index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={categoryColorsGraphs[category as keyof typeof categoryColorsGraphs] || '#6b7280'}
                          stroke="none"
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
              </div>
              {/* Legend below donut */}
              <div className="flex flex-wrap justify-center gap-3 mt-4">
                {Object.entries(symbolsByCategory).map(([category]) => (
                  <div key={category} className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: categoryColorsGraphs[category as keyof typeof categoryColorsGraphs] || '#6b7280' }}></span>
                    <span className="text-xs text-muted-foreground">{displayCategory(category)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mechanical Symbol Counts - Right Box */}
            <div className="border rounded-lg p-6 bg-muted/30 flex flex-col">
              <h4 className="text-sm font-medium mb-4 text-center">Mechanical Symbol Counts</h4>
              <div className="flex-1 flex items-center justify-center">
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
                    <XAxis type="number" allowDecimals={false} >
                      <Label value="Count" offset={-10} position="insideBottom" className="text-sm text-muted-foreground" />
                    </XAxis>
                    <YAxis dataKey="name" type="category" width={100} tickFormatter={capitalize} >
                      <Label value="Symbol Name" angle={-90} position="insideLeft" className="text-sm text-muted-foreground" />
                    </YAxis>
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
                                <span className="ml-2" style={{ color: categoryColorsGraphs[category] || '#6b7280' }}>{displayCategory(category)}</span>
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
          <div className='mt-6'>
            <h1 className="text-lg font-semibold text-foreground mb-2">Component Inventory</h1>

            <div className="border border-gray-200 rounded-lg overflow-x-auto">
              <table className="w-full table-fixed">
                <colgroup>
                  <col className="w-[20%]" />
                  <col className="w-[45%]" />
                  <col className="w-[20%]" />
                  <col className="w-[15%]" />
                </colgroup>
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Confidence</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(symbolsByCategory).map(([category, items]) => {
                    const isExpanded = expandedCategories.has(category);
                    return (
                      <React.Fragment key={category}>
                        {/* Category Header Row */}
                        <tr
                          className="bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => toggleCategory(category)}
                        >
                          <td colSpan={4} className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {isExpanded ? (
                                <ChevronDown className="w-5 h-5 text-gray-500" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-gray-500" />
                              )}
                              <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: categoryColorsGraphs[category as keyof typeof categoryColorsGraphs] }}
                              />
                              <span className="font-semibold text-gray-900">{displayCategory(category)}</span>
                              <span className="text-sm text-gray-500">({items.length} parts)</span>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && items.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                              <span className="text-sm font-medium text-gray-900 truncate block">{item.name}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-gray-600 line-clamp-2">{item.description}</span>
                            </td>
                            <td className="px-6 py-4">
                              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${getTableConfidenceColor(item.confidence)}`}>
                                {getTableConfidenceIcon(item.confidence)}
                                <span className="text-xs font-medium">{Math.round(item.confidence * 100)}%</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.id?.startsWith('manual-')
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-blue-100 text-blue-800'
                                }`}>
                                {item.id?.startsWith('manual-') ? 'Manual' : 'AI'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

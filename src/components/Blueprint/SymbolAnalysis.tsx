import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Blueprint } from '@/types';
import { symbolTypes } from '@/data/mockData';
import { BarChart3, Target, Layers, Save } from 'lucide-react';

interface SymbolAnalysisProps {
  blueprint: Blueprint;
  onSaveToProject: () => void;
  showSaveButton?: boolean;
}

export function SymbolAnalysis({ blueprint, onSaveToProject, showSaveButton = true }: SymbolAnalysisProps) {
  // Group symbols by type
  const symbolCounts = symbolTypes.map(type => ({
    ...type,
    count: blueprint.symbols.filter(s => s.type === type.type).length
  })).filter(type => type.count > 0);

  const totalSymbols = blueprint.symbols.length;
  const averageAccuracy = Math.round(blueprint.averageAccuracy);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Symbols</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{totalSymbols}</div>
            <p className="text-xs text-muted-foreground">
              Detected across {symbolCounts.length} categories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Accuracy</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{averageAccuracy}%</div>
            <p className="text-xs text-muted-foreground">
              High confidence detection
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing Time</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">3.2s</div>
            <p className="text-xs text-muted-foreground">
              Analysis completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Symbol Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Symbol Breakdown</CardTitle>
          <p className="text-sm text-muted-foreground">
            Detailed count of each mechanical symbol type detected
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {symbolCounts.map((symbol) => (
              <div
                key={symbol.type}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-sm"
                    style={{ backgroundColor: symbol.color }}
                  />
                  <span className="text-sm font-medium">{symbol.name}</span>
                </div>
                <Badge variant="secondary" className="font-mono">
                  {symbol.count}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Accuracy Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Detection Confidence</CardTitle>
          <p className="text-sm text-muted-foreground">
            Confidence levels for detected symbols
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { range: '95-100%', count: blueprint.symbols.filter(s => s.confidence >= 0.95).length, color: 'bg-green-500' },
              { range: '90-94%', count: blueprint.symbols.filter(s => s.confidence >= 0.90 && s.confidence < 0.95).length, color: 'bg-blue-500' },
              { range: '85-89%', count: blueprint.symbols.filter(s => s.confidence >= 0.85 && s.confidence < 0.90).length, color: 'bg-yellow-500' },
              { range: 'Below 85%', count: blueprint.symbols.filter(s => s.confidence < 0.85).length, color: 'bg-red-500' }
            ].map((range) => (
              <div key={range.range} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${range.color}`} />
                  <span className="text-sm">{range.range}</span>
                </div>
                <span className="text-sm font-mono">{range.count} symbols</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Save to Project */}
      {showSaveButton && !blueprint.projectId && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Save Blueprint to Project
                </h3>
                <p className="text-muted-foreground">
                  Organize this blueprint by adding it to a project for better management
                </p>
              </div>
              <Button onClick={onSaveToProject} className="btn-tech gap-2">
                <Save className="w-4 h-4" />
                Save to Project
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
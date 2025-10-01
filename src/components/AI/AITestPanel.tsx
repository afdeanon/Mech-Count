import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { auth } from '@/config/firebase';
import { 
  Brain, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Zap, 
  Clock, 
  DollarSign, 
  FileImage, 
  Cpu,
  RefreshCw 
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:3000/api';

interface AITestResult {
  success: boolean;
  message: string;
  data?: {
    available: boolean;
    model: string;
    estimatedCost: string;
    features: string[];
    supportedFormats: string[];
    maxFileSize: string;
    processingTime: string;
  };
  error?: string;
}

export function AITestPanel() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<AITestResult | null>(null);

  const testAIService = async () => {
    setIsLoading(true);
    setTestResult(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/blueprints/ai/test`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Failed to test AI service',
        error: error instanceof Error ? error.message : 'Network error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getAuthToken = async () => {
    // Get Firebase auth token
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    return await user.getIdToken();
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl">AI Service Testing</CardTitle>
              <p className="text-sm text-muted-foreground">
                Test OpenAI GPT-4 Vision integration for blueprint symbol detection
              </p>
            </div>
          </div>
          <Button 
            onClick={testAIService} 
            disabled={isLoading}
            className="gap-2"
            variant={testResult?.success ? "outline" : "default"}
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            {isLoading ? 'Testing...' : 'Test AI Service'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Status Display */}
        {testResult && (
          <Alert className={testResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            <div className="flex items-center gap-2">
              {testResult.success ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600" />
              )}
              <AlertDescription className="font-medium">
                {testResult.message}
              </AlertDescription>
            </div>
            {testResult.error && (
              <div className="mt-2 text-sm text-red-700">
                Error: {testResult.error}
              </div>
            )}
          </Alert>
        )}

        {/* AI Service Details */}
        {testResult?.success && testResult.data && (
          <div className="space-y-4">
            {/* Service Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <div className="font-medium text-green-900">Service Available</div>
                  <div className="text-sm text-green-700">Ready for analysis</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <Cpu className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="font-medium text-blue-900">{testResult.data.model}</div>
                  <div className="text-sm text-blue-700">AI Model</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                <DollarSign className="w-5 h-5 text-purple-600" />
                <div>
                  <div className="font-medium text-purple-900">{testResult.data.estimatedCost}</div>
                  <div className="text-sm text-purple-700">Cost per analysis</div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Capabilities */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Brain className="w-4 h-4" />
                AI Capabilities
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {testResult.data.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Technical Specifications */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <FileImage className="w-4 h-4" />
                  Supported Formats
                </h4>
                <div className="space-y-1">
                  {testResult.data.supportedFormats.map((format, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {format}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  File Size Limit
                </h4>
                <Badge variant="outline" className="text-sm">
                  {testResult.data.maxFileSize}
                </Badge>
              </div>
              
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Processing Time
                </h4>
                <Badge variant="outline" className="text-sm">
                  {testResult.data.processingTime}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground">Testing AI service capabilities...</p>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-muted/30 p-4 rounded-lg">
          <h4 className="font-medium mb-2">What this test checks:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• OpenAI API connectivity and authentication</li>
            <li>• GPT-4 Vision model availability</li>
            <li>• Service configuration and pricing</li>
            <li>• Blueprint analysis capabilities</li>
            <li>• File format and size limitations</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
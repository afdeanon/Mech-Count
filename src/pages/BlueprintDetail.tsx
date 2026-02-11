import { useParams, useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/Layout/Sidebar';
import { Button } from '@/components/ui/button';
import { BlueprintViewer } from '@/components/Blueprint/BlueprintViewer';
import { SaveToProjectModal } from '@/components/Project/SaveToProjectModal';
import { EnhancedSymbolAnalysis } from '@/components/AI/EnhancedSymbolAnalysis';
import { useApp } from '@/context/AppContext';
import { ArrowLeft, ChevronRight, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getBlueprintById, updateBlueprint } from '@/services/blueprintService';
import { useToast } from '@/hooks/use-toast';
import type { Blueprint } from '@/types';

export function BlueprintDetail() {
  const { blueprintId, projectId } = useParams<{ blueprintId: string; projectId?: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [originalSymbols, setOriginalSymbols] = useState<Blueprint['symbols']>([]);
  const { toast } = useToast();

  // Fetch latest blueprint data from server on mount
  useEffect(() => {
    const fetchBlueprint = async () => {
      if (!blueprintId) return;
      
      console.log('📋 Fetching latest blueprint data from server:', blueprintId);
      setIsLoading(true);
      
      try {
        const response = await getBlueprintById(blueprintId);
        if (response.success && response.data) {
          console.log('✅ Fetched blueprint with', response.data.symbols?.length || 0, 'symbols');
          // Update the blueprint in context with fresh data from server
          dispatch({ type: 'UPDATE_BLUEPRINT', payload: response.data });
          // Store original symbols to track changes
          setOriginalSymbols(response.data.symbols || []);
        } else {
          console.error('❌ Failed to fetch blueprint:', response.message);
        }
      } catch (error) {
        console.error('❌ Error fetching blueprint:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBlueprint();
  }, [blueprintId, dispatch]);

  const blueprint = state.blueprints.find(b => b.id === blueprintId);
  // Show loading state while fetching
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="ml-64 p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading blueprint...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!blueprint) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="ml-64 p-6 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Blueprint Not Found
              </h2>
              <p className="text-muted-foreground mb-4">
                {isLoading ? 'Loading...' : "The blueprint you're looking for doesn't exist."}
              </p>
              <Button 
                onClick={() => navigate(projectId ? `/projects/${projectId}` : '/history/blueprints')} 
                variant="outline"
              >
                {projectId ? 'Back to Project' : 'Back to History'}
              </Button>
            </div>
          </main>
      </div>
    );
  }

  const handleSymbolsChange = (symbols: Blueprint['symbols']) => {
    console.log('📋 [BLUEPRINT_DETAIL] Symbols changed, updating context with', symbols.length, 'symbols');
    if (blueprint) {
      const updatedBlueprint = {
        ...blueprint,
        symbols: symbols,
        totalSymbols: symbols.length,
        averageAccuracy: symbols.length > 0 
          ? symbols.reduce((sum, s) => sum + s.confidence, 0) / symbols.length
          : 0
      };
      dispatch({ type: 'UPDATE_BLUEPRINT', payload: updatedBlueprint });
      
      // Check if symbols have changed from original
      const symbolsChanged = JSON.stringify(symbols) !== JSON.stringify(originalSymbols);
      setHasUnsavedChanges(symbolsChanged);
    }
  };

  const handleSaveChanges = async () => {
    if (!blueprint || !hasUnsavedChanges) return;
    
    setIsSaving(true);
    try {
      const response = await updateBlueprint(blueprint.id, {
        symbols: blueprint.symbols,
        totalSymbols: blueprint.symbols?.length || 0,
        averageAccuracy: blueprint.symbols?.length > 0 
          ? blueprint.symbols.reduce((sum, s) => sum + s.confidence, 0) / blueprint.symbols.length
          : 0
      });
      
      if (response.success) {
        setOriginalSymbols(blueprint.symbols || []);
        setHasUnsavedChanges(false);
        toast({
          title: "Changes Saved",
          description: "Symbol changes have been saved successfully."
        });
      } else {
        throw new Error(response.message || 'Failed to save changes');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save changes.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-64 p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Navigation */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate(-1)}
                  className="gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                
                {hasUnsavedChanges && (
                  <Button
                    onClick={handleSaveChanges}
                    disabled={isSaving}
                    className="gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                )}
              </div>
                
                {/* Project/Blueprint Path */}
                {/* <h1 className="text-xl font-semibold text-foreground">
                  {project ? (
                    <>
                      <Link 
                        to={`/projects/${project.id}`}
                        className="hover:text-blue-600 transition-colors"
                      >
                        {project.name}
                      </Link>
                      <span className="text-muted-foreground mx-2">/</span>
                      {blueprint.name}
                    </>
                  ) : (
                    blueprint.name
                  )}
                </h1> */}
              
              {/* Upload Date and Status */}
              <div className="flex items-center gap-4">
                {hasUnsavedChanges && (
                  <span className="text-sm text-amber-600 font-medium">
                    Unsaved changes
                  </span>
                )}
                <div className="text-sm text-muted-foreground">
                  Uploaded: {new Date(blueprint.uploadDate).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Blueprint Viewer */}
              <BlueprintViewer 
                blueprint={blueprint}
                onSymbolsChange={handleSymbolsChange}
              />

            {/* AI Analysis Status / Symbol Analysis */}
            {(!blueprint.aiAnalysis?.isAnalyzed && blueprint.status === 'processing') ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Analysis in Progress</h3>
                  <p className="text-gray-600">Our AI is analyzing your blueprint to detect mechanical symbols...</p>
                  <p className="text-sm text-gray-500 mt-2">This usually takes 30-60 seconds</p>
                </div>
              </div>
            ) : (
              <EnhancedSymbolAnalysis blueprint={blueprint} />
            )}
          </div>
        
        </main>

      <SaveToProjectModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        blueprint={blueprint}
        onSaved={(updatedBlueprint) => {
          setShowSaveModal(false);
          if (updatedBlueprint) {
            dispatch({ type: 'UPDATE_BLUEPRINT', payload: updatedBlueprint });
          }
        }}
      />
    </div>
  );
}

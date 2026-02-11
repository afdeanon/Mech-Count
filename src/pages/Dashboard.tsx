import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Layout/Sidebar';
import { UploadArea } from '@/components/Upload/UploadArea';
import { BlueprintViewer } from '@/components/Blueprint/BlueprintViewer';
import { EnhancedSymbolAnalysis } from '@/components/AI/EnhancedSymbolAnalysis';
import { SaveToProjectModal } from '@/components/Project/SaveToProjectModal';
import { Button } from '@/components/ui/button';
import { Blueprint } from '@/types';
import { deleteBlueprint, getBlueprintById } from '@/services/blueprintService';
import { useApp } from '@/context/AppContext';
import { Save, Upload, Brain, FileImage, RefreshCw } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function Dashboard() {
  const { state, dispatch } = useApp();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isPollingForUpdates, setIsPollingForUpdates] = useState(false);

  const uploadedBlueprint = state.currentBlueprint;
  const [originalFile, setOriginalFile] = useState<File | null>(null);


  // Poll for blueprint updates when status is 'processing'
  useEffect(() => {
    const currentBlueprintId = uploadedBlueprint?.id;
    const currentBlueprintStatus = uploadedBlueprint?.status;

    if (!currentBlueprintId || currentBlueprintStatus !== 'processing') {
      setIsPollingForUpdates(false);
      return;
    }

    setIsPollingForUpdates(true);
    console.log('🔄 Starting to poll for blueprint updates...', currentBlueprintId);

    const pollInterval = setInterval(async () => {
      try {
        console.log('🔄 Polling for blueprint updates...', currentBlueprintId);
        const result = await getBlueprintById(currentBlueprintId);

        if (result.success && result.data) {
          const updatedBlueprint = result.data;
          console.log('📋 Received updated blueprint:', {
            status: updatedBlueprint.status,
            symbolsCount: updatedBlueprint.symbols?.length || 0,
            aiAnalyzed: updatedBlueprint.aiAnalysis?.isAnalyzed,
            symbols: updatedBlueprint.symbols
          });
          console.log('📋 Raw blueprint data:', JSON.stringify(updatedBlueprint, null, 2));

          // Update local state with new data
          dispatch({ type: 'SET_CURRENT_BLUEPRINT', payload: updatedBlueprint });

          // Stop polling if analysis is complete or failed
          if (updatedBlueprint.status === 'completed' || updatedBlueprint.status === 'failed') {
            console.log('✅ Blueprint analysis completed, stopping polling');
            setIsPollingForUpdates(false);
            clearInterval(pollInterval);
          }
        }
      } catch (error) {
        console.error('❌ Error polling for blueprint updates:', error);
        // Continue polling even on error, but maybe reduce frequency
      }
    }, 3000); // Poll every 3 seconds

    // Stop polling after 2 minutes max
    const maxPollTime = setTimeout(() => {
      console.log('⏰ Max polling time reached, stopping updates');
      setIsPollingForUpdates(false);
      clearInterval(pollInterval);
    }, 120000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(maxPollTime);
      setIsPollingForUpdates(false);
    };
  }, [dispatch, uploadedBlueprint?.id, uploadedBlueprint?.status]);

  const handleManualRefresh = async () => {
    if (!uploadedBlueprint?.id) return;

    console.log('🔄 Manual refresh triggered for blueprint:', uploadedBlueprint.id);
    try {
      const result = await getBlueprintById(uploadedBlueprint.id);
      if (result.success && result.data) {
        console.log('📋 Manual refresh - received data:', result.data);
        dispatch({ type: 'SET_CURRENT_BLUEPRINT', payload: result.data });
      } else {
        console.error('❌ Manual refresh failed:', result.message);
      }
    } catch (error) {
      console.error('❌ Manual refresh error:', error);
    }
  };

  const handleBlueprintUploaded = (blueprint: Blueprint, file?: File) => {
    console.log('📋 [DASHBOARD] Blueprint uploaded, received:', blueprint);
    // Store in local state instead of global context
    dispatch({ type: 'SET_CURRENT_BLUEPRINT', payload: blueprint });
    setOriginalFile(file || null);
    // Draft is already stored in context by UploadArea
  };

  const handleSymbolsChange = (symbols: Blueprint['symbols']) => {
    console.log('📋 [DASHBOARD] Symbols changed, updating blueprint with', symbols.length, 'symbols');
    if (uploadedBlueprint) {
      dispatch({ type: 'SET_CURRENT_BLUEPRINT', payload: {
        ...uploadedBlueprint,
        symbols: symbols,
        totalSymbols: symbols.length,
        averageAccuracy: symbols.length > 0
          ? symbols.reduce((sum, s) => sum + s.confidence, 0) / symbols.length
          : 0
      }});
    }
  };

  const handleSaveToProject = () => {
    console.log('📋 [DASHBOARD] Opening SaveToProjectModal with blueprint:', uploadedBlueprint);
    console.log('📋 [DASHBOARD] Blueprint ID being passed:', uploadedBlueprint?.id);
    console.log('📋 [DASHBOARD] Blueprint ID type:', typeof uploadedBlueprint?.id);
    setShowSaveModal(true);
  };

  const handleUploadNewBlueprint = () => {
    setShowConfirmDialog(true);
  };

  const confirmUploadNew = () => {
    // Clean up local blob URL if it exists
    if (uploadedBlueprint?.imageUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(uploadedBlueprint.imageUrl);
    }

    // Clear local state to allow new upload
    dispatch({ type: 'SET_CURRENT_BLUEPRINT', payload: null });
    setOriginalFile(null);
    setIsProcessing(false);
    setShowConfirmDialog(false);

    console.log('🆕 Ready for new upload - previous blueprint cleared');
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-64 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                AI Blueprint Analysis
              </h1>
              <p className="text-muted-foreground">
                Upload your engineering blueprints for AI-powered symbol detection and analysis
              </p>
            </div>

            {/* Action Buttons - Only show when blueprint is uploaded */}
            {uploadedBlueprint && (
              <div className="flex flex-col gap-3 ml-6">
                <Button
                  onClick={handleSaveToProject}
                  className="btn-tech gap-2 px-4 py-2"
                  size="sm"
                >
                  <Save className="w-4 h-4" />
                  Save Blueprint
                </Button>
                <Button
                  onClick={handleUploadNewBlueprint}
                  variant="outline"
                  className="gap-2 px-4 py-2"
                  size="sm"
                >
                  <Upload className="w-4 h-4" />
                  Upload New Blueprint
                </Button>
              </div>
            )}
          </div>

          {!uploadedBlueprint ? (
            <UploadArea
              onBlueprintUploaded={handleBlueprintUploaded}
              isProcessing={isProcessing}
              setIsProcessing={setIsProcessing}
            />
          ) : (
            <div className="space-y-8">
              {/* Blueprint Viewer */}
              <BlueprintViewer
                blueprint={uploadedBlueprint}
                onSymbolsChange={handleSymbolsChange}
              />
              
              {/* AI Analysis Status / Symbol Analysis */}
              {uploadedBlueprint && (
                <>  
                  {(!uploadedBlueprint.aiAnalysis?.isAnalyzed && uploadedBlueprint.status === 'processing') ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                      <div className="text-center">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Analysis in Progress</h3>
                        <p className="text-gray-600">Our AI is analyzing your blueprint to detect mechanical symbols...</p>
                        <p className="text-sm text-gray-500 mt-2">This usually takes 30-60 seconds</p>
                      </div>
                    </div>
                  ) : (
                    <EnhancedSymbolAnalysis blueprint={uploadedBlueprint} />
                  )}
                </>
              )}

            </div>
          )}

        </div>
      </main>

      <SaveToProjectModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        blueprint={uploadedBlueprint}
        originalFile={originalFile}
        onSaved={(updatedBlueprint?: Blueprint) => {
          console.log('📋 [Dashboard] Blueprint saved successfully:', updatedBlueprint);
          setShowSaveModal(false);
          // Clear persisted draft after successful save
          dispatch({ type: 'SET_CURRENT_BLUEPRINT', payload: null });
          setOriginalFile(null);

          // Clean up local blob URL if it exists
          if (uploadedBlueprint?.imageUrl?.startsWith('blob:')) {
            URL.revokeObjectURL(uploadedBlueprint.imageUrl);
          }

          console.log('✅ [Dashboard] Local state cleared after save');

          // Optional: Navigate to project detail if blueprint was assigned to a project
          if (updatedBlueprint?.projectId) {
            console.log('🔗 [Dashboard] Blueprint assigned to project:', updatedBlueprint.projectId);
            // Note: Not auto-navigating to let user decide, but logging for debugging
          }
        }}
      />

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Upload New Blueprint?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to upload a new blueprint? The current blueprint will be discarded and a new upload process will begin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUploadNew}>
              Yes, Start New Upload
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

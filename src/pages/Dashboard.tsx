import { useState } from 'react';
import { Sidebar } from '@/components/Layout/Sidebar';
import { UploadArea } from '@/components/Upload/UploadArea';
import { BlueprintViewer } from '@/components/Blueprint/BlueprintViewer';
import { SymbolAnalysis } from '@/components/Blueprint/SymbolAnalysis';
import { SaveToProjectModal } from '@/components/Project/SaveToProjectModal';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { Blueprint } from '@/types';
import { Save, Upload, RotateCcw } from 'lucide-react';
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
  const [uploadedBlueprint, setUploadedBlueprint] = useState<Blueprint | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  const handleBlueprintUploaded = (blueprint: Blueprint, file?: File) => {
    setUploadedBlueprint(blueprint);
    if (file) {
      setOriginalFile(file);
    }
  };

  const handleSaveToProject = () => {
    setShowSaveModal(true);
  };

  const handleUploadNewBlueprint = () => {
    setShowConfirmDialog(true);
  };

  const handleDiscardBlueprint = () => {
    setShowDiscardDialog(true);
  };

  const confirmDiscardBlueprint = () => {
    setUploadedBlueprint(null);
    setOriginalFile(null);
    setIsProcessing(false);
    setShowDiscardDialog(false);
  };

  const confirmUploadNew = () => {
    // Save current blueprint to history before clearing
    if (uploadedBlueprint) {
      dispatch({ type: 'ADD_BLUEPRINT', payload: uploadedBlueprint });
    }
    setUploadedBlueprint(null);
    setOriginalFile(null);
    setIsProcessing(false);
    setShowConfirmDialog(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-64 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Upload Blueprint
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
                  Save to Project
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
                <Button 
                  onClick={handleDiscardBlueprint} 
                  variant="outline" 
                  className="gap-2 px-4 py-2 text-destructive hover:text-destructive"
                  size="sm"
                >
                  <RotateCcw className="w-4 h-4" />
                  Discard Blueprint
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
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-1">
                      {uploadedBlueprint.name}
                    </h2>
                    <p className="text-muted-foreground">
                      Analysis complete • {uploadedBlueprint.symbols.length} symbols detected
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 text-sm text-success">
                      <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                      Processing Complete
                    </div>
                  </div>
                </div>
                
                <BlueprintViewer blueprint={uploadedBlueprint} />
              </div>

              {/* Symbol Analysis */}
              <SymbolAnalysis 
                blueprint={uploadedBlueprint}
                onSaveToProject={handleSaveToProject}
                showSaveButton={false}
              />
            </div>
          )}
        </div>
      </main>

      <SaveToProjectModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        blueprint={uploadedBlueprint}
        originalFile={originalFile}
        onSaved={() => {
          setShowSaveModal(false);
          setUploadedBlueprint(null);
          setOriginalFile(null);
        }}
      />

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Upload New Blueprint?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to upload a new blueprint? The current analysis will be saved to your history and a new upload process will begin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUploadNew}>
              Yes, Save & Upload New
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard Blueprint?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to discard this blueprint? This action will permanently delete the current analysis and it will NOT be saved to your history. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDiscardBlueprint} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Yes, Discard Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
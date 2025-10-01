import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Layout/Sidebar';
import { UploadArea } from '@/components/Upload/UploadArea';
import { BlueprintViewer } from '@/components/Blueprint/BlueprintViewer';
import { SymbolAnalysis } from '@/components/Blueprint/SymbolAnalysis';
import { SaveToProjectModal } from '@/components/Project/SaveToProjectModal';
import { Button } from '@/components/ui/button';
import { Blueprint } from '@/types';
import { deleteBlueprint } from '@/services/blueprintService';
import { Save, Upload } from 'lucide-react';
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
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Use LOCAL state for uploaded blueprints in this session only
  const [uploadedBlueprint, setUploadedBlueprint] = useState<Blueprint | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);

  const handleBlueprintUploaded = (blueprint: Blueprint, file?: File) => {
    console.log('📋 [DASHBOARD] Blueprint uploaded, received:', blueprint);
    // Store in local state instead of global context
    setUploadedBlueprint(blueprint);
    setOriginalFile(file || null);
    // Draft is already stored in context by UploadArea
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
    setUploadedBlueprint(null);
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
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-1">
                      {uploadedBlueprint.name}
                    </h2>
                    <p className="text-muted-foreground">
                      Blueprint ready to save • {uploadedBlueprint.symbols.length} symbols detected
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                      Ready to Save
                    </div>
                    <Button
                      onClick={() => setShowConfirmDialog(true)}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      New Upload
                    </Button>
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
        onSaved={(updatedBlueprint?: Blueprint) => {
          console.log('📋 [Dashboard] Blueprint saved successfully:', updatedBlueprint);
          setShowSaveModal(false);
          // Clear local state after successful save
          setUploadedBlueprint(null);
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
import { useState } from 'react';
import { Sidebar } from '@/components/Layout/Sidebar';
import { UploadArea } from '@/components/Upload/UploadArea';
import { BlueprintViewer } from '@/components/Blueprint/BlueprintViewer';
import { SymbolAnalysis } from '@/components/Blueprint/SymbolAnalysis';
import { SaveToProjectModal } from '@/components/Project/SaveToProjectModal';
import { useApp } from '@/context/AppContext';
import { Blueprint } from '@/types';

export function Dashboard() {
  const { state } = useApp();
  const [uploadedBlueprint, setUploadedBlueprint] = useState<Blueprint | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBlueprintUploaded = (blueprint: Blueprint) => {
    setUploadedBlueprint(blueprint);
  };

  const handleSaveToProject = () => {
    setShowSaveModal(true);
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Upload Blueprint
            </h1>
            <p className="text-muted-foreground">
              Upload your engineering blueprints for AI-powered symbol detection and analysis
            </p>
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
              />
            </div>
          )}
        </div>
      </main>

      <SaveToProjectModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        blueprint={uploadedBlueprint}
        onSaved={() => {
          setShowSaveModal(false);
          setUploadedBlueprint(null);
        }}
      />
    </div>
  );
}
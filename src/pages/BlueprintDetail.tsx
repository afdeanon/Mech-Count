import { useParams, useNavigate, Link } from 'react-router-dom';
import { Sidebar } from '@/components/Layout/Sidebar';
import { Button } from '@/components/ui/button';
import { BlueprintViewer } from '@/components/Blueprint/BlueprintViewer';
import { SymbolAnalysis } from '@/components/Blueprint/SymbolAnalysis';
import { SaveToProjectModal } from '@/components/Project/SaveToProjectModal';
import { useApp } from '@/context/AppContext';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

export function BlueprintDetail() {
  const { blueprintId, projectId } = useParams<{ blueprintId: string; projectId?: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const [showSaveModal, setShowSaveModal] = useState(false);

  const blueprint = state.blueprints.find(b => b.id === blueprintId);
  const project = blueprint?.projectId 
    ? state.projects.find(p => p.id === blueprint.projectId)
    : null;

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
                The blueprint you're looking for doesn't exist.
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

  const handleSaveToProject = () => {
    setShowSaveModal(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-64 p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Navigation */}
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

              {/* Breadcrumb */}
              {project && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Link 
                    to={`/projects/${project.id}`}
                    className="hover:text-foreground transition-colors"
                  >
                    {project.name}
                  </Link>
                  <ChevronRight className="w-4 h-4" />
                  <span>{blueprint.name}</span>
                </div>
              )}
            </div>

            {/* Blueprint Header */}
            <div className="glass-card p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-foreground mb-2">
                    {blueprint.name}
                  </h1>
                  {blueprint.description && (
                    <p className="text-muted-foreground">
                      {blueprint.description}
                    </p>
                  )}
                </div>
                
                <div className="text-right text-sm text-muted-foreground">
                  <div>Uploaded {new Date(blueprint.uploadDate).toLocaleDateString()}</div>
                  <div>{blueprint.symbols.length} symbols detected</div>
                  <div>{Math.round(blueprint.averageAccuracy)}% average accuracy</div>
                </div>
              </div>
            </div>

            {/* Blueprint Viewer */}
            <div className="glass-card p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Blueprint Analysis
              </h2>
              <BlueprintViewer blueprint={blueprint} />
            </div>

            {/* Symbol Analysis */}
            <SymbolAnalysis 
              blueprint={blueprint}
              onSaveToProject={handleSaveToProject}
              showSaveButton={!blueprint.projectId}
            />
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
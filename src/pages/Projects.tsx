import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sidebar } from '@/components/Layout/Sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CreateProjectModal } from '@/components/Project/CreateProjectModal';
import { useApp } from '@/context/AppContext';
import { Plus, FolderOpen, FileImage, MoreVertical } from 'lucide-react';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { deleteProject } from '@/services/projectService';
import { useToast } from '@/hooks/use-toast';

const formatUpdatedLabel = (dateValue: string | number | Date | undefined | null) => {
  try {
    const date = new Date(dateValue || '');
    if (Number.isNaN(date.getTime())) return 'Updated recently';

    const ageMs = Date.now() - date.getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;

    if (ageMs < oneDayMs) {
      return `Updated ${formatDistanceToNowStrict(date, { addSuffix: true })}`;
    }

    return `Updated on ${format(date, 'MMMM d')}`;
  } catch {
    return 'Updated recently';
  }
};

export function Projects() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { state, dispatch } = useApp();
  const { toast } = useToast();

  const handleDeleteProject = async (projectId: string) => {
    // Get blueprints that will be deleted
    const projectBlueprints = state.blueprints.filter(bp => bp.projectId === projectId);
    const blueprintCount = projectBlueprints.length;
    
    const confirmMessage = blueprintCount > 0 
      ? `Are you sure you want to delete this project?\n\nThis will permanently delete:\n• The project\n• ${blueprintCount} blueprint${blueprintCount !== 1 ? 's' : ''} from your history\n\nThis action cannot be undone.`
      : 'Are you sure you want to delete this project? This action cannot be undone.';
    
    if (confirm(confirmMessage)) {
      try {
        // Delete the project (backend will cascade delete blueprints)
        console.log('🗑️ Deleting project...');
        const response = await deleteProject(projectId);
        
        if (response.success) {
          // Remove project from frontend state
          dispatch({ type: 'DELETE_PROJECT', payload: projectId });
          
          // Remove all associated blueprints from frontend state
          // (they're already deleted from backend via cascade)
          projectBlueprints.forEach(blueprint => {
            dispatch({ type: 'DELETE_BLUEPRINT', payload: blueprint.id });
          });
          
          const deletedCount = response.data?.deletedBlueprints || blueprintCount;
          
          toast({
            title: "Project Deleted",
            description: deletedCount > 0 
              ? `The project and ${deletedCount} associated blueprint${deletedCount !== 1 ? 's have' : ' has'} been permanently deleted.`
              : "The project has been deleted successfully.",
          });
        } else {
          throw new Error(response.message || 'Failed to delete project');
        }
      } catch (error) {
        console.error('❌ Error deleting project:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to delete project.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-56 p-5">
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Projects
                </h1>
                <p className="text-muted-foreground">
                  Organize and manage your blueprint collections
                </p>
              </div>
              
              <Button 
                onClick={() => setShowCreateModal(true)}
                className="btn-tech gap-2"
              >
                <Plus className="w-4 h-4" />
                New Project
              </Button>
            </div>

            {state.projects.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <FolderOpen className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
                  <h3 className="text-xl font-semibold text-foreground mb-4">
                    No Projects Yet
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Create your first project to organize and manage your blueprints more effectively.
                  </p>
                  <Button 
                    onClick={() => setShowCreateModal(true)}
                    className="btn-tech gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Create First Project
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {state.projects.map((project) => {
                  // Calculate blueprint count from state instead of project.blueprints
                  const projectBlueprints = state.blueprints.filter(bp => bp.projectId === project.id);
                  const blueprintCount = projectBlueprints.length;
                  const latestBlueprintUpload = projectBlueprints
                    .map((bp) => new Date(bp.uploadDate).getTime())
                    .filter((time) => !Number.isNaN(time))
                    .sort((a, b) => b - a)[0];
                  const updatedDate = latestBlueprintUpload
                    ? new Date(latestBlueprintUpload)
                    : project.createdAt;
                  
                  return (
                    <div key={project.id} className="relative">
                      <Link to={`/projects/${project.id}`} className="block">
                        <Card className="project-card h-full">
                          <CardContent className="p-6 min-h-[230px] flex flex-col">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-semibold text-foreground mb-2 truncate">
                                  {project.name}
                                </h3>
                                <p className="text-muted-foreground text-sm line-clamp-3 min-h-[60px]">
                                  {project.description || 'No description'}
                                </p>
                              </div>
                            </div>

                            <div className="mt-auto pt-4 border-t border-border min-w-0">
                              <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap overflow-hidden">
                                <FileImage className="w-3.5 h-3.5" />
                                <span>{blueprintCount} blueprint{blueprintCount !== 1 ? 's' : ''}</span>
                                <span aria-hidden="true">•</span>
                                <span className="truncate">{formatUpdatedLabel(updatedDate)}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>

                      {/* Three-dot menu */}
                      <div className="absolute top-4 right-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-secondary"
                              onClick={(e) => e.preventDefault()}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive"
                              onClick={(e) => {
                                e.preventDefault();
                                handleDeleteProject(project.id);
                              }}
                            >
                              Delete Project
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </main>

      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}

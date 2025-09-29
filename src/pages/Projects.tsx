import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Layout/Header';
import { Sidebar } from '@/components/Layout/Sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreateProjectModal } from '@/components/Project/CreateProjectModal';
import { useApp } from '@/context/AppContext';
import { Plus, FolderOpen, Calendar, FileImage, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export function Projects() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { state, dispatch } = useApp();

  const handleDeleteProject = (projectId: string) => {
    if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      dispatch({ type: 'DELETE_PROJECT', payload: projectId });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex h-[calc(100vh-4rem)]">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
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
                Add Project
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
                {state.projects.map((project) => (
                  <div key={project.id} className="relative">
                    <Link to={`/project/${project.id}`} className="block">
                      <Card className="project-card h-full">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-semibold text-foreground mb-2 truncate">
                                {project.name}
                              </h3>
                              <p className="text-muted-foreground text-sm line-clamp-2 mb-4">
                                {project.description}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="w-4 h-4" />
                              <span>Created {format(new Date(project.createdDate), 'MMM d, yyyy')}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <FileImage className="w-4 h-4" />
                              <span>
                                {project.blueprints.length} blueprint{project.blueprints.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>

                          <div className="mt-4 pt-4 border-t border-border">
                            <Badge variant="outline" className="text-xs">
                              {project.blueprints.length === 0 ? 'Empty' : 
                               project.blueprints.length === 1 ? '1 Blueprint' :
                               `${project.blueprints.length} Blueprints`}
                            </Badge>
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
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sidebar } from '@/components/Layout/Sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { Calendar, FileImage, BarChart3, MoreVertical, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { deleteBlueprint } from '@/services/blueprintService';
import { useToast } from '@/hooks/use-toast';

export function History() {
  const { state, dispatch } = useApp();
  const { toast } = useToast();

  // Show loading state if auth is still loading
  if (state.auth.isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="ml-64 p-6">
          <div className="max-w-6xl mx-auto space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Upload History
              </h1>
              <p className="text-muted-foreground">
                Loading...
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const handleDeleteBlueprint = async (blueprintId: string, blueprintName: string) => {
    if (confirm(`Are you sure you want to delete "${blueprintName}"? This action cannot be undone.`)) {
      try {
        const response = await deleteBlueprint(blueprintId);
        
        if (response.success) {
          dispatch({ type: 'DELETE_BLUEPRINT', payload: blueprintId });
          toast({
            title: "Blueprint Deleted",
            description: `"${blueprintName}" has been deleted successfully.`,
          });
        } else {
          throw new Error(response.message || 'Failed to delete blueprint');
        }
      } catch (error) {
        console.error('❌ Error deleting blueprint:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to delete blueprint.",
          variant: "destructive",
        });
      }
    }
  };

    // Sort blueprints by upload date (newest first)
  const sortedBlueprints = [...state.blueprints]
    .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());

  console.log('🔍 History page state:', {
    totalBlueprints: state.blueprints.length,
    filteredBlueprints: sortedBlueprints.length,
    blueprints: state.blueprints.map(bp => ({
      id: bp.id,
      name: bp.name,
      imageUrl: bp.imageUrl,
      hasImageUrl: !!bp.imageUrl,
      isBlob: bp.imageUrl?.startsWith('blob:')
    }))
  });

  // Get recent blueprints (last 3)
  const recentBlueprints = sortedBlueprints.slice(0, 3);

  // Get blueprints from last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const last30DaysBlueprints = sortedBlueprints.filter(
    blueprint => new Date(blueprint.uploadDate) >= thirtyDaysAgo
  );

  const getProjectName = (projectId?: string) => {
    if (!projectId) return null;
    const project = state.projects.find(p => p.id === projectId);
    return project?.name;
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-64 p-6">
          <div className="max-w-6xl mx-auto space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Upload History
              </h1>
              <p className="text-muted-foreground">
                View and manage your previously uploaded blueprints
              </p>
            </div>

            {/* Recent Blueprints */}
            {recentBlueprints.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  Recently Uploaded Blueprints
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recentBlueprints.map((blueprint) => (
                    <div key={blueprint.id} className="relative">
                      <Link
                        to={`/history/blueprints/${blueprint.id}`}
                        className="block"
                      >
                        <Card className="project-card h-full">
                          <div className="aspect-video bg-muted rounded-lg mb-4 overflow-hidden">
                            <img
                              src={blueprint.imageUrl}
                              alt={blueprint.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <CardContent className="p-0">
                            <h3 className="text-lg font-semibold text-foreground mb-2">
                              {blueprint.name}
                            </h3>
                            
                            <div className="space-y-2 mb-4">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="w-4 h-4" />
                                <span>{format(new Date(blueprint.uploadDate), 'MMM d, yyyy')}</span>
                              </div>
                              
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <BarChart3 className="w-4 h-4" />
                                <span>{blueprint.totalSymbols} symbols detected</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              {blueprint.projectId && (
                                <Badge variant="outline" className="text-xs bg-white/90 text-gray-800">
                                  {getProjectName(blueprint.projectId)}
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </Link>

                      {/* Accuracy badge positioned to left of three-dot menu */}
                      <div className="absolute top-4 left-4">
                        <Badge variant="secondary" className="text-xs bg-white/90 text-gray-800">
                          {Math.round(blueprint.averageAccuracy)}% accuracy
                        </Badge>
                      </div>

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
                                handleDeleteBlueprint(blueprint.id, blueprint.name);
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Blueprint
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Full History */}
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Full History (Last 30 Days)
              </h2>
              
              {last30DaysBlueprints.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <FileImage className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      No Blueprints Found
                    </h3>
                    <p className="text-muted-foreground">
                      You haven't uploaded any blueprints in the last 30 days.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {last30DaysBlueprints.map((blueprint) => (
                    <div key={blueprint.id} className="relative">
                      <Link
                        to={`/history/blueprints/${blueprint.id}`}
                        className="block"
                      >
                        <Card className="hover:shadow-medium hover:scale-[1.01] transition-all duration-200">
                          <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                              <div className="w-20 h-16 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                                <img
                                  src={blueprint.imageUrl}
                                  alt={blueprint.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between mb-2">
                                  <h3 className="text-lg font-semibold text-foreground truncate">
                                    {blueprint.name}
                                  </h3>
                                </div>
                                
                                {blueprint.description && (
                                  <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                                    {blueprint.description}
                                  </p>
                                )}
                                
                                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    <span>{format(new Date(blueprint.uploadDate), 'MMM d, yyyy')}</span>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4" />
                                    <span>{blueprint.totalSymbols} symbols</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>

                      {/* Accuracy badge, project badge, and Three-dot menu */}
                      <div className="absolute top-4 right-4 flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs bg-white/90 text-gray-800">
                          {Math.round(blueprint.averageAccuracy)}% accuracy
                        </Badge>
                        {blueprint.projectId && (
                          <Badge variant="outline" className="text-xs bg-white/90 text-gray-800">
                            {getProjectName(blueprint.projectId)}
                          </Badge>
                        )}
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
                                handleDeleteBlueprint(blueprint.id, blueprint.name);
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Blueprint
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
    </div>
  );
}
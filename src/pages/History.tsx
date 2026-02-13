import { Link } from 'react-router-dom';
import { Sidebar } from '@/components/Layout/Sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApp } from '@/context/AppContext';
import { Calendar, FileImage, BarChart3, MoreVertical, Search, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { deleteBlueprint } from '@/services/blueprintService';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

export function History() {
  const { state, dispatch } = useApp();
  const { toast } = useToast();
  const [historySearchTerm, setHistorySearchTerm] = useState('');

  // Show loading state if auth is still loading
  if (state.auth.isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="ml-56 p-5">
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

  const allUploadedBlueprints = sortedBlueprints;
  const filteredFullHistoryBlueprints = allUploadedBlueprints.filter((blueprint) =>
    blueprint.name.toLowerCase().includes(historySearchTerm.toLowerCase())
  );

  const getProjectName = (projectId?: string) => {
    if (!projectId) return null;
    const project = state.projects.find(p => p.id === projectId);
    return project?.name;
  };

  const getAccuracyPercentage = (blueprint: typeof sortedBlueprints[0]) => {
    // If averageAccuracy is already a percentage (> 1), use it
    if (blueprint.averageAccuracy > 1) {
      return Math.round(blueprint.averageAccuracy);
    }
    // If averageAccuracy is a decimal (0-1), convert to percentage
    if (blueprint.averageAccuracy > 0) {
      return Math.round(blueprint.averageAccuracy * 100);
    }
    // Calculate from symbols if averageAccuracy is 0 or missing
    if (blueprint.symbols && blueprint.symbols.length > 0) {
      const avgConfidence = blueprint.symbols.reduce((sum, s) => sum + s.confidence, 0) / blueprint.symbols.length;
      return Math.round(avgConfidence * 100);
    }
    return 0;
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-56 p-5">
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
                            {/* Blueprint Name (left) and Project Badge (right) */}
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="text-lg font-semibold text-foreground mb-1 truncate">
                                {blueprint.name}
                              </h3>
                              {blueprint.projectId && (
                                <Badge variant="outline" className="text-xs bg-white/90 text-gray-800">
                                  {getProjectName(blueprint.projectId)}
                                </Badge>
                              )}
                            </div>
                            
                            
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
                          </CardContent>
                        </Card>
                      </Link>

                      {/* Accuracy badge positioned to left of three-dot menu */}
                      <div className="absolute top-4 left-4">
                        <Badge variant="secondary" className="text-xs bg-white/90 text-gray-800">
                          {getAccuracyPercentage(blueprint)}% accuracy
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
                Full Upload History
              </h2>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search blueprints by name..."
                  value={historySearchTerm}
                  onChange={(e) => setHistorySearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {allUploadedBlueprints.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <FileImage className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      No Blueprints Found
                    </h3>
                    <p className="text-muted-foreground">
                      You haven't uploaded any blueprints yet.
                    </p>
                  </CardContent>
                </Card>
              ) : filteredFullHistoryBlueprints.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <FileImage className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      No Matching Blueprints
                    </h3>
                    <p className="text-muted-foreground">
                      No blueprint matches your search.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {filteredFullHistoryBlueprints.map((blueprint) => (
                    <div key={blueprint.id} className="relative">
                      <Link
                        to={`/history/blueprints/${blueprint.id}`}
                        className="block"
                      >
                        <Card className="hover:shadow-medium hover:scale-[1.01] transition-all duration-200">
                          <CardContent className="p-6 min-h-[144px]">
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
                                
                                <p className="text-muted-foreground text-sm mb-3 max-w-[70%] truncate">
                                  {blueprint.description?.trim() || 'No description'}
                                </p>
                                
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

                      <div className="absolute top-4 right-4 flex items-center gap-2">
                        {blueprint.projectId && (
                          <Badge variant="outline" className="text-xs bg-white/90 text-gray-800">
                            {getProjectName(blueprint.projectId)}
                          </Badge>
                        )}
                        <Badge variant="secondary" className=" text-xs bg-white/90 text-gray-800">
                          {getAccuracyPercentage(blueprint)}% accuracy
                        </Badge>
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

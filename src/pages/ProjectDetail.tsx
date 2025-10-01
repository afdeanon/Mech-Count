import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Sidebar } from '@/components/Layout/Sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { UploadArea } from '@/components/Upload/UploadArea';
import { useApp } from '@/context/AppContext';
import { ArrowLeft, Upload, Search, FileImage, Calendar, BarChart3, MoreVertical, Trash2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { Blueprint } from '@/types';
import { removeBlueprintFromProject, addBlueprintToProject } from '@/services/projectService';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

// Utility function
const safeFormatDate = (dateValue: any, formatString: string, fallback = 'Unknown date') => {
  try {
    const date = new Date(dateValue);
    return isNaN(date.getTime()) ? fallback : format(date, formatString);
  } catch {
    return fallback;
  }
};

// Loading Component
const LoadingState = ({ message = 'Loading project...' }) => (
  <div className="min-h-screen bg-background">
    <Sidebar />
    <main className="ml-64 p-6 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </main>
  </div>
);

// Error Component
const ErrorState = ({ message, onBack }: { message: string; onBack: () => void }) => (
  <div className="min-h-screen bg-background">
    <Sidebar />
    <main className="ml-64 p-6 flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">Project Not Found</h2>
        <p className="text-muted-foreground mb-4">{message}</p>
        <Button onClick={onBack} variant="outline">Back to Projects</Button>
      </div>
    </main>
  </div>
);

// Blueprint Card Component
const BlueprintCard = ({ blueprint, projectId, onRemove }: any) => (
  <div className="relative">
    <Link to={`/projects/${projectId}/blueprints/${blueprint.id}`} className="block">
      <Card className="project-card h-full">
        <div className="aspect-video bg-muted rounded-lg mb-4 overflow-hidden">
          <img src={blueprint.imageUrl} alt={blueprint.name} className="w-full h-full object-cover" />
        </div>
        <CardContent className="p-4">
          <h3 className="text-lg font-semibold text-foreground mb-2">{blueprint.name}</h3>
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>{safeFormatDate(blueprint.uploadDate, 'MMM d, yyyy')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BarChart3 className="w-4 h-4" />
              <span>{blueprint.totalSymbols} symbols detected</span>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            {Math.round(blueprint.averageAccuracy)}% accuracy
          </Badge>
        </CardContent>
      </Card>
    </Link>
    <div className="absolute top-4 right-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-secondary" onClick={(e) => e.preventDefault()}>
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => { e.preventDefault(); onRemove(); }}>
            <Trash2 className="w-4 h-4 mr-2" />
            Remove from Project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </div>
);

// Available Blueprint Item
const AvailableBlueprintItem = ({ blueprint, selected, onSelect }: any) => (
  <Card className={`hover:shadow-medium transition-all cursor-pointer ${selected ? 'ring-2 ring-primary bg-primary/5' : ''}`}>
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <Checkbox checked={selected} onCheckedChange={onSelect} />
        <div className="w-12 h-10 bg-muted rounded overflow-hidden flex-shrink-0">
          <img src={blueprint.imageUrl} alt={blueprint.name} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-foreground truncate">{blueprint.name}</h4>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{blueprint.symbols.length} symbols</span>
            <span>{Math.round(blueprint.averageAccuracy)}% accuracy</span>
            <span>{safeFormatDate(blueprint.uploadDate, 'MMM d')}</span>
          </div>
          {blueprint.description && (
            <p className="text-xs text-muted-foreground mt-1 truncate">{blueprint.description}</p>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);

export function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedBlueprints, setSelectedBlueprints] = useState<Set<string>>(new Set());
  const [isAddingBlueprints, setIsAddingBlueprints] = useState(false);

  const project = state.projects.find(p => p.id === projectId);
  const projectBlueprints = state.blueprints.filter(bp => bp.projectId === projectId);
  const availableBlueprints = state.blueprints.filter(bp => !bp.projectId);
  const filteredBlueprints = availableBlueprints.filter(bp =>
    bp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bp.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Loading state
  if (state.auth.isLoading || state.projectsLoading) {
    return <LoadingState />;
  }

  // Not found state
  if (!project) {
    return <ErrorState message="The project you're looking for doesn't exist." onBack={() => navigate('/projects')} />;
  }

  // Upload handler
  const handleBlueprintUploaded = async (blueprint: Blueprint) => {
    try {
      // Blueprint is already uploaded and assigned to project, just update local state
      const exists = state.blueprints.find(bp => bp.id === blueprint.id);
      dispatch({ type: exists ? 'UPDATE_BLUEPRINT' : 'ADD_BLUEPRINT', payload: blueprint });
      toast({ title: "Blueprint Added", description: `"${blueprint.name}" has been added to the project.` });
      setShowUpload(false);
    } catch (error) {
      console.error('Error handling uploaded blueprint:', error);
      toast({ title: "Error", description: "Failed to process uploaded blueprint.", variant: "destructive" });
      setShowUpload(false);
    }
  };

  // Add selected blueprints
  const handleAddSelectedBlueprints = async () => {
    if (selectedBlueprints.size === 0) return;
    
    setIsAddingBlueprints(true);
    try {
      for (const blueprintId of selectedBlueprints) {
        const response = await addBlueprintToProject(projectId!, blueprintId);
        if (response.success) {
          const blueprint = state.blueprints.find(bp => bp.id === blueprintId);
          if (blueprint) {
            dispatch({ type: 'UPDATE_BLUEPRINT', payload: { ...blueprint, projectId } });
          }
        }
      }
      toast({ title: "Blueprints Added", description: `${selectedBlueprints.size} blueprint(s) added to the project.` });
      setSelectedBlueprints(new Set());
    } catch (error) {
      toast({ title: "Error", description: "Failed to add some blueprints.", variant: "destructive" });
    } finally {
      setIsAddingBlueprints(false);
    }
  };

  // Remove blueprint
  const handleRemoveBlueprintFromProject = async (blueprintId: string, name: string) => {
    if (!confirm(`Remove "${name}" from this project?`)) return;
    
    try {
      const response = await removeBlueprintFromProject(projectId!, blueprintId);
      if (response.success) {
        const blueprint = state.blueprints.find(bp => bp.id === blueprintId);
        if (blueprint) {
          dispatch({ type: 'UPDATE_BLUEPRINT', payload: { ...blueprint, projectId: undefined } });
        }
        toast({ title: "Blueprint Removed", description: `"${name}" removed from the project.` });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to remove blueprint.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-64 p-6">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Navigation */}
          <Button variant="outline" size="sm" onClick={() => navigate('/projects')} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Projects
          </Button>

          {/* Project Header */}
          <div className="glass-card p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">{project.name}</h1>
                <p className="text-muted-foreground text-lg">{project.description}</p>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <div>Created {safeFormatDate(project.createdAt, 'MMM d, yyyy')}</div>
                <div>{projectBlueprints.length} blueprint{projectBlueprints.length !== 1 ? 's' : ''}</div>
              </div>
            </div>
          </div>

          {/* Upload/Add Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Upload New */}
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Upload New Blueprint</h2>
                <p className="text-sm text-muted-foreground">Upload a blueprint directly to "{project.name}"</p>
              </div>
              {showUpload ? (
                <div className="space-y-4">
                  <div className="border-2 border-primary/20 rounded-lg p-4 bg-primary/5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                      <span className="text-sm font-medium text-primary">Uploading to {project.name}</span>
                    </div>
                    <UploadArea onBlueprintUploaded={handleBlueprintUploaded} isProcessing={isProcessing} setIsProcessing={setIsProcessing} projectId={projectId} />
                  </div>
                  <Button variant="outline" onClick={() => setShowUpload(false)} disabled={isProcessing}>Cancel Upload</Button>
                </div>
              ) : (
                <Card className="border-dashed border-2 border-border hover:border-primary transition-colors cursor-pointer">
                  <CardContent className="p-8 text-center" onClick={() => setShowUpload(true)}>
                    <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">Upload Blueprint to Project</h3>
                    <p className="text-muted-foreground">Upload and automatically add to "{project.name}"</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Add Existing */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">Add Existing Blueprints</h2>
                {selectedBlueprints.size > 0 && (
                  <Button onClick={handleAddSelectedBlueprints} disabled={isAddingBlueprints} className="btn-tech gap-2">
                    <Plus className="w-4 h-4" />
                    Add {selectedBlueprints.size} Blueprint{selectedBlueprints.size !== 1 ? 's' : ''}
                  </Button>
                )}
              </div>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search unassigned blueprints..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
                {filteredBlueprints.length > 0 && (
                  <div className="flex items-center space-x-2 p-3 bg-muted/30 rounded-lg">
                    <Checkbox id="select-all" checked={selectedBlueprints.size === filteredBlueprints.length} onCheckedChange={(checked) => setSelectedBlueprints(checked ? new Set(filteredBlueprints.map(bp => bp.id)) : new Set())} />
                    <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                      Select all {filteredBlueprints.length} blueprint{filteredBlueprints.length !== 1 ? 's' : ''}
                    </label>
                  </div>
                )}
                <div className="h-96 overflow-y-auto border rounded-lg bg-background">
                  {filteredBlueprints.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-center py-8 text-muted-foreground">
                      <div>
                        <FileImage className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p>{availableBlueprints.length === 0 ? 'No unassigned blueprints available' : 'No blueprints match your search'}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2 space-y-2">
                      {filteredBlueprints.map(bp => (
                        <AvailableBlueprintItem
                          key={bp.id}
                          blueprint={bp}
                          selected={selectedBlueprints.has(bp.id)}
                          onSelect={(checked: boolean) => {
                            const newSet = new Set(selectedBlueprints);
                            checked ? newSet.add(bp.id) : newSet.delete(bp.id);
                            setSelectedBlueprints(newSet);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Project Blueprints */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Project Blueprints ({projectBlueprints.length})</h2>
            {projectBlueprints.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileImage className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Blueprints Yet</h3>
                  <p className="text-muted-foreground">Upload or add existing blueprints to get started.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projectBlueprints.map(bp => (
                  <BlueprintCard
                    key={bp.id}
                    blueprint={bp}
                    projectId={projectId}
                    onRemove={() => handleRemoveBlueprintFromProject(bp.id, bp.name)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
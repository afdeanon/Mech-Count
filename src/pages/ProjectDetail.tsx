import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Sidebar } from '@/components/Layout/Sidebar';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UploadArea } from '@/components/Upload/UploadArea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Blueprint, Project } from '@/types';
import { addBlueprintToProject, deleteProject, removeBlueprintFromProject, updateProject } from '@/services/projectService';
import { ArrowLeft, MoreVertical, Plus, Search, Settings } from 'lucide-react';
import { format, formatDistanceToNowStrict } from 'date-fns';

const safeFormatDate = (dateValue: string | number | Date | undefined | null, formatString: string, fallback = 'Unknown date') => {
  try {
    const date = new Date(dateValue || '');
    return Number.isNaN(date.getTime()) ? fallback : format(date, formatString);
  } catch {
    return fallback;
  }
};

const formatUpdatedLabel = (dateValue: string | number | Date | undefined | null) => {
  try {
    const date = new Date(dateValue || '');
    if (Number.isNaN(date.getTime())) return 'Updated recently';

    const ageMs = Date.now() - date.getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;

    if (ageMs < oneDayMs) {
      return `Updated ${formatDistanceToNowStrict(date, { addSuffix: true })}`;
    }

    return `Updated on ${safeFormatDate(date, 'MMMM d', 'recently')}`;
  } catch {
    return 'Updated recently';
  }
};

const categoryColorMap: Record<string, string> = {
  hydraulic: 'bg-blue-500',
  pneumatic: 'bg-green-500',
  mechanical: 'bg-orange-500',
  electrical: 'bg-yellow-500',
  ventilation: 'bg-cyan-500',
  hvac: 'bg-sky-500',
  other: 'bg-slate-500',
};

const getDominantCategoryDotClass = (blueprint: Blueprint) => {
  if (!blueprint.symbols || blueprint.symbols.length === 0) {
    return categoryColorMap.other;
  }

  const counts = blueprint.symbols.reduce<Record<string, number>>((acc, symbol) => {
    const key = (symbol.category || 'other').toLowerCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  let dominantCategory = 'other';
  let maxCount = -1;

  Object.entries(counts).forEach(([category, count]) => {
    if (count > maxCount) {
      dominantCategory = category;
      maxCount = count;
    }
  });

  return categoryColorMap[dominantCategory] || categoryColorMap.other;
};

const LoadingState = ({ message = 'Loading project...' }) => (
  <div className="min-h-screen bg-background">
    <Sidebar />
    <main className="ml-56 p-5 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </main>
  </div>
);

const ErrorState = ({ message, onBack }: { message: string; onBack: () => void }) => (
  <div className="min-h-screen bg-background">
    <Sidebar />
    <main className="ml-56 p-5 flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">Project Not Found</h2>
        <p className="text-muted-foreground mb-4">{message}</p>
        <Button onClick={onBack} variant="outline">Back</Button>
      </div>
    </main>
  </div>
);

export function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [availableSearchTerm, setAvailableSearchTerm] = useState('');
  const [selectedBlueprints, setSelectedBlueprints] = useState<Set<string>>(new Set());
  const [isAddingBlueprints, setIsAddingBlueprints] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectDescription, setEditProjectDescription] = useState('');
  const [isSavingProjectDetails, setIsSavingProjectDetails] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [showFullDetails, setShowFullDetails] = useState(false);
  const [removingBlueprintId, setRemovingBlueprintId] = useState<string | null>(null);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [blueprintToMove, setBlueprintToMove] = useState<Blueprint | null>(null);
  const [targetProjectId, setTargetProjectId] = useState('');
  const [isMovingBlueprint, setIsMovingBlueprint] = useState(false);

  const project = state.projects.find((p) => p.id === projectId);

  if (state.auth.isLoading || state.projectsLoading) {
    return <LoadingState />;
  }

  if (!project) {
    return <ErrorState message="The project you're looking for doesn't exist." onBack={() => navigate(-1)} />;
  }

  const projectBlueprints = state.blueprints.filter((bp) => bp.projectId === project.id);
  const filteredProjectBlueprints = projectBlueprints.filter((bp) =>
    bp.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const availableBlueprints = state.blueprints.filter((bp) => !bp.projectId);
  const filteredAvailableBlueprints = availableBlueprints.filter((bp) =>
    bp.name.toLowerCase().includes(availableSearchTerm.toLowerCase())
  );
  const allFilteredBlueprintsSelected =
    filteredAvailableBlueprints.length > 0 &&
    filteredAvailableBlueprints.every((bp) => selectedBlueprints.has(bp.id));
  const shouldScrollAvailableBlueprints = filteredAvailableBlueprints.length > 3;
  const moveTargetProjects = state.projects.filter((p) => p.id !== project.id);

  const projectDetailsText = (project.description || '').trim();
  const shouldTruncateDetails = projectDetailsText.length > 220;
  const visibleProjectDetails = shouldTruncateDetails && !showFullDetails
    ? `${projectDetailsText.slice(0, 220)}...`
    : projectDetailsText;


  const handleOpenEditDialog = () => {
    setEditProjectName(project.name || '');
    setEditProjectDescription(project.description || '');
    setShowEditDialog(true);
  };

  const handleSaveProjectDetails = async () => {
    const trimmedName = editProjectName.trim();
    if (!trimmedName) {
      toast({
        title: 'Name Required',
        description: 'Project name cannot be empty.',
        variant: 'destructive',
      });
      return;
    }

    setIsSavingProjectDetails(true);
    try {
      const response = await updateProject(project.id, {
        name: trimmedName,
        description: editProjectDescription,
      });

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to update project details');
      }

      dispatch({ type: 'UPDATE_PROJECT', payload: response.data });
      setShowEditDialog(false);

      toast({
        title: 'Project Updated',
        description: 'Project details have been updated.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update project details.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingProjectDetails(false);
    }
  };

  const handleDeleteProject = async () => {
    setIsDeletingProject(true);
    try {
      const response = await deleteProject(project.id);
      if (!response.success) {
        throw new Error(response.message || 'Failed to delete project');
      }

      dispatch({ type: 'DELETE_PROJECT', payload: project.id });
      projectBlueprints.forEach((bp) => dispatch({ type: 'DELETE_BLUEPRINT', payload: bp.id }));

      toast({
        title: 'Project Deleted',
        description: `"${project.name}" and its associated blueprints were deleted.`,
      });

      navigate('/projects');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete project.',
        variant: 'destructive',
      });
    } finally {
      setIsDeletingProject(false);
      setShowDeleteDialog(false);
    }
  };

  const handleBlueprintUploaded = (blueprint: Blueprint) => {
    const exists = state.blueprints.find((bp) => bp.id === blueprint.id);
    dispatch({ type: exists ? 'UPDATE_BLUEPRINT' : 'ADD_BLUEPRINT', payload: blueprint });

    toast({
      title: 'Blueprint Added',
      description: `"${blueprint.name}" has been added to this project.`,
    });

    navigate(`/projects/${project.id}/blueprints/${blueprint.id}`);
  };

  const handleAddSelectedBlueprints = async () => {
    if (selectedBlueprints.size === 0) return;

    setIsAddingBlueprints(true);
    try {
      for (const blueprintId of selectedBlueprints) {
        const response = await addBlueprintToProject(project.id, blueprintId);
        if (response.success) {
          const blueprint = state.blueprints.find((bp) => bp.id === blueprintId);
          if (blueprint) {
            dispatch({ type: 'UPDATE_BLUEPRINT', payload: { ...blueprint, projectId: project.id } });
          }
        }
      }

      toast({
        title: 'Blueprints Added',
        description: `${selectedBlueprints.size} blueprint(s) added to this project.`,
      });

      setSelectedBlueprints(new Set());
      setShowAddDialog(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add blueprints.',
        variant: 'destructive',
      });
    } finally {
      setIsAddingBlueprints(false);
    }
  };

  const handleSelectAllFilteredBlueprints = () => {
    if (filteredAvailableBlueprints.length === 0) return;

    const next = new Set(selectedBlueprints);
    filteredAvailableBlueprints.forEach((bp) => next.add(bp.id));
    setSelectedBlueprints(next);
  };

  const handleRemoveBlueprintFromProject = async (blueprint: Blueprint) => {
    setRemovingBlueprintId(blueprint.id);
    try {
      const response = await removeBlueprintFromProject(project.id, blueprint.id);
      if (!response.success) {
        throw new Error(response.message || 'Failed to remove blueprint from project');
      }

      dispatch({ type: 'UPDATE_BLUEPRINT', payload: { ...blueprint, projectId: undefined } });
      toast({
        title: 'Blueprint Removed',
        description: `"${blueprint.name}" was removed from this project.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to remove blueprint from project.',
        variant: 'destructive',
      });
    } finally {
      setRemovingBlueprintId(null);
    }
  };

  const handleOpenMoveDialog = (blueprint: Blueprint) => {
    setBlueprintToMove(blueprint);
    setTargetProjectId('');
    setShowMoveDialog(true);
  };

  const handleMoveBlueprintToProject = async () => {
    if (!blueprintToMove || !targetProjectId) return;

    setIsMovingBlueprint(true);
    try {
      const removeResponse = await removeBlueprintFromProject(project.id, blueprintToMove.id);
      if (!removeResponse.success) {
        throw new Error(removeResponse.message || 'Failed to remove blueprint from current project');
      }

      const addResponse = await addBlueprintToProject(targetProjectId, blueprintToMove.id);
      if (!addResponse.success) {
        await addBlueprintToProject(project.id, blueprintToMove.id);
        throw new Error(addResponse.message || 'Failed to add blueprint to target project');
      }

      dispatch({ type: 'UPDATE_BLUEPRINT', payload: { ...blueprintToMove, projectId: targetProjectId } });

      const targetProjectName = state.projects.find((p) => p.id === targetProjectId)?.name || 'target project';
      toast({
        title: 'Blueprint Moved',
        description: `"${blueprintToMove.name}" moved to "${targetProjectName}".`,
      });

      setShowMoveDialog(false);
      setBlueprintToMove(null);
      setTargetProjectId('');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to move blueprint.',
        variant: 'destructive',
      });
    } finally {
      setIsMovingBlueprint(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-56 p-5">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings className="w-4 h-4" />
                  Settings
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleOpenEditDialog}>Edit Details</DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  Delete Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-3 px-1">
            <h1 className="text-3xl font-bold text-foreground">{project.name}</h1>

            <div className="text-muted-foreground leading-relaxed">
              {projectDetailsText ? visibleProjectDetails : 'No project details yet.'}
            </div>

            {shouldTruncateDetails && (
              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={() => setShowFullDetails((prev) => !prev)}
              >
                {showFullDetails ? 'Show Less' : 'Show More'}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="rounded-2xl border border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-4">
                    <CardTitle className="text-2xl">Blueprints</CardTitle>
                    <Button className="gap-1" onClick={() => setShowAddDialog(true)}>
                      <Plus className="w-4 h-4"/>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search blueprints by title..."
                      className="pl-10"
                    />
                  </div>

                  {filteredProjectBlueprints.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                      No blueprints found.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredProjectBlueprints.map((bp) => (
                        <div key={bp.id} className="relative">
                          <Link to={`/projects/${project.id}/blueprints/${bp.id}`} className="block">
                            <div className="rounded-xl border border-border p-4 pr-16 hover:bg-muted/30 transition-colors">
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                  <h3 className="font-semibold text-foreground truncate">{bp.name}</h3>
                                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                    {bp.description || 'No description'}
                                  </p>
                                  <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                                    <span className={`inline-block h-2 w-2 rounded-full ${getDominantCategoryDotClass(bp)}`} />
                                    <span>{bp.totalSymbols} symbols</span>
                                  </div>
                                </div>
                                <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
                                  <div>{formatUpdatedLabel(bp.uploadDate)}</div>
                                </div>
                              </div>
                            </div>
                          </Link>

                          <div className="absolute top-3 right-3">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={(e) => e.preventDefault()}
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleOpenMoveDialog(bp);
                                  }}
                                  disabled={moveTargetProjects.length === 0 || removingBlueprintId === bp.id}
                                >
                                  Move to Another Project
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleRemoveBlueprintFromProject(bp);
                                  }}
                                  disabled={removingBlueprintId === bp.id}
                                >
                                  {removingBlueprintId === bp.id ? 'Removing...' : 'Remove from Project'}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-1">
              <Card className="rounded-2xl border border-border">
                <CardHeader>
                  <CardTitle className="text-2xl">Upload Blueprint</CardTitle>
                </CardHeader>
                <CardContent>
                  <UploadArea
                    onBlueprintUploaded={handleBlueprintUploaded}
                    isProcessing={isProcessing}
                    setIsProcessing={setIsProcessing}
                    projectId={project.id}
                    compact
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Existing Blueprints</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search unassigned blueprints by title..."
                value={availableSearchTerm}
                onChange={(e) => setAvailableSearchTerm(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleSelectAllFilteredBlueprints}
                disabled={filteredAvailableBlueprints.length === 0 || allFilteredBlueprintsSelected}
              >
                Select all
              </Button>
            </div>

            <div
              className={`space-y-2 border rounded-lg p-2 bg-muted/10 ${shouldScrollAvailableBlueprints ? 'max-h-[236px] overflow-y-auto' : ''}`}
            >
              {availableBlueprints.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  You must upload a blueprint to add it to this project.
                </div>
              ) : filteredAvailableBlueprints.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">No matching unassigned blueprints found.</div>
              ) : (
                filteredAvailableBlueprints.map((bp) => {
                  const checked = selectedBlueprints.has(bp.id);
                  return (
                    <label key={bp.id} className="flex items-start gap-3 rounded-md border bg-white p-3 cursor-pointer hover:bg-muted/30">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) => {
                          const next = new Set(selectedBlueprints);
                          if (value) {
                            next.add(bp.id);
                          } else {
                            next.delete(bp.id);
                          }
                          setSelectedBlueprints(next);
                        }}
                      />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{bp.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{bp.description || 'No description'}</p>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddSelectedBlueprints} disabled={selectedBlueprints.size === 0 || isAddingBlueprints}>
              {isAddingBlueprints
                ? 'Adding...'
                : `Add ${selectedBlueprints.size} ${selectedBlueprints.size === 1 ? 'Blueprint' : 'Blueprints'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showMoveDialog}
        onOpenChange={(open) => {
          setShowMoveDialog(open);
          if (!open) {
            setBlueprintToMove(null);
            setTargetProjectId('');
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Move Blueprint</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Move <span className="font-medium text-foreground">{blueprintToMove?.name}</span> to another project.
            </p>

            <Select value={targetProjectId} onValueChange={setTargetProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select target project" />
              </SelectTrigger>
              <SelectContent>
                {moveTargetProjects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMoveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleMoveBlueprintToProject} disabled={!targetProjectId || isMovingBlueprint}>
              {isMovingBlueprint ? 'Moving...' : 'Move Blueprint'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Project Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Title</Label>
              <Input
                id="project-name"
                value={editProjectName}
                onChange={(e) => setEditProjectName(e.target.value)}
                placeholder="Enter project title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-description">Project Details</Label>
              <Textarea
                id="project-description"
                value={editProjectDescription}
                onChange={(e) => setEditProjectDescription(e.target.value)}
                placeholder="Enter project details"
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveProjectDetails} disabled={isSavingProjectDetails}>
              {isSavingProjectDetails ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{project.name}" and all blueprints assigned to it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProject} disabled={isDeletingProject}>
              {isDeletingProject ? 'Deleting...' : 'Delete Project'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { Link, useParams, useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/Layout/Sidebar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BlueprintViewer } from '@/components/Blueprint/BlueprintViewer';
import { SaveToProjectModal } from '@/components/Project/SaveToProjectModal';
import { EnhancedSymbolAnalysis } from '@/components/AI/EnhancedSymbolAnalysis';
import { useApp } from '@/context/AppContext';
import { ArrowDownToLine, ArrowLeft, Settings } from 'lucide-react';
import { useState, useEffect } from 'react';
import { deleteBlueprint, getBlueprintById, updateBlueprint } from '@/services/blueprintService';
import { addBlueprintToProject, removeBlueprintFromProject } from '@/services/projectService';
import { useToast } from '@/hooks/use-toast';
import type { Blueprint } from '@/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { buildBlueprintCsv, safeFilename } from '@/lib/blueprintCsv';

export function BlueprintDetail() {
  const { blueprintId, projectId } = useParams<{ blueprintId: string; projectId?: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [originalSymbols, setOriginalSymbols] = useState<Blueprint['symbols']>([]);
  const [isPollingForUpdates, setIsPollingForUpdates] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showManageAssignmentDialog, setShowManageAssignmentDialog] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isUpdatingDetails, setIsUpdatingDetails] = useState(false);
  const [isDeletingBlueprint, setIsDeletingBlueprint] = useState(false);
  const [assignmentTargetProjectId, setAssignmentTargetProjectId] = useState('__none');
  const [isUpdatingAssignment, setIsUpdatingAssignment] = useState(false);
  const { toast } = useToast();

  // Fetch latest blueprint data from server on mount
  useEffect(() => {
    const fetchBlueprint = async () => {
      if (!blueprintId) return;
      
      console.log('📋 Fetching latest blueprint data from server:', blueprintId);
      setIsLoading(true);
      
      try {
        const response = await getBlueprintById(blueprintId);
        if (response.success && response.data) {
          console.log('✅ Fetched blueprint with', response.data.symbols?.length || 0, 'symbols');
          // Update the blueprint in context with fresh data from server
          dispatch({ type: 'UPDATE_BLUEPRINT', payload: response.data });
          // Store original symbols to track changes
          setOriginalSymbols(response.data.symbols || []);
        } else {
          console.error('❌ Failed to fetch blueprint:', response.message);
        }
      } catch (error) {
        console.error('❌ Error fetching blueprint:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBlueprint();
  }, [blueprintId, dispatch]);

  const blueprint = state.blueprints.find(b => b.id === blueprintId);
  const hasBlueprint = Boolean(blueprint);
  const currentStatus = blueprint?.status;
  const associatedProjectId = blueprint?.projectId || projectId;
  const project = associatedProjectId
    ? state.projects.find(p => p.id === associatedProjectId)
    : null;
  const availableProjects = state.projects;

  // Poll for updates while AI analysis is processing
  useEffect(() => {
    if (!blueprintId || !hasBlueprint || currentStatus !== 'processing') {
      setIsPollingForUpdates(false);
      return;
    }

    setIsPollingForUpdates(true);
    console.log('🔄 [BLUEPRINT_DETAIL] Starting polling for AI status updates:', blueprintId);

    const pollInterval = setInterval(async () => {
      try {
        const response = await getBlueprintById(blueprintId);
        if (response.success && response.data) {
          dispatch({ type: 'UPDATE_BLUEPRINT', payload: response.data });

          if (response.data.status === 'completed' || response.data.status === 'failed') {
            console.log('✅ [BLUEPRINT_DETAIL] AI analysis finished, stopping polling');
            setIsPollingForUpdates(false);
            clearInterval(pollInterval);
          }
        }
      } catch (error) {
        console.error('❌ [BLUEPRINT_DETAIL] Polling error:', error);
      }
    }, 3000);

    const maxPollTime = setTimeout(() => {
      console.log('⏰ [BLUEPRINT_DETAIL] Max polling time reached, stopping');
      setIsPollingForUpdates(false);
      clearInterval(pollInterval);
    }, 120000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(maxPollTime);
      setIsPollingForUpdates(false);
    };
  }, [blueprintId, hasBlueprint, currentStatus, dispatch]);
  // Show loading state while fetching
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="ml-0 md:ml-56 p-4 md:p-5 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading blueprint...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!blueprint) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="ml-0 md:ml-56 p-4 md:p-5 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Blueprint Not Found
              </h2>
              <p className="text-muted-foreground mb-4">
                {isLoading ? 'Loading...' : "The blueprint you're looking for doesn't exist."}
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

  const handleSymbolsChange = (symbols: Blueprint['symbols']) => {
    console.log('📋 [BLUEPRINT_DETAIL] Symbols changed, updating context with', symbols.length, 'symbols');
    if (blueprint) {
      const updatedBlueprint = {
        ...blueprint,
        symbols: symbols,
        totalSymbols: symbols.length,
        averageAccuracy: symbols.length > 0 
          ? symbols.reduce((sum, s) => sum + s.confidence, 0) / symbols.length
          : 0
      };
      dispatch({ type: 'UPDATE_BLUEPRINT', payload: updatedBlueprint });
      
      // Check if symbols have changed from original
      const symbolsChanged = JSON.stringify(symbols) !== JSON.stringify(originalSymbols);
      setHasUnsavedChanges(symbolsChanged);
    }
  };

  const handleSaveChanges = async () => {
    if (!blueprint || !hasUnsavedChanges) return;
    
    setIsSaving(true);
    try {
      const response = await updateBlueprint(blueprint.id, {
        symbols: blueprint.symbols,
        totalSymbols: blueprint.symbols?.length || 0,
        averageAccuracy: blueprint.symbols?.length > 0 
          ? blueprint.symbols.reduce((sum, s) => sum + s.confidence, 0) / blueprint.symbols.length
          : 0
      });
      
      if (response.success) {
        setOriginalSymbols(blueprint.symbols || []);
        setHasUnsavedChanges(false);
        toast({
          title: "Changes Saved",
          description: "Symbol changes have been saved successfully."
        });
      } else {
        throw new Error(response.message || 'Failed to save changes');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save changes.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenEditDialog = () => {
    setEditName(blueprint.name || '');
    setEditDescription(blueprint.description || '');
    setShowEditDialog(true);
  };

  const handleSaveBlueprintDetails = async () => {
    if (!blueprint) return;

    const trimmedName = editName.trim();
    if (!trimmedName) {
      toast({
        title: 'Name Required',
        description: 'Blueprint name cannot be empty.',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdatingDetails(true);
    try {
      const response = await updateBlueprint(blueprint.id, {
        name: trimmedName,
        description: editDescription,
      });

      if (!response.success) {
        throw new Error(response.message || 'Failed to update blueprint details');
      }

      const updatedBlueprint = {
        ...blueprint,
        ...(response.data || {}),
        name: trimmedName,
        description: editDescription,
      };

      dispatch({ type: 'UPDATE_BLUEPRINT', payload: updatedBlueprint });
      setShowEditDialog(false);

      toast({
        title: 'Blueprint Updated',
        description: 'Blueprint details have been updated.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update blueprint details.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingDetails(false);
    }
  };

  const handleDeleteBlueprint = async () => {
    if (!blueprint) return;

    setIsDeletingBlueprint(true);
    try {
      const response = await deleteBlueprint(blueprint.id);
      if (!response.success) {
        throw new Error(response.message || 'Failed to delete blueprint');
      }

      dispatch({ type: 'DELETE_BLUEPRINT', payload: blueprint.id });
      setShowDeleteDialog(false);

      toast({
        title: 'Blueprint Deleted',
        description: `"${blueprint.name}" has been deleted.`,
      });

      navigate(associatedProjectId ? `/projects/${associatedProjectId}` : '/history/blueprints');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete blueprint.',
        variant: 'destructive',
      });
    } finally {
      setIsDeletingBlueprint(false);
    }
  };

  const handleOpenManageAssignmentDialog = () => {
    setAssignmentTargetProjectId(blueprint.projectId || '__none');
    setShowManageAssignmentDialog(true);
  };

  const handleSaveProjectAssignment = async () => {
    if (!blueprint) return;

    const currentProjectId = blueprint.projectId;
    const nextProjectId = assignmentTargetProjectId === '__none' ? undefined : assignmentTargetProjectId;

    if (currentProjectId === nextProjectId) {
      setShowManageAssignmentDialog(false);
      return;
    }

    setIsUpdatingAssignment(true);
    try {
      if (currentProjectId && !nextProjectId) {
        const removeResponse = await removeBlueprintFromProject(currentProjectId, blueprint.id);
        if (!removeResponse.success) {
          throw new Error(removeResponse.message || 'Failed to remove blueprint from project');
        }
      } else if (!currentProjectId && nextProjectId) {
        const addResponse = await addBlueprintToProject(nextProjectId, blueprint.id);
        if (!addResponse.success) {
          throw new Error(addResponse.message || 'Failed to add blueprint to project');
        }
      } else if (currentProjectId && nextProjectId && currentProjectId !== nextProjectId) {
        const removeResponse = await removeBlueprintFromProject(currentProjectId, blueprint.id);
        if (!removeResponse.success) {
          throw new Error(removeResponse.message || 'Failed to remove blueprint from current project');
        }

        const addResponse = await addBlueprintToProject(nextProjectId, blueprint.id);
        if (!addResponse.success) {
          await addBlueprintToProject(currentProjectId, blueprint.id);
          throw new Error(addResponse.message || 'Failed to add blueprint to selected project');
        }
      }

      const updatedBlueprint = {
        ...blueprint,
        projectId: nextProjectId,
      };

      dispatch({ type: 'UPDATE_BLUEPRINT', payload: updatedBlueprint });
      setShowManageAssignmentDialog(false);

      const nextProjectName = nextProjectId
        ? state.projects.find((p) => p.id === nextProjectId)?.name || 'project'
        : null;

      toast({
        title: 'Project Assignment Updated',
        description: nextProjectName
          ? `"${blueprint.name}" is now assigned to "${nextProjectName}".`
          : `"${blueprint.name}" is no longer assigned to a project.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update project assignment.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingAssignment(false);
    }
  };

  const handleExportCsv = () => {
    if (!blueprint) return;
    const csvContent = buildBlueprintCsv(blueprint, project?.name);

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeFilename(blueprint.name)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-0 md:ml-56 p-4 md:p-5">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Navigation */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-2 md:gap-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate(-1)}
                  className="gap-2 bg-white text-gray-800 border border-border hover:bg-[#FCF9F5] hover:text-gray-900 shadow-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>

                {project && (
                  <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                    <Link
                      to={`/projects/${project.id}`}
                      className="font-medium text-foreground hover:text-primary transition-colors truncate max-w-[10rem] sm:max-w-[16rem]"
                    >
                      {project.name}
                    </Link>
                    <span className="shrink-0">/</span>
                    <span className="font-medium text-foreground truncate max-w-[9rem] sm:max-w-[20rem]">
                      {blueprint.name}
                    </span>
                  </div>
                )}
                
              </div>
                
                {/* Project/Blueprint Path */}
                {/* <h1 className="text-xl font-semibold text-foreground">
                  {project ? (
                    <>
                      <Link 
                        to={`/projects/${project.id}`}
                        className="hover:text-blue-600 transition-colors"
                      >
                        {project.name}
                      </Link>
                      <span className="text-muted-foreground mx-2">/</span>
                      {blueprint.name}
                    </>
                  ) : (
                    blueprint.name
                  )}
                </h1> */}
              
              {/* Upload Date and Status */}
              <div className="flex items-center justify-between md:justify-end gap-3">
                {isPollingForUpdates && (
                  <span className="text-xs text-muted-foreground">Refreshing analysis...</span>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 bg-white text-gray-800 border border-border hover:bg-[#FCF9F5] hover:text-gray-900 shadow-sm"
                    >
                      <Settings className="w-4 h-4" />
                      <span className="hidden sm:inline">Settings</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-40 bg-white border border-gray-200">
                    <DropdownMenuItem className="bg-white focus:bg-[#FCF9F5]" onClick={handleOpenManageAssignmentDialog}>
                      Manage Project Assignment
                    </DropdownMenuItem>
                    <DropdownMenuItem className="bg-white focus:bg-[#FCF9F5]" onClick={handleOpenEditDialog}>
                      Edit Details
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="bg-white text-destructive focus:bg-[#FCF9F5] focus:text-destructive"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      Delete Blueprint
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Blueprint Name and Details Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground break-words">{blueprint.name}</h1>
                {blueprint.description && (
                  <p className="text-muted-foreground mt-1 text-sm sm:text-base break-words">{blueprint.description}</p>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 bg-[#ED5C1C] text-white border border-[#ED5C1C] hover:bg-[#EC5D20] hover:text-white shadow-sm"
                  >
                    <ArrowDownToLine className="w-4 h-4" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white border border-gray-200">
                  <DropdownMenuItem onClick={handleExportCsv}>
                    Download CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          

            {/* Blueprint Viewer */}
              <BlueprintViewer 
                blueprint={blueprint}
                onSymbolsChange={handleSymbolsChange}
                hasUnsavedChanges={hasUnsavedChanges}
                onSaveChanges={handleSaveChanges}
                isSavingChanges={isSaving}
              />

            {/* AI Analysis Status / Symbol Analysis */}
            {(!blueprint.aiAnalysis?.isAnalyzed && blueprint.status === 'processing') ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Analysis in Progress</h3>
                  <p className="text-gray-600">Our AI is analyzing your blueprint to detect mechanical symbols...</p>
                  <p className="text-sm text-gray-500 mt-2">This usually takes 30-60 seconds</p>
                </div>
              </div>
            ) : (
              <EnhancedSymbolAnalysis blueprint={blueprint} />
            )}
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

      <Dialog
        open={showManageAssignmentDialog}
        onOpenChange={(open) => {
          setShowManageAssignmentDialog(open);
          if (!open) {
            setAssignmentTargetProjectId(blueprint.projectId || '__none');
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage Project Assignment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Choose a project for this blueprint, or select <span className="font-medium text-foreground">No Project</span> to remove assignment.
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-assignment">Project</Label>
              <Select value={assignmentTargetProjectId} onValueChange={setAssignmentTargetProjectId}>
                <SelectTrigger id="project-assignment">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No Project</SelectItem>
                  <SelectSeparator />
                  {availableProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManageAssignmentDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProjectAssignment} disabled={isUpdatingAssignment}>
              {isUpdatingAssignment ? 'Saving...' : 'Save Assignment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Blueprint Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="blueprint-name">Blueprint Name</Label>
              <Input
                id="blueprint-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter blueprint name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="blueprint-description">Blueprint Description</Label>
              <Textarea
                id="blueprint-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Enter blueprint description"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveBlueprintDetails} disabled={isUpdatingDetails}>
              {isUpdatingDetails ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Blueprint?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{blueprint.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBlueprint}
              disabled={isDeletingBlueprint}
            >
              {isDeletingBlueprint ? 'Deleting...' : 'Delete Blueprint'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

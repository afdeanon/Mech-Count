import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle, Plus, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Blueprint, Project } from '@/types';
import { createProject, addBlueprintToProject } from '@/services/projectService';
import { saveBlueprintToHistory, updateBlueprint } from '@/services/blueprintService';
import { useToast } from '@/hooks/use-toast';

interface SaveToProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  blueprint: Blueprint | null;
  originalFile?: File | null;
  onSaved: (updatedBlueprint?: Blueprint) => void;
  preSelectedProjectId?: string;
}

export function SaveToProjectModal({ isOpen, onClose, blueprint, originalFile, onSaved, preSelectedProjectId }: SaveToProjectModalProps) {
  const [blueprintName, setBlueprintName] = useState('');
  const [blueprintDescription, setBlueprintDescription] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>(preSelectedProjectId || '');
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [showNewProject, setShowNewProject] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  console.log('🔍 [DEBUG] SaveToProjectModal received blueprint:', blueprint);
  console.log('🔍 [DEBUG] SaveToProjectModal received originalFile:', !!originalFile);
  console.log('🔍 [DEBUG] SaveToProjectModal blueprint ID:', blueprint?.id);
  console.log('🔍 [DEBUG] SaveToProjectModal blueprint object keys:', blueprint ? Object.keys(blueprint) : 'blueprint is null');

  const { state, dispatch } = useApp();
  const { toast } = useToast();

  const getFileTitle = (filename: string) => filename.replace(/\.[^/.]+$/, '');

  // Update selected project when preSelectedProjectId changes
  useEffect(() => {
    if (preSelectedProjectId) {
      setSelectedProjectId(preSelectedProjectId);
      setShowNewProject(false); // Don't show new project form if we have a pre-selected project
    }
  }, [preSelectedProjectId]);

  // Prefill save prompt fields when modal opens:
  // Prefer the uploaded file title, then fallback to blueprint name.
  useEffect(() => {
    if (!isOpen) return;

    const preferredName = originalFile?.name
      ? getFileTitle(originalFile.name)
      : (blueprint?.name || '');

    setBlueprintName(preferredName);
    setBlueprintDescription(blueprint?.description || '');
  }, [isOpen, blueprint?.name, blueprint?.description, originalFile]);

  const handleSave = async () => {
    if (!blueprint) return;

    setIsLoading(true);
    
    let savedBlueprint = blueprint;
    let blueprintAddedToHistory = false;

    try {
      let projectId = selectedProjectId;

      // Step 1: Create new project FIRST if needed
      if (showNewProject && newProjectName) {
        console.log('📁 Creating new project first...');
        
        const projectResponse = await createProject({
          name: newProjectName,
          description: newProjectDescription
        });

        if (projectResponse.success && projectResponse.data) {
          dispatch({ type: 'ADD_PROJECT', payload: projectResponse.data });
          projectId = projectResponse.data.id;
          console.log('✅ Project created successfully:', projectId);
        } else {
          throw new Error(projectResponse.message || 'Failed to create project');
        }
      }

      // Step 2: Handle blueprint save/update
      console.log('💾 Processing blueprint...');
      console.log('� Blueprint ID:', blueprint.id);
      console.log('🔍 Blueprint ID type:', typeof blueprint.id);
      console.log('🔍 Is temporary ID?', blueprint.id?.startsWith('blueprint-'));
      console.log('🔍 Is draft ID?', blueprint.id?.startsWith('draft-'));
      
      // If blueprint has a real server ID (not temporary or draft), just update it
      if (blueprint.id && !blueprint.id.startsWith('blueprint-') && !blueprint.id.startsWith('draft-')) {
        console.log('📝 Blueprint already exists on server, updating name/description and symbols...');
        console.log('📝 [DEBUG] Attempting to update blueprint ID:', blueprint.id);
        
        const updateResponse = await updateBlueprint(blueprint.id, {
          name: blueprintName,
          description: blueprintDescription,
          symbols: blueprint.symbols,
          totalSymbols: blueprint.symbols?.length || 0,
          averageAccuracy: blueprint.symbols?.length > 0 
            ? blueprint.symbols.reduce((sum, s) => sum + s.confidence, 0) / blueprint.symbols.length
            : 0
        });
        
        if (updateResponse.success && updateResponse.data) {
          savedBlueprint = {
            ...blueprint,
            ...updateResponse.data,
            name: blueprintName,
            description: blueprintDescription
          };
          
          console.log('✅ Blueprint updated successfully');
        } else {
          throw new Error(updateResponse.message || 'Failed to update blueprint');
        }
      } else if (blueprint.id && (blueprint.id.startsWith('blueprint-') || blueprint.id.startsWith('draft-'))) {
        // Blueprint has temporary or draft ID, need to upload it
        console.log('💾 Uploading blueprint with temporary/draft ID...');
        
        if (!originalFile) {
          throw new Error('Cannot save new blueprint without original file');
        }
        
        const blueprintData = {
          ...blueprint,
          name: blueprintName,
          description: blueprintDescription
        };
        
        const saveResponse = await saveBlueprintToHistory(blueprintData, originalFile);
        
        if (saveResponse.success && saveResponse.data) {
          // Use the complete server response data, which includes the new permanent image URL
          savedBlueprint = {
            ...saveResponse.data,
            id: saveResponse.data._id || saveResponse.data.id,
            name: blueprintName,
            description: blueprintDescription,
            // Ensure we keep any additional frontend-only properties if needed
            symbols: blueprint.symbols || saveResponse.data.symbols || []
          };
          
          console.log('✅ Blueprint uploaded with new data:', {
            id: savedBlueprint.id,
            oldImageUrl: blueprint.imageUrl,
            newImageUrl: savedBlueprint.imageUrl,
            isOldBlob: blueprint.imageUrl?.startsWith('blob:'),
            isNewS3: savedBlueprint.imageUrl?.includes('amazonaws.com')
          });
        } else {
          throw new Error(saveResponse.message || 'Failed to save blueprint');
        }
      } else {
        // Blueprint ID is undefined - this is the problem case
        console.error('❌ [ERROR] Blueprint ID is undefined! This should not happen.');
        console.error('❌ [ERROR] Blueprint object:', blueprint);
        console.error('❌ [ERROR] This means the upload succeeded but the ID was lost in the frontend.');
        
        // Try to find the blueprint by name/filename as a fallback
        console.log('🔍 [FALLBACK] Attempting to find recently uploaded blueprint...');
        
        if (!originalFile) {
          throw new Error('Cannot save blueprint without original file and ID is missing');
        }
        
        // Upload as new but with proper name this time
        const blueprintData = {
          ...blueprint,
          name: blueprintName,
          description: blueprintDescription
        };
        
        const saveResponse = await saveBlueprintToHistory(blueprintData, originalFile);
        
        if (saveResponse.success && saveResponse.data) {
          // Use the complete server response data, which includes the new permanent image URL
          savedBlueprint = {
            ...saveResponse.data,
            id: saveResponse.data._id || saveResponse.data.id,
            name: blueprintName,
            description: blueprintDescription,
            // Ensure we keep any additional frontend-only properties if needed
            symbols: blueprint.symbols || saveResponse.data.symbols || []
          };
          
          console.log('✅ Blueprint uploaded with new data (fallback):', {
            id: savedBlueprint.id,
            oldImageUrl: blueprint.imageUrl,
            newImageUrl: savedBlueprint.imageUrl,
            isOldBlob: blueprint.imageUrl?.startsWith('blob:'),
            isNewS3: savedBlueprint.imageUrl?.includes('amazonaws.com')
          });
        } else {
          throw new Error(saveResponse.message || 'Failed to save blueprint');
        }
      }

      // Step 3: Add blueprint to project (if project was selected/created)
      if (projectId) {
        console.log('📎 Adding blueprint to project...');
        
        const linkResponse = await addBlueprintToProject(projectId, savedBlueprint.id);
        
        if (linkResponse.success) {
          // Create the final blueprint with project association
          const finalBlueprint: Blueprint = {
            ...savedBlueprint,
            projectId
          };

          // Check if blueprint already exists in state to decide between ADD vs UPDATE
          const existingBlueprint = state.blueprints.find(bp => bp.id === finalBlueprint.id);
          
          if (existingBlueprint) {
            // Update existing blueprint with project association
            dispatch({ type: 'UPDATE_BLUEPRINT', payload: finalBlueprint });
          } else {
            // Add new blueprint to state (for dashboard upload flow)
            dispatch({ type: 'ADD_BLUEPRINT', payload: finalBlueprint });
          }
          blueprintAddedToHistory = true;

          // Also update the project to include the blueprint in its blueprints array
          const currentProject = state.projects.find(p => p.id === projectId);
          if (currentProject) {
            const updatedProject: Project = {
              ...currentProject,
              blueprints: [...currentProject.blueprints, finalBlueprint]
            };
            dispatch({ type: 'UPDATE_PROJECT', payload: updatedProject });
          }

          setSaved(true);
          
          toast({
            title: "Blueprint Saved",
            description: `"${blueprintName}" has been saved to the project.`,
          });

          setTimeout(() => {
            setSaved(false);
            resetForm();
            
            // Create updated blueprint object with projectId
            const updatedBlueprint = {
              ...savedBlueprint,
              projectId: projectId
            };
            
            onSaved(updatedBlueprint);
            onClose();
          }, 1500);
        } else {
          throw new Error(linkResponse.message || 'Failed to add blueprint to project');
        }
      } else {
        // If no project selected, just save the blueprint to history
        dispatch({ type: 'ADD_BLUEPRINT', payload: savedBlueprint });
        blueprintAddedToHistory = true;
        
        setSaved(true);
        
        toast({
          title: "Blueprint Saved",
          description: `"${blueprintName}" has been saved to your history.`,
        });

        setTimeout(() => {
          setSaved(false);
          resetForm();
          
          // Create updated blueprint object with projectId  
          const updatedBlueprint = {
            ...savedBlueprint,
            projectId: selectedProjectId
          };
          
          onSaved(updatedBlueprint);
          onClose();
        }, 1500);
      }
    } catch (error) {
      console.error('❌ Error saving blueprint:', error);
      
      // If we added the blueprint to history but linking failed, remove it
      if (blueprintAddedToHistory && savedBlueprint.id) {
        console.log('🔄 Removing blueprint from history due to linking failure');
        dispatch({ type: 'DELETE_BLUEPRINT', payload: savedBlueprint.id });
      }
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save blueprint.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setBlueprintName('');
    setBlueprintDescription('');
    setSelectedProjectId('');
    setNewProjectName('');
    setNewProjectDescription('');
    setShowNewProject(false);
    setSaved(false);
  };

  if (saved) {
    return (
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent className="max-w-md">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-success success-checkmark" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Blueprint Saved!
            </h3>
            <p className="text-muted-foreground">
              Your blueprint has been successfully saved to the project.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        resetForm();
        onClose();
      }
    }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Save Blueprint
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Blueprint Details */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Blueprint Name</Label>
              <Input
                id="name"
                value={blueprintName}
                onChange={(e) => setBlueprintName(e.target.value)}
                placeholder="Enter blueprint name"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={blueprintDescription}
                onChange={(e) => setBlueprintDescription(e.target.value)}
                placeholder="Add a description for this blueprint"
                rows={3}
              />
            </div>
          </div>

          {/* Project Selection */}
          <div className="space-y-4">
            <Label>Project Assignment</Label>
            
            {!showNewProject ? (
              <div className="space-y-3">
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {state.projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewProject(true)}
                  className="w-full gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create New Project
                </Button>
              </div>
            ) : (
              <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/20">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Create New Project</h4>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowNewProject(false)}
                  >
                    Cancel
                  </Button>
                </div>
                
                <div>
                  <Label htmlFor="project-name">Project Name</Label>
                  <Input
                    id="project-name"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Enter project name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="project-description">Project Description</Label>
                  <Textarea
                    id="project-description"
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    placeholder="Describe this project"
                    rows={2}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              className="btn-tech"
              disabled={!blueprintName.trim() || isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Blueprint'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

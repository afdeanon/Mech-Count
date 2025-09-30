import { useState } from 'react';
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
import { saveBlueprintToHistory } from '@/services/blueprintService';
import { useToast } from '@/hooks/use-toast';

interface SaveToProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  blueprint: Blueprint | null;
  originalFile?: File | null;
  onSaved: () => void;
}

export function SaveToProjectModal({ isOpen, onClose, blueprint, originalFile, onSaved }: SaveToProjectModalProps) {
  const [blueprintName, setBlueprintName] = useState(blueprint?.name || '');
  const [blueprintDescription, setBlueprintDescription] = useState(blueprint?.description || '');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [showNewProject, setShowNewProject] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { state, dispatch } = useApp();
  const { toast } = useToast();

  const handleSave = async () => {
    if (!blueprint) return;

    setIsLoading(true);

    try {
      let projectId = selectedProjectId;
      let savedBlueprint = blueprint;

      // Step 1: Save blueprint to backend if it doesn't have a proper server-generated ID
      // Temporary IDs start with 'blueprint-' followed by timestamp, server IDs are MongoDB ObjectIds
      if (blueprint.id.startsWith('blueprint-') || originalFile) {
        console.log('💾 Saving blueprint to backend first...');
        console.log('🔍 Blueprint ID:', blueprint.id);
        console.log('🔍 Has original file:', !!originalFile);
        
        const blueprintData = {
          ...blueprint,
          name: blueprintName,
          description: blueprintDescription
        };
        
        const saveResponse = await saveBlueprintToHistory(blueprintData, originalFile || undefined);
        
        if (saveResponse.success && saveResponse.data) {
          savedBlueprint = {
            ...blueprint,
            id: saveResponse.data.id,
            name: blueprintName,
            description: blueprintDescription
          };
          
          console.log('✅ Blueprint saved with new ID:', savedBlueprint.id);
          
          // Add to local state so it appears in history
          dispatch({ type: 'ADD_BLUEPRINT', payload: savedBlueprint });
        } else {
          throw new Error(saveResponse.message || 'Failed to save blueprint');
        }
      }

      // Step 2: Create new project if needed
      if (showNewProject && newProjectName) {
        console.log('📁 Creating new project for blueprint...');
        
        const projectResponse = await createProject({
          name: newProjectName,
          description: newProjectDescription
        });

        if (projectResponse.success && projectResponse.data) {
          dispatch({ type: 'ADD_PROJECT', payload: projectResponse.data });
          projectId = projectResponse.data.id;
        } else {
          throw new Error(projectResponse.message || 'Failed to create project');
        }
      }

      // Step 3: Add blueprint to project
      if (projectId) {
        console.log('📎 Adding blueprint to project...');
        
        const linkResponse = await addBlueprintToProject(projectId, savedBlueprint.id);
        
        if (linkResponse.success) {
          // Update blueprint in state
          const updatedBlueprint: Blueprint = {
            ...savedBlueprint,
            projectId
          };

          dispatch({ type: 'UPDATE_BLUEPRINT', payload: updatedBlueprint });

          // Also update the project to include the blueprint in its blueprints array
          const currentProject = state.projects.find(p => p.id === projectId);
          if (currentProject) {
            const updatedProject: Project = {
              ...currentProject,
              blueprints: [...currentProject.blueprints, updatedBlueprint]
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
            onSaved();
            onClose();
          }, 1500);
        } else {
          throw new Error(linkResponse.message || 'Failed to add blueprint to project');
        }
      } else {
        // If no project selected, just save the blueprint
        setSaved(true);
        
        toast({
          title: "Blueprint Saved",
          description: `"${blueprintName}" has been saved to your history.`,
        });

        setTimeout(() => {
          setSaved(false);
          resetForm();
          onSaved();
          onClose();
        }, 1500);
      }
    } catch (error) {
      console.error('❌ Error saving blueprint:', error);
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
    setBlueprintName(blueprint?.name || '');
    setBlueprintDescription(blueprint?.description || '');
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
                    <X className="w-4 h-4" />
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
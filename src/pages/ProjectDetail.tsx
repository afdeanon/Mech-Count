import { useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Header } from '@/components/Layout/Header';
import { Sidebar } from '@/components/Layout/Sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { UploadArea } from '@/components/Upload/UploadArea';
import { useApp } from '@/context/AppContext';
import { ArrowLeft, Upload, Search, FileImage, Calendar, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { Blueprint } from '@/types';

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const project = state.projects.find(p => p.id === id);
  
  // Get all blueprints not in this project for the "add existing" section
  const availableBlueprints = state.blueprints.filter(
    bp => !bp.projectId || bp.projectId !== id
  );

  // Filter available blueprints by search term
  const filteredBlueprints = availableBlueprints.filter(bp =>
    bp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (bp.description?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex h-[calc(100vh-4rem)]">
          <Sidebar />
          <main className="flex-1 p-6 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Project Not Found
              </h2>
              <p className="text-muted-foreground mb-4">
                The project you're looking for doesn't exist.
              </p>
              <Button onClick={() => navigate('/projects')} variant="outline">
                Back to Projects
              </Button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const handleBlueprintUploaded = (blueprint: Blueprint) => {
    // Add blueprint to project
    const updatedBlueprint = { ...blueprint, projectId: project.id };
    dispatch({ type: 'UPDATE_BLUEPRINT', payload: updatedBlueprint });
    
    // Update project's blueprints
    const updatedProject = {
      ...project,
      blueprints: [...project.blueprints, updatedBlueprint]
    };
    dispatch({ type: 'UPDATE_PROJECT', payload: updatedProject });
    
    setShowUpload(false);
  };

  const handleAddExistingBlueprint = (blueprint: Blueprint) => {
    const updatedBlueprint = { ...blueprint, projectId: project.id };
    dispatch({ type: 'UPDATE_BLUEPRINT', payload: updatedBlueprint });
    
    // Update project's blueprints
    const updatedProject = {
      ...project,
      blueprints: [...project.blueprints, updatedBlueprint]
    };
    dispatch({ type: 'UPDATE_PROJECT', payload: updatedProject });
  };

  const projectBlueprints = state.blueprints.filter(bp => bp.projectId === project.id);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex h-[calc(100vh-4rem)]">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Navigation */}
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/projects')}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Projects
              </Button>
            </div>

            {/* Project Header */}
            <div className="glass-card p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-foreground mb-2">
                    {project.name}
                  </h1>
                  <p className="text-muted-foreground text-lg">
                    {project.description}
                  </p>
                </div>
                
                <div className="text-right text-sm text-muted-foreground">
                  <div>Created {format(new Date(project.createdDate), 'MMM d, yyyy')}</div>
                  <div>{projectBlueprints.length} blueprint{projectBlueprints.length !== 1 ? 's' : ''}</div>
                </div>
              </div>
            </div>

            {/* Upload/Add Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Upload New Blueprint */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">
                  Upload New Blueprint
                </h2>
                
                {showUpload ? (
                  <div className="space-y-4">
                    <UploadArea 
                      onBlueprintUploaded={handleBlueprintUploaded}
                      isProcessing={isProcessing}
                      setIsProcessing={setIsProcessing}
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => setShowUpload(false)}
                      disabled={isProcessing}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Card className="border-dashed border-2 border-border hover:border-primary transition-colors cursor-pointer">
                    <CardContent 
                      className="p-8 text-center"
                      onClick={() => setShowUpload(true)}
                    >
                      <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        Upload Blueprint
                      </h3>
                      <p className="text-muted-foreground">
                        Add a new blueprint directly to this project
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Add Existing Blueprint */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">
                  Add Existing Blueprint
                </h2>
                
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search blueprints..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {filteredBlueprints.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        {availableBlueprints.length === 0 
                          ? 'No blueprints available to add'
                          : 'No blueprints match your search'
                        }
                      </div>
                    ) : (
                      filteredBlueprints.map((blueprint) => (
                        <Card key={blueprint.id} className="hover:shadow-medium transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-10 bg-muted rounded overflow-hidden">
                                  <img
                                    src={blueprint.imageUrl}
                                    alt={blueprint.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div>
                                  <h4 className="font-medium text-foreground">
                                    {blueprint.name}
                                  </h4>
                                  <p className="text-sm text-muted-foreground">
                                    {blueprint.symbols.length} symbols • {Math.round(blueprint.averageAccuracy)}% accuracy
                                  </p>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handleAddExistingBlueprint(blueprint)}
                                className="btn-tech"
                              >
                                Add
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Project Blueprints */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">
                Project Blueprints ({projectBlueprints.length})
              </h2>
              
              {projectBlueprints.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <FileImage className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      No Blueprints Yet
                    </h3>
                    <p className="text-muted-foreground">
                      Upload or add existing blueprints to get started.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {projectBlueprints.map((blueprint) => (
                    <Link
                      key={blueprint.id}
                      to={`/blueprint/${blueprint.id}`}
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
                        <CardContent className="p-4">
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

                          <Badge variant="secondary" className="text-xs">
                            {Math.round(blueprint.averageAccuracy)}% accuracy
                          </Badge>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
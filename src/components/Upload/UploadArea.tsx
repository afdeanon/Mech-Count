import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileImage, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Blueprint, MechanicalSymbol } from '@/types';
import { symbolTypes } from '@/data/mockData';
import { useApp } from '@/context/AppContext';

interface UploadAreaProps {
  onBlueprintUploaded: (blueprint: Blueprint) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
}

export function UploadArea({ onBlueprintUploaded, isProcessing, setIsProcessing }: UploadAreaProps) {
  const [progress, setProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const { dispatch } = useApp();

  const generateMockSymbols = (): MechanicalSymbol[] => {
    const count = 15 + Math.floor(Math.random() * 20);
    const symbols: MechanicalSymbol[] = [];
    
    for (let i = 0; i < count; i++) {
      const symbolType = symbolTypes[Math.floor(Math.random() * symbolTypes.length)];
      symbols.push({
        id: `symbol-${Date.now()}-${i}`,
        type: symbolType.type,
        name: symbolType.name,
        position: {
          x: Math.floor(Math.random() * 700),
          y: Math.floor(Math.random() * 500),
          width: 40 + Math.floor(Math.random() * 60),
          height: 40 + Math.floor(Math.random() * 60)
        },
        confidence: 0.85 + Math.random() * 0.15
      });
    }
    
    return symbols;
  };

  const simulateProcessing = (file: File) => {
    setIsProcessing(true);
    setProgress(0);

    const steps = [
      { progress: 20, message: 'Uploading file...', delay: 500 },
      { progress: 40, message: 'Analyzing image...', delay: 800 },
      { progress: 60, message: 'Detecting symbols...', delay: 1200 },
      { progress: 80, message: 'Processing results...', delay: 800 },
      { progress: 100, message: 'Complete!', delay: 500 }
    ];

    let currentStep = 0;

    const processStep = () => {
      if (currentStep < steps.length) {
        const step = steps[currentStep];
        setTimeout(() => {
          setProgress(step.progress);
          currentStep++;
          processStep();
        }, step.delay);
      } else {
        // Create mock blueprint
        const symbols = generateMockSymbols();
        const blueprint: Blueprint = {
          id: `blueprint-${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          description: 'Uploaded blueprint with AI symbol detection',
          imageUrl: URL.createObjectURL(file),
          uploadDate: new Date(),
          symbols,
          totalSymbols: symbols.length,
          averageAccuracy: symbols.reduce((acc, s) => acc + s.confidence, 0) / symbols.length * 100
        };

        dispatch({ type: 'ADD_BLUEPRINT', payload: blueprint });
        onBlueprintUploaded(blueprint);
        setIsProcessing(false);
        setProgress(0);
      }
    };

    processStep();
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setUploadedFile(file);
      simulateProcessing(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.pdf']
    },
    multiple: false,
    disabled: isProcessing
  });

  if (isProcessing) {
    return (
      <div className="space-y-6">
        <div className="glass-card p-8 text-center">
          <div className="w-16 h-16 loading-spinner mx-auto mb-6" />
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Processing Your Blueprint
          </h3>
          <p className="text-muted-foreground mb-6">
            Our AI is analyzing your blueprint and detecting mechanical symbols...
          </p>
          
          <div className="max-w-md mx-auto space-y-3">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Processing...</span>
              <span>{progress}%</span>
            </div>
          </div>

          {uploadedFile && (
            <div className="mt-6 flex items-center justify-center gap-3 text-sm text-muted-foreground">
              <FileImage className="w-4 h-4" />
              <span>{uploadedFile.name}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div
        {...getRootProps()}
        className={`
          upload-area p-12 text-center cursor-pointer transition-all duration-300
          ${isDragActive && !isDragReject ? 'upload-area-active' : ''}
          ${isDragReject ? 'border-red-300 bg-red-50' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            {isDragReject ? (
              <AlertCircle className="w-8 h-8 text-red-500" />
            ) : (
              <Upload className="w-8 h-8 text-primary" />
            )}
          </div>
          
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {isDragActive 
                ? isDragReject 
                  ? 'File type not supported'
                  : 'Drop your blueprint here'
                : 'Upload Your Blueprint'
              }
            </h3>
            
            <p className="text-muted-foreground mb-4">
              {isDragReject
                ? 'Please upload image files (PNG, JPG, JPEG, BMP, TIFF) or PDF documents'
                : 'Drag and drop your blueprint file here, or click to browse'
              }
            </p>
            
            {!isDragActive && (
              <Button variant="outline" className="btn-outline-tech">
                Choose File
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>Supported formats: PNG, JPG, JPEG, BMP, TIFF, PDF • Max file size: 50MB</p>
      </div>
    </div>
  );
}
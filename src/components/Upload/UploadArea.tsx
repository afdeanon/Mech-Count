import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileImage, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Blueprint, MechanicalSymbol } from '@/types';
import { symbolTypes } from '@/data/mockData';
import { useApp } from '@/context/AppContext';
import { uploadBlueprint, testBackendConnection } from '@/services/blueprintService';

interface UploadAreaProps {
  onBlueprintUploaded: (blueprint: Blueprint, file?: File) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
}

export function UploadArea({ onBlueprintUploaded, isProcessing, setIsProcessing }: UploadAreaProps) {
  const [progress, setProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
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

  const processUpload = async (file: File) => {
    setIsProcessing(true);
    setUploadStatus('uploading');
    setProgress(0);
    setErrorMessage('');

    try {
      // Step 1: Test backend connection
      setProgress(10);
      const connectionTest = await testBackendConnection();
      
      if (!connectionTest.backend) {
        throw new Error('Backend server is not available');
      }

      if (!connectionTest.auth) {
        throw new Error('Please sign in to upload blueprints');
      }

      // Step 2: Upload file
      setProgress(30);
      const uploadResult = await uploadBlueprint(
        file,
        file.name.replace(/\.[^/.]+$/, ''),
        'Uploaded blueprint with AI symbol detection'
      );

      if (!uploadResult.success) {
        throw new Error(uploadResult.message || 'Upload failed');
      }

      setProgress(70);

      // Step 3: Process the uploaded blueprint data
      const uploadedBlueprint = uploadResult.data;
      
      // For now, add mock symbols since AI processing isn't implemented yet
      const symbols = generateMockSymbols();
      const blueprint: Blueprint = {
        id: uploadedBlueprint.id || `blueprint-${Date.now()}`,
        name: uploadedBlueprint.name || file.name.replace(/\.[^/.]+$/, ''),
        description: uploadedBlueprint.description || 'Uploaded blueprint with AI symbol detection',
        imageUrl: uploadedBlueprint.imageUrl || URL.createObjectURL(file),
        uploadDate: new Date(uploadedBlueprint.createdAt || Date.now()),
        symbols,
        totalSymbols: symbols.length,
        averageAccuracy: symbols.reduce((acc, s) => acc + s.confidence, 0) / symbols.length
      };

      setProgress(90);

      // Step 4: Pass blueprint to parent without adding to history
      // History will be updated only when user chooses to save or upload new
      onBlueprintUploaded(blueprint, file);

      setProgress(100);
      setUploadStatus('success');

      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
        setUploadStatus('idle');
      }, 1000);

    } catch (error: any) {
      console.error('Upload error:', error);
      setErrorMessage(error.message || 'Upload failed');
      setUploadStatus('error');
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setUploadedFile(file);
      processUpload(file);
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

  // Show error state
  if (uploadStatus === 'error') {
    return (
      <div className="space-y-6">
        <div className="glass-card p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Upload Failed
          </h3>
          <p className="text-red-600 mb-6">
            {errorMessage || 'Something went wrong during upload'}
          </p>
          <div className="flex gap-3 justify-center">
            <Button 
              onClick={() => {
                setUploadStatus('idle');
                setErrorMessage('');
                setUploadedFile(null);
              }}
              variant="outline"
            >
              Try Again
            </Button>
          </div>
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
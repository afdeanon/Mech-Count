import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileImage, CheckCircle, AlertCircle, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Blueprint } from '@/types';
import { uploadBlueprint, testBackendConnection } from '@/services/blueprintService';

interface UploadAreaProps {
  onBlueprintUploaded: (blueprint: Blueprint, file?: File) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  projectId?: string; // Optional project ID to assign blueprint to
}

export function UploadArea({ onBlueprintUploaded, isProcessing, setIsProcessing, projectId }: UploadAreaProps) {
  const [progress, setProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const processUpload = async (file: File) => {
    setIsProcessing(true);
    setUploadStatus('uploading');
    setProgress(0);
    setErrorMessage('');

    // Add timeout to prevent hanging
    const uploadTimeout = setTimeout(() => {
      setErrorMessage('Upload timeout - processing is taking longer than expected. Please try again.');
      setUploadStatus('error');
      setIsProcessing(false);
    }, 45000); // 45 second timeout

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

      setProgress(30);

      // Step 2: Upload to backend with project assignment
      console.log('📤 Uploading blueprint to backend...', { projectId });
      const uploadResult = await uploadBlueprint(
        file,
        file.name.replace(/\.[^/.]+$/, ''), // Remove file extension for name
        '', // Empty description for now
        projectId // Pass project ID if provided
      );

      if (!uploadResult.success) {
        throw new Error(uploadResult.message || 'Upload failed');
      }

      setProgress(70);

      // Step 3: Create blueprint object from response
      const blueprint: Blueprint = {
        id: uploadResult.data._id || uploadResult.data.id,
        name: uploadResult.data.name || file.name.replace(/\.[^/.]+$/, ''),
        description: uploadResult.data.description || '',
        imageUrl: uploadResult.data.imageUrl || URL.createObjectURL(file),
        uploadDate: new Date(uploadResult.data.uploadDate || uploadResult.data.createdAt),
        symbols: uploadResult.data.symbols || [],
        totalSymbols: uploadResult.data.totalSymbols || 0,
        averageAccuracy: uploadResult.data.averageAccuracy || 0,
        status: uploadResult.data.status || 'completed',
        projectId: projectId, // Assign to project if provided
        aiAnalysis: uploadResult.data.aiAnalysis || {
          isAnalyzed: true,
          confidence: uploadResult.data.averageAccuracy || 0,
          summary: 'Blueprint uploaded successfully'
        }
      };

      setProgress(90);

      // Step 4: Pass blueprint to parent
      onBlueprintUploaded(blueprint, file);

      setProgress(90);

      setProgress(100);
      setUploadStatus('success');

      // Clear timeout on success
      clearTimeout(uploadTimeout);

      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
        setUploadStatus('idle');
      }, 1000);

    } catch (error: any) {
      // Clear timeout on error
      clearTimeout(uploadTimeout);
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
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Brain className="w-8 h-8 text-blue-500 animate-pulse" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Processing Blueprint
          </h3>
          <p className="text-muted-foreground mb-6">
            {projectId ? 'Uploading and assigning to project...' : 'Uploading your blueprint...'}
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
                : projectId 
                  ? 'Upload your blueprint and automatically assign it to this project'
                  : 'Upload your blueprint for AI-powered symbol detection and analysis'
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
        <p>Supported formats: PNG, JPG, JPEG, BMP, TIFF, PDF • Max file size: 10MB</p>
        <p className="mt-1 text-xs">AI analysis automatically detects mechanical symbols and components</p>
      </div>
    </div>
  );
}
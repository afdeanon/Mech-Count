import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileImage, CheckCircle, AlertCircle, Brain, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Blueprint } from '@/types';
import { uploadBlueprint, testBackendConnection } from '@/services/blueprintService';

interface UploadAreaProps {
  onBlueprintUploaded: (blueprint: Blueprint, file?: File) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  projectId?: string; // Optional project ID to assign blueprint to
  compact?: boolean;
}

export function UploadArea({
  onBlueprintUploaded,
  isProcessing,
  setIsProcessing,
  projectId,
  compact = false,
}: UploadAreaProps) {
  const [progress, setProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [guidanceWarning, setGuidanceWarning] = useState<string>('');

  const analyzeFileForGuidance = async (file: File): Promise<string> => {
    const lowerName = file.name.toLowerCase();
    const screenshotKeywords = ['screenshot', 'screen shot', 'snip', 'capture'];
    const likelyScreenshot = screenshotKeywords.some((keyword) => lowerName.includes(keyword));

    if (!file.type.startsWith('image/')) {
      return '';
    }

    try {
      const imageUrl = URL.createObjectURL(file);
      const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.onerror = reject;
        img.src = imageUrl;
      });
      URL.revokeObjectURL(imageUrl);

      const lowResolution = dimensions.width < 1600 || dimensions.height < 900;
      if (lowResolution || likelyScreenshot) {
        return 'This upload looks like a screenshot or low-resolution image. For best counts, use full-page or higher-resolution files.';
      }
    } catch {
      return likelyScreenshot
        ? 'This looks like a screenshot. For best counts, include full context around labels and symbols.'
        : '';
    }

    return '';
  };

  const processUpload = useCallback(async (file: File) => {
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
      const uploadStatus = uploadResult.data?.status || 'processing';
      const blueprint: Blueprint = {
        id: uploadResult.data._id || uploadResult.data.id,
        name: uploadResult.data.name || file.name.replace(/\.[^/.]+$/, ''),
        description: uploadResult.data.description || '',
        imageUrl: uploadResult.data.imageUrl || URL.createObjectURL(file),
        uploadDate: new Date(uploadResult.data.uploadDate || uploadResult.data.createdAt),
        symbols: uploadResult.data.symbols || [],
        totalSymbols: uploadResult.data.totalSymbols || 0,
        averageAccuracy: uploadResult.data.averageAccuracy || 0,
        status: uploadStatus,
        projectId: projectId, // Assign to project if provided
        aiAnalysis: uploadResult.data.aiAnalysis || {
          isAnalyzed: uploadStatus === 'completed',
          confidence: uploadResult.data.averageAccuracy || 0,
          summary: uploadStatus === 'completed'
            ? 'Blueprint uploaded successfully'
            : 'AI analysis is in progress'
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

    } catch (error: unknown) {
      // Clear timeout on error
      clearTimeout(uploadTimeout);
      console.error('Upload error:', error);
      const message = error instanceof Error ? error.message : 'Upload failed';
      setErrorMessage(message);
      setUploadStatus('error');
      setIsProcessing(false);
      setProgress(0);
    }
  }, [onBlueprintUploaded, projectId, setIsProcessing]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setUploadedFile(file);
      const warning = await analyzeFileForGuidance(file);
      setGuidanceWarning(warning);
      processUpload(file);
    }
  }, [processUpload]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.bmp', '.tiff']
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
            {projectId ? 'Uploading to this project...' : 'Uploading your file...'}
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
          upload-area ${compact ? 'p-8' : 'p-12'} text-center cursor-pointer transition-all duration-300
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
                  : 'Drop file to upload'
                : projectId
                  ? 'Upload file'
                  : 'Upload a blueprint'
              }
            </h3>
            
            <p className="text-muted-foreground mb-4">
              {isDragReject
                ? 'Please upload image files (PNG, JPG, JPEG, BMP, TIFF)'
                : projectId 
                  ? 'This file will be added to this project.'
                  : 'AI will detect symbols automatically.'
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
        <p>Supported formats: PNG, JPG, JPEG, BMP, TIFF • Max file size: 10MB</p>
        {!compact && (
          <p className="mt-1 text-xs">AI analysis automatically detects mechanical symbols and components</p>
        )}
      </div>

      <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
        <h4 className="text-sm font-semibold text-foreground">Upload Guidance</h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>If using screenshots, include enough surrounding area for labels and leader lines.</li>
          <li>Prefer high-resolution captures (around 1600px+ width) and avoid blurry images.</li>
          <li>For project-wide totals, upload all relevant pages instead of one cropped section.</li>
        </ul>
        {guidanceWarning && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{guidanceWarning}</span>
          </div>
        )}
      </div>
    </div>
  );
}

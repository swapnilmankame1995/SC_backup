import { useState, useCallback, useEffect } from 'react';
import { Button } from './ui/button';
import { Upload, X, FileImage } from 'lucide-react';
import { BottomNavigationBar } from './BottomNavigationBar';
import { toast } from 'sonner@2.0.3';
import { WhatsAppContactLink } from './WhatsAppContactLink';
import { getPricingConstants } from '../utils/pricing';

interface SketchUploadScreenProps {
  onNext: (files: File[]) => void;
  onBack: () => void;
  onCancel: () => void;
}

const ACCEPTED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/tiff', 'application/pdf'];
const MAX_FILES = 5;

export function SketchUploadScreen({ onNext, onBack, onCancel }: SketchUploadScreenProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [maxFileSize, setMaxFileSize] = useState(50); // Default 50MB
  
  // Fetch max file size from pricing constants
  useEffect(() => {
    const fetchMaxFileSize = async () => {
      const constants = await getPricingConstants();
      setMaxFileSize(constants.maxFileSize);
    };
    fetchMaxFileSize();
  }, []);

  const validateFile = (file: File): string | null => {
    const MAX_FILE_SIZE_BYTES = maxFileSize * 1024 * 1024;
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      return `${file.name}: File type not accepted. Please upload jpg, gif, pdf, png, tiff, or jpeg files.`;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `${file.name}: File size exceeds ${maxFileSize} MB limit.`;
    }
    return null;
  };

  const handleFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;

    const fileArray = Array.from(newFiles);
    const validFiles: File[] = [];
    const errors: string[] = [];

    // Check total file count
    if (files.length + fileArray.length > MAX_FILES) {
      toast.error(`You can only upload up to ${MAX_FILES} files`);
      return;
    }

    // Validate each file
    fileArray.forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
      } else {
        validFiles.push(file);
      }
    });

    // Show errors if any
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
    }

    // Add valid files
    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
      toast.success(`${validFiles.length} file(s) added`);
    }
  }, [files.length]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    // Reset input so same file can be selected again
    e.target.value = '';
  }, [handleFiles]);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    toast.success('File removed');
  };

  const handleNext = () => {
    if (files.length === 0) {
      toast.error('Please upload at least one sketch image');
      return;
    }
    onNext(files);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl pb-[140px] md:pb-40">
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-gray-200 mb-2">Upload an image of your sketch</h2>
          <p className="text-gray-400">
            Upload clear images of your hand-drawn sketches for conversion
          </p>
        </div>

        {/* Upload Area */}
        <div className="mt-8">
          <div
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-all ${
              isDragging
                ? 'border-blue-500 bg-blue-950/20'
                : 'border-gray-700 bg-[#222222] hover:border-gray-600'
            }`}
          >
            <input
              type="file"
              id="file-upload"
              className="hidden"
              multiple
              accept=".jpg,.jpeg,.png,.gif,.tiff,.pdf"
              onChange={handleFileInput}
            />
            
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-blue-950 rounded-full flex items-center justify-center">
                <Upload className="w-8 h-8 text-blue-500" />
              </div>
              
              <div>
                <p className="text-gray-300 mb-3">
                  Drop up to {MAX_FILES} files here or
                </p>
                <label htmlFor="file-upload">
                  <Button
                    type="button"
                    className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    SELECT FILES
                  </Button>
                </label>
              </div>
              
              <p className="text-sm text-gray-500 mt-2">
                Accepted file types: jpg, gif, pdf, png, tiff, jpeg. Max file size: {maxFileSize} MB
              </p>
            </div>
          </div>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-gray-200">
              Uploaded Files ({files.length}/{MAX_FILES})
            </h3>
            <div className="space-y-2">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-3 p-4 bg-[#222222] rounded-lg border border-gray-700"
                >
                  <div className="w-10 h-10 bg-blue-950 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileImage className="w-5 h-5 text-blue-500" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-200 truncate">{file.name}</p>
                    <p className="text-sm text-gray-400">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    className="flex-shrink-0 text-gray-400 hover:text-red-400 hover:bg-red-950"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* WhatsApp Contact Link */}
        <div className="text-center mt-4">
          <WhatsAppContactLink />
        </div>
      </div>

      <BottomNavigationBar
        onBack={onBack}
        onNext={handleNext}
        nextLabel="Next"
        nextDisabled={files.length === 0}
        showCancel={true}
        onCancel={onCancel}
      />
    </div>
  );
}
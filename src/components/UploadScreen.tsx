import { useState, useMemo, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Upload, X, File, Plus, Minus, RotateCcw } from 'lucide-react';
import { BottomNavigationBar } from './BottomNavigationBar';
import { toast } from 'sonner@2.0.3';
import { uploadDXF } from '../utils/api';
import { parseDXF, generateSVGPreview, DXFData } from '../utils/dxf-parser';
import { parseDXFAsync, isWorkerSupported } from '../utils/dxf-parser-worker';
import { WhatsAppContactLink } from './WhatsAppContactLink';
import { useSupport } from '../contexts/SupportContext';
import { getPricingConstants } from '../utils/pricing';

interface UploadScreenProps {
  onNext: (data: { file: File; filePath: string; dxfData: DXFData }) => void;
  onBack?: () => void;
  initialFile?: File | null;
  initialDxfData?: DXFData | null;
}

export function UploadScreen({ onNext, onBack, initialFile, initialDxfData }: UploadScreenProps) {
  const [file, setFile] = useState<File | null>(initialFile || null);
  const [dxfData, setDxfData] = useState<DXFData | null>(initialDxfData || null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showComplexFileModal, setShowComplexFileModal] = useState(false);
  const [maxFileSize, setMaxFileSize] = useState(50); // Default 50MB
  
  const { settings } = useSupport();
  
  // Fetch max file size from pricing constants
  useEffect(() => {
    const fetchMaxFileSize = async () => {
      const constants = await getPricingConstants();
      setMaxFileSize(constants.maxFileSize);
    };
    fetchMaxFileSize();
  }, []);
  
  // Track window width for responsive preview generation
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  
  // Update window width on resize
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Auto-zoom out on mobile when DXF is loaded (simulate 3 "-" clicks)
  useEffect(() => {
    if (dxfData && typeof window !== 'undefined' && window.innerWidth < 500) {
      // 3 zoom-out clicks: 1 / 1.2 / 1.2 / 1.2 = 1 / 1.728 ≈ 0.5787
      setScale(1 / Math.pow(1.2, 3));
    }
  }, [dxfData]);

  // Memoize SVG preview generation - regenerates when dxfData OR windowWidth changes
  const svgPreview = useMemo(() => {
    if (dxfData) {
      return generateSVGPreview(dxfData, windowWidth);
    }
    return '';
  }, [dxfData, windowWidth]);

  const handleZoom = (direction: 'in' | 'out') => {
    setScale(prev => {
      const newScale = direction === 'in' ? prev * 1.2 : prev / 1.2;
      return Math.max(0.5, Math.min(5, newScale));
    });
  };

  const handleResetView = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleFileSelect = async (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith('.dxf')) {
      toast.error('Please upload a DXF file');
      return;
    }

    // Check file size limit (50MB)
    const MAX_FILE_SIZE = maxFileSize * 1024 * 1024; // 50MB in bytes
    if (selectedFile.size > MAX_FILE_SIZE) {
      toast.error(`File size exceeds ${maxFileSize}MB limit. Your file is ${(selectedFile.size / (1024 * 1024)).toFixed(2)}MB`);
      return;
    }

    setFile(selectedFile);

    try {
      // Read the file content
      const text = await selectedFile.text();
      const fileSizeMB = (selectedFile.size / (1024 * 1024)).toFixed(2);
      
      // Use Web Worker for large files (>2MB) if supported
      let parsed: DXFData;
      if (selectedFile.size > 2 * 1024 * 1024 && isWorkerSupported()) {
        toast.info(`Parsing ${fileSizeMB}MB file...`);
        
        parsed = await parseDXFAsync(text, (progress) => {
          // Optional: Show progress
          if (progress % 20 === 0) {
            console.log(`Parsing progress: ${progress.toFixed(0)}%`);
          }
        });
        
        toast.success('File parsed successfully!');
      } else {
        // Use synchronous parsing for smaller files or if worker not supported
        if (selectedFile.size > 2 * 1024 * 1024) {
          toast.info(`Parsing ${fileSizeMB}MB file (this may take a moment)...`);
        }
        parsed = parseDXF(text);
      }
      
      // Set DXF data - SVG preview will be generated automatically via useMemo
      setDxfData(parsed);
    } catch (error) {
      console.error('File parsing error:', error);
      toast.error('Failed to parse DXF file. Please ensure it\'s a valid DXF file.');
      setFile(null);
      setDxfData(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleNext = async () => {
    if (!file || !dxfData) return;

    // Check if cutting length is 0 - complex file that parser couldn't handle
    if (dxfData.cuttingLength === 0) {
      setShowComplexFileModal(true);
      return;
    }

    // Keep file client-side - will be uploaded when order is actually placed
    // This prevents abandoned files from taking up server storage
    onNext({
      file,
      filePath: '', // Will be set after upload during checkout
      dxfData,
    });
  };

  const handleWhatsAppRedirect = () => {
    const url = `https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent('Hi, I have a DXF file that\'s too complex for the online calculator. Can you help me with a quote?')}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl pb-[140px] md:pb-32">
      <div className="space-y-6">
        <div>
          <h2 className="text-gray-200 mb-2">Upload Your DXF File</h2>
          <p className="text-gray-400">
            Upload your design file to get started with your laser cutting order
          </p>
          <p className="text-gray-500 text-sm mt-1">
            Maximum file size: {maxFileSize}MB • Supported format: DXF
          </p>
        </div>

        <Card
          className={`border-2 border-dashed p-8 transition-colors bg-[#1a1a1a] ${
            isDragging ? 'border-blue-600 bg-blue-950' : 'border-gray-700'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {!file ? (
            <div className="text-center">
              <Upload className="w-16 h-16 mx-auto mb-4 text-gray-500" />
              <h3 className="text-gray-300 mb-2">Drag and drop your DXF file here</h3>
              <p className="text-gray-500 mb-4">or</p>
              <Button asChild>
                <label className="cursor-pointer">
                  Browse Files
                  <input
                    type="file"
                    accept=".dxf"
                    className="hidden"
                    onChange={(e) => {
                      const selectedFile = e.target.files?.[0];
                      if (selectedFile) handleFileSelect(selectedFile);
                    }}
                  />
                </label>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-gray-800">
                <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
                  <File className="w-8 h-8 text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-200 break-all">{file.name}</p>
                    <p className="text-gray-500 text-sm">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFile(null);
                    setDxfData(null);
                  }}
                  className="hover:bg-gray-800 text-gray-400 flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {dxfData && (
                <div className="space-y-4">
                  <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6 relative overflow-hidden">
                    <div className="flex justify-between items-center mb-4">
                       <h3 className="text-gray-200">Preview</h3>
                       <div className="flex gap-2 bg-[#252525] rounded-lg p-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleZoom('out')}>
                             <Minus className="h-4 w-4 text-gray-400" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleResetView}>
                             <RotateCcw className="h-4 w-4 text-gray-400" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleZoom('in')}>
                             <Plus className="h-4 w-4 text-gray-400" />
                          </Button>
                       </div>
                    </div>
                    <div
                      className="bg-background rounded-lg flex items-center justify-center overflow-hidden h-[400px] cursor-move"
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                    >
                      <div 
                        style={{ 
                          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                          transition: isPanning ? 'none' : 'transform 0.2s ease-out',
                          pointerEvents: 'none' // Let events pass to container
                        }}
                        dangerouslySetInnerHTML={{ __html: svgPreview }}
                      />
                    </div>
                    <p className="text-xs text-center text-gray-500 mt-2">
                      Drag to pan, use buttons to zoom
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="p-4 bg-[#1a1a1a] border-gray-800">
                      <p className="text-gray-400 text-sm mb-1">Width</p>
                      <p className="text-gray-200">{dxfData.width.toFixed(2)} mm</p>
                    </Card>
                    <Card className="p-4 bg-[#1a1a1a] border-gray-800">
                      <p className="text-gray-400 text-sm mb-1">Height</p>
                      <p className="text-gray-200">{dxfData.height.toFixed(2)} mm</p>
                    </Card>
                    <Card className="p-4 bg-[#1a1a1a] border-gray-800">
                      <p className="text-gray-400 text-sm mb-1">Sq FT</p>
                      <p className="text-gray-200">
                        {((dxfData.width * dxfData.height) / 92903.04).toFixed(2)} ft²
                      </p>
                    </Card>
                    <Card className="p-4 bg-[#1a1a1a] border-gray-800">
                      <p className="text-gray-400 text-sm mb-1">Cutting Length</p>
                      <p className="text-gray-200">
                        {dxfData.cuttingLength.toFixed(2)} mm
                      </p>
                    </Card>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* WhatsApp Contact Link */}
        <div className="text-center mt-4">
          <WhatsAppContactLink />
        </div>

      </div>
      
      <BottomNavigationBar
        onBack={onBack}
        onNext={file && dxfData ? handleNext : undefined}
        nextLabel={isUploading ? 'Uploading...' : 'Continue to Material Selection'}
        nextDisabled={isUploading || !file || !dxfData}
        showBack={!!onBack}
      />

      {/* Complex File Modal */}
      {showComplexFileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg max-w-md w-full p-6 space-y-4">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-200 mb-2">
                Complex DXF File Detected
              </h3>
              <p className="text-gray-400 mb-4">
                Your DXF file contains advanced features that our online calculator can't process automatically.
              </p>
              <p className="text-gray-300 mb-6">
                No worries! Please share your file with us on WhatsApp, and we'll provide you with an accurate quote within minutes.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => setShowComplexFileModal(false)}
                variant="outline"
                className="flex-1 border-gray-700 hover:bg-gray-800"
              >
                Go Back
              </Button>
              <Button
                onClick={handleWhatsAppRedirect}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Contact on WhatsApp
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
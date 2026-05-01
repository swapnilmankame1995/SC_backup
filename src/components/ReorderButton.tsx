import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { apiCall } from '../utils/api';
import { toast } from 'sonner@2.0.3';
import { DXFData } from '../utils/dxf-parser';

interface ReorderButtonProps {
  filePath?: string;
  fileName: string;
  material: string;
  thickness: number;
  dxfData?: DXFData | null;
  onReorder: (filePath: string, fileName: string, material: string, thickness: number, dxfData: DXFData | null) => void;
}

export function ReorderButton({ filePath, fileName, material, thickness, dxfData, onReorder }: ReorderButtonProps) {
  const [isChecking, setIsChecking] = useState(true);
  const [fileExists, setFileExists] = useState(false);
  
  // Check if this is a sketch service
  // Real DXF files will have filePath AND valid dxfData with width/height/cuttingLength > 0
  const isSketchService = 
    fileName.includes('Sketch Service') || 
    fileName.includes('Sketch Conversion') ||
    material === 'Sketch Service' ||
    (!filePath && (!dxfData || (dxfData.width === 0 && dxfData.height === 0 && dxfData.cuttingLength === 0)));

  useEffect(() => {
    // Skip check for sketch services
    if (isSketchService) {
      setFileExists(false);
      setIsChecking(false);
      return;
    }
    
    checkFileAvailability();
  }, [filePath, isSketchService]);

  const checkFileAvailability = async () => {
    if (!filePath) {
      setFileExists(false);
      setIsChecking(false);
      return;
    }

    try {
      setIsChecking(true);
      const result = await apiCall(`/check-file?path=${encodeURIComponent(filePath)}`);
      setFileExists(result.exists);
    } catch (error) {
      console.error('Error checking file availability:', error);
      setFileExists(false);
    } finally {
      setIsChecking(false);
    }
  };

  const handleReorder = () => {
    if (!filePath) {
      toast.error('File information not available');
      return;
    }

    if (!fileExists) {
      toast.error('File is no longer available');
      return;
    }

    onReorder(filePath, fileName, material, thickness, dxfData);
  };

  if (isChecking) {
    return (
      <Button
        size="sm"
        variant="outline"
        disabled
        className="border-gray-700 text-gray-500"
      >
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Checking...
      </Button>
    );
  }

  if (!fileExists || !filePath) {
    // Show special message for sketch services
    if (isSketchService) {
      return (
        <div className="text-xs text-gray-500">
          Sketch services cannot be reordered
        </div>
      );
    }
    
    return (
      <div className="flex flex-col gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled
          className="border-gray-700 text-gray-500"
        >
          <AlertCircle className="w-4 h-4 mr-2" />
          Unavailable
        </Button>
        <div className="text-xs text-gray-500 max-w-xs">
          This file has been removed as part of our 180-day retention policy. All uploaded files are automatically deleted 180 days after the order date to protect your privacy and manage storage.
        </div>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleReorder}
      className="border-blue-600 text-blue-500 hover:bg-blue-950"
    >
      <RefreshCw className="w-4 h-4 mr-2" />
      Reorder
    </Button>
  );
}
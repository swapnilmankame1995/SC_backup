import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { DXFData } from '../utils/dxf-parser';

interface Material {
  id: string;
  name: string;
  category: string;
  pricing: {
    thickness: number;
    pricePerMm: number;
  }[];
  density?: number; // kg per cubic meter
  colors_enabled?: boolean;
  colors?: Array<{ name: string; hex: string }>;
}

interface OrderContextType {
  // File data
  file: File | null;
  filePath: string;
  fileName: string;
  dxfData: DXFData | null;
  
  // Selection data
  selectedMaterial: Material | null;
  selectedThickness: number | null;
  selectedColor: string | null;   // Selected colour name (e.g. "Red"), null if not applicable
  price: number;
  orderNotes: string;
  
  // Sketch workflow
  sketchFiles: File[];
  isSketchWorkflow: boolean;
  
  // Order result
  orderId: string;
  
  // Setters
  setFile: (file: File | null) => void;
  setFilePath: (path: string) => void;
  setFileName: (name: string) => void;
  setDxfData: (data: DXFData | null) => void;
  setSelectedMaterial: (material: Material | null) => void;
  setSelectedThickness: (thickness: number | null) => void;
  setSelectedColor: (color: string | null) => void;
  setPrice: (price: number) => void;
  setOrderNotes: (notes: string) => void;
  setSketchFiles: (files: File[]) => void;
  setIsSketchWorkflow: (isSketch: boolean) => void;
  setOrderId: (id: string) => void;
  
  // Utility
  resetOrder: () => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

const initialState = {
  file: null,
  filePath: '',
  fileName: '',
  dxfData: null,
  selectedMaterial: null,
  selectedThickness: null,
  selectedColor: null,
  price: 0,
  orderNotes: '',
  sketchFiles: [],
  isSketchWorkflow: false,
  orderId: '',
};

export function OrderProvider({ children }: { children: ReactNode }) {
  const [file, setFile] = useState<File | null>(initialState.file);
  const [filePath, setFilePath] = useState<string>(initialState.filePath);
  const [fileName, setFileName] = useState<string>(initialState.fileName);
  const [dxfData, setDxfData] = useState<DXFData | null>(initialState.dxfData);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(initialState.selectedMaterial);
  const [selectedThickness, setSelectedThickness] = useState<number | null>(initialState.selectedThickness);
  const [selectedColor, setSelectedColor] = useState<string | null>(initialState.selectedColor);
  const [price, setPrice] = useState<number>(initialState.price);
  const [orderNotes, setOrderNotes] = useState<string>(initialState.orderNotes);
  const [sketchFiles, setSketchFiles] = useState<File[]>(initialState.sketchFiles);
  const [isSketchWorkflow, setIsSketchWorkflow] = useState<boolean>(initialState.isSketchWorkflow);
  const [orderId, setOrderId] = useState<string>(initialState.orderId);

  const resetOrder = useCallback(() => {
    setFile(initialState.file);
    setFilePath(initialState.filePath);
    setFileName(initialState.fileName);
    setDxfData(initialState.dxfData);
    setSelectedMaterial(initialState.selectedMaterial);
    setSelectedThickness(initialState.selectedThickness);
    setSelectedColor(initialState.selectedColor);
    setPrice(initialState.price);
    setOrderNotes(initialState.orderNotes);
    setSketchFiles(initialState.sketchFiles);
    setIsSketchWorkflow(initialState.isSketchWorkflow);
    setOrderId(initialState.orderId);
  }, []);

  return (
    <OrderContext.Provider
      value={{
        file,
        filePath,
        fileName,
        dxfData,
        selectedMaterial,
        selectedThickness,
        selectedColor,
        price,
        orderNotes,
        sketchFiles,
        isSketchWorkflow,
        orderId,
        setFile,
        setFilePath,
        setFileName,
        setDxfData,
        setSelectedMaterial,
        setSelectedThickness,
        setSelectedColor,
        setPrice,
        setOrderNotes,
        setSketchFiles,
        setIsSketchWorkflow,
        setOrderId,
        resetOrder,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
}

export function useOrder() {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrder must be used within an OrderProvider');
  }
  return context;
}

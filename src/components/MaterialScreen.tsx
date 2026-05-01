import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Loader2 } from 'lucide-react';
import { apiCall } from '../utils/api';
import { toast } from 'sonner@2.0.3';
import { BottomNavigationBar } from './BottomNavigationBar';
import { WhatsAppContactLink } from './WhatsAppContactLink';

interface ThicknessPricing {
  thickness: number;
  pricePerMm: number;
  pricePerSqft?: number;  // Thickness-specific price per sq ft
  inStock?: boolean;      // Whether this thickness is in stock
}

interface Material {
  id: string;
  name: string;
  category: string;
  pricing: ThicknessPricing[];
  density?: number;
  price_per_mm: number;    // Laser cutting rate per mm
  price_per_sqf: number;   // Material rate per sq ft
  thicknesses?: number[];
  inStock?: boolean;       // Material-level in-stock flag from server
}

interface MaterialScreenProps {
  onNext: (material: Material) => void;
  onBack: () => void;
}

export function MaterialScreen({ onNext, onBack }: MaterialScreenProps) {
  console.log('MaterialScreen rendered');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper function to migrate old material format to new format
  const migrateMaterial = (material: any): Material => {
    if (material.pricing && Array.isArray(material.pricing)) {
      // Already in new format, just ensure density is preserved
      return {
        ...material,
        density: material.density
      } as Material;
    }
    
    if (material.pricePerMm !== undefined && material.thicknesses && Array.isArray(material.thicknesses)) {
      return {
        id: material.id,
        name: material.name,
        category: material.category,
        pricing: material.thicknesses.map((thickness: number) => ({
          thickness,
          pricePerMm: material.pricePerMm,
          inStock: true
        })),
        density: material.density // Preserve density
      };
    }
    
    return {
      id: material.id || '',
      name: material.name || '',
      category: material.category || 'Metals',
      pricing: [],
      density: material.density // Preserve density even for fallback
    };
  };

  useEffect(() => {
    loadMaterials();
  }, []);

  const loadMaterials = async () => {
    console.log('loadMaterials called');
    try {
      console.log('Fetching materials...');
      const result = await apiCall('/materials', { method: 'GET' }, false);
      console.log('Materials result:', result);
      // Filter out Sketch Service from material selection
      setMaterials(result.materials
        .filter((m: any) => m.id !== 'sketch' && m.name !== 'Sketch Service')
        .map(migrateMaterial)
      );
    } catch (error: any) {
      console.error('Load materials error:', error);
      toast.error('Failed to load materials: ' + error.message);
    } finally {
      console.log('Setting isLoading to false');
      setIsLoading(false);
    }
  };

  /**
   * Determine if a material is fully out of stock.
   * A material is fully out of stock when ALL of its thickness pricing entries have inStock === false.
   * If inStock is undefined (old data), it defaults to in-stock (true).
   */
  const isMaterialFullyOutOfStock = (material: Material): boolean => {
    if (!material.pricing || material.pricing.length === 0) return false;
    return material.pricing.every(p => p.inStock === false);
  };

  const groupedMaterials = materials.reduce((acc, material) => {
    if (!acc[material.category]) {
      acc[material.category] = [];
    }
    acc[material.category].push(material);
    return acc;
  }, {} as Record<string, Material[]>);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl pb-[140px] md:pb-32">
      <div className="space-y-6">
        <div>
          <h2 className="text-gray-200 mb-2">Select Material</h2>
          <p className="text-gray-400">Choose the material for your laser cutting project</p>
        </div>

        {Object.entries(groupedMaterials).map(([category, categoryMaterials]) => (
          <div key={category}>
            <h3 className="text-gray-300 mb-4">{category}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {categoryMaterials.map((material) => {
                const fullyOutOfStock = isMaterialFullyOutOfStock(material);
                const isSelected = selectedMaterial?.id === material.id;

                return (
                  <Card
                    key={material.id}
                    className={`p-6 transition-all shadow-lg relative ${
                      fullyOutOfStock
                        ? 'opacity-50 cursor-not-allowed border border-gray-700 bg-[#1a1a1a]'
                        : isSelected
                        ? 'cursor-pointer border-2 border-blue-600 bg-blue-950 shadow-blue-900/50'
                        : 'cursor-pointer border border-0 bg-[#222222] hover:border-blue-600'
                    }`}
                    onClick={() => {
                      if (!fullyOutOfStock) {
                        setSelectedMaterial(material);
                      }
                    }}
                  >
                    {/* Out of Stock badge — only shown when ALL thicknesses are out of stock */}
                    {fullyOutOfStock && (
                      <span className="absolute top-2 right-2 bg-red-900/80 text-red-300 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide border border-red-700/50">
                        Out of Stock
                      </span>
                    )}

                    <h4 className={`mb-3 ${fullyOutOfStock ? 'text-gray-500' : 'text-gray-200'}`}>
                      {material.name}
                    </h4>
                    <div className="space-y-1">
                      {material.pricing.map((pricing) => (
                        <p
                          key={pricing.thickness}
                          className={`text-sm ${
                            pricing.inStock === false ? 'text-gray-600 line-through' : 'text-gray-400'
                          }`}
                        >
                          {pricing.thickness}mm: ₹{pricing.pricePerMm.toFixed(2)}/mm
                        </p>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}

        {/* WhatsApp Contact Link */}
        <div className="text-center mt-4">
          <WhatsAppContactLink />
        </div>
      </div>
      
      <BottomNavigationBar
        onBack={onBack}
        onNext={() => selectedMaterial && onNext(selectedMaterial)}
        nextLabel="Continue to Thickness Selection"
        nextDisabled={!selectedMaterial}
      />
    </div>
  );
}

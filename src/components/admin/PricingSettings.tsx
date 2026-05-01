/**
 * Pricing Settings Component
 * 
 * Manages global pricing constants for the laser cutting pricing formula:
 * - Setup Cost (S)
 * - Profit Margin (M)
 * - Thickness Multipliers (T_f)
 * 
 * @component
 */

import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Loader2, Info, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { 
  getPricingConstants, 
  savePricingConstants, 
  PricingConstants,
  ThicknessMultiplier,
  DEFAULT_PRICING_CONSTANTS 
} from '../../utils/pricing';

export function PricingSettings() {
  const [constants, setConstants] = useState<PricingConstants>(DEFAULT_PRICING_CONSTANTS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadConstants();
  }, []);

  const loadConstants = async () => {
    setIsLoading(true);
    try {
      const loaded = await getPricingConstants();
      setConstants(loaded);
    } catch (error: any) {
      console.error('Load pricing constants error:', error);
      toast.error('Failed to load pricing settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await savePricingConstants(constants);
      toast.success('Pricing settings saved successfully');
    } catch (error: any) {
      console.error('Save pricing constants error:', error);
      toast.error('Failed to save pricing settings');
    } finally {
      setIsSaving(false);
    }
  };

  const updateMultiplier = (index: number, field: keyof ThicknessMultiplier, value: any) => {
    const updated = [...constants.thicknessMultipliers];
    updated[index] = { ...updated[index], [field]: value };
    setConstants({ ...constants, thicknessMultipliers: updated });
  };

  const addMultiplier = () => {
    const newMultiplier: ThicknessMultiplier = {
      minThickness: 1,
      maxThickness: 1,
      multiplier: 1.0,
      label: '1mm'
    };
    setConstants({
      ...constants,
      thicknessMultipliers: [...constants.thicknessMultipliers, newMultiplier]
    });
  };

  const removeMultiplier = (index: number) => {
    if (constants.thicknessMultipliers.length <= 1) {
      toast.error('At least one thickness multiplier is required');
      return;
    }
    const updated = [...constants.thicknessMultipliers];
    updated.splice(index, 1);
    setConstants({ ...constants, thicknessMultipliers: updated });
  };

  if (isLoading) {
    return (
      <Card className="p-6 bg-[#1a1a1a] border-gray-800">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-[#1a1a1a] border-gray-800">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h3 className="text-white mb-2 flex items-center gap-2">
            <span>Pricing Settings</span>
            <div className="relative group">
              <Info className="w-4 h-4 text-gray-400 cursor-help" />
              <div className="absolute left-0 bottom-6 hidden group-hover:block z-50 w-96 p-3 bg-[#2a2a2a] border border-gray-700 rounded-lg shadow-lg text-xs text-gray-300">
                <p className="font-semibold mb-2">Pricing Formula:</p>
                <p className="mb-2">FINAL_PRICE = (A × R_a) + (L × R_l × T_f) + S</p>
                <p className="mb-2">SELLING_PRICE = FINAL_PRICE × (1 + M)</p>
                <ul className="space-y-1 text-gray-400">
                  <li>• A = Area (sq ft)</li>
                  <li>• R_a = Material rate per sq ft (from material settings)</li>
                  <li>• L = Cutting length (meters)</li>
                  <li>• R_l = Laser cutting rate per meter (from material Price/mm)</li>
                  <li>• T_f = Thickness multiplier</li>
                  <li>• S = Setup cost (below)</li>
                  <li>• M = Profit margin (below)</li>
                </ul>
              </div>
            </div>
          </h3>
          <p className="text-gray-400 text-sm">
            Configure global pricing parameters applied to all materials
          </p>
        </div>

        {/* Setup Cost & Profit Margin */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Setup Cost */}
          <div className="space-y-2">
            <Label htmlFor="setupCost" className="text-gray-300">
              Setup Cost (₹)
            </Label>
            <p className="text-xs text-gray-500 mb-2">
              Fixed cost per job (machine prep, material loading, focus setting)
            </p>
            <Input
              id="setupCost"
              type="number"
              step="1"
              min="0"
              value={constants.setupCost}
              onChange={(e) => setConstants({ ...constants, setupCost: Number(e.target.value) })}
              className="bg-[#0a0a0a] border-gray-700 text-white"
              placeholder="e.g., 100"
            />
          </div>

          {/* Profit Margin */}
          <div className="space-y-2">
            <Label htmlFor="profitMargin" className="text-gray-300">
              Profit Margin (%)
            </Label>
            <p className="text-xs text-gray-500 mb-2">
              Universal profit margin applied to all orders
            </p>
            <div className="flex items-center gap-2">
              <Input
                id="profitMargin"
                type="number"
                step="1"
                min="0"
                max="100"
                value={constants.profitMargin * 100}
                onChange={(e) => setConstants({ ...constants, profitMargin: Number(e.target.value) / 100 })}
                className="bg-[#0a0a0a] border-gray-700 text-white"
                placeholder="e.g., 40"
              />
              <span className="text-gray-400">%</span>
            </div>
          </div>
        </div>

        {/* Thickness Multipliers Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-gray-300">Thickness Multipliers</Label>
              <p className="text-xs text-gray-500 mt-1">
                Adjust cutting costs based on material thickness (thicker = slower cutting, higher wear)
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={addMultiplier}
              className="border-gray-700 hover:bg-gray-800"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Row
            </Button>
          </div>

          <div className="border border-gray-800 rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800 hover:bg-[#2a2a2a] bg-[#0a0a0a]">
                  <TableHead className="text-gray-400">Label</TableHead>
                  <TableHead className="text-gray-400">Min Thickness (mm)</TableHead>
                  <TableHead className="text-gray-400">Max Thickness (mm)</TableHead>
                  <TableHead className="text-gray-400">Multiplier</TableHead>
                  <TableHead className="text-right text-gray-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {constants.thicknessMultipliers.map((multiplier, index) => (
                  <TableRow key={index} className="border-gray-800 hover:bg-[#2a2a2a]">
                    <TableCell>
                      <Input
                        type="text"
                        value={multiplier.label}
                        onChange={(e) => updateMultiplier(index, 'label', e.target.value)}
                        className="bg-[#0a0a0a] border-gray-700 text-white h-9"
                        placeholder="e.g., 2-3mm"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.1"
                        value={multiplier.minThickness}
                        onChange={(e) => updateMultiplier(index, 'minThickness', Number(e.target.value))}
                        className="bg-[#0a0a0a] border-gray-700 text-white h-9"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.1"
                        value={multiplier.maxThickness}
                        onChange={(e) => updateMultiplier(index, 'maxThickness', Number(e.target.value))}
                        className="bg-[#0a0a0a] border-gray-700 text-white h-9"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.1"
                        value={multiplier.multiplier}
                        onChange={(e) => updateMultiplier(index, 'multiplier', Number(e.target.value))}
                        className="bg-[#0a0a0a] border-gray-700 text-white h-9"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMultiplier(index)}
                        disabled={constants.thicknessMultipliers.length <= 1}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-gray-800">
          <Button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Pricing Settings'
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}

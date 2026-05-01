import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Plus, Pencil, Info } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { apiCall } from '../../utils/api';

interface AdditionalOption {
  id: string;
  name: string;
  price: number;
  applicableMaterials?: string[]; // e.g., ["Aluminum"] for anodising
  description?: string;
}

export function AdditionalOptions() {
  const [options, setOptions] = useState<AdditionalOption[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<AdditionalOption | null>(null);
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    try {
      const result = await apiCall('/additional-options', { method: 'GET' }, false);
      setOptions(result.options || []);
    } catch (error: any) {
      console.error('Load additional options error:', error);
      // Initialize with default options if none exist
      const defaultOptions: AdditionalOption[] = [
        { id: 'anodising', name: 'Anodising', price: 0, applicableMaterials: ['Aluminum'], description: 'Only available for Aluminum' },
        { id: 'polishing', name: 'Polishing', price: 0, description: 'Surface polishing finish' },
        { id: 'countersinking', name: 'Countersinking', price: 0, description: 'Countersink edge treatment' },
        { id: 'hardening', name: 'Hardening', price: 0, applicableMaterials: ['Mild Steel'], description: 'Only available for Mild Steel' },
        { id: 'countersink-holes', name: 'Countersink Holes', price: 0, description: 'Countersink holes treatment' },
      ];
      setOptions(defaultOptions);
    }
  };

  const openEditDialog = (option: AdditionalOption) => {
    setEditingOption(option);
    setFormName(option.name);
    setFormPrice(option.price.toString());
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const price = parseFloat(formPrice);
      if (isNaN(price) || price < 0) {
        toast.error('Please enter a valid price');
        return;
      }

      const optionData = {
        ...editingOption,
        price,
      };

      await apiCall('/additional-options', {
        method: 'PUT',
        body: JSON.stringify(optionData),
      });

      toast.success('Price updated successfully');
      setIsDialogOpen(false);
      loadOptions();
    } catch (error: any) {
      console.error('Save option error:', error);
      toast.error('Failed to update price');
    }
  };

  const handleReset = async () => {
    try {
      setIsResetting(true);
      await apiCall('/additional-options/reset', { method: 'POST' });
      toast.success('Options reset to default successfully');
      loadOptions();
    } catch (error: any) {
      console.error('Reset options error:', error);
      toast.error('Failed to reset options');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-[#1a1a1a] border-gray-800">
        <div className="mb-6">
          <h3 className="text-white mb-2">Additional Processing Options</h3>
          <p className="text-sm text-gray-400">
            Configure pricing for additional processing options. Some options are material-specific.
          </p>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="border-gray-800 hover:bg-[#2a2a2a]">
              <TableHead className="text-gray-400">Option Name</TableHead>
              <TableHead className="text-gray-400">Price (₹)</TableHead>
              <TableHead className="text-gray-400">Restrictions</TableHead>
              <TableHead className="text-right text-gray-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {options.map((option) => (
              <TableRow key={option.id} className="border-gray-800 hover:bg-[#2a2a2a]">
                <TableCell className="text-white">
                  <div className="flex items-center gap-2">
                    {option.name}
                    {option.description && (
                      <div className="group relative">
                        <Info className="w-4 h-4 text-gray-500 cursor-help" />
                        <div className="absolute hidden group-hover:block bottom-full left-0 mb-2 w-48 p-2 bg-gray-900 text-xs text-gray-300 rounded shadow-lg z-10">
                          {option.description}
                        </div>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-gray-300">
                  {option.price > 0 ? `₹${option.price.toFixed(2)}` : '+ $$'}
                </TableCell>
                <TableCell className="text-sm text-gray-400">
                  {option.applicableMaterials ? (
                    <span className="bg-blue-950 text-blue-400 px-2 py-1 rounded text-xs">
                      {option.applicableMaterials.join(', ')} only
                    </span>
                  ) : (
                    <span className="text-gray-500">All materials</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(option)}
                  >
                    <Pencil className="w-4 h-4 text-blue-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={isResetting}
          >
            Reset to Default
          </Button>
        </div>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md bg-[#1a1a1a] border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Option Price</DialogTitle>
            <DialogDescription className="text-gray-400">
              Update the price for the selected additional processing option.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Option Name</Label>
              <Input
                value={formName}
                disabled
                className="bg-[#0a0a0a] border-gray-700 text-gray-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price" className="text-gray-300">Price (₹)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
                placeholder="0.00"
                className="bg-[#0a0a0a] border-gray-700 text-white"
              />
            </div>
            {editingOption?.applicableMaterials && (
              <div className="bg-blue-950/30 border border-blue-800 rounded p-3">
                <p className="text-sm text-blue-400">
                  <Info className="w-4 h-4 inline mr-1" />
                  This option is only available for: {editingOption.applicableMaterials.join(', ')}
                </p>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
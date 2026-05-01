import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Plus, Trash2, Tag, Percent } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { apiCall } from '../../utils/api';

interface DiscountCode {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrderValue?: number;
  maxUses?: number;
  usedCount: number;
  expiryDate?: string;
  isActive: boolean;
  createdAt: string;
}

export function DiscountsManagement() {
  const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formCode, setFormCode] = useState('');
  const [formType, setFormType] = useState<'percentage' | 'fixed'>('percentage');
  const [formValue, setFormValue] = useState('');
  const [formMinOrder, setFormMinOrder] = useState('');
  const [formMaxUses, setFormMaxUses] = useState('');
  const [formExpiry, setFormExpiry] = useState('');

  useEffect(() => {
    loadDiscounts();
  }, []);

  const loadDiscounts = async () => {
    try {
      const result = await apiCall('/admin/discounts', { method: 'GET' });
      setDiscounts(result.discounts || []);
    } catch (error: any) {
      console.error('Load discounts error:', error);
      toast.error('Failed to load discounts');
    }
  };

  const resetForm = () => {
    setFormCode('');
    setFormType('percentage');
    setFormValue('');
    setFormMinOrder('');
    setFormMaxUses('');
    setFormExpiry('');
  };

  const handleCreate = async () => {
    try {
      if (!formCode || !formValue) {
        toast.error('Please fill in required fields');
        return;
      }

      const value = parseFloat(formValue);
      if (isNaN(value) || value <= 0) {
        toast.error('Please enter a valid discount value');
        return;
      }

      if (formType === 'percentage' && value > 100) {
        toast.error('Percentage discount cannot exceed 100%');
        return;
      }

      const discountData = {
        code: formCode.toUpperCase(),
        type: formType,
        value,
        minOrderValue: formMinOrder ? parseFloat(formMinOrder) : undefined,
        maxUses: formMaxUses ? parseInt(formMaxUses) : undefined,
        expiryDate: formExpiry || undefined,
        isActive: true,
        usedCount: 0,
      };

      await apiCall('/admin/discounts', {
        method: 'POST',
        body: JSON.stringify(discountData),
      });

      toast.success('Discount code created successfully');
      setIsDialogOpen(false);
      resetForm();
      loadDiscounts();
    } catch (error: any) {
      console.error('Create discount error:', error);
      toast.error('Failed to create discount code');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this discount code?')) return;

    try {
      await apiCall(`/admin/discounts/${id}`, { method: 'DELETE' });
      toast.success('Discount code deleted successfully');
      loadDiscounts();
    } catch (error: any) {
      console.error('Delete discount error:', error);
      toast.error('Failed to delete discount code');
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      await apiCall(`/admin/discounts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !isActive }),
      });
      toast.success(`Discount code ${!isActive ? 'activated' : 'deactivated'}`);
      loadDiscounts();
    } catch (error: any) {
      console.error('Toggle discount error:', error);
      toast.error('Failed to update discount code');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white mb-2">Discount Codes</h1>
          <p className="text-gray-400">Create and manage discount codes for customers</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Discount
        </Button>
      </div>

      <Card className="p-6 bg-[#1a1a1a] border-gray-800">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-800 hover:bg-[#2a2a2a]">
              <TableHead className="text-gray-400">Code</TableHead>
              <TableHead className="text-gray-400">Discount</TableHead>
              <TableHead className="text-gray-400">Min. Order</TableHead>
              <TableHead className="text-gray-400">Usage</TableHead>
              <TableHead className="text-gray-400">Expiry</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
              <TableHead className="text-right text-gray-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {discounts.map((discount) => (
              <TableRow key={discount.id} className="border-gray-800 hover:bg-[#2a2a2a]">
                <TableCell className="text-white font-mono">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-blue-500" />
                    {discount.code}
                  </div>
                </TableCell>
                <TableCell className="text-gray-300">
                  <div className="flex items-center gap-1">
                    {discount.type === 'percentage' ? (
                      <>
                        <Percent className="w-4 h-4 text-emerald-500" />
                        {discount.value}% off
                      </>
                    ) : (
                      <>₹{discount.value} off</>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-gray-300">
                  {discount.minOrderValue ? `₹${discount.minOrderValue}` : 'None'}
                </TableCell>
                <TableCell className="text-gray-300">
                  {discount.usedCount} / {discount.maxUses || '∞'}
                </TableCell>
                <TableCell className="text-gray-300">
                  {discount.expiryDate 
                    ? new Date(discount.expiryDate).toLocaleDateString()
                    : 'No expiry'}
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => toggleActive(discount.id, discount.isActive)}
                    className={`px-3 py-1 rounded text-xs ${
                      discount.isActive
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-gray-800 text-gray-400 border border-gray-700'
                    }`}
                  >
                    {discount.isActive ? 'Active' : 'Inactive'}
                  </button>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(discount.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {discounts.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                  No discount codes created yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Create Discount Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md bg-[#1a1a1a] border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">Create Discount Code</DialogTitle>
            <DialogDescription className="text-gray-400">
              Create a new discount code for customers to use at checkout
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Discount Code *</Label>
              <Input
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                placeholder="e.g., SUMMER2024"
                className="bg-[#0a0a0a] border-gray-700 text-white font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Type *</Label>
                <Select value={formType} onValueChange={(value: any) => setFormType(value)}>
                  <SelectTrigger className="bg-[#0a0a0a] border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-gray-700">
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Value *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  placeholder={formType === 'percentage' ? '10' : '100'}
                  className="bg-[#0a0a0a] border-gray-700 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Minimum Order Value (Optional)</Label>
              <Input
                type="number"
                step="0.01"
                value={formMinOrder}
                onChange={(e) => setFormMinOrder(e.target.value)}
                placeholder="₹ 0.00"
                className="bg-[#0a0a0a] border-gray-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Maximum Uses (Optional)</Label>
              <Input
                type="number"
                value={formMaxUses}
                onChange={(e) => setFormMaxUses(e.target.value)}
                placeholder="Unlimited"
                className="bg-[#0a0a0a] border-gray-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Expiry Date (Optional)</Label>
              <Input
                type="date"
                value={formExpiry}
                onChange={(e) => setFormExpiry(e.target.value)}
                className="bg-[#0a0a0a] border-gray-700 text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate}>Create Code</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

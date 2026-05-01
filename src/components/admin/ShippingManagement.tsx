import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Plus, Pencil, Trash2, Truck } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { apiCall } from '../../utils/api';

// ⚠️ DORMANT FEATURE: Shipping Partners
// The Shipping Partners feature is currently disabled in the UI but backend endpoints remain active.
// To re-enable: See /docs/SHIPPING-PARTNERS-TOGGLE.md
// Backend endpoints: /admin/shipping-partners (GET, POST, PUT, DELETE)
interface ShippingPartner {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
}

interface ShippingRate {
  id: string;
  state: string;
  rate: number;
  min_order_value?: number | null;
  free_shipping_threshold?: number | null;
  is_active?: boolean;
  created_at?: string;
}

export function ShippingManagement() {
  // ⚠️ DORMANT: Shipping Partners state (kept for future re-enablement)
  // const [partners, setPartners] = useState<ShippingPartner[]>([]);
  // const [isPartnerDialogOpen, setIsPartnerDialogOpen] = useState(false);
  // const [editingPartner, setEditingPartner] = useState<ShippingPartner | null>(null);
  // const [partnerName, setPartnerName] = useState('');
  // const [partnerContact, setPartnerContact] = useState('');
  // const [partnerPhone, setPartnerPhone] = useState('');
  // const [partnerEmail, setPartnerEmail] = useState('');
  
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [isRateDialogOpen, setIsRateDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<ShippingRate | null>(null);
  const [isBulkAdding, setIsBulkAdding] = useState(false);

  // Rate form state
  const [rateState, setRateState] = useState('');
  const [ratePricePerKg, setRatePricePerKg] = useState('');
  const [rateMinOrderValue, setRateMinOrderValue] = useState('');
  const [rateFreeShippingThreshold, setRateFreeShippingThreshold] = useState('');
  
  useEffect(() => {
    // loadPartners(); // DORMANT
    loadRates();
  }, []);

  // ⚠️ DORMANT: Shipping Partners functions (kept for future re-enablement)
  // const loadPartners = async () => {
  //   try {
  //     const result = await apiCall('/admin/shipping-partners', { method: 'GET' });
  //     setPartners(result.partners || []);
  //   } catch (error: any) {
  //     console.error('Load shipping partners error:', error);
  //   }
  // };

  const loadRates = async () => {
    try {
      const result = await apiCall('/admin/shipping-rates', { method: 'GET' });
      setRates(result.rates || []);
    } catch (error: any) {
      console.error('Load shipping rates error:', error);
    }
  };

  // ⚠️ DORMANT: Partner form functions
  // const resetPartnerForm = () => {
  //   setPartnerName('');
  //   setPartnerContact('');
  //   setPartnerPhone('');
  //   setPartnerEmail('');
  //   setEditingPartner(null);
  // };

  const resetRateForm = () => {
    setRateState('');
    setRatePricePerKg('');
    setRateMinOrderValue('');
    setRateFreeShippingThreshold('');
    setEditingRate(null);
  };

  // ⚠️ DORMANT: Partner save function
  // const handleSavePartner = async () => {
  //   try {
  //     if (!partnerName) {
  //       toast.error('Partner name is required');
  //       return;
  //     }
  //
  //     const partnerData = {
  //       id: editingPartner?.id || `partner-${Date.now()}`,
  //       name: partnerName,
  //       contactPerson: partnerContact || undefined,
  //       phone: partnerPhone || undefined,
  //       email: partnerEmail || undefined,
  //       isActive: true,
  //     };
  //
  //     if (editingPartner) {
  //       await apiCall(`/admin/shipping-partners/${partnerData.id}`, {
  //         method: 'PUT',
  //         body: JSON.stringify(partnerData),
  //       });
  //       toast.success('Partner updated successfully');
  //     } else {
  //       await apiCall('/admin/shipping-partners', {
  //         method: 'POST',
  //         body: JSON.stringify(partnerData),
  //       });
  //       toast.success('Partner added successfully');
  //     }
  //
  //     setIsPartnerDialogOpen(false);
  //     resetPartnerForm();
  //     loadPartners();
  //   } catch (error: any) {
  //     console.error('Save partner error:', error);
  //     toast.error('Failed to save partner');
  //   }
  // };

  const handleSaveRate = async () => {
    try {
      if (!rateState || !ratePricePerKg) {
        toast.error('State and price are required');
        return;
      }

      const pricePerKg = parseFloat(ratePricePerKg);
      if (isNaN(pricePerKg) || pricePerKg <= 0) {
        toast.error('Please enter a valid price');
        return;
      }

      const rateData = {
        id: editingRate?.id || `rate-${Date.now()}`,
        state: rateState,
        rate: pricePerKg,
        min_order_value: rateMinOrderValue ? parseFloat(rateMinOrderValue) : undefined,
        free_shipping_threshold: rateFreeShippingThreshold ? parseFloat(rateFreeShippingThreshold) : undefined,
        is_active: true,
      };

      if (editingRate) {
        await apiCall(`/admin/shipping-rates/${rateData.id}`, {
          method: 'PUT',
          body: JSON.stringify(rateData),
        });
        toast.success('Rate updated successfully');
      } else {
        await apiCall('/admin/shipping-rates', {
          method: 'POST',
          body: JSON.stringify(rateData),
        });
        toast.success('Rate added successfully');
      }

      setIsRateDialogOpen(false);
      resetRateForm();
      loadRates();
    } catch (error: any) {
      console.error('Save rate error:', error);
      toast.error('Failed to save rate');
    }
  };

  // ⚠️ DORMANT: Partner delete function
  // const handleDeletePartner = async (id: string) => {
  //   if (!confirm('Are you sure you want to delete this partner?')) return;
  //
  //   try {
  //     await apiCall(`/admin/shipping-partners/${id}`, { method: 'DELETE' });
  //     toast.success('Partner deleted successfully');
  //     loadPartners();
  //   } catch (error: any) {
  //     console.error('Delete partner error:', error);
  //     toast.error('Failed to delete partner');
  //   }
  // };

  const handleDeleteRate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rate?')) return;

    try {
      await apiCall(`/admin/shipping-rates/${id}`, { method: 'DELETE' });
      toast.success('Rate deleted successfully');
      loadRates();
    } catch (error: any) {
      console.error('Delete rate error:', error);
      toast.error('Failed to delete rate');
    }
  };

  // ⚠️ DORMANT: Partner edit function
  // const openEditPartner = (partner: ShippingPartner) => {
  //   setEditingPartner(partner);
  //   setPartnerName(partner.name);
  //   setPartnerContact(partner.contactPerson || '');
  //   setPartnerPhone(partner.phone || '');
  //   setPartnerEmail(partner.email || '');
  //   setIsPartnerDialogOpen(true);
  // };

  const openEditRate = (rate: ShippingRate) => {
    setEditingRate(rate);
    setRateState(rate.state);
    setRatePricePerKg(rate.rate.toString());
    setRateMinOrderValue(rate.min_order_value?.toString() || '');
    setRateFreeShippingThreshold(rate.free_shipping_threshold?.toString() || '');
    setIsRateDialogOpen(true);
  };

  const handleBulkAddStates = async () => {
    if (!confirm('This will add all Indian states with a default price of ₹0.00/kg. You can edit the prices later. Continue?')) {
      return;
    }

    setIsBulkAdding(true);

    const indianStates = [
      'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
      'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
      'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
      'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
      'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
      'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
      // Union Territories
      'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry', 
      'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 
      'Lakshadweep', 'Andaman and Nicobar Islands'
    ];

    try {
      let addedCount = 0;
      let skippedCount = 0;

      for (const state of indianStates) {
        // Check if state already exists
        const existingRate = rates.find(r => 
          r.state.toLowerCase().trim() === state.toLowerCase().trim()
        );

        if (existingRate) {
          skippedCount++;
          continue;
        }

        const rateData = {
          id: `rate-${Date.now()}-${addedCount}`,
          state: state,
          rate: 0, // Default to 0, admin will update later
          min_order_value: undefined,
        };

        try {
          await apiCall('/admin/shipping-rates', {
            method: 'POST',
            body: JSON.stringify(rateData),
          });
          addedCount++;
        } catch (error) {
          console.error(`Failed to add ${state}:`, error);
        }

        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      toast.success(`Added ${addedCount} states. ${skippedCount > 0 ? `Skipped ${skippedCount} existing states.` : ''}`);
      loadRates();
    } catch (error: any) {
      console.error('Bulk add states error:', error);
      toast.error('Failed to add all states');
    } finally {
      setIsBulkAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-white mb-2">Shipping Management</h1>
        <p className="text-gray-400">Manage shipping rates by region</p>
      </div>

      {/* ⚠️ DORMANT: Shipping Partners Card - Removed from UI, backend remains active */}
      {/* To re-enable: See /docs/SHIPPING-PARTNERS-TOGGLE.md */}

      {/* Shipping Rates */}
      <Card className="p-6 bg-[#1a1a1a] border-gray-800">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white">Shipping Rates by Region</h3>
          <div className="flex gap-2">
            <Button onClick={() => {
              resetRateForm();
              setIsRateDialogOpen(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Rate
            </Button>
            <Button
              variant="outline"
              onClick={handleBulkAddStates}
              disabled={isBulkAdding}
              className="border-blue-700 hover:bg-blue-950 text-blue-400"
            >
              {isBulkAdding ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>
                  Adding States...
                </>
              ) : (
                <>Add All Indian States</>
              )}
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="border-gray-800 hover:bg-[#2a2a2a]">
              <TableHead className="text-gray-400">State</TableHead>
              <TableHead className="text-gray-400">Shipping Rate (₹/kg)</TableHead>
              <TableHead className="text-gray-400">Min Order Value</TableHead>
              <TableHead className="text-right text-gray-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rates.map((rate) => (
              <TableRow key={rate.id} className="border-gray-800 hover:bg-[#2a2a2a]">
                <TableCell className="text-white">{rate.state}</TableCell>
                <TableCell className="text-gray-300">₹{rate.rate.toFixed(2)}/kg</TableCell>
                <TableCell className="text-gray-300">
                  {rate.min_order_value ? `₹${rate.min_order_value}` : 'N/A'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditRate(rate)}
                    >
                      <Pencil className="w-4 h-4 text-blue-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRate(rate.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {rates.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                  No shipping rates configured yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* ⚠️ DORMANT: Partner Dialog - Removed from UI */}
      
      {/* Rate Dialog */}
      <Dialog open={isRateDialogOpen} onOpenChange={setIsRateDialogOpen}>
        <DialogContent className="max-w-md bg-[#1a1a1a] border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingRate ? 'Edit Rate' : 'Add Shipping Rate'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {editingRate ? 'Update shipping rate details' : 'Configure a new shipping rate for a region'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-300">State / Region *</Label>
              <Input
                value={rateState}
                onChange={(e) => setRateState(e.target.value)}
                placeholder="e.g., Karnataka, Maharashtra, Delhi"
                className="bg-[#0a0a0a] border-gray-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Shipping Rate (₹/kg) *</Label>
              <Input
                type="number"
                step="0.01"
                value={ratePricePerKg}
                onChange={(e) => setRatePricePerKg(e.target.value)}
                placeholder="50.00"
                className="bg-[#0a0a0a] border-gray-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Min Order Value (₹)</Label>
              <Input
                type="number"
                step="0.01"
                value={rateMinOrderValue}
                onChange={(e) => setRateMinOrderValue(e.target.value)}
                placeholder="Optional minimum order value"
                className="bg-[#0a0a0a] border-gray-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Free Shipping Threshold (kg)</Label>
              <Input
                type="number"
                step="0.01"
                value={rateFreeShippingThreshold}
                onChange={(e) => setRateFreeShippingThreshold(e.target.value)}
                placeholder="e.g., 1 (free shipping if weight < 1 kg)"
                className="bg-[#0a0a0a] border-gray-700 text-white"
              />
              <p className="text-xs text-gray-500">If package weight is below this value, shipping is free</p>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsRateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveRate}>
                {editingRate ? 'Update' : 'Add'} Rate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
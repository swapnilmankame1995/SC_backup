import { useState, useEffect } from 'react';
import { apiCall } from '../../utils/api';
import { toast } from 'sonner@2.0.3';
import { Loader2, Building2, Save } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  gstin: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
  authorizedSignatory: string;
  cin: string;
  tan: string;
  invoicePrefix: string;
  invoiceStartNumber: number;
  paymentTerms: string;
}

export function CompanySettings() {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: 'Sheetcutters',
    address: '',
    phone: '',
    email: '',
    website: 'www.sheetcutters.com',
    gstin: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    upiId: '',
    authorizedSignatory: '',
    cin: '',
    tan: '',
    invoicePrefix: 'SC',
    invoiceStartNumber: 1,
    paymentTerms: 'Due Upon Receipt',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadCompanyInfo();
  }, []);

  const loadCompanyInfo = async () => {
    setIsLoading(true);
    try {
      const result = await apiCall('/settings/company-info', { method: 'GET' }, false);
      if (result.companyInfo) {
        setCompanyInfo(result.companyInfo);
      }
    } catch (error: any) {
      console.error('Load company info error:', error);
      toast.error('Failed to load company information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiCall('/settings/company-info', {
        method: 'POST',
        body: JSON.stringify(companyInfo),
      });
      toast.success('Company information updated successfully');
    } catch (error: any) {
      console.error('Save company info error:', error);
      toast.error('Failed to update company information');
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: keyof CompanyInfo, value: string | number) => {
    setCompanyInfo(prev => ({ ...prev, [field]: value }));
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
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-blue-400 mb-2 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Company Information
            </h3>
            <p className="text-gray-400 text-sm">
              Manage company details used in invoices and legal documents
            </p>
          </div>
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
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="space-y-4 md:col-span-2">
            <h4 className="text-white">Basic Information</h4>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">Company Name</Label>
            <Input
              type="text"
              value={companyInfo.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Sheetcutters"
              className="bg-[#222222] border-gray-700 text-gray-200"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">Website</Label>
            <Input
              type="text"
              value={companyInfo.website}
              onChange={(e) => updateField('website', e.target.value)}
              placeholder="www.sheetcutters.com"
              className="bg-[#222222] border-gray-700 text-gray-200"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label className="text-gray-300">Address</Label>
            <Input
              type="text"
              value={companyInfo.address}
              onChange={(e) => updateField('address', e.target.value)}
              placeholder="Street Address, City, Postcode"
              className="bg-[#222222] border-gray-700 text-gray-200"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">Phone Number</Label>
            <Input
              type="text"
              value={companyInfo.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="+91 98765 43210"
              className="bg-[#222222] border-gray-700 text-gray-200"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">Email</Label>
            <Input
              type="email"
              value={companyInfo.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="contact@sheetcutters.com"
              className="bg-[#222222] border-gray-700 text-gray-200"
            />
          </div>

          {/* Tax & Registration */}
          <div className="space-y-4 md:col-span-2 pt-4 border-t border-gray-800">
            <h4 className="text-white">Tax & Registration Details</h4>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">GSTIN (GST Number)</Label>
            <Input
              type="text"
              value={companyInfo.gstin}
              onChange={(e) => updateField('gstin', e.target.value)}
              placeholder="Enter GST Identification Number"
              className="bg-[#222222] border-gray-700 text-gray-200"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">CIN (Corporate Identity Number)</Label>
            <Input
              type="text"
              value={companyInfo.cin}
              onChange={(e) => updateField('cin', e.target.value)}
              placeholder="Optional"
              className="bg-[#222222] border-gray-700 text-gray-200"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">TAN (Tax Deduction Number)</Label>
            <Input
              type="text"
              value={companyInfo.tan}
              onChange={(e) => updateField('tan', e.target.value)}
              placeholder="Optional"
              className="bg-[#222222] border-gray-700 text-gray-200"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">Authorized Signatory</Label>
            <Input
              type="text"
              value={companyInfo.authorizedSignatory}
              onChange={(e) => updateField('authorizedSignatory', e.target.value)}
              placeholder="Name and Designation"
              className="bg-[#222222] border-gray-700 text-gray-200"
            />
          </div>

          {/* Banking Information */}
          <div className="space-y-4 md:col-span-2 pt-4 border-t border-gray-800">
            <h4 className="text-white">Banking Information</h4>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">Bank Name</Label>
            <Input
              type="text"
              value={companyInfo.bankName}
              onChange={(e) => updateField('bankName', e.target.value)}
              placeholder="e.g., HDFC Bank"
              className="bg-[#222222] border-gray-700 text-gray-200"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">Account Number</Label>
            <Input
              type="text"
              value={companyInfo.accountNumber}
              onChange={(e) => updateField('accountNumber', e.target.value)}
              placeholder="Bank Account Number"
              className="bg-[#222222] border-gray-700 text-gray-200"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">IFSC Code</Label>
            <Input
              type="text"
              value={companyInfo.ifscCode}
              onChange={(e) => updateField('ifscCode', e.target.value)}
              placeholder="e.g., HDFC0001234"
              className="bg-[#222222] border-gray-700 text-gray-200"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">UPI ID</Label>
            <Input
              type="text"
              value={companyInfo.upiId}
              onChange={(e) => updateField('upiId', e.target.value)}
              placeholder="e.g., sheetcutters@upi"
              className="bg-[#222222] border-gray-700 text-gray-200"
            />
          </div>

          {/* Invoice Settings */}
          <div className="space-y-4 md:col-span-2 pt-4 border-t border-gray-800">
            <h4 className="text-white">Invoice Settings</h4>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">Invoice Prefix</Label>
            <Input
              type="text"
              value={companyInfo.invoicePrefix}
              onChange={(e) => updateField('invoicePrefix', e.target.value.toUpperCase())}
              placeholder="SC"
              maxLength={5}
              className="bg-[#222222] border-gray-700 text-gray-200"
            />
            <p className="text-xs text-gray-500">
              Format: {companyInfo.invoicePrefix}-{new Date().getFullYear()}-001
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">Payment Terms</Label>
            <Input
              type="text"
              value={companyInfo.paymentTerms}
              onChange={(e) => updateField('paymentTerms', e.target.value)}
              placeholder="Due Upon Receipt"
              className="bg-[#222222] border-gray-700 text-gray-200"
            />
          </div>
        </div>

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
              <>
                <Save className="w-4 h-4 mr-2" />
                Save All Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}

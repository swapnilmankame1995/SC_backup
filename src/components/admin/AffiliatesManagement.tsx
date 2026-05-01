import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Plus, Trash2, Users, DollarSign, TrendingUp, Eye, Receipt, History } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { apiCall } from '../../utils/api';

interface Disbursement {
  id: string;
  amount: number;
  transactionNumber: string;
  date: string;
  notes?: string;
}

interface Affiliate {
  id: string;
  name: string;
  email: string;
  phone?: string;
  discountCode: string;
  discountPercentage: number; // Discount customers get
  commissionPercentage: number; // Commission affiliate earns
  totalSales: number;
  totalCommission: number;
  totalPaid: number; // Total disbursed to affiliate
  usageCount: number;
  isActive: boolean;
  createdAt: string;
  disbursements?: Disbursement[];
  userEmails?: string[]; // Email IDs of users who used the code
}

interface UsageRecord {
  id: string;
  affiliateId: string;
  affiliateName: string;
  discountCode: string;
  userId: string;
  userEmail: string;
  orderValue: number;
  commission: number;
  timestamp: string;
  orderId?: string;
  batchId?: string;
  orderNumber?: string;
}

export function AffiliatesManagement() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isUsageHistoryOpen, setIsUsageHistoryOpen] = useState(false);
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);
  const [usageHistory, setUsageHistory] = useState<UsageRecord[]>([]);
  const [disbursementAmount, setDisbursementAmount] = useState('');
  const [transactionNumber, setTransactionNumber] = useState('');
  const [disbursementNotes, setDisbursementNotes] = useState('');
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDiscount, setFormDiscount] = useState('');
  const [formCommission, setFormCommission] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    loadAffiliates();
  }, []);

  const loadAffiliates = async () => {
    try {
      const result = await apiCall('/admin/affiliates', { method: 'GET' });
      setAffiliates(result.affiliates || []);
    } catch (error: any) {
      console.error('Load affiliates error:', error);
      toast.error('Failed to load affiliates');
    }
  };

  const loadUsageHistory = async (affiliateId: string) => {
    try {
      const result = await apiCall(`/admin/affiliates/${affiliateId}/usage`, { method: 'GET' });
      setUsageHistory(result.usageHistory || []);
    } catch (error: any) {
      console.error('Load usage history error:', error);
      toast.error('Failed to load usage history');
    }
  };

  const downloadUsageHistoryCSV = () => {
    if (!selectedAffiliate || usageHistory.length === 0) {
      toast.error('No usage history to download');
      return;
    }

    // Create CSV content
    const headers = ['Date', 'User Email', 'Order Number', 'Order Value', 'Commission', 'User ID'];
    const rows = usageHistory.map(record => [
      new Date(record.timestamp).toLocaleString(),
      record.userEmail,
      record.orderNumber || record.orderId || record.batchId || 'N/A',
      `₹${(record.orderValue || 0).toFixed(2)}`,
      `₹${(record.commission || 0).toFixed(2)}`,
      record.userId || 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `\"${cell}\"`).join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedAffiliate.name}_usage_history_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('CSV downloaded successfully');
  };

  const resetForm = () => {
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormCode('');
    setFormDiscount('');
    setFormCommission('');
  };

  const handleCreate = async () => {
    try {
      if (!formName || !formEmail || !formCode || !formDiscount || !formCommission) {
        toast.error('Please fill in required fields');
        return;
      }

      const commission = parseFloat(formCommission);
      if (isNaN(commission) || commission <= 0 || commission > 100) {
        toast.error('Commission must be between 0 and 100%');
        return;
      }

      const discount = parseFloat(formDiscount);
      if (isNaN(discount) || discount <= 0 || discount > 100) {
        toast.error('Discount must be between 0 and 100%');
        return;
      }

      const affiliateData = {
        name: formName,
        email: formEmail,
        phone: formPhone || undefined,
        discountCode: formCode.toUpperCase(),
        discountPercentage: discount,
        commissionPercentage: commission,
        totalSales: 0,
        totalCommission: 0,
        totalPaid: 0,
        usageCount: 0,
        isActive: true,
      };

      await apiCall('/admin/affiliates', {
        method: 'POST',
        body: JSON.stringify(affiliateData),
      });

      toast.success('Affiliate added successfully');
      setIsDialogOpen(false);
      resetForm();
      loadAffiliates();
    } catch (error: any) {
      console.error('Create affiliate error:', error);
      toast.error('Failed to create affiliate');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this affiliate?')) return;

    try {
      await apiCall(`/admin/affiliates/${id}`, { method: 'DELETE' });
      toast.success('Affiliate deleted successfully');
      loadAffiliates();
    } catch (error: any) {
      console.error('Delete affiliate error:', error);
      toast.error('Failed to delete affiliate');
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      await apiCall(`/admin/affiliates/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !isActive }),
      });
      toast.success(`Affiliate ${!isActive ? 'activated' : 'deactivated'}`);
      loadAffiliates();
    } catch (error: any) {
      console.error('Toggle affiliate error:', error);
      toast.error('Failed to update affiliate');
    }
  };

  const handleDisbursement = async () => {
    if (!selectedAffiliate) return;
    
    // Prevent double submissions
    if (isRecording) return;

    try {
      if (!disbursementAmount || !transactionNumber) {
        toast.error('Please fill in required fields');
        return;
      }

      const amount = parseFloat(disbursementAmount);
      if (isNaN(amount) || amount <= 0) {
        toast.error('Amount must be a positive number');
        return;
      }

      setIsRecording(true); // Disable button

      const disbursementData = {
        affiliateId: selectedAffiliate.id,
        amount,
        transactionNumber,
        notes: disbursementNotes,
      };

      await apiCall('/admin/disbursements', {
        method: 'POST',
        body: JSON.stringify(disbursementData),
      });

      toast.success('Disbursement added successfully');
      setIsDetailsOpen(false);
      setDisbursementAmount('');
      setTransactionNumber('');
      setDisbursementNotes('');
      loadAffiliates();
    } catch (error: any) {
      console.error('Disbursement error:', error);
      toast.error('Failed to add disbursement');
    } finally {
      setIsRecording(false); // Re-enable button
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white mb-2">Affiliates Management</h1>
          <p className="text-gray-400">Manage affiliate partners and track their performance</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Affiliate
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-gradient-to-br from-blue-600 to-blue-500 border-0">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl text-white mb-1">
                {affiliates.filter(a => a.isActive).length}
              </div>
              <div className="text-sm text-blue-100">Active Affiliates</div>
            </div>
            <Users className="w-8 h-8 text-white opacity-80" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-emerald-600 to-emerald-500 border-0">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl text-white mb-1">
                ₹{affiliates.reduce((sum, a) => sum + a.totalSales, 0).toLocaleString()}
              </div>
              <div className="text-sm text-emerald-100">Total Sales</div>
            </div>
            <DollarSign className="w-8 h-8 text-white opacity-80" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-600 to-purple-500 border-0">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl text-white mb-1">
                ₹{affiliates.reduce((sum, a) => sum + a.totalCommission, 0).toLocaleString()}
              </div>
              <div className="text-sm text-purple-100">Total Commission</div>
            </div>
            <TrendingUp className="w-8 h-8 text-white opacity-80" />
          </div>
        </Card>
      </div>

      <Card className="p-6 bg-[#1a1a1a] border-gray-800">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-800 hover:bg-[#2a2a2a]">
              <TableHead className="text-gray-400">Name</TableHead>
              <TableHead className="text-gray-400">Contact</TableHead>
              <TableHead className="text-gray-400">Code</TableHead>
              <TableHead className="text-gray-400">Commission</TableHead>
              <TableHead className="text-gray-400">Usage</TableHead>
              <TableHead className="text-gray-400">Sales</TableHead>
              <TableHead className="text-gray-400">Earned</TableHead>
              <TableHead className="text-gray-400">Paid</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
              <TableHead className="text-right text-gray-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {affiliates.map((affiliate) => (
              <TableRow key={affiliate.id} className="border-gray-800 hover:bg-[#2a2a2a]">
                <TableCell className="text-white">{affiliate.name}</TableCell>
                <TableCell className="text-gray-300">
                  <div className="text-sm">{affiliate.email}</div>
                  {affiliate.phone && (
                    <div className="text-xs text-gray-500">{affiliate.phone}</div>
                  )}
                </TableCell>
                <TableCell className="text-white font-mono">{affiliate.discountCode}</TableCell>
                <TableCell className="text-gray-300">{affiliate.commissionPercentage}%</TableCell>
                <TableCell className="text-gray-300">{affiliate.usageCount}</TableCell>
                <TableCell className="text-gray-300">₹{affiliate.totalSales.toLocaleString()}</TableCell>
                <TableCell className="text-emerald-400">₹{affiliate.totalCommission.toLocaleString()}</TableCell>
                <TableCell className="text-blue-400">₹{(affiliate.totalPaid || 0).toLocaleString()}</TableCell>
                <TableCell>
                  <button
                    onClick={() => toggleActive(affiliate.id, affiliate.isActive)}
                    className={`px-3 py-1 rounded text-xs ${
                      affiliate.isActive
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-gray-800 text-gray-400 border border-gray-700'
                    }`}
                  >
                    {affiliate.isActive ? 'Active' : 'Inactive'}
                  </button>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedAffiliate(affiliate);
                        setIsDetailsOpen(true);
                      }}
                      title="View Details"
                    >
                      <Eye className="w-4 h-4 text-blue-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        setSelectedAffiliate(affiliate);
                        await loadUsageHistory(affiliate.id);
                        setIsUsageHistoryOpen(true);
                      }}
                      title="Usage History"
                    >
                      <History className="w-4 h-4 text-purple-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(affiliate.id)}
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {affiliates.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-gray-500 py-8">
                  No affiliates added yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Add Affiliate Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md bg-[#1a1a1a] border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">Add New Affiliate</DialogTitle>
            <DialogDescription className="text-gray-400">
              Create a new affiliate partner with a unique discount code
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Name *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Affiliate name"
                className="bg-[#0a0a0a] border-gray-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Email *</Label>
              <Input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="affiliate@example.com"
                className="bg-[#0a0a0a] border-gray-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Phone (Optional)</Label>
              <Input
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="+91 XXXXX XXXXX"
                className="bg-[#0a0a0a] border-gray-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Discount Code *</Label>
              <Input
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                placeholder="e.g., PARTNER10"
                className="bg-[#0a0a0a] border-gray-700 text-white font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Discount Percentage *</Label>
              <p className="text-xs text-gray-500">Discount given to customers using this code</p>
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  value={formDiscount}
                  onChange={(e) => setFormDiscount(e.target.value)}
                  placeholder="10"
                  className="bg-[#0a0a0a] border-gray-700 text-white pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Commission Percentage *</Label>
              <p className="text-xs text-gray-500">Commission earned by affiliate on sales</p>
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  value={formCommission}
                  onChange={(e) => setFormCommission(e.target.value)}
                  placeholder="5"
                  className="bg-[#0a0a0a] border-gray-700 text-white pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate}>Add Affiliate</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Affiliate Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-6xl sm:max-w-6xl bg-[#1a1a1a] border-gray-800 max-h-[90vh] overflow-hidden flex flex-col p-0">
          <div className="p-6 border-b border-gray-800">
            <DialogHeader>
              <DialogTitle className="text-white">Affiliate Details</DialogTitle>
              <DialogDescription className="text-gray-400">
                View and manage affiliate details and disbursements
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="grid grid-cols-2 gap-6 p-6 overflow-y-auto flex-1">
            {/* Left Column - Basic Info */}
            <div className="space-y-4">
              <h3 className="text-white mb-2">Basic Information</h3>
              
              {selectedAffiliate && (
                <div className="space-y-2">
                  <Label className="text-gray-300">Name</Label>
                  <Input
                    value={selectedAffiliate.name}
                    readOnly
                    className="bg-[#0a0a0a] border-gray-700 text-white"
                  />
                </div>
              )}

              {selectedAffiliate && (
                <div className="space-y-2">
                  <Label className="text-gray-300">Email</Label>
                  <Input
                    value={selectedAffiliate.email}
                    readOnly
                    className="bg-[#0a0a0a] border-gray-700 text-white"
                  />
                </div>
              )}

              {selectedAffiliate && (
                <div className="space-y-2">
                  <Label className="text-gray-300">Phone</Label>
                  <Input
                    value={selectedAffiliate.phone || 'N/A'}
                    readOnly
                    className="bg-[#0a0a0a] border-gray-700 text-white"
                  />
                </div>
              )}

              {selectedAffiliate && (
                <div className="space-y-2">
                  <Label className="text-gray-300">Discount Code</Label>
                  <Input
                    value={selectedAffiliate.discountCode}
                    readOnly
                    className="bg-[#0a0a0a] border-gray-700 text-white font-mono"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {selectedAffiliate && (
                  <div className="space-y-2">
                    <Label className="text-gray-300">Discount %</Label>
                    <Input
                      value={`${selectedAffiliate.discountPercentage}%`}
                      readOnly
                      className="bg-[#0a0a0a] border-gray-700 text-white"
                    />
                  </div>
                )}

                {selectedAffiliate && (
                  <div className="space-y-2">
                    <Label className="text-gray-300">Commission %</Label>
                    <Input
                      value={`${selectedAffiliate.commissionPercentage}%`}
                      readOnly
                      className="bg-[#0a0a0a] border-gray-700 text-white"
                    />
                  </div>
                )}
              </div>

              <h3 className="text-white mb-2 pt-4">Performance Metrics</h3>

              <div className="grid grid-cols-2 gap-4">
                {selectedAffiliate && (
                  <div className="space-y-2">
                    <Label className="text-gray-300">Usage Count</Label>
                    <Input
                      value={selectedAffiliate.usageCount.toString()}
                      readOnly
                      className="bg-[#0a0a0a] border-gray-700 text-white"
                    />
                  </div>
                )}

                {selectedAffiliate && (
                  <div className="space-y-2">
                    <Label className="text-gray-300">Status</Label>
                    <Input
                      value={selectedAffiliate.isActive ? 'Active' : 'Inactive'}
                      readOnly
                      className="bg-[#0a0a0a] border-gray-700 text-white"
                    />
                  </div>
                )}
              </div>

              {selectedAffiliate && (
                <div className="space-y-2">
                  <Label className="text-gray-300">Total Sales</Label>
                  <Input
                    value={`₹${selectedAffiliate.totalSales.toLocaleString()}`}
                    readOnly
                    className="bg-[#0a0a0a] border-gray-700 text-white"
                  />
                </div>
              )}

              {selectedAffiliate && (
                <div className="space-y-2">
                  <Label className="text-gray-300">Total Commission</Label>
                  <Input
                    value={`₹${selectedAffiliate.totalCommission.toLocaleString()}`}
                    readOnly
                    className="bg-[#0a0a0a] border-gray-700 text-white"
                  />
                </div>
              )}

              {selectedAffiliate && (
                <div className="space-y-2">
                  <Label className="text-gray-300">Total Paid</Label>
                  <Input
                    value={`₹${(selectedAffiliate.totalPaid || 0).toLocaleString()}`}
                    readOnly
                    className="bg-[#0a0a0a] border-gray-700 text-white"
                  />
                </div>
              )}

              {selectedAffiliate && (
                <div className="space-y-2">
                  <Label className="text-gray-300">Outstanding Balance</Label>
                  <Input
                    value={`₹${(selectedAffiliate.totalCommission - (selectedAffiliate.totalPaid || 0)).toLocaleString()}`}
                    readOnly
                    className="bg-[#0a0a0a] border-gray-700 text-emerald-400"
                  />
                </div>
              )}
            </div>

            {/* Right Column - User Emails and Payment History */}
            <div className="space-y-4">
              {/* User Emails Section */}
              {selectedAffiliate && selectedAffiliate.userEmails && selectedAffiliate.userEmails.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-gray-300">User Emails (Who used this code)</Label>
                  <div className="bg-[#0a0a0a] border border-gray-700 rounded-md p-3 max-h-40 overflow-y-auto">
                    {selectedAffiliate.userEmails.map((email, index) => (
                      <div key={index} className="text-sm text-gray-300 py-1">
                        {email}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">
                    {selectedAffiliate.userEmails.length} user{selectedAffiliate.userEmails.length !== 1 ? 's' : ''} used this affiliate code
                  </p>
                </div>
              )}

              {/* Disbursements History */}
              {selectedAffiliate && (
                <div className="space-y-2">
                  <Label className="text-gray-300">Payment History</Label>
                  <div className="border border-gray-700 rounded-md overflow-hidden max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-800 hover:bg-[#2a2a2a]">
                          <TableHead className="text-gray-400">Amount</TableHead>
                          <TableHead className="text-gray-400">Transaction #</TableHead>
                          <TableHead className="text-gray-400">Date</TableHead>
                          <TableHead className="text-gray-400">Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedAffiliate.disbursements && selectedAffiliate.disbursements.length > 0 ? (
                          selectedAffiliate.disbursements.map((disbursement) => (
                            <TableRow key={disbursement.id} className="border-gray-800 hover:bg-[#2a2a2a]">
                              <TableCell className="text-emerald-400">₹{disbursement.amount.toLocaleString()}</TableCell>
                              <TableCell className="text-gray-300 font-mono text-xs">{disbursement.transactionNumber}</TableCell>
                              <TableCell className="text-gray-300 text-xs">{new Date(disbursement.date).toLocaleDateString()}</TableCell>
                              <TableCell className="text-gray-300 text-xs">{disbursement.notes || '—'}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                              No payment history yet
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Fixed Bottom Navigation Bar - Disbursement Form */}
          <div className="border-t border-gray-800 p-6" style={{ backgroundColor: '#222222' }}>
            <h3 className="text-white mb-4 flex items-center">
              <Receipt className="w-5 h-5 mr-2 text-emerald-400" />
              Record New Disbursement
            </h3>
            <div className="grid grid-cols-12 gap-4 items-end">
              <div className="col-span-3 space-y-2">
                <Label className="text-gray-300">Amount *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={disbursementAmount}
                    onChange={(e) => setDisbursementAmount(e.target.value)}
                    placeholder="0.00"
                    className="bg-[#1a1a1a] border-gray-700 text-white pl-8"
                  />
                </div>
              </div>

              <div className="col-span-4 space-y-2">
                <Label className="text-gray-300">Transaction/Cheque Number *</Label>
                <Input
                  value={transactionNumber}
                  onChange={(e) => setTransactionNumber(e.target.value)}
                  placeholder="e.g., TXN123456 or CHQ987654"
                  className="bg-[#1a1a1a] border-gray-700 text-white font-mono"
                />
              </div>

              <div className="col-span-3 space-y-2">
                <Label className="text-gray-300">Notes (Optional)</Label>
                <Input
                  value={disbursementNotes}
                  onChange={(e) => setDisbursementNotes(e.target.value)}
                  placeholder="Bank transfer, Cheque..."
                  className="bg-[#1a1a1a] border-gray-700 text-white"
                />
              </div>

              <div className="col-span-2 flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsDetailsOpen(false);
                    setDisbursementAmount('');
                    setTransactionNumber('');
                    setDisbursementNotes('');
                  }}
                  className="flex-1"
                  disabled={isRecording}
                >
                  Close
                </Button>
                <Button 
                  onClick={handleDisbursement}
                  disabled={isRecording}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRecording ? 'Recording...' : 'Record'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Usage History Dialog */}
      <Dialog open={isUsageHistoryOpen} onOpenChange={setIsUsageHistoryOpen}>
        <DialogContent className="max-w-6xl sm:max-w-6xl bg-[#1a1a1a] border-gray-800 max-h-[90vh] overflow-hidden flex flex-col p-0">
          <div className="p-6 border-b border-gray-800">
            <DialogHeader>
              <DialogTitle className="text-white">Usage History</DialogTitle>
              <DialogDescription className="text-gray-400">
                {selectedAffiliate && `Track all orders using ${selectedAffiliate.discountCode} for fraud detection`}
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="p-6 overflow-y-auto flex-1">
            {usageHistory.length > 0 ? (
              <div className="border border-gray-700 rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-800 hover:bg-[#2a2a2a]">
                      <TableHead className="text-gray-400">Date</TableHead>
                      <TableHead className="text-gray-400">User Email</TableHead>
                      <TableHead className="text-gray-400">Order #</TableHead>
                      <TableHead className="text-gray-400">Order Value</TableHead>
                      <TableHead className="text-gray-400">Commission</TableHead>
                      <TableHead className="text-gray-400">User ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usageHistory.map((record) => (
                      <TableRow key={record.id} className="border-gray-800 hover:bg-[#2a2a2a]">
                        <TableCell className="text-gray-300 text-sm">
                          {new Date(record.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-gray-300">{record.userEmail}</TableCell>
                        <TableCell className="text-gray-300 font-mono text-sm">
                          {record.orderNumber || record.orderId || record.batchId || 'N/A'}
                        </TableCell>
                        <TableCell className="text-emerald-400">
                          ₹{(record.orderValue || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-purple-400">
                          ₹{(record.commission || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-gray-500 font-mono text-xs">
                          {record.userId?.split(':').pop() || record.userId || 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                No usage history yet
              </div>
            )}
          </div>

          <div className="border-t border-gray-800 p-6 flex justify-between" style={{ backgroundColor: '#222222' }}>
            <div className="text-gray-400 text-sm">
              {usageHistory.length > 0 && (
                <>
                  <div>Total Usage: {usageHistory.length} order{usageHistory.length !== 1 ? 's' : ''}</div>
                  <div className="mt-1">
                    Total Value: ₹{usageHistory.reduce((sum, r) => sum + (r.orderValue || 0), 0).toFixed(2)}
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsUsageHistoryOpen(false)}
              >
                Close
              </Button>
              <Button 
                onClick={downloadUsageHistoryCSV}
                disabled={usageHistory.length === 0}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <History className="w-4 h-4 mr-2" />
                Download CSV
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
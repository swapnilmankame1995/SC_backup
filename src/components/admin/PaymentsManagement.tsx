import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { CreditCard, DollarSign, CheckCircle, XCircle, Clock, Settings } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { apiCall } from '../../utils/api';

interface Payment {
  id: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod: string;
  transactionId?: string;
  gateway: 'razorpay' | 'payu';
  createdAt: string;
}

interface PaymentGatewayConfig {
  gateway: 'razorpay' | 'payu';
  isEnabled: boolean;
  keyId?: string;
  secretKey?: string;
  merchantId?: string;
}

export function PaymentsManagement() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState<'razorpay' | 'payu'>('razorpay');
  const [razorpayConfig, setRazorpayConfig] = useState({ keyId: '', secretKey: '', isEnabled: false });
  const [payuConfig, setPayuConfig] = useState({ merchantId: '', secretKey: '', isEnabled: false });

  useEffect(() => {
    loadPayments();
    loadGatewayConfigs();
  }, []);

  const loadPayments = async () => {
    try {
      const result = await apiCall('/admin/payments', { method: 'GET' });
      setPayments(result.payments || []);
    } catch (error: any) {
      console.error('Load payments error:', error);
      toast.error('Failed to load payments');
    }
  };

  const loadGatewayConfigs = async () => {
    try {
      const result = await apiCall('/admin/payment-gateways', { method: 'GET' });
      if (result.razorpay) {
        setRazorpayConfig(result.razorpay);
      }
      if (result.payu) {
        setPayuConfig(result.payu);
      }
    } catch (error: any) {
      console.error('Load gateway configs error:', error);
    }
  };

  const handleSaveGatewayConfig = async () => {
    try {
      const config = selectedGateway === 'razorpay' ? razorpayConfig : payuConfig;
      
      // Only save credentials, not isEnabled status
      // isEnabled is controlled from Settings tab to avoid conflicts
      const configToSave = {
        keyId: config.keyId,
        secretKey: config.secretKey,
        merchantId: (config as any).merchantId,
        // Don't include isEnabled in the update
      };
      
      await apiCall(`/admin/payment-gateways/${selectedGateway}`, {
        method: 'PUT',
        body: JSON.stringify(configToSave),
      });

      toast.success('Payment gateway configuration saved');
      setIsConfigOpen(false);
      loadGatewayConfigs();
    } catch (error: any) {
      console.error('Save gateway config error:', error);
      toast.error('Failed to save configuration');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-orange-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-emerald-950 text-emerald-400 border-emerald-800';
      case 'pending':
        return 'bg-orange-950 text-orange-400 border-orange-800';
      case 'failed':
        return 'bg-red-950 text-red-400 border-red-800';
      case 'refunded':
        return 'bg-blue-950 text-blue-400 border-blue-800';
      default:
        return 'bg-gray-800 text-gray-400 border-gray-700';
    }
  };

  const totalAmount = payments.reduce((sum, p) => sum + (p.status === 'completed' ? p.amount : 0), 0);
  const pendingAmount = payments.reduce((sum, p) => sum + (p.status === 'pending' ? p.amount : 0), 0);
  const completedCount = payments.filter(p => p.status === 'completed').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white mb-2">Payments</h1>
          <p className="text-gray-400">View transactions and configure payment gateways</p>
        </div>
        <Button onClick={() => setIsConfigOpen(true)}>
          <Settings className="w-4 h-4 mr-2" />
          Gateway Settings
        </Button>
      </div>

      {/* Payment Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-gradient-to-br from-emerald-600 to-emerald-500 border-0">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl text-white mb-1">₹{totalAmount.toLocaleString()}</div>
              <div className="text-sm text-emerald-100">Total Received</div>
            </div>
            <DollarSign className="w-8 h-8 text-white opacity-80" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-orange-600 to-orange-500 border-0">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl text-white mb-1">₹{pendingAmount.toLocaleString()}</div>
              <div className="text-sm text-orange-100">Pending Amount</div>
            </div>
            <Clock className="w-8 h-8 text-white opacity-80" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-blue-600 to-blue-500 border-0">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl text-white mb-1">{completedCount}</div>
              <div className="text-sm text-blue-100">Successful Transactions</div>
            </div>
            <CheckCircle className="w-8 h-8 text-white opacity-80" />
          </div>
        </Card>
      </div>

      {/* Gateway Status */}
      <Card className="p-6 bg-[#1a1a1a] border-gray-800">
        <h3 className="text-white mb-4">Payment Gateway Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-4 bg-[#0a0a0a] rounded border border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-950 rounded-lg flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <div className="text-white font-medium">Razorpay</div>
                <div className="text-xs text-gray-400">Payment Gateway</div>
              </div>
            </div>
            <Badge className={razorpayConfig.isEnabled ? 'bg-emerald-950 text-emerald-400' : 'bg-gray-800 text-gray-400'}>
              {razorpayConfig.isEnabled ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          <div className="flex items-center justify-between p-4 bg-[#0a0a0a] rounded border border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-950 rounded-lg flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <div className="text-white font-medium">PayU</div>
                <div className="text-xs text-gray-400">Payment Gateway</div>
              </div>
            </div>
            <Badge className={payuConfig.isEnabled ? 'bg-emerald-950 text-emerald-400' : 'bg-gray-800 text-gray-400'}>
              {payuConfig.isEnabled ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Transactions Table */}
      <Card className="p-6 bg-[#1a1a1a] border-gray-800">
        <h3 className="text-white mb-6">Recent Transactions</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-800 hover:bg-[#2a2a2a]">
                <TableHead className="text-gray-400">Transaction ID</TableHead>
                <TableHead className="text-gray-400">Date</TableHead>
                <TableHead className="text-gray-400">Customer</TableHead>
                <TableHead className="text-gray-400">Order ID</TableHead>
                <TableHead className="text-gray-400">Amount</TableHead>
                <TableHead className="text-gray-400">Gateway</TableHead>
                <TableHead className="text-gray-400">Method</TableHead>
                <TableHead className="text-gray-400">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id} className="border-gray-800 hover:bg-[#2a2a2a]">
                  <TableCell className="text-white font-mono text-sm">
                    {payment.transactionId || payment.id.slice(-8)}
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {new Date(payment.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-gray-300">
                    <div>{payment.customerName}</div>
                    <div className="text-xs text-gray-500">{payment.customerEmail}</div>
                  </TableCell>
                  <TableCell className="text-gray-300 font-mono text-sm">
                    #{payment.orderId.slice(-8)}
                  </TableCell>
                  <TableCell className="text-white">₹{payment.amount.toFixed(2)}</TableCell>
                  <TableCell className="text-gray-300">
                    <span className="capitalize">{payment.gateway}</span>
                  </TableCell>
                  <TableCell className="text-gray-300">{payment.paymentMethod}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(payment.status)}
                      <Badge className={getStatusColor(payment.status)}>
                        {payment.status}
                      </Badge>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {payments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                    No payment transactions yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Gateway Configuration Dialog */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="max-w-md bg-[#1a1a1a] border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">Payment Gateway Configuration</DialogTitle>
            <DialogDescription className="text-gray-400">
              Configure your payment gateway credentials
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Button
                variant={selectedGateway === 'razorpay' ? 'default' : 'outline'}
                onClick={() => setSelectedGateway('razorpay')}
                className="flex-1"
              >
                Razorpay
              </Button>
              <Button
                variant={selectedGateway === 'payu' ? 'default' : 'outline'}
                onClick={() => setSelectedGateway('payu')}
                className="flex-1"
              >
                PayU
              </Button>
            </div>

            {selectedGateway === 'razorpay' && (
              <>
                <div className="space-y-2">
                  <Label className="text-gray-300">Key ID</Label>
                  <Input
                    value={razorpayConfig.keyId}
                    onChange={(e) => setRazorpayConfig({ ...razorpayConfig, keyId: e.target.value })}
                    placeholder="rzp_live_xxxxxxxxxx"
                    className="bg-[#0a0a0a] border-gray-700 text-white font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Secret Key</Label>
                  <Input
                    type="password"
                    value={razorpayConfig.secretKey}
                    onChange={(e) => setRazorpayConfig({ ...razorpayConfig, secretKey: e.target.value })}
                    placeholder="••••••••••••••••"
                    className="bg-[#0a0a0a] border-gray-700 text-white font-mono"
                  />
                </div>
              </>
            )}

            {selectedGateway === 'payu' && (
              <>
                <div className="space-y-2">
                  <Label className="text-gray-300">Merchant ID</Label>
                  <Input
                    value={payuConfig.merchantId}
                    onChange={(e) => setPayuConfig({ ...payuConfig, merchantId: e.target.value })}
                    placeholder="Merchant ID"
                    className="bg-[#0a0a0a] border-gray-700 text-white font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Secret Key</Label>
                  <Input
                    type="password"
                    value={payuConfig.secretKey}
                    onChange={(e) => setPayuConfig({ ...payuConfig, secretKey: e.target.value })}
                    placeholder="••••••••••••••••"
                    className="bg-[#0a0a0a] border-gray-700 text-white font-mono"
                  />
                </div>
              </>
            )}
            
            <div className="bg-yellow-950/30 border border-yellow-800 rounded p-3 text-sm text-yellow-300">
              <p>
                <strong>Note:</strong> To enable/disable gateways, go to Settings → Payment Gateways.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsConfigOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveGatewayConfig}>Save Configuration</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
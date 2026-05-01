import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { IndianRupee, Users, TrendingUp, Clock, Copy, Check } from 'lucide-react';
import { apiCall } from '../utils/api';
import { toast } from 'sonner@2.0.3';

interface UsageRecord {
  id: string;
  userEmail: string;
  orderValue: number;
  commission: number;
  orderNumber: string;
  timestamp: string;
}

interface Disbursement {
  id: string;
  amount: number;
  transactionNumber: string;
  notes?: string;
  date: string;
}

interface AffiliateData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  discountCode: string;
  discountPercentage: number;
  commissionPercentage: number;
  totalSales: number;
  totalCommission: number;
  totalPaid: number;
  usageCount: number;
  isActive: boolean;
  createdAt: string;
}

export function AffiliatePanel() {
  const [loading, setLoading] = useState(true);
  const [affiliateData, setAffiliateData] = useState<AffiliateData | null>(null);
  const [usageHistory, setUsageHistory] = useState<UsageRecord[]>([]);
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [codeCopied, setCodeCopied] = useState(false);

  useEffect(() => {
    fetchAffiliateData();
  }, []);

  const fetchAffiliateData = async () => {
    try {
      setLoading(true);
      const result = await apiCall('/affiliate/dashboard', { method: 'GET' });
      
      if (result.success) {
        setAffiliateData(result.affiliate);
        setUsageHistory(result.usageHistory || []);
        setDisbursements(result.disbursements || []);
      } else {
        toast.error(result.error || 'Failed to load affiliate data');
      }
    } catch (error: any) {
      console.error('Error fetching affiliate data:', error);
      toast.error('Failed to load affiliate data');
    } finally {
      setLoading(false);
    }
  };

  const copyDiscountCode = () => {
    if (affiliateData?.discountCode) {
      navigator.clipboard.writeText(affiliateData.discountCode);
      setCodeCopied(true);
      toast.success('Discount code copied to clipboard!');
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#dc0000] mx-auto mb-4"></div>
          <p className="text-gray-400">Loading affiliate data...</p>
        </div>
      </div>
    );
  }

  if (!affiliateData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-8 bg-[#1a1a1a] border-gray-800 text-center max-w-md">
          <p className="text-gray-400 mb-2">You are not registered as an affiliate.</p>
          <p className="text-sm text-gray-500">Contact support to become an affiliate partner.</p>
        </Card>
      </div>
    );
  }

  const pendingAmount = affiliateData.totalCommission - affiliateData.totalPaid;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-white mb-2">Affiliate Panel</h1>
        <p className="text-gray-400">Track your earnings and referrals</p>
      </div>

      {/* Discount Code Card */}
      <Card className="p-6 bg-gradient-to-r from-[#dc0000] to-red-600 border-0">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/80 mb-1">Your Discount Code</p>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-white tracking-wider">
                {affiliateData.discountCode}
              </span>
              <Button
                onClick={copyDiscountCode}
                variant="outline"
                size="sm"
                className="border-white/30 text-white hover:bg-white/10"
              >
                {codeCopied ? (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <p className="text-sm text-white/70 mt-2">
              {affiliateData.discountPercentage}% discount for customers • {affiliateData.commissionPercentage}% commission for you
            </p>
          </div>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6 bg-[#1a1a1a] border-gray-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <IndianRupee className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Earned</p>
              <p className="text-2xl text-white">{formatCurrency(affiliateData.totalCommission)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-[#1a1a1a] border-gray-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <IndianRupee className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Paid</p>
              <p className="text-2xl text-white">{formatCurrency(affiliateData.totalPaid)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-[#1a1a1a] border-gray-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <Clock className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Pending</p>
              <p className="text-2xl text-white">{formatCurrency(pendingAmount)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-[#1a1a1a] border-gray-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Users className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Uses</p>
              <p className="text-2xl text-white">{affiliateData.usageCount}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Usage History */}
      <Card className="p-6 bg-[#1a1a1a] border-gray-800">
        <div className="mb-4">
          <h3 className="text-white mb-1 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Referral History
          </h3>
          <p className="text-sm text-gray-400">Customers who used your discount code</p>
        </div>

        {usageHistory.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No referrals yet. Share your code to start earning!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 px-2 text-sm text-gray-400">Email</th>
                  <th className="text-left py-3 px-2 text-sm text-gray-400">Order #</th>
                  <th className="text-right py-3 px-2 text-sm text-gray-400">Order Value</th>
                  <th className="text-right py-3 px-2 text-sm text-gray-400">Your Commission</th>
                  <th className="text-right py-3 px-2 text-sm text-gray-400">Date</th>
                </tr>
              </thead>
              <tbody>
                {usageHistory.map((record) => (
                  <tr key={record.id} className="border-b border-gray-800/50">
                    <td className="py-3 px-2 text-sm text-white">{record.userEmail}</td>
                    <td className="py-3 px-2 text-sm text-gray-400">{record.orderNumber}</td>
                    <td className="py-3 px-2 text-sm text-right text-white">
                      {formatCurrency(record.orderValue)}
                    </td>
                    <td className="py-3 px-2 text-sm text-right text-emerald-400">
                      +{formatCurrency(record.commission)}
                    </td>
                    <td className="py-3 px-2 text-sm text-right text-gray-400">
                      {formatDate(record.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Disbursements */}
      <Card className="p-6 bg-[#1a1a1a] border-gray-800">
        <div className="mb-4">
          <h3 className="text-white mb-1 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Payment History
          </h3>
          <p className="text-sm text-gray-400">Payments disbursed to you</p>
        </div>

        {disbursements.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No payments disbursed yet.
          </div>
        ) : (
          <div className="space-y-3">
            {disbursements.map((disbursement) => (
              <div
                key={disbursement.id}
                className="flex items-center justify-between p-4 bg-[#222] rounded-lg border border-gray-800"
              >
                <div>
                  <p className="text-white mb-1">
                    {formatCurrency(disbursement.amount)}
                  </p>
                  <p className="text-sm text-gray-400">
                    Transaction: {disbursement.transactionNumber}
                  </p>
                  {disbursement.notes && (
                    <p className="text-sm text-gray-500 mt-1">{disbursement.notes}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">{formatDate(disbursement.date)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

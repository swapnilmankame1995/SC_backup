import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Package,
  MapPin,
  User,
  Phone,
  Mail,
  Loader2,
  ExternalLink,
  Calendar,
  IndianRupee,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronUp,
  FileText,
  Info,
  RefreshCw,
  Gift,
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
import { OrderRow } from './OrderRow';
import { MobileOrderCard } from './MobileOrderCard';
import { AffiliatePanel } from './AffiliatePanel';

interface Order {
  id: string;
  orderNumber: string;
  orderDate: string;
  status: 'pending' | 'processing' | 'in-transit' | 'shipped' | 'delivered' | 'cancelled';
  total: number;
  trackingUrl?: string;
  material: string;
  thickness: number;
  fileName?: string;
  isBatch?: boolean;
  itemCount?: number;
  shippingCost?: number;
  shippingCarrier?: string | null;
  items?: Array<{
    id: string;
    fileName: string;
    material: string;
    thickness: number;
    price: number;
    filePath?: string;
    color?: string | null;
  }>;
  color?: string | null;
}

interface UserProfile {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  apartment?: string;
  city: string;
  state: string;
  pinCode: string;
  country: string;
  gstNumber?: string;
  points?: number; // Loyalty points
  isAffiliate?: boolean;
}

interface UserDashboardProps {
  user: any;
  onBack: () => void;
  onReorderFile?: (filePath: string, fileName: string, material: string, thickness: number, dxfData: any) => void;
}

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

const STATUS_CONFIG = {
  pending: {
    icon: Clock,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-950',
    borderColor: 'border-yellow-800',
    label: 'Pending',
  },
  processing: {
    icon: Package,
    color: 'text-blue-400',
    bgColor: 'bg-blue-950',
    borderColor: 'border-blue-800',
    label: 'Processing',
  },
  'in-transit': {
    icon: Truck,
    color: 'text-purple-400',
    bgColor: 'bg-purple-950',
    borderColor: 'border-purple-800',
    label: 'In Transit',
  },
  shipped: {
    icon: Truck,
    color: 'text-purple-400',
    bgColor: 'bg-purple-950',
    borderColor: 'border-purple-800',
    label: 'Shipped',
  },
  delivered: {
    icon: CheckCircle2,
    color: 'text-green-400',
    bgColor: 'bg-green-950',
    borderColor: 'border-green-800',
    label: 'Delivered',
  },
  cancelled: {
    icon: XCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-950',
    borderColor: 'border-red-800',
    label: 'Cancelled',
  },
};

export function UserDashboard({ user, onBack, onReorderFile }: UserDashboardProps) {
  const [activeTab, setActiveTab] = useState<'orders' | 'profile' | 'affiliate'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isAffiliate, setIsAffiliate] = useState(false);

  // Orders filtering and pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'total'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const toggleOrderExpansion = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  // Profile fields
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [apartment, setApartment] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [country, setCountry] = useState('India');
  const [gstNumber, setGstNumber] = useState('');
  const [userPoints, setUserPoints] = useState(0);

  // Fetch orders function
  const fetchOrders = async () => {
    try {
      setIsLoadingOrders(true);
      console.log('🔍 Fetching user orders...');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8927474f/user/orders`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
        }
      );

      const data = await response.json();
      console.log('📦 User orders API response:', data);
      console.log('📦 Orders array:', data.orders);
      console.log('📦 Orders count:', data.orders?.length);
      
      if (data.success) {
        setOrders(data.orders || []);
      } else {
        console.error('❌ Failed to load orders:', data.error);
        toast.error('Failed to load orders');
      }
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setIsLoadingOrders(false);
    }
  };

  // Fetch orders on mount
  useEffect(() => {
    fetchOrders();
  }, []);

  // Fetch profile
  useEffect(() => {
    const fetchProfile = async () => {
      // Don't fetch if user is not available
      if (!user) {
        setIsLoadingProfile(false);
        return;
      }

      try {
        setIsLoadingProfile(true);
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-8927474f/user/profile`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            },
          }
        );

        const data = await response.json();
        
        if (data.success && data.profile) {
          const profile = data.profile;
          setEmail(profile.email || user?.email || '');
          setFirstName(profile.firstName || '');
          setLastName(profile.lastName || '');
          setPhone(profile.phone || '');
          setAddress(profile.address || '');
          setApartment(profile.apartment || '');
          setCity(profile.city || '');
          setState(profile.state || '');
          setPinCode(profile.pinCode || '');
          setCountry(profile.country || 'India');
          setGstNumber(profile.gstNumber || '');
          setUserPoints(profile.points || 0);
          setIsAffiliate(profile.isAffiliate || false);
        } else {
          // Initialize with user email if no profile exists
          setEmail(user?.email || '');
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast.error('Failed to load profile');
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleBackfillDeliveryInfo = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8927474f/backfill-delivery-info`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
        }
      );

      const data = await response.json();
      
      if (data.success) {
        toast.success('Address restored from last order!');
        // Reload profile to show the backfilled data
        window.location.reload();
      } else {
        if (data.error.includes('No orders')) {
          toast.error('No previous orders with address found');
        } else {
          toast.error(data.error || 'Failed to restore address');
        }
      }
    } catch (error) {
      console.error('Error backfilling delivery info:', error);
      toast.error('Failed to restore address');
    }
  };

  const handleSaveProfile = async () => {
    try {
      setIsSavingProfile(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8927474f/user/profile`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            firstName,
            lastName,
            phone,
            address,
            apartment,
            city,
            state,
            pinCode,
            country,
            gstNumber,
          }),
        }
      );

      const data = await response.json();
      
      if (data.success) {
        toast.success('Profile updated successfully');
      } else {
        toast.error(data.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Filter, sort, and paginate orders
  const filteredAndSortedOrders = (() => {
    let result = [...orders];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(order =>
        order.orderNumber.toLowerCase().includes(query) ||
        order.material.toLowerCase().includes(query) ||
        order.status.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(order => order.status === statusFilter);
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime();
      } else if (sortBy === 'total') {
        comparison = a.total - b.total;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  })();

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedOrders.length / itemsPerPage);
  const paginatedOrders = filteredAndSortedOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, sortBy, sortOrder]);

  const handleSortToggle = (field: 'date' | 'total') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={onBack}
            className="text-gray-400 hover:text-gray-200 mb-4"
          >
             Back to Home
          </Button>
          <h1 className="text-white mb-2">My Dashboard</h1>
          <p className="text-gray-400">
            Manage your orders and account information
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-gray-800">
          <button
            onClick={() => setActiveTab('orders')}
            className={`pb-4 px-2 font-medium transition-colors relative ${
              activeTab === 'orders'
                ? 'text-blue-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              My Orders
            </div>
            {activeTab === 'orders' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-4 px-2 font-medium transition-colors relative ${
              activeTab === 'profile'
                ? 'text-blue-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Profile Settings
            </div>
            {activeTab === 'profile' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />
            )}
          </button>
          {isAffiliate && (
            <button
              onClick={() => setActiveTab('affiliate')}
              className={`pb-4 px-2 font-medium transition-colors relative ${
                activeTab === 'affiliate'
                  ? 'text-blue-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4" />
                Affiliate Program
              </div>
              {activeTab === 'affiliate' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />
              )}
            </button>
          )}
        </div>

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            {/* Filter and Sort Controls */}
            {!isLoadingOrders && orders.length > 0 && (
              <Card className="p-4 bg-[#252525] border-0">
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Search */}
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by order number, material, or status..."
                        className="pl-10 bg-[#1a1a1a] border-gray-700 text-gray-200"
                      />
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div className="w-full md:w-48">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="bg-[#1a1a1a] border-gray-700 text-gray-200">
                        <div className="flex items-center gap-2">
                          <Filter className="w-4 h-4" />
                          <SelectValue />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="bg-[#252525] border-gray-700">
                        <SelectItem value="all">All Orders</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="in-transit">In Transit</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sort Controls */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleSortToggle('date')}
                      variant="outline"
                      size="sm"
                      className={`border-gray-700 ${
                        sortBy === 'date' ? 'bg-blue-950 text-blue-400 border-blue-800' : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Date
                      {sortBy === 'date' && (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 ml-2" /> : <ArrowDown className="w-3 h-3 ml-2" />
                      )}
                    </Button>
                    <Button
                      onClick={() => handleSortToggle('total')}
                      variant="outline"
                      size="sm"
                      className={`border-gray-700 ${
                        sortBy === 'total' ? 'bg-blue-950 text-blue-400 border-blue-800' : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      <IndianRupee className="w-4 h-4 mr-2" />
                      Amount
                      {sortBy === 'total' && (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 ml-2" /> : <ArrowDown className="w-3 h-3 ml-2" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Results Count */}
                {(searchQuery || statusFilter !== 'all') && (
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <p className="text-gray-400">
                      Showing {filteredAndSortedOrders.length} of {orders.length} orders
                    </p>
                    {(searchQuery || statusFilter !== 'all') && (
                      <Button
                        onClick={() => {
                          setSearchQuery('');
                          setStatusFilter('all');
                        }}
                        variant="ghost"
                        size="sm"
                        className="text-blue-400 hover:text-blue-300"
                      >
                        Clear Filters
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            )}

            {/* Refresh Button */}
            <div className="flex justify-end">
              <Button
                onClick={fetchOrders}
                disabled={isLoadingOrders}
                variant="outline"
                size="sm"
                className="border-gray-700 text-gray-400 hover:text-gray-200"
              >
                {isLoadingOrders ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <Package className="w-4 h-4 mr-2" />
                    Refresh Orders
                  </>
                )}
              </Button>
            </div>

            {isLoadingOrders ? (
              <Card className="p-12 bg-[#252525] border-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </Card>
            ) : orders.length === 0 ? (
              <Card className="p-12 bg-[#252525] border-0 text-center">
                <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-gray-200 mb-2">No orders yet</h3>
                <p className="text-gray-400 mb-6">
                  Start by uploading your first design
                </p>
                <Button onClick={onBack} className="bg-blue-600 hover:bg-blue-700">
                  Create Your First Order
                </Button>
              </Card>
            ) : filteredAndSortedOrders.length === 0 ? (
              <Card className="p-12 bg-[#252525] border-0 text-center">
                <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-gray-200 mb-2">No orders found</h3>
                <p className="text-gray-400 mb-6">
                  No orders match your current filters
                </p>
                <Button 
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                  variant="outline"
                  className="border-gray-700 text-gray-400 hover:text-gray-200"
                >
                  Clear All Filters
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Desktop View */}
                <div className="hidden md:block">
                  <Card className="bg-[#252525] border-0 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-800">
                            <th className="text-left p-4 text-gray-400 font-medium">
                              Order Number
                            </th>
                            <th className="text-left p-4 text-gray-400 font-medium">
                              Date
                            </th>
                            <th className="text-left p-4 text-gray-400 font-medium">
                              Status
                            </th>
                            <th className="text-left p-4 text-gray-400 font-medium">
                              Total
                            </th>
                            <th className="text-left p-4 text-gray-400 font-medium">
                              Points Used
                            </th>
                            <th className="text-left p-4 text-gray-400 font-medium">
                              Details
                            </th>
                            <th className="text-right p-4 text-gray-400 font-medium">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedOrders.map((order) => {
                            const statusConfig = STATUS_CONFIG[order.status];

                            return (
                              <OrderRow
                                key={order.id}
                                order={order}
                                formatDate={formatDate}
                                statusConfig={statusConfig}
                                onReorder={onReorderFile}
                              />
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>

                {/* Mobile View */}
                <div className="md:hidden space-y-4">
                  {paginatedOrders.map((order) => {
                    const statusConfig = STATUS_CONFIG[order.status];

                    return (
                      <MobileOrderCard
                        key={order.id}
                        order={order}
                        formatDate={formatDate}
                        statusConfig={statusConfig}
                        onReorder={onReorderFile}
                      />
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-between items-center mt-4">
                    <Button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      variant="outline"
                      size="sm"
                      className="border-gray-700 text-gray-400 hover:text-gray-200"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    <div className="text-gray-400">
                      Page {currentPage} of {totalPages}
                    </div>
                    <Button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      variant="outline"
                      size="sm"
                      className="border-gray-700 text-gray-400 hover:text-gray-200"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="max-w-3xl">
            {isLoadingProfile ? (
              <Card className="p-12 bg-[#252525] border-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Loyalty Points */}
                <Card className="p-6 bg-gradient-to-br from-emerald-600 to-emerald-500 border-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-white/20 rounded-lg flex items-center justify-center">
                        <Gift className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <div className="text-4xl text-white mb-1">
                          {userPoints.toLocaleString()}
                        </div>
                        <div className="text-sm text-emerald-100">Loyalty Points Available</div>
                        <p className="text-xs text-emerald-100 mt-1">1 Point = ₹1 | Earn 1 point for every ₹100 spent</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl text-white">₹{userPoints.toLocaleString()}</div>
                      <div className="text-xs text-emerald-100">Reward Value</div>
                    </div>
                  </div>
                </Card>

                {/* Contact Information */}
                <Card className="p-6 bg-[#252525] border-0">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-blue-950 rounded-lg flex items-center justify-center">
                      <Mail className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-gray-200">Contact Information</h3>
                      <p className="text-gray-400 text-sm">
                        Your email and contact details
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-gray-400 mb-2">Email</Label>
                      <Input
                        type="email"
                        value={email}
                        disabled
                        className="bg-[#1a1a1a] border-gray-700 text-gray-400"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Email cannot be changed
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-400 mb-2">First Name</Label>
                        <Input
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="First name"
                          className="bg-[#1a1a1a] border-gray-700 text-gray-200"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-400 mb-2">Last Name</Label>
                        <Input
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Last name"
                          className="bg-[#1a1a1a] border-gray-700 text-gray-200"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-gray-400 mb-2">Phone Number</Label>
                      <Input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Phone number"
                        className="bg-[#1a1a1a] border-gray-700 text-gray-200"
                      />
                    </div>
                  </div>
                </Card>

                {/* Delivery Address */}
                <Card className="p-6 bg-[#252525] border-0">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-blue-950 rounded-lg flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-gray-200">Delivery Address</h3>
                      <p className="text-gray-400 text-sm">
                        Default shipping address for orders
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-gray-400 mb-2">Country</Label>
                      <Select value={country} onValueChange={setCountry}>
                        <SelectTrigger className="bg-[#1a1a1a] border-gray-700 text-gray-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#252525] border-gray-700">
                          <SelectItem value="India">India</SelectItem>
                          <SelectItem value="USA">United States</SelectItem>
                          <SelectItem value="UK">United Kingdom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-gray-400 mb-2">Address</Label>
                      <Input
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Street address"
                        className="bg-[#1a1a1a] border-gray-700 text-gray-200"
                      />
                    </div>

                    <div>
                      <Label className="text-gray-400 mb-2">
                        Apartment, Suite, etc. (Optional)
                      </Label>
                      <Input
                        value={apartment}
                        onChange={(e) => setApartment(e.target.value)}
                        placeholder="Apartment, suite, etc."
                        className="bg-[#1a1a1a] border-gray-700 text-gray-200"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-gray-400 mb-2">City</Label>
                        <Input
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="City"
                          className="bg-[#1a1a1a] border-gray-700 text-gray-200"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-400 mb-2">State</Label>
                        <Select value={state} onValueChange={setState}>
                          <SelectTrigger className="bg-[#1a1a1a] border-gray-700 text-gray-200">
                            <SelectValue placeholder="State" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#252525] border-gray-700 max-h-60">
                            {INDIAN_STATES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-gray-400 mb-2">PIN Code</Label>
                        <Input
                          value={pinCode}
                          onChange={(e) => setPinCode(e.target.value)}
                          placeholder="PIN"
                          className="bg-[#1a1a1a] border-gray-700 text-gray-200"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-gray-400 mb-2">
                        GST Number (Optional)
                      </Label>
                      <Input
                        value={gstNumber}
                        onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                        placeholder="GST Number"
                        className="bg-[#1a1a1a] border-gray-700 text-gray-200"
                      />
                    </div>
                  </div>
                </Card>

                {/* Info Banner - Restore from Last Order */}
                {!address && orders.length > 0 && (
                  <Card className="bg-blue-950/30 border-blue-800/50 p-4">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-blue-200 mb-2">
                          No address saved yet? You can restore your address from your last order.
                        </p>
                        <Button
                          onClick={handleBackfillDeliveryInfo}
                          variant="outline"
                          size="sm"
                          className="border-blue-700 text-blue-300 hover:bg-blue-900/50"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Restore from Last Order
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Save Button */}
                <div className="flex gap-4">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile}
                    className="bg-blue-600 hover:bg-blue-700 flex-1"
                  >
                    {isSavingProfile ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={onBack}
                    className="border-gray-700 text-gray-400 hover:text-gray-200"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Affiliate Tab */}
        {activeTab === 'affiliate' && (
          <div className="max-w-3xl">
            <AffiliatePanel />
          </div>
        )}
      </div>
    </div>
  );
}
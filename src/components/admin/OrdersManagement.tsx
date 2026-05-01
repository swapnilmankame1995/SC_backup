/**
 * Orders Management Component (Admin Panel)
 * 
 * Comprehensive order management interface for administrators with:
 * - Order listing with pagination (25 per page)
 * - Batch order grouping (multiple items in single checkout)
 * - Real-time search across order number, customer name, email
 * - Order status management (payment, fulfillment, delivery)
 * - Invoice generation and download
 * - File download (DXF/sketch files)
 * - Tracking URL management
 * - Order deletion with confirmation
 * - Expandable batch details
 * - Weight calculation for shipping
 * 
 * Features:
 * 1. **Batch Grouping**: Orders from same checkout are grouped together
 * 2. **Status Badges**: Color-coded visual status indicators
 * 3. **Search**: Debounced search (300ms) with auto-reset to page 1
 * 4. **Pagination**: Server-side pagination for performance
 * 5. **Invoice Download**: One-click PDF invoice generation
 * 6. **Inline Editing**: Update statuses without full modal
 * 7. **Order Details Modal**: Complete order information + edit capabilities
 * 
 * Business Logic:
 * - Payment Status: pending → paid → refunded
 * - Fulfillment: pending → processing → completed → cancelled
 * - Delivery: pending → shipped → delivered → failed
 * - Batch Detection: Auto-groups by batchId or inferred from order ID pattern
 * 
 * @component
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Download, Eye, Loader2, ChevronDown, ChevronUp, File, Package, Trash2, XCircle, FileText } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { apiCall } from '../../utils/api';
import { useInvoiceDownload } from '../../hooks/useInvoiceDownload';
import { formatDateIST, formatDateTimeIST } from '../../utils/dateFormatter';

/**
 * Order Interface - Complete order data structure
 * 
 * Represents a single order item (can be part of a batch).
 * Contains all customer, product, payment, and shipping information.
 */
interface Order {
  id: string;                              // Unique order ID (format: order:userId:timestamp or order:userId:timestamp-index)
  batchId?: string;                        // Batch identifier for multi-item orders
  orderNumber: string;                     // Human-readable order number (e.g., "SC00123")
  date: string;                            // Order creation timestamp (ISO 8601)
  customerName: string;                    // Full customer name
  customerEmail: string;                   // Customer email
  fileName: string;                        // Original file name
  filePath: string;                        // Supabase storage path
  material: any;                           // Material object with name, category, density
  thickness: number;                       // Thickness in mm
  price: number;                           // Unit price in ₹ (GST-inclusive)
  quantity?: number;                       // Quantity multiplier (1-999)
  paymentStatus: string;                   // Payment state: pending | paid | refunded
  fulfillmentStatus: string;               // Fulfillment state: pending | processing | completed | cancelled
  deliveryStatus: string;                  // Delivery state: pending | shipped | delivered | failed
  destination: string;                     // Shipping destination (city, state)
  trackingUrl?: string;                    // Courier tracking URL
  notes?: string;                          // Customer order notes / special instructions
  isSketchService?: boolean;               // Flag for sketch-to-DXF orders
  sketchFilePaths?: string[];              // Sketch file storage paths
  sketchFileNames?: string[];              // Original sketch file names
  shippingCost?: number;                   // Shipping cost in ₹
  shippingCarrier?: string | null;         // Carrier name (e.g., "Delhivery", "DTDC")
  totalWeight?: number;                    // Total order weight in kg
  discountCode?: string;                   // Discount code applied
  discountAmount?: number;                 // Discount amount in ₹
  pointsUsed?: number;                     // Loyalty points used
  // Payment Transaction Fields (for compliance & accounting)
  paymentId?: string;                      // Transaction ID from payment gateway (Razorpay payment_id, PayU txnid)
  paymentGateway?: string;                 // Payment gateway used: razorpay, payu, cod, bank_transfer
  paymentMethod?: string;                  // Payment method: card, upi, netbanking, wallet, emi, cod
  paymentVerifiedAt?: string;              // Server timestamp when payment was verified (ISO 8601)
  paymentAmount?: number;                  // Actual amount paid through gateway (for reconciliation)
  razorpayOrderId?: string;                // Razorpay order_id (for Razorpay gateway)
  razorpaySignature?: string;              // Razorpay HMAC signature (for audit trail)
  paymentFailedReason?: string;            // Reason for payment failure (if applicable)
  paymentRefundId?: string;                // Refund transaction ID (if refunded)
  paymentRefundedAt?: string;              // Timestamp when refund was processed (ISO 8601)
  paymentMetadata?: any;                   // Additional payment data in JSON format
  color?: string | null;                   // Selected colour for colour-enabled materials (e.g. "Red")
  dxfData?: {
    width: number;
    height: number;
    cuttingLength: number;
  };
  deliveryInfo?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    address?: string;
    apartment?: string;
    city?: string;
    state?: string;
    pinCode?: string;
    phone?: string;
    gstNumber?: string;
    country?: string;
    billingAddressType?: 'same' | 'different';
    billingAddress?: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      address?: string;
      apartment?: string;
      city?: string;
      state?: string;
      pinCode?: string;
    };
  };
}

/**
 * Order Group Interface - Batch order aggregation
 * 
 * Groups multiple orders from the same checkout session.
 * Used for display and batch operations.
 */
interface OrderGroup {
  id: string;                              // Group ID (batchId or single order ID)
  displayId: string;                       // Display order number (e.g., "#SC00123")
  orders: Order[];                         // All orders in this group
  isBatch: boolean;                        // True if multiple items
  totalPrice: number;                      // Total price including shipping (₹)
  // Shared fields from first order
  date: string;                            // Order date
  customerName: string;                    // Customer name
  customerEmail: string;                   // Customer email
  paymentStatus: string;                   // Payment status
  fulfillmentStatus: string;               // Fulfillment status
  deliveryStatus: string;                  // Delivery status
  destination: string;                     // Shipping destination
  notes?: string;                          // Order notes
}

export function OrdersManagement() {
  // ============================================================================
  // WEIGHT CALCULATION HELPER
  // ============================================================================
  
  /**
   * Calculate shipping weight for an order
   * 
   * Priority:
   * 1. Use stored totalWeight if available (new orders)
   * 2. Calculate from dimensions + density (old orders, backward compatibility)
   * 3. Return 0 for sketch services (no physical shipping)
   * 
   * Formula: weight = volume × density × quantity
   * where volume = (width × height × thickness) in m³
   * 
   * @param order - Order to calculate weight for
   * @returns Weight in kg
   * 
   * @example
   * const order = {
   *   dxfData: { width: 500, height: 300, ... },
   *   thickness: 3,
   *   material: { density: 7850 }, // Mild steel
   *   quantity: 2
   * };
   * const weight = calculateOrderWeight(order);
   * // Returns: ~7.07 kg (500mm × 300mm × 3mm × 7850 kg/m³ × 2)
   */
  const calculateOrderWeight = useCallback((order: Order): number => {
    // Priority 1: Use stored weight (new orders have this)
    if (order.totalWeight && order.totalWeight > 0) {
      return order.totalWeight;
    }
    
    // Priority 2: Calculate from dimensions (backward compatibility)
    if (!order.isSketchService && order.dxfData && order.thickness && order.material?.density) {
      const areaM2 = (order.dxfData.width * order.dxfData.height) / (1000 * 1000); // mm² to m²
      const volumeM3 = areaM2 * (order.thickness / 1000);                           // thickness mm to m
      const weightPerPiece = volumeM3 * order.material.density;                     // kg
      return weightPerPiece * (order.quantity || 1);                                // total weight
    }
    
    // Priority 3: No physical item (sketch service)
    return 0;
  }, []);

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [orders, setOrders] = useState<Order[]>([]);                                // All orders for current page
  const [isLoading, setIsLoading] = useState(true);                                 // Loading state for data fetch
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);           // Order for detail modal
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);                        // Detail modal visibility
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set()); // Expanded batch groups
  const [pendingChanges, setPendingChanges] = useState<Record<string, any>>({});    // Unsaved changes in modal
  const [isSaving, setIsSaving] = useState(false);                                  // Saving state for updates
  const { downloadInvoice, isGenerating } = useInvoiceDownload();                   // Invoice download hook
  
  // ============================================================================
  // PAGINATION STATE
  // ============================================================================
  
  /**
   * Pagination Configuration
   * 
   * Server-side pagination to handle large order volumes efficiently.
   * 
   * - Items per page: 25 (optimal balance: performance vs scrolling)
   * - Current page: 1-indexed
   * - Total pages: Calculated from total orders
   * - Total orders: Total count across all pages
   * 
   * Why 25 items?
   * - Loads quickly even on slow connections
   * - Fits on most screens without excessive scrolling
   * - Allows batch operations without overwhelming UI
   */
  const [currentPage, setCurrentPage] = useState(1);        // Current page number (1-indexed)
  const [totalPages, setTotalPages] = useState(1);          // Total pages available
  const [totalOrders, setTotalOrders] = useState(0);        // Total order count
  const itemsPerPage = 25;                                  // Orders per page (constant)
  
  // ============================================================================
  // SEARCH STATE
  // ============================================================================
  
  /**
   * Search Configuration
   * 
   * Two-phase search for better UX:
   * 1. searchInput: Immediate input value (no API calls)
   * 2. searchQuery: Debounced value that triggers API call
   * 
   * Debounce delay: 300ms
   * - Prevents API spam while user is typing
   * - Feels instant to users (sub-second)
   * - Balances responsiveness vs server load
   * 
   * Search resets to page 1 automatically (new results)
   * 
   * Searchable fields:
   * - Order number
   * - Customer name
   * - Customer email
   */
  const [searchInput, setSearchInput] = useState('');       // Live input value
  const [searchQuery, setSearchQuery] = useState('');       // Debounced search query

  /**
   * Debounce search input to prevent excessive API calls
   * 
   * Timer resets on every keystroke.
   * Only triggers API call 300ms after user stops typing.
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setCurrentPage(1); // Reset to page 1 on new search
    }, 300); // 300ms debounce

    return () => clearTimeout(timer); // Cleanup timer on unmount or new input
  }, [searchInput]);

  const loadOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
      console.log('🔍 Loading admin orders...');
      const result = await apiCall(`/admin/orders?page=${currentPage}&limit=${itemsPerPage}${searchParam}`, { method: 'GET' });
      console.log('📦 Admin orders API response:', result);
      console.log('📦 Orders array:', result.orders);
      console.log('📦 Orders count:', result.orders?.length);
      console.log('📦 Pagination:', result.pagination);
      setOrders(result.orders || []);
      setTotalPages(result.pagination?.totalPages || 1);
      setTotalOrders(result.pagination?.total || 0);
    } catch (error: any) {
      console.error('Load orders error:', error);
      toast.error('Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchQuery, itemsPerPage]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleSearch = (value: string) => {
    setSearchInput(value);
  };

  // Group orders by batchId
  const groupedOrders = useMemo(() => {
    const groups: Record<string, Order[]> = {};
    
    orders.forEach(order => {
      // Use batchId if available, otherwise use order ID
      // Also consider orders with ID format like "order:userId:timestamp-index" as potential batch
      let groupId = order.batchId;
      
      if (!groupId) {
        // Try to infer batch from ID pattern if batchId is missing
        const idParts = order.id.split(':');
        const lastPart = idParts[idParts.length - 1];
        if (lastPart.includes('-')) {
          // It's likely a batch item "timestamp-index"
          // Use the timestamp part as group ID
          const timestamp = lastPart.split('-')[0];
          groupId = `inferred-batch:${idParts.slice(0, -1).join(':')}:${timestamp}`;
        } else {
          groupId = order.id;
        }
      }
      
      if (!groups[groupId]) {
        groups[groupId] = [];
      }
      groups[groupId].push(order);
    });

    // Convert to array and sort by date
    return Object.entries(groups).map(([groupId, groupOrders]) => {
      const firstOrder = groupOrders[0];
      
      // ✅ CRITICAL FIX: Sum ALL paymentAmounts from all items in the batch (not just first order!)
      // For batch orders, each row has its own proportionally distributed paymentAmount
      const totalPrice = groupOrders.reduce((sum, order) => sum + (order.paymentAmount || 0), 0);
      
      // Use the stored orderNumber from the database
      // All orders in a batch have the same orderNumber, so we just use the first one
      const displayId = `#${firstOrder.orderNumber || 'N/A'}`;

      return {
        id: groupId,
        displayId,
        orders: groupOrders,
        isBatch: groupOrders.length > 1,
        totalPrice,
        date: firstOrder.date,
        customerName: firstOrder.customerName,
        customerEmail: firstOrder.customerEmail,
        paymentStatus: firstOrder.paymentStatus,
        fulfillmentStatus: firstOrder.fulfillmentStatus,
        deliveryStatus: firstOrder.deliveryStatus,
        destination: firstOrder.destination,
        notes: firstOrder.notes
      } as OrderGroup;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [orders]);

  // Use groupedOrders directly since backend handles pagination
  const paginatedGroups = groupedOrders;

  const toggleGroupExpand = useCallback((groupId: string) => {
    setExpandedGroupIds(prevExpanded => {
      const newExpanded = new Set(prevExpanded);
      if (newExpanded.has(groupId)) {
        newExpanded.delete(groupId);
      } else {
        newExpanded.add(groupId);
      }
      return newExpanded;
    });
  }, []);

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setPendingChanges({}); // Clear pending changes when opening a new order
    setIsDetailsOpen(true);
  };

  const handleFieldChange = (field: string, value: any) => {
    setPendingChanges(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const applyChanges = async () => {
    if (!selectedOrder || Object.keys(pendingChanges).length === 0) {
      toast.info('No changes to apply');
      return;
    }

    try {
      setIsSaving(true);
      
      // Find which group this order belongs to
      const group = groupedOrders.find(g => g.orders.some(o => o.id === selectedOrder.id));
      const ordersToUpdate = group ? group.orders : orders.filter(o => o.id === selectedOrder.id);

      // Use bulk update endpoint for better performance
      if (ordersToUpdate.length > 1) {
        const orderIds = ordersToUpdate.map(o => o.id);
        await apiCall('/admin/orders/bulk', {
          method: 'PATCH',
          body: JSON.stringify({
            orderIds,
            updates: pendingChanges
          }),
        });
      } else {
        // Single order update
        await apiCall(`/admin/orders/${ordersToUpdate[0].id}`, {
          method: 'PATCH',
          body: JSON.stringify(pendingChanges),
        });
      }

      toast.success(ordersToUpdate.length > 1 ? 'Batch orders updated successfully' : 'Order updated successfully');
      
      // Update the selected order with the changes
      setSelectedOrder({ ...selectedOrder, ...pendingChanges });
      setPendingChanges({});
      
      // Reload orders without closing dialog
      await loadOrders();
    } catch (error: any) {
      console.error('Update order error:', error);
      toast.error(error.message || 'Failed to update order');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadFile = async (filePath: string, fileName: string) => {
    try {
      // Check if filePath exists
      if (!filePath || filePath.trim() === '') {
        toast.error('No file available for download');
        return;
      }

      toast.info('Downloading file...');
      const result = await apiCall(`/download-file?path=${encodeURIComponent(filePath)}`, { 
        method: 'GET' 
      });
      
      // Fetch the file as a blob
      const response = await fetch(result.url);
      if (!response.ok) {
        throw new Error('Failed to fetch file');
      }
      
      const blob = await response.blob();
      
      // Create a blob URL and trigger download
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      
      toast.success('File downloaded successfully');
    } catch (error: any) {
      console.error('Download file error:', error);
      toast.error('Failed to download file');
    }
  };

  const updateOrderStatus = async (orderId: string, field: string, value: string) => {
    try {
      // Find which group this order belongs to
      // This is important because for batch orders, we want to update ALL items in the batch
      // to keep their statuses in sync.
      const group = groupedOrders.find(g => g.orders.some(o => o.id === orderId));
      const ordersToUpdate = group ? group.orders : orders.filter(o => o.id === orderId);

      // Use bulk update endpoint for better performance
      if (ordersToUpdate.length > 1) {
        const orderIds = ordersToUpdate.map(o => o.id);
        await apiCall('/admin/orders/bulk', {
          method: 'PATCH',
          body: JSON.stringify({
            orderIds,
            updates: { [field]: value }
          }),
        });
      } else {
        // Single order update
        await apiCall(`/admin/orders/${ordersToUpdate[0].id}`, {
          method: 'PATCH',
          body: JSON.stringify({ [field]: value }),
        });
      }

      toast.success(ordersToUpdate.length > 1 ? 'Batch orders updated successfully' : 'Order updated successfully');
      
      // Update the selected order in the dialog
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, [field]: value });
      }
      
      loadOrders();
    } catch (error: any) {
      console.error('Update order error:', error);
      toast.error('Failed to update order');
    }
  };
  
  // Update status for all orders in a group
  const updateGroupStatus = async (group: OrderGroup, field: string, value: string) => {
    try {
      const orderIds = group.orders.map(o => o.id);
      // Use bulk update endpoint for better performance
      await apiCall('/admin/orders/bulk', {
        method: 'PATCH',
        body: JSON.stringify({
          orderIds,
          updates: { [field]: value }
        }),
      });
      
      toast.success('Batch orders updated successfully');
      loadOrders();
    } catch (error: any) {
      console.error('Update group error:', error);
      toast.error('Failed to update some orders');
    }
  };

  const handleDeleteOrder = async (orderOrGroup: Order | OrderGroup) => {
    const isGroup = 'orders' in orderOrGroup;
    const message = isGroup 
      ? `Are you sure you want to delete this entire batch of ${orderOrGroup.orders.length} orders? This cannot be undone.`
      : `Are you sure you want to delete this order? This cannot be undone.`;
      
    if (!window.confirm(message)) return;

    try {
      const ordersToDelete = isGroup ? (orderOrGroup as OrderGroup).orders : [orderOrGroup as Order];
      
      await Promise.all(ordersToDelete.map(order => 
        apiCall(`/admin/orders/${order.id}`, {
          method: 'DELETE'
        })
      ));

      toast.success(isGroup ? 'Batch orders deleted successfully' : 'Order deleted successfully');
      setIsDetailsOpen(false); // Close dialog if open
      loadOrders();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error('Failed to delete order(s)');
    }
  };

  const handleCancelOrder = async (orderOrGroup: Order | OrderGroup) => {
    const isGroup = 'orders' in orderOrGroup;
    const firstOrder = isGroup ? (orderOrGroup as OrderGroup).orders[0] : (orderOrGroup as Order);
    
    // Check if already cancelled
    if (firstOrder.fulfillmentStatus === 'cancelled') {
      toast.error('This order is already cancelled');
      return;
    }

    const message = isGroup 
      ? `Are you sure you want to cancel this entire batch of ${(orderOrGroup as OrderGroup).orders.length} orders? Associated files will be permanently deleted to free up storage space.`
      : `Are you sure you want to cancel this order? The associated file will be permanently deleted to free up storage space.`;
      
    if (!window.confirm(message)) return;

    console.log('🔴 Starting order cancellation...');
    try {
      const ordersToCancel = isGroup ? (orderOrGroup as OrderGroup).orders : [orderOrGroup as Order];
      console.log(`📋 Cancelling ${ordersToCancel.length} order(s)`);
      
      // Cancel all orders in the batch
      await Promise.all(ordersToCancel.map(order => {
        console.log(`📤 Sending cancel request for order: ${order.id}`);
        return apiCall(`/admin/orders/${order.id}/cancel`, {
          method: 'POST'
        });
      }));

      console.log('✅ All orders cancelled successfully');
      toast.success(
        isGroup 
          ? `Batch orders cancelled successfully. ${ordersToCancel.length} files deleted.`
          : 'Order cancelled successfully. File deleted.'
      );
      setIsDetailsOpen(false); // Close dialog if open
      console.log('🔄 Reloading orders...');
      await loadOrders();
      console.log('✅ Orders reloaded');
    } catch (error: any) {
      console.error('❌ Cancel order error:', error);
      toast.error(error.message || 'Failed to cancel order(s)');
    }
  };

  const getStatusColor = useCallback((status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
      case 'completed':
      case 'delivered':
        return 'bg-emerald-950 text-emerald-400 border-emerald-800';
      case 'pending':
      case 'processing':
      case 'in-transit':
        return 'bg-orange-950 text-orange-400 border-orange-800';
      case 'failed':
      case 'cancelled':
        return 'bg-red-950 text-red-400 border-red-800';
      default:
        return 'bg-gray-800 text-gray-400 border-gray-700';
    }
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-white mb-2">Orders Management</h1>
        <p className="text-gray-400">View and manage all customer orders</p>
      </div>

      {/* Search Bar */}
      <div className="flex gap-4">
        <Input
          type="text"
          placeholder="Search by order number, customer name, or phone..."
          value={searchInput}
          onChange={(e) => handleSearch(e.target.value)}
          className="max-w-md bg-[#0a0a0a] border-gray-700 text-white placeholder:text-gray-500"
        />
      </div>

      <Card className="p-6 bg-[#1a1a1a] border-gray-800">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-800 hover:bg-[#2a2a2a]">
                <TableHead className="w-12 text-gray-400"></TableHead>
                <TableHead className="text-gray-400">Order Number</TableHead>
                <TableHead className="text-gray-400">Date</TableHead>
                <TableHead className="text-gray-400">Customer</TableHead>
                <TableHead className="text-gray-400">Total Value</TableHead>
                <TableHead className="text-gray-400">Payment</TableHead>
                <TableHead className="text-gray-400">Fulfillment</TableHead>
                <TableHead className="text-gray-400">Delivery</TableHead>
                <TableHead className="text-gray-400">Destination</TableHead>
                <TableHead className="text-right text-gray-400">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-64">
                    <div className="flex items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedGroups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-64 text-center text-gray-400">
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedGroups.flatMap((group) => [
                  <TableRow 
                    key={group.id}
                    className={`border-gray-800 hover:bg-[#2a2a2a] cursor-pointer ${expandedGroupIds.has(group.id) ? 'bg-[#222]' : ''} ${group.fulfillmentStatus === 'cancelled' ? 'opacity-50 bg-gray-900/50' : ''}`}
                    onClick={() => toggleGroupExpand(group.id)}
                  >
                    <TableCell>
                      {group.isBatch ? (
                        expandedGroupIds.has(group.id) ? 
                          <ChevronUp className="w-4 h-4 text-gray-500" /> : 
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <div className="w-4" /> // Spacer
                      )}
                    </TableCell>
                    <TableCell className="text-white font-mono text-sm">
                      <div className="flex items-center gap-2">
                        {group.displayId}
                        {group.isBatch && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-5 border-blue-900 text-blue-400 bg-blue-950/30">
                            {group.orders.length} Items
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {formatDateIST(group.date)}
                    </TableCell>
                    <TableCell className="text-gray-300">
                      <div>{group.customerName || group.customerEmail}</div>
                      <div className="text-xs text-gray-500">{group.customerEmail}</div>
                    </TableCell>
                    <TableCell className="text-white">₹{group.totalPrice.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(group.paymentStatus || 'pending')}>
                        {group.paymentStatus || 'pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(group.fulfillmentStatus || 'pending')}>
                        {group.fulfillmentStatus || 'pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(group.deliveryStatus || 'pending')}>
                        {group.deliveryStatus || 'pending'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {group.destination || 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(group.orders[0]);
                          }}
                        >
                          <Eye className="w-4 h-4 text-blue-500" />
                        </Button>
                        {!group.isBatch && group.fulfillmentStatus !== 'cancelled' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadFile(group.orders[0].filePath, group.orders[0].fileName);
                            }}
                            disabled={!group.orders[0].filePath || group.orders[0].filePath.trim() === ''}
                          >
                            <Download className="w-4 h-4 text-emerald-500" />
                          </Button>
                        )}
                        {group.fulfillmentStatus !== 'cancelled' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelOrder(group);
                            }}
                            className="text-orange-500 hover:text-orange-400 hover:bg-orange-950/30"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteOrder(group);
                          }}
                          className="text-red-500 hover:text-red-400 hover:bg-red-950/30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  ,
                  // Expanded Content (Child Rows)
                  ...(expandedGroupIds.has(group.id) ? [
                    <TableRow key={`${group.id}-expanded`} className="bg-[#111] border-b border-gray-800">
                      <TableCell colSpan={10} className="p-0">
                        <div className="p-4 space-y-3">
                          {/* Group Details Header */}
                          <div className="px-2 pb-2 border-b border-gray-800">
                             <h4 className="text-sm font-medium text-gray-400 mb-2">Order Contents</h4>
                             {group.notes && (
                               <div className="text-sm text-gray-400">
                                 <span className="font-medium text-gray-500">Note:</span>{' '}
                                 <span className="whitespace-pre-wrap break-words">{group.notes}</span>
                               </div>
                             )}
                          </div>
                          
                          {/* Child Items Table */}
                          <div className="rounded-md border border-gray-800 bg-[#1a1a1a]">
                            <Table>
                              <TableHeader>
                                <TableRow className="border-gray-800 bg-[#222] hover:bg-[#222]">
                                  <TableHead className="text-xs text-gray-500 h-9">File Name</TableHead>
                                  <TableHead className="text-xs text-gray-500 h-9">Material</TableHead>
                                  <TableHead className="text-xs text-gray-500 h-9">Thickness</TableHead>
                                  <TableHead className="text-xs text-gray-500 h-9 text-center">Quantity</TableHead>
                                  <TableHead className="text-xs text-gray-500 h-9 text-right">Weight</TableHead>
                                  <TableHead className="text-xs text-gray-500 h-9 text-right">Price</TableHead>
                                  <TableHead className="text-xs text-gray-500 h-9 text-right">Download</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {group.orders.flatMap((order) => [
                                    <TableRow key={order.id} className="border-gray-800 hover:bg-[#252525]">
                                      <TableCell className="text-gray-300 py-2 text-sm">
                                        <div className="flex items-center gap-2">
                                          <File className="w-3 h-3 text-blue-500" />
                                          {order.fileName}
                                          {order.isSketchService && (
                                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-purple-900 text-purple-400 bg-purple-950/30">
                                              Sketch Service
                                            </Badge>
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-gray-400 py-2 text-sm">
                                        <div>{order.material?.name || '—'}</div>
                                        {order.color && (
                                          <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className="inline-block w-2 h-2 rounded-full border border-white/20 bg-gray-500 flex-shrink-0" />
                                            <span className="text-gray-300 text-xs">{order.color}</span>
                                          </div>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-gray-400 py-2 text-sm">{order.thickness ? `${order.thickness} mm` : '—'}</TableCell>
                                      <TableCell className="text-gray-300 py-2 text-sm text-center">
                                        {order.isSketchService ? (
                                          <span className="text-gray-600">—</span>
                                        ) : (
                                          <div className="flex justify-center">
                                            <span className={`px-3 py-1 rounded-md text-base ${
                                              (order.quantity || 1) > 1 
                                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold' 
                                                : 'bg-gray-800/50 text-gray-300 border border-gray-700 font-semibold'
                                            }`}>
                                              {order.quantity || 1}
                                            </span>
                                          </div>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-gray-400 py-2 text-sm text-right">
                                        {(() => {
                                          const weight = calculateOrderWeight(order);
                                          if (order.isSketchService || weight === 0) {
                                            return <span className="text-gray-600">—</span>;
                                          }
                                          return weight < 0.01 
                                            ? `${(weight * 1000).toFixed(0)} g`
                                            : `${weight.toFixed(2)} kg`;
                                        })()}
                                      </TableCell>
                                      <TableCell className="text-gray-300 py-2 text-sm text-right">
                                        {order.isSketchService || !order.quantity || order.quantity === 1 ? (
                                          `₹${order.price.toFixed(2)}`
                                        ) : (
                                          <div className="flex flex-col items-end">
                                            <span>₹{(order.price * order.quantity).toFixed(2)}</span>
                                            <span className="text-xs text-gray-500">₹{order.price.toFixed(2)} × {order.quantity}</span>
                                          </div>
                                        )}
                                      </TableCell>
                                      <TableCell className="py-2 text-right">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0"
                                          onClick={() => handleDownloadFile(order.filePath, order.fileName)}
                                          disabled={!order.filePath || order.filePath.trim() === ''}
                                        >
                                          <Download className="w-3 h-3 text-emerald-500" />
                                        </Button>
                                      </TableCell>
                                    </TableRow>,
                                    // Sketch Files Sub-Rows
                                    ...(order.isSketchService && order.sketchFilePaths && order.sketchFilePaths.length > 0 
                                      ? order.sketchFilePaths.map((filePath, index) => (
                                        <TableRow key={`${order.id}-sketch-${index}`} className="border-gray-800 bg-[#0a0a0a] hover:bg-[#151515]">
                                          <TableCell className="text-gray-400 py-2 text-sm pl-8">
                                            <div className="flex items-center gap-2">
                                              <File className="w-3 h-3 text-purple-500" />
                                              {order.sketchFileNames?.[index] || `Sketch File ${index + 1}`}
                                            </div>
                                          </TableCell>
                                          <TableCell className="text-gray-500 py-2 text-sm text-xs">Customer Sketch</TableCell>
                                          <TableCell className="text-gray-500 py-2 text-sm">—</TableCell>
                                          <TableCell className="text-gray-500 py-2 text-sm text-center">—</TableCell>
                                          <TableCell className="text-gray-500 py-2 text-sm text-right">—</TableCell>
                                          <TableCell className="text-gray-500 py-2 text-sm text-right">—</TableCell>
                                          <TableCell className="py-2 text-right">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-6 w-6 p-0"
                                              onClick={() => handleDownloadFile(filePath, order.sketchFileNames?.[index] || `sketch-${index + 1}`)}
                                            >
                                              <Download className="w-3 h-3 text-purple-500" />
                                            </Button>
                                          </TableCell>
                                        </TableRow>
                                      ))
                                    : [])
                                ])}
                              </TableBody>
                            </Table>
                          </div>
                          
                          {/* Total Order Weight & Shipping Information */}
                          <div className="px-2 pt-2 space-y-2">
                            {/* Total Order Weight */}
                            {(() => {
                              const totalWeight = group.orders.reduce((sum, order) => sum + calculateOrderWeight(order), 0);
                              if (totalWeight > 0) {
                                return (
                                  <div className="flex items-center justify-between text-sm bg-orange-950/10 p-2 rounded border border-orange-900/20">
                                    <div className="flex items-center gap-2 text-orange-400">
                                      <Package className="w-4 h-4" />
                                      <span className="font-medium">Total Order Weight (for shipping)</span>
                                    </div>
                                    <span className="text-orange-300 font-medium">
                                      {totalWeight < 0.01 
                                        ? `${(totalWeight * 1000).toFixed(0)} g`
                                        : `${totalWeight.toFixed(2)} kg`
                                      }
                                    </span>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                            
                            {/* Shipping Cost */}
                            {(group.orders[0]?.shippingCost !== undefined && group.orders[0]?.shippingCost !== null) && (
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2 text-gray-400">
                                  <Package className="w-4 h-4" />
                                  <span>Shipping ({group.orders[0].shippingCarrier || 'Standard Shipping'})</span>
                                </div>
                                {group.orders[0].shippingCost === 0 ? (
                                  <span className="text-green-500 font-medium">Free</span>
                                ) : (
                                  <span className="text-gray-300 font-medium">₹{group.orders[0].shippingCost.toFixed(2)}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ] : [])
                ])
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-800">
            <p className="text-sm text-gray-400">
              Showing {groupedOrders.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0} to {((currentPage - 1) * itemsPerPage) + groupedOrders.length} of {totalOrders} orders
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="border-gray-700 hover:bg-gray-800 text-gray-300"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="border-gray-700 hover:bg-gray-800 text-gray-300"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-6xl bg-[#1a1a1a] border-gray-800 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Order Details</DialogTitle>
            <DialogDescription className="text-gray-400">
              View and update the details of the order.
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (() => {
            // ✅ CRITICAL FIX: Calculate total payment amount for batch orders
            // For batch orders, find all orders in the same batch and sum their paymentAmounts
            const currentGroup = groupedOrders.find(g => g.orders.some(o => o.id === selectedOrder.id));
            const batchOrders = currentGroup ? currentGroup.orders : [selectedOrder];
            const totalPaymentAmount = batchOrders.reduce((sum, order) => sum + (order.paymentAmount || 0), 0);
            
            return (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Order Number</p>
                  <p className="text-white font-mono">#{selectedOrder.id.split(':').pop()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Date</p>
                  <p className="text-white">{formatDateTimeIST(selectedOrder.date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Customer Name</p>
                  <p className="text-white">{selectedOrder.customerName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Email</p>
                  <p className="text-white">{selectedOrder.customerEmail}</p>
                </div>
                
                {/* If viewing a single order from a batch, show just that file info */}
                <div>
                  <p className="text-sm text-gray-400 mb-1">File Name</p>
                  <p className="text-white">{selectedOrder.fileName}</p>
                </div>
                
                {selectedOrder.isSketchService ? (
                  <>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Service Type</p>
                      <p className="text-white">Sketch Service</p>
                    </div>
                    {selectedOrder.sketchFileNames && selectedOrder.sketchFileNames.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Sketch Files</p>
                        <div className="space-y-1">
                          {selectedOrder.sketchFileNames.map((name: string, idx: number) => (
                            <p key={idx} className="text-white text-sm">• {name}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Material</p>
                      <p className="text-white">{selectedOrder.material?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Thickness</p>
                      <p className="text-white">{selectedOrder.thickness ? `${selectedOrder.thickness} mm` : 'N/A'}</p>
                    </div>
                    {selectedOrder.color && (
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Colour</p>
                        <div className="flex items-center gap-2">
                          <span className="inline-block w-3 h-3 rounded-full border border-white/20 flex-shrink-0 bg-gray-500" />
                          <p className="text-white">{selectedOrder.color}</p>
                        </div>
                      </div>
                    )}
                    {/* Weight Information - Use stored totalWeight OR calculate from density */}
                    {!selectedOrder.isSketchService && selectedOrder.dxfData && selectedOrder.thickness && (() => {
                      // Prefer stored totalWeight
                      if (selectedOrder.totalWeight && selectedOrder.totalWeight > 0) {
                        const quantity = selectedOrder.quantity || 1;
                        const weightPerPiece = selectedOrder.totalWeight / quantity;
                        
                        return (
                          <div className="col-span-2 bg-orange-950/20 p-3 rounded border border-orange-900/30">
                            <p className="text-sm text-orange-400 mb-2">Weight Information (Admin Only)</p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-gray-400">Dimensions:</span>
                                <span className="text-white ml-2">{selectedOrder.dxfData.width.toFixed(1)} × {selectedOrder.dxfData.height.toFixed(1)} mm</span>
                              </div>
                              {selectedOrder.material?.density && (
                                <div>
                                  <span className="text-gray-400">Density:</span>
                                  <span className="text-white ml-2">{selectedOrder.material.density} kg/m³</span>
                                </div>
                              )}
                              <div>
                                <span className="text-gray-400">Weight per piece:</span>
                                <span className="text-white ml-2">
                                  {weightPerPiece < 0.01 
                                    ? `${(weightPerPiece * 1000).toFixed(2)} g`
                                    : `${weightPerPiece.toFixed(3)} kg`
                                  }
                                </span>
                              </div>
                              {quantity > 1 && (
                                <div>
                                  <span className="text-gray-400">Total weight ({quantity} pcs):</span>
                                  <span className="text-white ml-2 font-medium">
                                    {selectedOrder.totalWeight < 0.01 
                                      ? `${(selectedOrder.totalWeight * 1000).toFixed(2)} g`
                                      : `${selectedOrder.totalWeight.toFixed(3)} kg`
                                    }
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      
                      // Fallback: Calculate from density if available (legacy orders)
                      if (selectedOrder.material?.density) {
                        const areaM2 = (selectedOrder.dxfData.width * selectedOrder.dxfData.height) / (1000 * 1000);
                        const volumeM3 = areaM2 * (selectedOrder.thickness / 1000);
                        const weightKg = volumeM3 * selectedOrder.material.density;
                        const quantity = selectedOrder.quantity || 1;
                        const totalWeightKg = weightKg * quantity;
                        
                        return (
                          <div className="col-span-2 bg-orange-950/20 p-3 rounded border border-orange-900/30">
                            <p className="text-sm text-orange-400 mb-2">Weight Information (Admin Only)</p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-gray-400">Dimensions:</span>
                                <span className="text-white ml-2">{selectedOrder.dxfData.width.toFixed(1)} × {selectedOrder.dxfData.height.toFixed(1)} mm</span>
                              </div>
                              <div>
                                <span className="text-gray-400">Density:</span>
                                <span className="text-white ml-2">{selectedOrder.material.density} kg/m³</span>
                              </div>
                              <div>
                                <span className="text-gray-400">Weight per piece:</span>
                                <span className="text-white ml-2">
                                  {weightKg < 0.01 
                                    ? `${(weightKg * 1000).toFixed(2)} g`
                                    : `${weightKg.toFixed(3)} kg`
                                  }
                                </span>
                              </div>
                              {quantity > 1 && (
                                <div>
                                  <span className="text-gray-400">Total weight ({quantity} pcs):</span>
                                  <span className="text-white ml-2 font-medium">
                                    {totalWeightKg < 0.01 
                                      ? `${(totalWeightKg * 1000).toFixed(2)} g`
                                      : `${totalWeightKg.toFixed(3)} kg`
                                    }
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      
                      return null;
                    })()}
                  </>
                )}
                
                <div>
                  <p className="text-sm text-gray-400 mb-1">Item Price</p>
                  <p className="text-white">₹{selectedOrder.price.toFixed(2)}</p>
                </div>
              </div>

              <div className="space-y-4 border-t border-gray-800 pt-4">
                <div className="bg-blue-950/20 p-4 rounded border border-blue-900/30 mb-4">
                   <p className="text-xs text-blue-400 mb-2">
                     <Package className="w-3 h-3 inline mr-1" />
                     Note: Updating status here may affect other items in the same batch.
                   </p>
                </div>
              
                <div>
                  <p className="text-sm text-gray-400 mb-2">Payment Status</p>
                  <Select
                    value={pendingChanges.paymentStatus ?? selectedOrder.paymentStatus ?? 'pending'}
                    onValueChange={(value) => handleFieldChange('paymentStatus', value)}
                  >
                    <SelectTrigger className="bg-[#0a0a0a] border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-gray-700">
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                  {pendingChanges.paymentStatus !== undefined && (
                    <p className="text-xs text-orange-400 mt-1">• Unsaved change</p>
                  )}
                </div>

                <div>
                  <p className="text-sm text-gray-400 mb-2">Fulfillment Status</p>
                  <Select
                    value={pendingChanges.fulfillmentStatus ?? selectedOrder.fulfillmentStatus ?? 'pending'}
                    onValueChange={(value) => handleFieldChange('fulfillmentStatus', value)}
                  >
                    <SelectTrigger className="bg-[#0a0a0a] border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-gray-700">
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  {pendingChanges.fulfillmentStatus !== undefined && (
                    <p className="text-xs text-orange-400 mt-1">• Unsaved change</p>
                  )}
                </div>

                <div>
                  <p className="text-sm text-gray-400 mb-2">Delivery Status</p>
                  <Select
                    value={pendingChanges.deliveryStatus ?? selectedOrder.deliveryStatus ?? 'pending'}
                    onValueChange={(value) => handleFieldChange('deliveryStatus', value)}
                  >
                    <SelectTrigger className="bg-[#0a0a0a] border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-gray-700">
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-transit">In Transit</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                    </SelectContent>
                  </Select>
                  {pendingChanges.deliveryStatus !== undefined && (
                    <p className="text-xs text-orange-400 mt-1">• Unsaved change</p>
                  )}
                </div>

                <div>
                  <Label className="text-sm text-gray-400 mb-2">Tracking URL (Optional)</Label>
                  <Input
                    type="url"
                    placeholder="https://tracking.example.com/..."
                    value={pendingChanges.trackingUrl ?? selectedOrder.trackingUrl ?? ''}
                    onChange={(e) => handleFieldChange('trackingUrl', e.target.value)}
                    className="bg-[#0a0a0a] border-gray-700 text-white"
                  />
                  {pendingChanges.trackingUrl !== undefined && (
                    <p className="text-xs text-orange-400 mt-1">• Unsaved change</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Add tracking URL to show "Track Package" button to customers
                  </p>
                </div>
              </div>

              {/* Shipping Information */}
              {(selectedOrder.shippingCost !== undefined && selectedOrder.shippingCost !== null) && (
                <div className="border-t border-gray-800 pt-4">
                  <p className="text-sm text-gray-400 mb-2">Shipping Details</p>
                  <div className="bg-[#0a0a0a] p-4 rounded border border-gray-700">
                    <div className="flex items-center justify-between text-sm">
                      <div className="text-gray-300">
                        Carrier: <span className="text-white">{selectedOrder.shippingCarrier || 'Standard Shipping'}</span>
                      </div>
                      {selectedOrder.shippingCost === 0 ? (
                        <div className="text-green-500 font-medium">Free</div>
                      ) : (
                        <div className="text-white">₹{selectedOrder.shippingCost.toFixed(2)}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {selectedOrder.notes && (
                <div className="border-t border-gray-800 pt-4">
                  <p className="text-sm text-gray-400 mb-2">Customer Notes</p>
                  <div className="bg-[#0a0a0a] p-3 rounded border border-gray-700 text-white">
                    {selectedOrder.notes}
                  </div>
                </div>
              )}

              {selectedOrder.deliveryInfo && (
                <div className="border-t border-gray-800 pt-4">
                  <p className="text-sm text-gray-400 mb-3">Delivery Address</p>
                  <div className="bg-[#0a0a0a] p-4 rounded border border-gray-700 space-y-2">
                    <div className="text-white">
                      {selectedOrder.deliveryInfo.firstName} {selectedOrder.deliveryInfo.lastName}
                    </div>
                    {selectedOrder.deliveryInfo.phone && (
                      <div className="text-gray-300 text-sm">
                        Phone: {selectedOrder.deliveryInfo.phone}
                      </div>
                    )}
                    {selectedOrder.deliveryInfo.email && (
                      <div className="text-gray-300 text-sm">
                        Email: {selectedOrder.deliveryInfo.email}
                      </div>
                    )}
                    <div className="text-gray-300 text-sm">
                      {selectedOrder.deliveryInfo.address}
                      {selectedOrder.deliveryInfo.apartment && `, ${selectedOrder.deliveryInfo.apartment}`}
                    </div>
                    <div className="text-gray-300 text-sm">
                      {selectedOrder.deliveryInfo.city}, {selectedOrder.deliveryInfo.state} {selectedOrder.deliveryInfo.pinCode}
                    </div>
                    {selectedOrder.deliveryInfo.country && (
                      <div className="text-gray-300 text-sm">
                        {selectedOrder.deliveryInfo.country}
                      </div>
                    )}
                    {selectedOrder.deliveryInfo.gstNumber && (
                      <div className="text-gray-300 text-sm mt-2 pt-2 border-t border-gray-700">
                        GST: {selectedOrder.deliveryInfo.gstNumber}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Billing Address - Show if different from delivery address */}
              {selectedOrder.deliveryInfo?.billingAddressType === 'different' && selectedOrder.deliveryInfo?.billingAddress && (
                <div className="border-t border-gray-800 pt-4">
                  <p className="text-sm text-gray-400 mb-3">Billing Address (Separate)</p>
                  <div className="bg-[#0a0a0a] p-4 rounded border border-blue-900/30 space-y-2">
                    <div className="text-white">
                      {selectedOrder.deliveryInfo.billingAddress.firstName} {selectedOrder.deliveryInfo.billingAddress.lastName}
                    </div>
                    {selectedOrder.deliveryInfo.billingAddress.phone && (
                      <div className="text-gray-300 text-sm">
                        Phone: {selectedOrder.deliveryInfo.billingAddress.phone}
                      </div>
                    )}
                    <div className="text-gray-300 text-sm">
                      {selectedOrder.deliveryInfo.billingAddress.address}
                      {selectedOrder.deliveryInfo.billingAddress.apartment && `, ${selectedOrder.deliveryInfo.billingAddress.apartment}`}
                    </div>
                    <div className="text-gray-300 text-sm">
                      {selectedOrder.deliveryInfo.billingAddress.city}, {selectedOrder.deliveryInfo.billingAddress.state} {selectedOrder.deliveryInfo.billingAddress.pinCode}
                    </div>
                  </div>
                </div>
              )}


               {/* Payment Transaction Details */}
              {(selectedOrder.paymentId || selectedOrder.paymentGateway || selectedOrder.paymentMethod) && (
                <div className="border-t border-gray-800 pt-4">
                  <p className="text-sm text-gray-400 mb-3">💳 Payment Transaction Details</p>
                  <div className="bg-[#0a0a0a] p-4 rounded border border-green-900/30 space-y-2">
                    {selectedOrder.paymentId && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Transaction ID:</span>
                        <span className="text-white font-mono text-sm select-all">{selectedOrder.paymentId}</span>
                      </div>
                    )}
                    {selectedOrder.paymentGateway && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Payment Gateway:</span>
                        <span className="text-white text-sm capitalize">{selectedOrder.paymentGateway}</span>
                      </div>
                    )}
                    {selectedOrder.paymentMethod && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Payment Method:</span>
                        <span className="text-white text-sm capitalize">{selectedOrder.paymentMethod}</span>
                      </div>
                    )}
                    {totalPaymentAmount > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Amount Paid:</span>
                        <span className="text-green-400 font-medium">₹{totalPaymentAmount.toFixed(2)}</span>
                      </div>
                    )}
                    {selectedOrder.paymentVerifiedAt && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Verified At:</span>
                        <span className="text-gray-300 text-sm">
                          {formatDateTimeIST(selectedOrder.paymentVerifiedAt)}
                        </span>
                      </div>
                    )}
                    {selectedOrder.razorpayOrderId && (
                      <div className="flex justify-between items-center pt-2 border-t border-gray-700">
                        <span className="text-gray-400 text-sm">Razorpay Order ID:</span>
                        <span className="text-gray-300 font-mono text-sm select-all">{selectedOrder.razorpayOrderId}</span>
                      </div>
                    )}
                    {selectedOrder.paymentStatus && (
                      <div className="flex justify-between items-center pt-2 border-t border-gray-700">
                        <span className="text-gray-400 text-sm">Payment Status:</span>
                        <span className={
                          selectedOrder.paymentStatus === 'paid' ? 'text-green-400 font-medium' :
                          selectedOrder.paymentStatus === 'pending' ? 'text-yellow-400' :
                          selectedOrder.paymentStatus === 'failed' ? 'text-red-400' :
                          'text-gray-400'
                        }>
                          {selectedOrder.paymentStatus.toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap justify-between gap-2 pt-4 border-t border-gray-800">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleDownloadFile(selectedOrder.filePath, selectedOrder.fileName)}
                    disabled={selectedOrder.fulfillmentStatus === 'cancelled'}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download File
                  </Button>
                  {(selectedOrder.paymentStatus === 'paid' || selectedOrder.deliveryStatus === 'paid') && (
                    <Button
                      variant="outline"
                      onClick={() => downloadInvoice(selectedOrder.id)}
                      disabled={isGenerating}
                      className="border-blue-900 text-blue-500 hover:bg-blue-950/30 hover:text-blue-400"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4 mr-2" />
                          Download Invoice
                        </>
                      )}
                    </Button>
                  )}
                  {selectedOrder.fulfillmentStatus !== 'cancelled' && (
                    <Button 
                      variant="outline"
                      onClick={() => handleCancelOrder(selectedOrder)}
                      className="border-orange-900 text-orange-500 hover:bg-orange-950/30 hover:text-orange-400"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancel Order
                    </Button>
                  )}
                  <Button 
                    variant="outline"
                    onClick={() => handleDeleteOrder(selectedOrder)}
                    className="border-red-900 text-red-500 hover:bg-red-950/30 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Order
                  </Button>
                </div>
                
                <div className="flex gap-2">
                  {Object.keys(pendingChanges).length > 0 && (
                    <Button 
                      onClick={applyChanges}
                      disabled={isSaving}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Apply Changes'
                      )}
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>Close</Button>
                </div>
              </div>
            </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
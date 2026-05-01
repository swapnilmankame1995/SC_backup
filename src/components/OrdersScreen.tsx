import React, { useState, useEffect, Fragment } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { apiCall } from '../utils/api';
import { toast } from 'sonner@2.0.3';
import { ArrowLeft, Loader2, ChevronDown, ChevronUp, RotateCcw, FileText } from 'lucide-react';
import { DXFData } from '../utils/dxf-parser';
import { useInvoiceDownload } from '../hooks/useInvoiceDownload';
import { formatDateIST } from '../utils/dateFormatter';

// BUILD TIMESTAMP: 2025-12-05T16:45:00Z - Invoice Feature Release
// Force rebuild - Invoice button should be visible for all orders
interface OrdersScreenProps {
  onBack: () => void;
  onReorder?: (filePath: string, fileName: string, material: string, thickness: number, dxfData: DXFData | null) => void;
}

export function OrdersScreen({ onBack, onReorder }: OrdersScreenProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const { downloadInvoice, isGenerating } = useInvoiceDownload();

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      console.log('🔍 Fetching user orders...');
      const result = await apiCall('/orders', { method: 'GET' });
      console.log('📦 User orders API response:', result);

      if (result.success && result.orders) {
        console.log('📦 Orders array:', result.orders);
        console.log('📦 Orders count:', result.orders.length);
        
        // Debug: Check first order structure
        if (result.orders.length > 0) {
          const firstOrder = result.orders[0];
          console.log('🔍 First order debug:', {
            id: firstOrder.id,
            isBatch: firstOrder.isBatch,
            paymentStatus: firstOrder.paymentStatus,
            orderNumber: firstOrder.orderNumber
          });
          console.log('🔍 isBatch check:', !firstOrder.isBatch, 'vs', firstOrder.isBatch);
        }
        
        setOrders(result.orders);
      } else {
        toast.error('Failed to load orders');
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReorder = (orderItem: any, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row expansion
    
    if (!onReorder) {
      return;
    }
    
    // Only allow reorder for DXF files (not sketch services)
    if (orderItem.isSketchService || orderItem.serviceType === 'sketch') {
      toast.error('Sketch services cannot be reordered. Please create a new sketch order.');
      return;
    }

    if (!orderItem.dxfData) {
      toast.error('Original file data not available for this order');
      return;
    }

    onReorder(orderItem.filePath, orderItem.fileName, orderItem.material, orderItem.thickness, orderItem.dxfData);
  };

  // Helper to check if reorder button should be shown
  const canReorder = (item: any) => {
    const isSketch = item.isSketchService || item.serviceType === 'sketch';
    const hasDxfData = !!item.dxfData;
    const hasEntities = item.dxfData && item.dxfData.entities && item.dxfData.entities.length > 0;
    // Can reorder if: not a sketch service AND has real DXF data (not just empty placeholder)
    return !isSketch && hasDxfData && hasEntities;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-blue-900 mb-2">My Orders</h2>
            <p className="text-gray-600">View and track your laser cutting orders</p>
            {/* Debug: Test button to verify component is loaded */}
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => console.log('🧪 TEST: OrdersScreen component is loaded! v2.0.1')}
            >
              🧪 Test Invoice Feature (v2.0.1)
            </Button>
          </div>
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Upload
          </Button>
        </div>

        {orders.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-gray-500">No orders yet. Start by uploading a DXF file!</p>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Order ID</TableHead>
                  <TableHead>File Name</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Thickness</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <Fragment key={order.id}>
                    {/* Main Order Row */}
                    <TableRow 
                      className={`hover:bg-gray-50 ${order.isBatch ? 'cursor-pointer' : ''}`}
                      onClick={() => order.isBatch && setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                    >
                      <TableCell>
                        {order.isBatch && (
                          expandedOrderId === order.id ? 
                            <ChevronUp className="w-4 h-4 text-gray-500" /> : 
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {order.orderNumber}
                      </TableCell>
                      <TableCell>
                        {order.isBatch ? (
                          <span className="text-blue-600">{order.itemCount} files</span>
                        ) : (
                          order.fileName
                        )}
                      </TableCell>
                      <TableCell>{order.material}</TableCell>
                      <TableCell>{order.thickness > 0 ? `${order.thickness} mm` : '-'}</TableCell>
                      <TableCell className="text-blue-600">₹{order.total.toFixed(2)}</TableCell>
                      <TableCell>
                        <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-sm">
                          {order.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {formatDateIST(order.orderDate)}
                      </TableCell>
                      <TableCell>
                        {!order.isBatch && (
                          <div className="flex gap-1 flex-col">
                            {/* Show invoice download for all orders */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                console.log('💾 Downloading invoice for single order:', order.id);
                                downloadInvoice(order.id);
                              }}
                              className="flex items-center gap-1"
                              disabled={isGenerating}
                            >
                              {isGenerating ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <FileText className="w-3 h-3" />
                                  Invoice
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => handleReorder(order, e)}
                              className="flex items-center gap-1"
                              disabled={!canReorder(order)}
                            >
                              <RotateCcw className="w-3 h-3" />
                              Reorder
                            </Button>
                          </div>
                        )}
                        {order.isBatch && (
                          <div className="flex gap-1 flex-col">
                            {/* Show invoice download for all batch orders - v2.0 */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                console.log('💾 Downloading invoice for batch order:', order.batchId || order.id);
                                downloadInvoice(order.batchId || order.id);
                              }}
                              className="flex items-center gap-1"
                              disabled={isGenerating}
                            >
                              {isGenerating ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <FileText className="w-3 h-3" />
                                  Invoice
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>

                    {/* Expanded Batch Items */}
                    {order.isBatch && expandedOrderId === order.id && order.items && (
                      <TableRow>
                        <TableCell colSpan={9} className="bg-gray-50 border-t-0 p-0">
                          <div className="p-4">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-gray-100">
                                  <TableHead className="text-xs">File Name</TableHead>
                                  <TableHead className="text-xs">Material</TableHead>
                                  <TableHead className="text-xs">Thickness</TableHead>
                                  <TableHead className="text-xs">Price</TableHead>
                                  <TableHead className="text-xs w-32">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {order.items.map((item: any, index: number) => (
                                  <TableRow key={`${order.id}-item-${index}`} className="bg-white">
                                    <TableCell className="text-sm">{item.fileName}</TableCell>
                                    <TableCell className="text-sm">{item.material}</TableCell>
                                    <TableCell className="text-sm">{item.thickness} mm</TableCell>
                                    <TableCell className="text-sm text-blue-600">₹{item.price.toFixed(2)}</TableCell>
                                    <TableCell>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={(e) => handleReorder(item, e)}
                                        className="flex items-center gap-1"
                                        disabled={!canReorder(item)}
                                      >
                                        <RotateCcw className="w-3 h-3" />
                                        Reorder
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
}
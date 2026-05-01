import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import {
  Calendar,
  IndianRupee,
  Truck,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  Download,
  RefreshCw,
} from 'lucide-react';
import { ReorderButton } from './ReorderButton';
import { DXFData } from '../utils/dxf-parser';
import { useInvoiceDownload } from '../hooks/useInvoiceDownload';

interface OrderItem {
  id: string;
  fileName: string;
  material: string;
  thickness: number;
  price: number;
  quantity?: number;
  filePath?: string;
  dxfData?: DXFData | null;
  color?: string | null;
}

interface Order {
  id: string;
  orderNumber: string;
  orderDate: string;
  status: 'pending' | 'processing' | 'in-transit' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus?: 'pending' | 'paid' | 'failed';
  total: number;
  trackingUrl?: string;
  material: string;
  thickness: number;
  quantity?: number;
  fileName?: string;
  filePath?: string;
  dxfData?: DXFData | null;
  isBatch?: boolean;
  itemCount?: number;
  items?: OrderItem[];
  pointsUsed?: number;
  shippingCost?: number;
  shippingCarrier?: string | null;
  color?: string | null;
}

interface MobileOrderCardProps {
  order: Order;
  formatDate: (date: string) => string;
  statusConfig: {
    icon: any;
    color: string;
    bgColor: string;
    borderColor: string;
    label: string;
  };
  onReorder?: (filePath: string, fileName: string, material: string, thickness: number, dxfData: DXFData | null) => void;
}

export function MobileOrderCard({ order, formatDate, statusConfig, onReorder }: MobileOrderCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { downloadInvoice, isGenerating } = useInvoiceDownload();
  const StatusIcon = statusConfig.icon;
  const isBatchOrder = order.isBatch && order.items && order.items.length > 0;

  const handleDownloadInvoice = async (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('💾 MobileOrderCard: Downloading invoice for order:', order.id);
    await downloadInvoice(order.id);
  };

  // Show download invoice button only for paid orders
  const canDownloadInvoice = order.paymentStatus === 'paid';

  return (
    <Card className="p-4 bg-[#252525] border-0">
      <div 
        className="space-y-3 cursor-pointer"
        onClick={() => {
          setIsExpanded(!isExpanded);
        }}
      >
        {/* Order Number & Date */}
        <div className="flex justify-between items-start">
          <div>
            <div className="text-gray-400 text-xs mb-1">
              Order Number
            </div>
            <div className="flex items-center gap-2">
              <div className="text-gray-400">
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
              <div className="text-gray-200 font-mono">
                #{order.orderNumber}
                {order.isBatch && (
                  <span className="ml-2 text-xs bg-blue-950 text-blue-400 px-2 py-0.5 rounded">
                    {order.itemCount} items
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-gray-400 text-xs mb-1">
              Date
            </div>
            <div className="text-gray-200 text-sm">
              {formatDate(order.orderDate)}
            </div>
          </div>
        </div>

        {/* Status */}
        <div>
          <div className="text-gray-400 text-xs mb-1">Status</div>
          <div
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${statusConfig.bgColor} ${statusConfig.borderColor} border`}
          >
            <StatusIcon
              className={`w-4 h-4 ${statusConfig.color}`}
            />
            <span className={`text-sm ${statusConfig.color}`}>
              {statusConfig.label}
            </span>
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-gray-800">
          <div>
            <div className="text-gray-400 text-xs mb-1">
              Material
            </div>
            <div className="text-gray-200 text-sm">
              {order.material}{!order.isBatch && order.thickness > 0 && ` - ${order.thickness}mm`}
            </div>
            {!order.isBatch && order.color && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="inline-block w-2 h-2 rounded-full bg-gray-500 flex-shrink-0" />
                <span className="text-gray-300 text-xs">{order.color}</span>
              </div>
            )}
          </div>
          <div>
            <div className="text-gray-400 text-xs mb-1">
              Points Used
            </div>
            {order.pointsUsed && order.pointsUsed > 0 ? (
              <div className="flex items-center gap-1 text-emerald-400">
                <span className="font-medium text-sm">{order.pointsUsed}</span>
                <span className="text-xs">pts</span>
              </div>
            ) : (
              <span className="text-gray-600 text-sm">—</span>
            )}
          </div>
          <div className="text-right">
            <div className="text-gray-400 text-xs mb-1">
              Total
            </div>
            <div className="flex items-center gap-1 text-gray-200 justify-end">
              <IndianRupee className="w-4 h-4" />
              <span className="text-sm">{order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Track Button */}
        {(order.status === 'shipped' || order.status === 'in-transit' || order.status === 'delivered') && order.trackingUrl && (
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              window.open(order.trackingUrl, '_blank');
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 mt-2"
          >
            <Truck className="w-4 h-4 mr-2" />
            Track Package
            <ExternalLink className="w-3 h-3 ml-2" />
          </Button>
        )}

        {/* Download Invoice Button */}
        {canDownloadInvoice && (
          <Button
            size="sm"
            onClick={handleDownloadInvoice}
            className="w-full bg-green-600 hover:bg-green-700 mt-[-3px] mr-[0px] mb-[0px] ml-[0px]"
            disabled={isGenerating}
          >
            <Download className="w-4 h-4 mr-2" />
            Download Invoice
            {isGenerating && <RefreshCw className="w-4 h-4 ml-2 animate-spin" />}
          </Button>
        )}
      </div>

      {/* Nested Items for Batch Orders */}
      {isExpanded && isBatchOrder && (
        <div className="mt-4 pt-4 border-t border-gray-800">
          <h4 className="text-gray-400 text-xs mb-3">Order Contents</h4>
          <div className="space-y-2">
            {order.items!.map((item, index) => (
              <div
                key={item.id}
                className="p-3 bg-[#1f1f1f] rounded-lg"
              >
                <div className="flex items-start gap-2 mb-2">
                  <FileText className="w-4 h-4 text-blue-400 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-gray-300 text-sm">
                      {item.fileName || `File ${index + 1}`}
                    </div>
                    <div className="text-gray-500 text-xs mt-1">
                      {item.material} {item.thickness > 0 && `• ${item.thickness}mm`}
                      {item.quantity && item.quantity > 1 && (
                        <span className="ml-1 text-blue-400">× {item.quantity}</span>
                      )}
                      {item.color && (
                        <span className="flex items-center gap-1 mt-0.5">
                          <span className="inline-block w-2 h-2 rounded-full bg-gray-500 flex-shrink-0" />
                          <span className="text-gray-400">{item.color}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 text-gray-300 text-sm">
                    <IndianRupee className="w-3 h-3" />
                    {item.quantity && item.quantity > 1 ? (
                      <span className="text-xs">
                        {item.price.toFixed(2)} × {item.quantity} = {(item.price * item.quantity).toFixed(2)}
                      </span>
                    ) : (
                      item.price.toFixed(2)
                    )}
                  </div>
                </div>
                {onReorder && (
                  <div className="mt-2 pt-2 border-t border-gray-800">
                    <ReorderButton
                      filePath={item.filePath}
                      fileName={item.fileName || `File ${index + 1}`}
                      material={item.material}
                      thickness={item.thickness}
                      dxfData={item.dxfData}
                      onReorder={onReorder}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Shipping Information for Batch Orders */}
          {(order.shippingCost !== undefined && order.shippingCost !== null) && (
            <div className="mt-3 p-3 bg-[#1f1f1f] rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-gray-400">
                  <Truck className="w-4 h-4" />
                  <span className="text-xs">Shipping ({order.shippingCarrier || 'Standard Shipping'})</span>
                </div>
                {order.shippingCost === 0 ? (
                  <span className="text-xs text-green-500">Free</span>
                ) : (
                  <div className="flex items-center gap-0.5 text-gray-300">
                    <IndianRupee className="w-3 h-3" />
                    <span className="text-xs">{order.shippingCost.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Single Order Details */}
      {isExpanded && !isBatchOrder && (
        <div className="mt-4 pt-4 border-t border-gray-800">
          <h4 className="text-gray-400 text-xs mb-3">File Details</h4>
          <div className="p-3 bg-[#1f1f1f] rounded-lg">
            <div className="flex items-start gap-2 mb-3">
              <FileText className="w-4 h-4 text-blue-400 mt-0.5" />
              <div className="flex-1">
                <div className="text-gray-300 text-sm mb-2">
                  {order.fileName || 'Uploaded File'}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Material</span>
                    <span className="text-gray-400">{order.material}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Thickness</span>
                    <span className="text-gray-400">{order.thickness > 0 ? `${order.thickness} mm` : '—'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Quantity</span>
                    <span className="text-gray-400">
                      {order.quantity && order.quantity > 1 ? (
                        <span className="text-blue-400">× {order.quantity}</span>
                      ) : (
                        '1'
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Price</span>
                    <div className="flex items-center gap-0.5 text-gray-300">
                      <IndianRupee className="w-3 h-3" />
                      {order.total.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {onReorder && (
              <div className="mt-3 pt-3 border-t border-gray-800">
                <ReorderButton
                  filePath={order.filePath}
                  fileName={order.fileName || 'Uploaded File'}
                  material={order.material}
                  thickness={order.thickness}
                  dxfData={order.dxfData}
                  onReorder={onReorder}
                />
              </div>
            )}
          </div>
          
          {/* Shipping Information for Single Orders */}
          {(order.shippingCost !== undefined && order.shippingCost !== null) && (
            <div className="mt-3 p-3 bg-[#1f1f1f] rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-gray-400">
                  <Truck className="w-4 h-4" />
                  <span className="text-xs">Shipping ({order.shippingCarrier || 'Standard Shipping'})</span>
                </div>
                {order.shippingCost === 0 ? (
                  <span className="text-xs text-green-500">Free</span>
                ) : (
                  <div className="flex items-center gap-0.5 text-gray-300">
                    <IndianRupee className="w-3 h-3" />
                    <span className="text-xs">{order.shippingCost.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
import { useState } from 'react';
import { Button } from './ui/button';
import {
  ExternalLink,
  Truck,
  CheckCircle2,
  Clock,
  Package,
  XCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  RefreshCw,
  AlertCircle,
  Download,
  Calendar,
  IndianRupee,
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

interface OrderRowProps {
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

export function OrderRow({ order, formatDate, statusConfig, onReorder }: OrderRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { downloadInvoice, isGenerating } = useInvoiceDownload();
  const StatusIcon = statusConfig.icon;
  const isBatchOrder = order.isBatch && order.items && order.items.length > 0;
  // All orders are expandable now
  const isExpandable = true;

  const handleDownloadInvoice = async (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('💾 OrderRow: Downloading invoice for order:', order.id);
    await downloadInvoice(order.id);
  };

  // Show download invoice button only for paid orders
  const canDownloadInvoice = order.paymentStatus === 'paid';

  return (
    <>
      {/* Main Order Row */}
      <tr
        onClick={() => {
          setIsExpanded(!isExpanded);
        }}
        className={`border-b border-gray-800 transition-colors cursor-pointer hover:bg-[#2a2a2a] ${
          isExpanded ? 'bg-[#2a2a2a]' : ''
        }`}
      >
        <td className="p-4">
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="text-gray-400 hover:text-gray-200 transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            <div className="text-gray-200 font-mono">
              #{order.orderNumber}
              {order.isBatch && (
                <span className="ml-2 text-xs bg-blue-950 text-blue-400 px-2 py-0.5 rounded">
                  {order.itemCount} items
                </span>
              )}
            </div>
          </div>
        </td>
        <td className="p-4">
          <div className="flex items-center gap-2 text-gray-400">
            <Calendar className="w-4 h-4" />
            {formatDate(order.orderDate)}
          </div>
        </td>
        <td className="p-4">
          <div
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${statusConfig.bgColor} ${statusConfig.borderColor} border`}
          >
            <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
            <span className={`text-sm ${statusConfig.color}`}>
              {statusConfig.label}
            </span>
          </div>
        </td>
        <td className="p-4">
          <div className="flex items-center gap-1 text-gray-200">
            <IndianRupee className="w-4 h-4" />
            {order.total.toFixed(2)}
          </div>
        </td>
        <td className="p-4">
          <div className="text-gray-400 text-sm">
            {order.pointsUsed && order.pointsUsed > 0 ? (
              <div className="flex items-center gap-1 text-emerald-400">
                <span className="font-medium">{order.pointsUsed}</span>
                <span className="text-xs">pts</span>
              </div>
            ) : (
              <span className="text-gray-600">—</span>
            )}
          </div>
        </td>
        <td className="p-4">
          <div className="text-gray-400 text-sm">
            <div>{order.material}</div>
            {!order.isBatch && order.thickness > 0 && <div>{order.thickness}mm</div>}
            {!order.isBatch && order.color && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-block w-2 h-2 rounded-full bg-gray-500 flex-shrink-0" />
                <span className="text-gray-300 text-xs">{order.color}</span>
              </div>
            )}
          </div>
        </td>
        <td className="p-4 text-right">
          <div className="flex flex-col gap-2 items-end">
            {(order.status === 'shipped' || order.status === 'in-transit' || order.status === 'delivered') &&
              order.trackingUrl && (
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(order.trackingUrl, '_blank');
                  }}
                  className="bg-blue-600 hover:bg-blue-700 h-8 px-3 text-xs whitespace-nowrap min-w-[160px]"
                >
                  <Truck className="w-3 h-3 mr-1.5" />
                  Track Package
                  <ExternalLink className="w-3 h-3 ml-1.5" />
                </Button>
              )}
            {canDownloadInvoice && (
              <Button
                size="sm"
                onClick={handleDownloadInvoice}
                className="bg-green-600 hover:bg-green-700 h-8 px-3 text-xs whitespace-nowrap min-w-[160px]"
                disabled={isGenerating}
              >
                <Download className="w-3 h-3 mr-1.5" />
                Download Invoice
                {isGenerating && <RefreshCw className="w-3 h-3 ml-1.5 animate-spin" />}
              </Button>
            )}
          </div>
        </td>
      </tr>

      {/* Nested Items Row */}
      {isExpanded && isBatchOrder && (
        <tr className="bg-[#1f1f1f]">
          <td colSpan={7} className="p-0">
            <div className="p-6">
              <h4 className="text-gray-400 text-sm mb-3">Order Contents</h4>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left p-3 text-gray-500 text-xs font-medium">
                        File Name
                      </th>
                      <th className="text-left p-3 text-gray-500 text-xs font-medium">
                        Material
                      </th>
                      <th className="text-left p-3 text-gray-500 text-xs font-medium">
                        Thickness
                      </th>
                      <th className="text-left p-3 text-gray-500 text-xs font-medium">
                        Qty
                      </th>
                      <th className="text-right p-3 text-gray-500 text-xs font-medium">
                        Price
                      </th>
                      <th className="text-right p-3 text-gray-500 text-xs font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, index) => (
                      <tr
                        key={item.id}
                        className="border-b border-gray-800 last:border-0"
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2 text-gray-300 text-sm">
                            <FileText className="w-4 h-4 text-blue-400" />
                            {item.fileName || `File ${index + 1}`}
                          </div>
                        </td>
                        <td className="p-3 text-gray-400 text-sm">
                          {item.material}
                          {item.color && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="inline-block w-2 h-2 rounded-full bg-gray-500 flex-shrink-0" />
                              <span className="text-gray-300 text-xs">{item.color}</span>
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-gray-400 text-sm">
                          {item.thickness > 0 ? `${item.thickness} mm` : '—'}
                        </td>
                        <td className="p-3 text-gray-400 text-sm">
                          {item.quantity && item.quantity > 1 ? (
                            <span className="text-blue-400">× {item.quantity}</span>
                          ) : (
                            <span className="text-gray-600">1</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1 text-gray-300 text-sm">
                            <IndianRupee className="w-3 h-3" />
                            {item.quantity && item.quantity > 1 ? (
                              <>
                                <span className="text-xs text-gray-500">{item.price.toFixed(2)} × {item.quantity} = </span>
                                {(item.price * item.quantity).toFixed(2)}
                              </>
                            ) : (
                              item.price.toFixed(2)
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          {onReorder && (
                            <ReorderButton
                              filePath={item.filePath}
                              fileName={item.fileName || `File ${index + 1}`}
                              material={item.material}
                              thickness={item.thickness}
                              dxfData={item.dxfData}
                              onReorder={onReorder}
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Shipping row - show if shipping cost is defined (including 0 for free shipping) */}
              {(order.shippingCost !== undefined && order.shippingCost !== null) && (
                <div className="mt-4 bg-[#252525] rounded-lg p-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Truck className="w-4 h-4" />
                      <span>Shipping ({order.shippingCarrier || 'Standard Shipping'})</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-300">
                      {order.shippingCost === 0 ? (
                        <span className="text-green-500">Free</span>
                      ) : (
                        <>
                          <IndianRupee className="w-3 h-3" />
                          {order.shippingCost.toFixed(2)}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}

      {/* Single Order Details Row */}
      {isExpanded && !isBatchOrder && (
        <tr className="bg-[#1f1f1f]">
          <td colSpan={7} className="p-0">
            <div className="p-6">
              <h4 className="text-gray-400 text-sm mb-3">File Details</h4>
              <div className="bg-[#252525] rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <FileText className="w-5 h-5 text-blue-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-gray-300 mb-2">
                        {order.fileName || 'Uploaded File'}
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-gray-500 text-xs mb-1">Material</div>
                          <div className="text-gray-400">{order.material}</div>
                        </div>
                        <div>
                          <div className="text-gray-500 text-xs mb-1">Thickness</div>
                          <div className="text-gray-400">{order.thickness > 0 ? `${order.thickness} mm` : '—'}</div>
                        </div>
                        <div>
                          <div className="text-gray-500 text-xs mb-1">Quantity</div>
                          <div className="text-gray-400">
                            {order.quantity && order.quantity > 1 ? (
                              <span className="text-blue-400">× {order.quantity}</span>
                            ) : (
                              '1'
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500 text-xs mb-1">Price</div>
                          <div className="flex items-center gap-1 text-gray-300">
                            <IndianRupee className="w-3 h-3" />
                            {order.total.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {onReorder && (
                    <div className="flex-shrink-0">
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
              </div>
              
              {/* Shipping row - show if shipping cost is defined (including 0 for free shipping) */}
              {(order.shippingCost !== undefined && order.shippingCost !== null) && (
                <div className="mt-4 bg-[#252525] rounded-lg p-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Truck className="w-4 h-4" />
                      <span>Shipping ({order.shippingCarrier || 'Standard Shipping'})</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-300">
                      {order.shippingCost === 0 ? (
                        <span className="text-green-500">Free</span>
                      ) : (
                        <>
                          <IndianRupee className="w-3 h-3" />
                          {order.shippingCost.toFixed(2)}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
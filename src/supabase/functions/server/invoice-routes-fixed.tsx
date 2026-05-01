import { Hono } from 'npm:hono';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Helper function to verify user
async function verifyUser(request: Request) {
  const accessToken = request.headers.get('Authorization')?.split(' ')[1];
  if (!accessToken) {
    return { user: null, error: 'No access token provided' };
  }
  
  try {
    const userPromise = supabase.auth.getUser(accessToken);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('getUser timeout')), 5000)
    );
    
    const { data: { user }, error } = await Promise.race([userPromise, timeoutPromise]) as any;
    return { user, error };
  } catch (error) {
    console.error('verifyUser error:', error);
    return { user: null, error: error.message || 'Authentication failed' };
  }
}

export function registerInvoiceRoutes(app: Hono) {
  // Company Information Settings
  app.get('/make-server-8927474f/settings/company-info', async (c) => {
    try {
      const companyInfo = await kv.get('company_info') || {
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
      };
      return c.json({ success: true, companyInfo });
    } catch (error: any) {
      console.error('Get company info error:', error);
      return c.json({ success: false, error: error.message }, 400);
    }
  });

  app.post('/make-server-8927474f/settings/company-info', async (c) => {
    try {
      const { user, error } = await verifyUser(c.req.raw);
      if (error || !user) {
        return c.json({ success: false, error: 'Unauthorized' }, 401);
      }

      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      const companyInfo = await c.req.json();
      await kv.set('company_info', companyInfo);
      return c.json({ success: true, companyInfo });
    } catch (error: any) {
      console.error('Update company info error:', error);
      return c.json({ success: false, error: error.message }, 400);
    }
  });

  // Get next invoice number
  app.get('/make-server-8927474f/invoice/next-number', async (c) => {
    try {
      const { user, error } = await verifyUser(c.req.raw);
      if (error || !user) {
        return c.json({ success: false, error: 'Unauthorized' }, 401);
      }

      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      const currentYear = new Date().getFullYear();
      const yearKey = `invoice_counter_${currentYear}`;
      const counter = await kv.get(yearKey) || 0;
      const nextNumber = counter + 1;
      
      const companyInfo = await kv.get('company_info') || { invoicePrefix: 'SC' };
      const invoiceNumber = `${companyInfo.invoicePrefix}-${currentYear}-${String(nextNumber).padStart(4, '0')}`;
      
      return c.json({ success: true, invoiceNumber, nextNumber });
    } catch (error: any) {
      console.error('Get next invoice number error:', error);
      return c.json({ success: false, error: error.message }, 400);
    }
  });

  // Increment invoice counter
  app.post('/make-server-8927474f/invoice/increment', async (c) => {
    try {
      const { user, error } = await verifyUser(c.req.raw);
      if (error || !user) {
        return c.json({ success: false, error: 'Unauthorized' }, 401);
      }

      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      const currentYear = new Date().getFullYear();
      const yearKey = `invoice_counter_${currentYear}`;
      const counter = await kv.get(yearKey) || 0;
      const nextNumber = counter + 1;
      
      await kv.set(yearKey, nextNumber);
      
      const companyInfo = await kv.get('company_info') || { invoicePrefix: 'SC' };
      const invoiceNumber = `${companyInfo.invoicePrefix}-${currentYear}-${String(nextNumber).padStart(4, '0')}`;
      
      return c.json({ success: true, invoiceNumber, nextNumber });
    } catch (error: any) {
      console.error('Increment invoice number error:', error);
      return c.json({ success: false, error: error.message }, 400);
    }
  });

  // Get invoice data for an order (handles batch orders)
  app.get('/make-server-8927474f/orders/:orderId/invoice', async (c) => {
    try {
      const { user, error } = await verifyUser(c.req.raw);
      if (error || !user) {
        return c.json({ success: false, error: 'Unauthorized' }, 401);
      }

      const orderId = c.req.param('orderId');
      console.log('📄 Invoice Request - orderId:', orderId);
      console.log('📄 Invoice Request - user auth ID:', user.id);
      
      // Check if this is a batch ID
      let order;
      let batchOrders = [];
      
      if (orderId.startsWith('batch:')) {
        console.log('🔍 Batch order detected, searching by batch_id:', orderId);
        // This is a batch ID - find all orders with this batchId
        const { data: sqlBatchOrders, error: batchError } = await supabase
          .from('orders')
          .select('*')
          .eq('batch_id', orderId);
        
        console.log('📦 Batch query result:', { count: sqlBatchOrders?.length, error: batchError });
        
        if (batchError || !sqlBatchOrders || sqlBatchOrders.length === 0) {
          console.error('❌ Batch order not found:', { orderId, batchError });
          return c.json({ success: false, error: 'Order not found' }, 404);
        }
        
        // Transform SQL data to expected format
        batchOrders = sqlBatchOrders.map((o: any) => ({
          id: o.id,
          userId: o.user_id,
          batchId: o.batch_id,
          orderNumber: o.order_number,
          material: { id: o.material_id, name: o.material_name },
          thickness: o.thickness,
          quantity: o.quantity,
          price: o.price,
          fileName: o.file_path?.split('/').pop() || 'File',
          filePath: o.file_path,
          shippingCost: o.shipping_cost,
          shippingCarrier: o.shipping_carrier,
          discountCode: o.discount_code,
          discountAmount: o.discount_amount,
          pointsUsed: o.points_used,
          paymentStatus: o.payment_status,
          deliveryStatus: o.delivery_status,
          deliveryInfo: typeof o.delivery_info === 'string' ? JSON.parse(o.delivery_info) : o.delivery_info,
          isSketchService: o.material_id === 'sketch' || o.material_id === 'sketch-service',
          serviceType: o.material_id === 'sketch' || o.material_id === 'sketch-service' ? 'sketch' : 'dxf',
          dxfData: o.dxf_data || {},
          notes: o.notes,
          createdAt: o.created_at,
          // Payment Transaction Fields
          paymentId: o.payment_id,
          paymentGateway: o.payment_gateway,
          paymentMethod: o.payment_method,
          paymentAmount: o.payment_amount,
          paymentVerifiedAt: o.payment_verified_at,
          razorpayOrderId: o.razorpay_order_id,
          razorpaySignature: o.razorpay_signature,
        }));
        
        // Use first order for common data
        order = batchOrders[0];
      } else {
        // This is a single order ID - try by UUID first, then by order_number as fallback
        console.log('🔍 Single order detected, searching by id:', orderId);
        let sqlOrder;
        let orderError;
        
        // Try UUID lookup first
        const uuidResult = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();
        
        sqlOrder = uuidResult.data;
        orderError = uuidResult.error;
        
        // If not found by UUID, try by batch_id (for batch orders with UUID batch IDs)
        if (!sqlOrder || (orderError && orderError.code === 'PGRST116')) {
          console.log('🔍 UUID lookup failed, trying by batch_id:', orderId);
          const batchResult = await supabase
            .from('orders')
            .select('*')
            .eq('batch_id', orderId);
          
          if (batchResult.data && batchResult.data.length > 0) {
            console.log('📦 Found batch order by batch_id, treating as batch');
            // This is actually a batch order - redirect to batch handling
            batchOrders = batchResult.data.map((o: any) => ({
              id: o.id,
              userId: o.user_id,
              batchId: o.batch_id,
              orderNumber: o.order_number,
              material: { id: o.material_id, name: o.material_name },
              thickness: o.thickness,
              quantity: o.quantity,
              price: o.price,
              fileName: o.file_path?.split('/').pop() || 'File',
              filePath: o.file_path,
              shippingCost: o.shipping_cost,
              shippingCarrier: o.shipping_carrier,
              discountCode: o.discount_code,
              discountAmount: o.discount_amount,
              pointsUsed: o.points_used,
              paymentStatus: o.payment_status,
              deliveryStatus: o.delivery_status,
              deliveryInfo: typeof o.delivery_info === 'string' ? JSON.parse(o.delivery_info) : o.delivery_info,
              isSketchService: o.material_id === 'sketch' || o.material_id === 'sketch-service',
              serviceType: o.material_id === 'sketch' || o.material_id === 'sketch-service' ? 'sketch' : 'dxf',
              dxfData: o.dxf_data || {},
              notes: o.notes,
              createdAt: o.created_at,
              // Payment Transaction Fields
              paymentId: o.payment_id,
              paymentGateway: o.payment_gateway,
              paymentMethod: o.payment_method,
              paymentAmount: o.payment_amount,
              paymentVerifiedAt: o.payment_verified_at,
              razorpayOrderId: o.razorpay_order_id,
              razorpaySignature: o.razorpay_signature,
            }));
            order = batchOrders[0];
            // Skip the rest of single order processing
            sqlOrder = { _isBatch: true };
          }
        }
        
        // If not found by batch_id either, try by order_number (for backward compatibility)
        if (!sqlOrder && orderId.startsWith('SC-')) {
          console.log('🔍 Batch lookup failed, trying by order_number:', orderId);
          const orderNumberResult = await supabase
            .from('orders')
            .select('*')
            .eq('order_number', orderId)
            .single();
          
          sqlOrder = orderNumberResult.data;
          orderError = orderNumberResult.error;
        }
        
        console.log('📦 Single order query result:', { 
          found: !!sqlOrder, 
          orderNumber: sqlOrder?.order_number,
          paymentStatus: sqlOrder?.payment_status,
          error: orderError 
        });
        
        // Check if we found it as a batch order before returning error
        if ((orderError || !sqlOrder) && batchOrders.length === 0) {
          console.error('❌ Single order not found:', { orderId, orderError });
          return c.json({ success: false, error: 'Order not found' }, 404);
        }

        // Skip transformation if this was actually a batch order
        if (sqlOrder?._isBatch) {
          // Already transformed above, skip to next section
        } else if (sqlOrder) {
          // Transform SQL data to expected format
          order = {
            id: sqlOrder.id,
            userId: sqlOrder.user_id,
            batchId: sqlOrder.batch_id,
            orderNumber: sqlOrder.order_number,
            material: { id: sqlOrder.material_id, name: sqlOrder.material_name },
            thickness: sqlOrder.thickness,
            quantity: sqlOrder.quantity,
            price: sqlOrder.price,
            fileName: sqlOrder.file_path?.split('/').pop() || 'File',
            filePath: sqlOrder.file_path,
            shippingCost: sqlOrder.shipping_cost,
            shippingCarrier: sqlOrder.shipping_carrier,
            discountCode: sqlOrder.discount_code,
            discountAmount: sqlOrder.discount_amount,
            pointsUsed: sqlOrder.points_used,
            paymentStatus: sqlOrder.payment_status,
            deliveryStatus: sqlOrder.delivery_status,
            deliveryInfo: typeof sqlOrder.delivery_info === 'string' ? JSON.parse(sqlOrder.delivery_info) : sqlOrder.delivery_info,
            isSketchService: sqlOrder.material_id === 'sketch' || sqlOrder.material_id === 'sketch-service',
            serviceType: sqlOrder.material_id === 'sketch' || sqlOrder.material_id === 'sketch-service' ? 'sketch' : 'dxf',
            dxfData: sqlOrder.dxf_data || {},
            notes: sqlOrder.notes,
            createdAt: sqlOrder.created_at,
            // Payment Transaction Fields
            paymentId: sqlOrder.payment_id,
            paymentGateway: sqlOrder.payment_gateway,
            paymentMethod: sqlOrder.payment_method,
            paymentAmount: sqlOrder.payment_amount,
            paymentVerifiedAt: sqlOrder.payment_verified_at,
            razorpayOrderId: sqlOrder.razorpay_order_id,
            razorpaySignature: sqlOrder.razorpay_signature,
          };

          // Get all orders in this batch (if it's a batch order)
          if (order.batchId) {
            const { data: sqlBatchOrders } = await supabase
              .from('orders')
              .select('*')
              .eq('batch_id', order.batchId);
            
            if (sqlBatchOrders && sqlBatchOrders.length > 0) {
              batchOrders = sqlBatchOrders.map((o: any) => ({
                id: o.id,
                userId: o.user_id,
                batchId: o.batch_id,
                orderNumber: o.order_number,
                material: { id: o.material_id, name: o.material_name },
                thickness: o.thickness,
                quantity: o.quantity,
                price: o.price,
                fileName: o.file_path?.split('/').pop() || 'File',
                filePath: o.file_path,
                shippingCost: o.shipping_cost,
                shippingCarrier: o.shipping_carrier,
                discountCode: o.discount_code,
                discountAmount: o.discount_amount,
                pointsUsed: o.points_used,
                paymentStatus: o.payment_status,
                deliveryStatus: o.delivery_status,
                deliveryInfo: typeof o.delivery_info === 'string' ? JSON.parse(o.delivery_info) : o.delivery_info,
                isSketchService: o.material_id === 'sketch' || o.material_id === 'sketch-service',
                serviceType: o.material_id === 'sketch' || o.material_id === 'sketch-service' ? 'sketch' : 'dxf',
                dxfData: o.dxf_data || {},
                notes: o.notes,
                createdAt: o.created_at,
                // Payment Transaction Fields
                paymentId: o.payment_id,
                paymentGateway: o.payment_gateway,
                paymentMethod: o.payment_method,
                paymentAmount: o.payment_amount,
                paymentVerifiedAt: o.payment_verified_at,
                razorpayOrderId: o.razorpay_order_id,
                razorpaySignature: o.razorpay_signature,
              }));
            } else {
              batchOrders = [order];
            }
          } else {
            batchOrders = [order];
          }
        }
      }

      // Check if user owns this order or is admin
      // ✅ CRITICAL FIX: Get user's users.id to compare with order.userId
      const { data: userData } = await supabase
        .from('users')
        .select('id, is_admin')
        .eq('auth_user_id', user.id)
        .single();
      
      const isAdmin = userData?.is_admin || false;
      const userId = userData?.id; // This is the users.id that matches order.userId
      
      if (order.userId !== userId && !isAdmin) {
        console.log(`❌ Invoice authorization failed: order.userId=${order.userId}, user.id=${userId}, isAdmin=${isAdmin}`);
        return c.json({ success: false, error: 'Unauthorized' }, 403);
      }

      // Check if order is paid (invoice only available for paid orders)
      const paymentStatus = order.paymentStatus || order.deliveryStatus;
      if (paymentStatus !== 'paid' && !isAdmin) {
        return c.json({ 
          success: false, 
          error: 'Invoice is only available for paid orders. Please complete payment first.' 
        }, 403);
      }

      // Get company info
      const companyInfo = await kv.get('company_info') || {};
      
      // Get customer info
      const customerData = await kv.get(`user:${order.userId}`) || {};
      
      // Use stored order number from the order
      const orderNumber = order.orderNumber || 'N/A';
      
      // Get or create invoice metadata
      let invoiceData = await kv.get(`invoice:${order.batchId || orderId}`);
      
      // If no invoice exists and order is paid, create one
      if (!invoiceData && (order.paymentStatus === 'paid' || order.deliveryStatus === 'paid')) {
        const currentYear = new Date().getFullYear();
        const yearKey = `invoice_counter_${currentYear}`;
        const counter = await kv.get(yearKey) || 0;
        const nextNumber = counter + 1;
        await kv.set(yearKey, nextNumber);
        
        const invoiceNumber = `${companyInfo.invoicePrefix || 'SC'}-${currentYear}-${String(nextNumber).padStart(4, '0')}`;
        
        invoiceData = {
          invoiceNumber,
          invoiceDate: new Date().toISOString(),
          invoiceStatus: 'generated',
          paymentDueDate: new Date().toISOString(),
          generatedAt: new Date().toISOString(),
          sentToCustomerAt: null,
        };
        
        await kv.set(`invoice:${order.batchId || orderId}`, invoiceData);
      }
      
      // Helper function to reverse-calculate base price from taxed price
      // If price is already taxed at 18%, then: basePrice = taxedPrice / 1.18
      const getBasePrice = (taxedPrice: number, gstRate: number = 0.18) => taxedPrice / (1 + gstRate);
      
      // Build invoice items from all orders in batch
      const items = [];
      let totalItemsSubtotal = 0;
      let totalDiscount = 0;
      let totalGst18 = 0;  // GST @ 18% for laser cutting AND CAD/design services (GST Council 2025/2026)
      let hasSketchService = false;
      let sketchServicePrice = 0;
      
      for (const batchOrder of batchOrders) {
        // Skip sketch service items - they will be added separately
        if (batchOrder.isSketchService || batchOrder.serviceType === 'sketch') {
          hasSketchService = true;
          sketchServicePrice = batchOrder.designServicePrice || batchOrder.price || 150;
          continue;
        }
        
        const taxedPrice = batchOrder.price;
        const basePrice = getBasePrice(taxedPrice, 0.18);
        const quantity = batchOrder.quantity || 1;
        const itemSubtotal = basePrice * quantity;
        
        // ✅ CRITICAL FIX: Use stored discount amount from database (actual amount applied during checkout)
        // Don't recalculate from discount code - this could lead to mismatches
        const itemDiscount = batchOrder.discountAmount || 0;
        
        // Calculate discount percentage for display (if discount was applied)
        let discountPct = 0;
        if (itemDiscount > 0 && itemSubtotal > 0) {
          discountPct = (itemDiscount / itemSubtotal) * 100;
        }
        
        const taxableValue = itemSubtotal - itemDiscount;
        const gstAmount = taxableValue * 0.18;
        const lineTotal = taxableValue + gstAmount;
        
        totalItemsSubtotal += itemSubtotal;
        totalDiscount += itemDiscount;
        totalGst18 += gstAmount;
        
        // Add main item
        items.push({
          quantity,
          description: `Laser Cut Parts - ${batchOrder.fileName || 'Custom Design'}`,
          material: batchOrder.material?.name || 'Unknown Material',
          thickness: batchOrder.thickness || 0,
          laserLength: batchOrder.dxfData?.totalLength || 0,
          unitPrice: basePrice,
          lineSubtotal: itemSubtotal,
          discountPct,
          discountAmount: itemDiscount,
          taxableValue,
          gstAmount,
          gstRate: 18,
          lineTotal,
        });
      }
      
      // Add design service if applicable (18% GST - SAC 998391, updated GST Council 2025/2026)
      if (hasSketchService && sketchServicePrice > 0) {
        const designBase = getBasePrice(sketchServicePrice, 0.18);
        const designTaxable = designBase;
        const designGst = designTaxable * 0.18;
        
        totalItemsSubtotal += designBase;
        totalGst18 += designGst;  // Changed from totalGst12 - now 18% GST
        
        items.push({
          quantity: 1,
          description: 'CAD Design Service (SAC 998391)',
          material: 'N/A',
          thickness: 0,
          laserLength: 0,
          unitPrice: designBase,
          lineSubtotal: designBase,
          discountPct: 0,
          discountAmount: 0,
          taxableValue: designTaxable,
          gstAmount: designGst,
          gstRate: 18,  // Updated from 12 to 18 (GST Council 2025/2026)
          lineTotal: designTaxable + designGst,
        });
      }
      
      // Add shipping (using first order's shipping cost) - 18% GST
      const shippingCost = order.shippingCost || 0;
      if (shippingCost > 0) {
        const shippingBase = getBasePrice(shippingCost, 0.18);
        const shippingTaxable = shippingBase;
        const shippingGst = shippingTaxable * 0.18;
        
        totalItemsSubtotal += shippingBase;
        totalGst18 += shippingGst;
        
        items.push({
          quantity: 1,
          description: `Shipping & Handling${order.shippingCarrier ? ` - ${order.shippingCarrier}` : ' - Standard Shipping'}`,
          material: 'N/A',
          thickness: 0,
          laserLength: 0,
          unitPrice: shippingBase,
          lineSubtotal: shippingBase,
          discountPct: 0,
          discountAmount: 0,
          taxableValue: shippingTaxable,
          gstAmount: shippingGst,
          gstRate: 18,
          lineTotal: shippingTaxable + shippingGst,
        });
      }
      
      // Loyalty points (applied to first item if batch order)
      const loyaltyPointsUsed = order.pointsUsed || 0;
      
      // ✅ CRITICAL FIX: Convert loyalty points from GST-inclusive to ex-GST
      // Loyalty points are stored as the GST-inclusive value (what customer saved)
      // But we need to subtract from ex-GST amount for proper accounting
      // Assuming laser cutting GST rate of 18% (most common case)
      const loyaltyPointsExGST = loyaltyPointsUsed / 1.18;
      
      // Calculate totals
      const subtotal = totalItemsSubtotal;
      const netTaxableValue = subtotal - totalDiscount - loyaltyPointsExGST;
      const totalGst = totalGst18;  // All services now 18% GST
      
      // ✅ CRITICAL FIX: Sum ALL paymentAmounts from all items in the batch (not just first order!)
      // For batch orders, each database row has its own proportionally distributed paymentAmount
      const totalPaymentAmount = batchOrders.reduce((sum, o) => sum + (o.paymentAmount || 0), 0);
      console.log(`📄 Invoice total: totalPaymentAmount=${totalPaymentAmount}, batchOrders.length=${batchOrders.length}, individual amounts:`, batchOrders.map(o => o.paymentAmount));
      
      // If paymentAmount is 0/null (old orders or pending payment), fall back to calculated total
      const calculatedTotal = netTaxableValue + totalGst;
      const totalAmount = totalPaymentAmount || calculatedTotal;
      
      // Get discount code name
      let discountCodeName = '';
      if (order.discountCode) {
        const { data: discount } = await supabase
          .from('discount_codes')
          .select('code')
          .eq('code', order.discountCode)
          .single();
        
        if (discount) {
          discountCodeName = discount.code || order.discountCode;
        }
      }
      
      // Extract customer name from deliveryInfo (firstName + lastName or name field)
      const customerName = customerData.name || 
        (order.deliveryInfo?.firstName && order.deliveryInfo?.lastName 
          ? `${order.deliveryInfo.firstName} ${order.deliveryInfo.lastName}`
          : order.deliveryInfo?.name) || 'Guest Customer';
      
      const customerEmail = customerData.email || order.deliveryInfo?.email || '';
      const customerPhone = customerData.phone || order.deliveryInfo?.phone || '';

      const invoiceResponse = {
        ...invoiceData,
        orderId: order.batchId || orderId,
        orderNumber,
        companyInfo,
        customer: {
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
          billingAddress: order.deliveryAddress || (order.deliveryInfo ? `${order.deliveryInfo.address || ''}, ${order.deliveryInfo.city || ''}, ${order.deliveryInfo.state || ''} ${order.deliveryInfo.pinCode || ''}` : ''),
          shippingAddress: order.deliveryAddress || (order.deliveryInfo ? `${order.deliveryInfo.address || ''}, ${order.deliveryInfo.city || ''}, ${order.deliveryInfo.state || ''} ${order.deliveryInfo.pinCode || ''}` : ''),
          gstin: customerData.gstin || order.deliveryInfo?.gstNumber || '',
        },
        items,
        subtotal,
        totalDiscount,
        loyaltyPointsUsed,
        netTaxableValue,
        totalGst,
        totalGst12: 0,  // No longer used - all services now 18% GST (GST Council 2025/2026)
        totalGst18,
        shippingCost,
        totalAmount,
        paymentStatus: order.paymentStatus || order.deliveryStatus || 'pending',
        discountCode: discountCodeName || null,
        affiliateCode: order.affiliateCode || null,
        notes: order.notes || '',
        // Payment Transaction Details
        paymentTransaction: {
          transactionId: order.paymentId || null,
          gateway: order.paymentGateway || null,
          method: order.paymentMethod || order.paymentGateway || null,
          amount: totalAmount, // ✅ FIX: Use totalAmount (sum of all batch items) instead of first order's paymentAmount
          verifiedAt: order.paymentVerifiedAt ? (order.paymentVerifiedAt.endsWith('Z') ? order.paymentVerifiedAt : order.paymentVerifiedAt + 'Z') : null,
          razorpayOrderId: order.razorpayOrderId || null,
        },
      };
      
      return c.json({ success: true, invoice: invoiceResponse });
    } catch (error: any) {
      console.error('Get invoice error:', error);
      return c.json({ success: false, error: error.message }, 400);
    }
  });

  // Email invoice to customer (same as before, but simplified)
  app.post('/make-server-8927474f/orders/:orderId/invoice/email', async (c) => {
    try {
      const { user, error } = await verifyUser(c.req.raw);
      if (error || !user) {
        return c.json({ success: false, error: 'Unauthorized' }, 401);
      }

      const orderId = c.req.param('orderId');
      const order = await kv.get(orderId);
      
      if (!order) {
        return c.json({ success: false, error: 'Order not found' }, 404);
      }

      // Check if user owns this order or is admin
      const userData = await kv.get(`user:${user.id}`);
      if (order.userId !== user.id && !userData?.isAdmin) {
        return c.json({ success: false, error: 'Unauthorized' }, 403);
      }

      // Get customer email
      const customerData = await kv.get(`user:${order.userId}`) || {};
      const customerEmail = customerData.email || order.customerEmail;
      
      if (!customerEmail) {
        return c.json({ success: false, error: 'Customer email not found' }, 400);
      }

      // Get email settings
      const emailSettings = await kv.get('email_settings');
      if (!emailSettings?.apiKey || !emailSettings?.fromEmail) {
        return c.json({ success: false, error: 'Email not configured. Please configure email settings in admin panel.' }, 400);
      }

      // Fetch invoice data
      const invoiceReq = await fetch(`${c.req.url.split('/orders/')[0]}/orders/${orderId}/invoice`, {
        headers: c.req.raw.headers,
      });
      const { invoice } = await invoiceReq.json();
      
      if (!invoice) {
        return c.json({ success: false, error: 'Failed to generate invoice data' }, 400);
      }

      // Update sent timestamp
      const invoiceKey = `invoice:${order.batchId || orderId}`;
      let invoiceData = await kv.get(invoiceKey);
      if (invoiceData) {
        invoiceData.sentToCustomerAt = new Date().toISOString();
        invoiceData.invoiceStatus = 'sent';
        await kv.set(invoiceKey, invoiceData);
      }

      // Get support settings
      const supportSettings = await kv.get('support_settings') || { whatsappNumber: '918123629917' };
      
      // Build email subject
      const emailSubject = `Your Invoice from Sheetcutters - Order ${invoice.orderNumber}`;
      
      // Simplified email HTML (you can expand this)
      const emailHtml = `
        <p>Dear ${invoice.customer.name},</p>
        <p>Your invoice ${invoice.invoiceNumber} for order ${invoice.orderNumber} is ready.</p>
        <p>Total Amount: ₹${invoice.totalAmount.toFixed(2)}</p>
        <p>Download your invoice from your dashboard or contact us for assistance.</p>
        <p>WhatsApp: +${supportSettings.whatsappNumber}</p>
      `;

      // Send email using Resend
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${emailSettings.apiKey}`,
        },
        body: JSON.stringify({
          from: `Sheetcutters <${emailSettings.fromEmail}>`,
          to: [customerEmail],
          subject: emailSubject,
          html: emailHtml,
        }),
      });

      if (!resendResponse.ok) {
        const errorData = await resendResponse.json();
        console.error('Resend API error:', errorData);
        return c.json({ success: false, error: 'Failed to send email' }, 400);
      }

      return c.json({ 
        success: true, 
        message: `Invoice emailed to ${customerEmail}`,
        sentAt: invoiceData?.sentToCustomerAt,
      });
    } catch (error: any) {
      console.error('Email invoice error:', error);
      return c.json({ success: false, error: error.message }, 400);
    }
  });

  // Batch email invoices (simplified)
  app.post('/make-server-8927474f/orders/batch/invoice/email', async (c) => {
    try {
      const { user, error } = await verifyUser(c.req.raw);
      if (error || !user) {
        return c.json({ success: false, error: 'Unauthorized' }, 401);
      }

      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      const { orderIds } = await c.req.json();
      
      if (!Array.isArray(orderIds) || orderIds.length === 0) {
        return c.json({ success: false, error: 'Order IDs array is required' }, 400);
      }

      const results = {
        success: [] as string[],
        failed: [] as any[],
      };

      for (const orderId of orderIds) {
        try {
          const response = await fetch(`${c.req.url.split('/orders/batch')[0]}/orders/${orderId}/invoice/email`, {
            method: 'POST',
            headers: c.req.raw.headers,
          });
          
          if (response.ok) {
            results.success.push(orderId);
          } else {
            results.failed.push({ orderId, error: 'Failed to send' });
          }
        } catch (err: any) {
          results.failed.push({ orderId, error: err.message });
        }
      }

      return c.json({ 
        success: true, 
        results,
        message: `Sent ${results.success.length} invoices, ${results.failed.length} failed`,
      });
    } catch (error: any) {
      console.error('Batch email invoices error:', error);
      return c.json({ success: false, error: error.message }, 400);
    }
  });
}
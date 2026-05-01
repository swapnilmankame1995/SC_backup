import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';
import nodemailer from 'npm:nodemailer';
import { registerInvoiceRoutes } from './invoice-routes-fixed.tsx';
import {
  sendOrderConfirmationEmail,
  sendOrderStatusUpdateEmail,
  sendAffiliateWelcomeEmail,
  sendAffiliateCommissionEmail,
  sendContactFormEmail,
  sendPasswordResetEmail,
  sendQuoteConfirmationEmail,
  sendOrderCancellationEmail,
  sendEmail,
} from './email-service.tsx';

// Using SQL Tables for all database operations
const USE_SQL_TABLES = true;

const app = new Hono();

app.use('*', cors());
app.use('*', logger(console.log));

// Health check endpoint - no auth required
app.get('/make-server-8927474f/health', (c) => {
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString()
  });
});

// Test Affiliate Welcome Email - for testing email delivery
app.post('/make-server-8927474f/test-affiliate-email', async (c) => {
  try {
    const body = await c.req.json();
    const { email, name } = body;

    if (!email) {
      return c.json({ success: false, error: 'Email is required' }, 400);
    }

    console.log(`🧪 Testing affiliate welcome email to: ${email}`);

    // Send test affiliate welcome email
    await sendAffiliateWelcomeEmail({
      email: email,
      name: name || 'Test Affiliate',
      discountCode: 'TEST10',
      commissionPercentage: 5,
      referralLink: `https://www.sheetcutters.com?ref=TEST10`,
    });

    console.log(`✅ Test affiliate welcome email sent successfully to ${email}`);
    return c.json({ 
      success: true, 
      message: `Test affiliate welcome email sent to ${email}` 
    });
  } catch (error: any) {
    console.error('❌ Failed to send test affiliate email:', error);
    return c.json({ 
      success: false, 
      error: error.message || 'Failed to send test email',
      details: error.toString()
    }, 500);
  }
});

// Sitemap endpoint - for Google Search Console
app.get('/make-server-8927474f/sitemap.xml', (c) => {
  const baseUrl = 'https://sheetcutters.com';
  const currentDate = new Date().toISOString().split('T')[0];
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Homepage -->
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- Services (High Priority) -->
  <url>
    <loc>${baseUrl}/#/laser-cutting</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/#/convert-sketch-to-cad</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  
  <!-- Information Pages -->
  <url>
    <loc>https://legal.sheetcutters.com/#/philosophy</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://legal.sheetcutters.com/#/contact</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://legal.sheetcutters.com/#/testimonials</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://legal.sheetcutters.com/#/privacy</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://legal.sheetcutters.com/#/returns</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://legal.sheetcutters.com/#/shipping</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://legal.sheetcutters.com/#/terms</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://legal.sheetcutters.com/#/affiliate</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
</urlset>`;

  c.header('Content-Type', 'application/xml; charset=utf-8');
  c.header('Cache-Control', 'public, max-age=86400');
  return c.text(sitemap);
});

// Robots.txt endpoint - for search engine crawlers
app.get('/make-server-8927474f/robots.txt', (c) => {
  const robotsTxt = `# Sheetcutters.com - Robots.txt
User-agent: *
Allow: /

# Sitemap location
Sitemap: https://sheetcutters.com/sitemap.xml

# Disallow admin and user-specific pages
Disallow: /admin
Disallow: /dashboard
Disallow: /cart
Disallow: /checkout
Disallow: /orders

# Crawl-delay (optional, helps prevent overload)
Crawl-delay: 1`;

  c.header('Content-Type', 'text/plain; charset=utf-8');
  c.header('Cache-Control', 'public, max-age=86400');
  return c.text(robotsTxt);
});

// Add caching middleware for static responses
app.use('*', async (c, next) => {
  await next();
  
  // Add cache headers based on route type
  const path = c.req.path;
  
  // Materials endpoint - cache for 30 minutes (matches frontend TTL)
  if (path.includes('/materials') && c.req.method === 'GET') {
    c.header('Cache-Control', 'public, max-age=1800'); // 30 minutes
  }
  // No cache for user-specific or write operations
  else if (path.includes('/user/') || c.req.method !== 'GET') {
    c.header('Cache-Control', 'no-store, no-cache, must-revalidate');
  }
  // Default: no cache for safety
  else {
    c.header('Cache-Control', 'no-cache');
  }
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Initialize storage bucket
const bucketName = 'make-8927474f-dxf-files';
const { data: buckets } = await supabase.storage.listBuckets();
const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
if (!bucketExists) {
  await supabase.storage.createBucket(bucketName, { public: false });
}

// Helper function to generate sequential order number
// Format: SC-YYYY-0000001 (7-digit sequence)
// ⚡ NOW ATOMIC: Uses PostgreSQL function to prevent race conditions
async function generateOrderNumber(companyPrefix: string = 'SC'): Promise<string> {
  const currentYear = new Date().getFullYear();
  
  try {
    // ============================================================================
    // PRIMARY METHOD: Atomic PostgreSQL Counter (Thread-Safe)
    // ============================================================================
    // Uses PostgreSQL's increment_order_counter() function with row-level locking
    // This prevents race conditions when multiple orders are placed simultaneously
    // ============================================================================
    
    const { data, error } = await supabase.rpc('increment_order_counter', {
      year_param: currentYear
    });
    
    if (error) {
      console.error('⚠️ PostgreSQL counter failed, falling back to KV store:', error);
      throw error; // Trigger fallback
    }
    
    if (!data && data !== 0) {
      console.error('⚠️ No data returned from increment_order_counter');
      throw new Error('Counter function returned null');
    }
    
    const counterValue = data;
    const orderSequence = counterValue.toString().padStart(7, '0');
    const orderNumber = `${companyPrefix}-${currentYear}-${orderSequence}`;
    
    console.log(`✅ Generated order number via PostgreSQL: ${orderNumber} (counter: ${counterValue})`);
    
    return orderNumber;
    
  } catch (sqlError) {
    // ============================================================================
    // FALLBACK METHOD: KV Store Counter (Legacy, Non-Atomic)
    // ============================================================================
    // Only used if PostgreSQL counter fails (network issues, function errors, etc.)
    // NOTE: This fallback still has the race condition, but ensures system availability
    // ============================================================================
    
    console.warn('⚠️ FALLBACK: Using KV store counter due to SQL error:', sqlError);
    
    const counterKey = `order-counter:${currentYear}`;
    
    // Get current counter for this year
    let counter = await kv.get(counterKey);
    
    if (!counter) {
      // Initialize counter for new year
      counter = { value: 0, year: currentYear };
    }
    
    // Increment counter
    counter.value += 1;
    
    // Save updated counter
    await kv.set(counterKey, counter);
    
    // Format: SC-2026-0000001 (7 digits, zero-padded)
    const orderSequence = counter.value.toString().padStart(7, '0');
    const orderNumber = `${companyPrefix}-${currentYear}-${orderSequence}`;
    
    console.log(`⚠️ Generated order number via KV fallback: ${orderNumber} (counter: ${counter.value})`);
    
    return orderNumber;
  }
}

// Helper function to verify user
async function verifyUser(request: Request) {
  const accessToken = request.headers.get('Authorization')?.split(' ')[1];
  if (!accessToken) {
    return { user: null, error: 'No access token provided' };
  }
  
  try {
    // Increased timeout to 10s for better reliability
    const userPromise = supabase.auth.getUser(accessToken);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('getUser timeout')), 10000)
    );
    
    const { data: { user }, error } = await Promise.race([userPromise, timeoutPromise]) as any;
    return { user, error };
  } catch (error: any) {
    // If timeout, log warning but don't spam console
    if (error.message === 'getUser timeout') {
      console.warn('⚠️ [Auth] Supabase auth timeout (10s) - service may be slow');
    } else {
      console.error('❌ [Supabase] verifyUser error:', error);
    }
    return { user: null, error: error.message || 'Authentication failed' };
  }
}

// Helper function to save/update delivery info (without upsert)
async function saveDeliveryInfo(userId: string | number, deliveryInfo: any): Promise<{ success: boolean; error?: string }> {
  console.log(`🔍 [saveDeliveryInfo] Called with userId: ${userId} (type: ${typeof userId})`);
  try {
    // Check if delivery info already exists
    const { data: existing } = await supabase
      .from('delivery_info')
      .select('id')
      .eq('user_id', userId)
      .single();
    
    const deliveryRecord = {
      user_id: userId,
      first_name: deliveryInfo.firstName,
      last_name: deliveryInfo.lastName,
      phone: deliveryInfo.phone,
      address: deliveryInfo.address,
      apartment: deliveryInfo.apartment,
      city: deliveryInfo.city,
      state: deliveryInfo.state,
      pin_code: deliveryInfo.pinCode,
      country: deliveryInfo.country || 'India',
      gst_number: deliveryInfo.gstNumber,
      updated_at: new Date().toISOString()
    };
    
    if (existing) {
      // Update existing record
      const { error } = await supabase
        .from('delivery_info')
        .update(deliveryRecord)
        .eq('user_id', userId);
      
      if (error) {
        console.error('❌ Failed to update delivery info:', error);
        return { success: false, error: error.message };
      }
    } else {
      // Insert new record
      console.log(`🔍 [saveDeliveryInfo] Inserting new delivery record:`, deliveryRecord);
      const { error } = await supabase
        .from('delivery_info')
        .insert(deliveryRecord);
      
      if (error) {
        console.error('❌ Failed to insert delivery info:', error);
        console.error('❌ Delivery record that failed:', deliveryRecord);
        return { success: false, error: error.message };
      }
    }
    
    // Also update user's phone and name if provided
    if (deliveryInfo.phone || deliveryInfo.firstName || deliveryInfo.lastName) {
      await supabase
        .from('users')
        .update({
          phone: deliveryInfo.phone,
          first_name: deliveryInfo.firstName,
          last_name: deliveryInfo.lastName,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('❌ saveDeliveryInfo error:', error);
    return { success: false, error: error.message };
  }
}

// Telegram notification helper
async function sendTelegramNotification(message: string): Promise<void> {
  try {
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const chatId = Deno.env.get('TELEGRAM_CHAT_ID');
    
    if (!botToken || !chatId) {
      console.error('Telegram credentials not configured');
      return;
    }

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Telegram notification failed:', error);
    } else {
      console.log('✅ Telegram notification sent successfully');
    }
  } catch (error) {
    console.error('Telegram notification error:', error);
  }
}

// User Dashboard Routes
app.get('/make-server-8927474f/user/orders', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    // Get pagination and filter params
    const url = new URL(c.req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const searchQuery = url.searchParams.get('search')?.toLowerCase() || '';
    const statusFilter = url.searchParams.get('status') || 'all';
    const offset = (page - 1) * limit;

    let allOrders: any[] = [];

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      console.log('🔥🔥🔥 USER ORDERS ENDPOINT HIT - SQL MODE - TIMESTAMP:', new Date().toISOString(), '🔥🔥🔥');
      console.log('📦 Fetching user orders from SQL for auth user:', user.id);
      console.log('📧 User email:', user.email);
      
      // CRITICAL FIX: Orders.user_id references users.id, NOT auth.users.id
      // So we need to look up the user record first to get their users.id
      const authUserId = user.id;
      
      // Look up the user record in the users table
      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', authUserId)
        .single();
      
      if (userError || !userRecord) {
        console.error('❌ Error finding user record:', userError);
        throw new Error('User record not found');
      }
      
      const userId = userRecord.id; // This is the users.id that orders reference
      console.log(`✅ Fetching orders for user ID: ${userId}`);
      
      // Fetch orders (each row is one order/item)
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (ordersError) {
        console.error('❌ Error fetching orders from SQL:', ordersError);
        throw ordersError;
      }
      
      console.log(`✅ Found ${ordersData?.length || 0} orders for user ${userId}`);
      
      // DEBUG: Log sample order data
      if (ordersData && ordersData.length > 0) {
        console.log('🔍 DEBUG - Sample order:', JSON.stringify({
          id: ordersData[0].id,
          order_number: ordersData[0].order_number,
          user_id: ordersData[0].user_id,
          price: ordersData[0].price,
          subtotal: ordersData[0].subtotal,
          total_amount: ordersData[0].total_amount,
          payment_amount: ordersData[0].payment_amount,
          shipping_cost: ordersData[0].shipping_cost,
          points_used: ordersData[0].points_used,
          discount_amount: ordersData[0].discount_amount,
          material_name: ordersData[0].material_name,
          material_id: ordersData[0].material_id,
          thickness: ordersData[0].thickness,
          file_path: ordersData[0].file_path,
          quantity: ordersData[0].quantity,
        }));
      }
      
      // Transform SQL data to match expected format
      // Note: With new schema, each order row IS one item (not using order_items join)
      allOrders = (ordersData || []).map((order: any) => {
        // Calculate unit price from subtotal if price is 0 (fallback for old data)
        const unitPrice = order.price || (order.subtotal ? order.subtotal / (order.quantity || 1) : 0);
        
        return {
          id: order.id,
          orderNumber: order.order_number,
          createdAt: order.created_at,
          deliveryStatus: order.delivery_status,
          status: order.delivery_status || order.status,
          paymentStatus: order.payment_status,
          price: unitPrice,
          quantity: order.quantity || 1,
          shippingCost: order.shipping_cost || 0,
          shippingCarrier: order.shipping_carrier,
          trackingUrl: order.tracking_url,
          material: { name: order.material_name, id: order.material_id },
          thickness: order.thickness,
          fileName: order.file_path?.split('/').pop() || 'File',
          batchId: order.batch_id,
          filePath: order.file_path,
          // Reconstruct dxfData from stored columns for reorder functionality
          dxfData: (order.width || order.height || order.cutting_length) ? {
            width: order.width || 0,
            height: order.height || 0,
            cuttingLength: order.cutting_length || 0
          } : null,
          serviceType: (order.material_id === 'sketch' || order.material_id === 'sketch-service') ? 'sketch' : 'dxf',
          isSketchService: order.material_id === 'sketch' || order.material_id === 'sketch-service' || order.material_name === 'Sketch Service',
          sketchFilePaths: order.sketch_file_paths || [],
          sketchFileNames: order.sketch_file_paths?.map((path: string, i: number) => 
            path.split('/').pop() || `Sketch File ${i + 1}`
          ) || [],
          pointsUsed: order.points_used || 0,
          discountCode: order.discount_code,
          discountAmount: order.discount_amount || 0,
          paymentAmount: order.payment_amount || 0, // ✅ Add payment amount for correct total display
          color: order.color || null,               // Selected colour for non-metal materials
        };
      });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      // Fetch all orders for this user
      // Optimized: Fetch only orders for this specific user instead of all system orders
      allOrders = await kv.getByPrefix(`order:${user.id}`);
    }
    const userOrders = allOrders
      .map((order: any) => {
        const itemTotal = order.price * (order.quantity || 1);
        const shippingCost = order.shippingCost || 0;
        return {
          id: order.id,
          orderNumber: order.orderNumber || 'N/A', // Use stored orderNumber
          orderDate: order.createdAt,
          status: order.deliveryStatus || order.status || 'pending',
          paymentStatus: order.paymentStatus || 'pending',
          unitPrice: order.price, // Store unit price for items display
          itemTotal: itemTotal, // Item total without shipping
          total: itemTotal, // Total without shipping - will be added at batch level
          trackingUrl: order.trackingUrl,
          material: order.material?.name || 'Unknown',
          thickness: order.thickness || 0,
          quantity: order.quantity || 1,
          fileName: order.fileName,
          batchId: order.batchId,
          filePath: order.filePath,
          dxfData: order.dxfData, // Include dxfData for reorder functionality
          serviceType: order.serviceType || 'dxf', // Include service type
          isSketchService: order.isSketchService || false,
          pointsUsed: order.pointsUsed || 0,
          discountCode: order.discountCode,
          discountAmount: order.discountAmount || 0,
          shippingCost: shippingCost,
          shippingCarrier: order.shippingCarrier || null,
          paymentAmount: order.paymentAmount || 0, // ✅ CRITICAL FIX: Pass through paymentAmount
        };
      });

    // Group orders by batchId
    const batchMap = new Map();
    const standaloneOrders: any[] = [];

    userOrders.forEach((order: any) => {
      if (order.batchId) {
        if (!batchMap.has(order.batchId)) {
          batchMap.set(order.batchId, []);
        }
        batchMap.get(order.batchId).push(order);
      } else {
        standaloneOrders.push(order);
      }
    });

    // Create grouped orders
    let groupedOrders: any[] = [];

    // Add batch orders
    batchMap.forEach((items, batchId) => {
      const firstOrder = items[0];
      
      // Calculate itemsTotal for logging
      const itemsTotal = items.reduce((sum: number, item: any) => sum + item.itemTotal, 0);
      const shippingCost = firstOrder.shippingCost || 0;
      const discountAmount = items.reduce((sum: number, item: any) => sum + (item.discountAmount || 0), 0); // ✅ FIX: Sum all discount amounts
      const pointsUsed = firstOrder.pointsUsed || 0;
      
      // ✅ CRITICAL FIX: Sum ALL paymentAmounts from all items in the batch (not just first order!)
      const totalPaymentAmount = items.reduce((sum: number, item: any) => sum + (item.paymentAmount || 0), 0);
      
      // If paymentAmount is 0/null (pending orders), fall back to calculated total
      const calculatedTotal = itemsTotal + shippingCost - discountAmount - pointsUsed;
      const totalAmount = totalPaymentAmount || calculatedTotal;
      
      // ✅ CRITICAL DEBUG: Log all batch orders to diagnose total mismatch
      console.log(`📊 User orders batch ${batchId}: orderNumber=${firstOrder.orderNumber}, totalPaymentAmount=${totalPaymentAmount}, calculatedTotal=${calculatedTotal}, finalTotal=${totalAmount}, itemsTotal=${itemsTotal}, shipping=${shippingCost}, discount=${discountAmount}, points=${pointsUsed}`);
      
      groupedOrders.push({
        id: batchId,
        batchId: batchId,
        orderNumber: firstOrder.orderNumber || 'N/A', // Use stored orderNumber from first item in batch
        orderDate: firstOrder.orderDate,
        status: firstOrder.status,
        paymentStatus: firstOrder.paymentStatus || 'pending',
        total: totalAmount,
        trackingUrl: firstOrder.trackingUrl,
        material: items.length > 1 ? 'Multiple' : firstOrder.material,
        thickness: items.length > 1 ? 0 : firstOrder.thickness,
        isBatch: true,
        itemCount: items.length,
        pointsUsed: firstOrder.pointsUsed || 0,
        discountCode: firstOrder.discountCode,
        discountAmount: discountAmount, // ✅ FIX: Use summed discount amount, not just first order's
        shippingCost: shippingCost,
        shippingCarrier: firstOrder.shippingCarrier || null,
        items: items.map((item: any) => ({
          id: item.id,
          fileName: item.fileName,
          material: item.material,
          thickness: item.thickness,
          quantity: item.quantity,
          price: item.unitPrice, // Use unit price, UI will multiply by quantity
          filePath: item.filePath,
          dxfData: item.dxfData, // Include dxfData for reorder functionality
          serviceType: item.serviceType || 'dxf',
          isSketchService: item.isSketchService || false,
        })),
      });
    });

    // Add standalone orders
    standaloneOrders.forEach((order) => {
      const discountAmount = order.discountAmount || 0;
      const pointsUsed = order.pointsUsed || 0;
      
      // ✅ Use paymentAmount directly (same as admin panel) - it contains actual amount paid
      // If paymentAmount is 0/null (pending orders), fall back to calculated total
      const calculatedTotal = order.itemTotal + (order.shippingCost || 0) - discountAmount - pointsUsed;
      const totalWithShipping = order.paymentAmount || calculatedTotal;
      
      // ✅ CRITICAL DEBUG: Log all standalone orders to diagnose total mismatch
      console.log(`📊 User orders standalone ${order.id}: orderNumber=${order.orderNumber}, paymentAmount=${order.paymentAmount}, calculatedTotal=${calculatedTotal}, finalTotal=${totalWithShipping}, itemTotal=${order.itemTotal}, shipping=${order.shippingCost}, discount=${discountAmount}, points=${pointsUsed}`);
      
      groupedOrders.push({
        ...order,
        total: totalWithShipping, // Use payment amount if available, otherwise calculated
        isBatch: false,
        itemCount: 1,
      });
    });

    // Apply filters
    if (searchQuery) {
      groupedOrders = groupedOrders.filter(order => 
        order.orderNumber.toLowerCase().includes(searchQuery) ||
        order.material.toLowerCase().includes(searchQuery) ||
        order.status.toLowerCase().includes(searchQuery) ||
        (order.fileName && order.fileName.toLowerCase().includes(searchQuery))
      );
    }

    if (statusFilter && statusFilter !== 'all') {
      groupedOrders = groupedOrders.filter(order => order.status === statusFilter);
    }

    // Sort by date descending
    groupedOrders.sort((a: any, b: any) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());

    // Apply pagination
    const totalOrders = groupedOrders.length;
    const paginatedOrders = groupedOrders.slice(offset, offset + limit);

    return c.json({ 
      success: true, 
      orders: paginatedOrders,
      pagination: {
        page,
        limit,
        total: totalOrders,
        totalPages: Math.ceil(totalOrders / limit),
        hasNextPage: offset + limit < totalOrders,
        hasPrevPage: page > 1
      }
    });
  } catch (error: any) {
    console.error('Error fetching user orders:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.get('/make-server-8927474f/user/profile', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', user.id)
        .single();
      
      const { data: deliveryData } = await supabase
        .from('delivery_info')
        .select('*')
        .eq('user_id', userData?.id)  // Use users.id, not auth_user_id
        .single();
      
      const profile = {
        email: user.email,
        firstName: deliveryData?.first_name || userData?.first_name || '',
        lastName: deliveryData?.last_name || userData?.last_name || '',
        phone: deliveryData?.phone || userData?.phone || '',
        address: deliveryData?.address || '',
        apartment: deliveryData?.apartment || '',
        city: deliveryData?.city || '',
        state: deliveryData?.state || '',
        pinCode: deliveryData?.pin_code || '',
        country: deliveryData?.country || 'India',
        gstNumber: deliveryData?.gst_number || '',
        points: userData?.loyalty_points || 0,
        isAffiliate: userData?.is_affiliate || false,
      };

      return c.json({ success: true, profile });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      // Fetch user profile - check delivery info first, then user record
      let profile = await kv.get(`user-delivery:${user.id}`);
      
      if (!profile) {
        // Fall back to user record
        const userData = await kv.get(`user:${user.id}`);
        profile = {
          email: user.email,
          firstName: userData?.firstName || '',
          lastName: userData?.lastName || '',
          phone: userData?.phone || '',
          address: userData?.address || '',
          apartment: userData?.apartment || '',
          city: userData?.city || '',
          state: userData?.state || '',
          pinCode: userData?.pinCode || '',
          country: userData?.country || 'India',
          gstNumber: userData?.gstNumber || '',
          points: userData?.points || 0,
        };
      } else {
        // If profile exists in delivery info, merge with user data for points
        const userData = await kv.get(`user:${user.id}`);
        profile.points = userData?.points || 0;
      }

      return c.json({ success: true, profile });
    }
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.post('/make-server-8927474f/user/profile', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const profileData = await c.req.json();

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      // Get user record to get users.id (not auth_user_id)
      const { data: userRecord } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!userRecord) {
        throw new Error('User record not found');
      }
      
      // Update delivery info
      const deliveryUpdate = {
        user_id: userRecord.id,  // Use users.id, not auth_user_id
        first_name: profileData.firstName,
        last_name: profileData.lastName,
        phone: profileData.phone,
        address: profileData.address,
        apartment: profileData.apartment,
        city: profileData.city,
        state: profileData.state,
        pin_code: profileData.pinCode,
        country: profileData.country || 'India',
        gst_number: profileData.gstNumber,
        updated_at: new Date().toISOString()
      };

      await supabase
        .from('delivery_info')
        .upsert(deliveryUpdate, { onConflict: 'user_id' });

      // Also update user record if needed
      if (profileData.firstName || profileData.lastName || profileData.phone) {
        await supabase
          .from('users')
          .update({
            first_name: profileData.firstName,
            last_name: profileData.lastName,
            phone: profileData.phone,
            updated_at: new Date().toISOString()
          })
          .eq('auth_user_id', user.id);
      }

      return c.json({ success: true });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      // Save to delivery info key
      await kv.set(`user-delivery:${user.id}`, {
        ...profileData,
        userId: user.id,
        updatedAt: new Date().toISOString(),
      });

      // Also update user record
      const userData = await kv.get(`user:${user.id}`);
      if (userData) {
        await kv.set(`user:${user.id}`, {
          ...userData,
          ...profileData,
          updatedAt: new Date().toISOString(),
        });
      }

      return c.json({ success: true });
    }
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Check loyalty points by email (for checkout)
app.post('/make-server-8927474f/user/points-by-email', async (c) => {
  try {
    const { email } = await c.req.json();
    
    if (!email) {
      return c.json({ success: false, error: 'Email is required' }, 400);
    }

    const emailLower = email.toLowerCase();

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: user } = await supabase
        .from('users')
        .select('loyalty_points')
        .eq('email', emailLower)
        .single();
      
      if (!user) {
        return c.json({ success: true, points: 0, userFound: false });
      }

      return c.json({ 
        success: true, 
        points: user.loyalty_points || 0,
        userFound: true 
      });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      // Try O(1) lookup first
      let userId = await kv.get(`user-email:${emailLower}`);
      
      // Fallback: If mapping doesn't exist (for legacy users), search all users
      if (!userId) {
        console.log('Email mapping not found, searching all users for:', emailLower);
        const allUsers = await kv.getByPrefix('user:');
        const foundUser = allUsers.find((u: any) => u.email?.toLowerCase() === emailLower);
        
        if (foundUser) {
          userId = foundUser.id;
          // Create the mapping for future lookups
          await kv.set(`user-email:${emailLower}`, userId);
          console.log('Created email mapping for legacy user:', emailLower);
        }
      }
      
      if (!userId) {
        return c.json({ success: true, points: 0, userFound: false });
      }

      const user = await kv.get(`user:${userId}`);
      
      if (!user) {
        return c.json({ success: true, points: 0, userFound: false });
      }

      return c.json({ 
        success: true, 
        points: user.points || 0,
        userFound: true 
      });
    }
  } catch (error: any) {
    console.error('Error fetching points by email:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Fetch saved address by email (for checkout autofill)
app.post('/make-server-8927474f/user/address-by-email', async (c) => {
  try {
    const { email } = await c.req.json();
    console.log('🔍 Address lookup request for email:', email);
    
    if (!email) {
      return c.json({ success: false, error: 'Email is required' }, 400);
    }

    const emailLower = email.toLowerCase();

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      console.log('🔍 Looking up user in SQL database...');
      const { data: user } = await supabase
        .from('users')
        .select('auth_user_id, first_name, last_name, phone')
        .eq('email', emailLower)
        .single();
      
      if (!user) {
        console.log('❌ User not found for email:', emailLower);
        return c.json({ success: true, addressFound: false });
      }
      
      console.log('✅ User found, fetching delivery info for user_id:', user.auth_user_id);

      // Fetch delivery info
      const { data: deliveryData } = await supabase
        .from('delivery_info')
        .select('*')
        .eq('user_id', user.auth_user_id)
        .single();
      
      if (!deliveryData) {
        console.log('❌ No delivery info found for user:', user.auth_user_id);
        return c.json({ success: true, addressFound: false });
      }
      
      console.log('✅ Delivery info found:', deliveryData);

      const address = {
        firstName: deliveryData.first_name || user.first_name || '',
        lastName: deliveryData.last_name || user.last_name || '',
        phone: deliveryData.phone || user.phone || '',
        address: deliveryData.address || '',
        apartment: deliveryData.apartment || '',
        city: deliveryData.city || '',
        state: deliveryData.state || '',
        pinCode: deliveryData.pin_code || '',
        country: deliveryData.country || 'India',
        gstNumber: deliveryData.gst_number || '',
      };

      console.log('✅ Returning address data:', address);
      return c.json({ 
        success: true, 
        address,
        addressFound: true 
      });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      // Try O(1) lookup first
      let userId = await kv.get(`user-email:${emailLower}`);
      
      // Fallback: If mapping doesn't exist (for legacy users), search all users
      if (!userId) {
        console.log('Email mapping not found, searching all users for:', emailLower);
        const allUsers = await kv.getByPrefix('user:');
        const foundUser = allUsers.find((u: any) => u.email?.toLowerCase() === emailLower);
        
        if (foundUser) {
          userId = foundUser.id;
          // Create the mapping for future lookups
          await kv.set(`user-email:${emailLower}`, userId);
          console.log('Created email mapping for legacy user:', emailLower);
        }
      }
      
      if (!userId) {
        return c.json({ success: true, addressFound: false });
      }

      // Check delivery info first, then user record
      let deliveryInfo = await kv.get(`user-delivery:${userId}`);
      
      if (!deliveryInfo) {
        // Fall back to user record
        const userData = await kv.get(`user:${userId}`);
        
        if (!userData) {
          return c.json({ success: true, addressFound: false });
        }
        
        deliveryInfo = {
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          phone: userData.phone || '',
          address: userData.address || '',
          apartment: userData.apartment || '',
          city: userData.city || '',
          state: userData.state || '',
          pinCode: userData.pinCode || '',
          country: userData.country || 'India',
          gstNumber: userData.gstNumber || '',
        };
      }

      return c.json({ 
        success: true, 
        address: deliveryInfo,
        addressFound: true 
      });
    }
  } catch (error: any) {
    console.error('Error fetching address by email:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Auth Routes
app.post('/make-server-8927474f/signup', async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    
    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      email_confirm: true // Auto-confirm since email server not configured
    });

    if (error) throw error;

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      // Check if this is the first user - make them admin
      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      
      const isFirstUser = count === 0;

      // Insert user into SQL
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          auth_user_id: data.user.id,
          email: data.user.email,
          name,
          is_admin: isFirstUser,
          loyalty_points: 0,
          created_at: new Date().toISOString()
        });

      if (insertError) throw insertError;

      return c.json({ 
        success: true, 
        user: data.user,
        isAdmin: isFirstUser 
      });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      // Check if this is the first user - make them admin
      const users = await kv.getByPrefix('user:');
      const isFirstUser = users.length === 0;

      // Store user in KV
      const userData = {
        id: data.user.id,
        email: data.user.email,
        name,
        isAdmin: isFirstUser,
        createdAt: new Date().toISOString()
      };
      
      await kv.set(`user:${data.user.id}`, userData);
      
      // Create email-to-userId mapping for O(1) email lookups
      await kv.set(`user-email:${data.user.email.toLowerCase()}`, data.user.id);

      return c.json({ 
        success: true, 
        user: data.user,
        isAdmin: isFirstUser 
      });
    }
  } catch (error: any) {
    console.error('Signup error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

app.post('/make-server-8927474f/login', async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    console.log('Login attempt for:', email);
    
    // Authenticate user using admin API
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Don't log auth failures as errors (expected user behavior)
      // Only log the attempt for debugging purposes
      console.log('Login failed for:', email, '- Reason:', error.code || 'unknown');
      
      // Provide more specific error messages based on Supabase error codes
      if (error.message?.includes('Invalid login credentials')) {
        throw new Error('Invalid email or password. Please check your credentials and try again.');
      } else if (error.message?.includes('Email not confirmed')) {
        throw new Error('Please verify your email address before logging in.');
      } else if (error.message?.includes('User not found')) {
        throw new Error('No account found with this email address.');
      } else {
        throw new Error('Invalid email or password');
      }
    }

    if (!data.session) {
      throw new Error('Login failed. Please try again.');
    }

    console.log('✓ Login successful for:', email);

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      let { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', data.user.id)
        .single();
      
      // If user doesn't exist in SQL, create them (migration from old auth)
      if (fetchError || !userData) {
        const { count } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true });
        
        const isFirstUser = count === 0;
        
        const newUser = {
          auth_user_id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User',
          is_admin: isFirstUser,
          loyalty_points: 0,
          created_at: new Date().toISOString()
        };
        
        await supabase.from('users').insert(newUser);
        userData = newUser;
      }

      return c.json({ 
        success: true, 
        user: {
          id: userData.auth_user_id,
          email: userData.email,
          name: userData.name,
          isAdmin: userData.is_admin,
          loyaltyPoints: userData.loyalty_points
        },
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token
        }
      });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      // Get user data from KV
      let userData = await kv.get(`user:${data.user.id}`);
      
      // If user doesn't exist in KV, create them (migration from old auth)
      if (!userData) {
        const users = await kv.getByPrefix('user:');
        const isFirstUser = users.length === 0;
        
        userData = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User',
          isAdmin: isFirstUser,
          createdAt: new Date().toISOString()
        };
        
        await kv.set(`user:${data.user.id}`, userData);
        
        // Create email-to-userId mapping for O(1) email lookups
        if (data.user.email) {
          await kv.set(`user-email:${data.user.email.toLowerCase()}`, data.user.id);
        }
      }

      return c.json({ 
        success: true, 
        user: userData,
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token
        }
      });
    }
  } catch (error: any) {
    // Don't log expected auth errors - already logged above
    // Only log if it's an unexpected system error
    if (!error.message?.includes('Invalid') && !error.message?.includes('password')) {
      console.error('Login error:', error);
    }
    return c.json({ success: false, error: error.message }, 401);
  }
});

app.post('/make-server-8927474f/check-user', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      let { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', user.id)
        .single();
      
      // If user doesn't exist in SQL, create them (migration from old auth)
      if (fetchError || !userData) {
        const { count } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true });
        
        const isFirstUser = count === 0;
        
        const newUser = {
          auth_user_id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          is_admin: isFirstUser,
          loyalty_points: 0,
          created_at: new Date().toISOString()
        };
        
        await supabase.from('users').insert(newUser);
        userData = newUser;
      }
      
      return c.json({ 
        success: true, 
        user: {
          id: userData.auth_user_id,
          email: userData.email,
          name: userData.name,
          isAdmin: userData.is_admin,
          loyaltyPoints: userData.loyalty_points
        }
      });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      let userData = await kv.get(`user:${user.id}`);
      
      // If user doesn't exist in KV, create them (migration from old auth)
      if (!userData) {
        const users = await kv.getByPrefix('user:');
        const isFirstUser = users.length === 0;
        
        userData = {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          isAdmin: isFirstUser,
          createdAt: new Date().toISOString()
        };
        
        await kv.set(`user:${user.id}`, userData);
        
        // Create email-to-userId mapping for O(1) email lookups
        if (user.email) {
          await kv.set(`user-email:${user.email.toLowerCase()}`, user.id);
        }
      }
      
      return c.json({ success: true, user: userData });
    }
  } catch (error: any) {
    console.error('Check user error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

// User Delivery Information Routes
app.get('/make-server-8927474f/user/delivery-info', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      console.log('🔍 Fetching delivery info for auth user:', user.id);
      
      // CRITICAL FIX: Map auth_user_id to users.id first
      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('id, auth_user_id, is_subscribed')
        .eq('auth_user_id', user.id)
        .single();
      
      if (userError || !userRecord) {
        console.error('❌ User not found in users table:', userError);
        return c.json({ success: true, deliveryInfo: null });
      }
      
      const userId = userRecord.id;
      const isSubscribed = userRecord.is_subscribed !== false; // Default to true if not set
      console.log('�� Mapped auth ID to user ID:', userId, '| is_subscribed:', isSubscribed);
      
      const { data: deliveryInfo, error: fetchError } = await supabase
        .from('delivery_info')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('❌ Error fetching delivery info:', fetchError);
      }
      
      console.log('📦 Delivery info found:', deliveryInfo ? 'YES' : 'NO');
      if (deliveryInfo) {
        console.log('   Address:', deliveryInfo.address);
        console.log('   City:', deliveryInfo.city);
        console.log('   State:', deliveryInfo.state);
      }
      
      // Transform to frontend format
      const formattedInfo = deliveryInfo ? {
        firstName: deliveryInfo.first_name,
        lastName: deliveryInfo.last_name,
        phone: deliveryInfo.phone,
        address: deliveryInfo.address,
        apartment: deliveryInfo.apartment,
        city: deliveryInfo.city,
        state: deliveryInfo.state,
        pinCode: deliveryInfo.pin_code,
        country: deliveryInfo.country,
        gstNumber: deliveryInfo.gst_number,
        isSubscribed: isSubscribed
      } : null;
      
      return c.json({ success: true, deliveryInfo: formattedInfo });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const deliveryInfo = await kv.get(`user-delivery:${user.id}`);
      return c.json({ success: true, deliveryInfo: deliveryInfo || null });
    }
  } catch (error: any) {
    console.error('Get delivery info error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

app.post('/make-server-8927474f/user/delivery-info', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const deliveryData = await c.req.json();

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      // Map auth ID to users.id (for foreign key reference)
      let { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('id, auth_user_id')
        .eq('auth_user_id', user.id)
        .single();
      
      // Auto-create user record if it doesn't exist (for OAuth or edge cases)
      if (userError || !userRecord) {
        console.log('⚠️ User not found in users table, auto-creating...');
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert({
            auth_user_id: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.email?.split('@')[0],
            is_admin: false,
            created_at: new Date().toISOString()
          })
          .select('id, auth_user_id')
          .single();
        
        if (insertError) {
          console.error('❌ Failed to create user record:', insertError);
          return c.json({ success: false, error: 'Failed to create user record' }, 500);
        }
        
        userRecord = newUser;
        console.log('✅ User record created successfully');
      }
      
      const userId = userRecord.id;
      const result = await saveDeliveryInfo(userId, deliveryData);
      
      if (result.success) {
        return c.json({ success: true });
      } else {
        return c.json({ success: false, error: result.error }, 500);
      }
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      // Save delivery information to separate key for quick retrieval
      await kv.set(`user-delivery:${user.id}`, {
        ...deliveryData,
        userId: user.id,
        updatedAt: new Date().toISOString()
      });

      // Also update user's main record with all delivery fields for admin panel
      const userData = await kv.get(`user:${user.id}`);
      if (userData) {
        await kv.set(`user:${user.id}`, {
          ...userData,
          phone: deliveryData.phone || userData.phone,
          gstNumber: deliveryData.gstNumber || userData.gstNumber,
          firstName: deliveryData.firstName || userData.firstName,
          lastName: deliveryData.lastName || userData.lastName,
          address: deliveryData.address || userData.address,
          apartment: deliveryData.apartment || userData.apartment,
          city: deliveryData.city || userData.city,
          state: deliveryData.state || userData.state,
          pinCode: deliveryData.pinCode || userData.pinCode,
          country: deliveryData.country || userData.country,
        });
      }

      return c.json({ success: true });
    }
  } catch (error: any) {
    console.error('Save delivery info error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

// ============================================================================
// Materials Routes
// ============================================================================
// NOTE: The materials table stores pricing in separate columns:
// - price_per_mm: base price (used for backwards compatibility)
// - thicknesses: array of available thickness values
// The frontend uses a "pricing" array format with {thickness, pricePerMm} objects.
// This is transformed on read/write operations.
// Fixed: Removed non-existent 'pricing_json' column references (similar to order cancellation fix)
// ============================================================================

app.get('/make-server-8927474f/materials', async (c) => {
  try {
    // Force no-cache headers
    c.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    c.header('Pragma', 'no-cache');
    c.header('Expires', '0');
    
    console.log(`🔍 GET /materials - USE_SQL_TABLES = ${USE_SQL_TABLES}`);
    
    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      console.log('📊 EXECUTING SQL CODE PATH FOR MATERIALS');
      const { data: materials, error } = await supabase
        .from('materials')
        .select('*')
        .eq('available', true)
        .order('category, name');

      if (error) throw error;
      
      console.log(`📦 SQL Materials query returned ${materials.length} materials:`, materials.map(m => m.id));

      // Transform SQL response to match frontend format
      const formattedMaterials = materials.map((m: any) => {
        // Use the new pricing column if it exists, otherwise fall back to old format
        let pricing = [];
        
        if (m.pricing && Array.isArray(m.pricing) && m.pricing.length > 0) {
          // New format: use pricing column with thickness-specific pricePerMm and pricePerSqft
          pricing = m.pricing.map((p: any) => ({
            thickness: p.thickness,
            pricePerMm: parseFloat(p.pricePerMm),
            pricePerSqft: p.pricePerSqft !== undefined ? parseFloat(p.pricePerSqft) : 1,
            inStock: p.inStock !== undefined ? Boolean(p.inStock) : true  // Default to in stock if not set
          }));
        } else if (m.thicknesses && Array.isArray(m.thicknesses)) {
          // Old format: reconstruct from thicknesses array with universal pricePerMm
          pricing = m.thicknesses.map((t: number) => ({
            thickness: t,
            pricePerMm: parseFloat(m.price_per_mm),
            pricePerSqft: m.price_per_sqf !== null ? parseFloat(m.price_per_sqf) : 1,
            inStock: true  // Old format materials default to in stock
          }));
        }
        
        return {
          id: m.id,
          name: m.name,
          category: m.category,
          pricing: pricing,
          price_per_mm: parseFloat(m.price_per_mm),
          price_per_sqf: m.price_per_sqf !== null ? parseFloat(m.price_per_sqf) : 1, // Default to ₹1
          density: m.density,
          inStock: m.inStock !== undefined ? Boolean(m.inStock) : true,  // Material-level inStock flag
          colors_enabled: m.colors_enabled || false,   // Whether customers can choose a colour
          colors: m.colors || [],                      // Array of { name, hex } colour objects
        };
      });

      return c.json({ success: true, materials: formattedMaterials });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      console.log('📦 EXECUTING KV CODE PATH FOR MATERIALS');
      const materials = await kv.getByPrefix('material:');
      console.log(`📦 KV Materials query returned ${materials.length} materials:`, materials.map((m: any) => m.id));
      
      // If no materials exist, initialize default ones
      if (materials.length === 0) {
        const defaultMaterials = [
          // Metals
          { id: 'mild-steel', name: 'Mild Steel', category: 'Metals', pricePerMm: 0.10, thicknesses: [1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12], density: 7850 },
          { id: 'stainless-steel', name: 'Stainless Steel', category: 'Metals', pricePerMm: 0.15, thicknesses: [1, 1.5, 2, 3, 4, 5, 6, 8, 10], density: 8000 },
          { id: 'aluminum', name: 'Aluminum', category: 'Metals', pricePerMm: 0.12, thicknesses: [1, 1.5, 2, 3, 4, 5, 6, 8, 10], density: 2700 },
          // Non-Metals
          { id: 'acrylic', name: 'Acrylic', category: 'Non-Metals', pricePerMm: 0.08, thicknesses: [3, 4, 5, 6, 8, 10, 12], density: 1190 },
          { id: 'mdf', name: 'MDF', category: 'Non-Metals', pricePerMm: 0.06, thicknesses: [3, 4, 5, 6, 8, 10, 12, 18], density: 750 },
          { id: 'pvc', name: 'PVC', category: 'Non-Metals', pricePerMm: 0.07, thicknesses: [3, 4, 5, 6, 8, 10], density: 1400 }
        ];

        for (const material of defaultMaterials) {
          await kv.set(`material:${material.id}`, material);
        }
        
        return c.json({ success: true, materials: defaultMaterials });
      }

      return c.json({ success: true, materials });
    }
  } catch (error: any) {
    console.error('Get materials error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

app.post('/make-server-8927474f/materials', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      console.error('Material creation - Auth error:', error);
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    // Check if user is admin
    let isAdmin = false;
    if (USE_SQL_TABLES) {
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();
      isAdmin = userData?.is_admin || false;
    } else {
      const userData = await kv.get(`user:${user.id}`);
      isAdmin = userData?.isAdmin || false;
    }
    
    if (!isAdmin) {
      return c.json({ success: false, error: 'Admin access required' }, 403);
    }

    const material = await c.req.json();

    console.log(`➕ POST /materials - Creating new material`);
    console.log(`📦 Material data:`, JSON.stringify(material));

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      // Support new pricing format (array of thickness/price objects)
      let pricePerMm, thicknesses;
      
      if (material.pricing && Array.isArray(material.pricing)) {
        // New format: pricing array
        // For backwards compatibility, use the first pricing as the base price
        pricePerMm = material.pricing[0]?.pricePerMm || 0;
        thicknesses = material.pricing.map((p: any) => p.thickness);
      } else if (material.pricePerMm !== undefined) {
        // Old format
        pricePerMm = material.pricePerMm;
        thicknesses = material.thicknesses || [];
      } else {
        throw new Error('Invalid material format: missing pricing information');
      }
      
      console.log(`💾 Inserting with pricePerMm: ${pricePerMm}, thicknesses: ${thicknesses}`);
      console.log(`💾 Pricing array:`, JSON.stringify(material.pricing));
      
      // Determine material-level inStock for new material: true if at least one thickness is in stock
      const newMaterialInStock = material.pricing
        ? material.pricing.some((p: any) => p.inStock !== false)
        : true;

      const { data, error: insertError } = await supabase
        .from('materials')
        .insert({
          id: material.id,
          name: material.name,
          category: material.category,
          price_per_mm: pricePerMm,
          price_per_sqf: material.price_per_sqf || 1, // Default to ₹1 if not provided
          thicknesses: thicknesses,
          pricing: material.pricing || [], // Save the full pricing array with thickness-specific values (including inStock)
          density: material.density,
          available: true,
          inStock: newMaterialInStock,     // Sync material-level flag
          colors_enabled: material.colors_enabled || false,
          colors: material.colors || [],
        })
        .select()
        .single();

      if (insertError) {
        console.error(`❌ Material insert error for ${material.id}:`, insertError);
        throw insertError;
      }
      
      console.log(`✅ Material ${material.id} created successfully`);
      return c.json({ success: true, material });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      await kv.set(`material:${material.id}`, material);
      return c.json({ success: true, material });
    }
  } catch (error: any) {
    console.error('Create material error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

app.put('/make-server-8927474f/materials/:id', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    // Check if user is admin
    let isAdmin = false;
    if (USE_SQL_TABLES) {
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();
      isAdmin = userData?.is_admin || false;
    } else {
      const userData = await kv.get(`user:${user.id}`);
      isAdmin = userData?.isAdmin || false;
    }

    if (!isAdmin) {
      return c.json({ success: false, error: 'Admin access required' }, 403);
    }

    const id = c.req.param('id');
    const material = await c.req.json();

    console.log(`📝 PUT /materials/${id} - Updating material`);
    console.log(`📦 Material data:`, JSON.stringify(material));

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      // Support new pricing format (array of thickness/price objects)
      let pricePerMm, thicknesses;
      
      if (material.pricing && Array.isArray(material.pricing)) {
        // New format: pricing array
        // For backwards compatibility, use the first pricing as the base price
        pricePerMm = material.pricing[0]?.pricePerMm || 0;
        thicknesses = material.pricing.map((p: any) => p.thickness);
      } else if (material.pricePerMm !== undefined) {
        // Old format
        pricePerMm = material.pricePerMm;
        thicknesses = material.thicknesses || [];
      } else {
        throw new Error('Invalid material format: missing pricing information');
      }
      
      console.log(`💾 Updating with pricePerMm: ${pricePerMm}, thicknesses: ${thicknesses}`);
      console.log(`💾 Pricing array:`, JSON.stringify(material.pricing));
      
      // Determine material-level inStock: true if at least one thickness is in stock
      const materialInStock = material.pricing
        ? material.pricing.some((p: any) => p.inStock !== false)
        : true;

      const { error: updateError } = await supabase
        .from('materials')
        .update({
          name: material.name,
          category: material.category,
          price_per_mm: pricePerMm,
          price_per_sqf: material.price_per_sqf !== undefined ? material.price_per_sqf : 1,
          thicknesses: thicknesses,
          pricing: material.pricing || [], // Save the full pricing array with thickness-specific values (including inStock)
          density: material.density,
          available: material.available !== undefined ? material.available : true,
          inStock: materialInStock,        // Sync material-level flag: true if any thickness is in stock
          colors_enabled: material.colors_enabled !== undefined ? material.colors_enabled : false,
          colors: material.colors || [],
        })
        .eq('id', id);

      if (updateError) {
        console.error(`❌ Material update error for ${id}:`, updateError);
        throw updateError;
      }
      
      console.log(`✅ Material ${id} updated successfully`);
      return c.json({ success: true, material: { ...material, id } });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      await kv.set(`material:${id}`, { ...material, id });
      return c.json({ success: true, material: { ...material, id } });
    }
  } catch (error: any) {
    console.error('Update material error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

app.delete('/make-server-8927474f/materials/:id', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    // Check if user is admin
    let isAdmin = false;
    if (USE_SQL_TABLES) {
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();
      isAdmin = userData?.is_admin || false;
    } else {
      const userData = await kv.get(`user:${user.id}`);
      isAdmin = userData?.isAdmin || false;
    }

    if (!isAdmin) {
      return c.json({ success: false, error: 'Admin access required' }, 403);
    }

    const id = c.req.param('id');
    console.log(`🗑️ DELETE request for material ID: ${id}`);

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      // Hard delete the material from BOTH SQL and KV (for migration cleanup)
      console.log(`📊 Attempting SQL DELETE for material: ${id}`);
      const { data, error: deleteError, count } = await supabase
        .from('materials')
        .delete()
        .eq('id', id)
        .select();

      console.log(`🔍 SQL Delete result:`, { data, error: deleteError, count, rowsAffected: data?.length || 0 });
      
      if (deleteError) {
        console.error(`❌ SQL DELETE error:`, deleteError);
        throw deleteError;
      }
      
      if (!data || data.length === 0) {
        console.warn(`⚠️ No rows deleted from SQL - material ${id} may not exist in SQL table`);
      } else {
        console.log(`✅ Successfully deleted material ${id} from SQL`);
      }
      
      // ALSO delete from KV store (cleanup for migrated data)
      console.log(`🧹 Also deleting from KV store for cleanup...`);
      try {
        await kv.del(`material:${id}`);
        console.log(`✅ Deleted material ${id} from KV store`);
      } catch (kvError) {
        console.warn(`⚠️ KV deletion failed (might not exist):`, kvError);
      }
      
      return c.json({ success: true });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      await kv.del(`material:${id}`);
      return c.json({ success: true });
    }
  } catch (error: any) {
    console.error('Delete material error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

// Diagnostic endpoint to check material in database
app.get('/make-server-8927474f/materials/:id/check', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const id = c.req.param('id');
    console.log(`🔍 Checking material in database: ${id}`);

    if (USE_SQL_TABLES) {
      const { data, error: fetchError } = await supabase
        .from('materials')
        .select('*')
        .eq('id', id);

      console.log(`📊 Database check result:`, { data, error: fetchError });
      
      return c.json({ 
        success: true, 
        exists: data && data.length > 0,
        material: data?.[0] || null,
        count: data?.length || 0
      });
    } else {
      const material = await kv.get(`material:${id}`);
      return c.json({ 
        success: true, 
        exists: !!material,
        material: material || null
      });
    }
  } catch (error: any) {
    console.error('Check material error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

// File Upload Route - allows guest uploads
app.post('/make-server-8927474f/upload-dxf', async (c) => {
  try {
    const { user } = await verifyUser(c.req.raw);
    
    const formData = await c.req.formData();
    const file = formData.get('file');
    
    if (!file) {
      return c.json({ success: false, error: 'No file provided' }, 400);
    }

    console.log('File type:', typeof file, 'instanceof Blob:', file instanceof Blob, 'has arrayBuffer:', typeof (file as any)?.arrayBuffer);

    // Ensure file is a Blob/File object
    if (!(file instanceof Blob)) {
      return c.json({ success: false, error: 'Invalid file format' }, 400);
    }

    // Check file size limit (fetch from pricing constants)
    const pricingConstants = await kv.get('pricing_constants');
    const maxFileSizeMB = pricingConstants?.maxFileSize || 50; // Default 50MB
    const MAX_FILE_SIZE = maxFileSizeMB * 1024 * 1024;
    const fileSize = (file as any).size || 0;
    if (fileSize > MAX_FILE_SIZE) {
      return c.json({ 
        success: false, 
        error: `File size exceeds ${maxFileSizeMB}MB limit. Your file is ${(fileSize / (1024 * 1024)).toFixed(2)}MB` 
      }, 400);
    }

    // Use user ID if logged in, or 'guest' for anonymous uploads
    const userId = user?.id || 'guest';
    const originalFileName = (file as any).name || 'upload';
    const fileName = `${userId}/${Date.now()}-${originalFileName}`;
    
    // Convert to array buffer - Blob interface should have this
    let fileBuffer: ArrayBuffer;
    try {
      if (typeof (file as any).arrayBuffer === 'function') {
        fileBuffer = await (file as any).arrayBuffer();
      } else {
        // Fallback: try reading as stream
        const bytes = await file.bytes();
        fileBuffer = bytes.buffer;
      }
    } catch (bufferError) {
      console.error('Error converting file to buffer:', bufferError);
      throw new Error('Failed to read file data');
    }

    const { data, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, fileBuffer, {
        contentType: (file as any).type || 'application/dxf'
      });

    if (uploadError) throw uploadError;

    // Track file upload
    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      await supabase
        .from('file_uploads')
        .insert({
          file_path: fileName,
          user_id: userId === 'guest' ? null : userId,
          uploaded_at: new Date().toISOString(),
          file_name: originalFileName,
          file_size: (file as any).size || 0,
          associated_with_order: false
        });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const fileUploadId = `file-upload:${fileName}`;
      await kv.set(fileUploadId, {
        filePath: fileName,
        userId: userId,
        uploadedAt: new Date().toISOString(),
        fileName: originalFileName,
        fileSize: (file as any).size || 0,
        associatedWithOrder: false,
      });
    }

    // Get signed URL
    const { data: signedUrl } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(fileName, 3600); // 1 hour expiry

    return c.json({ 
      success: true, 
      filePath: fileName,
      signedUrl: signedUrl?.signedUrl 
    });
  } catch (error: any) {
    console.error('Upload DXF error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

// Cleanup abandoned file uploads (files uploaded but not associated with orders)
app.post('/make-server-8927474f/cleanup-abandoned-uploads', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    // Find files that are older than 24 hours and not associated with any order
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
    const cutoffISO = cutoffTime.toISOString();
    
    const filesToDelete: string[] = [];

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!userData?.is_admin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      // Get abandoned file uploads
      const { data: fileUploads } = await supabase
        .from('file_uploads')
        .select('file_path')
        .eq('associated_with_order', false)
        .lt('uploaded_at', cutoffISO);

      if (fileUploads) {
        filesToDelete.push(...fileUploads.map(f => f.file_path));
      }
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      // Get all file uploads
      const fileUploads = await kv.getByPrefix('file-upload:');
      
      for (const upload of fileUploads) {
        if (!upload.associatedWithOrder) {
          const uploadDate = new Date(upload.uploadedAt);
          if (uploadDate < cutoffTime) {
            filesToDelete.push(upload.filePath);
          }
        }
      }
    }
    
    // Delete files from storage
    let deletedCount = 0;
    for (const filePath of filesToDelete) {
      try {
        const { error: deleteError } = await supabase.storage
          .from(bucketName)
          .remove([filePath]);
        
        if (!deleteError) {
          if (USE_SQL_TABLES) {
            // Remove from SQL
            await supabase
              .from('file_uploads')
              .delete()
              .eq('file_path', filePath);
          } else {
            // Remove from KV store
            await kv.del(`file-upload:${filePath}`);
          }
          deletedCount++;
        }
      } catch (err) {
        console.error(`Failed to delete ${filePath}:`, err);
      }
    }

    return c.json({ 
      success: true, 
      message: `Cleaned up ${deletedCount} abandoned files`,
      deletedCount 
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

// Orders Routes
app.post('/make-server-8927474f/orders', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const order = await c.req.json();
    
    // Generate sequential order number
    const orderNumber = await generateOrderNumber();

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const orderId = crypto.randomUUID();
      
      // Track discount usage if discount code was applied
      let calculatedDiscountAmount = 0;
      if (order.discountCode) {
        const { data: discount } = await supabase
          .from('discount_codes')
          .select('*')
          .eq('code', order.discountCode)
          .single();
        
        if (discount) {
          // Calculate discount amount based on discount type
          const orderPrice = order.price * (order.quantity || 1);
          if (discount.type === 'percentage') {
            calculatedDiscountAmount = (orderPrice * (discount.value || 0)) / 100;
          } else if (discount.type === 'fixed') {
            calculatedDiscountAmount = discount.value || 0;
          }
          console.log(`💰 Single order discount: ${discount.code} (${discount.type}:${discount.value}) = ₹${calculatedDiscountAmount.toFixed(2)}`);
          
          // Update discount usage count
          await supabase
            .from('discount_codes')
            .update({ used_count: (discount.used_count || 0) + 1 })
            .eq('id', discount.id);

          // Update affiliate statistics if this is an affiliate discount
          if (discount.affiliate_id) {
            const { data: affiliate } = await supabase
              .from('affiliates')
              .select('*')
              .eq('id', discount.affiliate_id)
              .single();
            
            if (affiliate) {
              const commission = (order.price * (affiliate.commission_percentage || 0)) / 100;
              
              // Get user record for tracking (need users.id, not auth_user_id)
              const { data: userData } = await supabase
                .from('users')
                .select('id, email')
                .eq('auth_user_id', user.id)
                .single();
              const userEmail = userData?.email || user.email;
              const userId = userData?.id;
              
              console.log(`📊 Recording affiliate usage: ${discount.code} used by ${userEmail} for order ${orderNumber}`);
              
              // Track individual usage for fraud detection
              const { error: usageError } = await supabase
                .from('affiliate_usage')
                .insert({
                  affiliate_id: discount.affiliate_id,
                  affiliate_name: affiliate.name,
                  discount_code: discount.code,
                  user_id: user.id,  // ← Use auth_user_id (UUID), not users.id (serial)
                  user_email: userEmail,
                  order_value: order.price,
                  commission: commission,
                  order_id: orderId,
                  order_number: orderNumber,
                  created_at: new Date().toISOString()
                });
              
              if (usageError) {
                console.error('❌ Error recording affiliate usage:', usageError);
              } else {
                console.log('✅ Affiliate usage recorded successfully');
              }
              
              // Update affiliate stats
              await supabase
                .from('affiliates')
                .update({
                  usage_count: (affiliate.usage_count || 0) + 1,
                  total_sales: (affiliate.total_sales || 0) + order.price,
                  total_commission: (affiliate.total_commission || 0) + commission,
                  updated_at: new Date().toISOString()
                })
                .eq('id', discount.affiliate_id);
            }
          }
        }
      }
      
      // Get user record for user_id (need users.id, not auth_user_id)
      const { data: orderUserData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();
      const orderUserId = orderUserData?.id;
      
      if (!orderUserId) {
        throw new Error('User record not found - cannot create order');
      }
      
      // Create order record
      await supabase
        .from('orders')
        .insert({
          id: orderId,
          order_number: orderNumber,
          user_id: orderUserId,  // Use users.id, not auth_user_id
          material_id: order.material?.id,
          material_name: order.material?.name,
          thickness: order.thickness,
          quantity: order.quantity || 1,
          price: order.price,
          shipping_cost: order.shippingCost || 0,
          shipping_carrier: order.shippingCarrier,
          total_weight: order.totalWeight,
          discount_code: order.discountCode,
          discount_amount: calculatedDiscountAmount,
          points_used: order.pointsUsed || 0,
          file_path: order.filePath,
          file_name: order.fileName,
          // Store DXF data for reorder functionality
          width: order.dxfData?.width || 0,
          height: order.dxfData?.height || 0,
          cutting_length: order.dxfData?.cuttingLength || 0,
          sketch_file_paths: order.sketchFilePaths || [],
          is_sketch_service: order.isSketchService || false,
          delivery_info: order.deliveryInfo,
          payment_method: order.paymentMethod,
          notes: order.notes || '',
          status: 'pending',
          delivery_status: 'pending',
          payment_status: order.paymentStatus || 'pending',
          // Payment transaction details (for compliance & accounting)
          payment_id: order.paymentId || null,                    // Transaction ID from gateway
          payment_gateway: order.paymentGateway || order.paymentMethod || null,  // razorpay, payu, cod
          payment_amount: order.paymentAmount || order.price || null,  // Amount actually paid
          payment_verified_at: order.paymentVerifiedAt || (order.paymentId ? new Date().toISOString() : null),
          razorpay_order_id: order.razorpayOrderId || null,       // Razorpay order_id
          razorpay_signature: order.razorpaySignature || null,    // For audit trail
          payment_metadata: order.paymentMetadata || null,         // Additional data
          created_at: new Date().toISOString()
        });

      // Mark file uploads as associated with order
      if (order.filePath) {
        await supabase
          .from('file_uploads')
          .update({ 
            associated_with_order: true,
            order_id: orderId
          })
          .eq('file_path', order.filePath);
      }

      if (order.sketchFilePaths && Array.isArray(order.sketchFilePaths)) {
        for (const filePath of order.sketchFilePaths) {
          await supabase
            .from('file_uploads')
            .update({ 
              associated_with_order: true,
              order_id: orderId
            })
            .eq('file_path', filePath);
        }
      }

      // Loyalty points management
      const { data: userData } = await supabase
        .from('users')
        .select('loyalty_points, email, name, phone')
        .eq('auth_user_id', user.id)
        .single();
      
      let currentPoints = userData?.loyalty_points || 0;
      
      // Deduct points if they were used
      if (order.pointsUsed && order.pointsUsed > 0) {
        currentPoints = Math.max(0, currentPoints - order.pointsUsed);
      }
      
      // Award new points: 1 point per ₹100 spent
      const pointsEarned = Math.floor(order.price / 100);
      if (pointsEarned > 0) {
        currentPoints += pointsEarned;
      }
      
      // Update user's points
      if (order.pointsUsed || pointsEarned > 0) {
        await supabase
          .from('users')
          .update({ loyalty_points: currentPoints })
          .eq('auth_user_id', user.id);
      }

      // Update user's email subscription preference if provided in deliveryInfo
      if (order.deliveryInfo?.isSubscribed !== undefined) {
        await supabase
          .from('users')
          .update({ is_subscribed: order.deliveryInfo.isSubscribed })
          .eq('auth_user_id', user.id);
      }

      // Send email and Telegram notifications
      const email = order.deliveryInfo?.email || userData?.email || user.email;
      if (email) {
        const subject = `Order Confirmation #${orderNumber} - Sheetcutters`;
        const html = `
          <h1>Order Confirmed!</h1>
          <p>Thank you for your order. Your order #${orderNumber} has been received and is being processed.</p>
          <h3>Order Details:</h3>
          <ul>
            <li><strong>Material:</strong> ${order.material?.name || 'N/A'}</li>
            <li><strong>Thickness:</strong> ${order.thickness}mm</li>
            <li><strong>Price:</strong> ₹${order.price}</li>
            <li><strong>Status:</strong> Pending</li>
          </ul>
          <p>We'll notify you when your order status changes.</p>
          <p>Best regards,<br>Team Sheetcutters</p>
        `;
        sendEmail(email, subject, html).catch(err => console.error('Email send error:', err));
      }

      const customerName = order.deliveryInfo?.name || userData?.name || 'N/A';
      const customerEmail = order.deliveryInfo?.email || userData?.email || user.email || 'N/A';
      const customerPhone = order.deliveryInfo?.phone || userData?.phone || 'N/A';
      
      const telegramMessage = `
🔔 <b>NEW ORDER #${orderNumber}</b>

👤 <b>Customer:</b> ${customerName}
📧 <b>Email:</b> ${customerEmail}
📱 <b>Phone:</b> ${customerPhone}

📦 <b>Order Details:</b>
• Material: ${order.material?.name || 'N/A'}
• Thickness: ${order.thickness}mm
• Quantity: ${order.quantity || 1}

📍 <b>Shipping:</b> ${order.deliveryInfo?.state || 'N/A'}
💰 <b>Total:</b> ₹${order.price?.toFixed(2) || '0.00'}

⏰ ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
      `.trim();
      
      sendTelegramNotification(telegramMessage).catch(err => console.error('Telegram notification error:', err));

      return c.json({ success: true, orderId });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const orderId = `order:${user.id}:${Date.now()}`;
    
    // Track discount usage if discount code was applied
    let calculatedDiscountAmountKV = 0;
    if (order.discountCode) {
      const discount = await kv.get(`discount-code:${order.discountCode}`);
      if (discount) {
        // Calculate discount amount based on discount type
        const orderPrice = order.price * (order.quantity || 1);
        if (discount.type === 'percentage') {
          calculatedDiscountAmountKV = (orderPrice * (discount.value || 0)) / 100;
        } else if (discount.type === 'fixed') {
          calculatedDiscountAmountKV = discount.value || 0;
        }
        console.log(`💰 KV Mode - Single order discount: ${discount.code} (${discount.type}:${discount.value}) = ₹${calculatedDiscountAmountKV.toFixed(2)}`);
        
        // Update discount usage
        const updatedDiscount = {
          ...discount,
          usedCount: (discount.usedCount || 0) + 1,
        };
        
        // Update both discount keys
        await kv.mset([
          { key: discount.id, value: updatedDiscount },
          { key: `discount-code:${order.discountCode}`, value: updatedDiscount }
        ]);

        // Update affiliate statistics if this is an affiliate discount
        if (discount.affiliateId) {
          const affiliate = await kv.get(discount.affiliateId);
          if (affiliate) {
            const commission = (order.price * (affiliate.commissionPercentage || 0)) / 100;
            
            // Get user email for tracking
            const userData = await kv.get(`user:${user.id}`);
            const userEmail = userData?.email || user.email;
            
            // Track individual usage for fraud detection
            const usageTimestamp = Date.now();
            const usageId = `affiliate-usage:${discount.affiliateId}:${usageTimestamp}`;
            await kv.set(usageId, {
              id: usageId,
              affiliateId: discount.affiliateId,
              affiliateName: affiliate.name,
              discountCode: discount.code,
              userId: user.id,
              userEmail: userEmail,
              orderValue: order.price,
              commission: commission,
              timestamp: new Date().toISOString(),
              orderId: orderId,
              orderNumber: orderNumber,
            });
            
            // Add user email to the list if not already present
            const userEmails = affiliate.userEmails || [];
            if (userEmail && !userEmails.includes(userEmail)) {
              userEmails.push(userEmail);
            }
            
            await kv.set(discount.affiliateId, {
              ...affiliate,
              usageCount: (affiliate.usageCount || 0) + 1,
              totalSales: (affiliate.totalSales || 0) + order.price,
              totalCommission: (affiliate.totalCommission || 0) + commission,
              totalPaid: affiliate.totalPaid || 0, // Preserve existing totalPaid
              disbursements: affiliate.disbursements || [], // Preserve existing disbursements
              userEmails: userEmails, // Track user emails
            });
          }
        }
      }
    }
    
    await kv.set(orderId, {
      ...order,
      id: orderId,
      orderNumber: orderNumber,
      userId: user.id,
      status: 'pending',
      deliveryStatus: 'pending',
      paymentStatus: 'pending',
      discountAmount: calculatedDiscountAmountKV,
      createdAt: new Date().toISOString()
    });

    // Mark the file upload as associated with an order
    if (order.filePath) {
      const fileUploadId = `file-upload:${order.filePath}`;
      const fileUpload = await kv.get(fileUploadId);
      if (fileUpload) {
        await kv.set(fileUploadId, {
          ...fileUpload,
          associatedWithOrder: true,
          orderId: orderId,
        });
      }
    }

    // Mark sketch files as associated with order
    if (order.sketchFilePaths && Array.isArray(order.sketchFilePaths)) {
      for (const filePath of order.sketchFilePaths) {
        const fileUploadId = `file-upload:${filePath}`;
        const fileUpload = await kv.get(fileUploadId);
        if (fileUpload) {
          await kv.set(fileUploadId, {
            ...fileUpload,
            associatedWithOrder: true,
            orderId: orderId,
          });
        }
      }
    }

    // Award loyalty points: 1 point per ₹100 spent
    const userData = await kv.get(`user:${user.id}`);
    
    // Deduct points if they were used for this order
    let currentPoints = userData?.points || 0;
    if (order.pointsUsed && order.pointsUsed > 0) {
      currentPoints = Math.max(0, currentPoints - order.pointsUsed);
    }
    
    // Award new points based on order value
    const pointsEarned = Math.floor(order.price / 100);
    if (pointsEarned > 0) {
      currentPoints += pointsEarned;
    }
    
    // Update user's points
    if (order.pointsUsed || pointsEarned > 0) {
      await kv.set(`user:${user.id}`, {
        ...userData,
        points: currentPoints,
      });
    }

    // Update user's email subscription preference if provided in deliveryInfo
    if (order.deliveryInfo?.isSubscribed !== undefined) {
      const updatedUserData = await kv.get(`user:${user.id}`);
      await kv.set(`user:${user.id}`, {
        ...updatedUserData,
        isSubscribed: order.deliveryInfo.isSubscribed,
      });
    }

    // Send order confirmation email and Telegram notification
    const email = order.deliveryInfo?.email || userData?.email || user.email;
    if (email) {
      const subject = `Order Confirmation #${orderNumber} - Sheetcutters`;
      const html = `
        <h1>Order Confirmed!</h1>
        <p>Thank you for your order. Your order #${orderNumber} has been received and is being processed.</p>
        <h3>Order Details:</h3>
        <ul>
          <li><strong>Material:</strong> ${order.material?.name || 'N/A'}</li>
          <li><strong>Thickness:</strong> ${order.thickness}mm</li>
          <li><strong>Price:</strong> ₹${order.price}</li>
          <li><strong>Status:</strong> Pending</li>
        </ul>
        <p>We'll notify you when your order status changes.</p>
        <p>Best regards,<br>Team Sheetcutters</p>
      `;
      sendEmail(email, subject, html).catch(err => console.error('Email send error:', err));
    }

    // Send Telegram notification to admin
    const customerName = order.deliveryInfo?.name || userData?.name || 'N/A';
    const customerEmail = order.deliveryInfo?.email || userData?.email || user.email || 'N/A';
    const customerPhone = order.deliveryInfo?.phone || userData?.phone || 'N/A';
    
    const telegramMessage = `
🔔 <b>NEW ORDER #${orderNumber}</b>

👤 <b>Customer:</b> ${customerName}
📧 <b>Email:</b> ${customerEmail}
📱 <b>Phone:</b> ${customerPhone}

📦 <b>Order Details:</b>
• Material: ${order.material?.name || 'N/A'}
• Thickness: ${order.thickness}mm
• Quantity: ${order.quantity || 1}

📍 <b>Shipping:</b> ${order.deliveryInfo?.state || 'N/A'}
💰 <b>Total:</b> ₹${order.price?.toFixed(2) || '0.00'}

⏰ ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
    `.trim();
    
    sendTelegramNotification(telegramMessage).catch(err => console.error('Telegram notification error:', err));

    return c.json({ success: true, orderId });
    }
  } catch (error: any) {
    console.error('Create order error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

app.get('/make-server-8927474f/orders', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();
      
      let ordersData;
      
      if (userData?.is_admin) {
        // Admin sees all orders
        const { data } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });
        ordersData = data;
      } else {
        // Users see only their orders
        const { data } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        ordersData = data;
      }
      
      // Transform to match KV format for frontend compatibility
      const orders = ordersData?.map(order => ({
        id: order.id,
        orderNumber: order.order_number,
        userId: order.user_id,
        material: {
          id: order.material_id,
          name: order.material_name
        },
        thickness: order.thickness,
        quantity: order.quantity,
        price: order.price,
        shippingCost: order.shipping_cost,
        discountCode: order.discount_code,
        discountAmount: order.discount_amount,
        pointsUsed: order.points_used,
        filePath: order.file_path,
        sketchFilePaths: order.sketch_file_paths,
        deliveryInfo: order.delivery_info,
        status: order.status,
        fulfillmentStatus: order.status,
        deliveryStatus: order.delivery_status,
        paymentStatus: order.payment_status,
        createdAt: order.created_at
      })) || [];

      return c.json({ success: true, orders });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const userData = await kv.get(`user:${user.id}`);
      let orders;

      if (userData?.isAdmin) {
        // Admin sees all orders
        orders = await kv.getByPrefix('order:');
      } else {
        // Users see only their orders
        orders = await kv.getByPrefix(`order:${user.id}:`);
      }

      return c.json({ success: true, orders });
    }
  } catch (error: any) {
    console.error('Get orders error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

// Upload Sketch File Route (for batch cart checkout)
app.post('/make-server-8927474f/upload-sketch-file', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const formData = await c.req.formData();
    const file = formData.get('file');
    const filePath = formData.get('path') as string;
    const bucket = formData.get('bucket') as string;

    if (!file || !filePath || !bucket) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    // Ensure file is a Blob/File object
    if (!(file instanceof Blob)) {
      return c.json({ success: false, error: 'Invalid file format' }, 400);
    }

    // Convert to array buffer - handle both Blob.arrayBuffer() and Blob.bytes()
    let fileBuffer: ArrayBuffer;
    try {
      if (typeof (file as any).arrayBuffer === 'function') {
        fileBuffer = await (file as any).arrayBuffer();
      } else {
        // Fallback: try reading as stream
        const bytes = await file.bytes();
        fileBuffer = bytes.buffer;
      }
    } catch (bufferError) {
      console.error('Error converting file to buffer:', bufferError);
      throw new Error('Failed to read file data');
    }

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, fileBuffer, {
        contentType: (file as any).type || 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) {
      console.error('File upload error:', uploadError);
      return c.json({ success: false, error: `File upload failed: ${uploadError.message}` }, 500);
    }

    // Track file upload in KV store
    await kv.set(`file-upload:sketch:${filePath}`, {
      userId: user.id,
      filePath: filePath,
      fileName: (file as any).name,
      fileSize: (file as any).size,
      uploadedAt: new Date().toISOString(),
      associatedWithOrder: false,
    });

    return c.json({ success: true, filePath: filePath });
  } catch (error) {
    console.error('Upload sketch file error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Create Sketch Order Route
app.post('/make-server-8927474f/create-sketch-order', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const formData = await c.req.formData();
    const files = formData.getAll('files') as File[];
    const deliveryInfoStr = formData.get('deliveryInfo') as string;
    const notes = formData.get('notes') as string | null;
    const discountCode = formData.get('discountCode') as string | null;

    if (!deliveryInfoStr || files.length === 0) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    const deliveryInfo = JSON.parse(deliveryInfoStr);
    

    // Validate delivery info
    const hasName = deliveryInfo.name || (deliveryInfo.firstName && deliveryInfo.lastName);
    console.log('Validation checks:', {
      hasName,
      hasEmail: !!deliveryInfo.email,
      hasPhone: !!deliveryInfo.phone,
      hasAddress: !!deliveryInfo.address,
    });
    
    if (!hasName || !deliveryInfo.email || !deliveryInfo.phone || !deliveryInfo.address) {
      return c.json({ success: false, error: 'Incomplete delivery information' }, 400);
    }

    // Upload files to Supabase Storage
    const uploadedFilePaths: string[] = [];
    const uploadedFileNames: string[] = [];
    const sketchBucketName = 'make-8927474f-sketch-files';

    // Ensure sketch bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const sketchBucketExists = buckets?.some(bucket => bucket.name === sketchBucketName);
    if (!sketchBucketExists) {
      await supabase.storage.createBucket(sketchBucketName, { public: false });
    }

    // Upload each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const filePath = `${user.id}/${timestamp}-${randomStr}-${file.name}`;

      const arrayBuffer = await file.arrayBuffer();
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(sketchBucketName)
        .upload(filePath, arrayBuffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('File upload error:', uploadError);
        // Clean up already uploaded files
        for (const path of uploadedFilePaths) {
          await supabase.storage.from(sketchBucketName).remove([path]);
        }
        return c.json({ success: false, error: `File upload failed: ${uploadError.message}` }, 500);
      }

      uploadedFilePaths.push(filePath);
      uploadedFileNames.push(file.name);

      // Track file upload in KV store
      await kv.set(`file-upload:sketch:${filePath}`, {
        userId: user.id,
        filePath: filePath,
        fileName: file.name,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
        associatedWithOrder: false,
      });
    }

    // Get configured design service price
    const configuredPrice = await kv.get('design_service_price') || 150;
    
    // Apply discount if provided
    let finalPrice = configuredPrice; // Base sketch service price
    let discount = 0;
    let discountType: 'percentage' | 'fixed' | null = null;

    if (discountCode) {
      const discountData = await kv.get(`discount:${discountCode.toUpperCase()}`);
      if (discountData && discountData.isActive) {
        if (discountData.type === 'percentage') {
          discount = (finalPrice * discountData.value) / 100;
          discountType = 'percentage';
        } else {
          discount = discountData.value;
          discountType = 'fixed';
        }
        finalPrice = Math.max(0, finalPrice - discount);
      }
    }

    // Generate sequential order number
    const orderNumber = await generateOrderNumber();
    
    // Get or create user record for SQL mode
    let userId = user.id; // Default to auth ID
    let userRecord = null;
    
    if (USE_SQL_TABLES) {
      const { data: foundUser } = await supabase
        .from('users')
        .select('id, auth_user_id, loyalty_points')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!foundUser) {
        const { data: newUser } = await supabase
          .from('users')
          .insert({
            auth_user_id: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.email?.split('@')[0],
            is_admin: false,
            loyalty_points: 0,
            created_at: new Date().toISOString()
          })
          .select('id, auth_user_id, loyalty_points')
          .single();
        userRecord = newUser;
      } else {
        userRecord = foundUser;
      }
      userId = userRecord?.id || user.id;
    }
    
    // Create order ID (use UUID for SQL mode, old format for KV mode)
    const orderId = USE_SQL_TABLES 
      ? crypto.randomUUID() 
      : `order:${user.id}:${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      console.log('📝 [SKETCH ORDER] Creating sketch order in SQL mode');
      
      // Insert sketch order into SQL
      const { data: insertedOrder, error: insertError } = await supabase
        .from('orders')
        .insert({
          id: orderId,
          order_number: orderNumber,
          user_id: userId,
          material_id: 'sketch-service',
          material_name: 'Sketch Service',
          thickness: 0,
          quantity: 1,
          file_path: null,
          sketch_file_paths: uploadedFilePaths,
          price: finalPrice,
          total_amount: finalPrice,
          subtotal: finalPrice,
          shipping_cost: 0,
          discount_code: discountCode,
          discount_amount: discount,
          points_used: 0,
          delivery_info: deliveryInfo,
          delivery_address: deliveryInfo?.address || null,
          delivery_apartment: deliveryInfo?.apartment || null,
          delivery_city: deliveryInfo?.city || null,
          delivery_state: deliveryInfo?.state || null,
          delivery_pin_code: deliveryInfo?.pinCode || null,
          delivery_country: deliveryInfo?.country || null,
          delivery_gst_number: deliveryInfo?.gstNumber || null,
          delivery_first_name: deliveryInfo?.firstName || null,
          delivery_last_name: deliveryInfo?.lastName || null,
          delivery_phone: deliveryInfo?.phone || null,
          notes: notes || null,
          status: 'pending',
          delivery_status: 'pending',
          payment_status: 'pending',
          created_at: new Date().toISOString()
        })
        .select();

      if (insertError) {
        console.error('❌ [SKETCH ORDER] Database insert failed:', insertError);
        // Clean up uploaded files on error
        for (const path of uploadedFilePaths) {
          await supabase.storage.from(sketchBucketName).remove([path]);
        }
        throw new Error(`Database insert failed: ${insertError.message}`);
      }

      console.log('✅ [SKETCH ORDER] Order saved successfully:', orderId);

      // Save delivery info for autofill
      if (deliveryInfo) {
        const result = await saveDeliveryInfo(userId, deliveryInfo);
        if (result.success) {
          console.log('✅ [SKETCH ORDER] Delivery info saved successfully');
        } else {
          console.error('❌ [SKETCH ORDER] Failed to save delivery info:', result.error);
        }
      }

      // Award loyalty points (1 point per ₹100 spent)
      const pointsEarned = Math.floor(finalPrice / 100);
      if (pointsEarned > 0 && userRecord) {
        const currentPoints = userRecord.loyalty_points || 0;
        await supabase
          .from('users')
          .update({ loyalty_points: currentPoints + pointsEarned })
          .eq('id', userId);
        console.log(`✅ [SKETCH ORDER] Awarded ${pointsEarned} loyalty points`);
      }

      // Update user's email subscription preference if provided in deliveryInfo
      if (deliveryInfo?.isSubscribed !== undefined) {
        await supabase
          .from('users')
          .update({ is_subscribed: deliveryInfo.isSubscribed })
          .eq('auth_user_id', user.id);
        console.log(`✅ [SKETCH ORDER] Updated subscription preference: ${deliveryInfo.isSubscribed}`);
      }
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const order = {
        id: orderId,
        orderNumber: orderNumber,
        userId: user.id,
        serviceType: 'sketch',
        isSketchService: true,
        sketchFilePaths: uploadedFilePaths,
        sketchFileNames: uploadedFileNames,
        fileName: `Sketch Service (${files.length} files)`,
        fileCount: files.length,
        price: finalPrice,
        originalPrice: configuredPrice,
        discount: discount,
        discountCode: discountCode || null,
        discountType: discountType,
        deliveryInfo: deliveryInfo,
        notes: notes || '',
        status: 'pending',
        deliveryStatus: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await kv.set(orderId, order);

      // Mark files as associated with order
      for (const filePath of uploadedFilePaths) {
        const fileUploadId = `file-upload:sketch:${filePath}`;
        const fileUpload = await kv.get(fileUploadId);
        if (fileUpload) {
          await kv.set(fileUploadId, {
            ...fileUpload,
            associatedWithOrder: true,
            orderId: orderId,
          });
        }
      }

      // Award loyalty points (150 rupees = 1 point)
      const pointsEarned = Math.floor(finalPrice / 150);
      const userKey = `user:${user.id}`;
      const userData = await kv.get(userKey);
      
      if (pointsEarned > 0 && userData) {
        await kv.set(userKey, {
          ...userData,
          loyaltyPoints: (userData.loyaltyPoints || 0) + pointsEarned,
        });
      }

      // Update user's email subscription preference if provided in deliveryInfo
      if (deliveryInfo?.isSubscribed !== undefined) {
        const updatedUserData = await kv.get(userKey);
        await kv.set(userKey, {
          ...updatedUserData,
          isSubscribed: deliveryInfo.isSubscribed,
        });
      }
    }

    // Send Telegram notification to admin for sketch order
    const customerName = deliveryInfo?.name || (deliveryInfo?.firstName && deliveryInfo?.lastName ? `${deliveryInfo.firstName} ${deliveryInfo.lastName}` : null) || (USE_SQL_TABLES ? userRecord?.name : null) || 'N/A';
    const customerEmail = deliveryInfo?.email || (USE_SQL_TABLES ? userRecord?.email : null) || user.email || 'N/A';
    const customerPhone = deliveryInfo?.phone || (USE_SQL_TABLES ? userRecord?.phone : null) || 'N/A';
    
    const telegramMessage = `
🔔 <b>NEW SKETCH ORDER #${orderNumber}</b>

👤 <b>Customer:</b> ${customerName}
📧 <b>Email:</b> ${customerEmail}
📱 <b>Phone:</b> ${customerPhone}

📦 <b>Order Details:</b>
• Service: CAD Design Service
• Files: ${files.length} file(s)
${notes ? `• Notes: ${notes}` : ''}

📍 <b>Shipping:</b> ${deliveryInfo?.state || 'N/A'}
💰 <b>Total:</b> ₹${finalPrice?.toFixed(2) || '0.00'}
${discount > 0 ? `💸 <b>Discount:</b> -₹${discount.toFixed(2)}` : ''}

⏰ ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
    `.trim();
    
    sendTelegramNotification(telegramMessage).catch(err => console.error('Telegram notification error:', err));

    // Send order confirmation email
    if (customerEmail && customerEmail !== 'N/A') {
      try {
        await sendOrderConfirmationEmail({
          email: customerEmail,
          customerName: customerName,
          orderNumber: orderNumber,
          items: [{
            fileName: `CAD Design Service (${files.length} files)`,
            material: 'Sketch Service',
            thickness: 0,
            quantity: 1,
            price: finalPrice,
          }],
          subtotal: finalPrice,
          shippingCost: 0,
          discount: discount,
          pointsUsed: 0,
          total: finalPrice,
          deliveryAddress: {
            address: deliveryInfo?.address || '',
            apartment: deliveryInfo?.apartment,
            city: deliveryInfo?.city || '',
            state: deliveryInfo?.state || '',
            pinCode: deliveryInfo?.pinCode || '',
          },
        });
        console.log(`✅ [SKETCH ORDER] Confirmation email sent to ${customerEmail}`);
      } catch (emailError) {
        console.error('❌ [SKETCH ORDER] Failed to send confirmation email:', emailError);
      }
    }

    return c.json({ 
      success: true, 
      orderId: orderId,
      uploadedFiles: uploadedFilePaths.length,
      finalPrice: finalPrice
    });

  } catch (error) {
    console.error('Create sketch order error:', error);
    return c.json({ success: false, error: error.message || 'Failed to create sketch order' }, 500);
  }
});

// File Cleanup Route - Admin only
// Cleans up old files that are not associated with orders
// Guest files: 45 days, User files: 180 days
app.post('/make-server-8927474f/cleanup-files', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const userData = await kv.get(`user:${user.id}`);
    if (!userData?.isAdmin) {
      return c.json({ success: false, error: 'Admin access required' }, 403);
    }

    const now = new Date();
    const fileUploads = await kv.getByPrefix('file-upload:');
    
    let deletedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const deletedFiles: string[] = [];

    for (const fileUpload of fileUploads) {
      try {
        const uploadedAt = new Date(fileUpload.uploadedAt);
        const ageInDays = (now.getTime() - uploadedAt.getTime()) / (1000 * 60 * 60 * 24);
        
        // Skip files associated with orders
        if (fileUpload.associatedWithOrder) {
          skippedCount++;
          continue;
        }

        // Check retention policy
        let shouldDelete = false;
        if (fileUpload.userId === 'guest' && ageInDays > 45) {
          shouldDelete = true;
        } else if (fileUpload.userId !== 'guest' && ageInDays > 180) {
          shouldDelete = true;
        }

        if (shouldDelete) {
          // Delete from storage
          const { error: deleteError } = await supabase.storage
            .from(bucketName)
            .remove([fileUpload.filePath]);

          if (deleteError) {
            console.error(`Error deleting file ${fileUpload.filePath}:`, deleteError);
            errorCount++;
            continue;
          }

          // Delete from KV store
          await kv.del(`file-upload:${fileUpload.filePath}`);
          
          deletedFiles.push(fileUpload.filePath);
          deletedCount++;
        } else {
          skippedCount++;
        }
      } catch (err) {
        console.error(`Error processing file ${fileUpload.filePath}:`, err);
        errorCount++;
      }
    }

    return c.json({ 
      success: true, 
      message: `Cleanup completed: ${deletedCount} files deleted, ${skippedCount} files kept, ${errorCount} errors`,
      deletedCount,
      skippedCount,
      errorCount,
      deletedFiles: deletedFiles.slice(0, 10) // Return first 10 for preview
    });
  } catch (error) {
    console.error('Cleanup files error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

// Admin Routes - Additional Options
app.get('/make-server-8927474f/additional-options', async (c) => {
  try {
    const defaultOptions = {
      options: [
        { id: 'anodising', name: 'Anodising', price: 0, applicableMaterials: ['Aluminum'], description: 'Only available for Aluminum' },
        { id: 'polishing', name: 'Polishing', price: 0, description: 'Surface polishing finish' },
        { id: 'countersinking', name: 'Countersinking', price: 0, description: 'Countersink edge treatment' },
        { id: 'hardening', name: 'Hardening', price: 0, applicableMaterials: ['Mild Steel'], description: 'Only available for Mild Steel' },
        { id: 'countersink-holes', name: 'Countersink Holes', price: 0, description: 'Countersink holes treatment' },
      ]
    };

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'admin:additional-options')
        .single();
      
      const options = data?.value || defaultOptions;
      return c.json(options);
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const options = await kv.get('admin:additional-options') || defaultOptions;
      return c.json(options);
    }
  } catch (error: any) {
    console.error('Get additional options error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

app.put('/make-server-8927474f/additional-options', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const optionData = await c.req.json();
    
    // Get current options or initialize with defaults
    const defaultOptions = [
      { id: 'anodising', name: 'Anodising', price: 0, applicableMaterials: ['Aluminum'], description: 'Only available for Aluminum' },
      { id: 'polishing', name: 'Polishing', price: 0, description: 'Surface polishing finish' },
      { id: 'countersinking', name: 'Countersinking', price: 0, description: 'Countersink edge treatment' },
      { id: 'hardening', name: 'Hardening', price: 0, applicableMaterials: ['Mild Steel'], description: 'Only available for Mild Steel' },
      { id: 'countersink-holes', name: 'Countersink Holes', price: 0, description: 'Countersink holes treatment' },
    ];
    
    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!userData?.is_admin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'admin:additional-options')
        .single();
      
      const currentOptions = data?.value || { options: defaultOptions };
      
      // Ensure we have options array
      if (!currentOptions.options || currentOptions.options.length === 0) {
        currentOptions.options = defaultOptions;
      }
      
      const updatedOptions = currentOptions.options.map((opt: any) => 
        opt.id === optionData.id ? { ...opt, ...optionData } : opt
      );

      await supabase
        .from('settings')
        .upsert({
          key: 'admin:additional-options',
          value: { options: updatedOptions },
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      return c.json({ success: true });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      const currentOptions = await kv.get('admin:additional-options') || { options: defaultOptions };
      
      // Ensure we have options array
      if (!currentOptions.options || currentOptions.options.length === 0) {
        currentOptions.options = defaultOptions;
      }
      
      const updatedOptions = currentOptions.options.map((opt: any) => 
        opt.id === optionData.id ? { ...opt, ...optionData } : opt
      );

      await kv.set('admin:additional-options', { options: updatedOptions });
      return c.json({ success: true });
    }
  } catch (error: any) {
    console.error('Update additional option error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

app.post('/make-server-8927474f/additional-options/reset', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    // Reset to default options
    const defaultOptions = [
      { id: 'anodising', name: 'Anodising', price: 0, applicableMaterials: ['Aluminum'], description: 'Only available for Aluminum' },
      { id: 'polishing', name: 'Polishing', price: 0, description: 'Surface polishing finish' },
      { id: 'countersinking', name: 'Countersinking', price: 0, description: 'Countersink edge treatment' },
      { id: 'hardening', name: 'Hardening', price: 0, applicableMaterials: ['Mild Steel'], description: 'Only available for Mild Steel' },
      { id: 'countersink-holes', name: 'Countersink Holes', price: 0, description: 'Countersink holes treatment' },
    ];

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!userData?.is_admin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      await supabase
        .from('settings')
        .upsert({
          key: 'admin:additional-options',
          value: { options: defaultOptions },
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      return c.json({ success: true });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      await kv.set('admin:additional-options', { options: defaultOptions });
      return c.json({ success: true });
    }
  } catch (error: any) {
    console.error('Reset additional options error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

// Admin Routes - Orders Management
app.get('/make-server-8927474f/admin/orders', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!userData?.is_admin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      // Get query parameters for filtering and pagination
      const url = new URL(c.req.url);
      const searchQuery = url.searchParams.get('search')?.toLowerCase() || '';
      const statusFilter = url.searchParams.get('status') || 'all';
      const materialFilter = url.searchParams.get('material') || 'all';
      const dateFrom = url.searchParams.get('dateFrom');
      const dateTo = url.searchParams.get('dateTo');
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const offset = (page - 1) * limit;

      // Build query with filters
      console.log('📦 Admin orders: Fetching from SQL database...');
      let query = supabase
        .from('orders')
        .select('*', { count: 'exact' });
      
      // Apply status filter
      if (statusFilter && statusFilter !== 'all') {
        console.log(`📦 Admin orders: Applying status filter: ${statusFilter}`);
        query = query.eq('delivery_status', statusFilter);
      }
      
      // Apply material filter
      if (materialFilter && materialFilter !== 'all') {
        console.log(`📦 Admin orders: Applying material filter: ${materialFilter}`);
        query = query.eq('material_name', materialFilter);
      }
      
      // Apply date filters
      if (dateFrom) {
        console.log(`📦 Admin orders: Applying date from filter: ${dateFrom}`);
        query = query.gte('created_at', dateFrom);
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        console.log(`📦 Admin orders: Applying date to filter: ${toDate.toISOString()}`);
        query = query.lte('created_at', toDate.toISOString());
      }
      
      // Order by date descending
      query = query.order('created_at', { ascending: false });

      const { data: ordersData, count, error: queryError } = await query;
      
      if (queryError) {
        console.error('❌ Admin orders: SQL query error:', queryError);
      } else {
        console.log(`✅ Admin orders: Found ${ordersData?.length || 0} orders`);
      }
      
      if (queryError) throw queryError;

      // Enrich orders with delivery info and transform to match expected format
      let enrichedOrders = (ordersData || []).map((order: any) => {
        const deliveryInfo = typeof order.delivery_info === 'string' 
          ? JSON.parse(order.delivery_info) 
          : order.delivery_info || {};
        
        return {
          ...order,
          id: order.id,
          orderNumber: order.order_number,
          userId: order.user_id,
          customerName: deliveryInfo.firstName && deliveryInfo.lastName 
            ? `${deliveryInfo.firstName} ${deliveryInfo.lastName}` 
            : deliveryInfo.name || order.delivery_first_name || 'Guest',
          customerEmail: deliveryInfo.email || 'N/A',
          date: order.created_at,
          destination: order.delivery_state || deliveryInfo.state || 'N/A',
          paymentStatus: order.payment_status || 'pending',
          fulfillmentStatus: order.status || 'pending',
          deliveryStatus: order.delivery_status || 'pending',
          material: { name: order.material_name, id: order.material_id },
          materialName: order.material_name,
          fileName: order.file_path?.split('/').pop() || 'N/A',
          filePath: order.file_path,
          thickness: order.thickness,
          quantity: order.quantity || 1,
          price: order.price,
          totalPrice: order.total_amount,
          shippingCost: order.shipping_cost,
          shippingCarrier: order.shipping_carrier,
          totalWeight: 0,
          discountCode: order.discount_code,
          discountAmount: order.discount_amount,
          pointsUsed: order.points_used,
          batchId: order.batch_id,
          isSketchService: order.material_id === 'sketch' || order.material_id === 'sketch-service' || order.material_name === 'Sketch Service',
          sketchFilePaths: order.sketch_file_paths || [],
          sketchFileNames: order.sketch_file_paths?.map((path: string, i: number) => 
            path.split('/').pop() || `Sketch File ${i + 1}`
          ) || [],
          dxfData: null,
          deliveryInfo: deliveryInfo,
          trackingUrl: order.tracking_url,
          notes: order.notes || null,
          // Payment Transaction Details (for compliance & accounting)
          paymentId: order.payment_id,
          paymentGateway: order.payment_gateway,
          paymentMethod: order.payment_method,
          paymentVerifiedAt: order.payment_verified_at,
          paymentAmount: order.payment_amount,
          razorpayOrderId: order.razorpay_order_id,
          razorpaySignature: order.razorpay_signature,
          paymentFailedReason: order.payment_failed_reason,
          paymentRefundId: order.payment_refund_id,
          paymentRefundedAt: order.payment_refunded_at,
          paymentMetadata: order.payment_metadata,
          color: order.color || null,    // Selected colour for non-metal materials
        };
      });

      // Apply search filter (client-side for complex search)
      if (searchQuery) {
        enrichedOrders = enrichedOrders.filter(order => {
          const searchableText = `
            ${order.orderNumber} 
            ${order.customerName} 
            ${order.customerEmail} 
            ${order.delivery_info?.email || ''}
            ${order.delivery_info?.phone || ''}
            ${order.destination}
          `.toLowerCase();
          return searchableText.includes(searchQuery);
        });
      }

      // Group orders by batchId for pagination
      const orderGroups: Record<string, any[]> = {};
      enrichedOrders.forEach(order => {
        let groupId = order.batchId || order.id;
        if (!orderGroups[groupId]) {
          orderGroups[groupId] = [];
        }
        orderGroups[groupId].push(order);
      });

      // Convert to array of groups and paginate
      const groupsArray = Object.values(orderGroups);
      const totalOrderGroups = groupsArray.length;
      const paginatedGroups = groupsArray.slice(offset, offset + limit);
      const paginatedOrders = paginatedGroups.flat();

      return c.json({ 
        success: true, 
        orders: paginatedOrders,
        pagination: {
          page,
          limit,
          total: totalOrderGroups,
          totalPages: Math.ceil(totalOrderGroups / limit),
          hasNextPage: offset + limit < totalOrderGroups,
          hasPrevPage: page > 1
        }
      });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      // Get query parameters for filtering and pagination
      const url = new URL(c.req.url);
    const searchQuery = url.searchParams.get('search')?.toLowerCase() || '';
    const statusFilter = url.searchParams.get('status') || 'all';
    const materialFilter = url.searchParams.get('material') || 'all';
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    const orders = await kv.getByPrefix('order:');
    
    // Collect unique user IDs to avoid N+1 lookups
    const userIds = [...new Set(orders.map((o: any) => o.userId).filter(Boolean))];
    const userKeys = userIds.map(id => `user:${id}`);
    
    // Batch fetch users
    const users = await kv.mget(userKeys);
    const userMap = new Map(users.map((u: any) => [u.id, u]));
    
    // Enrich orders with user data
    let enrichedOrders = orders.map((order: any) => {
      const orderUser = userMap.get(order.userId);
      const enriched = {
        ...order,
        customerName: orderUser?.name || 'Guest',
        customerEmail: orderUser?.email || 'N/A',
        orderNumber: order.orderNumber || 'N/A', // Use stored orderNumber
        date: order.createdAt,
        destination: orderUser?.state || 'N/A', // Only show state to save space
        paymentStatus: order.paymentStatus || 'pending',
        fulfillmentStatus: order.fulfillmentStatus || 'pending',
        deliveryStatus: order.deliveryStatus || 'pending',
      };
      // Log shipping info for debugging
      if (order.shippingCost) {
        console.log(`📦 Admin orders: Order ${order.id} has shipping: ₹${order.shippingCost}, carrier: ${order.shippingCarrier}`);
      }
      return enriched;
    });

    // Apply filters
    if (searchQuery) {
      enrichedOrders = enrichedOrders.filter(order => {
        const searchableText = `
          ${order.orderNumber} 
          ${order.customerName} 
          ${order.customerEmail} 
          ${order.deliveryInfo?.email || ''}
          ${order.deliveryInfo?.phone || ''}
          ${order.destination}
        `.toLowerCase();
        return searchableText.includes(searchQuery);
      });
    }

    if (statusFilter && statusFilter !== 'all') {
      enrichedOrders = enrichedOrders.filter(order => order.deliveryStatus === statusFilter);
    }

    if (materialFilter && materialFilter !== 'all') {
      enrichedOrders = enrichedOrders.filter(order => order.material === materialFilter);
    }

    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      enrichedOrders = enrichedOrders.filter(order => new Date(order.date) >= fromDate);
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      enrichedOrders = enrichedOrders.filter(order => new Date(order.date) <= toDate);
    }

    // Sort by date descending (newest first)
    enrichedOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Group orders by batchId for correct pagination counting
    const orderGroups: Record<string, any[]> = {};
    enrichedOrders.forEach(order => {
      let groupId = order.batchId;
      
      if (!groupId) {
        // Try to infer batch from ID pattern if batchId is missing
        const idParts = order.id.split(':');
        const lastPart = idParts[idParts.length - 1];
        if (lastPart.includes('-')) {
          // It's likely a batch item "timestamp-index"
          const timestamp = lastPart.split('-')[0];
          groupId = `inferred-batch:${idParts.slice(0, -1).join(':')}:${timestamp}`;
        } else {
          groupId = order.id;
        }
      }
      
      if (!orderGroups[groupId]) {
        orderGroups[groupId] = [];
      }
      orderGroups[groupId].push(order);
    });

    // Convert to array of groups
    const groupsArray = Object.values(orderGroups);
    
    // Apply pagination to groups (not individual items)
    const totalOrderGroups = groupsArray.length;
    const paginatedGroups = groupsArray.slice(offset, offset + limit);
    
    // Flatten the paginated groups back into individual orders
    const paginatedOrders = paginatedGroups.flat();

    return c.json({ 
      success: true, 
      orders: paginatedOrders,
      pagination: {
        page,
        limit,
        total: totalOrderGroups,
        totalPages: Math.ceil(totalOrderGroups / limit),
        hasNextPage: offset + limit < totalOrderGroups,
        hasPrevPage: page > 1
      }
    });
    }
  } catch (error: any) {
    console.error('Get admin orders error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

// Bulk update orders endpoint - Updates multiple orders at once for better performance
// IMPORTANT: This must come BEFORE the /admin/orders/:id route to avoid :id matching "bulk"
app.patch('/make-server-8927474f/admin/orders/bulk', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const { orderIds, updates } = await c.req.json();

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!userData?.is_admin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      console.log('Bulk update request:', { orderIds, updates });
      
      if (!Array.isArray(orderIds) || orderIds.length === 0) {
        return c.json({ success: false, error: 'orderIds must be a non-empty array' }, 400);
      }

      if (!updates || typeof updates !== 'object') {
        return c.json({ success: false, error: 'updates must be an object' }, 400);
      }

      // Transform camelCase updates to snake_case for SQL
      const sqlUpdates: any = { updated_at: new Date().toISOString() };
      if (updates.deliveryStatus) sqlUpdates.delivery_status = updates.deliveryStatus;
      if (updates.paymentStatus) sqlUpdates.payment_status = updates.paymentStatus;
      if (updates.fulfillmentStatus) sqlUpdates.status = updates.fulfillmentStatus;
      if (updates.trackingUrl) sqlUpdates.tracking_url = updates.trackingUrl;
      if (updates.shippingCarrier) sqlUpdates.shipping_carrier = updates.shippingCarrier;
      if (updates.notes) sqlUpdates.notes = updates.notes;

      // Fetch orders for email notification
      const { data: orders } = await supabase
        .from('orders')
        .select('*, users!orders_user_id_fkey(email)')
        .in('id', orderIds);

      // Perform bulk update
      const { error: updateError, count } = await supabase
        .from('orders')
        .update(sqlUpdates)
        .in('id', orderIds);

      if (updateError) throw updateError;

      // Send email notifications if delivery status changed
      if (updates.deliveryStatus && orders) {
        const emailPromises = orders.map(async (order: any) => {
          const email = order.delivery_info?.email || order.users?.email;
          
          if (email) {
            const subject = `Order Update: #${order.order_number} is ${updates.deliveryStatus}`;
            const html = `
              <h1>Order Status Update</h1>
              <p>Your order #${order.order_number} status has been updated to: <strong>${updates.deliveryStatus}</strong></p>
              ${updates.trackingUrl ? `<p>Tracking URL: <a href="${updates.trackingUrl}">${updates.trackingUrl}</a></p>` : ''}
              <p>Thank you for choosing Sheetcutters!</p>
            `;
            return sendEmail(email, subject, html).catch(err => 
              console.error(`Email send error for order ${order.id}:`, err)
            );
          }
        });

        Promise.all(emailPromises).catch(err => console.error('Bulk email error:', err));
      }

      return c.json({ 
        success: true, 
        updatedCount: count || 0,
        skippedCount: orderIds.length - (count || 0)
      });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }
    
    console.log('Bulk update request:', { orderIds, updates });
    
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return c.json({ success: false, error: 'orderIds must be a non-empty array' }, 400);
    }

    if (!updates || typeof updates !== 'object') {
      return c.json({ success: false, error: 'updates must be an object' }, 400);
    }

    // Get all orders that need to be updated
    // Note: kv.mget doesn't preserve order or return nulls for missing keys
    // So we need to fetch each order individually and map back correctly
    const orderPromises = orderIds.map(id => kv.get(id));
    const orders = await Promise.all(orderPromises);
    console.log('Orders fetched:', orders.map((o, i) => ({ id: orderIds[i], found: o !== null })));
    
    // Create pairs of orderId and order data, filtering out nulls
    const validOrderPairs = orders
      .map((order, index) => ({ orderId: orderIds[index], order }))
      .filter(pair => pair.order !== null);

    if (validOrderPairs.length === 0) {
      console.error('No valid orders found for IDs:', orderIds);
      return c.json({ success: false, error: 'No valid orders found' }, 404);
    }

    // Update all orders
    const updatePromises = validOrderPairs.map(({ orderId, order }) => {
      return kv.set(orderId, { ...order, ...updates, updatedAt: new Date().toISOString() });
    });

    await Promise.all(updatePromises);

    // Send email notifications if delivery status changed
    if (updates.deliveryStatus) {
      const emailPromises = validOrderPairs.map(async ({ order }) => {
        const orderUser = await kv.get(`user:${order.userId}`);
        const email = order.deliveryInfo?.email || orderUser?.email || order.customerEmail;
        
        if (email) {
          const subject = `Order Update: #${order.orderNumber || order.id.split(':').pop()} is ${updates.deliveryStatus}`;
          const html = `
            <h1>Order Status Update</h1>
            <p>Your order #${order.orderNumber || order.id.split(':').pop()} status has been updated to: <strong>${updates.deliveryStatus}</strong></p>
            ${updates.trackingUrl ? `<p>Tracking URL: <a href="${updates.trackingUrl}">${updates.trackingUrl}</a></p>` : ''}
            <p>Thank you for choosing Sheetcutters!</p>
          `;
          // Fire and forget email
          return sendEmail(email, subject, html).catch(err => 
            console.error(`Email send error for order ${order.id}:`, err)
          );
        }
      });

      // Fire and forget all emails
      Promise.all(emailPromises).catch(err => console.error('Bulk email error:', err));
    }

    return c.json({ 
      success: true, 
      updatedCount: validOrderPairs.length,
      skippedCount: orderIds.length - validOrderPairs.length
    });
    }
  } catch (error: any) {
    console.error('Bulk update orders error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

app.patch('/make-server-8927474f/admin/orders/:id', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const orderId = c.req.param('id');
    const updates = await c.req.json();

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!userData?.is_admin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      // Fetch the current order
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
      
      if (fetchError || !order) {
        console.error('Order fetch error:', fetchError, 'Order ID:', orderId);
        return c.json({ success: false, error: 'Order not found' }, 404);
      }

      // Get user email separately
      let userEmail = null;
      if (order.user_id) {
        const { data: userData } = await supabase
          .from('users')
          .select('email')
          .eq('id', order.user_id)
          .single();
        userEmail = userData?.email;
      }

      // Transform camelCase updates to snake_case
      const sqlUpdates: any = {};
      if (updates.deliveryStatus) sqlUpdates.delivery_status = updates.deliveryStatus;
      if (updates.paymentStatus) sqlUpdates.payment_status = updates.paymentStatus;
      if (updates.fulfillmentStatus) sqlUpdates.status = updates.fulfillmentStatus;
      if (updates.trackingUrl) sqlUpdates.tracking_url = updates.trackingUrl;
      if (updates.shippingCarrier) sqlUpdates.shipping_carrier = updates.shippingCarrier;
      if (updates.notes) sqlUpdates.notes = updates.notes;
      if (updates.shippingCost) sqlUpdates.shipping_cost = updates.shippingCost;

      // Update order
      const { error: updateError } = await supabase
        .from('orders')
        .update(sqlUpdates)
        .eq('id', orderId);

      if (updateError) throw updateError;

      // Send email notification if status changed
      if (updates.deliveryStatus && updates.deliveryStatus !== order.delivery_status) {
        const email = order.delivery_info?.email || userEmail;
        
        if (email) {
          const subject = `Order Update: #${order.order_number} is ${updates.deliveryStatus}`;
          const html = `
            <h1>Order Status Update</h1>
            <p>Your order #${order.order_number} status has been updated to: <strong>${updates.deliveryStatus}</strong></p>
            ${updates.trackingUrl ? `<p>Tracking URL: <a href="${updates.trackingUrl}">${updates.trackingUrl}</a></p>` : ''}
            <p>Thank you for choosing Sheetcutters!</p>
          `;
          sendEmail(email, subject, html).catch(err => console.error('Email send error:', err));
        }
      }

      return c.json({ success: true });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }
      
      const order = await kv.get(orderId);
      if (!order) {
        return c.json({ success: false, error: 'Order not found' }, 404);
      }

      await kv.set(orderId, { ...order, ...updates });

    // Send email notification if status changed
    if (updates.deliveryStatus && updates.deliveryStatus !== order.deliveryStatus) {
       const orderUser = await kv.get(`user:${order.userId}`);
       const email = order.deliveryInfo?.email || orderUser?.email || order.customerEmail;
       
       if (email) {
         const subject = `Order Update: #${order.orderNumber || order.id.split(':').pop()} is ${updates.deliveryStatus}`;
         const html = `
           <h1>Order Status Update</h1>
           <p>Your order #${order.orderNumber || order.id.split(':').pop()} status has been updated to: <strong>${updates.deliveryStatus}</strong></p>
           ${updates.trackingUrl ? `<p>Tracking URL: <a href="${updates.trackingUrl}">${updates.trackingUrl}</a></p>` : ''}
           <p>Thank you for choosing Sheetcutters!</p>
         `;
         // Fire and forget email
         sendEmail(email, subject, html);
       }
    }

    return c.json({ success: true });
    }
  } catch (error: any) {
    console.error('Update order error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

// Dedicated status update route
app.patch('/make-server-8927474f/admin/orders/:id/status', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const orderId = c.req.param('id');
    const { status, trackingUrl, notes } = await c.req.json();

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!userData?.is_admin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      // Fetch order
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('*, users!orders_user_id_fkey(email)')
        .eq('id', orderId)
        .single();
      
      if (fetchError || !order) {
        return c.json({ success: false, error: 'Order not found' }, 404);
      }

      // Build updates
      const sqlUpdates: any = {
        delivery_status: status,
        updated_at: new Date().toISOString()
      };
      if (trackingUrl) sqlUpdates.tracking_url = trackingUrl;
      if (notes) sqlUpdates.admin_notes = notes;

      // Update order
      await supabase
        .from('orders')
        .update(sqlUpdates)
        .eq('id', orderId);

      // Send email notification
      const email = order.delivery_info?.email || order.users?.email;
      
      if (email) {
        const statusMessages = {
          pending: 'received and is being processed',
          processing: 'being processed',
          shipped: 'shipped',
          delivered: 'delivered',
          cancelled: 'cancelled',
        };

        const subject = `Order Status Update: #${order.order_number}`;
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Order Status Update</h2>
            <p>Your order <strong>#${order.order_number}</strong> is now <strong>${statusMessages[status] || status}</strong>.</p>
            ${trackingUrl ? `<p><a href="${trackingUrl}" style="color: #0066cc;">Track your order</a></p>` : ''}
            ${notes ? `<p style="color: #666; font-style: italic;">${notes}</p>` : ''}
            <p>Thank you for choosing SheetCutters!</p>
          </div>
        `;
        sendEmail(email, subject, html).catch(err => console.error('Email send error:', err));
      }

      return c.json({ success: true });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }
      
      const order = await kv.get(orderId);
      if (!order) {
        return c.json({ success: false, error: 'Order not found' }, 404);
      }

      const updates = {
        deliveryStatus: status,
        updatedAt: new Date().toISOString(),
      };

      if (trackingUrl) updates.trackingUrl = trackingUrl;
      if (notes) updates.adminNotes = notes;

      await kv.set(orderId, { ...order, ...updates });

    // Send email notification
    const orderUser = await kv.get(`user:${order.userId}`);
    const email = order.deliveryInfo?.email || orderUser?.email;
    
    if (email) {
      const statusMessages = {
        pending: 'received and is being processed',
        processing: 'being processed',
        shipped: 'shipped',
        delivered: 'delivered',
        cancelled: 'cancelled',
      };

      const subject = `Order Status Update: #${order.orderNumber || order.id.split(':').pop()}`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Order Status Update</h2>
          <p>Your order <strong>#${order.orderNumber || order.id.split(':').pop()}</strong> is now <strong>${statusMessages[status] || status}</strong>.</p>
          ${trackingUrl ? `<p><a href="${trackingUrl}" style="color: #0066cc;">Track your order</a></p>` : ''}
          ${notes ? `<p style="color: #666; font-style: italic;">${notes}</p>` : ''}
          <p>Thank you for choosing SheetCutters!</p>
        </div>
      `;
      // Fire and forget email
      sendEmail(email, subject, html).catch(err => console.error('Email send error:', err));
    }

    return c.json({ success: true });
    }
  } catch (error: any) {
    console.error('Update order status error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

app.delete('/make-server-8927474f/admin/orders/:id', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const orderId = c.req.param('id');

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!userData?.is_admin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      // Check if order exists
      const { data: order } = await supabase
        .from('orders')
        .select('id')
        .eq('id', orderId)
        .single();
      
      if (!order) {
        return c.json({ success: false, error: 'Order not found' }, 404);
      }

      // Delete order (file associations will be cleaned up by cleanup job)
      await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      return c.json({ success: true });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }
      
      // Check if order exists
      const order = await kv.get(orderId);
      if (!order) {
        return c.json({ success: false, error: 'Order not found' }, 404);
      }

      // If the order has a file, we might want to update the file record to un-associate it
      // so the cleanup job can eventually remove it if desired.
      // For now, we'll just delete the order record.
      await kv.del(orderId);

      return c.json({ success: true });
    }
  } catch (error: any) {
    console.error('Delete order error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

// Cancel Order Route - Sets status to cancelled and deletes associated files
app.post('/make-server-8927474f/admin/orders/:id/cancel', async (c) => {
  try {
    console.log('🔴 ========== ORDER CANCELLATION REQUEST ==========');
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      console.log('❌ Unauthorized cancellation attempt');
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const orderId = c.req.param('id');
    console.log(`📋 Attempting to cancel order: ${orderId}`);

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!userData?.is_admin) {
        console.log('❌ Non-admin attempted to cancel order');
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      // Get the order to get batch_id and order_number
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
      
      if (fetchError) {
        console.error('❌ Order fetch error:', fetchError);
        return c.json({ success: false, error: `Order fetch failed: ${fetchError.message}` }, 404);
      }
      
      if (!order) {
        console.error('❌ Order not found for ID:', orderId);
        return c.json({ success: false, error: 'Order not found' }, 404);
      }

      console.log(`✅ Order found: #${order.order_number}, Current Status: ${order.status}`);

      // Fetch ALL orders in the same batch (for email details)
      const { data: allBatchOrders, error: batchError } = await supabase
        .from('orders')
        .select('*')
        .eq('batch_id', order.batch_id);
      
      if (batchError) {
        console.error('⚠️ Could not fetch batch orders:', batchError);
      }
      
      const batchOrders = allBatchOrders || [order];
      console.log(`📦 Found ${batchOrders.length} order(s) in batch`);
      console.log('📦 Batch orders data:', batchOrders.map(o => ({
        id: o.id,
        file_path: o.file_path,
        material_name: o.material_name,
        material_id: o.material_id,
        thickness: o.thickness,
        quantity: o.quantity,
        price: o.price
      })));

      // Check if order is already cancelled
      if (order.status === 'cancelled') {
        console.log('⚠️ Order already cancelled');
        return c.json({ success: false, error: 'Order is already cancelled' }, 400);
      }

      // Delete associated files from storage for ALL orders in batch
      console.log(`🗑️ Deleting files for ${batchOrders.length} order(s)...`);
      for (const batchOrder of batchOrders) {
        if (batchOrder.file_path) {
          console.log(`🗑️ Deleting file: ${batchOrder.file_path}`);
          try {
            const { error: deleteError } = await supabase.storage
              .from(bucketName)
              .remove([batchOrder.file_path]);
            
            if (deleteError) {
              console.error(`❌ Error deleting file from storage: ${batchOrder.file_path}`, deleteError);
            } else {
              console.log(`✅ File deleted from storage: ${batchOrder.file_path}`);
            }

            // Remove file upload tracking record
            const { error: fileRecordError } = await supabase
              .from('file_uploads')
              .delete()
              .eq('file_path', batchOrder.file_path);
            
            if (fileRecordError) {
              console.error('❌ Error deleting file record:', fileRecordError);
            } else {
              console.log('✅ File record deleted');
            }
          } catch (fileError) {
            console.error('❌ File deletion error:', fileError);
          }
        }
      }

      // Update ALL orders in batch to cancelled
      console.log('📝 Updating all batch orders status to cancelled...');
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          delivery_status: 'cancelled',
          payment_status: order.payment_status === 'paid' ? 'refund-pending' : 'cancelled'
        })
        .eq('batch_id', order.batch_id);

      if (updateError) {
        console.error('❌ Failed to update order status:', updateError);
        return c.json({ success: false, error: `Failed to cancel order: ${updateError.message}` }, 500);
      }

      console.log(`✅ All ${batchOrders.length} order(s) in batch updated successfully`);

      // Send cancellation email to customer (email is in delivery_info snapshot)
      const email = order.delivery_info?.email;
      const customerName = order.delivery_info?.name || 'Customer';
      
      if (email) {
        console.log(`📧 Sending professional cancellation email to: ${email}`);
        
        try {
          // Map all batch orders to email items using database column names
          const emailItems = batchOrders.map((batchOrder: any) => {
            const isSketchService = batchOrder.material_id === 'sketch' || 
                                    batchOrder.material_id === 'sketch-service' || 
                                    batchOrder.material_name === 'Sketch Service';
            
            // Extract filename from file_path (e.g., "uploads/file.dxf" -> "file.dxf")
            const fileName = batchOrder.file_path?.split('/').pop() || 'Custom Design';
            
            return {
              fileName: isSketchService 
                ? `CAD Design Service (${batchOrder.sketch_file_paths?.length || 1} files)` 
                : fileName,
              material: batchOrder.material_name || 'N/A',
              thickness: batchOrder.thickness || 0,
              quantity: batchOrder.quantity || 1,
              price: (batchOrder.price || 0) * (batchOrder.quantity || 1),
              color: batchOrder.color || null,
            };
          });

          // Calculate totals from batch
          const subtotal = batchOrders.reduce((sum: number, o: any) => 
            sum + ((o.price || 0) * (o.quantity || 1)), 0);
          const shippingCost = order.shipping_cost || 0;
          const discount = order.discount_amount || 0;
          const pointsUsed = order.points_used || 0;
          const total = subtotal + shippingCost - discount - pointsUsed;

          await sendOrderCancellationEmail({
            email: email,
            orderNumber: order.order_number,
            customerName: customerName,
            items: emailItems,
            subtotal: subtotal,
            shippingCost: shippingCost,
            discount: discount,
            pointsUsed: pointsUsed,
            total: total,
            wasPaymentCompleted: order.payment_status === 'paid',
            cancellationReason: undefined, // Could be added as a parameter in the future
          });
          console.log(`✅ Professional cancellation email sent to ${email} with ${emailItems.length} item(s)`);
        } catch (emailError) {
          console.error('❌ Failed to send cancellation email:', emailError);
          // Fallback to basic email if professional email fails
          sendEmail(email, `Order Cancelled: #${order.order_number}`, `
            <h1>Order Cancellation Notice</h1>
            <p>Your order #${order.order_number} has been cancelled.</p>
            ${order.payment_status === 'paid' ? '<p>A refund will be processed within 5-7 business days.</p>' : ''}
            <p>If you have any questions, please contact our support team.</p>
          `).catch(err => console.error('❌ Fallback email also failed:', err));
        }
      } else {
        console.log('⚠️ No email found in delivery_info, skipping email notification');
      }

      console.log(`✅ Order #${order.order_number} cancelled successfully`);
      console.log('🔴 ========== CANCELLATION COMPLETE ==========');
      return c.json({ success: true, message: 'Order cancelled successfully' });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }
      
      // Get the order
      const order = await kv.get(orderId);
      if (!order) {
        return c.json({ success: false, error: 'Order not found' }, 404);
      }

      // Check if order is already cancelled
      if (order.fulfillmentStatus === 'cancelled') {
        return c.json({ success: false, error: 'Order is already cancelled' }, 400);
      }

      // Delete the associated file from storage if it exists
      if (order.filePath) {
        try {
          const { error: deleteError } = await supabase.storage
            .from(bucketName)
            .remove([order.filePath]);
          
          if (deleteError) {
            console.error('Error deleting file from storage:', deleteError);
            // Continue with cancellation even if file deletion fails
          } else {
            console.log(`Deleted file from storage: ${order.filePath}`);
          }

          // Remove file upload tracking record
          const fileUploadId = `file-upload:${order.filePath}`;
          await kv.del(fileUploadId);
        } catch (fileError) {
          console.error('File deletion error:', fileError);
          // Continue with cancellation even if file deletion fails
        }
      }

      // Update order status to cancelled
      await kv.set(orderId, {
        ...order,
        fulfillmentStatus: 'cancelled',
        paymentStatus: order.paymentStatus === 'paid' ? 'refund-pending' : 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancelledBy: user.id
      });

    // Send cancellation email to customer
    const orderUser = await kv.get(`user:${order.userId}`);
    const email = order.deliveryInfo?.email || orderUser?.email || order.customerEmail;
    
    if (email) {
      const subject = `Order Cancelled: #${order.orderNumber || order.id.split(':').pop()}`;
      const html = `
        <h1>Order Cancellation Notice</h1>
        <p>Your order #${order.orderNumber || order.id.split(':').pop()} has been cancelled.</p>
        ${order.paymentStatus === 'paid' ? '<p>A refund will be processed within 5-7 business days.</p>' : ''}
        <p>If you have any questions, please contact our support team.</p>
        <p>Thank you for your understanding.</p>
      `;
      // Fire and forget email
      sendEmail(email, subject, html);
    }

    return c.json({ success: true, message: 'Order cancelled successfully' });
    }
  } catch (error: any) {
    console.error('Cancel order error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

// Batch Order Creation Route - Fixed item scope issue
app.post('/make-server-8927474f/orders/batch', async (c) => {
  console.log('📥 Batch order endpoint hit - v2');
  try {
    console.log('🔐 Verifying user...');
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      console.log('❌ Unauthorized:', error);
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }
    console.log('✅ User verified:', user.id);

    console.log('📦 Parsing request body...');
    const requestBody = await c.req.json();
    console.log('Batch order request body:', JSON.stringify(requestBody, null, 2));
    
    const { 
      orders, deliveryInfo, paymentMethod, discountCode, pointsUsed, notes, shippingCost, shippingCarrier, totalWeight,
      // Payment transaction details
      paymentId, paymentStatus, paymentGateway, paymentAmount, razorpayOrderId, razorpaySignature, paymentMetadata,
      discountAmount // ✅ ADD: Receive discount amount from frontend
    } = requestBody;
    
    console.log('Extracted orders:', orders);
    console.log('Orders is array?', Array.isArray(orders));
    console.log('Orders length:', orders?.length);
    
    if (!Array.isArray(orders) || orders.length === 0) {
      return c.json({ success: false, error: 'No orders provided' }, 400);
    }

    const createdOrders = [];
    const timestamp = Date.now();

    // Create parent order ID or group ID? 
    // For now, we'll just create individual orders but maybe link them?
    // Or simply process them one by one.
    // The UI shows them as separate orders usually in "My Orders", but maybe grouped by "Batch"?
    // Let's create individual orders to keep compatibility with existing "Orders" view, 
    // but maybe add a 'batchId' field.

    // Generate ONE sequential order number for the entire batch
    const batchOrderNumber = await generateOrderNumber();

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const createdOrdersSql = [];
      const batchIdSql = crypto.randomUUID();
      
      // CRITICAL FIX: Get the user's ID from the users table (not auth ID)
      let { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('id, auth_user_id')
        .eq('auth_user_id', user.id)
        .single();
      
      // Auto-create user record if it doesn't exist (for OAuth or edge cases)
      if (userError || !userRecord) {
        console.log('⚠️ User not found in users table, auto-creating...');
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert({
            auth_user_id: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.email?.split('@')[0],
            is_admin: false,
            created_at: new Date().toISOString()
          })
          .select('id, auth_user_id')
          .single();
        
        if (insertError) {
          console.error('❌ Failed to create user record:', insertError);
          return c.json({ success: false, error: 'Failed to create user record' }, 500);
        }
        
        userRecord = newUser;
        console.log('✅ User record created successfully');
      }
      
      const userId = userRecord.id;
      console.log(`✅ Order creation: Mapped auth ID ${user.id} to user ID ${userId}`);
      
      // Track discount usage if discount code was applied
      let discountAffiliate = null;
      let discountData = null;
      if (discountCode) {
        const { data: discount } = await supabase
          .from('discount_codes')
          .select('*')
          .eq('code', discountCode)
          .single();
        
        if (discount) {
          discountData = discount; // Store for calculating discount amounts per item
          
          // Update discount usage count
          await supabase
            .from('discount_codes')
            .update({ used_count: (discount.used_count || 0) + 1 })
            .eq('id', discount.id);
          
          // Load affiliate for later update
          if (discount.affiliate_id) {
            const { data: affiliate } = await supabase
              .from('affiliates')
              .select('*')
              .eq('id', discount.affiliate_id)
              .single();
            discountAffiliate = affiliate;
          }
        }
      }

      // Calculate total sales for affiliate tracking
      let totalBatchPrice = 0;
      
      // Use orders directly - prices already include all costs from the pricing formula
      const adjustedOrders = orders.map((item: any) => ({
        ...item,
        adjustedPrice: item.price || 0,
      }));
      
      // FIRST PASS: Calculate total batch price for proportional discount distribution
      const totalItemsPrice = adjustedOrders.reduce((sum, item) => sum + (item.adjustedPrice * (item.quantity || 1)), 0);
      
      // Calculate total discount amount for the entire batch
      let totalDiscountAmount = 0;
      console.log(`🔍 DEBUG: discountAmount from frontend = ${discountAmount}, discountData = ${discountData ? discountData.code : 'null'}`);
      if (discountAmount) {
        // ✅ PRIORITY 1: Use discount amount provided by frontend (already calculated)
        totalDiscountAmount = discountAmount;
        console.log(`💰 Total discount (from frontend): ₹${totalDiscountAmount.toFixed(2)}`);
      } else if (discountData) {
        // ✅ FALLBACK: Calculate from discount code if not provided by frontend
        if (discountData.type === 'percentage') {
          // For percentage discounts, calculate on total items price (not including shipping)
          totalDiscountAmount = (totalItemsPrice * (discountData.value || 0)) / 100;
        } else if (discountData.type === 'fixed') {
          // For fixed discounts, use the fixed value
          totalDiscountAmount = discountData.value || 0;
        }
        console.log(`💰 Total discount (calculated): ${discountData.code} (${discountData.type}:${discountData.value}) = ₹${totalDiscountAmount.toFixed(2)}`);
      }
      
      // SECOND PASS: Calculate per-item discount and payment amount proportionally
      const adjustedOrdersWithDiscount = adjustedOrders.map((item: any) => {
        let itemDiscountAmount = 0;
        let itemPaymentAmount = null;
        
        if (totalDiscountAmount > 0 && totalItemsPrice > 0) {
          // Distribute discount proportionally based on item's share of total
          const itemTotal = item.adjustedPrice * (item.quantity || 1);
          const itemProportion = itemTotal / totalItemsPrice;
          itemDiscountAmount = totalDiscountAmount * itemProportion;
          console.log(`  💰 Item ${item.fileName}: ₹${itemTotal.toFixed(2)} (${(itemProportion * 100).toFixed(1)}% of total) → discount: ₹${itemDiscountAmount.toFixed(2)}`);
        }
        
        // ✅ NEW: Distribute payment amount proportionally if provided
        if (paymentAmount && totalItemsPrice > 0) {
          const itemTotal = item.adjustedPrice * (item.quantity || 1);
          const itemProportion = itemTotal / totalItemsPrice;
          itemPaymentAmount = paymentAmount * itemProportion;
          console.log(`  💳 Item ${item.fileName}: payment amount = ₹${itemPaymentAmount.toFixed(2)} (${(itemProportion * 100).toFixed(1)}% of ₹${paymentAmount})`);
        }
        
        return {
          ...item,
          itemDiscountAmount,  // Store calculated discount for this item
          itemPaymentAmount,   // ✅ Store calculated payment amount for this item
        };
      });

      // Create individual orders
      for (let i = 0; i < adjustedOrdersWithDiscount.length; i++) {
        const item = adjustedOrdersWithDiscount[i];
        const orderId = crypto.randomUUID();
        
        try {
          console.log(`Processing order ${i}:`, item);
          
          const adjustedPrice = item.adjustedPrice;
          totalBatchPrice += adjustedPrice * (item.quantity || 1);
          
          // Calculate individual item weight
          let itemWeight = 0;
          if (!item.isSketchService && item.dxfData && item.thickness && item.material?.density) {
            const areaM2 = (item.dxfData.width * item.dxfData.height) / (1000 * 1000);
            const volumeM3 = areaM2 * (item.thickness / 1000);
            const weightPerPiece = volumeM3 * item.material.density;
            itemWeight = weightPerPiece * (item.quantity || 1);
            console.log(`[SUCCESS] Calculated weight for ${item.fileName}: ${itemWeight} kg`);
          }
          
          // Insert order into SQL (parent record)
          console.log(`🔍 [ORDER ${i}] About to insert order with data:`, {
            orderId,
            userId,
            batchOrderNumber,
            totalAmount: adjustedPrice * (item.quantity || 1),
            discountAmount: item.itemDiscountAmount,
            paymentAmount: item.itemPaymentAmount
          });
          
          const { data: insertedOrder, error: insertError } = await supabase
            .from('orders')
            .insert({
              id: orderId,
              order_number: batchOrderNumber,
              batch_id: batchIdSql,
              user_id: userId,
              material_id: item.material?.id,
              material_name: item.material?.name,
              thickness: item.thickness,
              quantity: item.quantity || 1,
              file_path: item.filePath,
              sketch_file_paths: item.sketchFilePaths || [],
              price: adjustedPrice,
              total_amount: adjustedPrice * (item.quantity || 1),
              subtotal: adjustedPrice * (item.quantity || 1),
              shipping_cost: shippingCost || 0,
              discount_code: discountCode,
              discount_amount: item.itemDiscountAmount || 0,
              points_used: pointsUsed || 0,
              points_value: pointsUsed || 0,
              // Store DXF data for reorder functionality
              width: item.dxfData?.width || 0,
              height: item.dxfData?.height || 0,
              cutting_length: item.dxfData?.cuttingLength || 0,
              delivery_info: deliveryInfo,
              delivery_address: deliveryInfo?.address || null,
              delivery_apartment: deliveryInfo?.apartment || null,
              delivery_city: deliveryInfo?.city || null,
              delivery_state: deliveryInfo?.state || null,
              delivery_pin_code: deliveryInfo?.pinCode || null,
              delivery_country: deliveryInfo?.country || null,
              delivery_gst_number: deliveryInfo?.gstNumber || null,
              delivery_first_name: deliveryInfo?.firstName || null,
              delivery_last_name: deliveryInfo?.lastName || null,
              delivery_phone: deliveryInfo?.phone || null,
              shipping_carrier: shippingCarrier,
              notes: notes || null,
              status: 'pending',
              delivery_status: 'pending',
              payment_status: paymentStatus || 'pending',
              payment_method: paymentMethod,
              // Payment transaction details (for compliance & accounting)
              payment_id: paymentId || null,
              payment_gateway: paymentGateway || paymentMethod || null,
              payment_amount: item.itemPaymentAmount || (adjustedPrice * (item.quantity || 1)) || null, // ✅ Use proportional payment amount
              payment_verified_at: paymentId ? new Date().toISOString() : null,
              razorpay_order_id: razorpayOrderId || null,
              razorpay_signature: razorpaySignature || null,
              payment_metadata: paymentMetadata || null,
              color: item.color || null,   // Selected colour for non-metal materials
              created_at: new Date().toISOString()
            })
            .select();

          if (insertError) {
            console.error(`❌ [ORDER ${i}] Database insert failed:`, insertError);
            throw new Error(`Database insert failed: ${insertError.message}`);
          }

          console.log(`✅ [ORDER ${i}] Order ${orderId} saved successfully`);
          createdOrdersSql.push(orderId);
        } catch (orderError: any) {
          console.error(`Error processing order ${i}:`, orderError);
          throw orderError;
        }

        // Link file uploads
        if (item.filePath) {
          await supabase
            .from('file_uploads')
            .update({ 
              associated_with_order: true,
              order_id: orderId
            })
            .eq('file_path', item.filePath);
        }

        // Mark sketch files as associated with order
        if (item.sketchFilePaths && Array.isArray(item.sketchFilePaths)) {
          for (const filePath of item.sketchFilePaths) {
            await supabase
              .from('file_uploads')
              .update({ 
                associated_with_order: true,
                order_id: orderId
              })
              .eq('file_path', filePath);
          }
        }
      }

      // Update affiliate statistics if this was an affiliate discount
      if (discountAffiliate && totalBatchPrice > 0) {
        const commission = (totalBatchPrice * (discountAffiliate.commission_percentage || 0)) / 100;
        
        // Get user email for tracking
        const { data: userData } = await supabase
          .from('users')
          .select('email, id')
          .eq('auth_user_id', user.id)
          .single();
        const userEmail = userData?.email || user.email;
        
        console.log(`📊 Recording affiliate usage (batch): ${discountCode} used by ${userEmail} for batch ${batchOrderNumber}`);
        
        // Track individual usage for fraud detection
        const { error: usageError } = await supabase
          .from('affiliate_usage')
          .insert({
            affiliate_id: discountAffiliate.id,
            affiliate_name: discountAffiliate.name,
            discount_code: discountCode,
            user_id: user.id,  // ← Use auth_user_id (UUID), not users.id (serial)
            user_email: userEmail,
            order_value: totalBatchPrice,
            commission: commission,
            order_id: batchIdSql,  // Fixed: was batch_id, now order_id to match table schema
            order_number: batchOrderNumber,
            created_at: new Date().toISOString()
          });
        
        if (usageError) {
          console.error('❌ Error recording affiliate usage (batch):', usageError);
        } else {
          console.log('✅ Affiliate usage recorded successfully (batch)');
        }
        
        // Update affiliate stats
        await supabase
          .from('affiliates')
          .update({
            usage_count: (discountAffiliate.usage_count || 0) + 1,
            total_sales: (discountAffiliate.total_sales || 0) + totalBatchPrice,
            total_commission: (discountAffiliate.total_commission || 0) + commission,
            updated_at: new Date().toISOString()
          })
          .eq('id', discountAffiliate.id);
        
        // ✅ CRITICAL FIX: Send affiliate commission email
        console.log(`📧 Sending affiliate commission email to ${discountAffiliate.email}`);
        try {
          const updatedTotalEarnings = (discountAffiliate.total_commission || 0) + commission;
          await sendAffiliateCommissionEmail({
            email: discountAffiliate.email,
            affiliateName: discountAffiliate.name,
            orderNumber: batchOrderNumber,
            orderValue: totalBatchPrice,
            commission: commission,
            customerEmail: userEmail,
            totalEarnings: updatedTotalEarnings,
          });
          console.log(`✅ Affiliate commission email sent to ${discountAffiliate.email}`);
        } catch (emailError) {
          console.error('❌ Failed to send affiliate commission email:', emailError);
        }
      }

      // ========== SAVE DELIVERY INFO FOR FUTURE AUTOFILL ==========
      // Save/update delivery info to delivery_info table for future checkout autofill
      if (deliveryInfo) {
        console.log('💾 Saving delivery info for future autofill...');
        const result = await saveDeliveryInfo(userId, deliveryInfo);
        
        if (result.success) {
          console.log('✅ Delivery info saved successfully for user:', userId);
        } else {
          console.error('❌ Failed to save delivery info:', result.error);
        }
      }

      // Loyalty points management
      const { data: userData } = await supabase
        .from('users')
        .select('loyalty_points, email, name, phone')
        .eq('auth_user_id', user.id)
        .single();
      
      let currentPoints = userData?.loyalty_points || 0;
      
      // Deduct points if they were used
      if (pointsUsed && pointsUsed > 0) {
        currentPoints = Math.max(0, currentPoints - pointsUsed);
      }
      
      // Award new points: 1 point per ₹100 spent
      const pointsEarned = Math.floor(totalBatchPrice / 100);
      if (pointsEarned > 0) {
        currentPoints += pointsEarned;
      }
      
      // Update user's points
      if (pointsUsed || pointsEarned > 0) {
        await supabase
          .from('users')
          .update({ loyalty_points: currentPoints })
          .eq('auth_user_id', user.id);
      }

      // Update user's email subscription preference if provided in deliveryInfo
      if (deliveryInfo?.isSubscribed !== undefined) {
        console.log(`📧 [BATCH ORDER] Updating subscription for user ${user.id}: ${deliveryInfo.isSubscribed}`);
        const { error: subError } = await supabase
          .from('users')
          .update({ is_subscribed: deliveryInfo.isSubscribed })
          .eq('auth_user_id', user.id);
        
        if (subError) {
          console.error('❌ [BATCH ORDER] Failed to update subscription:', subError);
        } else {
          console.log('✅ [BATCH ORDER] Subscription preference updated successfully');
        }
      } else {
        console.log('⚠️ [BATCH ORDER] No subscription preference in deliveryInfo');
      }

      // Send Telegram notification to admin for batch order
      const customerName = deliveryInfo?.name || userData?.name || 'N/A';
      const customerEmail = deliveryInfo?.email || userData?.email || user.email || 'N/A';
      const customerPhone = deliveryInfo?.phone || userData?.phone || 'N/A';
      
      // Build order items summary
      const itemsSummary = adjustedOrders.slice(0, 3).map((item: any, idx: number) => {
        const itemName = item.isSketchService 
          ? `CAD Design (${item.fileCount || 1} files)` 
          : `${item.material?.name || 'Unknown'} ${item.thickness}mm`;
        return `• ${itemName} - ₹${(item.adjustedPrice * (item.quantity || 1)).toFixed(2)}`;
      }).join('\n');
      
      const moreItems = adjustedOrders.length > 3 ? `\n• ... and ${orders.length - 3} more items` : '';
      
      const telegramMessage = `
🔔 <b>NEW BATCH ORDER #${batchOrderNumber}</b>

👤 <b>Customer:</b> ${customerName}
📧 <b>Email:</b> ${customerEmail}
📱 <b>Phone:</b> ${customerPhone}

📦 <b>Order Details:</b> (${orders.length} items)
${itemsSummary}${moreItems}

📍 <b>Shipping:</b> ${deliveryInfo?.state || 'N/A'}
${shippingCost > 0 ? `🚚 <b>Shipping Cost:</b> ₹${shippingCost.toFixed(2)}` : ''}
${totalDiscountAmount > 0 ? `💸 <b>Discount:</b> -₹${totalDiscountAmount.toFixed(2)}` : ''}
${pointsUsed > 0 ? `⭐ <b>Points Used:</b> ${pointsUsed}` : ''}
💰 <b>Total:</b> ₹${(paymentAmount || (totalBatchPrice + (shippingCost || 0) - totalDiscountAmount - (pointsUsed || 0))).toFixed(2)}

⏰ ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
      `.trim();
      
      sendTelegramNotification(telegramMessage).catch(err => console.error('Telegram notification error:', err));
      
      // Send order confirmation email
      if (customerEmail && customerEmail !== 'N/A') {
        try {
          const emailItems = adjustedOrders.map((item: any) => ({
            fileName: item.isSketchService 
              ? `CAD Design Service (${item.fileCount || 1} files)` 
              : item.fileName || 'Custom Design',
            material: item.material?.name || 'N/A',
            thickness: item.thickness || 0,
            quantity: item.quantity || 1,
            price: item.adjustedPrice * (item.quantity || 1),
          }));
          
          // Get payment transaction details from first order (all orders in batch share same payment)
          const firstOrder = orders[0];
          const paymentTransaction = firstOrder?.paymentId ? {
            transactionId: firstOrder.paymentId,
            gateway: firstOrder.paymentGateway || firstOrder.paymentMethod || 'Unknown',
            method: firstOrder.paymentMethod || firstOrder.paymentGateway || 'Unknown',
            amount: firstOrder.paymentAmount || (totalBatchPrice + (shippingCost || 0)),
            verifiedAt: firstOrder.paymentVerifiedAt || new Date().toISOString(),
          } : undefined;
          
          await sendOrderConfirmationEmail({
            email: customerEmail,
            customerName: customerName,
            orderNumber: batchOrderNumber,
            items: emailItems,
            subtotal: totalBatchPrice,
            shippingCost: shippingCost || 0,
            discount: totalDiscountAmount || 0,
            pointsUsed: pointsUsed || 0,
            total: paymentAmount || (totalBatchPrice + (shippingCost || 0) - totalDiscountAmount - (pointsUsed || 0)),
            deliveryAddress: {
              address: deliveryInfo?.address || '',
              apartment: deliveryInfo?.apartment,
              city: deliveryInfo?.city || '',
              state: deliveryInfo?.state || '',
              pinCode: deliveryInfo?.pinCode || '',
            },
            paymentTransaction,
          });
          console.log(`✅ Order confirmation email sent to ${customerEmail}`);
        } catch (emailError) {
          console.error('❌ Failed to send order confirmation email:', emailError);
        }
      }

      return c.json({ success: true, orderIds: createdOrdersSql, batchId: batchIdSql });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const batchId = `batch:${user.id}:${timestamp}`;

      // Track discount usage if discount code was applied
      let discountAffiliate = null;
      let discountDataKV = null;
      if (discountCode) {
        const discount = await kv.get(`discount-code:${discountCode}`);
      if (discount) {
        discountDataKV = discount; // Store for calculating discount amounts
        
        // Update discount usage
        const updatedDiscount = {
          ...discount,
          usedCount: (discount.usedCount || 0) + 1,
        };
        
        // Update both discount keys
        await kv.mset(
          [discount.id, `discount-code:${discountCode}`],
          [updatedDiscount, updatedDiscount]
        );

        // Load affiliate for later update
        if (discount.affiliateId) {
          discountAffiliate = await kv.get(discount.affiliateId);
        }
      }
    }

    // Calculate total sales for affiliate tracking
    let totalBatchPrice = 0;
    
    // Apply minimum order value (₹100) to INDIVIDUAL laser cutting items
    // CRITICAL BUSINESS RULE: Each laser cutting item's total (price × quantity) must be ≥ ₹100
    // Use orders directly - prices already include all costs from the pricing formula
    const adjustedOrders = orders.map((item: any) => ({
      ...item,
      adjustedPrice: item.price || 0,
    }));
    
    // FIRST PASS: Calculate total batch price for proportional discount distribution (KV MODE)
    const totalItemsPriceKV = adjustedOrders.reduce((sum, item) => sum + (item.adjustedPrice * (item.quantity || 1)), 0);
    
    // Calculate total discount amount for the entire batch
    let totalDiscountAmountKV = 0;
    if (discountDataKV) {
      if (discountDataKV.type === 'percentage') {
        totalDiscountAmountKV = (totalItemsPriceKV * (discountDataKV.value || 0)) / 100;
      } else if (discountDataKV.type === 'fixed') {
        totalDiscountAmountKV = discountDataKV.value || 0;
      }
      console.log(`💰 KV Mode - Total discount: ${discountDataKV.code} (${discountDataKV.type}:${discountDataKV.value}) = ₹${totalDiscountAmountKV.toFixed(2)}`);
    }
    
    // SECOND PASS: Calculate per-item discount proportionally (KV MODE)
    const adjustedOrdersWithDiscountKV = adjustedOrders.map((item: any) => {
      let itemDiscountAmount = 0;
      
      if (totalDiscountAmountKV > 0 && totalItemsPriceKV > 0) {
        const itemTotal = item.adjustedPrice * (item.quantity || 1);
        const itemProportion = itemTotal / totalItemsPriceKV;
        itemDiscountAmount = totalDiscountAmountKV * itemProportion;
      }
      
      return {
        ...item,
        itemDiscountAmount,
      };
    });

    for (let i = 0; i < adjustedOrdersWithDiscountKV.length; i++) {
      const item = adjustedOrdersWithDiscountKV[i];
      const orderId = `order:${user.id}:${timestamp}-${i}`;
      
      try {
        console.log(`Processing order ${i}:`, item);
        
        const adjustedPrice = item.adjustedPrice;
        totalBatchPrice += adjustedPrice * (item.quantity || 1);
        
        // Calculate individual item weight
        let itemWeight = 0;
        console.log(`Weight calculation for ${item.fileName}:`, {
          isSketchService: item.isSketchService,
          hasDxfData: !!item.dxfData,
          thickness: item.thickness,
          materialDensity: item.material?.density,
          materialName: item.material?.name
        });
        
        if (!item.isSketchService && item.dxfData && item.thickness && item.material?.density) {
          const areaM2 = (item.dxfData.width * item.dxfData.height) / (1000 * 1000);
          const volumeM3 = areaM2 * (item.thickness / 1000);
          const weightPerPiece = volumeM3 * item.material.density;
          itemWeight = weightPerPiece * (item.quantity || 1);
          console.log(`[SUCCESS] Calculated weight for ${item.fileName}: ${itemWeight} kg (${item.quantity || 1} pieces)`);
        } else {
          console.log(`[WARNING] Cannot calculate weight - missing data for ${item.fileName}`);
        }
        
        const orderData = {
          ...item,
          price: adjustedPrice, // Price from pricing formula
          id: orderId,
          orderNumber: batchOrderNumber, // All items in batch share the same order number
          batchId,
          userId: user.id,
          status: 'pending',
          paymentStatus: 'pending',
          fulfillmentStatus: 'pending',
          deliveryStatus: 'pending',
          createdAt: new Date().toISOString(),
          deliveryInfo,
          paymentMethod,
          discountCode,
          discountAmount: item.itemDiscountAmount || 0,
          pointsUsed: pointsUsed || 0,
          notes: notes || '',
          shippingCost: shippingCost || 0,
          shippingCarrier: shippingCarrier || null,
          totalWeight: itemWeight, // Use calculated individual item weight
        };

        await kv.set(orderId, orderData);
        createdOrders.push(orderId);
        console.log(`Order ${orderId} saved successfully`);
      } catch (orderError: any) {
        console.error(`Error processing order ${i}:`, orderError);
        throw orderError;
      }

      // Link file if exists
      if (item.filePath) {
        const fileUploadId = `file-upload:${item.filePath}`;
        const fileUpload = await kv.get(fileUploadId);
        if (fileUpload) {
          await kv.set(fileUploadId, {
            ...fileUpload,
            associatedWithOrder: true,
            orderId: orderId,
          });
        }
      }

      // Mark sketch files as associated with order
      if (item.sketchFilePaths && Array.isArray(item.sketchFilePaths)) {
        for (const filePath of item.sketchFilePaths) {
          const fileUploadId = `file-upload:${filePath}`;
          const fileUpload = await kv.get(fileUploadId);
          if (fileUpload) {
            await kv.set(fileUploadId, {
              ...fileUpload,
              associatedWithOrder: true,
              orderId: orderId,
            });
          }
        }
      }
    }

    // Update affiliate statistics if this was an affiliate discount
    if (discountAffiliate && totalBatchPrice > 0) {
      const commission = (totalBatchPrice * (discountAffiliate.commissionPercentage || 0)) / 100;
      
      // Get user email for tracking
      const userData = await kv.get(`user:${user.id}`);
      const userEmail = userData?.email || user.email;
      
      // Track individual usage for fraud detection
      const usageId = `affiliate-usage:${discountAffiliate.id}:${timestamp}`;
      await kv.set(usageId, {
        id: usageId,
        affiliateId: discountAffiliate.id,
        affiliateName: discountAffiliate.name,
        discountCode: discountCode,
        userId: user.id,
        userEmail: userEmail,
        orderValue: totalBatchPrice,
        commission: commission,
        timestamp: new Date().toISOString(),
        batchId: batchId,
        orderNumber: batchOrderNumber,
      });
      
      await kv.set(discountAffiliate.id, {
        ...discountAffiliate,
        usageCount: (discountAffiliate.usageCount || 0) + 1,
        totalSales: (discountAffiliate.totalSales || 0) + totalBatchPrice,
        totalCommission: (discountAffiliate.totalCommission || 0) + commission,
      });
      
      // ✅ CRITICAL FIX: Send affiliate commission email (KV MODE)
      console.log(`📧 [KV MODE] Sending affiliate commission email to ${discountAffiliate.email}`);
      try {
        const updatedTotalEarnings = (discountAffiliate.totalCommission || 0) + commission;
        await sendAffiliateCommissionEmail({
          email: discountAffiliate.email,
          affiliateName: discountAffiliate.name,
          orderNumber: batchOrderNumber,
          orderValue: totalBatchPrice,
          commission: commission,
          customerEmail: userEmail,
          totalEarnings: updatedTotalEarnings,
        });
        console.log(`✅ [KV MODE] Affiliate commission email sent to ${discountAffiliate.email}`);
      } catch (emailError) {
        console.error('❌ [KV MODE] Failed to send affiliate commission email:', emailError);
      }
    }

    // Award loyalty points: 1 point per ₹100 spent (on total batch price)
    const userData = await kv.get(`user:${user.id}`);
    
    // Deduct points if they were used for this batch order
    let currentPoints = userData?.points || 0;
    if (pointsUsed && pointsUsed > 0) {
      currentPoints = Math.max(0, currentPoints - pointsUsed);
    }
    
    // Award new points based on order value
    const pointsEarned = Math.floor(totalBatchPrice / 100);
    if (pointsEarned > 0) {
      currentPoints += pointsEarned;
    }
    
    // Update user's points
    if (pointsUsed || pointsEarned > 0) {
      await kv.set(`user:${user.id}`, {
        ...userData,
        points: currentPoints,
      });
    }

    // Update user's email subscription preference if provided in deliveryInfo
    if (deliveryInfo?.isSubscribed !== undefined) {
      const updatedUserData = await kv.get(`user:${user.id}`);
      await kv.set(`user:${user.id}`, {
        ...updatedUserData,
        isSubscribed: deliveryInfo.isSubscribed,
      });
    }

    // Send Telegram notification to admin for batch order
    const customerName = deliveryInfo?.name || userData?.name || 'N/A';
    const customerEmail = deliveryInfo?.email || userData?.email || user.email || 'N/A';
    const customerPhone = deliveryInfo?.phone || userData?.phone || 'N/A';
    
    // Build order items summary
    const itemsSummary = adjustedOrders.slice(0, 3).map((item: any, idx: number) => {
      const itemName = item.isSketchService 
        ? `CAD Design (${item.fileCount || 1} files)` 
        : `${item.material?.name || 'Unknown'} ${item.thickness}mm`;
      return `• ${itemName} - ₹${(item.adjustedPrice * (item.quantity || 1)).toFixed(2)}`;
    }).join('\n');
    
    const moreItems = adjustedOrders.length > 3 ? `\n• ... and ${orders.length - 3} more items` : '';
    
    const telegramMessage = `
🔔 <b>NEW BATCH ORDER #${batchOrderNumber}</b>

👤 <b>Customer:</b> ${customerName}
📧 <b>Email:</b> ${customerEmail}
📱 <b>Phone:</b> ${customerPhone}

📦 <b>Order Details:</b> (${orders.length} items)
${itemsSummary}${moreItems}

📍 <b>Shipping:</b> ${deliveryInfo?.state || 'N/A'}
${shippingCost > 0 ? `🚚 <b>Shipping Cost:</b> ₹${shippingCost.toFixed(2)}` : ''}
${totalDiscountAmount > 0 ? `💸 <b>Discount:</b> -₹${totalDiscountAmount.toFixed(2)}` : ''}
${pointsUsed > 0 ? `⭐ <b>Points Used:</b> ${pointsUsed}` : ''}
💰 <b>Total:</b> ₹${(paymentAmount || (totalBatchPrice + (shippingCost || 0) - totalDiscountAmount - (pointsUsed || 0))).toFixed(2)}

⏰ ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
    `.trim();
    
    sendTelegramNotification(telegramMessage).catch(err => console.error('Telegram notification error:', err));
    
    // Send order confirmation email
    if (customerEmail && customerEmail !== 'N/A') {
      try {
        const emailItems = orders.map((item: any) => ({
          fileName: item.isSketchService 
            ? `CAD Design Service (${item.fileCount || 1} files)` 
            : item.fileName || 'Custom Design',
          material: item.material?.name || 'N/A',
          thickness: item.thickness || 0,
          quantity: item.quantity || 1,
          price: (item.price || 0) * (item.quantity || 1),
        }));
        
        await sendOrderConfirmationEmail({
          email: customerEmail,
          orderNumber: batchOrderNumber,
          customerName: customerName,
          items: emailItems,
          subtotal: totalBatchPrice,
          shippingCost: shippingCost || 0,
          discount: totalDiscountAmount || 0,
          pointsUsed: pointsUsed || 0,
          total: paymentAmount || (totalBatchPrice + (shippingCost || 0) - totalDiscountAmount - (pointsUsed || 0)),
          deliveryAddress: {
            address: deliveryInfo?.address || '',
            apartment: deliveryInfo?.apartment,
            city: deliveryInfo?.city || '',
            state: deliveryInfo?.state || '',
            pinCode: deliveryInfo?.pinCode || '',
          },
        });
        console.log(`✅ Order confirmation email sent to ${customerEmail}`);
      } catch (emailError) {
        console.error('❌ Failed to send order confirmation email:', emailError);
      }
    }

    return c.json({ success: true, orderIds: createdOrders, batchId });
    }
  } catch (error: any) {
    console.error('❌ Create batch orders error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error message:', error.message);
    return c.json({ success: false, error: error.message || String(error) }, 400);
  }
});

// Admin Routes - Users Management
app.get('/make-server-8927474f/admin/users', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    // Get pagination parameters
    const url = new URL(c.req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!userData?.is_admin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      // Get users with pagination
      const { data: allUsers, count, error: fetchError } = await supabase
        .from('users')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (fetchError) throw fetchError;

      // Transform snake_case to camelCase for frontend compatibility
      const transformedUsers = (allUsers || []).map((user: any) => ({
        id: user.id,
        authUserId: user.auth_user_id,
        email: user.email,
        name: user.name,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        address: user.address,
        city: user.city,
        state: user.state,
        pinCode: user.pin_code,
        gstNumber: user.gst_number,
        country: user.country,
        isAdmin: user.is_admin,
        isAffiliate: user.is_affiliate,
        isSubscribed: user.is_subscribed !== false,  // Email marketing subscription (default true)
        loyaltyPoints: user.loyalty_points,
        points: user.loyalty_points,  // Alias for compatibility
        createdAt: user.created_at,  // This is the key fix for "Invalid Date"
        updatedAt: user.updated_at
      }));

      return c.json({ 
        success: true, 
        users: transformedUsers,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
          hasNextPage: offset + limit < (count || 0),
          hasPrevPage: page > 1
        }
      });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      const allUsers = await kv.getByPrefix('user:');
    
    // Sort by creation date descending (newest first)
    allUsers.sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    // Apply pagination
    const totalUsers = allUsers.length;
    const paginatedUsers = allUsers.slice(offset, offset + limit);

    return c.json({ 
      success: true, 
      users: paginatedUsers,
      pagination: {
        page,
        limit,
        total: totalUsers,
        totalPages: Math.ceil(totalUsers / limit),
        hasNextPage: offset + limit < totalUsers,
        hasPrevPage: page > 1
      }
    });
    }
  } catch (error: any) {
    console.error('Get users error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

// Export all users as CSV
app.get('/make-server-8927474f/admin/users/export/csv', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    let allUsers: any[] = [];

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!userData?.is_admin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      // Get all users
      const { data: usersData, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      
      // Transform SQL data to match KV format for CSV generation
      allUsers = (usersData || []).map((u: any) => ({
        name: u.name,
        email: u.email,
        phone: u.phone,
        address: u.address,
        city: u.city,
        state: u.state,
        pinCode: u.pin_code,
        gstNumber: u.gst_number,
        country: u.country,
        points: u.loyalty_points,
        isAdmin: u.is_admin,
        createdAt: u.created_at
      }));
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      // Get all users
      allUsers = await kv.getByPrefix('user:');
    
    // Sort by creation date descending (newest first)
    allUsers.sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    // Create CSV header
    const headers = [
      'Name',
      'Email',
      'Phone',
      'Address',
      'City',
      'State',
      'Pincode',
      'GST Number',
      'Country',
      'Points',
      'Is Admin',
      'Joined Date'
    ];

    // Create CSV rows
    const rows = allUsers.map((user: any) => {
      return [
        user.name || '',
        user.email || '',
        user.phone || '',
        user.address || '',
        user.city || '',
        user.state || '',
        user.pinCode || '',
        user.gstNumber || '',
        user.country || '',
        user.points || 0,
        user.isAdmin ? 'Yes' : 'No',
        user.createdAt ? new Date(user.createdAt).toLocaleString() : ''
      ];
    });

    // Escape CSV values (handle commas, quotes, newlines)
    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    // Build CSV content
    let csvContent = headers.map(escapeCSV).join(',') + '\n';
    csvContent += rows.map(row => row.map(escapeCSV).join(',')).join('\n');

    // Return CSV file
    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="users_export_${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
    }
  } catch (error: any) {
    console.error('Export users CSV error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

app.put('/make-server-8927474f/admin/users/:id', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const userId = c.req.param('id');
    const updates = await c.req.json();

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!userData?.is_admin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      // Check target user exists
      const { data: targetUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (fetchError || !targetUser) {
        return c.json({ success: false, error: 'User not found' }, 404);
      }

      // Transform camelCase to snake_case for SQL
      const sqlUpdates: any = {};
      if (updates.name) sqlUpdates.name = updates.name;
      if (updates.email) sqlUpdates.email = updates.email;
      if (updates.phone) sqlUpdates.phone = updates.phone;
      if (updates.address) sqlUpdates.address = updates.address;
      if (updates.city) sqlUpdates.city = updates.city;
      if (updates.state) sqlUpdates.state = updates.state;
      if (updates.pinCode) sqlUpdates.pin_code = updates.pinCode;
      if (updates.gstNumber) sqlUpdates.gst_number = updates.gstNumber;
      if (updates.country) sqlUpdates.country = updates.country;
      if (updates.points !== undefined) sqlUpdates.loyalty_points = updates.points;
      if (updates.isAdmin !== undefined) sqlUpdates.is_admin = updates.isAdmin;
      if (updates.isSubscribed !== undefined) sqlUpdates.is_subscribed = updates.isSubscribed;

      // Update user
      await supabase
        .from('users')
        .update(sqlUpdates)
        .eq('id', userId);

      return c.json({ success: true });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }
      
      const targetUser = await kv.get(`user:${userId}`);
      if (!targetUser) {
        return c.json({ success: false, error: 'User not found' }, 404);
      }

      // If email is being updated, update the email mapping
      if (updates.email && updates.email !== targetUser.email) {
        // Delete old email mapping
        if (targetUser.email) {
          await kv.del(`user-email:${targetUser.email.toLowerCase()}`);
        }
        // Create new email mapping
        await kv.set(`user-email:${updates.email.toLowerCase()}`, userId);
      }

      await kv.set(`user:${userId}`, { ...targetUser, ...updates });
      return c.json({ success: true });
    }
  } catch (error: any) {
    console.error('Update user error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

// Delete user
app.delete('/make-server-8927474f/admin/users/:id', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const userId = c.req.param('id');

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin, auth_user_id')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!userData?.is_admin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      // Check target user exists
      const { data: targetUser, error: fetchError } = await supabase
        .from('users')
        .select('id, auth_user_id')
        .eq('id', userId)
        .single();
      
      if (fetchError || !targetUser) {
        return c.json({ success: false, error: 'User not found' }, 404);
      }

      // Prevent admins from deleting themselves
      if (targetUser.auth_user_id === user.id) {
        return c.json({ success: false, error: 'Cannot delete your own account' }, 400);
      }

      // IMPORTANT: Instead of deleting, we ANONYMIZE the user to preserve:
      // 1. Order history (for business records and analytics)
      // 2. Affiliate commission data (UserB keeps earnings from UserA's orders)
      // 3. Financial records (for accounting/tax purposes)
      // 4. affiliate_usage records (UserB can still see UserA used their code)
      
      // Anonymize user data while keeping the record
      const anonymizedEmail = `deleted_${targetUser.id}@deleted.user`;
      await supabase
        .from('users')
        .update({
          name: '[Deleted User]',
          email: anonymizedEmail,
          phone: null,
          address: null,
          city: null,
          state: null,
          pin_code: null,
          gst_number: null,
          country: null,
          // Keep: loyalty_points, is_admin, affiliate_id (for data integrity)
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      // Delete delivery info (not needed for deleted users)
      await supabase
        .from('delivery_info')
        .delete()
        .eq('user_id', targetUser.id);

      // KEEP orders and affiliate_usage records - these are financial records
      // that affiliates and business analytics depend on

      // Delete from Supabase Auth (prevents login)
      try {
        const { error: authDeleteError } = await supabase.auth.admin.deleteUser(targetUser.auth_user_id);
        if (authDeleteError) {
          console.error('Auth delete error:', authDeleteError);
          // Continue anyway - the main user record is deleted
        }
      } catch (authError) {
        console.error('Auth delete failed:', authError);
        // Continue anyway - the main user record is deleted
      }

      return c.json({ success: true });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      // Prevent admins from deleting themselves
      if (userId === user.id) {
        return c.json({ success: false, error: 'Cannot delete your own account' }, 400);
      }
      
      const targetUser = await kv.get(`user:${userId}`);
      if (!targetUser) {
        return c.json({ success: false, error: 'User not found' }, 404);
      }

      // Anonymize user data in KV mode (instead of deleting)
      const anonymizedEmail = `deleted_${userId}@deleted.user`;
      await kv.set(`user:${userId}`, {
        ...targetUser,
        name: '[Deleted User]',
        email: anonymizedEmail,
        phone: null,
        address: null,
        city: null,
        state: null,
        pinCode: null,
        gstNumber: null,
        country: null
      });
      
      // Delete old email mapping
      if (targetUser.email) {
        await kv.del(`user-email:${targetUser.email.toLowerCase()}`);
      }

      // Delete delivery info
      await kv.del(`delivery:${userId}`);

      // KEEP orders and affiliate data for financial integrity
      
      return c.json({ success: true });
    }
  } catch (error: any) {
    console.error('Delete user error:', error);
    return c.json({ success: false, error: error.message || 'Failed to delete user' }, 400);
  }
});

// Admin Routes - Discounts Management
app.get('/make-server-8927474f/admin/discounts', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!userData?.is_admin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      const { data: discounts, error: fetchError } = await supabase
        .from('discount_codes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;

      // Transform snake_case to camelCase for frontend
      const transformedDiscounts = (discounts || []).map((discount: any) => ({
        id: discount.id,
        code: discount.code,
        type: discount.discount_type,
        value: discount.discount_value,
        minOrderValue: discount.min_order_amount,
        maxUses: discount.usage_limit,
        currentUses: discount.used_count || 0,
        expiresAt: discount.expires_at,
        isActive: discount.is_active,
        affiliateId: discount.affiliate_id,
        createdAt: discount.created_at,
      }));

      return c.json({ success: true, discounts: transformedDiscounts });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      const discounts = await kv.getByPrefix('discount:');
      return c.json({ success: true, discounts });
    }
  } catch (error: any) {
    console.error('Get discounts error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

app.post('/make-server-8927474f/admin/discounts', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const discountData = await c.req.json();
    
    // Validate discount code
    if (!discountData.code) {
      return c.json({ success: false, error: 'Discount code is required' }, 400);
    }

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!userData?.is_admin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      // Check if code already exists
      const { data: existingDiscount } = await supabase
        .from('discount_codes')
        .select('id')
        .eq('code', discountData.code)
        .single();
      
      if (existingDiscount) {
        return c.json({ success: false, error: 'Discount code already exists' }, 400);
      }

      // Insert discount
      const { data: newDiscount, error: insertError } = await supabase
        .from('discount_codes')
        .insert({
          code: discountData.code,
          discount_type: discountData.type,
          discount_value: discountData.value,
          min_order_amount: discountData.minOrderValue,
          usage_limit: discountData.maxUses,
          used_count: 0,
          expires_at: discountData.expiresAt,
          is_active: discountData.isActive !== false,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return c.json({ success: true, id: newDiscount.id });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      const discountId = `discount:${Date.now()}`;

      // Check if code already exists
      const existingDiscount = await kv.get(`discount-code:${discountData.code}`);
      if (existingDiscount) {
        return c.json({ success: false, error: 'Discount code already exists' }, 400);
      }

      const discount = {
        ...discountData,
        id: discountId,
        createdAt: new Date().toISOString(),
      };
      
      // Store discount by ID (for admin listing) and by code (for fast lookup)
      await kv.mset([
        { key: discountId, value: discount },
        { key: `discount-code:${discountData.code}`, value: discount }
      ]);

      return c.json({ success: true, id: discountId });
    }
  } catch (error: any) {
    console.error('Create discount error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

app.patch('/make-server-8927474f/admin/discounts/:id', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const discountId = c.req.param('id');
    const updates = await c.req.json();

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!userData?.is_admin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      // Transform updates to snake_case
      const sqlUpdates: any = {};
      if (updates.code) sqlUpdates.code = updates.code;
      if (updates.type) sqlUpdates.discount_type = updates.type;
      if (updates.value !== undefined) sqlUpdates.discount_value = updates.value;
      if (updates.minOrderValue !== undefined) sqlUpdates.min_order_amount = updates.minOrderValue;
      if (updates.maxUses !== undefined) sqlUpdates.usage_limit = updates.maxUses;
      if (updates.currentUses !== undefined) sqlUpdates.used_count = updates.currentUses;
      if (updates.expiresAt) sqlUpdates.expires_at = updates.expiresAt;
      if (updates.isActive !== undefined) sqlUpdates.is_active = updates.isActive;

      // Update discount
      const { error: updateError } = await supabase
        .from('discount_codes')
        .update(sqlUpdates)
        .eq('id', discountId);

      if (updateError) throw updateError;

      return c.json({ success: true });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }
      
      const discount = await kv.get(discountId);
      if (!discount) {
        return c.json({ success: false, error: 'Discount not found' }, 404);
      }

      const oldCode = discount.code;
      const updatedDiscount = { ...discount, ...updates };
      
      // Update discount by ID
      await kv.set(discountId, updatedDiscount);
      
      // If discount code changed, delete old code key and create new one
      if (updates.code && updates.code !== oldCode) {
        await kv.del(`discount-code:${oldCode}`);
        await kv.set(`discount-code:${updates.code}`, updatedDiscount);
      } else {
        // Update existing code key
        await kv.set(`discount-code:${discount.code}`, updatedDiscount);
      }
      
      return c.json({ success: true });
    }
  } catch (error: any) {
    console.error('Update discount error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

app.delete('/make-server-8927474f/admin/discounts/:id', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const discountId = c.req.param('id');

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!userData?.is_admin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      // Delete discount
      const { error: deleteError } = await supabase
        .from('discount_codes')
        .delete()
        .eq('id', discountId);

      if (deleteError) throw deleteError;

      return c.json({ success: true });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }
      
      // Get discount to find its code
      const discount = await kv.get(discountId);
      
      // Delete both keys
      await kv.mdel([discountId, `discount-code:${discount?.code}`]);
      
      return c.json({ success: true });
    }
  } catch (error: any) {
    console.error('Delete discount error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

// Admin Routes - Affiliates Management
app.get('/make-server-8927474f/admin/affiliates', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!userData?.is_admin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      const { data: affiliates, error: fetchError } = await supabase
        .from('affiliates')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;

      // Get all discount codes linked to affiliates
      const { data: discountCodes } = await supabase
        .from('discount_codes')
        .select('code, affiliate_id')
        .not('affiliate_id', 'is', null);

      // Create a map of affiliate_id -> discount_code
      const discountCodeMap = new Map();
      (discountCodes || []).forEach((dc: any) => {
        discountCodeMap.set(dc.affiliate_id, dc.code);
      });

      // Transform snake_case to camelCase for frontend
      const transformedAffiliates = (affiliates || []).map((affiliate: any) => ({
        id: affiliate.id,
        name: affiliate.name,
        email: affiliate.email,
        phone: affiliate.phone,
        discountCode: discountCodeMap.get(affiliate.id) || '',
        discountPercentage: affiliate.discount_percentage || 0,
        commissionPercentage: affiliate.commission_percentage || 0,
        totalSales: affiliate.total_sales || 0,
        totalCommission: affiliate.total_commission || 0,
        totalPaid: affiliate.total_paid || 0, // Fixed: now reading from database
        usageCount: affiliate.usage_count || 0,
        isActive: affiliate.is_active,
        createdAt: affiliate.created_at,
      }));

      return c.json({ success: true, affiliates: transformedAffiliates });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      const affiliates = await kv.getByPrefix('affiliate:');
      return c.json({ success: true, affiliates });
    }
  } catch (error: any) {
    console.error('Get affiliates error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

app.post('/make-server-8927474f/admin/affiliates', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const affiliateData = await c.req.json();

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!userData?.is_admin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      // Create affiliate
      const { data: newAffiliate, error: insertError } = await supabase
        .from('affiliates')
        .insert({
          name: affiliateData.name,
          email: affiliateData.email,
          phone: affiliateData.phone,
          discount_percentage: affiliateData.discountPercentage || 10,
          commission_percentage: affiliateData.commissionPercentage || 5,
          total_orders: 0,
          total_revenue: 0,
          total_commission: 0,
          is_active: affiliateData.isActive !== false,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Automatically create a corresponding discount code
      console.log(`📝 Creating discount code: ${affiliateData.discountCode} with ${affiliateData.discountPercentage}% discount`);
      const { data: newDiscount, error: discountError } = await supabase
        .from('discount_codes')
        .insert({
          code: affiliateData.discountCode,
          discount_type: 'percentage',
          discount_value: affiliateData.discountPercentage || 10,
          min_order_amount: 0,
          usage_limit: null,
          used_count: 0,
          expires_at: null,
          is_active: true,
          affiliate_id: newAffiliate.id,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (discountError) {
        console.error('❌ Error creating discount code:', discountError);
        throw new Error(`Failed to create discount code: ${discountError.message}`);
      }
      console.log(`✅ Created discount code successfully:`, newDiscount);

      // 🔗 AUTO-LINK: Find user with matching email and link them to this affiliate
      console.log(`🔗 Checking if user exists with email: ${affiliateData.email}`);
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, email, is_affiliate, affiliate_id')
        .eq('email', affiliateData.email)
        .single();

      if (existingUser) {
        console.log(`✅ Found user! Linking affiliate ${newAffiliate.id} to user ${existingUser.id}`);
        const { error: linkError } = await supabase
          .from('users')
          .update({
            is_affiliate: true,
            affiliate_id: newAffiliate.id
          })
          .eq('id', existingUser.id);

        if (linkError) {
          console.error('❌ Error linking affiliate to user:', linkError);
        } else {
          console.log('✅ Successfully linked affiliate to user account!');
        }
      } else {
        console.log(`ℹ️ No user found with email ${affiliateData.email} - affiliate created but not linked to user account yet`);
      }

      // 📧 Send affiliate welcome email
      console.log(`📧 Sending welcome email to ${newAffiliate.email}...`);
      try {
        await sendAffiliateWelcomeEmail({
          email: newAffiliate.email,
          name: newAffiliate.name,
          discountCode: affiliateData.discountCode,
          commissionPercentage: affiliateData.commissionPercentage || 5,
          referralLink: `https://www.sheetcutters.com?ref=${affiliateData.discountCode}`,
        });
        console.log(`✅ Affiliate welcome email sent successfully to ${newAffiliate.email}`);
      } catch (emailError: any) {
        console.error(`❌ Failed to send affiliate welcome email to ${newAffiliate.email}:`, emailError);
        // Don't fail the affiliate creation if email fails
      }

      return c.json({ success: true, id: newAffiliate.id });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      const affiliateId = `affiliate:${Date.now()}`;
      
      // Create affiliate
      await kv.set(affiliateId, {
        ...affiliateData,
        id: affiliateId,
        createdAt: new Date().toISOString(),
      });

      // Automatically create a corresponding discount code
      const discountId = `discount:${Date.now()}`;
      const discount = {
        id: discountId,
        code: affiliateData.discountCode,
        type: 'percentage',
        value: affiliateData.discountPercentage || 10, // Use affiliate's discount percentage for customers
        description: `Affiliate discount for ${affiliateData.name}`,
        active: true,
        minOrderAmount: 0,
        maxDiscountAmount: null,
        usageLimit: null,
        usedCount: 0,
        expiresAt: null,
        affiliateId: affiliateId, // Link to affiliate
        createdAt: new Date().toISOString(),
      };
      
      // Store discount by ID and by code for fast lookup
      await kv.mset([
        { key: discountId, value: discount },
        { key: `discount-code:${affiliateData.discountCode}`, value: discount }
      ]);

      // 📧 Send affiliate welcome email
      console.log(`📧 Sending welcome email to ${affiliateData.email}...`);
      try {
        await sendAffiliateWelcomeEmail({
          email: affiliateData.email,
          name: affiliateData.name,
          discountCode: affiliateData.discountCode,
          commissionPercentage: affiliateData.commissionPercentage || 5,
          referralLink: `https://www.sheetcutters.com?ref=${affiliateData.discountCode}`,
        });
        console.log(`✅ Affiliate welcome email sent successfully to ${affiliateData.email}`);
      } catch (emailError: any) {
        console.error(`❌ Failed to send affiliate welcome email to ${affiliateData.email}:`, emailError);
        // Don't fail the affiliate creation if email fails
      }

      return c.json({ success: true, id: affiliateId });
    }
  } catch (error: any) {
    console.error('Create affiliate error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

app.patch('/make-server-8927474f/admin/affiliates/:id', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const userData = await kv.get(`user:${user.id}`);
    if (!userData?.isAdmin) {
      return c.json({ success: false, error: 'Admin access required' }, 403);
    }

    const affiliateId = c.req.param('id');
    const updates = await c.req.json();

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!userData?.is_admin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      // Transform updates to snake_case
      const sqlUpdates: any = {};
      if (updates.name) sqlUpdates.name = updates.name;
      if (updates.email) sqlUpdates.email = updates.email;
      if (updates.phone) sqlUpdates.phone = updates.phone;
      if (updates.discountCode) sqlUpdates.discount_code = updates.discountCode;
      if (updates.discountPercentage !== undefined) sqlUpdates.discount_percentage = updates.discountPercentage;
      if (updates.commissionPercentage !== undefined) sqlUpdates.commission_percentage = updates.commissionPercentage;
      if (updates.isActive !== undefined) sqlUpdates.is_active = updates.isActive;

      // Update affiliate
      const { error: updateError } = await supabase
        .from('affiliates')
        .update(sqlUpdates)
        .eq('id', affiliateId);

      if (updateError) throw updateError;

      // Update corresponding discount code if it exists
      if (updates.discountCode || updates.discountPercentage || updates.isActive !== undefined) {
        const discountUpdates: any = {};
        if (updates.discountCode) discountUpdates.code = updates.discountCode;
        if (updates.discountPercentage) discountUpdates.discount_value = updates.discountPercentage;
        if (updates.isActive !== undefined) discountUpdates.is_active = updates.isActive;
        
        await supabase
          .from('discount_codes')
          .update(discountUpdates)
          .eq('affiliate_id', affiliateId);
      }

      return c.json({ success: true });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }
      
      const affiliate = await kv.get(affiliateId);
      if (!affiliate) {
        return c.json({ success: false, error: 'Affiliate not found' }, 404);
      }

      // Update affiliate
      await kv.set(affiliateId, { ...affiliate, ...updates });

      // Update corresponding discount code if it exists
      if (updates.discountCode || updates.discountPercentage || updates.isActive !== undefined) {
        // Find linked discount - still need getByPrefix here since we're looking by affiliateId
        const discounts = await kv.getByPrefix('discount:');
        const linkedDiscount = discounts.find((d: any) => d.affiliateId === affiliateId);
        
        if (linkedDiscount) {
          const oldCode = linkedDiscount.code;
          const discountUpdates: any = {};
          if (updates.discountCode) discountUpdates.code = updates.discountCode;
          if (updates.discountPercentage) discountUpdates.value = updates.discountPercentage;
          if (updates.isActive !== undefined) discountUpdates.active = updates.isActive;
          
          const updatedDiscount = { ...linkedDiscount, ...discountUpdates };
          
          // Update discount by ID
          await kv.set(linkedDiscount.id, updatedDiscount);
          
          // If discount code changed, delete old code key and create new one
          if (updates.discountCode && updates.discountCode !== oldCode) {
            await kv.del(`discount-code:${oldCode}`);
            await kv.set(`discount-code:${updates.discountCode}`, updatedDiscount);
          } else {
            // Update existing code key
            await kv.set(`discount-code:${linkedDiscount.code}`, updatedDiscount);
          }
        }
      }

      return c.json({ success: true });
    }
  } catch (error: any) {
    console.error('Update affiliate error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

// Get affiliate usage history
app.get('/make-server-8927474f/admin/affiliates/:id/usage', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const affiliateId = c.req.param('id');

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!userData?.is_admin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      // Get all usage records for this affiliate
      const { data: usageRecords, error: fetchError } = await supabase
        .from('affiliate_usage')
        .select('*')
        .eq('affiliate_id', affiliateId)
        .order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;

      // Map database columns to frontend format
      const mappedRecords = (usageRecords || []).map(record => ({
        id: record.id,
        affiliateId: record.affiliate_id,
        affiliateName: record.affiliate_name,
        discountCode: record.discount_code,
        userId: record.user_id,
        userEmail: record.user_email,
        orderValue: parseFloat(record.order_value) || 0,
        commission: parseFloat(record.commission) || 0,
        timestamp: record.created_at,
        orderId: record.order_id,
        batchId: record.batch_id,
        orderNumber: record.order_number,
      }));

      return c.json({ success: true, usageHistory: mappedRecords });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }
      
      // Get all usage records for this affiliate
      const usageRecords = await kv.getByPrefix(`affiliate-usage:${affiliateId}:`);
      
      // Sort by timestamp descending (newest first)
      const sortedRecords = usageRecords.sort((a: any, b: any) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
      
      return c.json({ success: true, usageHistory: sortedRecords });
    }
  } catch (error: any) {
    console.error('Get affiliate usage error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

app.delete('/make-server-8927474f/admin/affiliates/:id', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const affiliateId = c.req.param('id');

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!userData?.is_admin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      // Step 1: Unlink any users that reference this affiliate
      console.log(`🔗 Unlinking users from affiliate ${affiliateId}...`);
      const { error: unlinkError } = await supabase
        .from('users')
        .update({ 
          affiliate_id: null,
          is_affiliate: false 
        })
        .eq('affiliate_id', affiliateId);

      if (unlinkError) {
        console.error('❌ Error unlinking users:', unlinkError);
        throw unlinkError;
      }
      console.log('✅ Users unlinked successfully');

      // Step 2: Delete the corresponding discount code
      console.log(`🗑️ Deleting discount codes for affiliate ${affiliateId}...`);
      const { error: discountDeleteError } = await supabase
        .from('discount_codes')
        .delete()
        .eq('affiliate_id', affiliateId);

      if (discountDeleteError) {
        console.error('❌ Error deleting discount codes:', discountDeleteError);
        // Don't throw - continue with affiliate deletion
      } else {
        console.log('✅ Discount codes deleted successfully');
      }

      // Step 3: Delete affiliate
      console.log(`🗑️ Deleting affiliate ${affiliateId}...`);
      const { error: deleteError } = await supabase
        .from('affiliates')
        .delete()
        .eq('id', affiliateId);

      if (deleteError) throw deleteError;
      console.log('✅ Affiliate deleted successfully');

      return c.json({ success: true });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }
      
      // Delete affiliate
      await kv.del(affiliateId);

      // Also delete the corresponding discount code
      const discounts = await kv.getByPrefix('discount:');
      const linkedDiscount = discounts.find((d: any) => d.affiliateId === affiliateId);
      if (linkedDiscount) {
        await kv.del(linkedDiscount.id);
      }
      
      return c.json({ success: true });
    }
  } catch (error: any) {
    console.error('Delete affiliate error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

// Admin Routes - Disbursement Management
app.post('/make-server-8927474f/admin/disbursements', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const { affiliateId, amount, transactionNumber, notes } = await c.req.json();

    if (!affiliateId || !amount || !transactionNumber) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!userData?.is_admin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      // Check affiliate exists
      const { data: affiliate, error: fetchError } = await supabase
        .from('affiliates')
        .select('*')
        .eq('id', affiliateId)
        .single();
      
      if (fetchError || !affiliate) {
        return c.json({ success: false, error: 'Affiliate not found' }, 404);
      }

      // Create disbursement record
      const { data: newDisbursement, error: insertError } = await supabase
        .from('disbursements')
        .insert({
          affiliate_id: affiliateId,
          amount: parseFloat(amount),
          transaction_number: transactionNumber,
          notes: notes || '',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) throw insertError;

      console.log(`💰 Disbursement created: ₹${amount} for affiliate ${affiliateId}`);

      // Update affiliate total_paid
      const { error: updateError } = await supabase
        .from('affiliates')
        .update({
          total_paid: (affiliate.total_paid || 0) + parseFloat(amount)
        })
        .eq('id', affiliateId);

      if (updateError) {
        console.error('❌ Error updating affiliate total_paid:', updateError);
        throw updateError;
      }

      console.log(`✅ Updated affiliate total_paid to ₹${(affiliate.total_paid || 0) + parseFloat(amount)}`);

      return c.json({ success: true, id: newDisbursement.id });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      const affiliate = await kv.get(affiliateId);
      if (!affiliate) {
        return c.json({ success: false, error: 'Affiliate not found' }, 404);
      }

      const disbursementId = `disbursement:${Date.now()}:${Math.random().toString(36).substring(7)}`;
      const disbursement = {
        id: disbursementId,
        affiliateId,
        amount: parseFloat(amount),
        transactionNumber,
        notes: notes || '',
        date: new Date().toISOString(),
      };

      // Save disbursement
      await kv.set(disbursementId, disbursement);

      // Update affiliate totalPaid
      const updatedAffiliate = {
        ...affiliate,
        totalPaid: (affiliate.totalPaid || 0) + parseFloat(amount),
        disbursements: [...(affiliate.disbursements || []), disbursement],
      };

      await kv.set(affiliateId, updatedAffiliate);

      return c.json({ success: true, id: disbursementId });
    }
  } catch (error: any) {
    console.error('Create disbursement error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

// Get all disbursements (Admin)
app.get('/make-server-8927474f/admin/disbursements', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!userData?.is_admin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      // Get all disbursements with affiliate names
      const { data: disbursements, error: fetchError } = await supabase
        .from('disbursements')
        .select(`
          *,
          affiliates (
            name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Transform to camelCase for frontend
      const transformedDisbursements = (disbursements || []).map((d: any) => ({
        id: d.id,
        affiliateId: d.affiliate_id,
        affiliateName: d.affiliates?.name || 'Unknown',
        affiliateEmail: d.affiliates?.email || '',
        amount: d.amount,
        transactionNumber: d.transaction_number,
        notes: d.notes || '',
        createdAt: d.created_at,
      }));

      return c.json({ success: true, disbursements: transformedDisbursements });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      const disbursements = await kv.getByPrefix('disbursement:');
      return c.json({ success: true, disbursements });
    }
  } catch (error: any) {
    console.error('Get disbursements error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

// User Affiliate Dashboard - Get affiliate stats for logged-in user
app.get('/make-server-8927474f/affiliate/dashboard', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      console.log('📊 Fetching affiliate dashboard for user:', user.id);

      // Get user record to check if they're an affiliate
      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('id, email, is_affiliate, affiliate_id')
        .eq('auth_user_id', user.id)
        .single();

      if (userError || !userRecord) {
        console.error('�� User not found:', userError);
        return c.json({ success: false, error: 'User not found' }, 404);
      }

      if (!userRecord.is_affiliate || !userRecord.affiliate_id) {
        return c.json({ success: false, error: 'Not an affiliate' }, 403);
      }

      // Get affiliate data
      const { data: affiliate, error: affiliateError } = await supabase
        .from('affiliates')
        .select('*')
        .eq('id', userRecord.affiliate_id)
        .single();

      if (affiliateError || !affiliate) {
        console.error('❌ Affiliate not found:', affiliateError);
        return c.json({ success: false, error: 'Affiliate record not found' }, 404);
      }

      // Get the discount code for this affiliate
      const { data: discountCode, error: discountCodeError } = await supabase
        .from('discount_codes')
        .select('code')
        .eq('affiliate_id', userRecord.affiliate_id)
        .eq('is_active', true)
        .single();

      if (discountCodeError) {
        console.error('❌ Discount code not found:', discountCodeError);
      }

      // Get usage history (who used their code)
      const { data: usageHistory, error: usageError } = await supabase
        .from('affiliate_usage')
        .select('*')
        .eq('affiliate_id', userRecord.affiliate_id)
        .order('created_at', { ascending: false });

      if (usageError) {
        console.error('❌ Error fetching usage history:', usageError);
      }

      // Get disbursements (payments received)
      const { data: disbursements, error: disbursementsError } = await supabase
        .from('disbursements')
        .select('*')
        .eq('affiliate_id', userRecord.affiliate_id)
        .order('created_at', { ascending: false });

      if (disbursementsError) {
        console.error('❌ Error fetching disbursements:', disbursementsError);
      }

      return c.json({
        success: true,
        affiliate: {
          id: affiliate.id,
          name: affiliate.name,
          email: affiliate.email,
          phone: affiliate.phone,
          discountCode: discountCode?.code || '',
          discountPercentage: affiliate.discount_percentage,
          commissionPercentage: affiliate.commission_percentage,
          totalSales: affiliate.total_sales || 0,
          totalCommission: affiliate.total_commission || 0,
          totalPaid: affiliate.total_paid || 0,
          usageCount: affiliate.usage_count || 0,
          isActive: affiliate.is_active,
          createdAt: affiliate.created_at,
        },
        usageHistory: (usageHistory || []).map((usage: any) => ({
          id: usage.id,
          userEmail: usage.user_email,
          orderValue: usage.order_value,
          commission: usage.commission,
          orderNumber: usage.order_number,
          timestamp: usage.created_at,
        })),
        disbursements: (disbursements || []).map((d: any) => ({
          id: d.id,
          amount: d.amount,
          transactionNumber: d.transaction_number,
          notes: d.notes,
          date: d.created_at,
        })),
      });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      return c.json({ success: false, error: 'KV mode not supported for affiliate dashboard' }, 400);
    }
  } catch (error: any) {
    console.error('Get affiliate dashboard error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Admin Routes - Shipping Management
// ⚠️ DORMANT FEATURE: Shipping Partners
// These endpoints are kept active but UI is disabled to reduce admin panel complexity.
// Backend endpoints remain functional for future re-enablement.
// To re-enable: See /docs/SHIPPING-PARTNERS-TOGGLE.md

app.get('/make-server-8927474f/admin/shipping-partners', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!userData?.is_admin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      const { data: partners, error: fetchError } = await supabase
        .from('shipping_partners')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;

      return c.json({ success: true, partners: partners || [] });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      const partners = await kv.getByPrefix('shipping-partner:');
      return c.json({ success: true, partners });
    }
  } catch (error: any) {
    console.error('Get shipping partners error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

app.post('/make-server-8927474f/admin/shipping-partners', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const partnerData = await c.req.json();

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!userData?.is_admin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      const { data: newPartner, error: insertError } = await supabase
        .from('shipping_partners')
        .insert({
          name: partnerData.name,
          contact_person: partnerData.contactPerson,
          email: partnerData.email,
          phone: partnerData.phone,
          address: partnerData.address,
          is_active: partnerData.isActive !== false,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return c.json({ success: true, id: newPartner.id });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      const partnerId = `shipping-partner:${partnerData.id}`;
      
      await kv.set(partnerId, {
        ...partnerData,
        createdAt: new Date().toISOString(),
      });

      return c.json({ success: true, id: partnerId });
    }
  } catch (error: any) {
    console.error('Create shipping partner error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

app.put('/make-server-8927474f/admin/shipping-partners/:id', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const partnerId = c.req.param('id');
    const updates = await c.req.json();

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!userData?.is_admin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      const sqlUpdates: any = {};
      if (updates.name) sqlUpdates.name = updates.name;
      if (updates.contactPerson) sqlUpdates.contact_person = updates.contactPerson;
      if (updates.email) sqlUpdates.email = updates.email;
      if (updates.phone) sqlUpdates.phone = updates.phone;
      if (updates.address) sqlUpdates.address = updates.address;
      if (updates.isActive !== undefined) sqlUpdates.is_active = updates.isActive;

      const { error: updateError } = await supabase
        .from('shipping_partners')
        .update(sqlUpdates)
        .eq('id', partnerId);

      if (updateError) throw updateError;

      return c.json({ success: true });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      const partnerIdKey = `shipping-partner:${partnerId}`;
      await kv.set(partnerIdKey, updates);
      return c.json({ success: true });
    }
  } catch (error: any) {
    console.error('Update shipping partner error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

app.delete('/make-server-8927474f/admin/shipping-partners/:id', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const partnerId = c.req.param('id');

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!userData?.is_admin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      const { error: deleteError } = await supabase
        .from('shipping_partners')
        .delete()
        .eq('id', partnerId);

      if (deleteError) throw deleteError;
      
      return c.json({ success: true });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      const partnerIdKey = `shipping-partner:${partnerId}`;
      await kv.del(partnerIdKey);
      
      return c.json({ success: true });
    }
  } catch (error: any) {
    console.error('Delete shipping partner error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

app.get('/make-server-8927474f/admin/shipping-rates', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!userData?.is_admin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      const { data: rates, error: fetchError } = await supabase
        .from('shipping_rates')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;

      return c.json({ success: true, rates: rates || [] });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      const rates = await kv.getByPrefix('shipping-rate:');
      return c.json({ success: true, rates });
    }
  } catch (error: any) {
    console.error('Get shipping rates error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

// Public endpoint for shipping rates (accessible by all users for checkout)
app.get('/make-server-8927474f/shipping-rates', async (c) => {
  try {
    // No authentication required - shipping rates are public information needed for checkout
    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: rates, error: fetchError } = await supabase
        .from('shipping_rates')
        .select('*')
        .eq('is_active', true)
        .order('state', { ascending: true });
      
      if (fetchError) throw fetchError;

      return c.json({ success: true, rates: rates || [] });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const rates = await kv.getByPrefix('shipping-rate:');
      return c.json({ success: true, rates });
    }
  } catch (error: any) {
    console.error('Get public shipping rates error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

app.post('/make-server-8927474f/admin/shipping-rates', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const rateData = await c.req.json();

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!userData?.is_admin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      const { data: newRate, error: insertError } = await supabase
        .from('shipping_rates')
        .insert({
          state: rateData.state,
          rate: rateData.rate,
          min_order_value: rateData.min_order_value,
          free_shipping_threshold: rateData.free_shipping_threshold,
          is_active: rateData.isActive !== false,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return c.json({ success: true, id: newRate.id });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      const rateId = `shipping-rate:${rateData.id}`;
      
      await kv.set(rateId, rateData);
      return c.json({ success: true, id: rateId });
    }
  } catch (error: any) {
    console.error('Create shipping rate error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

app.put('/make-server-8927474f/admin/shipping-rates/:id', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const rateId = c.req.param('id');
    const updates = await c.req.json();

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!userData?.is_admin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      const sqlUpdates: any = {};
      if (updates.state) sqlUpdates.state = updates.state;
      if (updates.rate !== undefined) sqlUpdates.rate = updates.rate;
      if (updates.min_order_value !== undefined) sqlUpdates.min_order_value = updates.min_order_value;
      if (updates.free_shipping_threshold !== undefined) sqlUpdates.free_shipping_threshold = updates.free_shipping_threshold;
      if (updates.isActive !== undefined) sqlUpdates.is_active = updates.isActive;

      const { error: updateError } = await supabase
        .from('shipping_rates')
        .update(sqlUpdates)
        .eq('id', rateId);

      if (updateError) throw updateError;

      return c.json({ success: true });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      const rateIdKey = `shipping-rate:${rateId}`;
      await kv.set(rateIdKey, updates);
      return c.json({ success: true });
    }
  } catch (error: any) {
    console.error('Update shipping rate error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

app.delete('/make-server-8927474f/admin/shipping-rates/:id', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const rateId = c.req.param('id');

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!userData?.is_admin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      const { error: deleteError } = await supabase
        .from('shipping_rates')
        .delete()
        .eq('id', rateId);

      if (deleteError) throw deleteError;
      
      return c.json({ success: true });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      const rateIdKey = `shipping-rate:${rateId}`;
      await kv.del(rateIdKey);
      
      return c.json({ success: true });
    }
  } catch (error: any) {
    console.error('Delete shipping rate error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

// Admin Routes - Payments Management
app.get('/make-server-8927474f/admin/payments', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    // Return empty payments list since we don't have a separate payments table
    // Payment status is tracked in the orders table instead
    return c.json({ success: true, payments: [] });
  } catch (error: any) {
    console.error('Get payments error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

// Admin Routes - Payment Gateway Configuration
app.get('/make-server-8927474f/admin/payment-gateways', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!userData?.is_admin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      const { data: razorpayData } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'payment_gateway:razorpay')
        .single();

      const { data: payuData } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'payment_gateway:payu')
        .single();

      const razorpay = razorpayData?.value || { isEnabled: false };
      const payu = payuData?.value || { isEnabled: false };
      
      return c.json({ success: true, razorpay, payu });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      const razorpay = await kv.get('payment_gateway:razorpay') || { isEnabled: false };
      const payu = await kv.get('payment_gateway:payu') || { isEnabled: false };
      
      return c.json({ success: true, razorpay, payu });
    }
  } catch (error: any) {
    console.error('Get payment gateways error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

app.put('/make-server-8927474f/admin/payment-gateways/:gateway', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const gateway = c.req.param('gateway');
    if (gateway !== 'razorpay' && gateway !== 'payu') {
      return c.json({ success: false, error: 'Invalid gateway' }, 400);
    }

    const config = await c.req.json();

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!userData?.is_admin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      // Get existing config to merge with new values
      const { data: existingConfig } = await supabase
        .from('settings')
        .select('value')
        .eq('key', `payment_gateway:${gateway}`)
        .single();
      
      // Merge existing config with new config (preserves fields not in the update)
      const mergedConfig = {
        ...(existingConfig?.value || {}),
        ...config
      };

      // Upsert payment gateway settings
      await supabase
        .from('settings')
        .upsert({
          key: `payment_gateway:${gateway}`,
          value: mergedConfig,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
      
      return c.json({ success: true });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      // Get existing config to merge with new values
      const existingConfig = await kv.get(`payment_gateway:${gateway}`) || {};
      
      // Merge existing config with new config
      const mergedConfig = {
        ...existingConfig,
        ...config
      };

      await kv.set(`payment_gateway:${gateway}`, mergedConfig);
      
      return c.json({ success: true });
    }
  } catch (error: any) {
    console.error('Update payment gateway error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

// Public endpoint to get enabled payment methods (for checkout screen)
app.get('/make-server-8927474f/payment-methods/enabled', async (c) => {
  try {
    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: razorpayData } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'payment_gateway:razorpay')
        .single();

      const { data: payuData } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'payment_gateway:payu')
        .single();

      const razorpay = razorpayData?.value || { isEnabled: true }; // Default enabled
      const payu = payuData?.value || { isEnabled: true }; // Default enabled
      
      return c.json({ 
        success: true, 
        methods: {
          razorpay: razorpay.isEnabled !== false, // Enabled unless explicitly false
          payu: payu.isEnabled !== false
        }
      });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const razorpay = await kv.get('payment_gateway:razorpay') || { isEnabled: true };
      const payu = await kv.get('payment_gateway:payu') || { isEnabled: true };
      
      return c.json({ 
        success: true, 
        methods: {
          razorpay: razorpay.isEnabled !== false,
          payu: payu.isEnabled !== false
        }
      });
    }
  } catch (error: any) {
    console.error('Get enabled payment methods error:', error);
    // On error, return both enabled to avoid blocking checkout
    return c.json({ 
      success: true, 
      methods: { razorpay: true, payu: true }
    });
  }
});

// ==============================================
// PAYMENT GATEWAY INTEGRATION
// ==============================================

// Create Payment Order - called before checkout
// Creates Razorpay/PayU order and returns order_id for frontend SDK
app.post('/make-server-8927474f/create-payment-order', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const { amount, currency = 'INR', gateway, receipt } = await c.req.json();

    if (!amount || amount <= 0) {
      return c.json({ success: false, error: 'Invalid amount' }, 400);
    }

    if (!gateway || !['razorpay', 'payu'].includes(gateway)) {
      return c.json({ success: false, error: 'Invalid gateway' }, 400);
    }

    console.log(`💳 Creating ${gateway} payment order for ₹${amount}`);

    // Get gateway configuration
    let gatewayConfig;
    if (USE_SQL_TABLES) {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', `payment_gateway:${gateway}`)
        .single();
      gatewayConfig = data?.value;
    } else {
      gatewayConfig = await kv.get(`payment_gateway:${gateway}`);
    }

    if (!gatewayConfig || !gatewayConfig.isEnabled) {
      return c.json({ success: false, error: 'Payment gateway not configured' }, 400);
    }

    if (gateway === 'razorpay') {
      // Razorpay Integration
      const { keyId, secretKey } = gatewayConfig;
      
      if (!keyId || !secretKey) {
        return c.json({ success: false, error: 'Razorpay credentials not configured' }, 400);
      }

      // Create Razorpay order using their API
      const razorpayOrderData = {
        amount: Math.round(amount * 100), // Razorpay uses paise (₹1 = 100 paise)
        currency,
        receipt: receipt || `receipt_${Date.now()}`,
      };

      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`${keyId}:${secretKey}`)}`
        },
        body: JSON.stringify(razorpayOrderData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Razorpay order creation failed:', errorData);
        return c.json({ success: false, error: 'Failed to create payment order' }, 500);
      }

      const razorpayOrder = await response.json();
      console.log('✅ Razorpay order created:', razorpayOrder.id);

      return c.json({
        success: true,
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        keyId, // Send key_id for frontend SDK
      });

    } else if (gateway === 'payu') {
      // PayU Integration
      const { merchantId, secretKey } = gatewayConfig;
      
      if (!merchantId || !secretKey) {
        return c.json({ success: false, error: 'PayU credentials not configured' }, 400);
      }

      // PayU doesn't require pre-order creation like Razorpay
      // We'll generate a txnid and return necessary data for frontend
      const txnid = `TXN${Date.now()}${Math.random().toString(36).substring(7)}`;

      return c.json({
        success: true,
        txnid,
        merchantId,
        amount,
        productInfo: 'Laser Cutting Order',
        firstName: user.email.split('@')[0], // Extract name from email
        email: user.email,
        phone: '', // Will be provided by frontend from delivery info
        // Don't send secretKey to frontend - will be used for hash generation on server
      });
    }

  } catch (error: any) {
    console.error('Create payment order error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Verify Payment - called after payment completion
// Verifies payment signature and updates order status
app.post('/make-server-8927474f/verify-payment', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { gateway, razorpay_order_id, razorpay_payment_id, razorpay_signature, payu_data } = body;

    console.log(`🔐 Verifying ${gateway} payment...`);

    // Get gateway configuration
    let gatewayConfig;
    if (USE_SQL_TABLES) {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', `payment_gateway:${gateway}`)
        .single();
      gatewayConfig = data?.value;
    } else {
      gatewayConfig = await kv.get(`payment_gateway:${gateway}`);
    }

    if (!gatewayConfig) {
      return c.json({ success: false, error: 'Payment gateway not configured' }, 400);
    }

    if (gateway === 'razorpay') {
      // Verify Razorpay payment signature
      const { secretKey } = gatewayConfig;
      
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return c.json({ success: false, error: 'Missing payment details' }, 400);
      }

      // Create signature: razorpay_order_id + "|" + razorpay_payment_id
      const crypto = await import('node:crypto');
      const expectedSignature = crypto
        .createHmac('sha256', secretKey)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (expectedSignature !== razorpay_signature) {
        console.error('❌ Razorpay signature verification failed');
        return c.json({ success: false, error: 'Payment verification failed' }, 400);
      }

      console.log('✅ Razorpay payment verified:', razorpay_payment_id);

      return c.json({
        success: true,
        verified: true,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
      });

    } else if (gateway === 'payu') {
      // Verify PayU payment hash
      const { secretKey } = gatewayConfig;
      const { status, txnid, amount, productInfo, firstName, email, hash } = payu_data || {};

      if (status !== 'success') {
        return c.json({ success: false, error: 'Payment not successful' }, 400);
      }

      // Verify hash: key|txnid|amount|productinfo|firstname|email|||||||||salt
      // For response: salt|status||||||||||email|firstname|productinfo|amount|txnid|key
      const crypto = await import('node:crypto');
      const hashString = `${secretKey}|${status}||||||||||${email}|${firstName}|${productInfo}|${amount}|${txnid}|${gatewayConfig.merchantId}`;
      const expectedHash = crypto.createHash('sha512').update(hashString).digest('hex');

      if (expectedHash !== hash) {
        console.error('❌ PayU hash verification failed');
        return c.json({ success: false, error: 'Payment verification failed' }, 400);
      }

      console.log('✅ PayU payment verified:', txnid);

      return c.json({
        success: true,
        verified: true,
        paymentId: txnid,
        orderId: txnid,
      });
    }

    return c.json({ success: false, error: 'Invalid gateway' }, 400);

  } catch (error: any) {
    console.error('Verify payment error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Generate PayU payment hash - called before form submission
app.post('/make-server-8927474f/generate-payu-hash', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const { txnid, amount, productInfo, firstName, email } = await c.req.json();

    // Get PayU configuration
    let gatewayConfig;
    if (USE_SQL_TABLES) {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'payment_gateway:payu')
        .single();
      gatewayConfig = data?.value;
    } else {
      gatewayConfig = await kv.get('payment_gateway:payu');
    }

    if (!gatewayConfig || !gatewayConfig.merchantId || !gatewayConfig.secretKey) {
      return c.json({ success: false, error: 'PayU not configured' }, 400);
    }

    // Generate hash: key|txnid|amount|productinfo|firstname|email|||||||||salt
    const crypto = await import('node:crypto');
    const hashString = `${gatewayConfig.merchantId}|${txnid}|${amount}|${productInfo}|${firstName}|${email}|||||||||${gatewayConfig.secretKey}`;
    const hash = crypto.createHash('sha512').update(hashString).digest('hex');

    console.log('✅ PayU hash generated for txnid:', txnid);

    return c.json({
      success: true,
      hash
    });

  } catch (error: any) {
    console.error('Generate PayU hash error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Payment Gateway Management Routes
app.get('/make-server-8927474f/payment-gateway', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!userData?.is_admin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'payment_gateway')
        .single();

      const gatewayData = data?.value || { provider: 'razorpay' };
      return c.json({ success: true, gateway: gatewayData });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      const gatewayData = await kv.get('payment_gateway') || { provider: 'razorpay' };
      return c.json({ success: true, gateway: gatewayData });
    }
  } catch (error: any) {
    console.error('Get payment gateway error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

app.post('/make-server-8927474f/payment-gateway', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const gatewayData = await c.req.json();

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!userData?.is_admin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      await supabase
        .from('settings')
        .upsert({
          key: 'payment_gateway',
          value: gatewayData,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      return c.json({ success: true });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      await kv.set('payment_gateway', gatewayData);
      return c.json({ success: true });
    }
  } catch (error: any) {
    console.error('Update payment gateway error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

// Settings Management Routes
app.get('/make-server-8927474f/settings/design-service-price', async (c) => {
  try {
    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'design_service_price')
        .single();
      
      const price = data?.value || 150;
      return c.json({ success: true, price });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const price = await kv.get('design_service_price') || 150;
      return c.json({ success: true, price });
    }
  } catch (error: any) {
    console.error('Get design service price error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

app.post('/make-server-8927474f/settings/design-service-price', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const { price } = await c.req.json();
    if (typeof price !== 'number' || price < 0) {
      return c.json({ success: false, error: 'Invalid price value' }, 400);
    }

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!userData?.is_admin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      await supabase
        .from('settings')
        .upsert({
          key: 'design_service_price',
          value: price,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      return c.json({ success: true, price });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      await kv.set('design_service_price', price);
      return c.json({ success: true, price });
    }
  } catch (error: any) {
    console.error('Update design service price error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

// Support Settings Routes (WhatsApp number, etc.)
app.get('/make-server-8927474f/settings/support', async (c) => {
  try {
    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      console.log('📞 Fetching support settings from SQL...');
      const { data, error: selectError } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'support_settings')
        .single();
      
      if (selectError && selectError.code !== 'PGRST116') {
        // PGRST116 = no rows found, which is fine (will use defaults)
        console.error('❌ Error fetching support settings from SQL:', selectError);
      }

      const defaultSettings = {
        whatsappNumber: '918217553454',
        supportEmail: 'support@sheetcutters.com',
        supportHours: '9 AM - 6 PM IST'
      };
      
      const settings = data?.value || defaultSettings;
      console.log('✅ Loaded support settings from SQL:', settings);
      return c.json({ success: true, settings });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const settings = await kv.get('support_settings') || {
        whatsappNumber: '918217553454',
        supportEmail: 'support@sheetcutters.com',
        supportHours: '9 AM - 6 PM IST'
      };
      return c.json({ success: true, settings });
    }
  } catch (error: any) {
    console.error('Get support settings error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

app.post('/make-server-8927474f/settings/support', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const { whatsappNumber, supportEmail, supportHours } = await c.req.json();
    
    // Validate WhatsApp number if provided
    if (whatsappNumber && typeof whatsappNumber !== 'string') {
      return c.json({ success: false, error: 'Invalid WhatsApp number' }, 400);
    }

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!userData?.is_admin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      // Get existing settings
      const { data: existingData, error: selectError } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'support_settings')
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        // PGRST116 = no rows found, which is fine for first-time save
        console.error('❌ Error fetching existing support settings from SQL:', selectError);
        return c.json({ success: false, error: `Database error: ${selectError.message}` }, 500);
      }

      const currentSettings = existingData?.value || {};
      
      // Merge with new settings
      const updatedSettings = {
        ...currentSettings,
        ...(whatsappNumber !== undefined && { whatsappNumber }),
        ...(supportEmail !== undefined && { supportEmail }),
        ...(supportHours !== undefined && { supportHours })
      };

      console.log('💾 Upserting support settings to SQL:', { key: 'support_settings', updatedSettings });

      const { data: upsertData, error: upsertError } = await supabase
        .from('settings')
        .upsert({
          key: 'support_settings',
          value: updatedSettings,
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'key'
        })
        .select();

      if (upsertError) {
        console.error('❌ SQL UPSERT FAILED for support_settings:', upsertError);
        console.error('❌ Error details:', {
          message: upsertError.message,
          code: upsertError.code,
          details: upsertError.details,
          hint: upsertError.hint
        });
        return c.json({ 
          success: false, 
          error: `Failed to save settings: ${upsertError.message}` 
        }, 500);
      }

      console.log('✅ Support settings saved to SQL successfully:', upsertData);
      return c.json({ success: true, settings: updatedSettings });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      const currentSettings = await kv.get('support_settings') || {};
      const updatedSettings = {
        ...currentSettings,
        ...(whatsappNumber !== undefined && { whatsappNumber }),
        ...(supportEmail !== undefined && { supportEmail }),
        ...(supportHours !== undefined && { supportHours })
      };

      await kv.set('support_settings', updatedSettings);
      return c.json({ success: true, settings: updatedSettings });
    }
  } catch (error: any) {
    console.error('Update support settings error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

// ============================================================================
// Pricing Constants Routes
// ============================================================================
// GET /pricing-constants - Fetch global pricing settings (public)
app.get('/make-server-8927474f/pricing-constants', async (c) => {
  try {
    console.log('💰 Fetching pricing constants...');
    
    // Default pricing constants
    const defaults = {
      setupCost: 100,
      profitMargin: 0.40,
      maxFileSize: 50, // 50MB default
      thicknessMultipliers: [
        { minThickness: 2, maxThickness: 3, multiplier: 1.0, label: '2-3mm' },
        { minThickness: 4, maxThickness: 5, multiplier: 1.4, label: '4-5mm' },
        { minThickness: 6, maxThickness: 6, multiplier: 1.8, label: '6mm' },
        { minThickness: 8, maxThickness: 8, multiplier: 2.5, label: '8mm' },
        { minThickness: 12, maxThickness: 999, multiplier: 3.0, label: '12mm+' },
      ]
    };
    
    // Try to get from KV store
    const stored = await kv.get('pricing_constants');
    const constants = stored || defaults;
    
    console.log('✅ Loaded pricing constants:', constants);
    return c.json({ success: true, ...constants });
  } catch (error: any) {
    console.error('❌ Error fetching pricing constants:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

// POST /pricing-constants - Save global pricing settings (admin only)
app.post('/make-server-8927474f/pricing-constants', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    // Verify admin
    if (USE_SQL_TABLES) {
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single();
      
      if (!userData?.is_admin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }
    } else {
      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }
    }

    const body = await c.req.json();
    const { setupCost, profitMargin, thicknessMultipliers } = body;

    // Validate inputs
    if (setupCost !== undefined && (typeof setupCost !== 'number' || setupCost < 0)) {
      return c.json({ success: false, error: 'Invalid setup cost' }, 400);
    }
    if (profitMargin !== undefined && (typeof profitMargin !== 'number' || profitMargin < 0)) {
      return c.json({ success: false, error: 'Invalid profit margin' }, 400);
    }
    if (thicknessMultipliers !== undefined && !Array.isArray(thicknessMultipliers)) {
      return c.json({ success: false, error: 'Invalid thickness multipliers' }, 400);
    }

    // Get current constants
    const current = await kv.get('pricing_constants') || {};
    
    // Merge with new values
    const updated = {
      setupCost: setupCost !== undefined ? setupCost : current.setupCost || 100,
      profitMargin: profitMargin !== undefined ? profitMargin : current.profitMargin || 0.40,
      thicknessMultipliers: thicknessMultipliers || current.thicknessMultipliers || [
        { minThickness: 2, maxThickness: 3, multiplier: 1.0, label: '2-3mm' },
        { minThickness: 4, maxThickness: 5, multiplier: 1.4, label: '4-5mm' },
        { minThickness: 6, maxThickness: 6, multiplier: 1.8, label: '6mm' },
        { minThickness: 8, maxThickness: 8, multiplier: 2.5, label: '8mm' },
        { minThickness: 12, maxThickness: 999, multiplier: 3.0, label: '12mm+' },
      ]
    };

    // Save to KV store
    await kv.set('pricing_constants', updated);
    
    console.log('✅ Pricing constants saved:', updated);
    return c.json({ success: true, ...updated });
  } catch (error: any) {
    console.error('❌ Error saving pricing constants:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

// ============================================================================
// File Upload Settings Routes
// ============================================================================
// GET /settings/max-file-size - Get max file upload size (public)
app.get('/make-server-8927474f/settings/max-file-size', async (c) => {
  try {
    console.log('💾 Fetching max file size setting...');
    
    // Get from pricing constants
    const pricingConstants = await kv.get('pricing_constants');
    const maxFileSize = pricingConstants?.maxFileSize || 50; // Default 50MB
    
    console.log('✅ Loaded max file size:', maxFileSize);
    return c.json({ success: true, maxFileSize });
  } catch (error: any) {
    console.error('❌ Error fetching max file size:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

// POST /settings/max-file-size - Save max file upload size (admin only)
app.post('/make-server-8927474f/settings/max-file-size', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    // Verify admin
    if (USE_SQL_TABLES) {
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single();
      
      if (!userData?.is_admin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }
    } else {
      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }
    }

    const body = await c.req.json();
    const { maxFileSize } = body;

    // Validate input
    if (maxFileSize !== undefined && (typeof maxFileSize !== 'number' || maxFileSize < 1 || maxFileSize > 500)) {
      return c.json({ success: false, error: 'Invalid max file size (must be between 1 and 500 MB)' }, 400);
    }

    // Get current pricing constants
    const current = await kv.get('pricing_constants') || {};
    
    // Update with new max file size
    const updated = {
      ...current,
      maxFileSize: maxFileSize !== undefined ? maxFileSize : (current.maxFileSize || 50)
    };

    // Save to KV store
    await kv.set('pricing_constants', updated);
    
    console.log('✅ Max file size saved:', maxFileSize);
    return c.json({ success: true, maxFileSize: updated.maxFileSize });
  } catch (error: any) {
    console.error('❌ Error saving max file size:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

// Check File Availability Route
app.get('/make-server-8927474f/check-file', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const path = c.req.query('path');
    if (!path) {
      return c.json({ success: false, error: 'Path is required' }, 400);
    }

    // Check if file exists in storage
    const { data, error: listError } = await supabase.storage
      .from(bucketName)
      .list(path.substring(0, path.lastIndexOf('/')), {
        search: path.substring(path.lastIndexOf('/') + 1),
      });

    if (listError) {
      return c.json({ success: true, exists: false });
    }

    const exists = data && data.length > 0;
    return c.json({ success: true, exists });
  } catch (error: any) {
    console.error('Check file availability error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

// Download File Route
app.get('/make-server-8927474f/download-file', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!userData?.is_admin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }
    }

    const path = c.req.query('path');
    if (!path) {
      return c.json({ success: false, error: 'Path is required' }, 400);
    }

    // Determine which bucket to use based on file path or type
    // Sketch files go to the sketch bucket, DXF files to the DXF bucket
    const sketchBucketName = 'make-8927474f-sketch-files';
    const dxfBucketName = 'make-8927474f-dxf-files';
    
    // Try sketch bucket first, then DXF bucket
    let bucket = sketchBucketName;
    let { data, error: signedUrlError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60); // 1 minute expiry

    // If file not found in sketch bucket, try DXF bucket
    if (signedUrlError && signedUrlError.message.includes('not found')) {
      bucket = dxfBucketName;
      const result = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 60);
      data = result.data;
      signedUrlError = result.error;
    }

    if (signedUrlError) {
      throw signedUrlError;
    }

    return c.json({ success: true, url: data.signedUrl });
  } catch (error: any) {
    console.error('Download file error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

// Discount Validation Route
app.post('/make-server-8927474f/discounts/validate', async (c) => {
  try {
    const { code, cartTotal } = await c.req.json();
    
    console.log('Validating discount code:', { code, cartTotal });
    
    if (!code) {
      return c.json({ success: false, error: 'Discount code is required' }, 400);
    }

    // Get user info for affiliate fraud check
    const { user, error: authError } = await verifyUser(c.req.raw);
    if (authError || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    let userEmail: string | null = null;
    let discount: any = null;

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: userData } = await supabase
        .from('users')
        .select('email')
        .eq('auth_user_id', user.id)
        .single();
      
      userEmail = userData?.email || user.email;

      // Get discount by code
      const { data: discountData } = await supabase
        .from('discount_codes')
        .select('*, affiliates!discount_codes_affiliate_id_fkey(email)')
        .eq('code', code)
        .single();

      discount = discountData;

      if (!discount) {
        return c.json({ success: false, error: 'Invalid discount code' }, 404);
      }

      // Fraud prevention: Check if user is trying to use their own affiliate code
      if (discount.affiliate_id && discount.affiliates) {
        const affiliateEmail = discount.affiliates.email;
        if (affiliateEmail && userEmail && affiliateEmail.toLowerCase() === userEmail.toLowerCase()) {
          return c.json({ success: false, error: 'You cannot use your own affiliate code' }, 400);
        }
      }

      // Validate discount
      if (!discount.is_active) {
        return c.json({ success: false, error: 'Discount code is inactive' }, 400);
      }

      if (discount.expires_at && new Date(discount.expires_at) < new Date()) {
        return c.json({ success: false, error: 'Discount code has expired' }, 400);
      }

      if (discount.usage_limit && discount.used_count >= discount.usage_limit) {
        return c.json({ success: false, error: 'Discount code usage limit reached' }, 400);
      }
      
      if (discount.min_order_amount && cartTotal < discount.min_order_amount) {
        return c.json({ success: false, error: `Minimum order amount of ₹${discount.min_order_amount} required` }, 400);
      }

      // Calculate discount amount
      let amount = 0;
      if (discount.discount_type === 'percentage') {
        amount = (cartTotal * discount.discount_value) / 100;
        if (discount.max_discount_amount) {
          amount = Math.min(amount, discount.max_discount_amount);
        }
      } else {
        amount = discount.discount_value;
      }

      console.log('Discount validated successfully:', { code, amount });

      return c.json({ 
        success: true, 
        valid: true, 
        amount, 
        type: discount.discount_type,
        code: discount.code 
      });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const userData = await kv.get(`user:${user.id}`);
      userEmail = userData?.email || user.email;

    // Fast direct lookup by code (optimized from getByPrefix)
    const discount = await kv.get(`discount-code:${code}`);
    
    console.log('Discount lookup result:', { found: !!discount, discount });

    if (!discount) {
      // Fallback: Try searching all discounts (for legacy data)
      console.log('Direct lookup failed, searching all discounts...');
      const allDiscounts = await kv.getByPrefix('discount:');
      console.log('All discounts:', allDiscounts.length);
      const foundDiscount = allDiscounts.find((d: any) => d.code === code);
      
      if (foundDiscount) {
        console.log('Found discount via search, creating code mapping');
        // Create the mapping for future lookups
        await kv.set(`discount-code:${code}`, foundDiscount);
        
        // Validate the found discount and continue with normal flow
        // Check if active
        if (!foundDiscount.active) {
          return c.json({ success: false, error: 'Discount code is inactive' }, 400);
        }

        // Fraud prevention: Check if user is trying to use their own affiliate code
        if (foundDiscount.affiliateId) {
          const affiliate = await kv.get(foundDiscount.affiliateId);
          if (affiliate && affiliate.email && userEmail) {
            if (affiliate.email.toLowerCase() === userEmail.toLowerCase()) {
              return c.json({ success: false, error: 'You cannot use your own affiliate code' }, 400);
            }
          }
        }

        if (foundDiscount.expiresAt && new Date(foundDiscount.expiresAt) < new Date()) {
          return c.json({ success: false, error: 'Discount code has expired' }, 400);
        }

        if (foundDiscount.usageLimit && foundDiscount.usedCount >= foundDiscount.usageLimit) {
          return c.json({ success: false, error: 'Discount code usage limit reached' }, 400);
        }
        
        if (foundDiscount.minOrderAmount && cartTotal < foundDiscount.minOrderAmount) {
          return c.json({ success: false, error: `Minimum order amount of ₹${foundDiscount.minOrderAmount} required` }, 400);
        }

        // Calculate discount amount
        let amount = 0;
        if (foundDiscount.type === 'percentage') {
          amount = (cartTotal * foundDiscount.value) / 100;
          if (foundDiscount.maxDiscountAmount) {
            amount = Math.min(amount, foundDiscount.maxDiscountAmount);
          }
        } else {
          amount = foundDiscount.value;
        }

        console.log('Discount validated successfully (via search):', { code, amount });

        return c.json({ 
          success: true, 
          valid: true, 
          amount, 
          type: foundDiscount.type,
          code: foundDiscount.code 
        });
      }
      
      return c.json({ success: false, error: 'Invalid discount code' }, 404);
    }

    // Validate and return discount
    if (!discount.active) {
      return c.json({ success: false, error: 'Discount code is inactive' }, 400);
    }

    // Fraud prevention: Check if user is trying to use their own affiliate code
    if (discount.affiliateId) {
      const affiliate = await kv.get(discount.affiliateId);
      if (affiliate && affiliate.email && userEmail) {
        if (affiliate.email.toLowerCase() === userEmail.toLowerCase()) {
          return c.json({ success: false, error: 'You cannot use your own affiliate code' }, 400);
        }
      }
    }

    if (discount.expiresAt && new Date(discount.expiresAt) < new Date()) {
      return c.json({ success: false, error: 'Discount code has expired' }, 400);
    }

    if (discount.usageLimit && discount.usedCount >= discount.usageLimit) {
      return c.json({ success: false, error: 'Discount code usage limit reached' }, 400);
    }
    
    if (discount.minOrderAmount && cartTotal < discount.minOrderAmount) {
      return c.json({ success: false, error: `Minimum order amount of ₹${discount.minOrderAmount} required` }, 400);
    }

    // Calculate discount amount
    let amount = 0;
    if (discount.type === 'percentage') {
      amount = (cartTotal * discount.value) / 100;
      if (discount.maxDiscountAmount) {
        amount = Math.min(amount, discount.maxDiscountAmount);
      }
    } else {
      amount = discount.value;
    }

    console.log('Discount validated successfully:', { code, amount });

    return c.json({ 
      success: true, 
      valid: true, 
      amount, 
      type: discount.type,
      code: discount.code 
    });
    }
  } catch (error: any) {
    console.error('Validate discount error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

// Cache for stats to reduce KV calls
let statsCache: any = null;
let statsCacheTime = 0;
const STATS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Admin Stats Route - Optimized with caching
app.get('/make-server-8927474f/admin/stats', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    // Check cache first
    const now = Date.now();
    if (statsCache && (now - statsCacheTime) < STATS_CACHE_DURATION) {
      return c.json({
        success: true,
        stats: statsCache,
        cached: true
      });
    }

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!userData?.is_admin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      // Fetch all data from SQL
      const { data: users } = await supabase.from('users').select('created_at');
      const { data: orders } = await supabase.from('orders').select('created_at, price');
      const { data: sessions } = await supabase.from('sessions').select('created_at').gte('created_at', new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString());

      const totalUsers = users?.length || 0;
      const totalOrders = orders?.length || 0;
      const totalSessions = sessions?.length || 0;
      
      const totalRevenue = orders?.reduce((acc: number, order: any) => {
        return acc + (order.price || 0);
      }, 0) || 0;

      // Calculate Average Order Value
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Calculate chart data (last 6 months)
      const chartData = [];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentDate = new Date();
      
      for (let i = 5; i >= 0; i--) {
        const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const monthName = months[d.getMonth()];
        const year = d.getFullYear();
        
        const ordersInMonth = orders?.filter((o: any) => {
          if (!o.created_at) return false;
          const oDate = new Date(o.created_at);
          return oDate.getMonth() === d.getMonth() && oDate.getFullYear() === year;
        }) || [];

        const usersInMonth = users?.filter((u: any) => {
          if (!u.created_at) return false;
          const uDate = new Date(u.created_at);
          return uDate.getMonth() === d.getMonth() && uDate.getFullYear() === year;
        }) || [];

        const sessionsInMonth = sessions?.filter((s: any) => {
          if (!s.created_at) return false;
          const sDate = new Date(s.created_at);
          return sDate.getMonth() === d.getMonth() && sDate.getFullYear() === year;
        }) || [];
        
        const revenueInMonth = ordersInMonth.reduce((acc: number, o: any) => acc + (o.price || 0), 0);
        
        chartData.push({
          month: monthName,
          year: year,
          orders: ordersInMonth.length,
          revenue: revenueInMonth,
          newUsers: usersInMonth.length,
          sessions: sessionsInMonth.length
        });
      }

      const stats = {
        totalUsers,
        totalOrders,
        totalRevenue,
        averageOrderValue,
        totalSessions,
        chartData
      };

      // Update cache
      statsCache = stats;
      statsCacheTime = now;

      return c.json({
        success: true,
        stats,
        cached: false
      });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      // Fetch all data from KV
      const users = await kv.getByPrefix('user:');
      const orders = await kv.getByPrefix('order:');
    
    // Only fetch sessions if they exist (session tracking may be disabled)
    const allSessions = await kv.getByPrefix('session:');
    const sessions = allSessions.length > 0 ? allSessions.filter((s: any) => {
      if (!s.timestamp) return false;
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      return new Date(s.timestamp) >= sixMonthsAgo;
    }) : [];
    
    const totalUsers = users.length;
    const totalOrders = orders.length;
    const totalSessions = sessions.length;
    
    const totalRevenue = orders.reduce((acc: number, order: any) => {
      return acc + (order.price || 0);
    }, 0);

    // Calculate Average Order Value
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Calculate chart data (last 6 months)
    const chartData = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentDate = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthName = months[d.getMonth()];
      const year = d.getFullYear();
      // Unique key for logic, label for display
      
      const ordersInMonth = orders.filter((o: any) => {
        if (!o.createdAt) return false;
        const oDate = new Date(o.createdAt);
        return oDate.getMonth() === d.getMonth() && oDate.getFullYear() === year;
      });

      const usersInMonth = users.filter((u: any) => {
        if (!u.createdAt) return false;
        const uDate = new Date(u.createdAt);
        return uDate.getMonth() === d.getMonth() && uDate.getFullYear() === year;
      });

      const sessionsInMonth = sessions.filter((s: any) => {
        if (!s.timestamp) return false;
        const sDate = new Date(s.timestamp);
        return sDate.getMonth() === d.getMonth() && sDate.getFullYear() === year;
      });
      
      const revenueInMonth = ordersInMonth.reduce((acc: number, o: any) => acc + (o.price || 0), 0);
      
      chartData.push({
        month: monthName,
        year: year,
        orders: ordersInMonth.length,
        revenue: revenueInMonth,
        newUsers: usersInMonth.length,
        sessions: sessionsInMonth.length
      });
    }

    const stats = {
      totalUsers,
      totalOrders,
      totalRevenue,
      averageOrderValue,
      totalSessions,
      chartData
    };

    // Update cache
    statsCache = stats;
    statsCacheTime = now;

    return c.json({
      success: true,
      stats,
      cached: false
    });
    }
  } catch (error: any) {
    console.error('Get admin stats error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

// Track Session Route
app.post('/make-server-8927474f/track/session', async (c) => {
  try {
    const body = await c.req.json();
    const { sessionId, page, userAgent, referrer } = body;

    if (!sessionId) {
      return c.json({ success: false, error: 'Session ID required' }, 400);
    }

    const timestamp = new Date().toISOString();

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      await supabase
        .from('sessions')
        .insert({
          session_id: sessionId,
          page: page || '/',
          user_agent: userAgent || '',
          referrer: referrer || '',
          created_at: timestamp
        });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const sessionKey = `session:${timestamp}:${sessionId}`;
      await kv.set(sessionKey, {
        sessionId,
        page: page || '/',
        userAgent: userAgent || '',
        referrer: referrer || '',
        timestamp
      });
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Track session error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

// Cache for analytics to reduce KV calls
let analyticsCache: { [key: string]: any } = {};
let analyticsCacheTime: { [key: string]: number } = {};
const ANALYTICS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Get Analytics Data Route - Optimized with caching and limits
app.get('/make-server-8927474f/admin/analytics', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const userData = await kv.get(`user:${user.id}`);
    if (!userData?.isAdmin) {
      return c.json({ success: false, error: 'Admin access required' }, 403);
    }

    // Get query parameters for filtering
    const url = new URL(c.req.url);
    const timeRange = url.searchParams.get('range') || 'week';

    // Check cache first
    const now = Date.now();
    const cacheKey = `analytics_${timeRange}`;
    if (analyticsCache[cacheKey] && (now - (analyticsCacheTime[cacheKey] || 0)) < ANALYTICS_CACHE_DURATION) {
      return c.json({
        success: true,
        analytics: analyticsCache[cacheKey],
        cached: true
      });
    }

    // Calculate start date based on time range
    const currentDate = new Date();
    let startDate = new Date();
    
    switch (timeRange) {
      case 'day':
        startDate = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        break;
      case '6months':
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 6, 1);
        break;
    }

    // Only fetch sessions within the time range
    const allSessions = await kv.getByPrefix('session:');
    const filteredSessions = allSessions.filter((s: any) => {
      if (!s.timestamp) return false;
      const sDate = new Date(s.timestamp);
      return sDate >= startDate;
    });

    // Limit session data returned to reduce payload size (max 1000 most recent)
    const limitedSessions = filteredSessions
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 1000);

    // Get orders by state - only need counts, not full data
    const orders = await kv.getByPrefix('order:');
    const ordersByState: { [key: string]: number } = {};
    orders.forEach((order: any) => {
      if (order.shippingAddress?.state) {
        const state = order.shippingAddress.state;
        ordersByState[state] = (ordersByState[state] || 0) + 1;
      }
    });

    const analyticsData = {
      sessions: filteredSessions.length,
      sessionData: limitedSessions,
      ordersByState
    };

    // Update cache
    analyticsCache[cacheKey] = analyticsData;
    analyticsCacheTime[cacheKey] = now;

    return c.json({
      success: true,
      analytics: analyticsData,
      cached: false
    });
  } catch (error: any) {
    console.error('Get analytics error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

// Email Helper
async function sendEmail(to: string, subject: string, html: string) {
  const config = await kv.get('email_config');
  if (!config || !config.enabled) return false;

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });

    await transporter.sendMail({
      from: config.from,
      to,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}

// Email Settings Routes
app.get('/make-server-8927474f/settings/email', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) return c.json({ success: false, error: 'Unauthorized' }, 401);
    
    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!userData?.is_admin) return c.json({ success: false, error: 'Admin access required' }, 403);

      const { data: config } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'email_config')
        .single();

      let emailConfig = config?.value || null;
      if (emailConfig && typeof emailConfig === 'object') {
        // Don't return password
        const { pass, ...safeConfig } = emailConfig;
        emailConfig = safeConfig;
      }
      return c.json({ success: true, config: emailConfig });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) return c.json({ success: false, error: 'Admin access required' }, 403);

      const config = await kv.get('email_config');
      if (config) {
        // Don't return password
        delete config.pass;
      }
      return c.json({ success: true, config });
    }
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

app.post('/make-server-8927474f/settings/email', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) return c.json({ success: false, error: 'Unauthorized' }, 401);
    
    const config = await c.req.json();

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!userData?.is_admin) return c.json({ success: false, error: 'Admin access required' }, 403);

      await supabase
        .from('settings')
        .upsert({
          key: 'email_config',
          value: config,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) return c.json({ success: false, error: 'Admin access required' }, 403);

      await kv.set('email_config', config);
    }
    
    // Test email? Maybe later.
    
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

// Analytics Settings Routes (Facebook Pixel & Google Analytics)
app.get('/make-server-8927474f/admin/analytics-settings', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!userData?.is_admin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      const { data: settings } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'analytics_settings')
        .single();

      const defaultSettings = {
        facebookPixel: { pixelId: '', enabled: false },
        googleAnalytics: { measurementId: '', enabled: false }
      };

      return c.json({ success: true, settings: settings?.value || defaultSettings });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      const settings = await kv.get('analytics_settings') || {
        facebookPixel: {
          pixelId: '',
          enabled: false
        },
        googleAnalytics: {
          measurementId: '',
          enabled: false
        }
      };

      return c.json({ success: true, settings });
    }
  } catch (error: any) {
    console.error('Get analytics settings error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

app.put('/make-server-8927474f/admin/analytics-settings', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const settings = await c.req.json();

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!userData?.is_admin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      // Upsert settings
      await supabase
        .from('settings')
        .upsert({
          key: 'analytics_settings',
          value: settings,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      return c.json({ success: true });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      await kv.set('analytics_settings', settings);

      return c.json({ success: true });
    }
  } catch (error: any) {
    console.error('Update analytics settings error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

// Public route to get analytics settings (for frontend to load scripts)
app.get('/make-server-8927474f/analytics-settings', async (c) => {
  try {
    let settings: any;

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: settingsData } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'analytics_settings')
        .single();

      settings = settingsData?.value || {
        facebookPixel: { pixelId: '', enabled: false },
        googleAnalytics: { measurementId: '', enabled: false }
      };
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      settings = await kv.get('analytics_settings') || {
        facebookPixel: {
          pixelId: '',
          enabled: false
        },
        googleAnalytics: {
          measurementId: '',
          enabled: false
        }
      };
    }

    // Only return enabled settings with IDs (don't expose disabled/empty config)
    const publicSettings: any = {};
    
    if (settings.facebookPixel?.enabled && settings.facebookPixel?.pixelId) {
      publicSettings.facebookPixel = {
        pixelId: settings.facebookPixel.pixelId,
        enabled: true
      };
    }
    
    if (settings.googleAnalytics?.enabled && settings.googleAnalytics?.measurementId) {
      publicSettings.googleAnalytics = {
        measurementId: settings.googleAnalytics.measurementId,
        enabled: true
      };
    }

    return c.json({ success: true, settings: publicSettings });
  } catch (error: any) {
    console.error('Get public analytics settings error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

// Cleanup old sessions endpoint - Remove sessions older than 90 days
app.post('/make-server-8927474f/admin/cleanup-old-sessions', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    console.log('🧹 Starting session cleanup...');

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!userData?.is_admin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      // Define cutoff date (90 days ago)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);
      const cutoffISO = cutoffDate.toISOString();

      console.log(`🗑️ Deleting sessions older than ${cutoffISO}...`);

      // Delete old sessions
      const { data: deletedSessions, error: deleteError } = await supabase
        .from('sessions')
        .delete()
        .lt('created_at', cutoffISO)
        .select('id');

      if (deleteError) throw deleteError;

      const deletedCount = deletedSessions?.length || 0;

      // Count remaining sessions
      const { count: remainingCount } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true });

      console.log(`✅ Cleanup complete! ${deletedCount} deleted, ${remainingCount || 0} remaining`);

      return c.json({
        success: true,
        message: `Deleted ${deletedCount} sessions older than 90 days`,
        deleted: deletedCount,
        remaining: remainingCount || 0
      });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      // Get all sessions
      const allSessions = await kv.getByPrefix('session:');
      console.log(`📊 Found ${allSessions.length} total sessions`);

    // Define cutoff date (90 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);

    // Find sessions older than cutoff
    const sessionsToDelete: string[] = [];
    allSessions.forEach((session: any) => {
      if (!session.timestamp) return;
      const sessionDate = new Date(session.timestamp);
      if (sessionDate < cutoffDate) {
        // Extract session key from the data
        // Session keys are formatted as: session:{timestamp}:{sessionId}
        const sessionKey = `session:${session.timestamp}:${session.sessionId}`;
        sessionsToDelete.push(sessionKey);
      }
    });

    console.log(`🗑️ Deleting ${sessionsToDelete.length} old sessions...`);

    // Delete old sessions in batches
    if (sessionsToDelete.length > 0) {
      await kv.mdel(sessionsToDelete);
    }

    const remaining = allSessions.length - sessionsToDelete.length;
    console.log(`✅ Cleanup complete! ${sessionsToDelete.length} deleted, ${remaining} remaining`);

    return c.json({
      success: true,
      message: `Deleted ${sessionsToDelete.length} sessions older than 90 days`,
      deleted: sessionsToDelete.length,
      remaining: remaining
    });
    }
  } catch (error: any) {
    console.error('Session cleanup error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

// Migration endpoint - Assign sequential order numbers to existing orders
app.post('/make-server-8927474f/admin/migrate-order-numbers', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    console.log('🔄 Starting order number migration...');

    if (USE_SQL_TABLES) {
      // ========== SQL MODE ==========
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!userData?.is_admin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      // Get all orders
      const { data: allOrders, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (fetchError) throw fetchError;
      
      console.log(`📦 Found ${allOrders?.length || 0} orders to check`);

      // Group by year and assign sequential numbers
      const ordersByYear = new Map<number, any[]>();
      
      for (const order of (allOrders || [])) {
        const year = new Date(order.created_at || Date.now()).getFullYear();
        if (!ordersByYear.has(year)) {
          ordersByYear.set(year, []);
        }
        ordersByYear.get(year)!.push(order);
      }

      let migratedCount = 0;

      // Process each year
      for (const [year, orders] of ordersByYear.entries()) {
        console.log(`📅 Processing ${orders.length} orders from ${year}...`);
        
        for (let i = 0; i < orders.length; i++) {
          const order = orders[i];
          
          // Skip if already has order_number
          if (order.order_number) {
            console.log(`⏭️  Order ${order.id} already has orderNumber: ${order.order_number}`);
            continue;
          }

          // Generate sequential number for this year
          const sequenceNumber = (i + 1).toString().padStart(7, '0');
          const orderNumber = `SC-${year}-${sequenceNumber}`;

          await supabase
            .from('orders')
            .update({ order_number: orderNumber })
            .eq('id', order.id);

          migratedCount++;
        }
      }

      console.log(`✅ Migration complete! Updated ${migratedCount} orders`);

      return c.json({ 
        success: true, 
        message: `Successfully migrated ${migratedCount} orders`,
        migratedCount,
        totalOrders: allOrders?.length || 0,
        yearBreakdown: Array.from(ordersByYear.entries()).map(([year, orders]) => ({
          year,
          count: orders.length
        }))
      });
    } else {
      // ========== KV MODE (ROLLBACK) ==========
      const userData = await kv.get(`user:${user.id}`);
      if (!userData?.isAdmin) {
        return c.json({ success: false, error: 'Admin access required' }, 403);
      }

      // Get all orders
      const allOrders = await kv.getByPrefix('order:');
      console.log(`📦 Found ${allOrders.length} orders to migrate`);

    // Sort by creation date (oldest first)
    allOrders.sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateA - dateB;
    });

    // Group by year and assign sequential numbers
    const ordersByYear = new Map<number, any[]>();
    
    for (const order of allOrders) {
      const year = new Date(order.createdAt || Date.now()).getFullYear();
      if (!ordersByYear.has(year)) {
        ordersByYear.set(year, []);
      }
      ordersByYear.get(year)!.push(order);
    }

    let migratedCount = 0;
    const updateKeys: string[] = [];
    const updateValues: any[] = [];

    // Process each year
    for (const [year, orders] of ordersByYear.entries()) {
      console.log(`📅 Processing ${orders.length} orders from ${year}...`);
      
      for (let i = 0; i < orders.length; i++) {
        const order = orders[i];
        
        // Skip if already has orderNumber
        if (order.orderNumber) {
          console.log(`⏭️  Order ${order.id} already has orderNumber: ${order.orderNumber}`);
          continue;
        }

        // Generate sequential number for this year
        const sequenceNumber = (i + 1).toString().padStart(7, '0');
        const orderNumber = `SC-${year}-${sequenceNumber}`;

        updateKeys.push(order.id);
        updateValues.push({
          ...order,
          orderNumber: orderNumber
        });

        migratedCount++;
      }
      
      // Update the counter for this year to the last sequence number
      const counterKey = `order-counter:${year}`;
      await kv.set(counterKey, { value: orders.length, year: year });
      console.log(`✅ Set counter for ${year} to ${orders.length}`);
    }

    // Batch update all orders
    if (updateKeys.length > 0) {
      console.log(`💾 Saving ${updateKeys.length} order updates...`);
      await kv.mset(updateKeys, updateValues);
    }

    console.log(`✅ Migration complete! Updated ${migratedCount} orders`);

    return c.json({ 
      success: true, 
      message: `Successfully migrated ${migratedCount} orders`,
      migratedCount,
      totalOrders: allOrders.length,
      yearBreakdown: Array.from(ordersByYear.entries()).map(([year, orders]) => ({
        year,
        count: orders.length
      }))
    });
    }
  } catch (error: any) {
    console.error('❌ Migration error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

// Google Reviews endpoint
app.get('/make-server-8927474f/google-reviews', async (c) => {
  try {
    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    const placeId = Deno.env.get('GOOGLE_PLACE_ID');
    
    if (!apiKey) {
      return c.json({ 
        success: false, 
        error: 'Google Places API key not configured. Please add GOOGLE_PLACES_API_KEY in Supabase secrets.' 
      }, 500);
    }

    if (!placeId) {
      return c.json({ 
        success: false, 
        error: 'Google Place ID not configured. Please add GOOGLE_PLACE_ID in Supabase secrets.' 
      }, 500);
    }

    // Fetch place details with reviews
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,user_ratings_total,reviews&key=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'OK') {
      console.error('Google Places API error:', data);
      return c.json({ 
        success: false, 
        error: `Google Places API error: ${data.status}` 
      }, 500);
    }

    // Extract and format reviews
    const result = data.result;
    const reviews = result.reviews?.map((review: any) => ({
      author: review.author_name,
      rating: review.rating,
      text: review.text,
      time: review.time,
      // Force HTTPS for Google profile photos to prevent mixed content warnings
      profilePhoto: review.profile_photo_url ? review.profile_photo_url.replace(/^http:/, 'https:') : null,
      relativeTime: review.relative_time_description,
    })) || [];

    return c.json({
      success: true,
      data: {
        name: result.name,
        rating: result.rating,
        totalRatings: result.user_ratings_total,
        reviews: reviews,
      }
    });
  } catch (error: any) {
    console.error('Error fetching Google reviews:', error);
    return c.json({ 
      success: false, 
      error: error.message || 'Failed to fetch Google reviews' 
    }, 500);
  }
});

// ============================================================================
// 🔍 FIND PLACE ID HELPER ENDPOINT
// ============================================================================
app.get('/make-server-8927474f/admin/find-place-id', async (c) => {
  try {
    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    
    if (!apiKey) {
      return c.json({ 
        success: false, 
        error: 'Google Places API key not configured.' 
      }, 500);
    }

    // SheetCutters location from the Google Maps URL
    const businessName = 'SheetCutters';
    const lat = '15.4331279';
    const lng = '75.0154437';
    
    // Try text search first
    const textSearchUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(businessName)}&inputtype=textquery&fields=place_id,name,formatted_address,geometry&locationbias=circle:1000@${lat},${lng}&key=${apiKey}`;
    
    console.log('🔍 Searching for Place ID with text search...');
    const textResponse = await fetch(textSearchUrl);
    const textData = await textResponse.json();
    
    if (textData.status === 'OK' && textData.candidates && textData.candidates.length > 0) {
      const place = textData.candidates[0];
      
      return c.json({
        success: true,
        placeId: place.place_id,
        name: place.name,
        address: place.formatted_address,
        location: place.geometry?.location,
        message: 'Place ID found! Add this to your Supabase secrets as GOOGLE_PLACE_ID'
      });
    }
    
    // Fallback: Try geocoding
    console.log('🔍 Trying geocoding fallback...');
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
    const geocodeResponse = await fetch(geocodeUrl);
    const geocodeData = await geocodeResponse.json();
    
    if (geocodeData.status === 'OK' && geocodeData.results && geocodeData.results.length > 0) {
      const result = geocodeData.results[0];
      
      return c.json({
        success: true,
        placeId: result.place_id,
        address: result.formatted_address,
        location: result.geometry?.location,
        message: 'Place ID found via geocoding! Add this to your Supabase secrets as GOOGLE_PLACE_ID',
        note: 'This might be a general location. For best results, use the Place ID from your Google My Business listing.'
      });
    }
    
    return c.json({
      success: false,
      error: 'Could not find Place ID. Please use Google Place ID Finder tool.',
      textSearchStatus: textData.status,
      geocodeStatus: geocodeData.status,
      suggestion: 'Visit https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder'
    });
    
  } catch (error: any) {
    console.error('Error finding Place ID:', error);
    return c.json({ 
      success: false, 
      error: error.message || 'Failed to find Place ID' 
    }, 500);
  }
});

// Helper endpoint to backfill delivery info from most recent order
app.post('/make-server-8927474f/backfill-delivery-info', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    if (USE_SQL_TABLES) {
      console.log('🔄 Backfilling delivery info for auth user:', user.id);
      
      // Get user ID from users table
      let { data: userRecord } = await supabase
        .from('users')
        .select('id, auth_user_id')
        .eq('auth_user_id', user.id)
        .single();
      
      // Auto-create user record if it doesn't exist (for OAuth or edge cases)
      if (!userRecord) {
        console.log('⚠️ User not found in users table, auto-creating...');
        const { data: newUser } = await supabase
          .from('users')
          .insert({
            auth_user_id: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.email?.split('@')[0],
            is_admin: false,
            created_at: new Date().toISOString()
          })
          .select('id, auth_user_id')
          .single();
        
        if (!newUser) {
          return c.json({ success: false, error: 'Failed to create user record' }, 500);
        }
        
        userRecord = newUser;
        console.log('✅ User record created successfully');
      }
      
      const userId = userRecord.id;
      
      // Find most recent order with delivery info
      const { data: orders } = await supabase
        .from('orders')
        .select('delivery_info, delivery_first_name, delivery_last_name, delivery_phone, delivery_address, delivery_apartment, delivery_city, delivery_state, delivery_pin_code, delivery_country, delivery_gst_number')
        .eq('user_id', userId)
        .not('delivery_address', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (!orders || orders.length === 0) {
        return c.json({ success: false, error: 'No orders with delivery info found' }, 404);
      }
      
      const order = orders[0];
      
      // Extract delivery info (prefer structured columns, fall back to JSON)
      const deliveryInfo = {
        firstName: order.delivery_first_name || order.delivery_info?.firstName,
        lastName: order.delivery_last_name || order.delivery_info?.lastName,
        phone: order.delivery_phone || order.delivery_info?.phone,
        address: order.delivery_address || order.delivery_info?.address,
        apartment: order.delivery_apartment || order.delivery_info?.apartment,
        city: order.delivery_city || order.delivery_info?.city,
        state: order.delivery_state || order.delivery_info?.state,
        pinCode: order.delivery_pin_code || order.delivery_info?.pinCode,
        country: order.delivery_country || order.delivery_info?.country || 'India',
        gstNumber: order.delivery_gst_number || order.delivery_info?.gstNumber,
      };
      
      console.log('📦 Found delivery info from order:', deliveryInfo);
      
      // Use helper function to save
      const result = await saveDeliveryInfo(userId, deliveryInfo);
      
      if (!result.success) {
        console.error('❌ Failed to backfill delivery info:', result.error);
        return c.json({ success: false, error: result.error }, 500);
      }
      
      console.log('✅ Delivery info backfilled successfully');
      return c.json({ success: true, message: 'Delivery info backfilled from most recent order' });
    } else {
      return c.json({ success: false, error: 'SQL mode not enabled' }, 400);
    }
  } catch (error: any) {
    console.error('Backfill delivery info error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Register invoice routes
registerInvoiceRoutes(app);

console.log('🚀 Sheetcutters Server Started - Invoice Routes Active (v2.4 - Analytics Fix)');

Deno.serve(app.fetch);
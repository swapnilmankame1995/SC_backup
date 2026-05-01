import { Hono } from 'npm:hono';
import { createClient } from 'npm:@supabase/supabase-js';
import * as kv from './kv_store.tsx';

const userRoutes = new Hono();

// Get user orders
userRoutes.get('/orders', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (!user || error) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    // Fetch all orders for this user
    const allOrders = await kv.getByPrefix('order:');
    const userOrders = allOrders
      .filter((order: any) => order.userId === user.id)
      .map((order: any) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        orderDate: order.createdAt,
        status: order.status || 'pending',
        total: order.price,
        trackingUrl: order.trackingUrl,
        material: order.material?.name || 'Unknown',
        thickness: order.thickness || 0,
        fileName: order.fileName,
      }))
      .sort((a: any, b: any) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());

    return c.json({ success: true, orders: userOrders });
  } catch (error: any) {
    console.error('Error fetching user orders:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get user profile
userRoutes.get('/profile', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (!user || error) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    // Fetch user profile from KV store
    const profile = await kv.get(`user_profile:${user.id}`);

    return c.json({ 
      success: true, 
      profile: profile || {
        email: user.email,
        firstName: '',
        lastName: '',
        phone: '',
        address: '',
        apartment: '',
        city: '',
        state: '',
        pinCode: '',
        country: 'India',
        gstNumber: '',
      }
    });
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Update user profile
userRoutes.post('/profile', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (!user || error) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const profileData = await c.req.json();

    // Save profile to KV store
    await kv.set(`user_profile:${user.id}`, {
      ...profileData,
      userId: user.id,
      updatedAt: new Date().toISOString(),
    });

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get user delivery info (alias for profile, used in checkout)
userRoutes.get('/delivery-info', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (!user || error) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const profile = await kv.get(`user_profile:${user.id}`);

    return c.json({ 
      success: true, 
      deliveryInfo: profile || null
    });
  } catch (error: any) {
    console.error('Error fetching delivery info:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Save delivery info (alias for profile, used in checkout)
userRoutes.post('/delivery-info', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (!user || error) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const deliveryData = await c.req.json();

    await kv.set(`user_profile:${user.id}`, {
      ...deliveryData,
      userId: user.id,
      updatedAt: new Date().toISOString(),
    });

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error saving delivery info:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default userRoutes;

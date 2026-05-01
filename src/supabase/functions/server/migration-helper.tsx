// ============================================================================
// DATA MIGRATION HELPER
// Copies data from KV Store to SQL Tables
// IMPORTANT: This file is temporary and can be deleted after migration
// ============================================================================

import { createClient } from 'npm:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

export async function migrateKVToSQL(supabase: any): Promise<{ success: boolean; details: any; errors: any[] }> {
  const errors: any[] = [];
  const details: any = {
    users: { migrated: 0, skipped: 0 },
    materials: { migrated: 0, skipped: 0 },
    orders: { migrated: 0, skipped: 0 },
    orderItems: { migrated: 0, skipped: 0 },
  };

  try {
    console.log('🚀 Starting KV → SQL migration...');

    // ========================================================================
    // STEP 1: Migrate Materials
    // ========================================================================
    console.log('📦 Migrating materials...');
    const kvMaterials = await kv.getByPrefix('material:');
    
    for (const material of kvMaterials) {
      try {
        const { data, error } = await supabase
          .from('materials')
          .upsert({
            id: material.id,
            name: material.name,
            category: material.category,
            price_per_mm: material.pricePerMm,
            thicknesses: material.thicknesses,
            density: material.density,
            available: true,
          }, { onConflict: 'id' });

        if (error) {
          console.error(`❌ Material migration error (${material.id}):`, error);
          errors.push({ type: 'material', id: material.id, error: error.message });
          details.materials.skipped++;
        } else {
          details.materials.migrated++;
        }
      } catch (err: any) {
        console.error(`❌ Material migration exception (${material.id}):`, err);
        errors.push({ type: 'material', id: material.id, error: err.message });
        details.materials.skipped++;
      }
    }
    console.log(`✅ Materials: ${details.materials.migrated} migrated, ${details.materials.skipped} skipped`);

    // ========================================================================
    // STEP 2: Migrate Users
    // ========================================================================
    console.log('👥 Migrating users...');
    const kvUsers = await kv.getByPrefix('user:');
    
    for (const user of kvUsers) {
      try {
        // Skip email mapping entries
        if (!user.id || !user.email) {
          details.users.skipped++;
          continue;
        }

        const { data, error } = await supabase
          .from('users')
          .upsert({
            auth_user_id: user.id,
            email: user.email,
            name: user.name || '',
            first_name: user.firstName || '',
            last_name: user.lastName || '',
            phone: user.phone || '',
            address: user.address || '',
            apartment: user.apartment || '',
            city: user.city || '',
            state: user.state || '',
            pin_code: user.pinCode || '',
            country: user.country || 'India',
            gst_number: user.gstNumber || '',
            is_admin: user.isAdmin || false,
            loyalty_points: user.points || 0,
            total_spent: user.totalSpent || 0,
            created_at: user.createdAt || new Date().toISOString(),
          }, { onConflict: 'auth_user_id' });

        if (error) {
          console.error(`❌ User migration error (${user.email}):`, error);
          errors.push({ type: 'user', id: user.id, email: user.email, error: error.message });
          details.users.skipped++;
        } else {
          details.users.migrated++;
        }
      } catch (err: any) {
        console.error(`❌ User migration exception:`, err);
        errors.push({ type: 'user', id: user.id, error: err.message });
        details.users.skipped++;
      }
    }
    console.log(`✅ Users: ${details.users.migrated} migrated, ${details.users.skipped} skipped`);

    // ========================================================================
    // STEP 3: Migrate Orders & Order Items
    // ========================================================================
    console.log('📋 Migrating orders...');
    const kvOrders = await kv.getByPrefix('order:');
    
    // Group orders by batchId to create parent orders
    const batchGroups = new Map<string, any[]>();
    const standaloneOrders: any[] = [];

    for (const order of kvOrders) {
      if (order.batchId) {
        if (!batchGroups.has(order.batchId)) {
          batchGroups.set(order.batchId, []);
        }
        batchGroups.get(order.batchId)!.push(order);
      } else {
        standaloneOrders.push(order);
      }
    }

    // Migrate batch orders
    for (const [batchId, items] of batchGroups) {
      try {
        const firstItem = items[0];
        
        // Calculate totals
        const subtotal = items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
        const shippingCost = firstItem.shippingCost || 0;
        const pointsUsed = firstItem.pointsUsed || 0;
        const pointsValue = firstItem.pointsValue || 0;
        const totalAmount = subtotal + shippingCost - pointsValue;

        // Get user_id from auth_user_id
        let userId = null;
        if (firstItem.userId) {
          const { data: userData } = await supabase
            .from('users')
            .select('id')
            .eq('auth_user_id', firstItem.userId)
            .single();
          userId = userData?.id || null;
        }

        // Create order
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .upsert({
            order_number: firstItem.orderNumber || `SC-${Date.now()}`,
            user_id: userId,
            batch_id: batchId,
            guest_email: firstItem.email || '',
            guest_name: firstItem.name || '',
            guest_phone: firstItem.phone || '',
            delivery_first_name: firstItem.deliveryInfo?.firstName || '',
            delivery_last_name: firstItem.deliveryInfo?.lastName || '',
            delivery_phone: firstItem.deliveryInfo?.phone || '',
            delivery_address: firstItem.deliveryInfo?.address || '',
            delivery_apartment: firstItem.deliveryInfo?.apartment || '',
            delivery_city: firstItem.deliveryInfo?.city || '',
            delivery_state: firstItem.deliveryInfo?.state || '',
            delivery_pin_code: firstItem.deliveryInfo?.pinCode || '',
            delivery_country: firstItem.deliveryInfo?.country || 'India',
            delivery_gst_number: firstItem.deliveryInfo?.gstNumber || '',
            subtotal: subtotal,
            shipping_cost: shippingCost,
            points_used: pointsUsed,
            points_value: pointsValue,
            total_amount: totalAmount,
            status: firstItem.deliveryStatus || firstItem.status || 'pending',
            payment_status: firstItem.paymentStatus || 'pending',
            shipping_carrier: firstItem.shippingCarrier || '',
            tracking_number: firstItem.trackingNumber || '',
            tracking_url: firstItem.trackingUrl || '',
            affiliate_code: firstItem.affiliateCode || '',
            created_at: firstItem.createdAt || new Date().toISOString(),
          }, { onConflict: 'order_number' })
          .select()
          .single();

        if (orderError) {
          console.error(`❌ Order migration error (batch ${batchId}):`, orderError);
          errors.push({ type: 'order', batchId, error: orderError.message });
          details.orders.skipped++;
          continue;
        }

        details.orders.migrated++;

        // Create order items
        for (const item of items) {
          try {
            const { error: itemError } = await supabase
              .from('order_items')
              .insert({
                order_id: orderData.id,
                file_name: item.fileName || 'Unknown',
                file_path: item.filePath || '',
                dxf_data: item.dxfData || null,
                material_id: item.material?.id || null,
                material_name: item.material?.name || 'Unknown',
                thickness: item.thickness || 0,
                perimeter_mm: item.dxfData?.perimeter || 0,
                area_mm2: item.dxfData?.area || 0,
                weight_kg: item.dxfData?.weight || 0,
                quantity: item.quantity || 1,
                unit_price: item.price || 0,
                total_price: (item.price || 0) * (item.quantity || 1),
                service_type: item.serviceType || 'dxf',
                is_sketch_service: item.isSketchService || false,
                created_at: item.createdAt || new Date().toISOString(),
              });

            if (itemError) {
              console.error(`❌ Order item migration error:`, itemError);
              errors.push({ type: 'order_item', orderId: orderData.id, error: itemError.message });
              details.orderItems.skipped++;
            } else {
              details.orderItems.migrated++;
            }
          } catch (err: any) {
            console.error(`❌ Order item migration exception:`, err);
            errors.push({ type: 'order_item', error: err.message });
            details.orderItems.skipped++;
          }
        }
      } catch (err: any) {
        console.error(`❌ Batch order migration exception (${batchId}):`, err);
        errors.push({ type: 'order', batchId, error: err.message });
        details.orders.skipped++;
      }
    }

    // Migrate standalone orders
    for (const order of standaloneOrders) {
      try {
        const subtotal = order.price * (order.quantity || 1);
        const shippingCost = order.shippingCost || 0;
        const pointsUsed = order.pointsUsed || 0;
        const pointsValue = order.pointsValue || 0;
        const totalAmount = subtotal + shippingCost - pointsValue;

        // Get user_id from auth_user_id
        let userId = null;
        if (order.userId) {
          const { data: userData } = await supabase
            .from('users')
            .select('id')
            .eq('auth_user_id', order.userId)
            .single();
          userId = userData?.id || null;
        }

        // Create order
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .upsert({
            order_number: order.orderNumber || `SC-${Date.now()}`,
            user_id: userId,
            guest_email: order.email || '',
            guest_name: order.name || '',
            guest_phone: order.phone || '',
            delivery_first_name: order.deliveryInfo?.firstName || '',
            delivery_last_name: order.deliveryInfo?.lastName || '',
            delivery_phone: order.deliveryInfo?.phone || '',
            delivery_address: order.deliveryInfo?.address || '',
            delivery_apartment: order.deliveryInfo?.apartment || '',
            delivery_city: order.deliveryInfo?.city || '',
            delivery_state: order.deliveryInfo?.state || '',
            delivery_pin_code: order.deliveryInfo?.pinCode || '',
            delivery_country: order.deliveryInfo?.country || 'India',
            delivery_gst_number: order.deliveryInfo?.gstNumber || '',
            subtotal: subtotal,
            shipping_cost: shippingCost,
            points_used: pointsUsed,
            points_value: pointsValue,
            total_amount: totalAmount,
            status: order.deliveryStatus || order.status || 'pending',
            payment_status: order.paymentStatus || 'pending',
            shipping_carrier: order.shippingCarrier || '',
            tracking_number: order.trackingNumber || '',
            tracking_url: order.trackingUrl || '',
            affiliate_code: order.affiliateCode || '',
            created_at: order.createdAt || new Date().toISOString(),
          }, { onConflict: 'order_number' })
          .select()
          .single();

        if (orderError) {
          console.error(`❌ Standalone order migration error:`, orderError);
          errors.push({ type: 'order', id: order.id, error: orderError.message });
          details.orders.skipped++;
          continue;
        }

        details.orders.migrated++;

        // Create order item
        const { error: itemError } = await supabase
          .from('order_items')
          .insert({
            order_id: orderData.id,
            file_name: order.fileName || 'Unknown',
            file_path: order.filePath || '',
            dxf_data: order.dxfData || null,
            material_id: order.material?.id || null,
            material_name: order.material?.name || 'Unknown',
            thickness: order.thickness || 0,
            perimeter_mm: order.dxfData?.perimeter || 0,
            area_mm2: order.dxfData?.area || 0,
            weight_kg: order.dxfData?.weight || 0,
            quantity: order.quantity || 1,
            unit_price: order.price || 0,
            total_price: (order.price || 0) * (order.quantity || 1),
            service_type: order.serviceType || 'dxf',
            is_sketch_service: order.isSketchService || false,
            created_at: order.createdAt || new Date().toISOString(),
          });

        if (itemError) {
          console.error(`❌ Order item migration error:`, itemError);
          errors.push({ type: 'order_item', orderId: orderData.id, error: itemError.message });
          details.orderItems.skipped++;
        } else {
          details.orderItems.migrated++;
        }
      } catch (err: any) {
        console.error(`❌ Standalone order migration exception:`, err);
        errors.push({ type: 'order', id: order.id, error: err.message });
        details.orders.skipped++;
      }
    }

    console.log(`✅ Orders: ${details.orders.migrated} migrated, ${details.orders.skipped} skipped`);
    console.log(`✅ Order Items: ${details.orderItems.migrated} migrated, ${details.orderItems.skipped} skipped`);

    console.log('🎉 Migration complete!');
    
    return { 
      success: errors.length === 0, 
      details,
      errors 
    };

  } catch (error: any) {
    console.error('💥 Migration failed:', error);
    return {
      success: false,
      details,
      errors: [...errors, { type: 'fatal', error: error.message }]
    };
  }
}
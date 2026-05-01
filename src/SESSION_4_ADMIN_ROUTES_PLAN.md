# SESSION 4 - ADMIN ROUTES MIGRATION PLAN

Found **37 admin routes** to migrate! Let's prioritize by business criticality.

---

## 📋 ADMIN ROUTES INVENTORY

### **CRITICAL - Order Management (7 routes)**
1. GET `/admin/orders` - List all orders
2. PATCH `/admin/orders/bulk` - Bulk order updates
3. PATCH `/admin/orders/:id` - Update single order
4. PATCH `/admin/orders/:id/status` - Update order status
5. DELETE `/admin/orders/:id` - Delete order
6. POST `/admin/orders/:id/cancel` - Cancel order with file cleanup
7. POST `/admin/migrate-order-numbers` - Assign sequential order numbers

### **HIGH PRIORITY - User Management (3 routes)**
8. GET `/admin/users` - List all users
9. GET `/admin/users/export/csv` - Export users as CSV
10. PUT `/admin/users/:id` - Update user

### **HIGH PRIORITY - Discount/Affiliate Management (11 routes)**
11. GET `/admin/discounts` - List discount codes
12. POST `/admin/discounts` - Create discount
13. PATCH `/admin/discounts/:id` - Update discount
14. DELETE `/admin/discounts/:id` - Delete discount
15. GET `/admin/affiliates` - List affiliates
16. POST `/admin/affiliates` - Create affiliate
17. PATCH `/admin/affiliates/:id` - Update affiliate
18. GET `/admin/affiliates/:id/usage` - Get affiliate usage history
19. DELETE `/admin/affiliates/:id` - Delete affiliate
20. POST `/admin/disbursements` - Record affiliate payment

### **MEDIUM PRIORITY - Analytics & Stats (3 routes)**
21. GET `/admin/stats` - Dashboard stats (revenue, orders, etc.)
22. GET `/admin/analytics` - Analytics data with caching
23. GET `/admin/analytics-settings` - Get FB Pixel/GA settings
24. PUT `/admin/analytics-settings` - Update analytics settings

### **MEDIUM PRIORITY - Payments (3 routes)**
25. GET `/admin/payments` - List payments
26. GET `/admin/payment-gateways` - List gateway configs
27. PUT `/admin/payment-gateways/:gateway` - Update gateway config

### **LOW PRIORITY - Shipping (8 routes)**
28. GET `/admin/shipping-partners` - List shipping partners
29. POST `/admin/shipping-partners` - Create partner
30. PUT `/admin/shipping-partners/:id` - Update partner
31. DELETE `/admin/shipping-partners/:id` - Delete partner
32. GET `/admin/shipping-rates` - List shipping rates
33. POST `/admin/shipping-rates` - Create rate
34. PUT `/admin/shipping-rates/:id` - Update rate
35. DELETE `/admin/shipping-rates/:id` - Delete rate

### **UTILITY - Maintenance (2 routes)**
36. POST `/admin/cleanup-old-sessions` - Remove old sessions
37. POST `/admin/migrate-kv-to-sql` - Data migration tool

---

## 🎯 SESSION 4 STRATEGY

### **Phase 1: Critical Order Management (7 routes)**
These are essential for day-to-day operations.

### **Phase 2: User & Discount Management (14 routes)**
Important for customer service and affiliate program.

### **Phase 3: Analytics & Payments (6 routes)**
Business intelligence and payment tracking.

### **Phase 4: Shipping & Utilities (10 routes)**
Nice to have, less frequently used.

---

## 📊 ESTIMATED COMPLEXITY

| Phase | Routes | Complexity | Est. Time |
|-------|--------|------------|-----------|
| Phase 1 | 7 | High | 1 session |
| Phase 2 | 14 | Medium | 1-2 sessions |
| Phase 3 | 6 | Medium | 1 session |
| Phase 4 | 10 | Low | 1 session |

**Total:** 37 routes, ~4-5 sessions

---

## 🚀 LET'S START WITH PHASE 1!

Focus on the 7 critical order management routes first.

# Performance Optimization Implementation Plan

## Phase 1: Critical Issues (Day 1-2)

### 1.1 Backend Pagination for Admin Orders
- [ ] Add pagination query parameters to `/admin/orders` endpoint
- [ ] Implement server-side filtering and sorting
- [ ] Update OrdersManagement component to use pagination
- **Files:** `/supabase/functions/server/index.tsx`, `/components/admin/OrdersManagement.tsx`

### 1.2 Backend Pagination for User Dashboard  
- [ ] Add pagination to `/user/orders` endpoint
- [ ] Server-side filtering and sorting
- [ ] Update UserDashboard component
- **Files:** `/supabase/functions/server/index.tsx`, `/components/UserDashboard.tsx`

### 1.3 Refactor App.tsx - Create Context Providers
- [ ] Create AuthContext
- [ ] Create OrderContext  
- [ ] Create CartContext
- [ ] Create NavigationContext
- [ ] Refactor App.tsx to use contexts
- **Files:** `/contexts/AuthContext.tsx`, `/contexts/OrderContext.tsx`, `/contexts/CartContext.tsx`, `/contexts/NavigationContext.tsx`, `/App.tsx`

## Phase 2: High Priority Issues (Day 3-4)

### 2.1 Optimize Discount Lookups
- [ ] Change discount storage key structure
- [ ] Update all discount lookup code
- [ ] Add in-memory cache
- **Files:** `/supabase/functions/server/index.tsx`

### 2.2 Cache Analytics Settings
- [ ] Add localStorage caching with TTL
- [ ] Version invalidation mechanism
- **Files:** `/utils/analytics.ts`

### 2.3 Optimize Cart LocalStorage
- [ ] Add debouncing to cart saves
- [ ] Add error handling for quota exceeded
- [ ] Implement size limits
- **Files:** `/contexts/CartContext.tsx`, `/utils/cart.ts`

### 2.4 DXF Parser Web Worker
- [ ] Create DXF parser web worker
- [ ] Add progress callbacks
- [ ] Update upload screen to use worker
- **Files:** `/workers/dxf-parser.worker.ts`, `/utils/dxf-parser.ts`, `/components/UploadScreen.tsx`

### 2.5 API Response Caching
- [ ] Implement cache utility
- [ ] Add caching to materials fetch
- [ ] Add caching to profile fetch
- **Files:** `/utils/cache.ts`, `/utils/api.ts`

## Phase 3: Medium Priority Issues (Day 5-6)

### 3.1 Optimize User Email Lookups
- [ ] Add email-to-userId mapping
- [ ] Update signup to create mapping
- [ ] Update email lookup endpoints
- **Files:** `/supabase/functions/server/index.tsx`

### 3.2 Bulk Update Endpoint
- [ ] Create `/admin/orders/bulk` endpoint
- [ ] Update OrdersManagement to use bulk endpoint
- **Files:** `/supabase/functions/server/index.tsx`, `/components/admin/OrdersManagement.tsx`

### 3.3 Memoize SVG Generation
- [ ] Add useMemo to SVG preview generation
- **Files:** `/components/UploadScreen.tsx`, other components using SVG

### 3.4 Memoize Orders Filtering
- [ ] Add useMemo to UserDashboard filtering
- **Files:** `/components/UserDashboard.tsx`

### 3.5 Optimize useEffect Calls
- [ ] Combine related effects
- [ ] Add proper dependencies
- [ ] Add cleanup functions
- **Files:** `/App.tsx`, `/components/UserDashboard.tsx`

### 3.6 File Upload Cleanup
- [ ] Track temporary uploads
- [ ] Add cleanup job endpoint
- [ ] Implement file size limits
- **Files:** `/supabase/functions/server/index.tsx`, `/components/UploadScreen.tsx`, `/components/SketchUploadScreen.tsx`

### 3.7 File Size Validation
- [ ] Add frontend validation (10MB limit)
- [ ] Add backend validation
- [ ] Add user feedback
- **Files:** `/components/UploadScreen.tsx`, `/components/SketchUploadScreen.tsx`, `/supabase/functions/server/index.tsx`

### 3.8 Secure Token Storage
- [ ] Add token refresh logic
- [ ] Better logout cleanup
- [ ] Handle token expiration
- **Files:** `/contexts/AuthContext.tsx`

## Testing Checklist

- [ ] Test admin orders pagination with 100+ orders
- [ ] Test user dashboard with 50+ orders
- [ ] Test DXF upload with 5MB+ files
- [ ] Test cart operations with 10+ items
- [ ] Test discount code validation
- [ ] Test analytics initialization
- [ ] Test file size limits
- [ ] Test bulk order updates
- [ ] Test token expiration handling

## Performance Targets

- Admin panel load (1000 orders): < 1s
- User dashboard load (100 orders): < 500ms
- DXF parsing (5MB file): < 1s
- Initial page load: < 1.5s
- Cart operations: < 100ms

## Rollback Plan

- Keep backup of original files
- Test each phase independently
- Deploy incrementally
- Monitor error rates

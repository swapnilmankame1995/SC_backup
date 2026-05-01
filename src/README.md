# Sheetcutters.com - Laser Cutting Service

A comprehensive web application for a laser cutting service with DXF file upload, material selection, pricing calculations, and order management.

## Features

### User Features
- **Authentication**: Sign up and login functionality with secure authentication
- **DXF File Upload**: Drag-and-drop or browse to upload DXF files
- **DXF Preview**: Visual preview of uploaded designs with dimension calculations
- **Material Selection**: Choose from organized categories (Metals and Non-Metals)
- **Thickness Selection**: Dynamic thickness options based on selected material
- **Pricing Calculator**: Real-time price calculations (₹0.10/mm base rate with ₹100 minimum)
- **Order Summary**: Review all details before confirming
- **Order Tracking**: View all submitted orders with status

### Admin Features
- **First User Admin**: First signup automatically becomes admin
- **Material Management**: Add, edit, and delete materials
- **Pricing Control**: Set and update pricing per material
- **Thickness Management**: Configure available thicknesses for each material

## Workflow

1. **Upload** - Upload DXF file with preview and dimension calculation
2. **Material** - Select material from Metals or Non-Metals categories
3. **Thickness** - Choose thickness with real-time price display
4. **Summary** - Review complete order details
5. **Complete** - Order confirmation with options to add more files or view orders

## Technology Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **UI Components**: Shadcn/ui
- **Backend**: Supabase Edge Functions (Hono server)
- **Database**: Supabase KV Store
- **Storage**: Supabase Storage (for DXF files)
- **Authentication**: Supabase Auth

## Default Materials

### Metals
- Mild Steel: ₹0.10/mm
- Stainless Steel: ₹0.15/mm
- Aluminum: ₹0.12/mm

### Non-Metals
- Acrylic: ₹0.08/mm
- MDF: ₹0.06/mm
- PVC: ₹0.07/mm

## Getting Started

1. Sign up for a new account (first user becomes admin)
2. Upload a DXF file
3. Select material and thickness
4. Review and confirm order
5. Track your orders from the Orders page

## Admin Access

The first user to sign up automatically receives admin privileges and can:
- Access the Admin Panel from the header
- Add new materials with custom pricing
- Modify existing materials
- Remove materials from the system

## Notes

- Minimum charge: ₹100 per order
- All prices are calculated based on cutting length × rate per mm
- DXF files are parsed to extract dimensions and calculate cutting paths
- Orders are saved with status tracking

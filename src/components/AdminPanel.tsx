/**
 * Admin Panel - Main Administration Interface
 * 
 * Comprehensive admin dashboard for managing all aspects of Sheetcutters.com.
 * 
 * Sections:
 * 1. **Dashboard** - Business metrics, analytics, KPIs
 * 2. **Materials** - Manage laser cutting materials and pricing
 * 3. **Orders** - Order management, status updates, invoices
 * 4. **Users** - Customer management, user accounts
 * 5. **Discounts** - Promo codes, discount campaigns
 * 6. **Affiliates** - Affiliate tracking and commission management
 * 7. **Analytics** - Advanced analytics and reporting
 * 8. **Shipping** - Shipping rates, carriers, zones
 * 9. **Payments** - Payment gateway settings, transaction logs
 * 10. **Settings** - Company info, email, analytics, database
 * 
 * Features:
 * - Sidebar navigation with icons
 * - Mobile-responsive (hamburger menu on mobile)
 * - Real-time data updates
 * - Bulk operations (price updates, material imports)
 * - Support settings (WhatsApp number)
 * 
 * Access Control:
 * - Requires admin authentication (checked in parent component)
 * - All API calls use admin-specific endpoints
 * 
 * Navigation:
 * - Persistent sidebar (desktop)
 * - Slide-out drawer (mobile)
 * - Active section highlighting
 * 
 * @component
 */

import { useState, useEffect } from 'react';
import { apiCall } from '../utils/api';
import { toast } from 'sonner@2.0.3';
import { 
  ArrowLeft, Plus, Pencil, Trash2, Loader2, Trash, Package, 
  Settings as SettingsIcon, Menu, X, LayoutDashboard, Users, 
  ShoppingCart, Tag, TrendingUp, Truck, CreditCard, PercentCircle,
  CheckSquare, Square, Palette
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Switch } from './ui/switch';
import { useSupport } from '../contexts/SupportContext';

// Import all admin section components
import { Dashboard } from './admin/Dashboard';
import { AdditionalOptions } from './admin/AdditionalOptions';
import { OrdersManagement } from './admin/OrdersManagement';
import { UsersManagement } from './admin/UsersManagement';
import { DiscountsManagement } from './admin/DiscountsManagement';
import { AffiliatesManagement } from './admin/AffiliatesManagement';
import { Analytics } from './admin/Analytics';
import { ShippingManagement } from './admin/ShippingManagement';
import { PaymentsManagement } from './admin/PaymentsManagement';
import { EmailSettings } from './admin/EmailSettings';
import { AnalyticsSettings } from './admin/AnalyticsSettings';
import { CompanySettings } from './admin/CompanySettings';
import { GooglePlaceIDFinder } from './admin/GooglePlaceIDFinder';
import { PricingSettings } from './admin/PricingSettings';

/** Common acrylic colour presets for quick-add in the Manage Colours dialog */
const ACRYLIC_PRESETS: Array<{ name: string; hex: string }> = [
  { name: 'Clear', hex: '#f0f8ff' },
  { name: 'White', hex: '#ffffff' },
  { name: 'Black', hex: '#1a1a1a' },
  { name: 'Red', hex: '#dc0000' },
  { name: 'Blue', hex: '#1e40af' },
  { name: 'Green', hex: '#15803d' },
  { name: 'Yellow', hex: '#eab308' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Pink', hex: '#ec4899' },
  { name: 'Purple', hex: '#7c3aed' },
  { name: 'Gold (Mirror)', hex: '#d4af37' },
  { name: 'Silver (Mirror)', hex: '#c0c0c0' },
  { name: 'Rose Gold', hex: '#b76e79' },
  { name: 'Teal', hex: '#0d9488' },
  { name: 'Brown', hex: '#92400e' },
];

/**
 * Thickness-based Pricing Configuration
 */
interface ThicknessPricing {
  thickness: number;              // Thickness in mm (e.g., 1, 2, 3, 5, 10)
  pricePerMm: number;             // Price per mm of cutting path (₹)
  pricePerSqft?: number;          // Price per sq ft of material (₹) - thickness-specific
  inStock?: boolean;              // Whether this thickness is currently in stock
}

/**
 * Material Configuration
 * 
 * Represents a laser cuttable material with pricing tiers.
 */
interface Material {
  id: string;                     // Unique material ID (e.g., "mild-steel")
  name: string;                   // Display name (e.g., "Mild Steel")
  category: string;               // Category (Metals, Plastics, Wood, etc.)
  pricing: ThicknessPricing[];    // Pricing for different thicknesses
  density?: number;               // Material density in kg/m³ (for shipping weight calculation)
  colors_enabled?: boolean;       // Whether customers can pick a colour
  colors?: Array<{ name: string; hex: string }>;  // Available colours
}

/**
 * Admin Panel Props
 */
interface AdminPanelProps {
  onBack: () => void;             // Navigate back to main app
}

/**
 * Admin Section Type
 * 
 * Defines all available admin sections/pages.
 */
type AdminSection = 'dashboard' | 'materials' | 'orders' | 'users' | 'discounts' | 'affiliates' | 'analytics' | 'shipping' | 'payments' | 'settings';

export function AdminPanel({ onBack }: AdminPanelProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [currentSection, setCurrentSection] = useState<AdminSection>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [designServicePrice, setDesignServicePrice] = useState<number>(150);
  const [isSavingPrice, setIsSavingPrice] = useState(false);
  
  // Support settings
  const { settings: supportSettings, updateSettings: updateSupportSettings } = useSupport();
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [isSavingSupport, setIsSavingSupport] = useState(false);
  
  // Payment Gateway Settings
  const [razorpayEnabled, setRazorpayEnabled] = useState(true);
  const [payuEnabled, setPayuEnabled] = useState(true);
  const [isSavingPaymentGateways, setIsSavingPaymentGateways] = useState(false);
  
  // File Upload Settings
  const [maxFileSize, setMaxFileSize] = useState<number>(50); // Default 50MB
  const [isSavingFileSize, setIsSavingFileSize] = useState(false);
  
  // Bulk Update State
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [bulkCategory, setBulkCategory] = useState('All');
  const [bulkPercentage, setBulkPercentage] = useState(0);

  // Form state
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Metals');
  const [formPricing, setFormPricing] = useState<ThicknessPricing[]>([{ thickness: 1, pricePerMm: 0.10, pricePerSqft: 1, inStock: true }]);
  const [formDensity, setFormDensity] = useState<number | undefined>(undefined);
  // Colour form state
  const [formColorsEnabled, setFormColorsEnabled] = useState(false);
  const [formColors, setFormColors] = useState<Array<{ name: string; hex: string }>>([]);
  const [isColorsDialogOpen, setIsColorsDialogOpen] = useState(false);
  const [colorsDialogMaterial, setColorsDialogMaterial] = useState<Material | null>(null);
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#ffffff');

  // Helper function to migrate old material format to new format
  const migrateMaterial = (material: any): Material => {
    // If material already has pricing array, return as is
    if (material.pricing && Array.isArray(material.pricing)) {
      return material as Material;
    }
    
    // Migrate old format (pricePerMm + thicknesses) to new format (pricing array)
    if (material.pricePerMm !== undefined && material.thicknesses && Array.isArray(material.thicknesses)) {
      return {
        id: material.id,
        name: material.name,
        category: material.category,
        pricing: material.thicknesses.map((thickness: number) => ({
          thickness,
          pricePerMm: material.pricePerMm
        }))
      };
    }
    
    // Fallback: return material with empty pricing array
    return {
      id: material.id || '',
      name: material.name || '',
      category: material.category || 'Metals',
      pricing: []
    };
  };

  useEffect(() => {
    if (currentSection === 'materials') {
      loadMaterials();
    } else {
      setIsLoading(false);
    }
  }, [currentSection]);

  useEffect(() => {
    if (currentSection === 'settings') {
      loadDesignServicePrice();
      loadPaymentGateways();
      loadMaxFileSize();
      // Load WhatsApp number from context
      setWhatsappNumber(supportSettings.whatsappNumber);
    }
  }, [currentSection, supportSettings.whatsappNumber]);

  const loadMaterials = async () => {
    setIsLoading(true);
    try {
      console.log('📋 Loading materials...');
      // Add timestamp to bust cache
      const timestamp = Date.now();
      const result = await apiCall(`/materials?_t=${timestamp}`, { method: 'GET' }, false);
      console.log('📦 Raw materials from API:', result.materials);
      console.log('📦 First material pricing detail:', result.materials[0]?.pricing);
      const migratedMaterials = result.materials.map(migrateMaterial);
      console.log('✅ Migrated materials:', migratedMaterials);
      console.log('✅ First migrated material pricing:', migratedMaterials[0]?.pricing);
      setMaterials(migratedMaterials);
      console.log('✅ Materials state updated, count:', migratedMaterials.length);
    } catch (error: any) {
      console.error('❌ Load materials error:', error);
      toast.error('Failed to load materials');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDesignServicePrice = async () => {
    try {
      const result = await apiCall('/settings/design-service-price', { method: 'GET' }, false);
      setDesignServicePrice(result.price);
    } catch (error: any) {
      console.error('Load design service price error:', error);
      toast.error('Failed to load design service price');
    }
  };

  const loadPaymentGateways = async () => {
    try {
      const result = await apiCall('/admin/payment-gateways', { method: 'GET' });
      console.log('💳 Loaded payment gateways:', result);
      if (result.success) {
        setRazorpayEnabled(result.razorpay?.isEnabled !== false);
        setPayuEnabled(result.payu?.isEnabled !== false);
      }
    } catch (error: any) {
      console.error('Load payment gateways error:', error);
      toast.error('Failed to load payment gateway settings');
    }
  };

  const loadMaxFileSize = async () => {
    try {
      const result = await apiCall('/settings/max-file-size', { method: 'GET' }, false);
      console.log('💾 Loaded file upload settings:', result);
      if (result.success) {
        setMaxFileSize(result.maxFileSize);
      }
    } catch (error: any) {
      console.error('Load file upload settings error:', error);
      toast.error('Failed to load file upload settings');
    }
  };

  const handleSavePaymentGateways = async () => {
    setIsSavingPaymentGateways(true);
    try {
      // Update both gateways
      await apiCall('/admin/payment-gateways/razorpay', {
        method: 'PUT',
        body: JSON.stringify({ isEnabled: razorpayEnabled }),
      });
      
      await apiCall('/admin/payment-gateways/payu', {
        method: 'PUT',
        body: JSON.stringify({ isEnabled: payuEnabled }),
      });
      
      toast.success('Payment gateway settings updated successfully');
    } catch (error: any) {
      console.error('Save payment gateways error:', error);
      toast.error('Failed to update payment gateway settings');
    } finally {
      setIsSavingPaymentGateways(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormCategory('Metals');
    setFormPricing([{ thickness: 1, pricePerMm: 0.10, pricePerSqft: 1, inStock: true }]);
    setFormDensity(undefined);
    setFormColorsEnabled(false);
    setFormColors([]);
    setEditingMaterial(null);
  };

  const openEditDialog = (material: Material) => {
    setEditingMaterial(material);
    setFormName(material.name);
    setFormCategory(material.category);
    setFormPricing(material.pricing);
    setFormDensity(material.density);
    setFormColorsEnabled(material.colors_enabled || false);
    setFormColors(material.colors || []);
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!formName || formPricing.length === 0) {
        toast.error('Please fill in all fields');
        return;
      }

      const materialData = {
        id: editingMaterial?.id || `material-${Date.now()}`,
        name: formName,
        category: formCategory,
        pricing: formPricing,
        density: formDensity,
        colors_enabled: formColorsEnabled,
        colors: formColors,
      };

      console.log('💾 Saving material with pricing:', JSON.stringify(materialData.pricing, null, 2));

      if (editingMaterial) {
        const result = await apiCall(`/materials/${materialData.id}`, {
          method: 'PUT',
          body: JSON.stringify(materialData),
        });
        toast.success('Material updated successfully');
      } else {
        const result = await apiCall('/materials', {
          method: 'POST',
          body: JSON.stringify(materialData),
        });
        toast.success('Material added successfully');
      }

      setIsDialogOpen(false);
      resetForm();
      loadMaterials();
    } catch (error: any) {
      console.error('Save material error details:', {
        message: error.message,
        error: error,
        stack: error.stack
      });
      toast.error(error.message || 'Failed to save material');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this material?')) return;

    try {
      console.log('🗑️ Deleting material with ID:', id);
      const result = await apiCall(`/materials/${id}`, { method: 'DELETE' });
      console.log('✅ Delete result:', result);
      toast.success('Material deleted successfully');
      
      console.log('🔄 Reloading materials...');
      await loadMaterials();
      console.log('✅ Materials reloaded');
    } catch (error: any) {
      console.error('❌ Delete material error:', error);
      toast.error('Failed to delete material');
    }
  };

  const handleCleanupFiles = async () => {
    if (!confirm('This will delete old DXF files that are not associated with orders. Guest files older than 45 days and user files older than 180 days will be removed. Continue?')) {
      return;
    }

    setIsCleaningUp(true);
    try {
      const result = await apiCall('/cleanup-files', { method: 'POST' });
      toast.success(result.message);
      console.log('Cleanup result:', result);
    } catch (error: any) {
      console.error('Cleanup files error:', error);
      toast.error('Failed to cleanup files');
    } finally {
      setIsCleaningUp(false);
    }
  };

  const handleSaveDesignServicePrice = async () => {
    setIsSavingPrice(true);
    try {
      await apiCall('/settings/design-service-price', {
        method: 'POST',
        body: JSON.stringify({ price: designServicePrice }),
      });
      toast.success('Design service price updated successfully');
    } catch (error: any) {
      console.error('Save design service price error:', error);
      toast.error('Failed to update design service price');
    } finally {
      setIsSavingPrice(false);
    }
  };

  const handleSaveWhatsAppNumber = async () => {
    setIsSavingSupport(true);
    try {
      await updateSupportSettings({ whatsappNumber });
      toast.success('WhatsApp number updated successfully');
    } catch (error: any) {
      console.error('Save WhatsApp number error:', error);
      toast.error('Failed to update WhatsApp number');
    } finally {
      setIsSavingSupport(false);
    }
  };

  const handleSaveMaxFileSize = async () => {
    setIsSavingFileSize(true);
    try {
      await apiCall('/settings/max-file-size', {
        method: 'POST',
        body: JSON.stringify({ maxFileSize }),
      });
      toast.success('Maximum file size updated successfully');
    } catch (error: any) {
      console.error('Save max file size error:', error);
      toast.error('Failed to update maximum file size');
    } finally {
      setIsSavingFileSize(false);
    }
  };

  const handleBulkUpdate = async () => {
    if (bulkPercentage === 0) {
      toast.error('Please enter a percentage');
      return;
    }
    
    if (!confirm(`Are you sure you want to change prices by ${bulkPercentage}% for ${bulkCategory} materials?`)) return;

    setIsLoading(true);
    try {
      const targets = materials.filter(m => bulkCategory === 'All' || m.category === bulkCategory);
      
      await Promise.all(targets.map(m => {
        const updatedMaterial = {
          ...m,
          pricing: m.pricing.map(p => ({
            ...p,
            pricePerMm: Number((p.pricePerMm * (1 + bulkPercentage / 100)).toFixed(4))
          }))
        };
        return apiCall(`/materials/${m.id}`, {
          method: 'PUT',
          body: JSON.stringify(updatedMaterial),
        });
      }));
      
      toast.success('Bulk update completed');
      setIsBulkDialogOpen(false);
      loadMaterials();
    } catch (error) {
      console.error('Bulk update error:', error);
      toast.error('Failed to update prices');
      setIsLoading(false); // Only stop loading on error, success reloads materials which handles loading
    }
  };

  const handleSectionChange = (section: AdminSection) => {
    setCurrentSection(section);
    setIsMobileMenuOpen(false); // Close sidebar on mobile after selection
  };

  const navItems = [
    { id: 'dashboard' as AdminSection, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'materials' as AdminSection, label: 'Materials', icon: Package },
    { id: 'orders' as AdminSection, label: 'Orders', icon: ShoppingCart },
    { id: 'users' as AdminSection, label: 'Users', icon: Users },
    { id: 'discounts' as AdminSection, label: 'Discounts', icon: Tag },
    { id: 'affiliates' as AdminSection, label: 'Affiliates', icon: PercentCircle },
    { id: 'analytics' as AdminSection, label: 'Analytics', icon: TrendingUp },
    { id: 'shipping' as AdminSection, label: 'Shipping', icon: Truck },
    { id: 'payments' as AdminSection, label: 'Payments', icon: CreditCard },
    { id: 'settings' as AdminSection, label: 'Settings', icon: SettingsIcon },
  ];

  if (isLoading && currentSection === 'materials') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <>
      <style>{`
        .admin-sidebar {
          position: fixed;
          top: 0;
          left: 0;
          width: 250px;
          height: 100vh;
          background: #1a1a1a;
          border-right: 1px solid #2a2a2a;
          padding: 24px 0;
          z-index: 40;
          transition: transform 0.3s ease;
          overflow-y: auto;
        }

        .admin-sidebar-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 24px;
          color: #9ca3af;
          cursor: pointer;
          transition: all 0.2s;
          border-left: 3px solid transparent;
        }

        .admin-sidebar-item:hover {
          background: #2a2a2a;
          color: #fff;
        }

        .admin-sidebar-item.active {
          background: #2a2a2a;
          color: #3b82f6;
          border-left-color: #3b82f6;
        }

        .admin-main-content {
          margin-left: 250px;
          min-height: 100vh;
          background: #1a1a1a;
          padding: 24px;
        }

        /* Mobile styles */
        @media (max-width: 768px) {
          .admin-sidebar {
            transform: translateX(-100%);
            padding-top: 140px; /* Account for header space */
          }

          .admin-sidebar.open {
            transform: translateX(0);
          }

          .admin-main-content {
            margin-left: 0;
            padding-top: 12px; /* Add some space below header on mobile */
          }

          .mobile-menu-btn {
            position: fixed;
            top: 76px; /* Position below the header */
            left: 16px;
            z-index: 50;
            background: #1a1a1a;
            border: 1px solid #2a2a2a;
            padding: 8px;
            border-radius: 6px;
            cursor: pointer;
            color: #fff;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          }

          .mobile-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 35;
          }
        }

        @media (min-width: 769px) {
          .mobile-menu-btn,
          .mobile-overlay {
            display: none;
          }
        }
      `}</style>

      {/* Mobile menu button */}
      <button 
        className="mobile-menu-btn md:hidden"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div 
          className="mobile-overlay md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`admin-sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="px-6 mb-8">
          <h2 className="text-white">Admin Panel</h2>
        </div>

        <nav>
          {navItems.map((item) => (
            <div
              key={item.id}
              className={`admin-sidebar-item ${currentSection === item.id ? 'active' : ''}`}
              onClick={() => handleSectionChange(item.id)}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </div>
          ))}
        </nav>

        <div className="absolute bottom-6 left-0 right-0 px-6">
          <Button 
            variant="outline" 
            onClick={onBack}
            className="w-full border-gray-700 hover:bg-gray-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to App
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="admin-main-content">
        <div className="max-w-7xl mx-auto">
          {/* Dashboard Section */}
          {currentSection === 'dashboard' && <Dashboard />}

          {/* Materials Section */}
          {currentSection === 'materials' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-white mb-2">Materials Management</h1>
                <p className="text-gray-400">Manage materials and pricing for laser cutting</p>
              </div>

              <Card className="p-6 bg-[#1a1a1a] border-gray-800">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-white">Materials</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsBulkDialogOpen(true)}>
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Bulk Update
                    </Button>
                    <Button onClick={openNewDialog}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Material
                    </Button>
                  </div>
                  
                  <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
                    <DialogContent className="max-w-md bg-[#1a1a1a] border-gray-800">
                      <DialogHeader>
                        <DialogTitle className="text-white">Bulk Price Update</DialogTitle>
                        <DialogDescription className="text-gray-400">
                          Update pricing for multiple materials at once.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label className="text-gray-300">Category</Label>
                          <Select value={bulkCategory} onValueChange={setBulkCategory}>
                            <SelectTrigger className="bg-[#0a0a0a] border-gray-700 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a1a1a] border-gray-700">
                              <SelectItem value="All">All Categories</SelectItem>
                              <SelectItem value="Metals">Metals</SelectItem>
                              <SelectItem value="Non-Metals">Non-Metals</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-gray-300">Percentage Change (%)</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={bulkPercentage}
                              onChange={(e) => setBulkPercentage(Number(e.target.value))}
                              placeholder="e.g. 10 for +10%, -5 for -5%"
                              className="bg-[#0a0a0a] border-gray-700 text-white"
                            />
                            <span className="text-gray-400">%</span>
                          </div>
                          <p className="text-xs text-gray-500">
                            Positive values increase prices, negative values decrease them.
                          </p>
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                          <Button variant="outline" onClick={() => setIsBulkDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleBulkUpdate}>
                            Update Prices
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent className="max-w-md bg-[#1a1a1a] border-gray-800">
                      <DialogHeader>
                        <DialogTitle className="text-white">
                          {editingMaterial ? 'Edit Material' : 'Add New Material'}
                        </DialogTitle>
                        <DialogDescription className="text-gray-400">
                          {editingMaterial 
                            ? 'Update the material properties below.' 
                            : 'Enter the details for the new material.'}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="name" className="text-gray-300">Material Name</Label>
                          <Input
                            id="name"
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                            placeholder="e.g., Mild Steel"
                            className="bg-[#0a0a0a] border-gray-700 text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="category" className="text-gray-300">Category</Label>
                          <Select value={formCategory} onValueChange={setFormCategory}>
                            <SelectTrigger className="bg-[#0a0a0a] border-gray-700 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a1a1a] border-gray-700">
                              <SelectItem value="Metals">Metals</SelectItem>
                              <SelectItem value="Non-Metals">Non-Metals</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="pricing" className="text-gray-300">Pricing (Thickness: Price per mm: Price per Sq Ft)</Label>
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <CheckSquare className="w-3.5 h-3.5 text-emerald-500" /> = In Stock
                            </span>
                          </div>
                          <div className="space-y-2">
                            {formPricing.map((pricing, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={pricing.thickness}
                                  onChange={(e) => {
                                    const newPricing = [...formPricing];
                                    newPricing[index].thickness = parseFloat(e.target.value);
                                    setFormPricing(newPricing);
                                  }}
                                  placeholder="Thickness"
                                  className="bg-[#0a0a0a] border-gray-700 text-white w-24"
                                />
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={pricing.pricePerMm}
                                  onChange={(e) => {
                                    const newPricing = [...formPricing];
                                    newPricing[index].pricePerMm = parseFloat(e.target.value);
                                    setFormPricing(newPricing);
                                  }}
                                  placeholder="Price/mm"
                                  className="bg-[#0a0a0a] border-gray-700 text-white flex-1"
                                />
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={pricing.pricePerSqft || 1}
                                  onChange={(e) => {
                                    const newPricing = [...formPricing];
                                    newPricing[index].pricePerSqft = parseFloat(e.target.value);
                                    setFormPricing(newPricing);
                                  }}
                                  placeholder="Price/sqft"
                                  className="bg-[#0a0a0a] border-gray-700 text-white flex-1"
                                />
                                {/* In Stock checkbox: green check = in stock, grey square = out of stock */}
                                <button
                                  type="button"
                                  title={pricing.inStock !== false ? 'In Stock — click to mark Out of Stock' : 'Out of Stock — click to mark In Stock'}
                                  onClick={() => {
                                    const newPricing = [...formPricing];
                                    newPricing[index] = { ...newPricing[index], inStock: pricing.inStock === false ? true : false };
                                    setFormPricing(newPricing);
                                  }}
                                  className="flex-shrink-0 p-1 rounded hover:bg-gray-800 transition-colors"
                                >
                                  {pricing.inStock !== false ? (
                                    <CheckSquare className="w-5 h-5 text-emerald-500" />
                                  ) : (
                                    <Square className="w-5 h-5 text-gray-500" />
                                  )}
                                </button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const newPricing = [...formPricing];
                                    newPricing.splice(index, 1);
                                    setFormPricing(newPricing);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            ))}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setFormPricing([...formPricing, { thickness: 1, pricePerMm: 0.10, pricePerSqft: 1, inStock: true }]);
                              }}
                              className="text-blue-500"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add Thickness
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="density" className="text-gray-300">Density (kg/m³)</Label>
                          <Input
                            id="density"
                            type="number"
                            step="0.01"
                            value={formDensity !== undefined ? formDensity : ''}
                            onChange={(e) => setFormDensity(e.target.value ? parseFloat(e.target.value) : undefined)}
                            placeholder="e.g., 7850 for Mild Steel"
                            className="bg-[#0a0a0a] border-gray-700 text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-gray-300">Enable Colours</Label>
                          <Switch
                            checked={formColorsEnabled}
                            onCheckedChange={setFormColorsEnabled}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-gray-300">Available Colours</Label>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setColorsDialogMaterial(editingMaterial);
                                setIsColorsDialogOpen(true);
                              }}
                            >
                              <Palette className="w-4 h-4 text-blue-500" />
                            </Button>
                            <p className="text-sm text-gray-400">
                              {formColors.length > 0 ? formColors.map(c => c.name).join(', ') : 'None'}
                            </p>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleSave}>Save</Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-800 hover:bg-[#2a2a2a]">
                      <TableHead className="text-gray-400">Name</TableHead>
                      <TableHead className="text-gray-400">Category</TableHead>
                      <TableHead className="text-gray-400">Price/mm</TableHead>
                      <TableHead className="text-gray-400">Thicknesses</TableHead>
                      <TableHead className="text-right text-gray-400">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materials.map((material) => (
                      <TableRow key={material.id} className="border-gray-800 hover:bg-[#2a2a2a]">
                        <TableCell className="text-white">
                          <div className="flex items-center gap-2">
                            {material.name}
                            {material.colors_enabled && material.colors && material.colors.length > 0 && (
                              <span className="flex items-center gap-1 text-[10px] bg-purple-900/40 text-purple-300 border border-purple-700/40 px-1.5 py-0.5 rounded-full">
                                <Palette className="w-3 h-3" />
                                {material.colors.length}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-300">{material.category}</TableCell>
                        <TableCell className="text-gray-300">₹{material.pricing.map(p => p.pricePerMm.toFixed(2)).join(', ')}</TableCell>
                        <TableCell className="text-sm text-gray-400">
                          {material.pricing.map(p => p.thickness).join(', ')} mm
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(material)}
                            >
                              <Pencil className="w-4 h-4 text-blue-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(material.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>

              {/* Additional Options */}
              <AdditionalOptions />
              
              {/* Pricing Settings */}
              <PricingSettings />
            </div>
          )}

          {/* Orders Section */}
          {currentSection === 'orders' && <OrdersManagement />}

          {/* Users Section */}
          {currentSection === 'users' && <UsersManagement />}

          {/* Discounts Section */}
          {currentSection === 'discounts' && <DiscountsManagement />}

          {/* Affiliates Section */}
          {currentSection === 'affiliates' && <AffiliatesManagement />}

          {/* Analytics Section */}
          {currentSection === 'analytics' && <Analytics />}

          {/* Shipping Section */}
          {currentSection === 'shipping' && <ShippingManagement />}

          {/* Payments Section */}
          {currentSection === 'payments' && <PaymentsManagement />}

          {/* Settings Section */}
          {currentSection === 'settings' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-white mb-2">Settings</h1>
                <p className="text-gray-400">Manage system settings and maintenance</p>
              </div>

              {/* Email Settings */}
              <EmailSettings />

              {/* Analytics Settings */}
              <AnalyticsSettings />

              {/* Company Information Settings */}
              <CompanySettings />

              {/* Google Place ID Finder */}
              <GooglePlaceIDFinder />

              {/* Design Service Price Setting */}
              <Card className="p-6 bg-[#1a1a1a] border-gray-800">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-blue-400 mb-2">Design Service Price</h3>
                    <p className="text-gray-400 text-sm mb-4">
                      Set the price for the Convert Sketch to DXF service. This price is shown to customers who upload sketch files instead of DXF files.
                    </p>
                  </div>
                  <div className="flex items-end gap-4">
                    <div className="flex-1 max-w-xs">
                      <label className="block text-gray-400 text-sm mb-2">
                        Price (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={designServicePrice}
                        onChange={(e) => setDesignServicePrice(Number(e.target.value))}
                        className="w-full px-4 py-2 bg-[#222222] border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <Button 
                      onClick={handleSaveDesignServicePrice}
                      disabled={isSavingPrice}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isSavingPrice ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Price'
                      )}
                    </Button>
                  </div>
                </div>
              </Card>

              {/* WhatsApp Number Setting */}
              <Card className="p-6 bg-[#1a1a1a] border-gray-800">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-blue-400 mb-2">WhatsApp Number</h3>
                    <p className="text-gray-400 text-sm mb-4">
                      Set the WhatsApp number for customer support. This number will be displayed in the contact form.
                    </p>
                  </div>
                  <div className="flex items-end gap-4">
                    <div className="flex-1 max-w-xs">
                      <label className="block text-gray-400 text-sm mb-2">
                        WhatsApp Number
                      </label>
                      <input
                        type="text"
                        value={whatsappNumber}
                        onChange={(e) => setWhatsappNumber(e.target.value)}
                        className="w-full px-4 py-2 bg-[#222222] border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <Button 
                      onClick={handleSaveWhatsAppNumber}
                      disabled={isSavingSupport}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isSavingSupport ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Number'
                      )}
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Payment Gateway Settings */}
              <Card className="p-6 bg-[#1a1a1a] border-gray-800">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-blue-400 mb-2">Payment Gateways</h3>
                    <p className="text-gray-400 text-sm">
                      Enable or disable payment gateways. Disabled gateways will be hidden from checkout. At least one gateway must remain enabled.
                    </p>
                  </div>

                  {/* Gateway Toggles */}
                  <div className="space-y-4">
                    {/* Razorpay */}
                    <div className="flex items-center justify-between p-4 bg-[#222222] rounded-lg border border-gray-700">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CreditCard className="w-4 h-4 text-blue-400" />
                          <span className="text-gray-200">Razorpay</span>
                        </div>
                        <p className="text-xs text-gray-400">
                          UPI, Cards, International Cards, Wallets
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs ${razorpayEnabled ? 'text-green-400' : 'text-gray-500'}`}>
                          {razorpayEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                        <Switch
                          checked={razorpayEnabled}
                          onCheckedChange={setRazorpayEnabled}
                          disabled={razorpayEnabled && !payuEnabled} // Can't disable if it's the only one enabled
                        />
                      </div>
                    </div>

                    {/* PayU */}
                    <div className="flex items-center justify-between p-4 bg-[#222222] rounded-lg border border-gray-700">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CreditCard className="w-4 h-4 text-blue-400" />
                          <span className="text-gray-200">PayU India</span>
                        </div>
                        <p className="text-xs text-gray-400">
                          UPI, CARDS, Net Banking, BNPL, EMI, QR
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs ${payuEnabled ? 'text-green-400' : 'text-gray-500'}`}>
                          {payuEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                        <Switch
                          checked={payuEnabled}
                          onCheckedChange={setPayuEnabled}
                          disabled={payuEnabled && !razorpayEnabled} // Can't disable if it's the only one enabled
                        />
                      </div>
                    </div>
                  </div>

                  {/* Warning if both disabled */}
                  {!razorpayEnabled && !payuEnabled && (
                    <div className="p-3 bg-red-950/30 border border-red-800/50 rounded-lg">
                      <p className="text-sm text-red-400">
                        ⚠️ At least one payment gateway must be enabled for customers to complete checkout.
                      </p>
                    </div>
                  )}

                  {/* Save Button */}
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleSavePaymentGateways}
                      disabled={isSavingPaymentGateways || (!razorpayEnabled && !payuEnabled)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isSavingPaymentGateways ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Payment Gateway Settings'
                      )}
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Maximum File Upload Size Setting */}
              <Card className="p-6 bg-[#1a1a1a] border-gray-800">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-blue-400 mb-2">Maximum File Upload Size</h3>
                    <p className="text-gray-400 text-sm mb-4">
                      Set the maximum file size for DXF and sketch uploads. This limit applies to both workflows. Changes take effect immediately for all new uploads.
                    </p>
                  </div>
                  <div className="flex items-end gap-4">
                    <div className="flex-1 max-w-xs">
                      <label className="block text-gray-400 text-sm mb-2">
                        Max File Size (MB)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="500"
                        step="1"
                        value={maxFileSize}
                        onChange={(e) => setMaxFileSize(Number(e.target.value))}
                        className="w-full px-4 py-2 bg-[#222222] border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Default: 50MB • Recommended for free tier: 50MB • For paid plans: up to 500MB
                      </p>
                    </div>
                    <Button 
                      onClick={handleSaveMaxFileSize}
                      disabled={isSavingFileSize}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isSavingFileSize ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save File Size'
                      )}
                    </Button>
                  </div>
                </div>
              </Card>

              {/* File Storage Cleanup */}
              <Card className="p-6 bg-[#1a1a1a] border-red-900/50">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-red-400 mb-2">File Storage Cleanup</h3>
                    <p className="text-gray-400 text-sm">
                      Remove old DXF files that are not associated with any orders.
                      Guest uploads older than 45 days and user uploads older than 180 days will be deleted.
                    </p>
                  </div>
                  <Button 
                    variant="destructive" 
                    onClick={handleCleanupFiles}
                    disabled={isCleaningUp}
                  >
                    {isCleaningUp ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Cleaning Up...
                      </>
                    ) : (
                      <>
                        <Trash className="w-4 h-4 mr-2" />
                        Cleanup Old Files
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Colours Dialog */}
      <Dialog open={isColorsDialogOpen} onOpenChange={setIsColorsDialogOpen}>
        <DialogContent className="max-w-md bg-[#1a1a1a] border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">Manage Colours</DialogTitle>
            <DialogDescription className="text-gray-400">
              Add, edit, or remove available colours for this material.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-1">
            {/* Preset acrylic colours */}
            <div className="space-y-2">
              <Label className="text-gray-300 text-xs uppercase tracking-wide">Quick-Add Presets</Label>
              <div className="flex flex-wrap gap-2">
                {ACRYLIC_PRESETS.map((preset) => {
                  const alreadyAdded = formColors.some(c => c.name === preset.name);
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      disabled={alreadyAdded}
                      onClick={() => {
                        if (!alreadyAdded) setFormColors(prev => [...prev, preset]);
                      }}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs border transition-all ${
                        alreadyAdded
                          ? 'opacity-40 cursor-not-allowed border-gray-700 text-gray-500'
                          : 'border-gray-600 text-gray-300 hover:border-gray-400 hover:text-white cursor-pointer'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0 border border-white/20"
                        style={{ backgroundColor: preset.hex }}
                      />
                      {preset.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Current colours */}
            <div className="space-y-2">
              <Label className="text-gray-300 text-xs uppercase tracking-wide">Current Colours ({formColors.length})</Label>
              {formColors.length === 0 && (
                <p className="text-gray-600 text-xs italic">No colours added yet.</p>
              )}
              <div className="space-y-1.5">
                {formColors.map((color, index) => (
                  <div key={index} className="flex items-center gap-2 bg-[#0f0f0f] rounded px-3 py-2">
                    <div
                      className="w-5 h-5 rounded-full flex-shrink-0 border border-white/20"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="text-gray-300 text-sm flex-1">{color.name}</span>
                    <span className="text-gray-600 text-xs font-mono">{color.hex}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-red-950"
                      onClick={() => {
                        const newColors = [...formColors];
                        newColors.splice(index, 1);
                        setFormColors(newColors);
                      }}
                    >
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Add custom colour */}
            <div className="space-y-2">
              <Label className="text-gray-300 text-xs uppercase tracking-wide">Add Custom Colour</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  value={newColorName}
                  onChange={(e) => setNewColorName(e.target.value)}
                  placeholder="Name (e.g., Teal)"
                  className="bg-[#0a0a0a] border-gray-700 text-white flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newColorName) {
                      setFormColors(prev => [...prev, { name: newColorName, hex: newColorHex }]);
                      setNewColorName('');
                      setNewColorHex('#ffffff');
                    }
                  }}
                />
                <input
                  type="color"
                  value={newColorHex}
                  onChange={(e) => setNewColorHex(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0"
                  title="Pick a colour"
                />
                <Button
                  size="sm"
                  disabled={!newColorName}
                  onClick={() => {
                    if (newColorName) {
                      setFormColors(prev => [...prev, { name: newColorName, hex: newColorHex }]);
                      setNewColorName('');
                      setNewColorHex('#ffffff');
                    }
                  }}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-800">
              <Button variant="outline" onClick={() => setIsColorsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsColorsDialogOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
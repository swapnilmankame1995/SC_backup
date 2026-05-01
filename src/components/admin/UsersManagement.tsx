import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Pencil, Loader2, Mail, Phone, MapPin, Gift, Download, Trash2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { apiCall } from '../../utils/api';
import { projectId } from '../../utils/supabase/info';
import { Switch } from '../ui/switch';

interface User {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  createdAt: string;
  isAdmin?: boolean;
  points?: number; // Loyalty points
  isSubscribed?: boolean; // Email marketing subscription
}

export function UsersManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({});
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const itemsPerPage = 10;

  useEffect(() => {
    loadUsers();
  }, [currentPage]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const result = await apiCall(`/admin/users?page=${currentPage}&limit=${itemsPerPage}`, { method: 'GET' });
      setUsers(result.users || []);
      setTotalPages(result.pagination?.totalPages || 1);
      setTotalUsers(result.pagination?.total || 0);
    } catch (error: any) {
      console.error('Load users error:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setFormData(user);
    setIsEditOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!selectedUser) return;

      await apiCall(`/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        body: JSON.stringify(formData),
      });

      toast.success('User updated successfully');
      setIsEditOpen(false);
      loadUsers();
    } catch (error: any) {
      console.error('Update user error:', error);
      toast.error('Failed to update user');
    }
  };

  const handleExportCSV = async () => {
    try {
      toast.info('Generating CSV export...');
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8927474f/admin/users/export/csv`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to export users');
      }

      // Get the CSV content
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Users exported successfully!');
    } catch (error: any) {
      console.error('Export CSV error:', error);
      toast.error('Failed to export users');
    }
  };

  const handleDelete = (user: User) => {
    setUserToDelete(user);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      if (!userToDelete) return;

      await apiCall(`/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
      });

      toast.success('User deleted successfully');
      setIsDeleteOpen(false);
      loadUsers();
    } catch (error: any) {
      console.error('Delete user error:', error);
      toast.error('Failed to delete user');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white mb-2">Users Management</h1>
          <p className="text-gray-400">View and manage registered users</p>
        </div>
        <Button
          onClick={handleExportCSV}
          className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      <Card className="p-6 bg-[#1a1a1a] border-gray-800">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-800 hover:bg-[#2a2a2a]">
                <TableHead className="text-gray-400">Name</TableHead>
                <TableHead className="text-gray-400">Email</TableHead>
                <TableHead className="text-gray-400">Phone</TableHead>
                <TableHead className="text-gray-400">Location</TableHead>
                <TableHead className="text-gray-400">Points</TableHead>
                <TableHead className="text-gray-400">Subscribed</TableHead>
                <TableHead className="text-gray-400">Joined</TableHead>
                <TableHead className="text-right text-gray-400">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} className="border-gray-800 hover:bg-[#2a2a2a]">
                  <TableCell className="text-white">
                    <div className="flex items-center gap-2">
                      {user.name || 'N/A'}
                      {user.isAdmin && (
                        <span className="bg-blue-950 text-blue-400 px-2 py-0.5 rounded text-xs">
                          Admin
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-300">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-500" />
                      {user.email}
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-300">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-500" />
                      {user.phone || 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-300">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      {user.city && user.state ? `${user.city}, ${user.state}` : 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-300">
                    <div className="flex items-center gap-2">
                      <Gift className="w-4 h-4 text-emerald-500" />
                      <span className="text-emerald-400">{user.points || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {user.isSubscribed !== false ? (
                      <span className="bg-emerald-950/50 text-emerald-400 px-2 py-0.5 rounded text-xs">
                        ✓ Yes
                      </span>
                    ) : (
                      <span className="bg-gray-800 text-gray-500 px-2 py-0.5 rounded text-xs">
                        ✗ No
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {new Date(user.createdAt).toLocaleDateString('en-GB', { 
                      day: 'numeric', 
                      month: 'numeric', 
                      year: 'numeric' 
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(user)}
                    >
                      <Pencil className="w-4 h-4 text-blue-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(user)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                    No users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-800">
            <p className="text-sm text-gray-400">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalUsers)} of {totalUsers} users
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="border-gray-700 hover:bg-gray-800 text-gray-300"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="border-gray-700 hover:bg-gray-800 text-gray-300"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl bg-[#1a1a1a] border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">Edit User Details</DialogTitle>
            <DialogDescription className="text-gray-400">
              Update user information and contact details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Name</Label>
                <Input
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-[#0a0a0a] border-gray-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Email</Label>
                <Input
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-[#0a0a0a] border-gray-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Phone</Label>
                <Input
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="bg-[#0a0a0a] border-gray-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Pincode</Label>
                <Input
                  value={formData.pinCode || ''}
                  onChange={(e) => setFormData({ ...formData, pinCode: e.target.value })}
                  className="bg-[#0a0a0a] border-gray-700 text-white"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label className="text-gray-300">Address</Label>
                <Input
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="bg-[#0a0a0a] border-gray-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">City</Label>
                <Input
                  value={formData.city || ''}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="bg-[#0a0a0a] border-gray-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">State</Label>
                <Input
                  value={formData.state || ''}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="bg-[#0a0a0a] border-gray-700 text-white"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <div className="flex items-center justify-between p-4 bg-blue-950/20 border border-blue-800/30 rounded-lg">
                  <div>
                    <Label className="text-gray-300">Admin Access</Label>
                    <p className="text-xs text-gray-500 mt-1">Grant this user admin panel access</p>
                  </div>
                  <Switch
                    checked={formData.isAdmin || false}
                    onCheckedChange={(checked) => setFormData({ ...formData, isAdmin: checked })}
                  />
                </div>
              </div>
              <div className="space-y-2 col-span-2">
                <div className="flex items-center justify-between p-4 bg-emerald-950/20 border border-emerald-800/30 rounded-lg">
                  <div>
                    <Label className="text-gray-300">Email Marketing Subscription</Label>
                    <p className="text-xs text-gray-500 mt-1">Opt-in for promotional emails and offers</p>
                  </div>
                  <Switch
                    checked={formData.isSubscribed !== false}
                    onCheckedChange={(checked) => setFormData({ ...formData, isSubscribed: checked })}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-2xl bg-[#1a1a1a] border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">Delete User Account</DialogTitle>
            <DialogDescription className="text-gray-400">
              This will anonymize the user's personal data while preserving order history and affiliate records for business integrity.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-amber-950/30 border border-amber-700/50 rounded-lg p-4 mb-4">
              <p className="text-amber-400 text-sm">
                <strong>What will be preserved:</strong>
              </p>
              <ul className="text-amber-300/80 text-sm mt-2 ml-4 list-disc space-y-1">
                <li>Order history (for business records)</li>
                <li>Affiliate commission data (affiliates keep their earnings)</li>
                <li>Financial records (for accounting purposes)</li>
              </ul>
              <p className="text-amber-400 text-sm mt-3">
                <strong>What will be removed:</strong>
              </p>
              <ul className="text-amber-300/80 text-sm mt-2 ml-4 list-disc space-y-1">
                <li>Personal information (name, email, phone, address)</li>
                <li>Login access (cannot sign in)</li>
                <li>Delivery information</li>
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Name</Label>
                <Input
                  value={userToDelete?.name || ''}
                  readOnly
                  className="bg-[#0a0a0a] border-gray-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Email</Label>
                <Input
                  value={userToDelete?.email || ''}
                  readOnly
                  className="bg-[#0a0a0a] border-gray-700 text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700 text-white">
                Anonymize & Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
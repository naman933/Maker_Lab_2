import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { UserPlus, Pencil, Trash2 } from 'lucide-react';

export default function UserManagementPage() {
  const { users, queries, addUser, updateUser, deleteUser, redistributeQueries } = useData();
  const { user: currentUser } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', username: '', password: '', email: '', role: 'AdCom Member' });

  const openCreate = () => {
    setEditingUser(null);
    setForm({ name: '', username: '', password: '', email: '', role: 'AdCom Member' });
    setDialogOpen(true);
  };

  const openEdit = (u) => {
    setEditingUser(u);
    setForm({ name: u.name, username: u.username, password: '', email: u.email || '', role: u.role });
    setDialogOpen(true);
  };

  const openDelete = (u) => {
    setDeletingUser(u);
    setDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.username.trim()) {
      toast.error('Name and username are required');
      return;
    }
    if (!editingUser && !form.password.trim()) {
      toast.error('Password is required for new users');
      return;
    }

    setLoading(true);
    try {
      if (editingUser) {
        const updates = {
          name: form.name,
          email: form.email,
          role: form.role,
          isAdminAccess: form.role === 'Admin',
        };
        if (form.password.trim()) {
          updates.password = form.password;
        }
        await updateUser(editingUser.id, updates);
        toast.success('User updated successfully');
      } else {
        await addUser({
          name: form.name,
          username: form.username,
          password: form.password,
          email: form.email,
          role: form.role,
          isAdminAccess: form.role === 'Admin',
        });
        toast.success('User created successfully');
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error(err.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    setLoading(true);
    try {
      await deleteUser(deletingUser.id);
      toast.success(`User "${deletingUser.name}" deleted`);
      setDeleteDialogOpen(false);
      setDeletingUser(null);
    } catch (err) {
      toast.error(err.message || 'Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAvailability = async (u) => {
    const newAvailable = !u.isAvailable;
    try {
      await updateUser(u.id, { isAvailable: newAvailable });
      if (!newAvailable) {
        // Redistribute open queries from this member
        const openCount = queries.filter(
          q => q.assignedTo === u.username && q.internalStatus !== 'Resolved' && q.internalStatus !== 'Spam'
        ).length;
        if (openCount > 0) {
          const moved = redistributeQueries(u.username);
          toast.success(`${u.name} marked unavailable. ${moved} queries redistributed.`);
        } else {
          toast.success(`${u.name} marked unavailable`);
        }
      } else {
        toast.success(`${u.name} marked available`);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update availability');
    }
  };

  const getOpenQueryCount = (username) =>
    queries.filter(q => q.assignedTo === username && q.internalStatus !== 'Resolved' && q.internalStatus !== 'Spam').length;

  return (
    <div className="space-y-6" data-testid="user-management-page">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" data-testid="page-title">User Management</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage system users, access levels, and assignment availability</p>
        </div>
        <Button onClick={openCreate} data-testid="add-user-btn">
          <UserPlus className="w-4 h-4 mr-2" /> Add User
        </Button>
      </div>

      <div className="border rounded-lg" data-testid="users-table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-center">Open Queries</TableHead>
              <TableHead className="text-center">Available</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No users found. Create your first user.
                </TableCell>
              </TableRow>
            ) : (
              users.map(u => (
                <TableRow key={u.id} className={u.role === 'AdCom Member' && !u.isAvailable ? 'opacity-60' : ''} data-testid={`user-row-${u.username}`}>
                  <TableCell className="font-medium">
                    {u.name}
                    {u.role === 'AdCom Member' && !u.isAvailable && (
                      <Badge variant="outline" className="ml-2 text-[10px] text-amber-600 border-amber-300">Unavailable</Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{u.username}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.email || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === 'Admin' ? 'default' : 'secondary'} data-testid={`role-badge-${u.username}`}>
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {u.role === 'AdCom Member' ? (
                      <span className="text-sm font-mono" data-testid={`query-count-${u.username}`}>
                        {getOpenQueryCount(u.username)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {u.role === 'AdCom Member' ? (
                      <Switch
                        checked={u.isAvailable !== false}
                        onCheckedChange={() => handleToggleAvailability(u)}
                        data-testid={`toggle-available-${u.username}`}
                      />
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(u)} data-testid={`edit-user-${u.username}`}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      {u.username !== currentUser?.username && (
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => openDelete(u)} data-testid={`delete-user-${u.username}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md" data-testid="user-dialog">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit User' : 'Create New User'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="John Doe" data-testid="input-name" />
            </div>
            <div>
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="johndoe" disabled={!!editingUser} data-testid="input-username" />
            </div>
            <div>
              <Label htmlFor="password">{editingUser ? 'New Password (leave blank to keep)' : 'Password'}</Label>
              <Input id="password" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder={editingUser ? 'Leave blank to keep current' : 'Enter password'} data-testid="input-password" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="john@example.com" data-testid="input-email" />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={form.role} onValueChange={val => setForm({ ...form, role: val })}>
                <SelectTrigger data-testid="select-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="AdCom Member">AdCom Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={loading} data-testid="save-user-btn">
              {loading ? 'Saving...' : (editingUser ? 'Update' : 'Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm" data-testid="delete-dialog">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Are you sure you want to delete <span className="font-semibold text-foreground">{deletingUser?.name}</span> ({deletingUser?.username})? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading} data-testid="confirm-delete-btn">
              {loading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

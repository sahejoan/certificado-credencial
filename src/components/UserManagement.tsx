import React, { useState, useEffect } from 'react';
import { Shield, User as UserIcon, Mail, Calendar, Trash2, Edit2, Check, X, UserPlus, Search, Filter, Lock } from 'lucide-react';
import { User, UserRole } from '../types';
import { db, auth } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, setDoc, query, orderBy } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

interface UserManagementProps {
  currentUser: User | null;
}

export default function UserManagement({ currentUser }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('viewer');
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('viewer');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => doc.data() as User));
    });
    return () => unsub();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;

    setIsLoading(true);
    try {
      // Check if user already exists
      const existingUser = users.find(u => u.email.toLowerCase() === newEmail.toLowerCase());
      if (existingUser) {
        toast.error('El usuario ya existe');
        return;
      }

      // If password is provided, we create the user in Auth too
      let uid = `pending_${newEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
      
      if (newPassword) {
        const idToken = await auth.currentUser?.getIdToken();
        const response = await fetch('/api/admin/create-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            email: newEmail.toLowerCase(),
            password: newPassword,
            displayName: newName,
            role: newRole
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al crear el usuario en Auth');
        }
        
        const data = await response.json();
        uid = data.uid;
      } else {
        // Pre-register user in Firestore only
        const newUser: User = {
          uid,
          email: newEmail.toLowerCase(),
          displayName: newName || undefined,
          role: newRole,
          createdAt: Date.now()
        };
        await setDoc(doc(db, 'users', uid), newUser);
      }

      toast.success(newPassword ? 'Usuario creado con éxito' : 'Usuario pre-registrado');
      setIsAddModalOpen(false);
      setNewEmail('');
      setNewName('');
      setNewRole('viewer');
      setNewPassword('');
    } catch (error: any) {
      console.error('Error adding user:', error);
      toast.error(error.message || 'Error al agregar usuario');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditEmail(user.email);
    setEditName(user.displayName || '');
    setEditRole(user.role);
    setEditPassword('');
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsLoading(true);
    try {
      const updates: Partial<User> = {
        role: editRole,
        displayName: editName || undefined
      };

      // Only allow editing email if it's a pending user
      if (editingUser.uid.startsWith('pending_')) {
        updates.email = editEmail.toLowerCase();
      }

      // Update Firestore data
      await updateDoc(doc(db, 'users', editingUser.uid), updates);

      // If password is provided, update it via backend API
      if (editPassword && !editingUser.uid.startsWith('pending_')) {
        const idToken = await auth.currentUser?.getIdToken();
        if (!idToken) throw new Error('No se pudo obtener el token de autenticación');

        const response = await fetch('/api/admin/update-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            uid: editingUser.uid,
            newPassword: editPassword
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al actualizar la contraseña');
        }
      }

      toast.success('Usuario actualizado');
      setIsEditModalOpen(false);
      setEditingUser(null);
      setEditPassword('');
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(error.message || 'Error al actualizar usuario');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRole = async (uid: string, newRole: UserRole) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      toast.success('Rol actualizado');
    } catch (error) {
      toast.error('Error al actualizar rol');
    }
  };

  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    if (userToDelete === currentUser?.uid) {
      toast.error('No puedes eliminarte a ti mismo');
      setUserToDelete(null);
      return;
    }
    try {
      await deleteDoc(doc(db, 'users', userToDelete));
      toast.success('Usuario eliminado');
      setUserToDelete(null);
    } catch (error) {
      toast.error('Error al eliminar usuario');
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.email.toLowerCase().includes(search.toLowerCase()) || 
                         (u.displayName?.toLowerCase() || '').includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Gestión de Usuarios</h2>
          <p className="text-zinc-500 mt-1">Administra los niveles de acceso de los usuarios del sistema.</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-900/20"
        >
          <UserPlus className="w-5 h-5" />
          Agregar Usuario
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-zinc-900 border border-white/5 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-zinc-500" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="text-sm bg-zinc-900 border border-white/5 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-white"
          >
            <option value="all">Todos los roles</option>
            <option value="admin">Administrador</option>
            <option value="editor">Editor</option>
            <option value="viewer">Lector</option>
          </select>
        </div>
      </div>

      <div className="bg-zinc-900 border border-white/5 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-800/50 border-b border-white/5">
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Usuario</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Email</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Rol</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Registro</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.map((user) => (
                <tr key={user.uid} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full border border-white/10" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500">
                          <UserIcon className="w-4 h-4" />
                        </div>
                      )}
                      <div>
                        <span className="font-medium text-white block">{user.displayName || 'Usuario'}</span>
                        {user.uid.startsWith('pending_') && (
                          <span className="text-[10px] text-amber-500 font-bold uppercase tracking-tighter">Pendiente</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-zinc-400 text-sm">
                      <Mail className="w-4 h-4" />
                      {user.email}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        user.role === 'admin' ? "bg-red-500/10 text-red-400" :
                        user.role === 'editor' ? "bg-indigo-500/10 text-indigo-400" :
                        "bg-zinc-800 text-zinc-500"
                      )}>
                        {user.role}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-zinc-500 text-xs">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="p-2 text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all"
                        title="Editar Usuario"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setUserToDelete(user.uid)}
                        disabled={user.uid === currentUser?.uid}
                        className="p-2 text-zinc-600 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Eliminar Usuario"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/10 rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mb-6">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">¿Eliminar usuario?</h3>
              <p className="text-zinc-400 mb-8">
                Esta acción es irreversible. El usuario perderá el acceso al sistema inmediatamente.
              </p>
              <div className="flex gap-4 w-full">
                <button
                  onClick={() => setUserToDelete(null)}
                  className="flex-1 py-4 bg-zinc-800 text-white rounded-2xl font-bold hover:bg-zinc-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteUser}
                  className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-900/20"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/10 rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">Editar Usuario</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-white/5 rounded-xl text-zinc-500">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Nombre</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Nombre del usuario"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Email</label>
                <input
                  type="email"
                  required
                  disabled={!editingUser.uid.startsWith('pending_')}
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="usuario@ejemplo.com"
                />
                {!editingUser.uid.startsWith('pending_') && (
                  <p className="text-[10px] text-zinc-500 mt-1">El email de usuarios registrados no se puede cambiar.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Rol</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="viewer">Lector</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              {!editingUser.uid.startsWith('pending_') && (
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Nueva Contraseña (Opcional)</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="password"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Dejar en blanco para no cambiar"
                    />
                  </div>
                </div>
              )}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  'Guardar Cambios'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/10 rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">Agregar Usuario</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-white/5 rounded-xl text-zinc-500">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Nombre (Opcional)</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Nombre del usuario"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="usuario@ejemplo.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Rol</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="viewer">Lector</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Contraseña (Opcional)</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Contraseña para el nuevo usuario"
                  />
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">Si se proporciona, el usuario se creará inmediatamente.</p>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creando...
                  </>
                ) : (
                  'Agregar Usuario'
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}

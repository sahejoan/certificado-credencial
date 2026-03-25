import React, { useState, useEffect } from 'react';
import { Shield, User as UserIcon, Mail, Calendar, Trash2, Edit2, Check, X } from 'lucide-react';
import { User, UserRole } from '../types';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

interface UserManagementProps {
  currentUser: User | null;
}

export default function UserManagement({ currentUser }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [editingUid, setEditingUid] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => doc.data() as User));
    });
    return () => unsub();
  }, []);

  const handleUpdateRole = async (uid: string, newRole: UserRole) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      toast.success('Rol actualizado');
      setEditingUid(null);
    } catch (error) {
      toast.error('Error al actualizar rol');
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (uid === currentUser?.uid) {
      toast.error('No puedes eliminarte a ti mismo');
      return;
    }
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    try {
      await deleteDoc(doc(db, 'users', uid));
      toast.success('Usuario eliminado');
    } catch (error) {
      toast.error('Error al eliminar usuario');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white tracking-tight">Gestión de Usuarios</h2>
        <p className="text-zinc-500 mt-1">Administra los niveles de acceso de los usuarios del sistema.</p>
      </div>

      <div className="bg-zinc-900 border border-white/5 rounded-3xl overflow-hidden">
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
            {users.map((user) => (
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
                    <span className="font-medium text-white">{user.displayName || 'Usuario'}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-zinc-400 text-sm">
                    <Mail className="w-4 h-4" />
                    {user.email}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {editingUid === user.uid ? (
                    <div className="flex items-center gap-2">
                      <select
                        defaultValue={user.role}
                        onChange={(e) => handleUpdateRole(user.uid, e.target.value as UserRole)}
                        className="bg-zinc-800 border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="viewer">Lector</option>
                        <option value="editor">Editor</option>
                        <option value="admin">Administrador</option>
                      </select>
                      <button onClick={() => setEditingUid(null)} className="p-1 text-zinc-500 hover:text-white">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        user.role === 'admin' ? "bg-red-500/10 text-red-400" :
                        user.role === 'editor' ? "bg-indigo-500/10 text-indigo-400" :
                        "bg-zinc-800 text-zinc-500"
                      )}>
                        {user.role}
                      </span>
                      <button 
                        onClick={() => setEditingUid(user.uid)}
                        className="p-1 text-zinc-600 hover:text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-zinc-500 text-xs">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(user.createdAt).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleDeleteUser(user.uid)}
                    disabled={user.uid === currentUser?.uid}
                    className="p-2 text-zinc-600 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}

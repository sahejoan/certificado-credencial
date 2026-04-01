import React from 'react';
import { Plus, Trash2, Edit2, Award, Building2 } from 'lucide-react';
import { Authority, User } from '../types';
import { cn } from '../lib/utils';

interface AuthorityListProps {
  authorities: Authority[];
  onAddAuthority: () => void;
  onEditAuthority: (authority: Authority) => void;
  onDeleteAuthority: (id: string) => void;
  onToggleSignature: (id: string, active: boolean) => void;
  user: User | null;
}

export default function AuthorityList({ 
  authorities, 
  onAddAuthority, 
  onEditAuthority, 
  onDeleteAuthority,
  onToggleSignature,
  user
}: AuthorityListProps) {
  const isEditor = user?.role === 'admin' || user?.role === 'editor';
  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Autoridades Firmantes</h2>
          <p className="text-zinc-500 mt-1">Gestiona la lista global de Directores, Rectores y otros firmantes.</p>
        </div>
        {isEditor && (
          <button
            onClick={onAddAuthority}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-900/20 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Nueva Autoridad
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {authorities.map((auth) => (
          <div 
            key={auth.id}
            className="bg-zinc-900 border border-white/5 rounded-3xl p-6 hover:border-indigo-500/30 transition-all group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 flex gap-2">
              {isEditor && (
                <button
                  onClick={() => onEditAuthority(auth)}
                  className="p-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-colors"
                  title="Editar"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
              {isEditor && (
                <button
                  onClick={() => onDeleteAuthority(auth.id)}
                  className="p-2 bg-zinc-800 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-white truncate">{auth.name}</h3>
                <p className="text-indigo-400 text-sm font-medium">{auth.role}</p>
                
                <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={cn(
                      "flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider",
                      auth.isSignatureActive ? "text-emerald-500" : "text-zinc-500"
                    )}>
                      <div className={cn(
                        "w-1 h-1 rounded-full",
                        auth.isSignatureActive ? "bg-emerald-500 animate-pulse" : "bg-zinc-600"
                      )} />
                      {auth.isSignatureActive ? 'Firma Activa' : 'Firma Inactiva'}
                    </div>
                    {isEditor && (
                      <label className={cn(
                        "relative inline-flex items-center",
                        auth.signatureUrl ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                      )}>
                        <input 
                          type="checkbox" 
                          checked={auth.isSignatureActive}
                          onChange={(e) => auth.signatureUrl && onToggleSignature(auth.id, e.target.checked)}
                          disabled={!auth.signatureUrl}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    )}
                  </div>

                  {!auth.signatureUrl && (
                    <div className="flex items-center gap-2 p-2 bg-red-500/5 border border-red-500/10 rounded-xl text-[10px] text-red-400 font-bold uppercase tracking-wider">
                      <Award className="w-3 h-3 opacity-50" />
                      Firma Digital No Registrada
                    </div>
                  )}

                  {auth.organization && (
                    <div className="flex items-center gap-1.5 text-zinc-500 text-xs">
                      <Building2 className="w-3 h-3" />
                      <span className="truncate">{auth.organization}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {authorities.length === 0 && (
        <div className="text-center py-20 bg-zinc-900/50 border border-dashed border-white/10 rounded-3xl">
          <Award className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-500 font-medium">No hay autoridades registradas.</p>
          <button
            onClick={onAddAuthority}
            className="mt-4 text-indigo-400 hover:text-indigo-300 font-bold text-sm"
          >
            Registrar la primera autoridad
          </button>
        </div>
      )}
    </div>
  );
}

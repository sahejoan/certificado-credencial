import React from 'react';
import { Calendar, Users, Award, Layout as LayoutIcon, Plus, ChevronLeft, LogOut, Shield } from 'lucide-react';
import { cn } from '../lib/utils';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'events' | 'participants' | 'design' | 'authorities' | 'users';
  setActiveTab: (tab: 'events' | 'participants' | 'design' | 'authorities' | 'users') => void;
  user: User | null;
  onLogout: () => void;
}

export default function Layout({ children, activeTab, setActiveTab, user, onLogout }: LayoutProps) {
  const navItems = [
    { id: 'events', label: 'Eventos', icon: Calendar },
    { id: 'participants', label: 'Participantes', icon: Users },
    { id: 'authorities', label: 'Autoridades', icon: Award },
    { id: 'design', label: 'Diseñador', icon: LayoutIcon },
  ];

  if (user?.role === 'admin') {
    navItems.push({ id: 'users', label: 'Usuarios', icon: Shield });
  }

  return (
    <div className="h-screen bg-zinc-950 flex text-zinc-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-zinc-900 border-r border-white/5 flex flex-col">
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-2 text-indigo-400">
            <Award className="w-8 h-8" />
            <span className="font-bold text-xl tracking-tight text-white">CertiEvent</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto no-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                activeTab === item.id
                  ? "bg-indigo-500/10 text-indigo-400 font-medium"
                  : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className="bg-black p-4 rounded-2xl border border-white/5 shadow-2xl">
            <p className="text-xs font-medium uppercase tracking-wider mb-1 text-zinc-900">Plan Premium</p>
            <p className="font-bold text-zinc-900">Eventos Ilimitados</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <header className="h-16 bg-zinc-900 border-b border-white/5 px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {activeTab !== 'events' && (
              <button
                onClick={() => setActiveTab('events')}
                className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors group"
              >
                <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                <span className="text-sm font-medium">Eventos</span>
              </button>
            )}
            <h1 className="text-xl font-semibold text-white">
              {navItems.find(i => i.id === activeTab)?.label}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 px-3 py-1.5 bg-zinc-800 rounded-full border border-white/5">
              <div className="flex flex-col items-end">
                <span className="text-xs font-bold text-white leading-none">{user?.displayName || user?.email}</span>
                <span className="text-[10px] font-medium text-indigo-400 uppercase tracking-wider mt-1 flex items-center gap-1">
                  <Shield className="w-2.5 h-2.5" />
                  {user?.role}
                </span>
              </div>
              {user?.photoURL ? (
                <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 rounded-full border border-white/10" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold border border-indigo-500/30 text-xs">
                  {user?.email?.[0].toUpperCase()}
                </div>
              )}
              <button
                onClick={onLogout}
                className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8 no-scrollbar">
          {children}
        </div>
      </main>
    </div>
  );
}

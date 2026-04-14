import React, { useState } from 'react';
import { Calendar, Users, Award, Layout as LayoutIcon, Plus, ChevronLeft, LogOut, Shield, BarChart3, LayoutDashboard, QrCode, Menu, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'dashboard' | 'events' | 'participants' | 'design' | 'authorities' | 'users' | 'reports';
  setActiveTab: (tab: 'dashboard' | 'events' | 'participants' | 'design' | 'authorities' | 'users' | 'reports') => void;
  user: User | null;
  onLogout: () => void;
  onOpenQRScanner?: () => void;
}

export default function Layout({ children, activeTab, setActiveTab, user, onLogout, onOpenQRScanner }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Monitor', icon: LayoutDashboard },
    { id: 'events', label: 'Eventos', icon: Calendar },
    { id: 'participants', label: 'Participantes', icon: Users },
    { id: 'authorities', label: 'Autoridades', icon: Award },
    { id: 'design', label: 'Diseñador', icon: LayoutIcon },
    { id: 'reports', label: 'Reportes', icon: BarChart3 },
  ];

  if (user?.role === 'admin') {
    navItems.push({ id: 'users', label: 'Usuarios', icon: Shield });
  }

  const handleTabChange = (tab: any) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="h-screen bg-zinc-950 flex text-zinc-100 overflow-hidden relative">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 w-64 bg-zinc-900 border-r border-white/5 flex flex-col z-50 transition-transform duration-300 lg:relative lg:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-400">
            <Award className="w-8 h-8" />
            <span className="font-bold text-xl tracking-tight text-white">AmadeusEvent</span>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 hover:bg-white/5 rounded-xl lg:hidden text-zinc-500"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto no-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
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
            <p className="text-xs font-medium uppercase tracking-wider mb-1 text-zinc-400">Plan Premium</p>
            <p className="font-bold text-white">Eventos Ilimitados</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-zinc-900 border-b border-white/5 px-4 lg:px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 hover:bg-white/5 rounded-xl lg:hidden text-zinc-400"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden lg:flex items-center gap-4">
              {activeTab !== 'events' && (
                <button
                  onClick={() => setActiveTab('events')}
                  className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors group"
                >
                  <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                  <span className="text-sm font-medium">Eventos</span>
                </button>
              )}
            </div>
            <h1 className="text-lg lg:text-xl font-semibold text-white truncate">
              {navItems.find(i => i.id === activeTab)?.label}
            </h1>
          </div>
          <div className="flex items-center gap-2 lg:gap-4">
            {onOpenQRScanner && (
              <button
                onClick={onOpenQRScanner}
                className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs lg:text-sm font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
              >
                <QrCode className="w-4 h-4" />
                <span className="hidden md:inline">Check-in QR</span>
              </button>
            )}
            <div className="flex items-center gap-2 lg:gap-3 px-2 lg:px-3 py-1.5 bg-zinc-800 rounded-full border border-white/5">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-[10px] lg:text-xs font-bold text-white leading-none truncate max-w-[100px]">{user?.displayName || user?.email}</span>
                <span className="text-[8px] lg:text-[10px] font-medium text-indigo-400 uppercase tracking-wider mt-1 flex items-center gap-1">
                  <Shield className="w-2 h-2 lg:w-2.5 h-2.5" />
                  {user?.role}
                </span>
              </div>
              {user?.photoURL ? (
                <img src={user.photoURL} alt={user.displayName} className="w-6 h-6 lg:w-8 h-8 rounded-full border border-white/10" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-6 h-6 lg:w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold border border-indigo-500/30 text-[10px] lg:text-xs">
                  {user?.email?.[0].toUpperCase()}
                </div>
              )}
              <button
                onClick={onLogout}
                className="p-1 lg:p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
                title="Cerrar Sesión"
              >
                <LogOut className="w-3.5 h-3.5 lg:w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 lg:p-8 no-scrollbar">
          {children}
        </div>
      </main>
    </div>
  );
}

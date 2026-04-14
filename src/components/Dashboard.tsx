import React, { useMemo, useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Calendar, 
  TrendingUp, 
  BarChart as BarChartIcon,
  Filter,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Activity
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  Legend,
} from 'recharts';
import { Participant, Event, Role } from '../types';
import { ROLES } from '../constants';
import { format, isSameDay, subDays, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';

interface DashboardProps {
  participants: Participant[];
  events: Event[];
}

const ROLE_COLORS: Record<Role, string> = {
  asistente: '#3b82f6', // blue-500
  comision_cultura: '#f43f5e', // rose-500
  comision_decoracion: '#f59e0b', // amber-500
  comision_logistica: '#10b981', // emerald-500
  comision_protocolo: '#6366f1', // indigo-500
  comision_tecnologia: '#06b6d4', // cyan-500
  ponente: '#a855f7', // purple-500
};

export default function Dashboard({ participants, events }: DashboardProps) {
  const [selectedEventId, setSelectedEventId] = useState<string>('all');

  const filteredParticipants = useMemo(() => {
    if (selectedEventId === 'all') return participants;
    return participants.filter(p => p.eventId === selectedEventId);
  }, [participants, selectedEventId]);

  const stats = useMemo(() => {
    const total = filteredParticipants.length;
    const attended = filteredParticipants.filter(p => p.attended).length;
    const attendanceRate = total > 0 ? (attended / total) * 100 : 0;
    const totalEvents = events.length;

    // Option C: Registered vs Attended by Role
    const roleComparisonData = ROLES.map(role => {
      const normalize = (str: string) => 
        str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
      
      const roleIdNorm = normalize(role.id);
      const roleLabelNorm = normalize(role.label);

      const roleParticipants = filteredParticipants.filter(p => {
        if (!p.role) return false;
        const pRoleNorm = normalize(p.role);
        return pRoleNorm === roleIdNorm || pRoleNorm === roleLabelNorm;
      });
      const registered = roleParticipants.length;
      const attended = roleParticipants.filter(p => p.attended).length;
      return {
        name: role.label,
        registered,
        attended,
        color: ROLE_COLORS[role.id] || '#71717a'
      };
    });

    // Registrations over last 7 days
    const last7Days = eachDayOfInterval({
      start: subDays(new Date(), 6),
      end: new Date()
    });

    const registrationData = last7Days.map(day => {
      const count = filteredParticipants.filter(p => {
        const regDate = p.registrationDate || p.createdAt;
        return regDate && isSameDay(new Date(regDate), day);
      }).length;
      return {
        date: format(day, 'dd MMM', { locale: es }),
        count
      };
    });

    // Recent activity (last 5 registrations)
    const recentActivity = [...filteredParticipants]
      .sort((a, b) => (b.registrationDate || 0) - (a.registrationDate || 0))
      .slice(0, 5);

    return {
      total,
      attended,
      attendanceRate,
      totalEvents,
      roleComparisonData,
      registrationData,
      recentActivity
    };
  }, [filteredParticipants, events, selectedEventId]);

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <div className="p-6 bg-zinc-900 rounded-full border border-white/5">
          <BarChartIcon className="w-12 h-12 text-zinc-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">No hay datos suficientes</h3>
          <p className="text-zinc-400 max-w-md mx-auto mt-2">
            Crea tu primer evento y registra participantes para comenzar a ver estadísticas en tiempo real.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header with Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/30 p-6 rounded-3xl border border-white/5 backdrop-blur-sm">
        <div>
          <h2 className="text-2xl font-bold text-white">Análisis de Datos</h2>
          <p className="text-zinc-400 text-sm">Visualiza el rendimiento y participación de tus eventos</p>
        </div>
        <div className="flex items-center gap-3 bg-zinc-800/50 p-1.5 rounded-2xl border border-white/5">
          <div className="pl-3 pr-1">
            <Filter className="w-4 h-4 text-zinc-500" />
          </div>
          <select 
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="bg-transparent text-sm font-medium text-white border-none focus:ring-0 cursor-pointer pr-8"
          >
            <option value="all" className="bg-zinc-900">Todos los Eventos</option>
            {events.map(event => (
              <option key={event.id} value={event.id} className="bg-zinc-900">{event.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Registrados" 
          value={stats.total} 
          icon={Users} 
          color="bg-indigo-500/10 text-indigo-400"
          trend={selectedEventId === 'all' ? "Global" : "En este evento"}
        />
        <StatCard 
          title="Asistencia Real" 
          value={stats.attended} 
          icon={CheckCircle2} 
          color="bg-emerald-500/10 text-emerald-400"
          trend={`${stats.attendanceRate.toFixed(1)}% de efectividad`}
        />
        <StatCard 
          title="Pendientes" 
          value={stats.total - stats.attended} 
          icon={Clock} 
          color="bg-amber-500/10 text-amber-400"
          trend="Por confirmar"
        />
        <StatCard 
          title="Nuevos Hoy" 
          value={stats.registrationData[stats.registrationData.length - 1].count} 
          icon={UserPlus} 
          color="bg-pink-500/10 text-pink-400"
          trend="Registros"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Option C: Comparison Chart */}
        <div className="lg:col-span-2 bg-zinc-900/50 border border-white/5 rounded-3xl p-8 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-white">Inscritos vs. Asistencias</h3>
              <p className="text-sm text-zinc-400">Desglose por comisión y rol</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-zinc-700"></div>
                <span className="text-xs text-zinc-400">Inscritos</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-indigo-500 via-rose-500 to-emerald-500"></div>
                <span className="text-xs text-zinc-400">Asistencias</span>
              </div>
            </div>
          </div>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.roleComparisonData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#71717a" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis 
                  stroke="#71717a" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <Tooltip 
                  cursor={{ fill: '#ffffff05' }}
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="registered" name="Inscritos" fill="#3f3f46" radius={[4, 4, 0, 0]} />
                <Bar dataKey="attended" name="Asistencias" radius={[4, 4, 0, 0]}>
                  {stats.roleComparisonData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-8 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-white">Actividad Reciente</h3>
              <p className="text-sm text-zinc-400">Últimos registros</p>
            </div>
            <Activity className="w-6 h-6 text-indigo-400" />
          </div>
          <div className="space-y-6">
            {stats.recentActivity.length > 0 ? stats.recentActivity.map((p) => (
              <div key={p.id} className="flex items-center gap-4 group">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border border-white/5",
                  p.attended ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800 text-zinc-400"
                )}>
                  {p.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate group-hover:text-indigo-400 transition-colors">
                    {p.name}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">
                    {ROLES.find(r => r.id === p.role)?.label}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-medium text-zinc-500">
                    {p.registrationDate ? format(new Date(p.registrationDate), 'HH:mm') : '--:--'}
                  </p>
                  {p.attended && (
                    <span className="text-[8px] font-bold uppercase tracking-tighter text-emerald-500">Presente</span>
                  )}
                </div>
              </div>
            )) : (
              <div className="text-center py-12">
                <p className="text-sm text-zinc-500">Sin actividad reciente</p>
              </div>
            )}
          </div>
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('changeTab', { detail: 'participants' }))}
            className="w-full mt-8 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-colors flex items-center justify-center gap-2"
          >
            Ver todos los participantes
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Registration Trend */}
        <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-8 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-white">Ritmo de Inscripción</h3>
              <p className="text-sm text-zinc-400">Registros por día (última semana)</p>
            </div>
            <TrendingUp className="w-6 h-6 text-indigo-400" />
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.registrationData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#71717a" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#71717a" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#6366f1" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorCount)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Insights */}
        <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-8 backdrop-blur-xl flex flex-col justify-center">
          <div className="space-y-8">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-3xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Sparkles className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-white">Insight del Evento</h4>
                <p className="text-zinc-400 text-sm mt-1">
                  {selectedEventId === 'all' 
                    ? "Analizando el rendimiento global de todos tus eventos activos."
                    : `Analizando datos específicos para: ${events.find(e => e.id === selectedEventId)?.name}`}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Tasa de Éxito</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.attendanceRate.toFixed(1)}%</p>
                <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div 
                    className="bg-indigo-500 h-full transition-all duration-1000" 
                    style={{ width: `${stats.attendanceRate}%` }}
                  ></div>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Compromiso</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {stats.total > 0 ? (stats.attended / stats.total > 0.7 ? 'Alto' : 'Medio') : 'N/A'}
                </p>
                <p className="text-[10px] text-zinc-500 mt-3">Basado en asistencia real</p>
              </div>
            </div>

            <p className="text-sm text-zinc-500 italic">
              "La comisión con mayor participación actualmente es {
                [...stats.roleComparisonData].sort((a, b) => b.attended - a.attended)[0]?.name || 'ninguna'
              }."
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Attendance by Event */}
        <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-8 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-white">Rendimiento por Evento</h3>
              <p className="text-sm text-zinc-400">Comparativa de asistencia entre tus eventos principales</p>
            </div>
            <BarChartIcon className="w-6 h-6 text-indigo-400" />
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={events.map(event => {
                  const eventParticipants = participants.filter(p => p.eventId === event.id);
                  const total = eventParticipants.length;
                  const attended = eventParticipants.filter(p => p.attended).length;
                  return {
                    name: event.name.length > 20 ? event.name.substring(0, 20) + '...' : event.name,
                    inscritos: total,
                    asistencias: attended
                  };
                }).sort((a, b) => b.inscritos - a.inscritos).slice(0, 6)}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#71717a" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#71717a" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend />
                <Bar dataKey="inscritos" name="Inscritos" fill="#3f3f46" radius={[4, 4, 0, 0]} />
                <Bar dataKey="asistencias" name="Asistencias" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, trend }: { 
  title: string; 
  value: number | string; 
  icon: any; 
  color: string;
  trend?: string;
}) {
  return (
    <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6 backdrop-blur-xl hover:border-white/10 transition-colors group">
      <div className="flex items-start justify-between">
        <div className={cn("p-3 rounded-2xl transition-transform group-hover:scale-110 duration-300", color)}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 bg-zinc-800 px-2 py-1 rounded-full">
            {trend}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-sm font-medium text-zinc-400">{title}</p>
        <h4 className="text-3xl font-bold text-white mt-1">{value}</h4>
      </div>
    </div>
  );
}

function Sparkles(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}

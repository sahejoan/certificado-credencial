import { Role } from './types';

export const ROLES: { id: Role; label: string; color: string }[] = [
  { id: 'asistente', label: 'Asistente', color: 'bg-blue-500/30 text-blue-200 border-blue-400/40' },
  { id: 'comision_cultura', label: 'Comisión de Cultura', color: 'bg-rose-500/30 text-rose-200 border-rose-400/40' },
  { id: 'comision_decoracion', label: 'Comisión de Decoración', color: 'bg-amber-500/30 text-amber-200 border-amber-400/40' },
  { id: 'comision_logistica', label: 'Comisión de Logística', color: 'bg-emerald-500/30 text-emerald-200 border-emerald-400/40' },
  { id: 'comision_protocolo', label: 'Comisión de Protocolo', color: 'bg-indigo-500/30 text-indigo-200 border-indigo-400/40' },
  { id: 'comision_tecnologia', label: 'Comisión de Tecnología', color: 'bg-cyan-500/30 text-cyan-200 border-cyan-400/40' },
  { id: 'ponente', label: 'Ponente', color: 'bg-purple-500/30 text-purple-200 border-purple-400/40' },
];

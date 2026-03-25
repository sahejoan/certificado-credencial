import React, { useState } from 'react';
import { Search, Filter, UserPlus, Download, Award, FileText, CheckCircle2, XCircle, Trash2, Mail, Printer, Users, Edit2 } from 'lucide-react';
import { Participant, Role, Event, User } from '../types';
import { cn, formatDate } from '../lib/utils';
import { toast } from 'react-hot-toast';

interface ParticipantListProps {
  participants: Participant[];
  event: Event;
  onAddParticipant: () => void;
  onGenerateCertificate: (participant: Participant) => void;
  onGenerateCredential: (participant: Participant) => void;
  onToggleAttendance: (id: string) => void;
  onResetAttendance: () => void;
  onDeleteParticipant: (id: string) => void;
  onEditParticipant: (participant: Participant) => void;
  onBulkPrintCertificates: () => void;
  onBulkPrintCredentials: () => void;
  user: User | null;
}

const ROLES: { id: Role; label: string; color: string }[] = [
  { id: 'asistente', label: 'Asistente', color: 'bg-blue-100 text-blue-700' },
  { id: 'docente', label: 'Docente', color: 'bg-amber-100 text-amber-700' },
  { id: 'estudiante', label: 'Estudiante', color: 'bg-green-100 text-green-700' },
  { id: 'logistica', label: 'Logística', color: 'bg-neutral-100 text-neutral-700' },
  { id: 'organizador', label: 'Organizador', color: 'bg-rose-100 text-rose-700' },
  { id: 'ponente', label: 'Ponente', color: 'bg-purple-100 text-purple-700' },
  { id: 'protocolo', label: 'Protocolo', color: 'bg-indigo-100 text-indigo-700' },
  { id: 'tecnico_informatico', label: 'Técnico Informático', color: 'bg-cyan-100 text-cyan-700' },
];

export default function ParticipantList({ 
  participants, 
  event, 
  onAddParticipant, 
  onGenerateCertificate, 
  onGenerateCredential,
  onToggleAttendance,
  onResetAttendance,
  onDeleteParticipant,
  onEditParticipant,
  onBulkPrintCertificates,
  onBulkPrintCredentials,
  user
}: ParticipantListProps) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all');

  const isEditor = user?.role === 'admin' || user?.role === 'editor';
  const isAdmin = user?.role === 'admin';

  const filteredParticipants = participants.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                         p.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || p.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const isEventStarted = new Date().toISOString().split('T')[0] >= event.date;

  const attendedParticipants = participants.filter(p => p.attended);
  const totalParticipants = participants.length;

  const handleBulkCertificates = (method: 'print' | 'email') => {
    if (!isEventStarted) {
      toast.error(`Los certificados estarán disponibles el ${formatDate(event.date)}`);
      return;
    }
    if (attendedParticipants.length === 0) {
      toast.error('No hay participantes con asistencia confirmada para generar certificados.');
      return;
    }
    
    if (method === 'print') {
      onBulkPrintCertificates();
    } else {
      toast.success(`Enviando certificados por correo a ${attendedParticipants.length} participantes...`);
    }
  };

  const handleBulkCredentials = (method: 'print' | 'email') => {
    if (totalParticipants === 0) {
      toast.error('No hay participantes registrados para generar credenciales.');
      return;
    }
    
    if (method === 'print') {
      onBulkPrintCredentials();
    } else {
      toast.success(`Enviando credenciales por correo a ${totalParticipants} participantes...`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">{event.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-zinc-400">Gestión de participantes y emisión de documentos.</p>
            {!isEventStarted && (
              <span className="bg-amber-500/10 text-amber-500 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/20 uppercase tracking-tight">
                Certificados disponibles el {formatDate(event.date)}
              </span>
            )}
          </div>
        </div>
        {isEditor && (
          <button
            onClick={onAddParticipant}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-900/20"
          >
            <UserPlus className="w-4 h-4" />
            Registrar Participante
          </button>
        )}
      </div>

      <div className="bg-zinc-900 border border-white/5 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-white/5 bg-white/5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-500/20">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Acciones Masivas</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {attendedParticipants.length} de {totalParticipants} asistentes confirmados
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center bg-zinc-800 border border-white/5 rounded-xl p-1 shadow-sm">
                <span className="px-3 text-xs font-bold text-zinc-500 uppercase border-r border-white/5 mr-1">Certificados</span>
                <button 
                  onClick={() => handleBulkCertificates('print')}
                  disabled={!isEventStarted}
                  className={cn(
                    "p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium",
                    isEventStarted 
                      ? "hover:bg-indigo-500/20 text-indigo-400" 
                      : "text-zinc-700 cursor-not-allowed"
                  )}
                  title={!isEventStarted ? `Disponible el ${formatDate(event.date)}` : "Imprimir todos los certificados (Solo asistentes)"}
                >
                  <Printer className="w-4 h-4" />
                  <span className="hidden sm:inline">Imprimir</span>
                </button>
                <button 
                  onClick={() => handleBulkCertificates('email')}
                  disabled={!isEventStarted}
                  className={cn(
                    "p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium",
                    isEventStarted 
                      ? "hover:bg-indigo-500/20 text-indigo-400" 
                      : "text-zinc-700 cursor-not-allowed"
                  )}
                  title={!isEventStarted ? `Disponible el ${formatDate(event.date)}` : "Enviar todos por Email (Solo asistentes)"}
                >
                  <Mail className="w-4 h-4" />
                  <span className="hidden sm:inline">Enviar</span>
                </button>
              </div>

              <div className="flex items-center bg-zinc-800 border border-white/5 rounded-xl p-1 shadow-sm">
                <span className="px-3 text-xs font-bold text-zinc-500 uppercase border-r border-white/5 mr-1">Credenciales</span>
                <button 
                  onClick={() => handleBulkCredentials('print')}
                  className="p-2 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                  title="Imprimir todas las credenciales"
                >
                  <Printer className="w-4 h-4" />
                  <span className="hidden sm:inline">Imprimir</span>
                </button>
                <button 
                  onClick={() => handleBulkCredentials('email')}
                  className="p-2 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                  title="Enviar todas por Email"
                >
                  <Mail className="w-4 h-4" />
                  <span className="hidden sm:inline">Enviar</span>
                </button>
              </div>

              {isEditor && (
                <button
                  onClick={onResetAttendance}
                  className="p-3 bg-zinc-800 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 rounded-xl border border-white/5 transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
                  title="Resetear asistencia de todos"
                >
                  <XCircle className="w-4 h-4" />
                  Resetear Asistencia
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-b border-white/5 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-zinc-800 border border-white/5 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-500" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="text-sm bg-zinc-800 border border-white/5 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-white"
            >
              <option value="all">Todos los roles</option>
              {ROLES.map(role => (
                <option key={role.id} value={role.id}>{role.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                <th className="px-6 py-4">Participante</th>
                <th className="px-6 py-4">Rol</th>
                <th className="px-6 py-4">Registro</th>
                <th className="px-6 py-4 text-center">Asistencia</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredParticipants.map((participant) => (
                <tr key={participant.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 font-bold border border-white/5">
                        {participant.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{participant.name}</p>
                        <div className="flex flex-col">
                          <p className="text-xs text-zinc-500">{participant.email}</p>
                          <p className="text-[10px] text-indigo-400/70 font-mono mt-0.5">{participant.idNumber}</p>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      ROLES.find(r => r.id === participant.role)?.color.replace('text-', 'text-').replace('bg-', 'bg-opacity-20 bg-')
                    )}>
                      {ROLES.find(r => r.id === participant.role)?.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-500">
                    {formatDate(participant.registrationDate)}
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => onToggleAttendance(participant.id)}
                      disabled={!isEditor}
                      className={cn(
                        "flex items-center justify-center w-full group",
                        !isEditor && "cursor-not-allowed opacity-50"
                      )}
                    >
                      {participant.attended ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-500 group-hover:scale-110 transition-transform" />
                      ) : (
                        <XCircle className="w-6 h-6 text-zinc-700 group-hover:text-zinc-600 transition-colors" />
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onGenerateCertificate(participant)}
                        disabled={!participant.attended || !isEventStarted}
                        className={cn(
                          "p-2 rounded-lg transition-all",
                          (participant.attended && isEventStarted)
                            ? "text-indigo-400 hover:bg-indigo-500/10" 
                            : "text-zinc-700 cursor-not-allowed"
                        )}
                        title={!isEventStarted ? `Disponible el ${formatDate(event.date)}` : "Generar Certificado"}
                      >
                        <Award className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => toast.success(`Enviando certificado a ${participant.email}...`)}
                        disabled={!participant.attended || !isEventStarted}
                        className={cn(
                          "p-2 rounded-lg transition-all",
                          (participant.attended && isEventStarted)
                            ? "text-indigo-400 hover:bg-indigo-500/10" 
                            : "text-zinc-700 cursor-not-allowed"
                        )}
                        title={!isEventStarted ? `Disponible el ${formatDate(event.date)}` : "Enviar Certificado por Email"}
                      >
                        <Mail className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => onGenerateCredential(participant)}
                        className="p-2 text-zinc-400 hover:bg-zinc-800 rounded-lg transition-all"
                        title="Generar Credencial"
                      >
                        <FileText className="w-5 h-5" />
                      </button>
                      {isEditor && (
                        <>
                          <button
                            onClick={() => onEditParticipant(participant)}
                            className="p-2 text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all"
                            title="Editar Participante"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => onDeleteParticipant(participant.id)}
                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                            title="Eliminar Participante"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredParticipants.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-zinc-500 italic">No se encontraron participantes.</p>
          </div>
        )}
      </div>
    </div>
  );
}

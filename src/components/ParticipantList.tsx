import React, { useState, useMemo } from 'react';
import { Search, Filter, UserPlus, Download, Award, FileText, CheckCircle2, XCircle, Trash2, Mail, Printer, Users, Edit2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Participant, Role, Event, User } from '../types';
import { cn, formatDate } from '../lib/utils';
import { toast } from 'react-hot-toast';

interface ParticipantListProps {
  participants: Participant[];
  events: Event[];
  selectedEventId: string | 'all';
  onSelectEventId: (id: string | 'all') => void;
  onAddParticipant: () => void;
  onGenerateCertificate: (participant: Participant) => void;
  onGenerateCredential: (participant: Participant) => void;
  onToggleAttendance: (id: string) => void;
  onResetAttendance: () => void;
  onDeleteParticipant: (id: string) => void;
  onEditParticipant: (participant: Participant) => void;
  onBulkPrintCertificates: () => void;
  onBulkPrintCredentials: () => void;
  onSendEmail: (participant: Participant) => void;
  user: User | null;
}

const ROLES: { id: Role; label: string; color: string }[] = [
  { id: 'asistente', label: 'Asistente', color: 'bg-blue-100 text-blue-700' },
  { id: 'logistica', label: 'Logística', color: 'bg-neutral-100 text-neutral-700' },
  { id: 'ponente', label: 'Ponente', color: 'bg-purple-100 text-purple-700' },
  { id: 'protocolo', label: 'Protocolo', color: 'bg-indigo-100 text-indigo-700' },
  { id: 'tecnico_informatico', label: 'Técnico Informática', color: 'bg-cyan-100 text-cyan-700' },
];

export default function ParticipantList({ 
  participants, 
  events,
  selectedEventId,
  onSelectEventId,
  onAddParticipant, 
  onGenerateCertificate, 
  onGenerateCredential,
  onToggleAttendance,
  onResetAttendance,
  onDeleteParticipant,
  onEditParticipant,
  onBulkPrintCertificates,
  onBulkPrintCredentials,
  onSendEmail,
  user
}: ParticipantListProps) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(20);

  const isEditor = user?.role === 'admin' || user?.role === 'editor';
  const isAdmin = user?.role === 'admin';

  const selectedEvent = events.find(e => e.id === selectedEventId);

  const filteredParticipants = useMemo(() => {
    return participants.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                           p.email.toLowerCase().includes(search.toLowerCase()) ||
                           p.idNumber.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === 'all' || p.role === roleFilter;
      const matchesEvent = selectedEventId === 'all' || p.eventId === selectedEventId;
      return matchesSearch && matchesRole && matchesEvent;
    });
  }, [participants, search, roleFilter, selectedEventId]);

  const totalParticipants = filteredParticipants.length;
  const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil(totalParticipants / itemsPerPage);

  const paginatedParticipants = useMemo(() => {
    if (itemsPerPage === 'all') return filteredParticipants;
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredParticipants.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredParticipants, currentPage, itemsPerPage]);

  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter, selectedEventId, itemsPerPage]);

  const isEventStarted = selectedEvent ? new Date().toISOString().split('T')[0] >= selectedEvent.date : false;

  const attendedParticipants = filteredParticipants.filter(p => p.attended);

  const handleBulkCertificates = (method: 'print' | 'email') => {
    if (selectedEventId === 'all') {
      toast.error('Por favor selecciona un evento específico para generar certificados masivos.');
      return;
    }
    
    const targetParticipants = isEditor ? filteredParticipants : attendedParticipants;
    
    if (!isEditor && !isEventStarted) {
      toast.error(`Los certificados estarán disponibles el ${formatDate(selectedEvent?.date || '')}`);
      return;
    }
    
    if (targetParticipants.length === 0) {
      toast.error(isEditor ? 'No hay participantes registrados para generar certificados.' : 'No hay participantes con asistencia confirmada para generar certificados.');
      return;
    }
    
    if (method === 'print') {
      onBulkPrintCertificates();
    } else {
      toast.success(`Enviando certificados por correo a ${targetParticipants.length} participantes...`);
    }
  };

  const handleBulkCredentials = (method: 'print' | 'email') => {
    if (selectedEventId === 'all') {
      toast.error('Por favor selecciona un evento específico para generar credenciales masivas.');
      return;
    }
    
    const targetParticipants = isEditor ? filteredParticipants : attendedParticipants;
    
    if (targetParticipants.length === 0) {
      toast.error(isEditor ? 'No hay participantes registrados para generar credenciales.' : 'No hay participantes con asistencia confirmada para generar credenciales.');
      return;
    }
    
    if (method === 'print') {
      onBulkPrintCredentials();
    } else {
      toast.success(`Enviando credenciales por correo a ${targetParticipants.length} participantes...`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <h2 className="text-2xl font-bold text-white leading-tight">
              {selectedEventId === 'all' ? 'Listado General de Participantes' : selectedEvent?.name}
            </h2>
            <select
              value={selectedEventId}
              onChange={(e) => onSelectEventId(e.target.value)}
              className="bg-zinc-800 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            >
              <option value="all">Todos los Eventos</option>
              {events.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-zinc-400">Gestión de participantes y emisión de documentos.</p>
            {selectedEvent && !isEventStarted && (
              <span className="bg-amber-500/10 text-amber-500 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/20 uppercase tracking-tight">
                Certificados disponibles el {formatDate(selectedEvent.date)}
              </span>
            )}
          </div>
        </div>
        {isEditor && (
          <button
            onClick={onAddParticipant}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-900/20 mt-1"
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
                  title={!isEventStarted ? `Disponible el ${formatDate(selectedEvent?.date || '')}` : "Imprimir todos los certificados (Solo asistentes)"}
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
                  title={!isEventStarted ? `Disponible el ${formatDate(selectedEvent?.date || '')}` : "Enviar todos por Email (Solo asistentes)"}
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
              placeholder="Buscar por nombre, email o cédula..."
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
              {paginatedParticipants.map((participant) => (
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
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap",
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
                        title={!isEventStarted ? `Disponible el ${formatDate(selectedEvent?.date || '')}` : "Generar Certificado"}
                      >
                        <Award className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => onSendEmail(participant)}
                        disabled={!participant.attended || !isEventStarted}
                        className={cn(
                          "p-2 rounded-lg transition-all",
                          (participant.attended && isEventStarted)
                            ? "text-indigo-400 hover:bg-indigo-500/10" 
                            : "text-zinc-700 cursor-not-allowed"
                        )}
                        title={!isEventStarted ? `Disponible el ${formatDate(selectedEvent?.date || '')}` : "Enviar Certificado por Email"}
                      >
                        <Mail className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => onGenerateCredential(participant)}
                        disabled={!participant.attended && !isEditor}
                        className={cn(
                          "p-2 rounded-lg transition-all",
                          (participant.attended || isEditor)
                            ? "text-zinc-400 hover:bg-zinc-800" 
                            : "text-zinc-700 cursor-not-allowed"
                        )}
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

        {filteredParticipants.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-zinc-500 italic">No se encontraron participantes.</p>
          </div>
        ) : (
          <div className="p-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/5">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Mostrar:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="bg-zinc-800 border border-white/5 rounded-lg px-2 py-1 text-xs text-white outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value="all">Todos</option>
                </select>
              </div>
              <p className="text-xs text-zinc-500 font-medium">
                Mostrando <span className="text-white">{paginatedParticipants.length}</span> de <span className="text-white">{totalParticipants}</span> registros
              </p>
            </div>

            {itemsPerPage !== 'all' && totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 text-zinc-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={cn(
                          "w-8 h-8 rounded-lg text-xs font-bold transition-all",
                          currentPage === pageNum
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/20"
                            : "text-zinc-500 hover:bg-white/5 hover:text-white"
                        )}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 text-zinc-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

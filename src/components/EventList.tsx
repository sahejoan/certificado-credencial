import React from 'react';
import { Plus, Calendar, MapPin, Users, Award, Trash2, Edit2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Event, Authority, User } from '../types';
import { formatDate } from '../lib/utils';

interface EventListProps {
  events: Event[];
  onAddEvent: () => void;
  onEditEvent: (event: Event) => void;
  onDeleteEvent: (id: string) => void;
  onSelectEvent: (event: Event) => void;
  onManageAuthorities: (event: Event) => void;
  onSeedData?: () => void;
  authorities: Authority[];
  user: User | null;
}

export default function EventList({ 
  events, 
  onAddEvent, 
  onEditEvent, 
  onDeleteEvent, 
  onSelectEvent,
  onManageAuthorities,
  onSeedData,
  authorities,
  user
}: EventListProps) {
  const isEditor = user?.role === 'admin' || user?.role === 'editor';
  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Mis Eventos</h2>
          <p className="text-zinc-400 mt-1">Gestiona tus eventos y sus certificados.</p>
        </div>
        {isEditor && (
          <button
            onClick={onAddEvent}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-semibold flex items-center gap-2 transition-all duration-200 shadow-lg shadow-indigo-900/20"
          >
            <Plus className="w-5 h-5" />
            Nuevo Evento
          </button>
        )}
      </div>

      {events.length === 0 ? (
        <div className="bg-zinc-900 border-2 border-dashed border-white/5 rounded-3xl p-12 text-center">
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-zinc-600" />
          </div>
          <h3 className="text-lg font-semibold text-white">No hay eventos aún</h3>
          <p className="text-zinc-400 mt-2 max-w-xs mx-auto">
            Crea tu primer evento para empezar a generar certificados y credenciales.
          </p>
          <div className="flex flex-col items-center gap-4 mt-6">
            <button
              onClick={onAddEvent}
              className="text-indigo-400 font-semibold hover:text-indigo-300"
            >
              Crear evento ahora &rarr;
            </button>
            {isAdmin && onSeedData && (
              <button
                onClick={onSeedData}
                className="text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-4"
              >
                O cargar datos de ejemplo para probar
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group bg-zinc-900 border border-white/5 rounded-3xl p-6 hover:shadow-2xl hover:shadow-black/50 transition-all duration-300 cursor-pointer"
              onClick={() => onSelectEvent(event)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                  <Award className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  {isEditor && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onEditEvent(event); }}
                      className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  {isEditor && (isAdmin || event.createdBy === user?.uid) && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteEvent(event.id); }}
                      className="p-2 hover:bg-red-500/10 rounded-xl text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <h3 className="text-xl font-bold text-white mb-2">{event.name}</h3>
              <p className="text-zinc-400 text-sm line-clamp-2 mb-6">{event.description}</p>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-zinc-400">
                  <Calendar className="w-4 h-4" />
                  {formatDate(event.date)}
                </div>
                <div className="flex items-center gap-3 text-sm text-zinc-400">
                  <MapPin className="w-4 h-4" />
                  {event.location}
                </div>
                <div className="flex items-center gap-3 text-sm text-zinc-400">
                  <Users className="w-4 h-4" />
                  Participantes registrados
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Firmantes</span>
                  <div className="flex -space-x-2">
                    {event.authorities && event.authorities.length > 0 ? (
                      event.authorities.map((authId) => {
                        const auth = authorities.find(a => a.id === authId);
                        return (
                          <div 
                            key={authId} 
                            title={auth?.name}
                            className="w-8 h-8 rounded-full border-2 border-zinc-900 bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shadow-lg"
                          >
                            {auth?.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-[10px] text-zinc-600 italic">Sin asignar</div>
                    )}
                  </div>
                </div>
                {isEditor && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onManageAuthorities(event); }}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <Award className="w-3.5 h-3.5 text-indigo-400" />
                    Gestionar Firmas
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

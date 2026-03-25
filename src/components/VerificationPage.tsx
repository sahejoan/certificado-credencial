import React from 'react';
import { CheckCircle, XCircle, Award, Calendar, User, ShieldCheck } from 'lucide-react';
import { Event, Participant } from '../types';

interface VerificationPageProps {
  participant: Participant | null;
  event: Event | null;
  onClose: () => void;
}

export default function VerificationPage({ participant, event, onClose }: VerificationPageProps) {
  const isValid = !!(participant && event);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-zinc-900 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 blur-3xl rounded-full" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/10 blur-3xl rounded-full" />

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="mb-8">
            <div className="flex items-center gap-2 text-indigo-400 mb-2 justify-center">
              <ShieldCheck className="w-6 h-6" />
              <span className="font-bold text-lg tracking-tight text-white">CertiEvent Verify</span>
            </div>
            <div className="h-px w-12 bg-indigo-500/30 mx-auto" />
          </div>

          {isValid ? (
            <>
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 border border-emerald-500/30 animate-pulse">
                <CheckCircle className="w-10 h-10 text-emerald-400" />
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-2">Documento Auténtico</h2>
              <p className="text-zinc-400 text-sm mb-8">Este certificado/credencial ha sido verificado exitosamente en nuestro sistema.</p>

              <div className="w-full space-y-4 text-left bg-black/40 p-6 rounded-3xl border border-white/5">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-zinc-800 rounded-xl">
                    <User className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Participante</p>
                    <p className="text-white font-bold">{participant.name}</p>
                    <p className="text-xs text-zinc-400">{participant.role.charAt(0).toUpperCase() + participant.role.slice(1)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-2 bg-zinc-800 rounded-xl">
                    <Award className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Evento</p>
                    <p className="text-white font-bold">{event.name}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-2 bg-zinc-800 rounded-xl">
                    <Calendar className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Fecha del Evento</p>
                    <p className="text-white font-bold">{new Date(event.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6 border border-red-500/30">
                <XCircle className="w-10 h-10 text-red-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Documento No Válido</h2>
              <p className="text-zinc-400 text-sm mb-8">No se ha podido encontrar un registro válido para este identificador. El documento podría ser falso.</p>
            </>
          )}

          <button
            onClick={onClose}
            className="mt-10 w-full py-4 bg-zinc-800 text-white rounded-2xl font-bold hover:bg-zinc-700 transition-all border border-white/5"
          >
            Ir a la Aplicación
          </button>
          
          <p className="mt-6 text-[10px] text-zinc-600 font-medium uppercase tracking-widest">
            © 2026 CertiEvent Security Systems
          </p>
        </div>
      </div>
    </div>
  );
}

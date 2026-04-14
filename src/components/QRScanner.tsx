import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { QrCode, X, CheckCircle2, AlertCircle, Camera } from 'lucide-react';
import { Participant } from '../types';
import { cn } from '../lib/utils';

interface QRScannerProps {
  onScan: (participantId: string) => Promise<void>;
  onClose: () => void;
  participants: Participant[];
}

export default function QRScanner({ onScan, onClose, participants }: QRScannerProps) {
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; participant?: Participant } | null>(null);
  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      },
      /* verbose= */ false
    );

    const onScanSuccess = async (decodedText: string) => {
      // The decoded text could be a full URL like https://.../?verify=PARTICIPANT_ID
      // or just the ID itself.
      let participantId = decodedText;
      
      try {
        if (decodedText.includes('verify=')) {
          const url = new URL(decodedText);
          participantId = url.searchParams.get('verify') || decodedText;
        }

        const participant = participants.find(p => p.id === participantId);
        
        if (!participant) {
          setScanResult({ success: false, message: 'Participante no encontrado en este sistema.' });
          return;
        }

        if (participant.attended) {
          setScanResult({ success: false, message: 'Este participante ya ha registrado su asistencia.', participant });
          return;
        }

        await onScan(participantId);
        setScanResult({ success: true, message: '¡Asistencia registrada con éxito!', participant });
        
        // Pause scanning for a moment to show success
        scanner.pause();
        setIsScanning(false);
        
        setTimeout(() => {
          setScanResult(null);
          scanner.resume();
          setIsScanning(true);
        }, 3000);

      } catch (error) {
        console.error('Error processing scan:', error);
        setScanResult({ success: false, message: 'Error al procesar el código QR.' });
      }
    };

    const onScanFailure = (error: any) => {
      // Silently ignore failures (common during scanning)
    };

    scanner.render(onScanSuccess, onScanFailure);

    return () => {
      scanner.clear().catch(error => {
        console.error("Failed to clear html5QrcodeScanner. ", error);
      });
    };
  }, [onScan, participants]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-zinc-900 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-600/20 rounded-2xl flex items-center justify-center text-indigo-400">
                <QrCode className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Check-in QR</h3>
                <p className="text-zinc-400 text-sm">Escanea la credencial del participante</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-xl text-zinc-500 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="relative aspect-square bg-black rounded-3xl overflow-hidden border border-white/5">
            <div id="reader" className="w-full h-full"></div>
            
            {/* Overlay when not scanning or showing result */}
            {scanResult && (
              <div className={cn(
                "absolute inset-0 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300",
                scanResult.success ? "bg-emerald-500/90" : "bg-red-500/90"
              )}>
                {scanResult.success ? (
                  <CheckCircle2 className="w-20 h-20 text-white mb-4" />
                ) : (
                  <AlertCircle className="w-20 h-20 text-white mb-4" />
                )}
                <h4 className="text-2xl font-black text-white mb-2">
                  {scanResult.success ? '¡ÉXITO!' : 'ERROR'}
                </h4>
                <p className="text-white font-medium mb-6">{scanResult.message}</p>
                
                {scanResult.participant && (
                  <div className="bg-black/20 p-4 rounded-2xl backdrop-blur-sm w-full">
                    <p className="text-white font-bold">{scanResult.participant.name}</p>
                    <p className="text-white/70 text-xs uppercase tracking-widest mt-1">
                      {scanResult.participant.role}
                    </p>
                  </div>
                )}
              </div>
            )}

            {isScanning && !scanResult && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-indigo-500/50 rounded-3xl">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-xl" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-xl" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-xl" />
                  
                  {/* Scanning line animation */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)] animate-scan" />
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 flex items-center gap-4 p-4 bg-zinc-800/50 rounded-2xl border border-white/5">
            <Camera className="w-5 h-5 text-zinc-500" />
            <p className="text-xs text-zinc-400">
              Asegúrate de que el código QR esté bien iluminado y centrado en el recuadro.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Text, Image as KonvaImage, Rect } from 'react-konva';
import { Download, X, ChevronLeft } from 'lucide-react';
import QRCode from 'qrcode';
import { Event, Participant, Authority } from '../types';
import { formatDate } from '../lib/utils';

interface CredentialPreviewProps {
  event: Event;
  participant: Participant;
  authorities: Authority[];
  onClose: () => void;
}

export default function CredentialPreview({ event, participant, authorities, onClose }: CredentialPreviewProps) {
  const stageRef = useRef<any>(null);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [qrImages, setQrImages] = useState<Record<string, HTMLImageElement>>({});
  const [isReady, setIsReady] = useState(false);
  const template = event.credentialTemplate;

  // Safety check for missing template
  if (!event || !template) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 max-w-md w-full text-center">
          <X className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Error de Credencial</h3>
          <p className="text-zinc-400 mb-6">Este evento no tiene una plantilla de credencial configurada correctamente.</p>
          <button onClick={onClose} className="w-full bg-white text-black py-3 rounded-xl font-bold">Cerrar</button>
        </div>
      </div>
    );
  }

  useEffect(() => {
    let isMounted = true;
    const loadAll = async () => {
      try {
        // Generate QRs
        const newQrImages: Record<string, HTMLImageElement> = {};
        if (template?.elements) {
          for (const el of template.elements) {
            if (el.type === 'qr_code') {
              try {
                const verificationUrl = `${window.location.origin}${window.location.pathname}?verify=${participant.id}`;
                const dataUrl = await QRCode.toDataURL(verificationUrl, {
                  margin: 0,
                  color: {
                    dark: el.fill || '#000000',
                    light: '#ffffff00'
                  }
                });
                const img = new window.Image();
                img.src = dataUrl;
                await new Promise(resolve => {
                  img.onload = resolve;
                  img.onerror = resolve;
                });
                newQrImages[el.id] = img;
              } catch (qrError) {
                console.error('Error generating QR code:', qrError);
              }
            }
          }
        }
        if (!isMounted) return;
        setQrImages(newQrImages);

        // Load Background
        if (template?.backgroundUrl) {
          const img = new window.Image();
          img.crossOrigin = 'Anonymous';
          img.src = template.backgroundUrl;
          await new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
          });
          if (isMounted && img.complete && img.naturalWidth > 0) {
            setBgImage(img);
          }
        }

        // Small delay to ensure everything is ready
        setTimeout(() => {
          if (isMounted) setIsReady(true);
        }, 500);
      } catch (error) {
        console.error('Error loading credential assets:', error);
        if (isMounted) setIsReady(true);
      }
    };

    setIsReady(false);
    loadAll();
    
    // Safety timeout to prevent infinite loading
    const safetyTimeout = setTimeout(() => {
      if (isMounted && !isReady) {
        console.warn('Credential loading timed out, forcing ready state');
        setIsReady(true);
      }
    }, 5000);

    return () => { 
      isMounted = false;
      clearTimeout(safetyTimeout);
    };
  }, [event.id, template?.elements, participant.id, template?.backgroundUrl]);

  const getVariableValue = (variable: string) => {
    if (variable.startsWith('auth')) {
      const match = variable.match(/^auth(\d)_(\w+)$/);
      if (match) {
        const index = parseInt(match[1]) - 1;
        const field = match[2];
        const authId = event.authorities?.[index];
        const authority = authorities.find(a => a.id === authId);
        if (authority) {
          return field === 'name' ? authority.name : authority.role;
        }
      }
      return '';
    }

    switch (variable) {
      case 'participant_name': return participant.name;
      case 'participant_id_number': {
        const id = participant.idNumber || '';
        if (!id) return '';
        if (id.includes('.') && id.includes('-')) return id;
        const clean = id.replace(/[^a-zA-Z0-9]/g, '');
        const prefix = clean.match(/^[VEve]/) ? clean[0].toUpperCase() : 'V';
        const numbers = clean.replace(/^[VEve]/, '');
        const formattedNumbers = numbers.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        return `${prefix}-${formattedNumbers}`;
      }
      case 'participant_role': return participant.role.replace(/_/g, ' ').charAt(0).toUpperCase() + participant.role.replace(/_/g, ' ').slice(1);
      case 'event_name': return event.name;
      case 'event_date': return formatDate(event.date);
      default: return '';
    }
  };

  const handleDownload = () => {
    const uri = stageRef.current.toDataURL({ pixelRatio: 2 });
    const link = document.createElement('a');
    link.download = `Credencial_${participant.name.replace(/\s+/g, '_')}.png`;
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-950/95 backdrop-blur-2xl"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {!isReady && (
        <div className="absolute inset-0 z-[70] flex flex-col items-center justify-center bg-zinc-950/95 backdrop-blur-2xl">
          <div className="max-w-md w-full px-8 flex flex-col items-center">
            <div className="relative w-32 h-32 mb-10">
              <div className="absolute inset-0 border-4 border-indigo-500/10 rounded-full scale-110 animate-pulse"></div>
              <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
              <div 
                className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"
                style={{ animationDuration: '1s' }}
              ></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl animate-pulse flex items-center justify-center">
                  <Download className="w-6 h-6 text-indigo-400" />
                </div>
              </div>
            </div>
            
            <div className="text-center space-y-6 w-full">
              <div className="space-y-2">
                <h3 className="text-3xl font-black text-white tracking-tighter">Preparando Credencial</h3>
                <p className="text-zinc-500 text-base font-medium">Estamos renderizando tu acceso exclusivo...</p>
              </div>

              <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden p-0.5 border border-white/5">
                <div className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full animate-[loading_2s_ease-in-out_infinite] shadow-[0_0_20px_rgba(99,102,241,0.5)]"></div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {isReady && (
        <div className="bg-zinc-900 border border-white/10 rounded-[40px] shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden max-w-xl w-full max-h-[95vh] flex flex-col animate-in fade-in zoom-in duration-500 ease-[0.16,1,0.3,1]" onClick={e => e.stopPropagation()}>
          <div className="px-10 py-8 border-b border-white/5 flex items-center justify-between bg-zinc-900/50 backdrop-blur-md">
            <div>
              <h3 className="text-2xl font-black text-white tracking-tighter">Tu Credencial</h3>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Lista para descargar</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-2xl hover:bg-zinc-200 transition-all shadow-xl text-sm font-black active:scale-95"
              >
                <Download className="w-4 h-4" />
                DESCARGAR
              </button>
              <button
                onClick={onClose}
                className="p-3 hover:bg-white/5 rounded-2xl text-zinc-500 hover:text-white transition-all active:scale-90"
                title="Cerrar"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="flex-1 bg-black p-8 md:p-16 overflow-y-auto flex items-center justify-center scrollbar-none relative group">
            {/* Holographic Overlay Effect */}
            <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-20 transition-opacity duration-700 z-10 bg-gradient-to-tr from-indigo-500/20 via-purple-500/20 to-emerald-500/20 mix-blend-overlay"></div>
            
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 blur-2xl rounded-[32px] opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              <div className="bg-white shadow-[0_40px_80px_rgba(0,0,0,0.4)] origin-center transition-transform duration-700 group-hover:scale-[1.02] group-hover:-rotate-1 relative z-0">
                <Stage
                  width={400}
                  height={600}
                  ref={stageRef}
                >
                  <Layer>
                    {bgImage && (
                      <KonvaImage
                        image={bgImage}
                        width={400}
                        height={600}
                      />
                    )}
                    {template.elements.map((el) => {
                      if (el.type === 'qr_code') {
                        const qrImg = qrImages[el.id];
                        return qrImg ? (
                          <KonvaImage
                            key={el.id}
                            image={qrImg}
                            x={el.x}
                            y={el.y}
                            width={el.width || 100}
                            height={el.height || 100}
                          />
                        ) : null;
                      }
                      return (
                        <Text
                          key={el.id}
                          text={el.type === 'variable' 
                            ? getVariableValue(el.content) 
                            : el.content.replace(/\{(\w+)\}/g, (match, p1) => {
                                const val = getVariableValue(p1);
                                return val !== undefined && val !== '' ? val : match;
                              })
                          }
                          x={el.x}
                          y={el.y}
                          fontSize={el.fontSize}
                          fill={el.fill}
                          fontFamily={el.fontFamily || 'Inter'}
                          fontStyle={el.fontStyle || 'normal'}
                          align={el.align || 'left'}
                          width={el.width}
                        />
                      );
                    })}
                  </Layer>
                </Stage>
              </div>
            </div>
          </div>
          
          <div className="px-10 py-6 bg-zinc-900/80 border-t border-white/5 flex items-center justify-between">
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">
              CertiEvent Digital ID System
            </p>
            <div className="flex gap-1">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-1 h-1 bg-zinc-800 rounded-full"></div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

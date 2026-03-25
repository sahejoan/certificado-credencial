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
  const template = event.credentialTemplate;

  useEffect(() => {
    const generateQRs = async () => {
      const newQrImages: Record<string, HTMLImageElement> = {};
      for (const el of template.elements) {
        if (el.type === 'qr_code') {
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
          await new Promise(resolve => img.onload = resolve);
          newQrImages[el.id] = img;
        }
      }
      setQrImages(newQrImages);
    };

    generateQRs();
  }, [template.elements, participant.id]);

  useEffect(() => {
    if (template.backgroundUrl) {
      const img = new window.Image();
      img.src = template.backgroundUrl;
      img.crossOrigin = 'Anonymous';
      img.onload = () => setBgImage(img);
    }
  }, [template.backgroundUrl]);

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
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden max-w-lg w-full flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-zinc-900">
          <div>
            <h3 className="text-xl font-bold text-white">Vista Previa de Credencial</h3>
            <p className="text-sm text-zinc-500">Credencial para {participant.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-all font-medium group"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              Volver
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-900/20 font-bold"
            >
              <Download className="w-5 h-5" />
              Descargar
            </button>
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-white/5 rounded-xl text-zinc-500 transition-colors"
              title="Cerrar"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 bg-black p-12 overflow-auto flex items-center justify-center">
          <div className="bg-white shadow-2xl origin-center">
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
        
        <div className="px-8 py-4 bg-zinc-900/50 border-t border-white/5 text-center">
          <p className="text-xs text-zinc-500">
            Esta credencial es generada automáticamente basado en el diseño configurado.
          </p>
        </div>
      </div>
    </div>
  );
}

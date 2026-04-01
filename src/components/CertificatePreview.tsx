import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Text, Image as KonvaImage, Rect } from 'react-konva';
import { Download, X, ChevronLeft, Mail, FileDown, Printer } from 'lucide-react';
import QRCode from 'qrcode';
import * as jspdf from 'jspdf';
import { Event, Participant, Template, Authority } from '../types';
import { formatDate, getAuthorityX } from '../lib/utils';

const jsPDFClass = (jspdf as any).jsPDF || (jspdf as any).default || jspdf;

interface CertificatePreviewProps {
  event: Event;
  participant: Participant;
  authorities: Authority[];
  onClose: () => void;
  onSendEmail?: (participant: Participant) => void;
}

export default function CertificatePreview({ event, participant, authorities, onClose, onSendEmail }: CertificatePreviewProps) {
  const stageRefFront = useRef<any>(null);
  const stageRefBack = useRef<any>(null);
  const [bgImageFront, setBgImageFront] = useState<HTMLImageElement | null>(null);
  const [bgImageBack, setBgImageBack] = useState<HTMLImageElement | null>(null);
  const [qrImages, setQrImages] = useState<Record<string, HTMLImageElement>>({});
  const [signatureImages, setSignatureImages] = useState<Record<string, HTMLImageElement>>({});
  const [isReady, setIsReady] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Safety check for missing template
  if (!event || !event.certificateTemplate) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 max-w-md w-full text-center">
          <X className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Error de Plantilla</h3>
          <p className="text-zinc-400 mb-6">Este evento no tiene una plantilla de certificado configurada correctamente.</p>
          <button onClick={onClose} className="w-full bg-white text-black py-3 rounded-xl font-bold">Cerrar</button>
        </div>
      </div>
    );
  }

  const hasBackSide = !!(event.certificateBackTemplate && 
    (event.certificateBackTemplate.elements?.length > 0 || !!event.certificateBackTemplate.backgroundUrl));

  useEffect(() => {
    let isMounted = true;
    const loadAll = async () => {
      try {
        const loadImg = async (url: string | undefined): Promise<HTMLImageElement | null> => {
          if (!url) return null;
          const img = new window.Image();
          if (url.startsWith('http')) {
            img.crossOrigin = 'Anonymous';
          }
          img.src = url;
          await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = () => resolve(null);
          });
          return img.complete && img.naturalWidth > 0 ? img : null;
        };

        // Load backgrounds
        const frontBg = await loadImg(event.certificateTemplate?.backgroundUrl);
        if (!isMounted) return;
        setBgImageFront(frontBg);

        if (hasBackSide) {
          const backBg = await loadImg(event.certificateBackTemplate?.backgroundUrl);
          if (!isMounted) return;
          setBgImageBack(backBg);
        }

        // Load Signatures for all templates
        const newSigImages: Record<string, HTMLImageElement> = {};
        const allTemplates = [event.certificateTemplate, event.certificateBackTemplate].filter(Boolean) as Template[];
        
        for (const t of allTemplates) {
          if (!t.elements) continue;
          for (const el of t.elements) {
            if (el.type === 'variable' && el.content?.endsWith('_signature')) {
              const match = el.content.match(/^auth(\d)_signature$/);
              if (match) {
                const index = parseInt(match[1]) - 1;
                const authId = event.authorities?.[index];
                const authority = authorities.find(a => a.id === authId);
                if (authority?.signatureUrl && authority.isSignatureActive) {
                  const img = await loadImg(authority.signatureUrl);
                  if (img) newSigImages[el.id] = img;
                }
              }
            }
          }
        }
        if (!isMounted) return;
        setSignatureImages(newSigImages);

        // Generate QRs for all templates
        const newQrImages: Record<string, HTMLImageElement> = {};
        for (const t of allTemplates) {
          if (!t.elements) continue;
          for (const el of t.elements) {
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

        // Small delay to ensure everything is ready
        setTimeout(() => {
          if (isMounted) setIsReady(true);
        }, 500);
      } catch (error) {
        console.error('Error loading certificate assets:', error);
        if (isMounted) setIsReady(true);
      }
    };

    setIsReady(false);
    loadAll();
    
    // Safety timeout to prevent infinite loading
    const safetyTimeout = setTimeout(() => {
      if (isMounted && !isReady) {
        console.warn('Certificate loading timed out, forcing ready state');
        setIsReady(true);
      }
    }, 5000);

    return () => { 
      isMounted = false;
      clearTimeout(safetyTimeout);
    };
  }, [
    event.id,
    event.certificateTemplate?.elements, 
    event.certificateTemplate?.backgroundUrl,
    event.certificateBackTemplate?.elements,
    event.certificateBackTemplate?.backgroundUrl,
    participant.id, 
    event.authorities, 
    authorities
  ]);

  const getVariableValue = (variable: string) => {
    if (variable.startsWith('auth')) {
      const match = variable.match(/^auth(\d)_(\w+)$/);
      if (match) {
        const index = parseInt(match[1]) - 1;
        const field = match[2];
        const authId = event.authorities?.[index];
        const authority = authorities.find(a => a.id === authId);
        if (authority) {
          if (field === 'signature') return ''; // Handled by image rendering
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
        // If already formatted, return as is
        if (id.includes('.') && id.includes('-')) return id;
        
        // Clean and format
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

  const handleDownload = (targetSide: 'front' | 'back') => {
    const stage = targetSide === 'front' ? stageRefFront.current : stageRefBack.current;
    if (!stage) return;
    const uri = stage.toDataURL({ pixelRatio: 2 });
    const link = document.createElement('a');
    link.download = `Certificado_${targetSide === 'front' ? 'Anverso' : 'Reverso'}_${participant.name.replace(/\s+/g, '_')}.png`;
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPDF = async () => {
    try {
      setIsGeneratingPDF(true);
      const pdf = new jsPDFClass({
        orientation: 'landscape',
        unit: 'px',
        format: [800, 565]
      });

      // Capture Front
      if (stageRefFront.current) {
        const frontUri = stageRefFront.current.toDataURL({ pixelRatio: 2 });
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, 800, 565, 'F');
        pdf.addImage(frontUri, 'PNG', 0, 0, 800, 565);
      }

      // Capture Back if exists
      if (hasBackSide && stageRefBack.current) {
        const backUri = stageRefBack.current.toDataURL({ pixelRatio: 2 });
        pdf.addPage([800, 565], 'landscape');
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, 800, 565, 'F');
        pdf.addImage(backUri, 'PNG', 0, 0, 800, 565);
      }

      pdf.save(`Certificado_${participant.name.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const renderCertificateSide = (currentTemplate: Template, bgImg: HTMLImageElement | null, ref: any, sideLabel: string) => (
    <div className="flex flex-col items-center gap-4">
      <span className="text-zinc-500 font-mono text-xs uppercase tracking-widest">{sideLabel}</span>
      <div className="bg-white shadow-2xl origin-center print:shadow-none print:m-0">
        <Stage
          width={800}
          height={565}
          ref={ref}
        >
          <Layer>
            {bgImg && (
              <KonvaImage
                image={bgImg}
                width={800}
                height={565}
              />
            )}
            {currentTemplate.elements.map((el) => {
              let x = el.x;
              let authIndex = -1;
              if (el.type === 'variable' && el.content.startsWith('auth')) {
                const match = el.content.match(/^auth(\d)_/);
                if (match) authIndex = parseInt(match[1]) - 1;
              } else if (el.id.startsWith('sig')) {
                const match = el.id.match(/^sig(\d)/);
                if (match) authIndex = parseInt(match[1]) - 1;
              }

              if (authIndex !== -1) {
                const totalAuths = event.authorities?.length || 0;
                if (authIndex >= totalAuths) return null;
                x = getAuthorityX(authIndex, totalAuths, el.width || 0, 800);
              }

              if (el.type === 'qr_code') {
                const qrImg = qrImages[el.id];
                return qrImg ? (
                  <KonvaImage
                    key={el.id}
                    image={qrImg}
                    x={x}
                    y={el.y}
                    width={el.width || 100}
                    height={el.height || 100}
                  />
                ) : null;
              }
              
              if (el.type === 'variable' && el.content.endsWith('_signature')) {
                const sigImg = signatureImages[el.id];
                return sigImg ? (
                  <KonvaImage
                    key={el.id}
                    image={sigImg}
                    x={x}
                    y={el.y}
                    width={el.width || 150}
                    height={el.height || 60}
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
                  x={x}
                  y={el.y}
                  fontSize={el.fontSize}
                  fill={el.fill}
                  fontFamily={el.fontFamily || 'Inter'}
                  fontStyle={el.fontStyle || 'normal'}
                  align={el.align || 'center'}
                  width={el.width}
                />
              );
            })}
          </Layer>
        </Stage>
      </div>
      <button
        onClick={() => handleDownload(sideLabel.toLowerCase().includes('anverso') ? 'front' : 'back')}
        className="text-zinc-400 hover:text-white flex items-center gap-2 text-sm transition-colors"
      >
        <Download className="w-4 h-4" />
        Descargar Imagen {sideLabel}
      </button>
    </div>
  );

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-xl"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {!isReady && (
        <div className="absolute inset-0 z-[70] flex flex-col items-center justify-center bg-zinc-950/95 backdrop-blur-2xl">
          <div className="max-w-md w-full px-8 flex flex-col items-center">
            <div className="relative w-24 h-24 mb-8">
              <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
              <div 
                className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"
                style={{ animationDuration: '1.5s' }}
              ></div>
            </div>
            
            <div className="text-center space-y-4 w-full">
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-white tracking-tight">Generando Certificado</h3>
                <p className="text-zinc-400 text-sm">Preparando diseño y recursos...</p>
              </div>

              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 animate-[loading_2s_ease-in-out_infinite] shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {isReady && (
        <div className="bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden max-w-5xl w-full max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
        <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-zinc-900 no-print">
          <div>
            <h3 className="text-xl font-bold text-white">Vista Previa del Certificado</h3>
            <p className="text-sm text-zinc-500">Certificado para {participant.name}</p>
          </div>
          <div className="flex items-center gap-2 no-print">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-all text-xs font-medium group"
            >
              <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              Volver
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors text-xs font-semibold border border-white/10"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/90 text-white rounded-lg hover:bg-emerald-600 transition-colors shadow-sm text-xs font-semibold disabled:opacity-50"
            >
              {isGeneratingPDF ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              PDF
            </button>
            <button
              onClick={() => handleDownload('front')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/90 text-white rounded-lg hover:bg-indigo-600 transition-colors shadow-sm text-xs font-semibold"
            >
              <Download className="w-4 h-4" />
              PNG
            </button>
            {onSendEmail && (
              <button
                onClick={() => onSendEmail(participant)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors border border-white/5 text-xs font-semibold"
              >
                <Mail className="w-4 h-4 text-indigo-400" />
                Email
              </button>
            )}
            <div className="w-px h-6 bg-white/10 mx-1" />
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 bg-black/40 p-6 md:p-12 overflow-y-auto flex flex-col items-center gap-12 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent print:p-0 print:bg-white print:overflow-visible">
          <div className="print-page flex flex-col items-center gap-8 min-h-min pb-12">
            {renderCertificateSide(event.certificateTemplate, bgImageFront, stageRefFront, "Anverso (Frente)")}
          </div>
          
          {hasBackSide && event.certificateBackTemplate && (
            <>
              <div className="w-full max-w-2xl h-px bg-white/5 my-4 no-print" />
              <div className="print-page flex flex-col items-center gap-8 min-h-min pb-12">
                {renderCertificateSide(event.certificateBackTemplate, bgImageBack, stageRefBack, "Reverso (Contenido)")}
              </div>
            </>
          )}
        </div>
        
        <div className="px-8 py-4 bg-zinc-900/50 border-t border-white/5 text-center">
          <p className="text-xs text-zinc-500">
            Este certificado es generado automáticamente basado en el diseño configurado para el evento.
          </p>
        </div>
      </div>
    )}
  </div>
);
}

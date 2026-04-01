import React, { useEffect, useState, useRef } from 'react';
import { Stage, Layer, Text, Image as KonvaImage, Rect } from 'react-konva';
import * as jspdf from 'jspdf';
import QRCode from 'qrcode';
import { Event, Participant, Authority, Template } from '../types';
import { formatDate, getAuthorityX } from '../lib/utils';
import { toast } from 'react-hot-toast';
import { Mail, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

const jsPDFClass = (jspdf as any).jsPDF || (jspdf as any).default || jspdf;

interface EmailCertificateManagerProps {
  event: Event;
  participant: Participant;
  authorities: Authority[];
  onComplete: () => void;
}

export default function EmailCertificateManager({ event, participant, authorities, onComplete }: EmailCertificateManagerProps) {
  const [status, setStatus] = useState<'generating' | 'sending' | 'success' | 'error'>('generating');
  const [errorMessage, setErrorMessage] = useState('');
  const [currentSide, setCurrentSide] = useState<'front' | 'back'>('front');
  const [bgImageFront, setBgImageFront] = useState<HTMLImageElement | null>(null);
  const [bgImageBack, setBgImageBack] = useState<HTMLImageElement | null>(null);
  const [qrImages, setQrImages] = useState<Record<string, HTMLImageElement>>({});
  const [signatureImages, setSignatureImages] = useState<Record<string, HTMLImageElement>>({});
  const stageRef = useRef<any>(null);
  const pdfRef = useRef<any>(null);

  const hasBackSide = event.certificateBackTemplate && 
    (event.certificateBackTemplate.elements.length > 0 || !!event.certificateBackTemplate.backgroundUrl);
  const template = currentSide === 'front' ? event.certificateTemplate : event.certificateBackTemplate!;

  useEffect(() => {
    const loadAssets = async () => {
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
        setBgImageFront(frontBg);

        if (hasBackSide) {
          const backBg = await loadImg(event.certificateBackTemplate?.backgroundUrl);
          setBgImageBack(backBg);
        }

        // Load signatures for all templates
        const newSigImages: Record<string, HTMLImageElement> = {};
        const allTemplates = [event.certificateTemplate, event.certificateBackTemplate].filter(Boolean) as Template[];
        
        for (const t of allTemplates) {
          if (!t.elements) continue;
          for (const el of t.elements) {
            if (el.type === 'variable' && el.content.endsWith('_signature')) {
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
        setSignatureImages(newSigImages);

        // Initialize PDF
        const pdf = new jsPDFClass({
          orientation: 'landscape',
          unit: 'px',
          format: [800, 565]
        });
        pdfRef.current = pdf;

        // Start processing sides
        setCurrentSide('front');
      } catch (error) {
        console.error('Error in EmailSender setup:', error);
        setStatus('error');
        setErrorMessage('Error al preparar los recursos del certificado.');
      }
    };

    loadAssets();
  }, []);

  // Process current side
  useEffect(() => {
    if (status !== 'generating') return;

    const processSide = async () => {
      try {
        // Generate QR codes for current template
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

        // Wait for render
        setTimeout(() => {
          captureAndNext();
        }, 1500);
      } catch (error) {
        console.error('Error processing side:', error);
        setStatus('error');
        setErrorMessage('Error al generar el certificado.');
      }
    };

    processSide();
  }, [currentSide, status]);

  const captureAndNext = async () => {
    if (!stageRef.current || !pdfRef.current) return;

    try {
      const stage = stageRef.current.getStage();
      stage.batchDraw();
      const canvas = stage.toCanvas({ pixelRatio: 2 });
      const dataUrl = canvas.toDataURL('image/png');

      const pdf = pdfRef.current;
      
      if (currentSide === 'back') {
        pdf.addPage([800, 565], 'landscape');
      }

      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, 800, 565, 'F');
      pdf.addImage(dataUrl, 'PNG', 0, 0, 800, 565);

      if (currentSide === 'front' && hasBackSide) {
        setCurrentSide('back');
      } else {
        // All sides captured, send email
        sendEmail();
      }
    } catch (error) {
      console.error('Error capturing side:', error);
      setStatus('error');
    }
  };

  const sendEmail = async () => {
    try {
      setStatus('sending');
      const pdf = pdfRef.current;
      const pdfBase64 = pdf.output('datauristring').split(',')[1];

      const response = await fetch('/api/send-certificate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: participant.email,
          name: participant.name,
          eventName: event.name,
          pdfBase64
        })
      });

      const result = await response.json();

      if (response.ok) {
        setStatus('success');
        toast.success(`Certificado enviado con éxito a ${participant.email}`);
        setTimeout(onComplete, 2000);
      } else {
        setStatus('error');
        setErrorMessage(result.error || 'Error desconocido al enviar el correo.');
      }
    } catch (error: any) {
      console.error('Error sending email:', error);
      setStatus('error');
      setErrorMessage(error.message || 'Error de red al intentar enviar el correo.');
    }
  };

  const getVariableValue = (variable: string) => {
    if (variable.startsWith('auth')) {
      const match = variable.match(/^auth(\d)_(\w+)$/);
      if (match) {
        const index = parseInt(match[1]) - 1;
        const field = match[2];
        const authId = event.authorities?.[index];
        const authority = authorities.find(a => a.id === authId);
        if (authority) {
          if (field === 'signature') return '';
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/90 backdrop-blur-xl">
      <div className="bg-zinc-900 border border-white/10 rounded-3xl p-10 max-w-md w-full text-center shadow-2xl">
        {(status === 'generating' || status === 'sending') && (
          <div className="space-y-8">
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
              <div 
                className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"
                style={{ animationDuration: '1.5s' }}
              ></div>
              <div className="absolute inset-0 flex items-center justify-center text-indigo-400">
                {status === 'generating' ? <Loader2 className="w-8 h-8 animate-spin" /> : <Mail className="w-8 h-8 animate-bounce" />}
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-white tracking-tight">
                  {status === 'generating' ? 'Generando Certificado' : 'Enviando Correo'}
                </h3>
                <p className="text-zinc-400 text-sm">
                  {status === 'generating' 
                    ? `Preparando el documento para ${participant.name}`
                    : `Enviando a ${participant.email}`}
                </p>
              </div>

              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 animate-[loading_2s_ease-in-out_infinite] shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
              </div>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 mx-auto border border-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-white tracking-tight">¡Enviado con Éxito!</h3>
              <p className="text-zinc-400">El certificado ha sido enviado correctamente por correo electrónico.</p>
            </div>
            <button
              onClick={onComplete}
              className="w-full mt-4 px-6 py-3 bg-zinc-800 text-white rounded-xl font-bold hover:bg-zinc-700 transition-all border border-white/5"
            >
              Cerrar
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mx-auto border border-red-500/20">
              <XCircle className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-white tracking-tight">Error al Enviar</h3>
              <p className="text-red-400 text-sm">{errorMessage}</p>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={onComplete}
                className="flex-1 px-4 py-3 bg-zinc-800 text-white rounded-xl font-bold hover:bg-zinc-700 transition-all border border-white/5"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  setStatus('generating');
                  setCurrentSide('front');
                }}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-900/20"
              >
                Reintentar
              </button>
            </div>
          </div>
        )}

        {/* Hidden Stage for Rendering */}
        <div 
          className="fixed top-0 left-0 pointer-events-none overflow-hidden"
          style={{ width: 800, height: 565, opacity: 0, zIndex: -1000 }}
        >
          <Stage width={800} height={565} ref={stageRef}>
            <Layer>
              {currentSide === 'front' && bgImageFront && <KonvaImage image={bgImageFront} width={800} height={565} />}
              {currentSide === 'back' && bgImageBack && <KonvaImage image={bgImageBack} width={800} height={565} />}
              {template?.elements?.map((el) => {
                let x = el.x;
                let authIndex = -1;
                if (el.type === 'variable' && el.content?.startsWith('auth')) {
                  const match = el.content.match(/^auth(\d)_/);
                  if (match) authIndex = parseInt(match[1]) - 1;
                } else if (el.id?.startsWith('sig')) {
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
                  return qrImg ? <KonvaImage key={el.id} image={qrImg} x={x} y={el.y} width={el.width || 100} height={el.height || 100} /> : null;
                }
                if (el.type === 'variable' && el.content.endsWith('_signature')) {
                  const sigImg = signatureImages[el.id];
                  return sigImg ? <KonvaImage key={el.id} image={sigImg} x={x} y={el.y} width={el.width || 150} height={el.height || 60} /> : null;
                }
                return (
                  <Text
                    key={el.id}
                    text={el.type === 'variable' ? getVariableValue(el.content) : el.content.replace(/\{(\w+)\}/g, (match, p1) => getVariableValue(p1) || match)}
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
      </div>
    </div>
  );
}

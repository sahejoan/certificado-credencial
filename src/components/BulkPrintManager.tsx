import React, { useEffect, useState, useRef } from 'react';
import { Stage, Layer, Text, Image as KonvaImage, Rect } from 'react-konva';
import * as jspdf from 'jspdf';
import QRCode from 'qrcode';
import { Event, Participant, Authority, Template } from '../types';
import { formatDate, getAuthorityX } from '../lib/utils';

// Handle both named and default export for jsPDF
const jsPDFClass = (jspdf as any).jsPDF || (jspdf as any).default || jspdf;

interface BulkPrintManagerProps {
  type: 'certificates' | 'credentials';
  event: Event;
  participants: Participant[];
  authorities: Authority[];
  onComplete: () => void;
}

export default function BulkPrintManager({ type, event, participants, authorities, onComplete }: BulkPrintManagerProps) {
  const [currentParticipantIndex, setCurrentParticipantIndex] = useState(-1);
  const [currentSide, setCurrentSide] = useState<'front' | 'back'>('front');
  const [bgImageFront, setBgImageFront] = useState<HTMLImageElement | null>(null);
  const [bgImageBack, setBgImageBack] = useState<HTMLImageElement | null>(null);
  const bgImageFrontRef = useRef<HTMLImageElement | null>(null);
  const bgImageBackRef = useRef<HTMLImageElement | null>(null);
  const [qrImages, setQrImages] = useState<Record<string, HTMLImageElement>>({});
  const [signatureImages, setSignatureImages] = useState<Record<string, HTMLImageElement>>({});
  const stageRef = useRef<any>(null);
  const pdfRef = useRef<any>(null);

  const isCertificate = type === 'certificates';
  const hasBackSide = !!(isCertificate && event.certificateBackTemplate && 
    (event.certificateBackTemplate.elements.length > 0 || !!event.certificateBackTemplate.backgroundUrl));
  
  const template = isCertificate 
    ? (currentSide === 'front' ? event.certificateTemplate : event.certificateBackTemplate!)
    : event.credentialTemplate;
    
  const stageWidth = isCertificate ? 800 : 400;
  const stageHeight = isCertificate ? 565 : 600;

  // Initial setup: Load background and signatures (once)
  useEffect(() => {
    console.log(`[BulkPrint] Initializing BulkPrintManager. Participants: ${participants.length}. Type: ${type}`);
    if (participants.length === 0) {
      onComplete();
      return;
    }

    const loadStaticAssets = async () => {
      try {
        // Load backgrounds
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

        const frontBg = await loadImg(isCertificate ? event.certificateTemplate?.backgroundUrl : event.credentialTemplate?.backgroundUrl);
        bgImageFrontRef.current = frontBg;
        setBgImageFront(frontBg);

        if (hasBackSide) {
          const backBg = await loadImg(event.certificateBackTemplate?.backgroundUrl);
          bgImageBackRef.current = backBg;
          setBgImageBack(backBg);
        }

        // Load signatures for all templates
        const newSigImages: Record<string, HTMLImageElement> = {};
        const allTemplates = [
          event.certificateTemplate,
          event.certificateBackTemplate,
          event.credentialTemplate
        ].filter(Boolean) as Template[];

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
          orientation: isCertificate ? 'landscape' : 'portrait',
          unit: 'px',
          format: isCertificate ? [800, 565] : [400, 600]
        });
        pdfRef.current = pdf;

        // Small delay to ensure state updates are processed
        setTimeout(() => {
          setCurrentParticipantIndex(0);
          setCurrentSide('front');
        }, 1000);
      } catch (error) {
        console.error('Error in BulkPrintManager setup:', error);
        onComplete();
      }
    };

    loadStaticAssets();
  }, []);

  // Process current participant and side
  useEffect(() => {
    console.log(`[BulkPrint] currentParticipantIndex: ${currentParticipantIndex}, side: ${currentSide}`);
    if (currentParticipantIndex === -1 || currentParticipantIndex >= participants.length) return;

    const processParticipant = async () => {
      const participant = participants[currentParticipantIndex];
      
      try {
        // Generate QR codes for this participant and current template
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

        // Wait for Konva to render the new state
        setTimeout(() => {
          captureAndNext();
        }, 1500);
      } catch (error) {
        console.error('Error processing participant:', error);
        // Skip this side/participant and continue
        handleNext();
      }
    };

    processParticipant();
  }, [currentParticipantIndex, currentSide]);

  const handleNext = () => {
    if (hasBackSide && currentSide === 'front') {
      setCurrentSide('back');
    } else {
      if (currentParticipantIndex < participants.length - 1) {
        setCurrentSide('front');
        setCurrentParticipantIndex(prev => prev + 1);
      } else {
        // Finished!
        console.log('[BulkPrint] Generation complete, saving PDF...');
        pdfRef.current.save(`${isCertificate ? 'Certificados' : 'Credenciales'}_${event.name.replace(/\s+/g, '_')}.pdf`);
        onComplete();
      }
    }
  };

  const captureAndNext = async () => {
    if (!stageRef.current || !pdfRef.current) {
      console.warn(`[BulkPrint] stageRef or pdfRef is missing.`);
      return;
    }

    try {
      const stage = stageRef.current.getStage();
      stage.batchDraw();

      const canvas = stage.toCanvas({ pixelRatio: 1.5 });
      const dataUrl = canvas.toDataURL('image/png');
      
      if (!dataUrl || dataUrl.length < 2000) {
        console.warn(`[BulkPrint] Blank capture, retrying...`);
        setTimeout(captureAndNext, 1000);
        return;
      }

      const pdf = pdfRef.current;
      
      // Add page if not the first page of the PDF
      if (pdf.getNumberOfPages() > 1 || (pdf.getNumberOfPages() === 1 && (currentParticipantIndex > 0 || (hasBackSide && currentSide === 'back')))) {
        pdf.addPage(isCertificate ? [800, 565] : [400, 600], isCertificate ? 'landscape' : 'portrait');
      }

      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, stageWidth, stageHeight, 'F');
      pdf.addImage(dataUrl, 'PNG', 0, 0, stageWidth, stageHeight);

      handleNext();
    } catch (error) {
      console.error('Error capturing stage:', error);
      handleNext();
    }
  };

  const getVariableValue = (variable: string, participant: Participant) => {
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

  const currentParticipant = participants[currentParticipantIndex];
  const progress = participants.length > 0 
    ? Math.max(0, Math.round(((currentParticipantIndex + 1) / participants.length) * 100)) 
    : 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/95 backdrop-blur-2xl">
      <div className="max-w-md w-full px-8 flex flex-col items-center">
        {/* Progress Circle & Icon */}
        <div className="relative w-32 h-32 mb-10">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="60"
              stroke="currentColor"
              strokeWidth="4"
              fill="transparent"
              className="text-zinc-800"
            />
            <circle
              cx="64"
              cy="64"
              r="60"
              stroke="currentColor"
              strokeWidth="4"
              fill="transparent"
              strokeDasharray={377}
              strokeDashoffset={377 - (377 * progress) / 100}
              className="text-indigo-500 transition-all duration-500 ease-out"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-white tracking-tighter">{progress}%</span>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Progreso</span>
          </div>
        </div>
        
        <div className="text-center space-y-4 w-full">
          <div className="space-y-1">
            <h3 className="text-2xl font-bold text-white tracking-tight">
              Generando {type === 'certificates' ? 'Certificados' : 'Credenciales'}
            </h3>
            <p className="text-zinc-400 text-sm">
              Procesando {currentParticipantIndex + 1} de {participants.length} registros
            </p>
          </div>

          {/* Linear Progress Bar */}
          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-500 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          <div className="flex items-center justify-center gap-3 py-2 px-4 bg-white/5 rounded-2xl border border-white/5">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
            <p className="text-xs font-medium text-zinc-300 truncate max-w-[200px]">
              {currentParticipant?.name || 'Iniciando...'}
            </p>
          </div>
        </div>

        <p className="mt-12 text-[10px] text-zinc-600 uppercase tracking-[0.2em] font-bold text-center">
          Por favor, no cierres esta ventana
        </p>

        {/* Hidden Stage for Rendering - kept in viewport but behind everything to ensure browser renders it */}
        <div 
          className="fixed top-0 left-0 pointer-events-none overflow-hidden"
          style={{ 
            width: stageWidth, 
            height: stageHeight, 
            opacity: 0,
            zIndex: -1000,
            backgroundColor: 'white'
          }}
        >
          {currentParticipant && (
            <Stage
              width={stageWidth}
              height={stageHeight}
              ref={stageRef}
            >
              <Layer>
                {/* White background with debug border to verify rendering */}
                <Rect
                  x={0}
                  y={0}
                  width={stageWidth}
                  height={stageHeight}
                  fill="white"
                />
                {(bgImageFront || bgImageFrontRef.current) && currentSide === 'front' && (
                  <KonvaImage
                    image={bgImageFront || bgImageFrontRef.current!}
                    width={stageWidth}
                    height={stageHeight}
                  />
                )}
                {(bgImageBack || bgImageBackRef.current) && currentSide === 'back' && (
                  <KonvaImage
                    image={bgImageBack || bgImageBackRef.current!}
                    width={stageWidth}
                    height={stageHeight}
                  />
                )}
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
                    x = getAuthorityX(authIndex, totalAuths, el.width || 0, stageWidth);
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

                  const textValue = el.type === 'variable' 
                    ? getVariableValue(el.content, currentParticipant) 
                    : el.content.replace(/\{(\w+)\}/g, (match, p1) => {
                        const val = getVariableValue(p1, currentParticipant);
                        return val !== undefined && val !== '' ? val : match;
                      });

                  return (
                    <Text
                      key={el.id}
                      text={textValue}
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
          )}
        </div>
      </div>
    </div>
  );
}

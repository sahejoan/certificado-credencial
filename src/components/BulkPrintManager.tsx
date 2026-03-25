import React, { useEffect, useState, useRef } from 'react';
import { Stage, Layer, Text, Image as KonvaImage, Rect } from 'react-konva';
import * as jspdf from 'jspdf';
import QRCode from 'qrcode';
import { Event, Participant, Authority, Template } from '../types';
import { formatDate } from '../lib/utils';

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
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const [qrImages, setQrImages] = useState<Record<string, HTMLImageElement>>({});
  const [signatureImages, setSignatureImages] = useState<Record<string, HTMLImageElement>>({});
  const stageRef = useRef<any>(null);
  const pdfRef = useRef<any>(null);

  const template = type === 'certificates' ? event.certificateTemplate : event.credentialTemplate;
  const stageWidth = type === 'certificates' ? 800 : 400;
  const stageHeight = type === 'certificates' ? 565 : 600;

  // Initial setup: Load background and signatures (once)
  useEffect(() => {
    if (participants.length === 0) {
      onComplete();
      return;
    }

    const loadStaticAssets = async () => {
      try {
        // Load background
        if (template.backgroundUrl) {
          const img = new window.Image();
          if (template.backgroundUrl.startsWith('http')) {
            img.crossOrigin = 'Anonymous';
          }
          img.src = template.backgroundUrl;
          await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = () => {
              console.warn('Failed to load background image, continuing without it.');
              resolve(null);
            };
          });
          bgImageRef.current = img;
          setBgImage(img);
        }

        // Load signatures (for both certificates and credentials if present)
        const newSigImages: Record<string, HTMLImageElement> = {};
        for (const el of template.elements) {
          if (el.type === 'variable' && el.content.endsWith('_signature')) {
            const match = el.content.match(/^auth(\d)_signature$/);
            if (match) {
              const index = parseInt(match[1]) - 1;
              const authId = event.authorities?.[index];
              const authority = authorities.find(a => a.id === authId);
              if (authority?.signatureUrl && authority.isSignatureActive) {
                const img = new window.Image();
                if (authority.signatureUrl.startsWith('http')) {
                  img.crossOrigin = 'Anonymous';
                }
                img.src = authority.signatureUrl;
                await new Promise(resolve => {
                  img.onload = resolve;
                  img.onerror = () => resolve(null);
                });
                if (img.complete && img.naturalWidth > 0) {
                  newSigImages[el.id] = img;
                }
              }
            }
          }
        }
        setSignatureImages(newSigImages);

        // Initialize PDF
        const pdf = new jsPDFClass({
          orientation: type === 'certificates' ? 'landscape' : 'portrait',
          unit: 'px',
          format: type === 'certificates' ? [800, 565] : [400, 600]
        });
        pdfRef.current = pdf;

        // Small delay to ensure state updates are processed
        setTimeout(() => {
          setCurrentParticipantIndex(0);
        }, 200);
      } catch (error) {
        console.error('Error in BulkPrintManager setup:', error);
        onComplete();
      }
    };

    loadStaticAssets();
  }, []);

  // Process current participant
  useEffect(() => {
    if (currentParticipantIndex === -1 || currentParticipantIndex >= participants.length) return;

    const processParticipant = async () => {
      const participant = participants[currentParticipantIndex];
      
      try {
        // Generate QR codes for this participant
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
        // Increased delay to ensure rendering is complete
        setTimeout(() => {
          captureAndNext();
        }, 1000);
      } catch (error) {
        console.error('Error processing participant:', error);
        // Skip this participant and continue
        if (currentParticipantIndex < participants.length - 1) {
          setCurrentParticipantIndex(prev => prev + 1);
        } else {
          onComplete();
        }
      }
    };

    processParticipant();
  }, [currentParticipantIndex]);

  const captureAndNext = () => {
    if (!stageRef.current || !pdfRef.current) return;

    try {
      // Force a redraw of the stage
      const stage = stageRef.current.getStage();
      stage.batchDraw();

      // Use a higher pixelRatio for better quality
      const dataUrl = stage.toDataURL({ 
        pixelRatio: 2,
        mimeType: 'image/jpeg',
        quality: 0.95
      });
      console.log(`[BulkPrint] Participant ${currentParticipantIndex} capture length: ${dataUrl.length}`);
      
      if (!dataUrl || dataUrl.length < 1000) {
        console.warn(`[BulkPrint] Blank or tiny capture for participant ${currentParticipantIndex}, retrying...`);
        setTimeout(captureAndNext, 500);
        return;
      }

      const pdf = pdfRef.current;

      if (type === 'certificates') {
        if (currentParticipantIndex > 0) {
          pdf.addPage([800, 565], 'landscape');
        }
        pdf.addImage(dataUrl, 'JPEG', 0, 0, 800, 565);
      } else {
        // Credentials: One per page for testing
        if (currentParticipantIndex > 0) {
          pdf.addPage([400, 600], 'portrait');
        }
        pdf.addImage(dataUrl, 'JPEG', 0, 0, 400, 600);
      }

      if (currentParticipantIndex < participants.length - 1) {
        setCurrentParticipantIndex(prev => prev + 1);
      } else {
        // Finished!
        console.log('[BulkPrint] Generation complete, saving PDF...');
        pdf.save(`${type === 'certificates' ? 'Certificados' : 'Credenciales'}_${event.name.replace(/\s+/g, '_')}.pdf`);
        onComplete();
      }
    } catch (error) {
      console.error('Error capturing stage:', error);
      onComplete();
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl">
      <div className="text-center space-y-6 max-w-md w-full px-6">
        <div className="relative w-24 h-24 mx-auto">
          <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
          <div 
            className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"
            style={{ animationDuration: '1.5s' }}
          ></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold text-white">
              {Math.round(((currentParticipantIndex + 1) / participants.length) * 100)}%
            </span>
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-white">Generando PDF</h3>
          <p className="text-zinc-400">
            Procesando {type === 'certificates' ? 'certificado' : 'credencial'} {currentParticipantIndex + 1} de {participants.length}
          </p>
          <p className="text-xs text-indigo-400 font-medium uppercase tracking-widest">
            {currentParticipant?.name}
          </p>
        </div>

        <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
          <div 
            className="bg-indigo-500 h-full transition-all duration-300 ease-out"
            style={{ width: `${((currentParticipantIndex + 1) / participants.length) * 100}%` }}
          ></div>
        </div>

        <p className="text-xs text-zinc-500 italic">
          Por favor, no cierres esta ventana hasta que la descarga comience automáticamente.
        </p>

        {/* Hidden Stage for Rendering - kept slightly visible and in-bounds to ensure browser renders it */}
        <div 
          className="fixed pointer-events-none overflow-hidden"
          style={{ 
            width: stageWidth, 
            height: stageHeight, 
            left: '-5000px',
            top: '0',
            opacity: 1,
            zIndex: 9999
          }}
        >
          {currentParticipant && (
            <Stage
              key={`stage-${currentParticipantIndex}`}
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
                  stroke="#FF0000"
                  strokeWidth={2}
                />
                {(bgImage || bgImageRef.current) && (
                  <KonvaImage
                    image={bgImage || bgImageRef.current!}
                    width={stageWidth}
                    height={stageHeight}
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
                  
                  if (el.type === 'variable' && el.content.endsWith('_signature')) {
                    const sigImg = signatureImages[el.id];
                    return sigImg ? (
                      <KonvaImage
                        key={el.id}
                        image={sigImg}
                        x={el.x}
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
          )}
        </div>
      </div>
    </div>
  );
}

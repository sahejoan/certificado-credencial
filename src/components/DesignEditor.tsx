import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Text, Rect, Image as KonvaImage, Transformer } from 'react-konva';
import { Type, Image as ImageIcon, Variable, Save, Trash2, Move, Download, QrCode, Upload } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Template, TemplateElement, User } from '../types';
import { cn, getAuthorityX } from '../lib/utils';

interface DesignEditorProps {
  template: Template;
  onSave: (template: Template) => void;
  title: string;
  width?: number;
  height?: number;
  user: User | null;
  authorityCount?: number;
  defaultTemplate?: Template;
}

const VARIABLES = [
  { id: 'participant_name', label: 'Nombre del Participante' },
  { id: 'participant_id_number', label: 'Cédula del Participante' },
  { id: 'participant_role', label: 'Rol del Participante' },
  { id: 'event_name', label: 'Nombre del Evento' },
  { id: 'event_date', label: 'Fecha del Evento' },
  { id: 'auth1_name', label: 'Nombre Autoridad 1' },
  { id: 'auth1_role', label: 'Cargo Autoridad 1' },
  { id: 'auth1_signature', label: 'Firma Autoridad 1' },
  { id: 'auth2_name', label: 'Nombre Autoridad 2' },
  { id: 'auth2_role', label: 'Cargo Autoridad 2' },
  { id: 'auth2_signature', label: 'Firma Autoridad 2' },
  { id: 'auth3_name', label: 'Nombre Autoridad 3' },
  { id: 'auth3_role', label: 'Cargo Autoridad 3' },
  { id: 'auth3_signature', label: 'Firma Autoridad 3' },
];

import { compressImage } from '../lib/imageUtils';

export default function DesignEditor({ 
  template, 
  onSave, 
  title,
  width = 800,
  height = 565,
  user,
  authorityCount = 4,
  defaultTemplate
}: DesignEditorProps) {
  const [elements, setElements] = useState<TemplateElement[]>(template.elements || []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | undefined>(template.backgroundUrl);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);

  const isEditor = user?.role === 'admin' || user?.role === 'editor' || user?.role === 'viewer';

  useEffect(() => {
    setElements(template.elements || []);
    setBackgroundUrl(template.backgroundUrl);
    setSelectedId(null);
  }, [template]);

  useEffect(() => {
    if (backgroundUrl) {
      const img = new window.Image();
      img.src = backgroundUrl;
      img.onload = () => setBgImage(img);
    }
  }, [backgroundUrl]);

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsCompressing(true);
      try {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = reader.result as string;
          // Compress image to stay under Firestore 1MB limit
          // 1200px is usually enough for certificates
          const compressed = await compressImage(base64, 1200, 0.7);
          setBackgroundUrl(compressed);
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('Error compressing image:', error);
      } finally {
        setIsCompressing(false);
      }
    }
  };

  useEffect(() => {
    if (selectedId && transformerRef.current) {
      const selectedNode = stageRef.current.findOne('#' + selectedId);
      if (selectedNode) {
        transformerRef.current.nodes([selectedNode]);
        transformerRef.current.getLayer().batchDraw();
      }
    }
  }, [selectedId]);

  const addElement = (type: 'text' | 'variable' | 'qr_code') => {
    const newElement: Partial<TemplateElement> = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      content: type === 'text' ? 'Nuevo Texto' : type === 'variable' ? 'participant_name' : 'verification_url',
      x: type === 'qr_code' ? 680 : 100,
      y: type === 'qr_code' ? 380 : 100,
      fill: '#000000',
    };

    if (type !== 'qr_code') {
      newElement.fontSize = 24;
      newElement.fontFamily = 'Inter';
      newElement.align = 'left';
      newElement.fontStyle = 'normal';
    } else {
      newElement.width = 100;
      newElement.height = 100;
    }

    setElements([...elements, newElement as TemplateElement]);
    setSelectedId(newElement.id!);
  };

  const updateElement = (id: string, attrs: Partial<TemplateElement>) => {
    setElements(elements.map(el => el.id === id ? { ...el, ...attrs } : el));
  };

  const deleteElement = (id: string) => {
    setElements(elements.filter(el => el.id !== id));
    setSelectedId(null);
  };

  const handleResetToDefault = () => {
    if (defaultTemplate && window.confirm('¿Estás seguro de que deseas restablecer el diseño a los valores predeterminados? Se perderán los cambios actuales.')) {
      setElements(defaultTemplate.elements);
      setBackgroundUrl(defaultTemplate.backgroundUrl);
      setSelectedId(null);
      toast.success('Diseño restablecido');
    }
  };

  const [isExporting, setIsExporting] = useState(false);
  const [isAssetLoading, setIsAssetLoading] = useState(true);

  useEffect(() => {
    const loadAssets = async () => {
      setIsAssetLoading(true);
      try {
        // Simulating asset loading or ensuring fonts are ready
        await new Promise(resolve => setTimeout(resolve, 800));
      } finally {
        setIsAssetLoading(false);
      }
    };
    loadAssets();
  }, []);

  const handleExport = async () => {
    if (!stageRef.current) return;
    setIsExporting(true);
    
    // Small delay to show the loading screen
    await new Promise(resolve => setTimeout(resolve, 600));
    
    try {
      const uri = stageRef.current.toDataURL({ pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `${title}.png`;
      link.href = uri;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Vista previa exportada');
    } catch (error) {
      toast.error('Error al exportar');
    } finally {
      setIsExporting(false);
    }
  };

  const selectedElement = elements.find(el => el.id === selectedId);

  return (
    <div className="flex flex-col h-full gap-6 relative">
      {(isExporting || isAssetLoading || isCompressing) && (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl rounded-3xl">
          <div className="relative w-24 h-24 mb-6">
            <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
            <div 
              className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"
              style={{ animationDuration: '1.5s' }}
            ></div>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">
            {isExporting ? 'Exportando Diseño' : isCompressing ? 'Comprimiendo Imagen' : 'Cargando Editor'}
          </h3>
          <p className="text-zinc-400 mb-6">Por favor, espera un momento...</p>
          
          <div className="w-64 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 animate-[loading_2s_ease-in-out_infinite] shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
          </div>
        </div>
      )}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white leading-tight">{title}</h2>
          <p className="text-zinc-400">Diseña el formato visual de tus certificados.</p>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-white/10 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white text-xs font-medium"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar Prueba
          </button>
          {isEditor && (
            <div className="flex items-center gap-2">
              {defaultTemplate && (
                <button
                  onClick={handleResetToDefault}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-white/10 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white text-xs font-medium"
                  title="Restablecer a valores predeterminados"
                >
                  <Move className="w-3.5 h-3.5 rotate-45" />
                  Restablecer
                </button>
              )}
              <div className="w-px h-6 bg-white/10 mx-1" />
              <button
                onClick={() => onSave({ backgroundUrl: backgroundUrl || '', elements })}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-xs font-bold"
              >
                <Save className="w-4 h-4" />
                Guardar Diseño
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        {/* Toolbar */}
        <aside className={cn(
          "w-64 bg-zinc-900 border border-white/5 rounded-3xl p-6 flex flex-col gap-6",
          !isEditor && "opacity-50 pointer-events-none"
        )}>
          <div>
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Elementos</h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <button
                onClick={() => addElement('text')}
                className="flex flex-col items-center gap-2 p-4 border border-white/5 rounded-2xl hover:bg-indigo-500/10 hover:border-indigo-500/20 transition-all group"
                title="Agregar Texto Estático"
              >
                <Type className="w-6 h-6 text-zinc-600 group-hover:text-indigo-400" />
                <span className="text-[10px] font-medium text-zinc-400">Texto</span>
              </button>
              <button
                onClick={() => addElement('variable')}
                className="flex flex-col items-center gap-2 p-4 border border-white/5 rounded-2xl hover:bg-indigo-500/10 hover:border-indigo-500/20 transition-all group"
                title="Agregar Variable Dinámica"
              >
                <Variable className="w-6 h-6 text-zinc-600 group-hover:text-indigo-400" />
                <span className="text-[10px] font-medium text-zinc-400">Var</span>
              </button>
              <button
                onClick={() => addElement('qr_code')}
                className="flex flex-col items-center gap-2 p-4 border border-white/5 rounded-2xl hover:bg-indigo-500/10 hover:border-indigo-500/20 transition-all group"
                title="Agregar Código QR de Verificación"
              >
                <QrCode className="w-6 h-6 text-zinc-600 group-hover:text-indigo-400" />
                <span className="text-[10px] font-medium text-zinc-400">QR</span>
              </button>
            </div>

            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Variables Rápidas</h3>
            <div className="space-y-1 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {VARIABLES.slice(0, 5).map(v => (
                <button
                  key={v.id}
                  onClick={() => {
                    const isCentered = v.id === 'participant_name' || v.id === 'participant_id_number';
                    const newElement: TemplateElement = {
                      id: Math.random().toString(36).substr(2, 9),
                      type: 'variable',
                      content: v.id,
                      x: isCentered ? 0 : 100,
                      y: v.id === 'participant_name' ? 250 : v.id === 'participant_id_number' ? 290 : 150,
                      fontSize: v.id === 'participant_name' ? 36 : 24,
                      fill: v.id === 'participant_name' ? '#1d4ed8' : '#000000',
                      fontFamily: 'Inter',
                      align: isCentered ? 'center' : 'left',
                      width: isCentered ? 800 : undefined,
                      fontStyle: v.id === 'participant_name' ? 'bold' : 'normal'
                    };
                    setElements([...elements, newElement]);
                    setSelectedId(newElement.id);
                  }}
                  className="w-full text-left px-3 py-2 text-[10px] text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-white/5 truncate"
                >
                  + {v.label}
                </button>
              ))}
            </div>

            <div className="mt-4 p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-tight mb-1">Tip: Texto Dinámico</p>
              <p className="text-[9px] text-zinc-500 leading-relaxed mb-2">
                Usa llaves para insertar datos en textos largos:
              </p>
              <div className="space-y-1">
                <code className="block text-[8px] text-zinc-400 bg-black/20 p-1 rounded">{'{participant_name}'}</code>
                <code className="block text-[8px] text-zinc-400 bg-black/20 p-1 rounded">{'{participant_id_number}'}</code>
                <code className="block text-[8px] text-zinc-400 bg-black/20 p-1 rounded">{'{participant_role}'}</code>
                <code className="block text-[8px] text-zinc-400 bg-black/20 p-1 rounded">{'{event_name}'}</code>
                <code className="block text-[8px] text-zinc-400 bg-black/20 p-1 rounded">{'{event_date}'}</code>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Fondo</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => bgFileInputRef.current?.click()}
                  disabled={isCompressing}
                  className="flex items-center justify-center gap-2 p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 transition-colors border border-white/5 disabled:opacity-50"
                >
                  <Upload className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold uppercase">{isCompressing ? '...' : 'Archivo'}</span>
                </button>
                <button
                  onClick={() => {
                    setBackgroundUrl(undefined);
                    setBgImage(null);
                  }}
                  className="flex items-center justify-center gap-2 p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 transition-colors border border-white/5"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                  <span className="text-xs font-bold uppercase">Limpiar</span>
                </button>
              </div>

              <input
                type="file"
                ref={bgFileInputRef}
                onChange={handleBgUpload}
                accept="image/*"
                className="hidden"
              />

              <div className="relative">
                <input
                  type="text"
                  placeholder="O pega URL de imagen"
                  value={backgroundUrl?.startsWith('data:') ? '' : (backgroundUrl || '')}
                  onChange={(e) => setBackgroundUrl(e.target.value)}
                  className="w-full px-4 py-2 text-xs bg-zinc-800 border border-white/5 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <p className="text-[10px] text-zinc-500 italic">Recomendado: 1920x1080px</p>
            </div>
          </div>

          {selectedElement && (
            <div className="flex-1 flex flex-col gap-6 border-t border-white/5 pt-6">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Propiedades</h3>
              <div className="space-y-4">
                {selectedElement.type === 'text' ? (
                  <div>
                    <label className="text-xs font-medium text-zinc-500 mb-1 block">Contenido</label>
                    <input
                      type="text"
                      value={selectedElement.content}
                      onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-zinc-800 border border-white/5 rounded-lg text-white"
                    />
                  </div>
                ) : selectedElement.type === 'variable' ? (
                  <div>
                    <label className="text-xs font-medium text-zinc-500 mb-1 block">Variable</label>
                    <select
                      value={selectedElement.content}
                      onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-zinc-800 border border-white/5 rounded-lg text-white"
                    >
                      {VARIABLES.map(v => (
                        <option key={v.id} value={v.id}>{v.label}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-medium text-zinc-500 mb-1 block">Tipo de QR</label>
                    <select
                      value={selectedElement.content}
                      onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-zinc-800 border border-white/5 rounded-lg text-white"
                    >
                      <option value="verification_url">URL de Verificación</option>
                    </select>
                  </div>
                )}

                  <div>
                    <label className="text-xs font-medium text-zinc-500 mb-1 block">Alineación</label>
                    <div className="grid grid-cols-3 gap-1 bg-zinc-800 p-1 rounded-lg">
                      {(['left', 'center', 'right'] as const).map((align) => (
                        <button
                          key={align}
                          onClick={() => {
                            const attrs: Partial<TemplateElement> = { align };
                            if (align === 'center') {
                              attrs.width = 800;
                              attrs.x = 0;
                            }
                            updateElement(selectedElement.id, attrs);
                          }}
                          className={cn(
                            "py-1.5 text-[10px] font-bold uppercase rounded-md transition-all",
                            selectedElement.align === align 
                              ? "bg-indigo-600 text-white shadow-sm" 
                              : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                          )}
                        >
                          {align === 'left' ? 'Izq' : align === 'center' ? 'Centro' : 'Der'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedElement.align === 'center' && (
                    <p className="text-[10px] text-indigo-400/60 italic">
                      * Centrado automático activado (Ancho: 800px)
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                  {selectedElement.type !== 'qr_code' && (
                    <div>
                      <label className="text-xs font-medium text-zinc-500 mb-1 block">Tamaño</label>
                      <input
                        type="number"
                        value={selectedElement.fontSize}
                        onChange={(e) => updateElement(selectedElement.id, { fontSize: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 text-sm bg-zinc-800 border border-white/5 rounded-lg text-white"
                      />
                    </div>
                  )}
                  {selectedElement.type === 'qr_code' && (
                    <div>
                      <label className="text-xs font-medium text-zinc-500 mb-1 block">Dimensión</label>
                      <input
                        type="number"
                        value={selectedElement.width}
                        onChange={(e) => updateElement(selectedElement.id, { width: parseInt(e.target.value), height: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 text-sm bg-zinc-800 border border-white/5 rounded-lg text-white"
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-medium text-zinc-500 mb-1 block">Color</label>
                    <input
                      type="color"
                      value={selectedElement.fill}
                      onChange={(e) => updateElement(selectedElement.id, { fill: e.target.value })}
                      className="w-full h-9 p-1 bg-zinc-800 border border-white/5 rounded-lg"
                    />
                  </div>
                </div>

                <button
                  onClick={() => deleteElement(selectedElement.id)}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-xs font-bold uppercase tracking-tight"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Eliminar Elemento
                </button>
              </div>
            </div>
          )}
        </aside>

        {/* Canvas Area */}
        <div className="flex-1 bg-zinc-950 border border-white/5 rounded-3xl overflow-auto flex items-center justify-center relative p-8 md:p-12 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
          <div className="bg-white shadow-2xl shrink-0">
              <Stage
                width={width}
                height={height}
                ref={stageRef}
                onMouseDown={(e) => {
                  const clickedOnEmpty = e.target === e.target.getStage();
                  if (clickedOnEmpty) setSelectedId(null);
                }}
              >
                <Layer>
                  {bgImage && (
                    <KonvaImage
                      image={bgImage}
                      width={width}
                      height={height}
                    />
                  )}
                {elements.map((el) => {
                  let x = el.x;
                  let isDynamic = false;
                  let authIndex = -1;
                  if (el.type === 'variable' && el.content.startsWith('auth')) {
                    const match = el.content.match(/^auth(\d)_/);
                    if (match) authIndex = parseInt(match[1]) - 1;
                  } else if (el.id.startsWith('sig')) {
                    const match = el.id.match(/^sig(\d)/);
                    if (match) authIndex = parseInt(match[1]) - 1;
                  }

                  if (authIndex !== -1) {
                    if (authIndex < authorityCount) {
                      x = getAuthorityX(authIndex, authorityCount, el.width || 0, width);
                      isDynamic = true;
                    } else {
                      return null; // Hide unused authorities
                    }
                  }

                  if (el.type === 'qr_code') {
                    return (
                      <React.Fragment key={el.id}>
                        <Rect
                          id={el.id}
                          x={el.x}
                          y={el.y}
                          width={el.width || 100}
                          height={el.height || 100}
                          fill="#f3f4f6"
                          stroke={el.fill}
                          strokeWidth={2}
                          draggable={isEditor}
                          onClick={() => setSelectedId(el.id)}
                          onDragEnd={(e) => {
                            updateElement(el.id, {
                              x: e.target.x(),
                              y: e.target.y(),
                            });
                          }}
                        />
                        <Text
                          x={el.x}
                          y={el.y + (el.height || 100) / 2 - 10}
                          width={el.width || 100}
                          text="QR CODE"
                          align="center"
                          fontSize={12}
                          fill={el.fill}
                          listening={false}
                        />
                      </React.Fragment>
                    );
                  }

                  if (el.type === 'variable' && el.content.endsWith('_signature')) {
                    return (
                      <React.Fragment key={el.id}>
                        <Rect
                          id={el.id}
                          x={x}
                          y={el.y}
                          width={el.width || 150}
                          height={el.height || 60}
                          fill={isDynamic ? "#e0e7ff80" : "#e0e7ff"}
                          stroke={isDynamic ? "#4f46e580" : "#4f46e5"}
                          strokeWidth={1}
                          strokeScaleEnabled={false}
                          dash={[4, 4]}
                          draggable={isEditor && !isDynamic}
                          onClick={() => setSelectedId(el.id)}
                          onDragEnd={(e) => {
                            updateElement(el.id, {
                              x: e.target.x(),
                              y: e.target.y(),
                            });
                          }}
                        />
                        <Text
                          x={x}
                          y={el.y + (el.height || 60) / 2 - 6}
                          width={el.width || 150}
                          text={VARIABLES.find(v => v.id === el.content)?.label}
                          align="center"
                          fontSize={10}
                          fill={isDynamic ? "#4f46e580" : "#4f46e5"}
                          listening={false}
                        />
                      </React.Fragment>
                    );
                  }
                  return (
                    <Text
                      key={el.id}
                      id={el.id}
                      text={el.type === 'variable' 
                        ? `[${VARIABLES.find(v => v.id === el.content)?.label}]` 
                        : el.content.replace(/\{(\w+)\}/g, (match, p1) => {
                            const v = VARIABLES.find(v => v.id === p1);
                            return v ? `[${v.label}]` : match;
                          })
                      }
                      x={x}
                      y={el.y}
                      fontSize={el.fontSize}
                      fill={isDynamic ? el.fill + '80' : el.fill}
                      fontFamily={el.fontFamily || 'Inter'}
                      fontStyle={el.fontStyle || 'normal'}
                      align={isDynamic ? 'center' : (el.align || 'left')}
                      width={el.width}
                      draggable={isEditor && !isDynamic}
                      onClick={() => setSelectedId(el.id)}
                      onDragEnd={(e) => {
                        updateElement(el.id, {
                          x: e.target.x(),
                          y: e.target.y(),
                        });
                      }}
                      onTransformEnd={(e) => {
                        const node = e.target;
                        const scaleX = node.scaleX();
                        node.scaleX(1);
                        node.scaleY(1);
                        updateElement(el.id, {
                          x: node.x(),
                          y: node.y(),
                          fontSize: Math.max(5, el.fontSize! * scaleX),
                        });
                      }}
                    />
                  );
                })}
                {selectedId && isEditor && <Transformer ref={transformerRef} />}
              </Layer>
            </Stage>
          </div>
          
          <div className="absolute bottom-6 right-6 bg-zinc-900/80 backdrop-blur px-4 py-2 rounded-full text-[10px] font-bold text-zinc-500 uppercase tracking-widest border border-white/10">
            {width}x{height}px
          </div>
        </div>
      </div>
    </div>
  );
}

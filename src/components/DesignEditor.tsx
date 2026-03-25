import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Text, Rect, Image as KonvaImage, Transformer } from 'react-konva';
import { Type, Image as ImageIcon, Variable, Save, Trash2, Move, Download, QrCode, Upload } from 'lucide-react';
import { Template, TemplateElement, User } from '../types';
import { cn } from '../lib/utils';

interface DesignEditorProps {
  template: Template;
  onSave: (template: Template) => void;
  title: string;
  width?: number;
  height?: number;
  user: User | null;
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

export default function DesignEditor({ 
  template, 
  onSave, 
  title,
  width = 800,
  height = 565,
  user
}: DesignEditorProps) {
  const [elements, setElements] = useState<TemplateElement[]>(template.elements || []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | undefined>(template.backgroundUrl);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);

  const isEditor = user?.role === 'admin' || user?.role === 'editor';

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

  const handleExport = () => {
    const uri = stageRef.current.toDataURL();
    const link = document.createElement('a');
    link.download = `${title}.png`;
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedElement = elements.find(el => el.id === selectedId);

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <p className="text-zinc-400">Diseña el formato visual de tus certificados.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 border border-white/10 rounded-xl hover:bg-zinc-800 transition-colors text-zinc-300"
          >
            <Download className="w-4 h-4" />
            Exportar Prueba
          </button>
          {isEditor && (
            <button
              onClick={() => onSave({ backgroundUrl: backgroundUrl || '', elements })}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-900/20"
            >
              <Save className="w-4 h-4" />
              Guardar Diseño
            </button>
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
                  className="flex items-center justify-center gap-2 p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 transition-colors border border-white/5"
                >
                  <Upload className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold uppercase">Archivo</span>
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
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setBackgroundUrl(reader.result as string);
                    reader.readAsDataURL(file);
                  }
                }}
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
                  className="w-full flex items-center justify-center gap-2 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-sm font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar Elemento
                </button>
              </div>
            </div>
          )}
        </aside>

        {/* Canvas Area */}
        <div className="flex-1 bg-zinc-950 border border-white/5 rounded-3xl overflow-hidden flex items-center justify-center relative">
          <div className="bg-white shadow-2xl">
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
                          x={el.x}
                          y={el.y}
                          width={el.width || 150}
                          height={el.height || 60}
                          fill="#e0e7ff"
                          stroke="#4f46e5"
                          strokeWidth={1}
                          strokeScaleEnabled={false}
                          dash={[4, 4]}
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
                          y={el.y + (el.height || 60) / 2 - 6}
                          width={el.width || 150}
                          text={VARIABLES.find(v => v.id === el.content)?.label}
                          align="center"
                          fontSize={10}
                          fill="#4f46e5"
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
                      x={el.x}
                      y={el.y}
                      fontSize={el.fontSize}
                      fill={el.fill}
                      fontFamily={el.fontFamily || 'Inter'}
                      fontStyle={el.fontStyle || 'normal'}
                      align={el.align || 'left'}
                      width={el.width}
                      draggable={isEditor}
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

import React, { useState, useMemo } from 'react';
import { FileText, Download, Filter, Calendar, Users, Award, Search, ChevronRight, BarChart3, PieChart, TrendingUp, CheckCircle2 } from 'lucide-react';
import { Participant, Event, Role } from '../types';
import { ROLES } from '../constants';
import { cn, formatDate } from '../lib/utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion } from 'motion/react';

interface ReportsProps {
  participants: Participant[];
  events: Event[];
}

export default function Reports({ participants, events }: ReportsProps) {
  const [selectedEventId, setSelectedEventId] = useState<string | 'all'>('all');
  const [selectedRole, setSelectedRole] = useState<Role | 'all'>('all');
  const [reportType, setReportType] = useState<'general' | 'grouped'>('general');
  const [isGenerating, setIsGenerating] = useState(false);

  const filteredParticipants = useMemo(() => {
    return participants.filter(p => {
      const matchesEvent = selectedEventId === 'all' || p.eventId === selectedEventId;
      const matchesRole = selectedRole === 'all' || 
                         p.role === selectedRole || 
                         p.role?.toLowerCase() === selectedRole.toLowerCase() ||
                         ROLES.find(r => r.id === selectedRole)?.label.toLowerCase() === p.role?.toLowerCase();
      
      return matchesEvent && matchesRole;
    });
  }, [participants, selectedEventId, selectedRole]);

  const stats = useMemo(() => {
    const total = filteredParticipants.length;
    const attended = filteredParticipants.filter(p => p.attended).length;
    const attendanceRate = total > 0 ? Math.round((attended / total) * 100) : 0;
    
    const roleDistribution = ROLES.map(role => ({
      ...role,
      count: filteredParticipants.filter(p => 
        p.role === role.id || 
        p.role?.toLowerCase() === role.id.toLowerCase() ||
        p.role?.toLowerCase() === role.label.toLowerCase()
      ).length
    })).filter(r => r.count > 0);

    return { total, attended, attendanceRate, roleDistribution };
  }, [filteredParticipants]);

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      const eventName = selectedEventId === 'all' ? 'Todos los Eventos' : events.find(e => e.id === selectedEventId)?.name || 'Evento';
      
      // Header
      doc.setFontSize(22);
      doc.setTextColor(40);
      doc.text('Reporte de Participantes', 14, 22);
      
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Evento: ${eventName}`, 14, 30);
      doc.text(`Tipo de Reporte: ${reportType === 'general' ? 'Listado General' : 'Agrupado por Rol'}`, 14, 35);
      doc.text(`Fecha de generación: ${new Date().toLocaleString()}`, 14, 40);
      doc.text(`Total participantes: ${filteredParticipants.length}`, 14, 45);

      if (reportType === 'general') {
        const tableData = filteredParticipants.map((p, index) => [
          index + 1,
          p.name,
          p.idNumber,
          p.email,
          ROLES.find(r => 
            r.id.toLowerCase() === p.role?.toLowerCase() || 
            r.label.toLowerCase() === p.role?.toLowerCase()
          )?.label || p.role,
          '' // Checkbox column
        ]);

        autoTable(doc, {
          startY: 55,
          head: [['#', 'Nombre', 'Cédula', 'Email', 'Rol', 'Asistencia']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [245, 247, 250] },
          columnStyles: {
            0: { cellWidth: 10 },
            2: { cellWidth: 30 }, // Fixed width for Cédula
            4: { cellWidth: 40 },
            5: { cellWidth: 25 }
          },
          styles: { fontSize: 9 },
          didDrawCell: (data) => {
            if (data.section === 'body' && data.column.index === 5) {
              const size = 5;
              const x = data.cell.x + (data.cell.width / 2) - (size / 2);
              const y = data.cell.y + (data.cell.height / 2) - (size / 2);
              doc.setDrawColor(150);
              doc.rect(x, y, size, size);
            }
          },
          margin: { top: 50 }
        });
      } else {
        let currentY = 55;
        
        // Sort roles to maintain consistency and put 'asistente' at the end
        const participantRoles = Array.from(new Set(filteredParticipants.map(p => p.role))).sort((a, b) => {
          const roleA = (a || '').toLowerCase();
          const roleB = (b || '').toLowerCase();
          
          if (roleA === 'asistente') return 1;
          if (roleB === 'asistente') return -1;
          return roleA.localeCompare(roleB);
        });
        
        participantRoles.forEach((roleId, roleIndex) => {
          const roleParticipants = filteredParticipants
            .filter(p => p.role === roleId)
            .sort((a, b) => a.name.localeCompare(b.name));
            
          const roleInfo = ROLES.find(r => 
            r.id.toLowerCase() === roleId?.toLowerCase() || 
            r.label.toLowerCase() === roleId?.toLowerCase()
          );
          const roleLabel = roleInfo?.label || roleId;
          
          // Get role color (convert tailwind class to RGB approximately)
          let headerColor: [number, number, number] = [63, 63, 70]; // Default zinc-700
          if (roleInfo?.color.includes('indigo')) headerColor = [79, 70, 229];
          if (roleInfo?.color.includes('emerald')) headerColor = [16, 185, 129];
          if (roleInfo?.color.includes('amber')) headerColor = [245, 158, 11];
          if (roleInfo?.color.includes('rose')) headerColor = [225, 29, 72];
          if (roleInfo?.color.includes('purple')) headerColor = [147, 51, 234];

          if (roleParticipants.length > 0) {
            // Check if we need a new page (estimate table height)
            const estimatedHeight = 20 + (roleParticipants.length * 10);
            if (currentY + estimatedHeight > 270 && roleIndex > 0) {
              doc.addPage();
              currentY = 20;
            }

            // Role Header Decoration
            doc.setFillColor(...headerColor);
            doc.rect(14, currentY - 5, 3, 8, 'F');
            
            doc.setFontSize(14);
            doc.setTextColor(40);
            doc.setFont('helvetica', 'bold');
            doc.text(`${roleLabel}`, 20, currentY + 1);
            doc.setFontSize(9);
            doc.setTextColor(120);
            doc.text(`${roleParticipants.length} participantes`, 190, currentY + 1, { align: 'right' });
            doc.setFont('helvetica', 'normal');

            const tableData = roleParticipants.map((p, index) => [
              index + 1,
              p.name,
              p.idNumber,
              p.email,
              '' // Checkbox column
            ]);

            autoTable(doc, {
              startY: currentY + 6,
              head: [['#', 'Nombre', 'Cédula', 'Email', 'Asistencia']],
              body: tableData,
              theme: 'grid',
              headStyles: { 
                fillColor: headerColor, 
                textColor: 255,
                fontStyle: 'bold',
                halign: 'center'
              },
              columnStyles: {
                0: { cellWidth: 10, halign: 'center' },
                2: { cellWidth: 35 },
                4: { cellWidth: 25, halign: 'center' }
              },
              didDrawCell: (data) => {
                if (data.section === 'body' && data.column.index === 4) {
                  const size = 5;
                  const x = data.cell.x + (data.cell.width / 2) - (size / 2);
                  const y = data.cell.y + (data.cell.height / 2) - (size / 2);
                  doc.setDrawColor(100);
                  doc.setLineWidth(0.1);
                  doc.rect(x, y, size, size);
                }
              },
              margin: { left: 14, right: 14 },
              styles: { fontSize: 9, cellPadding: 3 }
            });
            
            currentY = (doc as any).lastAutoTable.finalY + 20;
          }
        });
      }

      // Add Page Numbers
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Página ${i} de ${pageCount}`, 105, 285, { align: 'center' });
        doc.text('CertiEvent - Sistema de Gestión de Eventos', 14, 285);
      }

      doc.save(`Reporte_${reportType}_${new Date().getTime()}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Módulo de Reportes</h2>
          <p className="text-zinc-500 font-medium mt-1">Analiza y exporta la información de tus eventos con precisión.</p>
        </div>
        <button
          onClick={generatePDF}
          disabled={isGenerating || filteredParticipants.length === 0}
          className="flex items-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          {isGenerating ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
          )}
          Exportar PDF
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900/50 border border-white/5 p-8 rounded-[32px] relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Users className="w-16 h-16 text-indigo-500" />
          </div>
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-2">Total Participantes</p>
          <h3 className="text-5xl font-black text-white tracking-tighter">{stats.total}</h3>
          <div className="mt-4 flex items-center gap-2 text-emerald-400 text-xs font-bold">
            <TrendingUp className="w-3 h-3" />
            <span>Filtrados actualmente</span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-zinc-900/50 border border-white/5 p-8 rounded-[32px] relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <CheckCircle2 className="w-16 h-16 text-emerald-500" />
          </div>
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-2">Asistencia Confirmada</p>
          <h3 className="text-5xl font-black text-white tracking-tighter">{stats.attended}</h3>
          <div className="mt-4 flex items-center gap-2 text-indigo-400 text-xs font-bold">
            <BarChart3 className="w-3 h-3" />
            <span>{stats.attendanceRate}% del total filtrado</span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-zinc-900/50 border border-white/5 p-8 rounded-[32px] relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Award className="w-16 h-16 text-purple-500" />
          </div>
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-2">Roles Únicos</p>
          <h3 className="text-5xl font-black text-white tracking-tighter">{stats.roleDistribution.length}</h3>
          <div className="mt-4 flex items-center gap-2 text-purple-400 text-xs font-bold">
            <PieChart className="w-3 h-3" />
            <span>Diversidad de participación</span>
          </div>
        </motion.div>
      </div>

      {/* Filters Bar */}
      <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-[32px] p-6">
        <div className="flex flex-col lg:flex-row items-center gap-6">
          <div className="flex items-center gap-2 min-w-max">
            <Filter className="w-4 h-4 text-indigo-400" />
            <h4 className="text-xs font-black text-white uppercase tracking-widest">Filtros</h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
            <div>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full bg-zinc-800 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              >
                <option value="all">Todos los Eventos</option>
                {events.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as Role | 'all')}
                className="w-full bg-zinc-800 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              >
                <option value="all">Todos los Roles</option>
                {ROLES.map(r => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as 'general' | 'grouped')}
                className="w-full bg-zinc-800 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
              >
                <option value="general">Listado General</option>
                <option value="grouped">Agrupado por Rol</option>
              </select>
            </div>

            <button
              onClick={() => {
                setSelectedEventId('all');
                setSelectedRole('all');
                setReportType('general');
              }}
              className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 border border-white/5 rounded-xl text-[10px] font-black text-zinc-400 hover:text-white uppercase tracking-widest transition-all"
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Content: Preview Table */}
        <div className="lg:col-span-3">
          <div className="bg-zinc-900/50 border border-white/5 rounded-[40px] overflow-hidden">
            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-zinc-900/30">
              <h4 className="text-sm font-black text-white uppercase tracking-widest">Vista Previa de Datos</h4>
              <span className="text-[10px] font-bold text-zinc-500 bg-zinc-800 px-3 py-1 rounded-full">
                {filteredParticipants.length} Registros encontrados
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 text-[10px] uppercase tracking-[0.2em] font-black text-zinc-500">
                    <th className="px-8 py-5">Participante</th>
                    <th className="px-8 py-5">Rol</th>
                    <th className="px-8 py-5">Evento</th>
                    <th className="px-8 py-5">Registro</th>
                    <th className="px-8 py-5 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredParticipants.slice(0, 10).map((p) => (
                    <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-black text-zinc-500 border border-white/5 group-hover:border-indigo-500/50 transition-colors">
                            {p.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{p.name}</p>
                            <p className="text-[10px] text-zinc-500 font-medium">{p.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className={cn(
                          "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border",
                          ROLES.find(r => 
                            r.id.toLowerCase() === p.role?.toLowerCase() || 
                            r.label.toLowerCase() === p.role?.toLowerCase()
                          )?.color || 'bg-zinc-800 text-zinc-400 border-white/5'
                        )}>
                          {ROLES.find(r => 
                            r.id.toLowerCase() === p.role?.toLowerCase() || 
                            r.label.toLowerCase() === p.role?.toLowerCase()
                          )?.label || p.role}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-xs text-zinc-400 font-medium truncate max-w-[150px]">
                          {events.find(e => e.id === p.eventId)?.name || 'N/A'}
                        </p>
                      </td>
                      <td className="px-8 py-5 text-xs text-zinc-500 font-mono">
                        {formatDate(p.registrationDate)}
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex justify-center">
                          {p.attended ? (
                            <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                          ) : (
                            <div className="w-2 h-2 bg-zinc-700 rounded-full" />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredParticipants.length > 10 && (
                    <tr>
                      <td colSpan={5} className="px-8 py-4 text-center bg-zinc-900/20">
                        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">
                          Y {filteredParticipants.length - 10} participantes más...
                        </p>
                      </td>
                    </tr>
                  )}
                  {filteredParticipants.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-16 h-16 bg-zinc-800/50 rounded-3xl flex items-center justify-center text-zinc-600">
                            <Search className="w-8 h-8" />
                          </div>
                          <p className="text-sm font-bold text-zinc-500">No se encontraron participantes con estos filtros</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar: Role Distribution */}
        <div className="lg:col-span-1">
          <div className="bg-zinc-900/40 border border-white/5 rounded-[32px] p-6 sticky top-8">
            <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">Distribución por Rol</h4>
            <div className="space-y-4">
              {stats.roleDistribution.map(role => (
                <div key={role.id} className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-zinc-400">{role.label}</span>
                    <span className="text-white">{role.count}</span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full transition-all duration-1000", role.color.split(' ')[0])}
                      style={{ width: `${(role.count / stats.total) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

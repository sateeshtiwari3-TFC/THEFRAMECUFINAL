import React, { useRef, useState } from 'react';
import { 
  Printer, 
  FileText, 
  X, 
  Check, 
  Copy, 
  Sparkles, 
  Calendar, 
  Clock, 
  User, 
  HardDrive, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  Film,
  Building2,
  FileEdit,
  CheckSquare,
  Award
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Project, Revision, Studio, Editor } from '../types';
import { captureElementToCanvas } from '../utils/pdfExport';

interface ProjectWorksheetModalProps {
  project: Project | null;
  revisions?: Revision[];
  studios?: Studio[];
  editors?: Editor[];
  isOpen: boolean;
  onClose: () => void;
  onOpenClientPreview?: (projectId: string) => void;
}

export const ProjectWorksheetModal: React.FC<ProjectWorksheetModalProps> = ({
  project,
  revisions = [],
  studios = [],
  editors = [],
  isOpen,
  onClose,
  onOpenClientPreview
}) => {
  const worksheetRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !project) return null;

  const projectRevisions = revisions.filter(r => r.projectId === project.id);
  const studio = studios.find(s => s.id === project.studioId);
  const editor = editors.find(e => e.id === project.assignedEditorId);

  // Format dates cleanly
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'TBD';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    if (!worksheetRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await captureElementToCanvas(worksheetRef.current, {
        scale: 2,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const cleanCoupleName = project.coupleName ? project.coupleName.replace(/[^a-zA-Z0-9]/g, '_') : 'Wedding';
      pdf.save(`Wedding_Worksheet_${cleanCoupleName}_${project.id}.pdf`);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      // Fallback to native print
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopySummary = () => {
    const summary = `🎬 *THE FRAME CUT STUDIO - WEDDING WORKSHEET*
📌 *Project:* ${project.projectName || project.coupleName}
👰🤵 *Couple:* ${project.coupleName} (${project.groomName || ''} & ${project.brideName || ''})
📍 *Event Type:* ${project.eventType}
📅 *Shoot Date:* ${formatDate(project.shootDate)}
⏰ *Handover Deadline:* ${formatDate(project.deliveryDate)}
🏢 *Studio Partner:* ${project.studioName}
👨‍💻 *Lead Editor:* ${project.assignedEditorName || 'Unassigned'}
${project.isSplitProject ? `👨‍💻 *Secondary Editor:* ${project.secondEditorName || 'Unassigned'}\n` : ''}
💾 *Hard Disk Ref:* ${project.hardDiskName || 'N/A'} (${project.dataSize || 'N/A'})
📊 *Status:* ${project.status.toUpperCase()} (Priority: ${project.priority.toUpperCase()})

📝 *Editor & Production Notes:*
${project.notes || 'No notes logged.'}

📋 *Milestones:*
• Shoot Date: ${formatDate(project.shootDate)}
${(project.customMilestones || []).map(m => `• ${m.label}: ${m.completed ? '✅ Done' : '⏳ Pending'}`).join('\n')}
• Final Delivery Deadline: ${formatDate(project.deliveryDate)}

🔄 *Revisions Log (${projectRevisions.length}):*
${projectRevisions.map(r => `• REV-#${r.revisionNumber} (${r.date}): ${r.notes} [${r.status === 'resolved' ? 'Fixed' : 'Pending'}]`).join('\n') || 'None'}
`;

    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static">
      {/* Modal Container */}
      <div className="relative w-full max-w-4xl bg-charcoal-900 border border-gold-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] print:max-h-none print:shadow-none print:border-none print:rounded-none print:w-full">
        
        {/* Top Control Header Toolbar (Hidden in Print) */}
        <div className="p-4 sm:p-5 bg-charcoal-950 border-b border-gold-500/20 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-gold-500/10 text-gold-400 rounded-xl border border-gold-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[9px] font-mono tracking-widest text-gold-400 uppercase font-bold bg-gold-500/10 px-2 py-0.5 rounded border border-gold-500/20">
                Official Production Document
              </span>
              <h3 className="text-sm sm:text-base font-bold text-white font-display mt-0.5">
                Branded Wedding Worksheet
              </h3>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {onOpenClientPreview && (
              <button
                onClick={() => {
                  onClose();
                  onOpenClientPreview(project.id);
                }}
                className="px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs transition-all cursor-pointer flex items-center space-x-1.5"
                title="View read-only client preview portal"
              >
                <Film className="w-4 h-4 text-emerald-400" />
                <span>Client Preview</span>
              </button>
            )}

            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-gold-500 text-emerald-950 font-bold text-xs hover:bg-gold-400 transition-all cursor-pointer flex items-center space-x-1.5 shadow-md"
              title="Print directly or save as PDF using browser"
            >
              <Printer className="w-4 h-4" />
              <span>Print to PDF</span>
            </button>

            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="px-3 py-2 rounded-xl bg-charcoal-900 hover:bg-charcoal-800 border border-gold-500/30 text-gold-400 font-bold text-xs transition-all cursor-pointer flex items-center space-x-1.5"
            >
              <FileText className="w-4 h-4" />
              <span>{isExporting ? 'Generating PDF...' : 'Download File'}</span>
            </button>

            <button
              onClick={handleCopySummary}
              className="px-3 py-2 rounded-xl bg-charcoal-900 hover:bg-charcoal-800 border border-white/10 text-gray-300 font-bold text-xs transition-all cursor-pointer flex items-center space-x-1.5"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
              <span>{copied ? 'Copied!' : 'Copy Specs'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-charcoal-900 hover:bg-red-500/20 text-gray-400 hover:text-red-400 border border-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Worksheet Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-charcoal-950/50 custom-scrollbar print:overflow-visible print:p-0 print:bg-white">
          <div 
            ref={worksheetRef}
            className="w-full max-w-3xl mx-auto bg-white text-slate-900 rounded-2xl p-6 sm:p-10 shadow-xl border border-amber-200/60 font-sans print:shadow-none print:border-none print:p-0 print:w-full print:max-w-none"
            style={{ color: '#0f172a' }}
          >
            {/* BRANDING HEADER */}
            <div className="border-b-2 border-amber-500/30 pb-6 mb-6 flex justify-between items-start flex-wrap gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-lg font-serif">
                    F
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-slate-900 font-serif leading-none">
                      THE FRAME CUT STUDIO
                    </h1>
                    <p className="text-[10px] font-mono text-amber-600 font-bold uppercase tracking-widest mt-0.5">
                      Cinematic Wedding Film Registry & Production Suite
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 font-sans pt-1">
                  Official Editorial Specification Worksheet & Production Roadmap
                </p>
              </div>

              <div className="text-right border-l-2 border-amber-500/20 pl-4 space-y-1">
                <span className="inline-block px-2.5 py-0.5 bg-amber-100 text-amber-900 font-mono font-bold text-xs rounded border border-amber-300 uppercase">
                  {project.id}
                </span>
                <p className="text-[10px] text-slate-500 font-mono">Issued: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                <div className="flex items-center justify-end space-x-1 text-[10px] font-mono font-bold">
                  <span className="text-slate-500">Priority:</span>
                  <span className={`uppercase ${
                    project.priority === 'urgent' ? 'text-red-600 font-black' :
                    project.priority === 'high' ? 'text-amber-600 font-bold' : 'text-emerald-700'
                  }`}>
                    {project.priority}
                  </span>
                </div>
              </div>
            </div>

            {/* WEDDING & COUPLE OVERVIEW */}
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 mb-6 relative overflow-hidden">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-2 flex-1">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-amber-700 font-bold block">
                    Wedding Couple & Film Title
                  </span>
                  <h2 className="text-2xl font-bold font-serif text-slate-900">
                    {project.projectName || `${project.coupleName} Wedding Film`}
                  </h2>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-700 font-medium">
                    <span>👰 Groom & Bride: <strong>{project.coupleName}</strong></span>
                    {project.groomName && project.brideName && (
                      <span className="text-slate-500 font-mono">({project.groomName} & {project.brideName})</span>
                    )}
                    <span>📍 Event: <strong>{project.eventType}</strong></span>
                  </div>
                </div>

                {project.couplePhoto && (
                  <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-amber-400 shrink-0 shadow-sm print:w-16 print:h-16">
                    <img src={project.couplePhoto} alt="Couple" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* Specs Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">Studio Partner</span>
                  <p className="font-bold text-slate-800">{project.studioName}</p>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">Lead Editor</span>
                  <p className="font-bold text-slate-800">{project.assignedEditorName || 'Unassigned'}</p>
                  {project.isSplitProject && (
                    <span className="text-[10px] text-amber-700 font-mono block font-semibold">
                      Split: {project.secondEditorName}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">Shoot Start Date</span>
                  <p className="font-bold text-emerald-700">{formatDate(project.shootDate)}</p>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">Delivery Deadline</span>
                  <p className="font-bold text-amber-700">{formatDate(project.deliveryDate)}</p>
                </div>
              </div>
            </div>

            {/* MILESTONES & PRODUCTION TIMELINE TABLE */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-900 flex items-center space-x-1.5">
                  <CheckSquare className="w-4 h-4 text-amber-600" />
                  <span>Production Milestones & Roadmap</span>
                </h3>
                <span className="text-[11px] font-mono text-slate-500 font-semibold">
                  Status: <strong className="text-amber-700 uppercase">{project.status.replace('_', ' ')}</strong>
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-x-auto custom-scrollbar shadow-sm">
                <table className="w-full min-w-[540px] text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-mono text-[10px] uppercase">
                      <th className="p-3 font-bold">Milestone Stage</th>
                      <th className="p-3 font-bold">Target / Date</th>
                      <th className="p-3 font-bold">Current Status</th>
                      <th className="p-3 font-bold">Verification Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {/* Shoot Milestone */}
                    <tr className="bg-emerald-50/40">
                      <td className="p-3 font-bold text-slate-900">1. Production Shoot</td>
                      <td className="p-3 font-mono font-medium">{formatDate(project.shootDate)}</td>
                      <td className="p-3">
                        <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-bold text-[10px]">
                          ✓ COMPLETED
                        </span>
                      </td>
                      <td className="p-3 text-slate-600">Location: {project.location || 'Logged in ERP'}</td>
                    </tr>

                    {/* Custom Milestones */}
                    {(project.customMilestones && project.customMilestones.length > 0) ? (
                      project.customMilestones.map((ms, index) => (
                        <tr key={ms.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                          <td className="p-3 font-medium text-slate-900">{index + 2}. {ms.label}</td>
                          <td className="p-3 font-mono text-slate-600">
                            {ms.completedAt ? formatDate(ms.completedAt) : formatDate(project.deliveryDate)}
                          </td>
                          <td className="p-3">
                            {ms.completed ? (
                              <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-bold text-[10px]">
                                ✓ DONE
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-mono font-bold text-[10px]">
                                ⏳ PENDING
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-slate-600">
                            {ms.completed 
                              ? `Completed on ${formatDate(ms.completedAt)}` 
                              : 'In progress editor workflow'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-3 text-center text-slate-500 font-mono italic text-[11px]">
                          No additional custom milestones defined. Standard editing workflow applies.
                        </td>
                      </tr>
                    )}

                    {/* Final Delivery Deadline */}
                    <tr className="bg-amber-50/50">
                      <td className="p-3 font-bold text-slate-900">
                        {(project.customMilestones?.length || 0) + 2}. Final Delivery Handover
                      </td>
                      <td className="p-3 font-mono font-bold text-amber-800">{formatDate(project.deliveryDate)}</td>
                      <td className="p-3">
                        <span className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                          ['delivered', 'closed'].includes(project.status) 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-slate-200 text-slate-800'
                        }`}>
                          {['delivered', 'closed'].includes(project.status) ? '✓ DELIVERED' : '🎯 DEADLINE TARGET'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600">Master Export & Studio Handover</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* REVISIONS LOG SECTION */}
            <div className="mb-6">
              <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-900 mb-3 flex items-center space-x-1.5">
                <FileEdit className="w-4 h-4 text-amber-600" />
                <span>Client Revisions & Change Requests ({projectRevisions.length})</span>
              </h3>

              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-3">
                {projectRevisions.length > 0 ? (
                  projectRevisions.map((rev) => (
                    <div key={rev.id} className="p-3 bg-white rounded-lg border border-slate-200 flex justify-between items-start gap-3">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-mono font-bold text-amber-700 text-xs">REV-#{rev.revisionNumber}</span>
                          <span className="text-[10px] text-slate-500 font-mono">Date: {formatDate(rev.date)}</span>
                        </div>
                        <p className="text-xs text-slate-800 font-sans leading-relaxed">{rev.notes}</p>
                      </div>

                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                        rev.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {rev.status === 'resolved' ? '✓ RESOLVED' : '⚠️ PENDING'}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 font-mono italic text-center py-2">
                    No client revisions logged. Baseline video specification stands unchanged.
                  </p>
                )}
              </div>
            </div>

            {/* STORAGE & DATA MANAGEMENT */}
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60">
                <h4 className="text-[11px] font-bold uppercase tracking-wider font-mono text-slate-800 mb-2 flex items-center space-x-1">
                  <HardDrive className="w-3.5 h-3.5 text-slate-600" />
                  <span>Physical Storage & Hard Disk</span>
                </h4>
                <div className="space-y-1 text-xs text-slate-700">
                  <p>HDD Ref Code: <strong className="text-slate-900">{project.hardDiskName || 'Unlogged'}</strong></p>
                  <p>Raw Footage Size: <strong className="text-slate-900">{project.dataSize || 'Unmeasured'}</strong></p>
                  <p>Backup Status: <strong className={project.backupStatus === 'backed_up' ? 'text-emerald-700' : 'text-amber-700'}>
                    {project.backupStatus === 'backed_up' ? 'Verified Backed Up' : 'Pending Physical Backup'}
                  </strong></p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60">
                <h4 className="text-[11px] font-bold uppercase tracking-wider font-mono text-slate-800 mb-2 flex items-center space-x-1">
                  <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
                  <span>Cloud & Delivery Folders</span>
                </h4>
                <div className="space-y-1 text-xs text-slate-700">
                  {project.googleDriveLink ? (
                    <p className="truncate">Drive: <a href={project.googleDriveLink} target="_blank" rel="noreferrer" className="text-blue-600 underline font-mono text-[11px]">{project.googleDriveLink}</a></p>
                  ) : (
                    <p className="text-slate-500 italic">No Google Drive link attached</p>
                  )}
                  {project.deliveryFolder && <p>Delivery Folder: <strong className="font-mono text-slate-800">{project.deliveryFolder}</strong></p>}
                  {project.finalExportFolder && <p>Export Folder: <strong className="font-mono text-slate-800">{project.finalExportFolder}</strong></p>}
                </div>
              </div>
            </div>

            {/* EDITOR & PRODUCTION NOTES */}
            {project.notes && (
              <div className="mb-6 border border-slate-200 rounded-xl p-4 bg-amber-50/40">
                <h4 className="text-[11px] font-bold uppercase tracking-wider font-mono text-amber-900 mb-1">
                  Editorial & Client Special Instructions
                </h4>
                <p className="text-xs text-slate-800 font-sans leading-relaxed whitespace-pre-line">
                  {project.notes}
                </p>
              </div>
            )}

            {/* SIGNATURE & SIGN-OFF BLOCK */}
            <div className="pt-6 border-t border-slate-300 mt-8 grid grid-cols-2 gap-8 text-xs">
              <div>
                <p className="text-[10px] text-slate-500 font-mono uppercase mb-8">Lead Editor Signature</p>
                <div className="border-b border-slate-400 pb-1">
                  <span className="font-bold text-slate-900">{project.assignedEditorName || 'Lead Editor'}</span>
                </div>
                <p className="text-[9px] text-slate-400 font-mono mt-1">Authorized Video Editor</p>
              </div>

              <div className="text-right">
                <p className="text-[10px] text-slate-500 font-mono uppercase mb-8">Studio Director Sign-Off</p>
                <div className="border-b border-slate-400 pb-1">
                  <span className="font-bold text-slate-900">{project.studioName}</span>
                </div>
                <p className="text-[9px] text-slate-400 font-mono mt-1">Production Supervisor</p>
              </div>
            </div>

            {/* FOOTER DISCLOSURE */}
            <div className="mt-8 pt-4 border-t border-slate-200 text-center text-[9px] text-slate-400 font-mono">
              The Frame Cut Studio • Confidential Wedding Production Worksheet • Document ID: {project.id}
            </div>

          </div>
        </div>

        {/* Modal Bottom Footer (Hidden in Print) */}
        <div className="p-4 bg-charcoal-950 border-t border-gold-500/20 flex justify-between items-center shrink-0 print:hidden">
          <span className="text-[10px] text-gray-400 font-mono">
            Tip: Select "Save as PDF" in your print dialog for native high-resolution PDF output.
          </span>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-charcoal-900 hover:bg-charcoal-800 text-gray-300 font-bold text-xs cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2 rounded-xl bg-gold-500 text-emerald-950 font-bold text-xs hover:bg-gold-400 transition-all cursor-pointer flex items-center space-x-1.5 shadow-md"
            >
              <Printer className="w-4 h-4" />
              <span>Print to PDF</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProjectWorksheetModal;

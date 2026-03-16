import React from 'react';
import { X, FileText, CheckCircle2 } from 'lucide-react';

const ContextPanel = ({ documents, selectedDocs, onToggleDoc, onClose, onClearAll }) => {
  const readyDocs = documents.filter(d => d.status === 'completed');

  return (
    <div className="absolute right-4 top-20 bottom-24 w-72 bg-slate-900 rounded-2xl shadow-2xl z-30 flex flex-col overflow-hidden animate-slide-in-right border border-white/5">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <div>
                <h3 className="text-sm font-semibold text-white">Active Sources</h3>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">Select documents for context</p>
            </div>
            <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                <X size={16} />
            </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {readyDocs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-10 opacity-50">
                    <FileText size={32} className="text-slate-500 mb-3" />
                    <p className="text-[11px] text-slate-500 font-medium text-center px-4">No processed documents found.</p>
                </div>
            ) : (
                readyDocs.map(doc => {
                    const isSelected = selectedDocs.includes(doc.id);
                    return (
                        <div
                            key={doc.id}
                            onClick={() => onToggleDoc(doc.id)}
                            className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                                isSelected
                                    ? 'bg-primary-600/10 border-primary-500/20 shadow-sm'
                                    : 'bg-transparent border-transparent hover:bg-white/5'
                            }`}
                        >
                            <div className="flex items-center space-x-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isSelected ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                                    <FileText size={14} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className={`text-xs font-medium truncate transition-colors ${isSelected ? 'text-white' : 'text-slate-300'}`}>{doc.title}</p>
                                    <div className="flex items-center space-x-2 mt-0.5 opacity-80">
                                        <span className="text-[10px] text-slate-500 font-medium">{doc.file_type}</span>
                                        <span className="text-[10px] text-slate-600 leading-none">•</span>
                                        <span className="text-[10px] text-slate-500 font-medium">{doc.chunk_count} Sections</span>
                                    </div>
                                </div>
                                {isSelected && (
                                    <CheckCircle2 size={14} className="text-primary-500 flex-shrink-0" />
                                )}
                            </div>
                        </div>
                    );
                })
            )}
        </div>
        <div className="p-3 border-t border-white/5">
            <button
                onClick={onClearAll}
                disabled={selectedDocs.length === 0}
                className="w-full h-8 text-xs font-medium text-slate-400 hover:text-slate-200 transition-all disabled:opacity-30 flex items-center justify-center rounded-lg hover:bg-white/5"
            >
                Clear Selection
            </button>
        </div>
    </div>
  );
};

export default ContextPanel;

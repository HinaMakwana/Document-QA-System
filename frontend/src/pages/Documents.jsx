import React, { useState, useEffect } from 'react';
import {
  FileText,
  Upload,
  Trash2,
  Eye,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  Search,
  RefreshCw,
  MoreVertical,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { documentApi } from '../services/api';

const Documents = () => {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        try {
            setLoading(true);
            const res = await documentApi.list();
            setDocuments(res.results || []);
        } catch (error) {
            console.error("Error fetching documents", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e) => {
        const files = e.target.files;
        if (!files.length) return;

        setUploading(true);

        try {
            for (let i = 0; i < files.length; i++) {
                const formData = new FormData();
                formData.append('file', files[i]);
                formData.append('title', files[i].name);
                await documentApi.upload(formData);
            }
            fetchDocuments();
        } catch (error) {
            console.error("Upload error", error);
            alert("Failed to upload. Please check file type and size.");
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure? This will remove all embeddings too.")) return;
        try {
            await documentApi.delete(id);
            setDocuments(prev => prev.filter(doc => doc.id !== id));
        } catch (error) {
            console.error("Delete error", error);
        }
    };

    const handleReprocess = async (id) => {
        try {
            await documentApi.reprocess(id);
            alert("Reprocessing started.");
            fetchDocuments();
        } catch (error) {
            console.error("Reprocess error", error);
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            completed: 'bg-green-500/10 text-green-500 border-green-500/20',
            processing: 'bg-primary-500/10 text-primary-500 border-primary-500/20',
            failed: 'bg-red-500/10 text-red-500 border-red-500/20',
            pending: 'bg-slate-500/10 text-slate-500 border-slate-500/20'
        };
        const icons = {
            completed: <CheckCircle size={12} className="mr-1" />,
            processing: <Loader2 size={12} className="mr-1 animate-spin" />,
            failed: <AlertCircle size={12} className="mr-1" />,
            pending: <Clock size={12} className="mr-1" />
        };

        return (
            <div className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${styles[status] || styles.pending}`}>
                {icons[status]}
                {status}
            </div>
        );
    };

    const filteredDocs = documents.filter(doc =>
        doc.title.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto space-y-10 md:space-y-12 animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div>
                    <h1 className="text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-2">Knowledge Bank</h1>
                    <p className="text-slate-400 font-medium tracking-wide">Orchestrate and calibrate your document vector space.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                    <div className="relative flex-1 sm:flex-none">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="Identify protocol..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="glass-input pl-12 pr-6 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-primary-500/30 transition-all w-full sm:w-80 text-white font-bold tracking-tight"
                        />
                    </div>
                    <label className={`h-14 px-8 rounded-2xl flex items-center justify-center cursor-pointer transition-all shadow-2xl ${
                        uploading ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-500 text-white shadow-primary-600/30 hover:scale-105 active:scale-95'
                    }`}>
                        {uploading ? <Loader2 className="animate-spin mr-3" size={20} /> : <Upload className="mr-3" size={20} />}
                        <span className="font-black text-xs uppercase tracking-[0.2em]">{uploading ? 'Syncing...' : 'Upload Data'}</span>
                        <input type="file" className="hidden" multiple accept=".pdf,.docx,.doc,.txt" onChange={handleUpload} disabled={uploading} />
                    </label>
                </div>
            </div>

            {/* Content Area */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="glass-panel p-8 rounded-[2.5rem] animate-pulse h-56 border-white/5"></div>
                    ))}
                </div>
            ) : filteredDocs.length === 0 ? (
                <div className="glass-panel rounded-[3rem] border-dashed border-white/10 py-32 text-center group">
                    <div className="w-24 h-24 bg-slate-900/50 rounded-full flex items-center justify-center mx-auto mb-8 text-slate-700 ring-1 ring-white/5 shadow-inner transition-all group-hover:scale-110">
                        <FileText size={48} />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">Void Detected</h3>
                    <p className="text-slate-500 max-w-sm mx-auto font-medium">Embed neural data by uploading PDF, Word, or Text files to initialize the retrieval model.</p>
                </div>
            ) : (
                <>
                    {/* Desktop Table View */}
                    <div className="hidden lg:block glass-panel rounded-[2.5rem] shadow-2xl overflow-hidden border-white/5">
                        <table className="w-full text-left">
                            <thead className="bg-slate-900/40 border-b border-white/5 text-slate-500 uppercase tracking-[0.3em] font-black italic">
                                <tr>
                                    <th className="px-10 py-6 text-[10px]">Data Node</th>
                                    <th className="px-10 py-6 text-[10px] text-center">Payload</th>
                                    <th className="px-10 py-6 text-[10px] text-center">Synapses</th>
                                    <th className="px-10 py-6 text-[10px]">Status</th>
                                    <th className="px-10 py-6 text-[10px] text-right">Access</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredDocs.map((doc) => (
                                    <tr key={doc.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-10 py-7">
                                            <div className="flex items-center space-x-6">
                                                <div className="w-14 h-14 bg-primary-600/10 text-primary-400 rounded-2xl flex items-center justify-center ring-1 ring-primary-500/10 shadow-inner group-hover:bg-primary-600 group-hover:text-white transition-all">
                                                    <FileText size={24} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-base font-bold text-white truncate max-w-md tracking-tight italic">{doc.title}</p>
                                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.1em] mt-1">
                                                        Added {format(new Date(doc.created_at), 'MMM dd, h:mm a')}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-7 text-sm font-bold text-slate-400 text-center tracking-wider">
                                            {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                                        </td>
                                        <td className="px-10 py-7 text-sm font-bold text-slate-400 text-center font-mono tracking-tighter">
                                            {doc.chunk_count || '--'}
                                        </td>
                                        <td className="px-10 py-7">
                                            {getStatusBadge(doc.status)}
                                        </td>
                                        <td className="px-10 py-7 text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                                {doc.status === 'failed' && (
                                                    <button onClick={() => handleReprocess(doc.id)} className="w-10 h-10 flex items-center justify-center text-primary-400 hover:bg-slate-800 rounded-xl transition-all" title="Reprocess">
                                                        <RefreshCw size={18} />
                                                    </button>
                                                )}
                                                <button onClick={() => window.open(doc.file, '_blank')} className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-all" title="Review Base Data">
                                                    <Eye size={18} />
                                                </button>
                                                <button onClick={() => handleDelete(doc.id)} className="w-10 h-10 flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all" title="Purge Node">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile/Tablet Card View */}
                    <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredDocs.map((doc) => (
                            <div key={doc.id} className="glass-panel p-8 rounded-[2.5rem] relative overflow-hidden group">
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-12 h-12 bg-primary-600/10 text-primary-400 rounded-xl flex items-center justify-center ring-1 ring-primary-500/10">
                                            <FileText size={24} />
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="text-base font-bold text-white truncate max-w-[150px] tracking-tight italic">{doc.title}</h4>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{doc.file_type}</p>
                                        </div>
                                    </div>
                                    {getStatusBadge(doc.status)}
                                </div>
                                <div className="flex justify-between text-[11px] font-bold py-5 border-y border-white/5 px-2">
                                    <div className="text-slate-500 uppercase tracking-widest">
                                        Payload: <span className="text-slate-200">{(doc.file_size / 1024).toFixed(1)} KB</span>
                                    </div>
                                    <div className="text-slate-500 uppercase tracking-widest">
                                        Synapses: <span className="text-slate-200 font-mono italic">{doc.chunk_count || 0}</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between pt-6">
                                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] italic">
                                        {format(new Date(doc.created_at), 'MMM dd, yyyy')}
                                    </span>
                                    <div className="flex space-x-3">
                                        <button onClick={() => window.open(doc.file, '_blank')} className="w-10 h-10 flex items-center justify-center bg-slate-800 text-slate-300 rounded-xl hover:bg-white/10 transition-all">
                                             <Eye size={18} />
                                        </button>
                                        <button onClick={() => handleDelete(doc.id)} className="w-10 h-10 flex items-center justify-center bg-red-950/20 text-red-500 rounded-xl border border-red-900/30 hover:bg-red-500 hover:text-white transition-all">
                                             <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default Documents;

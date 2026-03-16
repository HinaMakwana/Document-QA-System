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
        if (!window.confirm("Are you sure? This will remove all processed data too.")) return;
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
            completed: <CheckCircle size={12} className="mr-1.5" />,
            processing: <Loader2 size={12} className="mr-1.5 animate-spin" />,
            failed: <AlertCircle size={12} className="mr-1.5" />,
            pending: <Clock size={12} className="mr-1.5" />
        };

        return (
            <div className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider ${styles[status] || styles.pending}`}>
                {icons[status]}
                {status}
            </div>
        );
    };

    const filteredDocs = documents.filter(doc =>
        doc.title.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Knowledge Base</h1>
                    <p className="text-slate-400 font-medium tracking-tight">Manage and organize your documents for contextual analysis.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative flex-1 sm:flex-none">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input
                            type="text"
                            placeholder="Search documents..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="glass-input pl-10 pr-6 h-12 rounded-xl outline-none focus:ring-1 focus:ring-primary-500/30 transition-all w-full sm:w-64 text-sm text-white font-medium placeholder-slate-600"
                        />
                    </div>
                    <label className={`h-12 px-6 rounded-xl flex items-center justify-center cursor-pointer transition-all ${
                        uploading ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-500 text-white shadow-lg shadow-primary-600/20 active:scale-95'
                    }`}>
                        {uploading ? <Loader2 className="animate-spin mr-2" size={18} /> : <Upload className="mr-2" size={18} />}
                        <span className="font-bold text-xs uppercase tracking-wider">{uploading ? 'Uploading...' : 'Upload Files'}</span>
                        <input type="file" className="hidden" multiple accept=".pdf,.docx,.doc,.txt" onChange={handleUpload} disabled={uploading} />
                    </label>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="glass-panel p-6 rounded-3xl animate-pulse h-48 border-white/5"></div>
                    ))}
                </div>
            ) : filteredDocs.length === 0 ? (
                <div className="glass-panel rounded-3xl border-dashed border-white/10 py-24 text-center group">
                    <div className="w-20 h-20 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-6 text-slate-700 border border-white/5 shadow-inner transition-all group-hover:scale-110">
                        <FileText size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2 tracking-tight italic">No documents found</h3>
                    <p className="text-slate-500 max-w-xs mx-auto text-sm font-medium leading-relaxed">Upload PDF, Word, or Text files to start training your assistant on your own data.</p>
                </div>
            ) : (
                <div className="glass-panel rounded-3xl shadow-xl overflow-hidden border-white/5">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-900/40 border-b border-white/5 text-slate-500 uppercase tracking-wider font-bold">
                                <tr>
                                    <th className="px-8 py-5 text-[10px]">Document Name</th>
                                    <th className="px-8 py-5 text-[10px] text-center">Format</th>
                                    <th className="px-8 py-5 text-[10px] text-center">Sections</th>
                                    <th className="px-8 py-5 text-[10px]">Status</th>
                                    <th className="px-8 py-5 text-[10px] text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredDocs.map((doc) => (
                                    <tr key={doc.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center space-x-4">
                                                <div className="w-10 h-10 bg-primary-600/10 text-primary-400 rounded-xl flex items-center justify-center border border-primary-500/10 group-hover:bg-primary-600 group-hover:text-white transition-all">
                                                    <FileText size={18} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-white truncate max-w-md tracking-tight">{doc.title}</p>
                                                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">
                                                        Added {format(new Date(doc.created_at), 'MMM dd, yyyy')}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-[11px] font-bold text-slate-400 text-center uppercase tracking-widest">
                                            {doc.file_type}
                                        </td>
                                        <td className="px-8 py-6 text-sm font-bold text-slate-400 text-center font-mono">
                                            {doc.chunk_count || '--'}
                                        </td>
                                        <td className="px-8 py-6">
                                            {getStatusBadge(doc.status)}
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end space-x-1">
                                                {doc.status === 'failed' && (
                                                    <button onClick={() => handleReprocess(doc.id)} className="p-2 text-primary-400 hover:bg-primary-500/10 rounded-lg transition-all" title="Retry">
                                                        <RefreshCw size={16} />
                                                    </button>
                                                )}
                                                <button onClick={() => window.open(doc.file, '_blank')} className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all" title="View">
                                                    <Eye size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(doc.id)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all" title="Delete">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};


export default Documents;

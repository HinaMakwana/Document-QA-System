import React, { useState, useEffect } from 'react';
import { History as HistoryIcon, MessageSquare, Calendar, ChevronRight, Search, Trash2, Loader2 } from 'lucide-react';
import { conversationApi } from '../services/api';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const History = () => {
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchConversations();
    }, []);

    const fetchConversations = async () => {
        try {
            setLoading(true);
            const res = await conversationApi.list();
            setConversations(res.results || []);
        } catch (error) {
            console.error("Error fetching history", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm("Delete this conversation history?")) return;
        try {
            await conversationApi.delete(id);
            setConversations(prev => prev.filter(c => c.id !== id));
        } catch (error) {
            console.error("Delete error", error);
        }
    };

    const filteredConvs = conversations.filter(c =>
        c.title.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="max-w-4xl mx-auto space-y-10 animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Chat History</h1>
                    <p className="text-slate-400 font-medium tracking-tight">Review and manage your previous document interactions.</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input
                        type="text"
                        placeholder="Search chats..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="glass-input pl-10 pr-6 h-12 rounded-xl outline-none focus:ring-1 focus:ring-primary-500/30 transition-all w-full md:w-64 text-sm text-white font-medium placeholder-slate-600"
                    />
                </div>
            </div>

            <div className="grid gap-4">
                {loading ? (
                    Array(4).fill(0).map((_, i) => (
                        <div key={i} className="glass-panel p-6 rounded-2xl animate-pulse h-28 border-white/5"></div>
                    ))
                ) : filteredConvs.length === 0 ? (
                    <div className="glass-panel py-20 text-center rounded-3xl border border-dashed border-white/10 group">
                        <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-6 text-slate-700 border border-white/5 shadow-inner group-hover:scale-110 transition-transform">
                            <HistoryIcon size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2 tracking-tight">No conversations found</h3>
                        <p className="text-slate-500 max-w-xs mx-auto text-sm font-medium">Your previous chats will appear here once you start interacting with your documents.</p>
                    </div>
                ) : (
                    filteredConvs.map((conv) => (
                        <div
                            key={conv.id}
                            onClick={() => navigate('/')}
                            className="glass-panel p-6 rounded-2xl hover:bg-white/[0.03] transition-all cursor-pointer group shadow-lg border-white/5 relative overflow-hidden"
                        >
                            <div className="flex items-center justify-between relative z-10">
                                <div className="flex items-center space-x-5">
                                    <div className="w-12 h-12 bg-primary-600/10 text-primary-400 rounded-xl flex items-center justify-center border border-primary-500/10 group-hover:bg-primary-600 group-hover:text-white transition-all">
                                        <MessageSquare size={22} />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-base font-bold text-white tracking-tight group-hover:text-primary-400 transition-colors truncate max-w-md">{conv.title}</h3>
                                        <div className="flex items-center space-x-4 mt-1">
                                            <div className="flex items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                                <Calendar size={12} className="mr-1.5 text-slate-600" />
                                                {format(new Date(conv.created_at), 'MMMM dd, yyyy')}
                                            </div>
                                            <div className="flex items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                                <div className="w-1.5 h-1.5 bg-primary-500 rounded-full mr-2"></div>
                                                {conv.total_messages} Messages
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={(e) => handleDelete(e, conv.id)}
                                        className="w-10 h-10 flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                                        title="Delete History"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                    <div className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-lg text-slate-700 group-hover:text-primary-400 group-hover:bg-primary-600/10 transition-all">
                                        <ChevronRight size={20} className="transform group-hover:translate-x-0.5 transition-transform" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};


export default History;

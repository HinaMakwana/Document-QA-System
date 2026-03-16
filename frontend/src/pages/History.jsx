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
        <div className="max-w-5xl mx-auto space-y-12 animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div>
                    <h1 className="text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-2 italic">Neural Archives</h1>
                    <p className="text-slate-400 font-medium tracking-wide">Telemetry logs of past cognitive document interactions.</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                        type="text"
                        placeholder="Recall mission..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="glass-input pl-12 pr-6 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-primary-500/30 transition-all w-full md:w-80 text-white font-bold tracking-tight italic"
                    />
                </div>
            </div>

            <div className="grid gap-6">
                {loading ? (
                    Array(4).fill(0).map((_, i) => (
                        <div key={i} className="glass-panel p-10 rounded-[2.5rem] animate-pulse h-32 border-white/5"></div>
                    ))
                ) : filteredConvs.length === 0 ? (
                    <div className="glass-panel p-20 text-center rounded-[3rem] border border-white/5">
                        <div className="w-24 h-24 bg-slate-900/50 rounded-full flex items-center justify-center mx-auto mb-8 text-slate-700 ring-1 ring-white/5 shadow-inner">
                            <HistoryIcon size={48} />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-3">No Recorded History</h3>
                        <p className="text-slate-500 max-w-sm mx-auto font-medium lowercase italic">The neural network awaits its first initialization.</p>
                    </div>
                ) : (
                    filteredConvs.map((conv) => (
                        <div
                            key={conv.id}
                            onClick={() => navigate('/')}
                            className="glass-panel p-8 rounded-[2.5rem] hover:scale-[1.01] hover:bg-white/[0.03] transition-all cursor-pointer group shadow-2xl relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 -m-8 w-24 h-24 bg-primary-600/5 rounded-full blur-2xl group-hover:bg-primary-600/10 transition-all"></div>

                            <div className="flex items-center justify-between relative z-10">
                                <div className="flex items-center space-x-6">
                                    <div className="w-16 h-16 bg-primary-600/10 text-primary-400 rounded-2xl flex items-center justify-center ring-1 ring-primary-500/10 shadow-inner group-hover:bg-primary-600 group-hover:text-white transition-all group-hover:rotate-3">
                                        <MessageSquare size={28} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-white tracking-tight italic group-hover:text-primary-400 transition-colors uppercase">{conv.title}</h3>
                                        <div className="flex items-center space-x-6 mt-2">
                                            <div className="flex items-center text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                                <Calendar size={14} className="mr-2 text-slate-700" />
                                                {format(new Date(conv.created_at), 'MMM dd, yyyy')}
                                            </div>
                                            <div className="flex items-center text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                                <div className="w-1.5 h-1.5 bg-primary-500 rounded-full mr-3 shadow-[0_0_8px_rgba(37,99,235,0.5)] animate-pulse"></div>
                                                {conv.total_messages} Units
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <button
                                        onClick={(e) => handleDelete(e, conv.id)}
                                        className="w-12 h-12 flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-2xl transition-all"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                    <div className="w-12 h-12 flex items-center justify-center bg-white/5 rounded-2xl text-slate-700 group-hover:text-primary-400 group-hover:bg-primary-600/10 transition-all">
                                        <ChevronRight size={24} className="transform group-hover:translate-x-1 transition-transform" />
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

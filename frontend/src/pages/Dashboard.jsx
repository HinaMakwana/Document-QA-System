import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Zap,
  DollarSign,
  Activity,
  FileText,
  MessageSquare,
  Clock,
  AlertCircle,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { analyticsApi, authApi } from '../services/api';
import { format } from 'date-fns';

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [usage, setUsage] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [statsRes, usageRes] = await Promise.all([
                    analyticsApi.getStats(),
                    authApi.getUsage()
                ]);
                setStats(statsRes);
                setUsage(usageRes);
            } catch (error) {
                console.error("Error fetching dashboard data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-10 h-10 text-primary-600 animate-spin" />
            </div>
        );
    }

    const { totals, by_event_type, daily_trend } = stats || { totals: {}, by_event_type: [], daily_trend: [] };

    const getPercentage = (used, limit) => {
        if (!limit) return 0;
        return Math.min(Math.round((used / limit) * 100), 100);
    };

    const tokenProgress = getPercentage(usage?.token_usage?.today?.used, usage?.token_usage?.today?.limit);
    const docProgress = getPercentage(usage?.documents?.count, usage?.documents?.limit);

    return (
        <div className="max-w-7xl mx-auto space-y-12 animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div>
                    <h1 className="text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-2">Command Center</h1>
                    <p className="text-slate-400 font-medium tracking-wide">Telemetric analysis of neural consumption and document intelligence throughput.</p>
                </div>
                <div className="flex items-center space-x-4 bg-slate-900/40 backdrop-blur-3xl border border-white/5 py-3 px-6 rounded-[2.5rem] shadow-2xl group hover:border-primary-500/20 transition-all">
                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-[0_0_15px_rgba(34,197,94,0.5)]"></div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">System Health</span>
                        <span className="text-[11px] font-black text-slate-200 uppercase tracking-[0.1em]">{usage?.tier || 'Standard'} Protocol Active</span>
                    </div>
                </div>
            </div>

            {/* Premium Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
                {[
                    { label: 'Neural Tokens', value: totals.tokens, icon: Zap, color: 'primary', suffix: 'Units' },
                    { label: 'Active Missions', value: usage?.conversations?.count, icon: MessageSquare, color: 'green', suffix: 'Threads' },
                    { label: 'Knowledge Base', value: usage?.documents?.count, icon: FileText, color: 'indigo', suffix: 'Docs' },
                    { label: 'Latency', value: totals.avg_response_time_ms, icon: Activity, color: 'yellow', suffix: 'ms' }
                ].map((stat, i) => (
                    <div key={i} className="glass-panel p-8 rounded-[2.5rem] relative overflow-hidden group hover:scale-[1.03] transition-all duration-500 shadow-2xl">
                        <div className={`absolute -right-8 -top-8 w-32 h-32 bg-${stat.color}-600/5 rounded-full blur-[60px] group-hover:bg-${stat.color}-600/10 transition-all duration-700`}></div>
                        <div className={`w-14 h-14 bg-${stat.color}-600/10 text-${stat.color}-400 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-${stat.color}-500/20 shadow-inner group-hover:rotate-6 transition-all`}>
                            <stat.icon size={28} />
                        </div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mb-1">{stat.label}</p>
                        <div className="flex items-baseline space-x-2">
                            <h3 className="text-3xl font-black text-white tracking-tighter italic">{(stat.value || 0).toLocaleString()}</h3>
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{stat.suffix}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                {/* Quotas Section */}
                <div className="xl:col-span-1 space-y-8">
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center italic">
                        <Activity size={24} className="mr-3 text-primary-500" />
                        Operation Quotas
                    </h2>

                    <div className="glass-panel p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 -m-10 w-48 h-48 bg-primary-600/5 rounded-full blur-[80px]"></div>

                        <div className="space-y-10 relative">
                            {/* Token Progress */}
                            <div className="space-y-5">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-base font-bold text-white tracking-tight">Synapse Throughput</p>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.1em]">Daily token allocation</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-2xl font-black text-white italic">{tokenProgress}%</span>
                                    </div>
                                </div>
                                <div className="h-3 w-full bg-slate-900/50 rounded-full overflow-hidden ring-1 ring-white/5 p-0.5">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(37,99,235,0.3)] ${
                                            tokenProgress > 90 ? 'bg-red-500' : tokenProgress > 70 ? 'bg-yellow-500' : 'bg-primary-600'
                                        }`}
                                        style={{ width: `${tokenProgress}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">
                                    <span>{usage?.token_usage?.today?.used.toLocaleString()} Loaded</span>
                                    <span>{usage?.token_usage?.today?.limit.toLocaleString()} Max</span>
                                </div>
                            </div>

                            {/* Document Progress */}
                            <div className="space-y-5">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-base font-bold text-white tracking-tight">Memory Expansion</p>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.1em]">Total document indexing</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-2xl font-black text-white italic">{docProgress}%</span>
                                    </div>
                                </div>
                                <div className="h-3 w-full bg-slate-900/50 rounded-full overflow-hidden ring-1 ring-white/5 p-0.5">
                                    <div
                                        className="h-full bg-indigo-500 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                                        style={{ width: `${docProgress}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">
                                    <span>{usage?.documents?.count} Indexed</span>
                                    <span>{usage?.documents?.limit} Capacity</span>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-white/5">
                                <div className="flex items-center text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                                    <AlertCircle size={14} className="mr-3 text-slate-700" />
                                    Chronological reset: 00:00 UTC
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Event Breakdown */}
                <div className="xl:col-span-2 space-y-8">
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center italic">
                        <TrendingUp size={24} className="mr-3 text-primary-500" />
                        Neural Activity
                    </h2>

                    <div className="glass-panel rounded-[2.5rem] shadow-2xl overflow-hidden border-white/5 bg-slate-900/20 backdrop-blur-3xl p-2">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-white/5 bg-slate-900/40">
                                    <th className="px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Protocol</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Exec Cache</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Synapse Load</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] text-right">System Weight</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {by_event_type.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-10 py-24 text-center">
                                            <div className="flex flex-col items-center">
                                                <Activity size={48} className="text-slate-900 mb-6" />
                                                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em] italic">No telemetry data recorded in current temporal window.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    by_event_type.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-10 py-7">
                                                <div className="flex items-center space-x-6">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-inner ${
                                                        item.event_type === 'chat' ? 'bg-primary-600/10 text-primary-400 border border-primary-500/20' :
                                                        item.event_type === 'upload' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' :
                                                        'bg-slate-700/10 text-slate-500 border border-slate-600/20'
                                                    }`}>
                                                        {item.event_type === 'chat' ? <MessageSquare size={20} /> :
                                                         item.event_type === 'upload' ? <FileText size={20} /> : <TrendingUp size={20} />}
                                                    </div>
                                                    <span className="text-base font-bold text-white tracking-tight capitalize">{item.event_type}</span>
                                                </div>
                                            </td>
                                            <td className="px-10 py-7 text-sm font-bold text-slate-400 tracking-wider whitespace-nowrap">{item.count} Actions</td>
                                            <td className="px-10 py-7 text-sm font-bold text-slate-400 tracking-wider">{(item.tokens || 0).toLocaleString()} Syn</td>
                                            <td className="px-10 py-7 text-right">
                                                <div className="inline-flex items-center px-4 py-2 rounded-xl glass-input text-[10px] font-black text-primary-400 uppercase tracking-widest border-primary-500/10">
                                                    {Math.round((item.tokens / (totals.tokens || 1)) * 100)}% Load
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Premium Placeholder */}
            <div className="glass-panel p-12 rounded-[3rem] border border-white/5 flex flex-col lg:flex-row items-center justify-between gap-12 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-600/5 to-transparent pointer-events-none"></div>
                <div className="max-w-2xl relative z-10 text-center lg:text-left">
                    <h3 className="text-3xl font-black text-white mb-4 tracking-tighter italic">Advanced Projection Charts</h3>
                    <p className="text-slate-400 text-lg font-medium leading-relaxed">
                        We are calibrating multidimensional time-series visualizations.
                        Soon, you'll be able to trace every neuron's journey through your document library.
                    </p>
                </div>
                <div className="flex -space-x-8 opacity-20 grayscale scale-125 lg:scale-150 pointer-events-none group-hover:opacity-40 transition-all duration-1000">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="w-16 h-32 bg-primary-600 rounded-2xl flex items-end p-2 border border-white/10 shadow-2xl">
                            <div className="w-full bg-white/40 rounded-t-xl" style={{ height: `${i * 15}%` }}></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;

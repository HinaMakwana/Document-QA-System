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
                <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
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
        <div className="max-w-6xl mx-auto space-y-10 animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Usage Dashboard</h1>
                    <p className="text-slate-400 font-medium tracking-tight">Monitor your resource consumption and document intelligence throughput.</p>
                </div>
                <div className="flex items-center space-x-3 bg-slate-900/40 backdrop-blur-3xl border border-white/5 py-2.5 px-5 rounded-2xl shadow-xl">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]"></div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">System Status</span>
                        <span className="text-[11px] font-bold text-slate-200 uppercase tracking-tight mt-0.5">{usage?.tier || 'Free'} Plan Active</span>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Total Tokens', value: totals.tokens, icon: Zap, color: 'primary', suffix: 'Tokens' },
                    { label: 'Active Chats', value: usage?.conversations?.count, icon: MessageSquare, color: 'indigo', suffix: 'Threads' },
                    { label: 'Storage', value: usage?.documents?.count, icon: FileText, color: 'purple', suffix: 'Files' },
                    { label: 'Avg Latency', value: totals.avg_response_time_ms, icon: Activity, color: 'emerald', suffix: 'ms' }
                ].map((stat, i) => (
                    <div key={i} className="glass-panel p-6 rounded-3xl relative overflow-hidden group hover:bg-white/[0.02] transition-all duration-300">
                        <div className={`w-12 h-12 bg-primary-600/10 text-primary-400 rounded-xl flex items-center justify-center mb-5 border border-primary-500/10 group-hover:scale-110 transition-transform`}>
                            <stat.icon size={22} />
                        </div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
                        <div className="flex items-baseline space-x-1.5">
                            <h3 className="text-2xl font-bold text-white tracking-tight">{(stat.value || 0).toLocaleString()}</h3>
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{stat.suffix}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Quotas */}
                <div className="xl:col-span-1 space-y-6">
                    <h2 className="text-xl font-bold text-white tracking-tight flex items-center">
                        <Activity size={20} className="mr-2.5 text-primary-500" />
                        Resource Quotas
                    </h2>

                    <div className="glass-panel p-8 rounded-3xl shadow-xl relative overflow-hidden">
                        <div className="space-y-10 relative">
                            {/* Token Progress */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-white tracking-tight">Daily Allowance</p>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Token limits per 24h</p>
                                    </div>
                                    <span className="text-xl font-bold text-white">{tokenProgress}%</span>
                                </div>
                                <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden p-0.5">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 ${
                                            tokenProgress > 90 ? 'bg-red-500' : tokenProgress > 70 ? 'bg-yellow-500' : 'bg-primary-600'
                                        }`}
                                        style={{ width: `${tokenProgress}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                                    <span>{usage?.token_usage?.today?.used.toLocaleString()} Used</span>
                                    <span>{usage?.token_usage?.today?.limit.toLocaleString()} Max</span>
                                </div>
                            </div>

                            {/* Document Progress */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-white tracking-tight">Document Storage</p>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total capacity limit</p>
                                    </div>
                                    <span className="text-xl font-bold text-white">{docProgress}%</span>
                                </div>
                                <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden p-0.5">
                                    <div
                                        className="h-full bg-primary-500 rounded-full transition-all duration-1000"
                                        style={{ width: `${docProgress}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                                    <span>{usage?.documents?.count} Indexed</span>
                                    <span>{usage?.documents?.limit} Limit</span>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/5">
                                <div className="flex items-center text-[10px] text-slate-600 font-bold uppercase tracking-wider italic">
                                    <Clock size={14} className="mr-2 text-slate-700" />
                                    Resets daily at 00:00 UTC
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Activity Breakdown */}
                <div className="xl:col-span-2 space-y-6">
                    <h2 className="text-xl font-bold text-white tracking-tight flex items-center">
                        <TrendingUp size={20} className="mr-2.5 text-primary-500" />
                        Activity Logs
                    </h2>

                    <div className="glass-panel rounded-3xl shadow-xl overflow-hidden border-white/5 bg-slate-900/20">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-white/5 bg-slate-900/40">
                                        <th className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Activity Type</th>
                                        <th className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Frequency</th>
                                        <th className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Energy Cost</th>
                                        <th className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Weight</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {by_event_type.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="px-8 py-20 text-center">
                                                <div className="flex flex-col items-center opacity-30">
                                                    <Activity size={40} className="text-slate-500 mb-4" />
                                                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest italic">No activity logs recorded recently.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        by_event_type.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center space-x-4">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                                                            item.event_type === 'chat' ? 'bg-primary-600/10 text-primary-400 border-primary-500/10' :
                                                            'bg-slate-700/10 text-slate-500 border-slate-600/10'
                                                        }`}>
                                                            {item.event_type === 'chat' ? <MessageSquare size={16} /> : <FileText size={16} />}
                                                        </div>
                                                        <span className="text-sm font-bold text-white tracking-tight capitalize">{item.event_type}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-sm font-bold text-slate-400 text-center">{item.count} ops</td>
                                                <td className="px-8 py-6 text-sm font-bold text-slate-400 text-center font-mono">{(item.tokens || 0).toLocaleString()} tks</td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[9px] font-bold text-primary-400 uppercase tracking-widest">
                                                        {Math.round((item.tokens / (totals.tokens || 1)) * 100)}% Usage
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
            </div>

            {/* Premium Section */}
            <div className="glass-panel p-10 rounded-3xl border border-white/5 flex flex-col lg:flex-row items-center justify-between gap-10 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-600/10 to-transparent pointer-events-none"></div>
                <div className="max-w-2xl relative z-10 text-center lg:text-left">
                    <h3 className="text-2xl font-bold text-white mb-3 tracking-tight italic uppercase tracking-wider">Historical Analytics</h3>
                    <p className="text-slate-400 text-base font-medium leading-relaxed">
                        We are currently building advanced time-series visualizations. 
                        Soon, you'll be able to track your document processing trends and resource optimization in real-time.
                    </p>
                </div>
                <div className="flex space-x-4 opacity-10 group-hover:opacity-20 transition-all duration-1000 scale-110">
                    {[3, 5, 2, 8, 4, 9].map((val, i) => (
                        <div key={i} className="w-12 h-24 bg-primary-600/30 rounded-xl flex items-end p-1.5 border border-white/10">
                            <div className="w-full bg-primary-500 rounded-lg" style={{ height: `${val * 10}%` }}></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};


export default Dashboard;

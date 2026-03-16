import React, { useState, useEffect } from 'react';
import {
  User,
  Key,
  Trash2,
  Plus,
  Shield,
  Zap,
  Copy,
  Check,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { authApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';

const Settings = () => {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      const res = await authApi.listApiKeys();
      setApiKeys(res || []);
    } catch (error) {
      console.error("Error fetching API keys", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async (e) => {
    e.preventDefault();
    if (!newKeyName.trim() || creating) return;

    try {
      setCreating(true);
      const res = await authApi.createApiKey(newKeyName);
      setCreatedKey(res);
      setApiKeys(prev => [res, ...prev]);
      setNewKeyName('');
    } catch (error) {
      console.error("Error creating API key", error);
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeKey = async (id) => {
    if (!window.confirm("Are you sure you want to revoke this API key?")) return;

    try {
      await authApi.revokeApiKey(id);
      setApiKeys(prev => prev.filter(k => k.id !== id));
    } catch (error) {
      console.error("Error revoking API key", error);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">Control Center</h1>
          <p className="text-slate-400 font-medium tracking-wide">Manage your neural identity, API protocols, and workspace security.</p>
        </div>
        <div className="flex items-center space-x-3 bg-slate-900/50 backdrop-blur-xl border border-white/5 px-5 py-2.5 rounded-[2rem] shadow-xl group hover:border-primary-500/30 transition-all">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_12px_rgba(34,197,94,0.4)]"></div>
          <span className="text-[11px] font-black text-slate-300 uppercase tracking-[0.2em]">{user?.tier || 'Free'} Core Protocol</span>
        </div>
      </div>

      {/* Profile Section */}
      <section className="glass-panel p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 -m-8 w-48 h-48 bg-primary-600/5 rounded-full blur-[80px] pointer-events-none group-hover:bg-primary-600/10 transition-all duration-700"></div>
        <div className="flex items-center space-x-5 mb-10">
          <div className="w-14 h-14 bg-primary-600/10 text-primary-400 rounded-2xl flex items-center justify-center ring-1 ring-primary-500/20 shadow-inner">
            <User size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Profile Credentials</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Identity Verification</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] flex items-center">
                <Shield size={12} className="mr-2" /> Verified Email
            </label>
            <div className="text-slate-200 glass-input px-5 py-4 rounded-2xl font-bold tracking-tight text-lg shadow-sm">
                {user?.email}
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] flex items-center">
                <Zap size={12} className="mr-2" /> Active Plan
            </label>
            <div className="flex items-center px-5 py-4 rounded-2xl glass-input shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-amber-400/10 flex items-center justify-center mr-4">
                <Zap size={18} className="text-amber-400" />
              </div>
              <span className="text-slate-200 capitalize font-bold text-lg tracking-tight">{user?.tier || 'Free'} Subscription</span>
            </div>
          </div>
        </div>
      </section>

      {/* API Keys Section */}
      <section className="glass-panel p-10 rounded-[2.5rem] shadow-2xl relative group">
        <div className="absolute bottom-0 left-0 -m-8 w-64 h-64 bg-indigo-600/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-indigo-600/10 transition-all duration-700"></div>
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center space-x-5">
            <div className="w-14 h-14 bg-indigo-600/10 text-indigo-400 rounded-2xl flex items-center justify-center ring-1 ring-indigo-500/20">
              <Key size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">API Protocols</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Machine Integration Interface</p>
            </div>
          </div>
        </div>

        {createdKey && (
          <div className="mb-10 p-8 glass-panel border-primary-500/30 rounded-[2rem] shadow-2xl shadow-primary-500/10 animate-slide-up bg-slate-900/40 relative">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-primary-400 flex items-center uppercase tracking-widest">
                <AlertCircle size={18} className="mr-2" />
                Critical: Token Generated
              </h3>
              <button
                onClick={() => setCreatedKey(null)}
                className="p-2 text-slate-500 hover:text-white transition-colors"
              >
                <Plus size={20} className="rotate-45" />
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-6 font-medium leading-relaxed">
              This token grants full programmatic access to your document library. Store it securely; it will not be displayed again.
            </p>
            <div className="flex items-center space-x-3">
              <code className="flex-1 glass-input p-4 rounded-xl text-primary-300 font-mono text-sm break-all font-bold tracking-wider">
                {createdKey.key}
              </code>
              <button
                onClick={() => copyToClipboard(createdKey.key)}
                className={`flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                    copied ? 'bg-green-600 text-white' : 'bg-primary-600 hover:bg-primary-500 text-white shadow-xl shadow-primary-600/30 hover:scale-105 active:scale-95'
                }`}
              >
                {copied ? <Check size={24} /> : <Copy size={24} />}
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleCreateKey} className="flex gap-4 mb-12">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Protocol Identification (e.g. Pipeline-Alpha)"
            className="flex-1 glass-input rounded-2xl px-6 py-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all font-bold"
            required
          />
          <button
            type="submit"
            disabled={creating}
            className="w-48 h-14 rounded-2xl flex items-center justify-center bg-primary-600 hover:bg-primary-500 text-white font-black uppercase tracking-[0.2em] text-xs transition-all shadow-xl shadow-primary-600/20 active:scale-95 disabled:opacity-50"
          >
            {creating ? <Loader2 size={24} className="animate-spin" /> : <Plus size={24} className="mr-2" />}
             New Key
          </button>
        </form>

        <div className="space-y-4">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] pl-2 mb-4">Authorized Protocols</h3>
          {loading ? (
             <div className="py-20 flex flex-col items-center justify-center">
                <Loader2 size={32} className="text-primary-600 animate-spin mb-4" />
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Validating Keychains...</p>
             </div>
          ) : apiKeys.length === 0 ? (
            <div className="py-20 text-center glass-panel rounded-3xl border border-dashed border-slate-800/50">
               <p className="text-slate-600 font-bold uppercase text-[10px] tracking-widest px-10 leading-relaxed">No protocols have been registered for external access.</p>
            </div>
          ) : (
            apiKeys.map(apiKey => (
              <div key={apiKey.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 glass-input rounded-3xl hover:bg-white/5 transition-all group border-white/5 gap-4">
                <div className="flex items-center space-x-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                      apiKey.is_active ? 'bg-indigo-600/10 text-indigo-400' : 'bg-slate-800 text-slate-600 opacity-50'
                  }`}>
                    <Shield size={24} />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white tracking-tight">{apiKey.name}</h4>
                    <div className="flex items-center mt-1 space-x-3">
                        <code className="text-xs text-slate-500 font-bold font-mono tracking-widest">{apiKey.key_prefix}••••••••</code>
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-2 py-0.5 rounded-lg border border-slate-800">
                            {format(new Date(apiKey.created_at), 'MMM d, yyyy')}
                        </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end space-x-4">
                  <button
                    onClick={() => handleRevokeKey(apiKey.id)}
                    className="w-12 h-12 flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all border border-transparent hover:border-red-400/30 group/btn"
                    title="Terminate Protocol"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Danger Zone */}
      <section className="p-10 rounded-[2.5rem] border border-red-900/30 bg-red-950/5 relative overflow-hidden group">
        <div className="absolute top-0 right-0 -m-8 w-48 h-48 bg-red-500/5 rounded-full blur-[80px] pointer-events-none group-hover:bg-red-500/10 transition-all"></div>
        <h2 className="text-xl font-bold text-red-500 mb-6 flex items-center">
          <AlertCircle size={24} className="mr-3" />
          Neural Wipe (Danger Zone)
        </h2>
        <div className="flex flex-col sm:flex-row items-center justify-between p-8 glass-panel border-red-900/20 rounded-[2rem] gap-6">
          <div className="max-w-md text-center sm:text-left">
            <h4 className="text-lg font-bold text-white mb-1">Permanently Delete Account</h4>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">This will erase all processed documents, vector embeddings, and conversation history. This action is irreversible.</p>
          </div>
          <button className="h-12 px-6 border border-red-900 shadow-xl shadow-red-950/50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap active:scale-95">
            Execute Neural Wipe
          </button>
        </div>
      </section>
    </div>
  );
};

export default Settings;

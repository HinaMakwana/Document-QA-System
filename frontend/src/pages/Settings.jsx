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
    <div className="max-w-4xl mx-auto space-y-10 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Settings</h1>
          <p className="text-slate-400 font-medium tracking-tight">Manage your account preferences, API keys, and workspace security.</p>
        </div>
        <div className="flex items-center space-x-3 bg-slate-900/50 backdrop-blur-xl border border-white/5 px-4 py-2 rounded-2xl shadow-xl">
          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">{user?.tier || 'Free'} Plan Active</span>
        </div>
      </div>

      {/* Profile Section */}
      <section className="glass-panel p-8 rounded-3xl shadow-xl relative overflow-hidden group">
        <div className="flex items-center space-x-4 mb-8">
          <div className="w-12 h-12 bg-primary-600/10 text-primary-400 rounded-xl flex items-center justify-center border border-primary-500/10">
            <User size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Account Profile</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Your personal credentials</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center">
                <Shield size={12} className="mr-2" /> Registered Email
            </label>
            <div className="text-slate-200 glass-input px-5 h-12 flex items-center rounded-xl font-bold tracking-tight text-sm">
                {user?.email}
            </div>
          </div>
          <div className="space-y-2.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center">
                <Zap size={12} className="mr-2" /> Current Plan
            </label>
            <div className="flex items-center px-5 h-12 rounded-xl glass-input">
              <div className="w-6 h-6 rounded-lg bg-primary-500/10 flex items-center justify-center mr-3">
                <Zap size={14} className="text-primary-400" />
              </div>
              <span className="text-slate-200 capitalize font-bold text-sm tracking-tight">{user?.tier || 'Free'} Subscription</span>
            </div>
          </div>
        </div>
      </section>

      {/* API Keys Section */}
      <section className="glass-panel p-8 rounded-3xl shadow-xl relative group">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-primary-600/10 text-primary-400 rounded-xl flex items-center justify-center border border-primary-500/10">
              <Key size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">API Access Keys</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Interface for programmatic access</p>
            </div>
          </div>
        </div>

        {createdKey && (
          <div className="mb-8 p-6 glass-panel border-primary-500/30 rounded-2xl shadow-xl animate-scale-in bg-slate-950/40">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-primary-400 flex items-center uppercase tracking-widest">
                <AlertCircle size={16} className="mr-2" />
                Key Generated Successfully
              </h3>
              <button
                onClick={() => setCreatedKey(null)}
                className="p-1.5 text-slate-500 hover:text-white transition-colors"
              >
                <Plus size={18} className="rotate-45" />
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mb-5 font-medium leading-relaxed">
              Make sure to copy your API key now. You won't be able to see it again for security reasons.
            </p>
            <div className="flex items-center space-x-2">
              <code className="flex-1 glass-input px-4 py-3 rounded-xl text-primary-300 font-mono text-sm break-all font-bold tracking-tight">
                {createdKey.key}
              </code>
              <button
                onClick={() => copyToClipboard(createdKey.key)}
                className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                    copied ? 'bg-green-600 text-white' : 'bg-primary-600 hover:bg-primary-500 text-white shadow-lg active:scale-95'
                }`}
              >
                {copied ? <Check size={20} /> : <Copy size={20} />}
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleCreateKey} className="flex gap-3 mb-10">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Key Name (e.g. My Website)"
            className="flex-1 glass-input rounded-xl px-5 h-12 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-primary-500/30 transition-all font-bold"
            required
          />
          <button
            type="submit"
            disabled={creating}
            className="px-6 h-12 rounded-xl flex items-center justify-center bg-primary-600 hover:bg-primary-500 text-white font-bold uppercase tracking-wider text-[11px] transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {creating ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} className="mr-2" />}
             Create Key
          </button>
        </form>

        <div className="space-y-3">
          <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest pl-1 mb-3">Active API Keys</h3>
          {loading ? (
             <div className="py-12 flex flex-col items-center justify-center">
                <Loader2 size={24} className="text-primary-600 animate-spin mb-3" />
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Loading keys...</p>
             </div>
          ) : apiKeys.length === 0 ? (
            <div className="py-12 text-center glass-panel rounded-2xl border-dashed border-slate-800">
               <p className="text-slate-600 font-bold uppercase text-[9px] tracking-widest">No API keys generated yet.</p>
            </div>
          ) : (
            apiKeys.map(apiKey => (
              <div key={apiKey.id} className="flex items-center justify-between p-4 glass-input rounded-2xl border-white/5 transition-all group">
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      apiKey.is_active ? 'bg-primary-600/10 text-primary-400 border border-primary-500/10' : 'bg-slate-800 text-slate-600'
                  }`}>
                    <Key size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white tracking-tight">{apiKey.name}</h4>
                    <div className="flex items-center mt-0.5 space-x-2">
                        <code className="text-[10px] text-slate-600 font-bold font-mono tracking-widest">{apiKey.key_prefix}••••••••</code>
                        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tight">
                            Created {format(new Date(apiKey.created_at), 'MM/dd/yy')}
                        </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleRevokeKey(apiKey.id)}
                  className="w-10 h-10 flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                  title="Revoke Key"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Danger Zone */}
      <section className="p-8 rounded-3xl border border-red-900/30 bg-red-950/5 relative overflow-hidden group">
        <h2 className="text-lg font-bold text-red-500 mb-6 flex items-center uppercase tracking-wider">
          <AlertCircle size={20} className="mr-2" />
          Security Zone
        </h2>
        <div className="flex flex-col sm:flex-row items-center justify-between p-6 glass-panel border-red-900/10 rounded-2xl gap-6">
          <div className="text-center sm:text-left">
            <h4 className="text-base font-bold text-white mb-1">Delete Account</h4>
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">Permanently erase your account, documents, and chat history. This action cannot be undone.</p>
          </div>
          <button className="h-11 px-6 border border-red-900 shadow-xl text-red-500 hover:bg-red-500 hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95">
            Delete Profile
          </button>
        </div>
      </section>
    </div>
  );
};


export default Settings;

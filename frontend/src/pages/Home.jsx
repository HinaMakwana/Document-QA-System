import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Paperclip,
  Trash2,
  Info,
  Plus,
  Brain,
  FileText,
  Loader2,
  ChevronRight,
  MessageSquare,
  Search,
  X,
  History,
  Layout as LayoutIcon,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { conversationApi, documentApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';

const MessageBubble = ({ message }) => {
  const isAssistant = message.role === 'assistant';

  return (
    <div className={`flex w-full mb-8 ${isAssistant ? 'justify-start' : 'justify-end animate-fade-in'}`}>
      <div className={`max-w-[90%] lg:max-w-[80%] flex ${isAssistant ? 'flex-row' : 'flex-row-reverse'}`}>
        <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
            isAssistant
                ? message.is_error
                    ? 'bg-red-600 mr-4 shadow-xl shadow-red-600/30'
                    : 'bg-primary-600 mr-4 shadow-xl shadow-primary-600/30'
                : 'bg-slate-800 ml-4 border border-slate-700'
        }`}>
          {isAssistant ? (message.is_error ? <AlertCircle size={20} className="text-white" /> : <Brain size={20} className="text-white" />) : <FileText size={20} className="text-slate-400" />}
        </div>
        <div className="flex flex-col">
          <div className={`p-5 rounded-3xl shadow-lg transition-all ${
            isAssistant
              ? message.is_error
                ? 'bg-red-500/20 border border-red-500/50 text-red-200'
                : 'glass-panel text-slate-200'
              : 'bg-primary-600 text-white shadow-primary-600/10'
          }`}>
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed select-text font-medium">{message.content}</p>

            {isAssistant && message.citations?.length > 0 && (
              <div className="mt-5 pt-4 border-t border-white/5 space-y-3">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Referenced Sources</p>
                <div className="flex flex-wrap gap-2">
                  {message.citations.map((cite, idx) => (
                    <div
                      key={idx}
                      className="text-[10px] bg-slate-900/50 hover:bg-slate-800 text-primary-400 px-3 py-1.5 rounded-lg border border-white/5 flex items-center cursor-help transition-all hover:scale-105"
                      title={cite.content_preview}
                    >
                      <ChevronRight size={10} className="mr-1.5" />
                      {cite.document_title} • p.{cite.page_number}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className={`flex items-center mt-2.5 px-2 ${isAssistant ? 'justify-start' : 'justify-end'}`}>
             <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest opacity-60">
                {format(new Date(message.created_at || Date.now()), 'hh:mm a')}
                {isAssistant && message.model_used && ` • ${message.model_used}`}
             </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [convLoading, setConvLoading] = useState(true);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [showDocs, setShowDocs] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');

  const messagesEndRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchInitialData = async () => {
    try {
      setConvLoading(true);
      const [docsRes, convsRes] = await Promise.all([
        documentApi.list(),
        conversationApi.list()
      ]);

      const docs = docsRes.results || [];
      setDocuments(docs);

      const convs = convsRes.results || [];
      setConversations(convs);

      if (convs.length > 0) {
        loadConversation(convs[0].id);
      } else {
        createNewConversation();
      }
    } catch (error) {
      console.error("Error fetching initial data", error);
    } finally {
      setConvLoading(false);
    }
  };

  const createNewConversation = async () => {
    try {
      setConvLoading(true);
      const res = await conversationApi.create({ title: 'New Conversation' });
      setCurrentConversation(res);
      setMessages([]);
      setSelectedDocs([]);
      setConversations(prev => [res, ...prev]);
    } catch (error) {
      console.error("Error creating conversation", error);
    } finally {
      setConvLoading(false);
    }
  };

  const loadConversation = async (id) => {
    try {
      setConvLoading(true);
      const [detailRes, msgsRes] = await Promise.all([
        conversationApi.get(id),
        conversationApi.getMessages(id)
      ]);
      setCurrentConversation(detailRes);
      setMessages(msgsRes.results || []);
      setSelectedDocs(detailRes.document_ids || []);
    } catch (error) {
      console.error("Error loading conversation", error);
    } finally {
      setConvLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !currentConversation || loading) return;

    const currentInput = input;
    setInput('');
    setLoading(true);
    setStreamingMessage('');

    const userMsg = {
      role: 'user',
      content: currentInput,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);

    try {
      // Use streaming API
      await conversationApi.chatStream(
        currentConversation.id,
        currentInput,
        selectedDocs.length > 0,
        (chunk) => {
          setStreamingMessage(prev => prev + chunk);
        },
        (doneData) => {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: streamingMessage + (doneData.text || ''),
            citations: doneData.citations,
            created_at: new Date().toISOString()
          }]);
          setStreamingMessage('');
          setLoading(false);

          // Refresh conversation title if it was a new chat
          if (messages.length === 0) {
            conversationApi.get(currentConversation.id).then(res => {
                setCurrentConversation(res);
                setConversations(prev => prev.map(c => c.id === res.id ? res : c));
            });
          }
        },
        (err) => {
          console.error("Streaming error", err);
          setLoading(false);
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: "I encountered a connection error. Please try again.",
            is_error: true,
            created_at: new Date().toISOString()
          }]);
        }
      );
    } catch (error) {
      setLoading(false);
      console.error("Chat error", error);
    }
  };

  const toggleDocSelection = async (docId) => {
    const newSelection = selectedDocs.includes(docId)
        ? selectedDocs.filter(id => id !== docId)
        : [...selectedDocs, docId];

    setSelectedDocs(newSelection);

    try {
        await conversationApi.update(currentConversation.id, {
            document_ids: newSelection
        });
    } catch (error) {
        console.error("Error updating selected documents", error);
    }
  };

  const handleDeleteConversation = async (id) => {
    if (!window.confirm("Delete this conversation?")) return;
    try {
        await conversationApi.delete(id);
        const remaining = conversations.filter(c => c.id !== id);
        setConversations(remaining);
        if (currentConversation?.id === id) {
            if (remaining.length > 0) loadConversation(remaining[0].id);
            else createNewConversation();
        }
    } catch (error) {
        console.error("Delete conversation error", error);
    }
  };

  return (
    <div className="flex h-[calc(100vh-120px)] -m-4 lg:-m-8">
      {/* Chats Sidebar */}
      <div className="hidden md:flex flex-col w-72 border-r border-slate-800/50 bg-slate-950/40 backdrop-blur-3xl">
        <div className="p-6">
            <button
                onClick={createNewConversation}
                className="w-full h-12 flex items-center justify-center space-x-2 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-2xl transition-all shadow-xl shadow-primary-600/20 active:scale-95"
            >
                <Plus size={18} />
                <span className="text-sm">New Explorer</span>
            </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-1.5">
            <div className="px-2 pb-4">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] px-1">Recent Missions</h3>
            </div>
            {conversations.map(conv => (
                <div
                    key={conv.id}
                    onClick={() => loadConversation(conv.id)}
                    className={`group flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition-all duration-300 ${
                        currentConversation?.id === conv.id
                            ? 'bg-primary-600/10 border border-primary-500/20'
                            : 'hover:bg-slate-800/40 border border-transparent'
                    }`}
                >
                    <div className="flex items-center space-x-3 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                             currentConversation?.id === conv.id ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-500 group-hover:bg-slate-700'
                        }`}>
                            <MessageSquare size={14} />
                        </div>
                        <span className={`text-sm truncate ${currentConversation?.id === conv.id ? 'text-white font-bold tracking-tight' : 'text-slate-400 group-hover:text-slate-200'}`}>
                            {conv.title}
                        </span>
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                        <X size={14} />
                    </button>
                </div>
            ))}
        </div>
      </div>

      {/* Main Chat Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950/20 relative">
        {/* Header */}
        <div className="h-20 px-8 border-b border-slate-800/50 flex items-center justify-between bg-slate-950/40 backdrop-blur-xl sticky top-0 z-20">
          <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-primary-600/10 text-primary-400 rounded-2xl flex items-center justify-center ring-1 ring-primary-500/20 shadow-inner">
                  <Sparkles size={24} />
              </div>
              <div className="min-w-0">
                  <h2 className="text-base font-bold text-white truncate max-w-xs tracking-tight">{currentConversation?.title || 'System Assistant'}</h2>
                  <div className="flex items-center mt-0.5">
                      <div className={`w-1.5 h-1.5 rounded-full mr-2 ${selectedDocs.length > 0 ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`}></div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.1em]">
                        {selectedDocs.length > 0 ? `${selectedDocs.length} Documents Active` : 'Base Intelligence'}
                      </span>
                  </div>
              </div>
          </div>
          <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowDocs(!showDocs)}
                className={`flex items-center space-x-2 px-4 h-10 rounded-xl text-xs font-bold transition-all border ${
                    showDocs
                        ? 'bg-primary-600/20 border-primary-500/20 text-primary-400'
                        : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                  <FileText size={16} />
                  <span className="hidden sm:inline">Context Panel</span>
              </button>
              <div className="w-px h-6 bg-slate-800 hidden sm:block"></div>
              <button className="p-2 text-slate-500 hover:text-white hover:bg-slate-800/80 rounded-xl transition-all">
                  <Info size={18} />
              </button>
          </div>
        </div>

        {/* Message Area */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-12 space-y-4 relative">
          {convLoading ? (
            <div className="h-full flex flex-col items-center justify-center">
                <div className="w-16 h-16 glass-panel rounded-3xl flex items-center justify-center mb-6 animate-pulse">
                    <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
                </div>
                <p className="text-sm font-bold text-slate-500 tracking-[0.2em] uppercase">Syncing Neurons...</p>
            </div>
          ) : messages.length === 0 && !streamingMessage ? (
            <div className="h-full flex flex-col items-center justify-center max-w-5xl mx-auto py-12 px-4">
                <div className="relative mb-12 animate-float">
                    <div className="absolute inset-0 bg-primary-600 blur-[100px] opacity-20 rounded-full"></div>
                    <div className="relative w-32 h-32 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-[3rem] flex items-center justify-center shadow-2xl shadow-primary-500/30 ring-1 ring-white/20">
                        <Brain size={64} className="text-white drop-shadow-lg" />
                    </div>
                </div>
                <h1 className="text-4xl lg:text-6xl font-extrabold gradient-text mb-6 tracking-tight text-center">
                    Welcome back, {user?.username || 'Explorer'}!
                </h1>
                <p className="text-slate-400 text-lg sm:text-2xl max-w-2xl mx-auto leading-relaxed text-center mb-16 font-medium">
                    Analyze documents and extract deep insights using our context-aware retrieval system.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                    <div className="group p-8 glass-card rounded-[3rem] hover:bg-slate-900/40 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] border border-white/5"
                         onClick={() => setInput("Can you summarize the documents I uploaded?")}>
                        <div className="w-14 h-14 bg-indigo-600/10 text-indigo-400 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-indigo-500/20 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                            <Sparkles size={28} />
                        </div>
                        <h4 className="text-xl font-bold text-white mb-3 tracking-tight">Executive Summary</h4>
                        <p className="text-sm text-slate-400 leading-relaxed font-medium">Synthesize key themes, risks, and opportunities across your entire library in seconds.</p>
                    </div>
                    <div className="group p-8 glass-card rounded-[3rem] hover:bg-slate-900/40 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] border border-white/5"
                         onClick={() => setInput("What are the key technical findings in these docs?")}>
                        <div className="w-14 h-14 bg-primary-600/10 text-primary-400 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-primary-500/20 group-hover:bg-primary-600 group-hover:text-white transition-all">
                            <Search size={28} />
                        </div>
                        <h4 className="text-xl font-bold text-white mb-3 tracking-tight">Technical Analysis</h4>
                        <p className="text-sm text-slate-400 leading-relaxed font-medium">Extract specific sections, data points, and context-aware citations with precise references.</p>
                    </div>
                </div>
            </div>
          ) : (
            <>
                {messages.map((msg, i) => (
                    <MessageBubble key={i} message={msg} />
                ))}
                {streamingMessage && (
                    <div className="flex justify-start mb-8">
                        <div className="max-w-[90%] lg:max-w-[80%] flex flex-row group">
                            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary-600 mr-4 flex items-center justify-center shadow-lg shadow-primary-600/30">
                                <Loader2 size={20} className="text-white animate-spin" />
                            </div>
                            <div className="relative">
                                <div className="p-6 rounded-[2rem] glass-panel text-slate-200">
                                    <p className="whitespace-pre-wrap text-[15px] font-medium leading-relaxed">{streamingMessage}</p>
                                    <span className="inline-block w-[2px] h-[1.1em] bg-primary-500 ml-1 animate-pulse align-middle"></span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </>
          )}
          <div ref={messagesEndRef} className="h-32" />
        </div>

        {/* Floating Context Panel */}
        {showDocs && (
            <div className="absolute right-8 top-24 bottom-32 w-80 glass-panel rounded-[2.5rem] shadow-2xl z-30 flex flex-col overflow-hidden animate-slide-in-right ring-1 ring-white/10">
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-900/40 backdrop-blur-3xl">
                    <div>
                        <h3 className="text-base font-bold text-white tracking-tight">Knowledge Bank</h3>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">Selection Context</p>
                    </div>
                    <button onClick={() => setShowDocs(false)} className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-all">
                        <X size={20} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {documents.filter(d => d.status === 'completed').length === 0 ? (
                        <div className="py-20 text-center">
                            <FileText size={48} className="text-slate-800 mx-auto mb-6" />
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-[0.2em] px-8">No documents ready for indexing.</p>
                        </div>
                    ) : (
                        documents.filter(d => d.status === 'completed').map(doc => (
                            <div
                                key={doc.id}
                                onClick={() => toggleDocSelection(doc.id)}
                                className={`p-4 rounded-[1.5rem] border transition-all duration-300 ${
                                    selectedDocs.includes(doc.id)
                                        ? 'bg-primary-600/10 border-primary-500/30 shadow-inner'
                                        : 'bg-slate-800/10 border-slate-800/50 hover:border-slate-700'
                                }`}
                            >
                                <div className="flex items-center space-x-3 mb-3">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${selectedDocs.includes(doc.id) ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                                        <FileText size={16} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold text-white truncate tracking-tight">{doc.title}</p>
                                        <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5 font-extrabold">{doc.file_type}</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-tighter">
                                        {doc.chunk_count} Sections
                                    </span>
                                    {selectedDocs.includes(doc.id) && (
                                        <div className="w-5 h-5 rounded-full bg-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
                                            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
                <div className="p-6 bg-slate-950/40 border-t border-white/5 backdrop-blur-3xl">
                    <button
                        onClick={() => setSelectedDocs([])}
                        disabled={selectedDocs.length === 0}
                        className="w-full h-12 text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] hover:text-white transition-all disabled:opacity-30 flex items-center justify-center border border-white/5 rounded-2xl bg-white/5"
                    >
                        Clear Context
                    </button>
                </div>
            </div>
        )}

        {/* Input Area */}
        <div className="px-6 lg:px-12 pb-10 bg-transparent relative z-20">
          <form
            onSubmit={handleSend}
            className="max-w-6xl mx-auto glass-input rounded-[3rem] p-2 pr-5 shadow-[0_30px_100px_rgba(0,0,0,0.6)] flex items-end group"
          >
            <button
                type="button"
                onClick={() => setShowDocs(!showDocs)}
                className={`w-14 h-14 rounded-full transition-all duration-300 flex items-center justify-center flex-shrink-0 ${
                    showDocs
                        ? 'bg-primary-600 text-white shadow-xl shadow-primary-600/30'
                        : 'text-slate-500 hover:text-white hover:bg-slate-800'
                }`}
            >
                <Paperclip size={24} />
            </button>
            <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend(e);
                    }
                }}
                placeholder={`Ask Assistant about ${selectedDocs.length || 'Knowledge Base'}...`}
                className="flex-1 bg-transparent border-none text-white px-4 py-4 min-h-[64px] max-h-48 focus:ring-0 outline-none resize-none text-base sm:text-lg placeholder-slate-600 font-medium tracking-tight"
                rows={1}
            />
            <button
                type="submit"
                disabled={!input.trim() || loading}
                className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center transition-all duration-300 mb-0.5 ${
                    input.trim() && !loading
                    ? 'bg-primary-600 text-white shadow-2xl shadow-primary-600/50 hover:scale-105 active:scale-95'
                    : 'bg-slate-800 text-slate-700'
                }`}
            >
                {loading ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} className="ml-1" />}
            </button>
          </form>
          <div className="flex justify-center mt-6">
              <p className="text-[9px] text-slate-700 font-bold uppercase tracking-[0.5em] opacity-80">
                Cognitive Intelligence Engine Active • RAG-Enabled
              </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;

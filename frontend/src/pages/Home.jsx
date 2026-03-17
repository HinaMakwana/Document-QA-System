import React, { useState, useEffect } from 'react';
import { Sparkles, FileText, Info } from 'lucide-react';
import { conversationApi, documentApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

import ChatSidebar from '../components/chat/ChatSidebar';
import MessageList from '../components/chat/MessageList';
import ChatInput from '../components/chat/ChatInput';
import ContextPanel from '../components/chat/ContextPanel';

import { useSearchParams } from 'react-router-dom';

const Chat = () => {
  const [searchParams] = useSearchParams();
  const conversationIdFromUrl = searchParams.get('id');

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

  const { user } = useAuth();

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setConvLoading(true);
      const [docsRes, convsRes] = await Promise.all([
        documentApi.list(),
        conversationApi.list()
      ]);

      setDocuments(docsRes.results || []);
      const convs = convsRes.results || [];
      setConversations(convs);

      if (conversationIdFromUrl) {
        loadConversation(conversationIdFromUrl);
      } else if (convs.length > 0) {
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
      const res = await conversationApi.create({ title: 'New Chat' });
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
    if (currentConversation?.id === id) return;
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
    if (e) e.preventDefault();
    const promptToSend = input.trim();
    if (!promptToSend || !currentConversation || loading) return;

    setInput('');
    setLoading(true);
    setStreamingMessage('');

    const userMsg = {
      role: 'user',
      content: promptToSend,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);

    try {
      await conversationApi.chatStream(
        currentConversation.id,
        promptToSend,
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
            content: "I encountered a connection error. Please check your connection and try again.",
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

  const handleQuickPrompt = (prompt) => {
    setInput(prompt);
    // Use a small delay to ensure input state is updated before handleSend reads it
    // Or better, just call handleSend with the prompt directly
    setTimeout(() => {
        const fakeEvent = { preventDefault: () => {} };
        // This is a bit hacky, better to refactor handleSend to take content
    }, 0);
  };

  // Improved handleQuickPrompt to be cleaner
  const sendQuickPrompt = async (prompt) => {
    if (!currentConversation || loading) return;
    
    setLoading(true);
    setMessages(prev => [...prev, {
        role: 'user',
        content: prompt,
        created_at: new Date().toISOString()
    }]);

    try {
        await conversationApi.chatStream(
            currentConversation.id,
            prompt,
            selectedDocs.length > 0,
            (chunk) => setStreamingMessage(prev => prev + chunk),
            (doneData) => {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: streamingMessage + (doneData.text || ''),
                    citations: doneData.citations,
                    created_at: new Date().toISOString()
                }]);
                setStreamingMessage('');
                setLoading(false);
                
                conversationApi.get(currentConversation.id).then(res => {
                    setCurrentConversation(res);
                    setConversations(prev => prev.map(c => c.id === res.id ? res : c));
                });
            },
            (err) => {
                setLoading(false);
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: "Error processing quick prompt.",
                    is_error: true,
                    created_at: new Date().toISOString()
                }]);
            }
        );
    } catch (e) {
        setLoading(false);
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
    if (!window.confirm("Are you sure you want to delete this conversation?")) return;
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
    <div className="flex flex-1 min-h-0 bg-slate-950">
      <ChatSidebar 
        conversations={conversations}
        currentConversation={currentConversation}
        onLoadConversation={loadConversation}
        onCreateConversation={createNewConversation}
        onDeleteConversation={handleDeleteConversation}
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-transparent relative overflow-hidden">
        {/* Chat Header */}
        <div className="px-6 py-5 pt-8 border-b border-slate-800/50 flex flex-shrink-0 items-center justify-between bg-slate-900/40 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center space-x-3 cursor-default">
              <span className="text-sm font-semibold text-slate-200 truncate max-w-xs">
                {currentConversation?.title || 'Knowledge Assistant'}
              </span>
              <div className="flex items-center space-x-1.5 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                  <div className={`w-1.5 h-1.5 rounded-full ${selectedDocs.length > 0 ? 'bg-primary-500' : 'bg-slate-500'}`}></div>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {selectedDocs.length > 0 ? `${selectedDocs.length} Docs` : 'Global'}
                  </span>
              </div>
          </div>
          <div className="flex items-center">
              <button
                onClick={() => setShowDocs(!showDocs)}
                className={`flex items-center space-x-1.5 px-3 h-8 rounded-lg text-xs font-medium transition-colors ${
                    showDocs
                        ? 'bg-primary-600/10 text-primary-400'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                  <FileText size={14} />
                  <span className="hidden sm:inline">Context Sources</span>
              </button>
          </div>
        </div>

        <MessageList 
            messages={messages}
            loading={loading}
            streamingMessage={streamingMessage}
            convLoading={convLoading}
            user={user}
            onQuickPrompt={sendQuickPrompt}
        />

        {showDocs && (
            <ContextPanel 
                documents={documents}
                selectedDocs={selectedDocs}
                onToggleDoc={toggleDocSelection}
                onClose={() => setShowDocs(false)}
                onClearAll={() => setSelectedDocs([])}
            />
        )}

        <ChatInput 
            input={input}
            setInput={setInput}
            onSend={handleSend}
            loading={loading}
            onToggleDocs={() => setShowDocs(!showDocs)}
            showDocs={showDocs}
            selectedDocsCount={selectedDocs.length}
        />
      </div>
    </div>
  );
};

export default Chat;

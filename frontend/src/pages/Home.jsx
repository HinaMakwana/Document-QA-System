import React, { useState, useEffect, useCallback } from 'react';
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

  // File upload state
  const [pendingFiles, setPendingFiles] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [uploadQuota, setUploadQuota] = useState(null);

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

      // Fetch upload quota
      fetchQuota();

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

  const fetchQuota = async () => {
    try {
      const res = await documentApi.getUploadQuota();
      setUploadQuota(res);
    } catch (error) {
      console.error("Error fetching upload quota", error);
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
      // Clear pending files when switching conversations
      setPendingFiles([]);
      setUploadingFiles([]);
    } catch (error) {
      console.error("Error loading conversation", error);
    } finally {
      setConvLoading(false);
    }
  };

  // Poll document status until completed or failed
  const pollDocumentStatus = useCallback(async (docId, fileName) => {
    const maxAttempts = 60; // ~2 minutes
    let attempts = 0;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setUploadingFiles(prev =>
          prev.map(f => f.docId === docId ? { ...f, status: 'failed', error: 'Timeout' } : f)
        );
        return;
      }

      try {
        const res = await documentApi.getStatus(docId);
        const docStatus = res.status || res?.data?.status;

        if (docStatus === 'completed') {
          setUploadingFiles(prev =>
            prev.map(f => f.docId === docId ? { ...f, status: 'ready' } : f)
          );

          // Add system message
          setMessages(prev => [...prev, {
            role: 'system',
            content: `📄 **${fileName}** is ready! You can now ask questions about this document.`,
            created_at: new Date().toISOString(),
            type: 'upload_ready',
          }]);

          // Refresh document list
          try {
            const docsRes = await documentApi.list();
            setDocuments(docsRes.results || []);
          } catch (e) { /* silent */ }

          // Refresh quota
          fetchQuota();

          // Clean up the file chip after a delay
          setTimeout(() => {
            setPendingFiles(prev => prev.filter(f => f.name !== fileName));
            setUploadingFiles(prev => prev.filter(f => f.docId !== docId));
          }, 3000);

          return;
        } else if (docStatus === 'failed') {
          setUploadingFiles(prev =>
            prev.map(f => f.docId === docId ? { ...f, status: 'failed', error: 'Processing failed' } : f)
          );

          // Clean up after delay
          setTimeout(() => {
            setPendingFiles(prev => prev.filter(f => f.name !== fileName));
            setUploadingFiles(prev => prev.filter(f => f.docId !== docId));
          }, 5000);

          return;
        }

        // Still processing — poll again
        attempts++;
        setTimeout(poll, 2000);
      } catch (error) {
        attempts++;
        setTimeout(poll, 3000);
      }
    };

    poll();
  }, []);

  const handleFilesSelected = (files) => {
    if (!currentConversation) return;
    if (!uploadQuota || uploadQuota.remaining <= 0) return;

    // Limit files to remaining quota
    const allowedCount = Math.min(files.length, uploadQuota.remaining);
    const allowedFiles = files.slice(0, allowedCount);

    if (allowedCount < files.length) {
      setMessages(prev => [...prev, {
        role: 'system',
        content: `⚠️ Only ${allowedCount} of ${files.length} files accepted. Daily upload limit: ${uploadQuota.daily_limit}/day.`,
        created_at: new Date().toISOString(),
        type: 'upload_warning',
      }]);
    }

    // Add files to pending
    setPendingFiles(prev => [...prev, ...allowedFiles]);

    // Start uploading each file
    allowedFiles.forEach(file => uploadFile(file));
  };

  const uploadFile = async (file) => {
    if (!currentConversation) return;

    // Set uploading state
    setUploadingFiles(prev => [
      ...prev,
      { name: file.name, status: 'uploading', docId: null, error: null }
    ]);

    // Add system message for upload start
    setMessages(prev => [...prev, {
      role: 'system',
      content: `📤 Uploading **${file.name}**...`,
      created_at: new Date().toISOString(),
      type: 'upload_start',
    }]);

    try {
      const res = await documentApi.chatUpload(file, currentConversation.id, file.name);

      const docId = res?.id || res?.data?.id;
      const docQuota = res?.quota || res?.data?.quota;

      if (!docId) throw new Error('No document ID returned');

      // Update uploading state to processing
      setUploadingFiles(prev =>
        prev.map(f => f.name === file.name ? { ...f, status: 'processing', docId } : f)
      );

      // Auto-add to selected docs
      setSelectedDocs(prev => {
        if (prev.includes(docId)) return prev;
        return [...prev, docId];
      });

      // Update quota from response
      if (docQuota) {
        setUploadQuota(docQuota);
      }

      // Update system message to processing
      setMessages(prev => {
        // Replace the last upload_start message for this file
        const newMessages = [...prev];
        for (let i = newMessages.length - 1; i >= 0; i--) {
          if (newMessages[i].type === 'upload_start' && newMessages[i].content.includes(file.name)) {
            newMessages[i] = {
              ...newMessages[i],
              content: `⏳ **${file.name}** is being processed...`,
              type: 'upload_processing',
            };
            break;
          }
        }
        return newMessages;
      });

      // Start polling for processing status
      pollDocumentStatus(docId, file.name);

    } catch (error) {
      console.error("Upload error", error);

      const errorMsg = error.response?.data?.error?.message
        || error.response?.data?.message
        || error.message
        || 'Upload failed';

      setUploadingFiles(prev =>
        prev.map(f => f.name === file.name ? { ...f, status: 'failed', error: errorMsg } : f)
      );

      setMessages(prev => [...prev, {
        role: 'system',
        content: `❌ Failed to upload **${file.name}**: ${errorMsg}`,
        created_at: new Date().toISOString(),
        type: 'upload_failed',
      }]);

      // Clean up after delay
      setTimeout(() => {
        setPendingFiles(prev => prev.filter(f => f.name !== file.name));
        setUploadingFiles(prev => prev.filter(f => f.name !== file.name));
      }, 5000);

      // Refresh quota
      fetchQuota();
    }
  };

  const handleRemoveFile = (index) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
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
    setTimeout(() => {
        const fakeEvent = { preventDefault: () => {} };
    }, 0);
  };

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
            pendingFiles={pendingFiles}
            onFilesSelected={handleFilesSelected}
            onRemoveFile={handleRemoveFile}
            uploadingFiles={uploadingFiles}
            uploadQuota={uploadQuota}
        />
      </div>
    </div>
  );
};

export default Chat;

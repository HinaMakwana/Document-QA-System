import React, { useRef, useEffect } from 'react';
import { Send, Upload, Paperclip, Loader2, X, FileText, AlertCircle } from 'lucide-react';

const ChatInput = ({
  input,
  setInput,
  onSend,
  loading,
  onToggleDocs,
  showDocs,
  selectedDocsCount,
  // New props for file upload
  pendingFiles,
  onFilesSelected,
  onRemoveFile,
  uploadingFiles,
  uploadQuota,
}) => {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSend(e);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onSend(e);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0 && onFilesSelected) {
      onFilesSelected(files);
    }
    // Reset file input so re-selecting the same file works
    e.target.value = '';
  };

  const handleUploadClick = () => {
    if (uploadQuota && uploadQuota.remaining <= 0) return;
    fileInputRef.current?.click();
  };

  const remaining = uploadQuota?.remaining ?? null;
  const isUploading = uploadingFiles && uploadingFiles.length > 0;
  const hasPendingFiles = pendingFiles && pendingFiles.length > 0;

  return (
    <div className="px-6 pb-6 bg-transparent relative z-20">
      {/* Pending file chips */}
      {hasPendingFiles && (
        <div className="max-w-3xl mx-auto mb-2 flex flex-wrap gap-2 px-2">
          {pendingFiles.map((file, idx) => {
            const uploadState = uploadingFiles?.find(u => u.name === file.name);
            const isFileUploading = uploadState?.status === 'uploading';
            const isProcessing = uploadState?.status === 'processing';
            const isReady = uploadState?.status === 'ready';
            const isFailed = uploadState?.status === 'failed';

            return (
              <div
                key={idx}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-300 ${
                  isFailed
                    ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                    : isReady
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                    : isFileUploading || isProcessing
                    ? 'bg-primary-500/10 border border-primary-500/20 text-primary-400'
                    : 'bg-slate-800/80 border border-white/10 text-slate-300'
                }`}
              >
                {(isFileUploading || isProcessing) ? (
                  <Loader2 size={12} className="animate-spin flex-shrink-0" />
                ) : isFailed ? (
                  <AlertCircle size={12} className="flex-shrink-0" />
                ) : (
                  <FileText size={12} className="flex-shrink-0" />
                )}
                <span className="truncate max-w-[140px]">{file.name}</span>
                {isFileUploading && <span className="text-[10px] opacity-70">Uploading…</span>}
                {isProcessing && <span className="text-[10px] opacity-70">Processing…</span>}
                {isReady && <span className="text-[10px]">✓ Ready</span>}
                {isFailed && <span className="text-[10px]">{uploadState.error || 'Failed'}</span>}
                {!isFileUploading && !isProcessing && !isReady && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemoveFile(idx); }}
                    className="p-0.5 hover:bg-white/10 rounded transition-colors"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="max-w-3xl mx-auto bg-slate-800/60 rounded-2xl p-2 pr-3 flex items-end focus-within:ring-2 focus-within:ring-primary-500/50 transition-all duration-200"
      >
        {/* Context sources button */}
        <button
            type="button"
            onClick={onToggleDocs}
            className={`w-10 h-10 rounded-xl transition-all duration-200 flex items-center justify-center flex-shrink-0 relative mb-0.5 ${
                showDocs
                    ? 'bg-primary-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
        >
            <Paperclip size={18} />
            {selectedDocsCount > 0 && !showDocs && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-slate-800">
                    {selectedDocsCount}
                </span>
            )}
        </button>

        {/* File upload button */}
        <button
            type="button"
            onClick={handleUploadClick}
            disabled={remaining !== null && remaining <= 0}
            title={remaining !== null ? `${remaining} uploads remaining today` : 'Upload document'}
            className={`w-10 h-10 rounded-xl transition-all duration-200 flex items-center justify-center flex-shrink-0 relative mb-0.5 ${
                remaining !== null && remaining <= 0
                    ? 'text-slate-600 cursor-not-allowed opacity-40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
        >
            <Upload size={18} />
            {remaining !== null && (
              <span className={`absolute -top-1 -right-1 w-4 h-4 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-slate-800 ${
                remaining <= 0 ? 'bg-red-500' : remaining <= 1 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}>
                {remaining}
              </span>
            )}
        </button>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.doc,.docx"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              hasPendingFiles
                ? `Ask about the uploaded file${pendingFiles.length > 1 ? 's' : ''}...`
                : selectedDocsCount > 0
                ? `Ask about ${selectedDocsCount} active documents...`
                : "Message Knowledge Assistant..."
            }
            className="flex-1 bg-transparent border-none text-white px-3 py-2.5 min-h-[44px] max-h-48 focus:ring-0 outline-none resize-none text-[15px] placeholder-slate-500"
            rows={1}
        />
        <button
            type="submit"
            disabled={(!input.trim() && !hasPendingFiles) || loading || isUploading}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 mb-0.5 ${
                (input.trim() || hasPendingFiles) && !loading && !isUploading
                ? 'bg-primary-600 text-white shadow-md hover:bg-primary-500'
                : 'bg-transparent text-slate-500 cursor-not-allowed'
            }`}
        >
            {loading || isUploading ? <Loader2 size={18} className="animate-spin text-primary-500" /> : <Send size={18} className="translate-x-[1px]" />}
        </button>
      </form>
    </div>
  );
};

export default ChatInput;

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { documindApi } from "@/lib/api";
import type { DocumentItem } from "@/types";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Brain, Upload, FileText, Trash2, ArrowRight,
  CheckCircle, AlertCircle, Loader2, Clock, Search, X,
} from "lucide-react";

export default function DashboardPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchDocs = useCallback(async () => {
    try {
      const res = await documindApi.listDocuments();
      setDocuments(res.documents);
    } catch {
      console.error("Failed to fetch documents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const filteredDocs = useMemo(() =>
    search.trim()
      ? documents.filter(d =>
          d.filename.toLowerCase().includes(search.toLowerCase()) ||
          (d.summary || "").toLowerCase().includes(search.toLowerCase())
        )
      : documents,
    [documents, search]
  );

  const onDrop = useCallback(async (files: File[]) => {
    if (!files[0]) return;
    setUploading(true);
    setUploadResult(null);
    try {
      const res = await documindApi.uploadDocument(files[0]);
      setUploadResult({
        success: true,
        message: `"${res.filename}" indexed — ${res.chunks_created} chunks · ${res.processing_time_ms.toFixed(0)}ms`,
      });
      await fetchDocs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setUploadResult({ success: false, message: msg });
    } finally {
      setUploading(false);
    }
  }, [fetchDocs]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
      "text/markdown": [".md"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await documindApi.deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch { /* ignore */ }
    finally { setDeleting(null); }
  };

  const totalChunks = documents.reduce((s, d) => s + d.chunk_count, 0);

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Nav */}
      <nav className="border-b border-white/5 px-6 h-16 flex items-center justify-between max-w-7xl mx-auto sticky top-0 bg-surface-50/80 backdrop-blur z-10">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-violet-500 flex items-center justify-center">
            <Brain className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-white">DocuMind <span className="text-gradient">AI</span></span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/history" className="text-sm text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors">
            <Clock className="w-4 h-4" /> Analytics
          </Link>
          <Link href="/query" className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Ask Questions <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header stats */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">Document Dashboard</h1>
              <p className="text-zinc-400">Upload and manage documents for semantic search.</p>
            </div>
            <div className="flex gap-4 text-right">
              <div>
                <div className="text-2xl font-bold text-white">{documents.length}</div>
                <div className="text-xs text-zinc-500">Documents</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-brand-400">{totalChunks}</div>
                <div className="text-xs text-zinc-500">Chunks</div>
              </div>
            </div>
          </div>

          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all mb-4 ${
              isDragActive ? "border-brand-500 bg-brand-500/10" : "border-white/10 hover:border-white/20 bg-surface-100"
            } ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <input {...getInputProps()} />
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 text-brand-400 animate-spin" />
                <p className="text-white font-medium">Processing…</p>
                <p className="text-sm text-zinc-400">Chunking · embedding · indexing into Supabase pgvector</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Upload className={`w-10 h-10 ${isDragActive ? "text-brand-400" : "text-zinc-500"}`} />
                <p className="text-white font-medium">{isDragActive ? "Drop to upload" : "Drag & drop or click to upload"}</p>
                <p className="text-sm text-zinc-500">PDF, DOCX, TXT, Markdown · max 50MB</p>
              </div>
            )}
          </div>

          {/* Upload feedback */}
          <AnimatePresence>
            {uploadResult && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className={`flex items-center gap-3 p-4 rounded-lg mb-6 text-sm ${
                  uploadResult.success
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                    : "bg-red-500/10 border border-red-500/20 text-red-400"
                }`}>
                {uploadResult.success ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                {uploadResult.message}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Document list with search */}
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center gap-3">
              {/* Search bar */}
              <div className="flex-1 flex items-center gap-2 bg-surface-200 rounded-lg px-3 py-2">
                <Search className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by filename or summary…"
                  className="bg-transparent text-sm text-white placeholder-zinc-600 outline-none flex-1"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="text-zinc-500 hover:text-zinc-300">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <span className="text-xs text-zinc-500 whitespace-nowrap">
                {filteredDocs.length}/{documents.length}
              </span>
              <Link href="/query" className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1 whitespace-nowrap">
                Query <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 text-zinc-500 animate-spin" /></div>
            ) : filteredDocs.length === 0 ? (
              <div className="p-12 text-center text-zinc-500">
                <FileText className="w-8 h-8 mx-auto mb-3 opacity-40" />
                {documents.length === 0 ? "No documents yet. Upload above." : "No documents match your search."}
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {filteredDocs.map((doc) => (
                  <motion.div key={doc.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="p-4 flex items-start gap-4 hover:bg-white/2 transition-colors group">
                    <div className="w-9 h-9 rounded-lg bg-brand-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FileText className="w-4 h-4 text-brand-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">{doc.filename}</p>
                        <span className="text-xs text-zinc-600 flex-shrink-0">{doc.chunk_count} chunks</span>
                        {doc.file_size_kb && <span className="text-xs text-zinc-600 flex-shrink-0">{doc.file_size_kb.toFixed(1)}KB</span>}
                      </div>
                      {doc.summary && (
                        <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{doc.summary}</p>
                      )}
                      <Link href={`/query?q=Summarize ${doc.filename}`}
                        className="text-xs text-brand-400 hover:text-brand-300 mt-1 inline-block opacity-0 group-hover:opacity-100 transition-opacity">
                        Ask about this doc →
                      </Link>
                    </div>
                    <button onClick={() => handleDelete(doc.id)} disabled={deleting === doc.id}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition-all flex-shrink-0">
                      {deleting === doc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

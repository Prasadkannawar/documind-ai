"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { documindApi } from "@/lib/api";
import { queryToMarkdown, downloadText } from "@/lib/utils";
import type { QueryResponse, SourceChunk } from "@/types";
import Link from "next/link";
import {
  Brain, Send, Loader2, ChevronDown, ChevronUp,
  FileText, AlertCircle, Lightbulb, LayoutDashboard,
  Copy, Download, Share2, AlertTriangle, MessageSquare,
  Trash2, CheckCheck, RefreshCw,
} from "lucide-react";

// ── Token heat map ─────────────────────────────────────────────────────────
function TokenHeatMap({ tokens }: { tokens: { token: string; normalized_importance: number }[] }) {
  if (!tokens.length) return <p className="text-xs text-zinc-600 italic">No token data</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tokens.map((t, i) => {
        const a = t.normalized_importance;
        return (
          <span
            key={i}
            title={`Retrieval importance: ${(a * 100).toFixed(0)}%`}
            className="px-2.5 py-1 rounded-md text-sm font-mono cursor-default transition-all"
            style={{
              backgroundColor: `rgba(99,102,241,${a * 0.55})`,
              color: a > 0.35 ? "#e0e7ff" : "#52525b",
              border: `1px solid rgba(99,102,241,${a * 0.35})`,
            }}
          >
            {t.token}
            <span className="ml-1 text-[10px] opacity-60">{(a * 100).toFixed(0)}%</span>
          </span>
        );
      })}
    </div>
  );
}

// ── Grounding bar ──────────────────────────────────────────────────────────
function GroundingBar({ score, label }: { score: number; label: string }) {
  const pct = Math.round(score * 100);
  const color = pct >= 75 ? "#10b981" : pct >= 50 ? "#f59e0b" : pct >= 25 ? "#f97316" : "#ef4444";
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-zinc-400">
        <span>Grounding Score</span>
        <span style={{ color }} className="font-semibold">{pct}% · {label}</span>
      </div>
      <div className="h-2 bg-surface-300 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full" style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ── Hallucination alert ────────────────────────────────────────────────────
function HallucinationAlert({ grounding }: { grounding: number }) {
  if (grounding >= 0.3) return null;
  return (
    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <span>
        <strong>Low grounding ({Math.round(grounding * 100)}%)</strong> — This answer may contain information
        not directly found in the uploaded documents. Verify before using.
      </span>
    </div>
  );
}

// ── Copy button ────────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1 rounded hover:bg-white/5">
      {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

// ── Share button ───────────────────────────────────────────────────────────
function ShareButton({ question }: { question: string }) {
  const [shared, setShared] = useState(false);
  const share = () => {
    const url = `${window.location.origin}/query?q=${encodeURIComponent(question)}`;
    navigator.clipboard.writeText(url);
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  };
  return (
    <button onClick={share} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1 rounded hover:bg-white/5">
      {shared ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
      {shared ? "Link copied!" : "Share"}
    </button>
  );
}

// ── Source chunk card ──────────────────────────────────────────────────────
function ChunkCard({ chunk, rank }: { chunk: SourceChunk; rank: number }) {
  const [open, setOpen] = useState(rank === 0);
  const borderColor = chunk.relevance_label === "High" ? "border-l-emerald-500"
    : chunk.relevance_label === "Medium" ? "border-l-amber-500" : "border-l-red-500";
  const labelColor = chunk.relevance_label === "High" ? "text-emerald-400 bg-emerald-500/10"
    : chunk.relevance_label === "Medium" ? "text-amber-400 bg-amber-500/10" : "text-red-400 bg-red-500/10";

  return (
    <div className={`glass-card border-l-2 ${borderColor} overflow-hidden`}>
      <button onClick={() => setOpen(!open)} className="w-full p-4 flex items-center justify-between text-left hover:bg-white/2 transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs text-zinc-500 font-mono w-4 flex-shrink-0">#{rank + 1}</span>
          <FileText className="w-4 h-4 text-zinc-500 flex-shrink-0" />
          <span className="text-sm text-white truncate">{chunk.filename}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${labelColor} font-medium flex-shrink-0`}>
            {chunk.relevance_label}
          </span>
          {chunk.page_number && (
            <span className="text-xs text-zinc-600 flex-shrink-0">p.{chunk.page_number}</span>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-2">
          <span className="text-xs text-zinc-500">{(chunk.similarity_score * 100).toFixed(0)}% sim</span>
          <span className="text-xs text-brand-400">{(chunk.attribution_weight * 100).toFixed(0)}% attr</span>
          {open ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-4 pb-4 space-y-3">
              {chunk.extracted_span && (
                <div className="text-xs bg-brand-500/10 border border-brand-500/20 rounded-lg p-3">
                  <span className="text-brand-400 font-semibold">Extracted span: </span>
                  <span className="text-zinc-200">"{chunk.extracted_span}"</span>
                </div>
              )}
              <p className="text-sm text-zinc-400 leading-relaxed">{chunk.content}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Chat message ───────────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  question: string;
  result: QueryResponse;
}

// ── Main ───────────────────────────────────────────────────────────────────
function QueryPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [question, setQuestion] = useState(searchParams.get("q") || "");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [activeResult, setActiveResult] = useState<QueryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-run if ?q= param present
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setQuestion(q);
      handleSubmit(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (q?: string) => {
    const query = (q || question).trim();
    if (!query) return;
    setLoading(true);
    setError(null);

    // Build conversation history for context
    const history = chatHistory.map((m) => [
      { role: "user", content: m.question },
      { role: "assistant", content: m.result.answer },
    ]).flat();

    try {
      const res = await documindApi.query(query, history);
      const msg: ChatMessage = { id: res.id, question: query, result: res };
      setChatHistory((prev) => [...prev, msg]);
      setActiveResult(res);
      // Update URL with latest question
      router.replace(`/query?q=${encodeURIComponent(query)}`, { scroll: false });
      setQuestion("");
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Query failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setChatHistory([]);
    setActiveResult(null);
    setQuestion("");
    router.replace("/query", { scroll: false });
  };

  return (
    <div className="min-h-screen bg-surface-50 flex flex-col">
      {/* Nav */}
      <nav className="border-b border-white/5 px-6 h-16 flex items-center justify-between max-w-7xl mx-auto w-full sticky top-0 z-20 bg-surface-50/80 backdrop-blur">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-violet-500 flex items-center justify-center">
            <Brain className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-white">DocuMind <span className="text-gradient">AI</span></span>
        </Link>
        <div className="flex items-center gap-3">
          {chatHistory.length > 0 && (
            <button onClick={clearChat} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all">
              <Trash2 className="w-3.5 h-3.5" /> Clear chat
            </button>
          )}
          <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors">
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </Link>
        </div>
      </nav>

      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* ── LEFT: chat + input ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Ask Your Documents</h1>
            <p className="text-sm text-zinc-500 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              Multi-turn conversation · zero external API · extractive QA
            </p>
          </div>

          {/* Chat history */}
          <div className="space-y-4">
            <AnimatePresence>
              {chatHistory.map((msg, idx) => (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                  {/* User bubble */}
                  <div className="flex justify-end">
                    <div className="bg-brand-500/20 border border-brand-500/30 text-zinc-200 text-sm px-4 py-3 rounded-2xl rounded-tr-sm max-w-[85%]">
                      {msg.question}
                    </div>
                  </div>
                  {/* Assistant bubble */}
                  <div className="flex justify-start">
                    <div className="glass-card p-4 max-w-[95%] space-y-3">
                      <p className="text-white text-sm leading-relaxed">{msg.result.answer}</p>
                      <HallucinationAlert grounding={msg.result.xai.grounding_score} />
                      <div className="flex items-center gap-1 flex-wrap pt-1 border-t border-white/5">
                        <span className="text-xs text-zinc-600 mr-1">
                          {(msg.result.confidence_score * 100).toFixed(0)}% conf ·
                          {(msg.result.xai.grounding_score * 100).toFixed(0)}% grounded ·
                          {msg.result.processing_time_ms.toFixed(0)}ms
                        </span>
                        <button onClick={() => setActiveResult(msg.result)} className="text-xs text-brand-400 hover:text-brand-300 px-2 py-0.5 rounded hover:bg-brand-500/10 transition-all">
                          <RefreshCw className="w-3 h-3 inline mr-1" />View XAI
                        </button>
                        <CopyButton text={msg.result.answer} />
                        <button onClick={() => downloadText(queryToMarkdown(msg.result), `documind-${idx + 1}.md`)}
                          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1 rounded hover:bg-white/5">
                          <Download className="w-3.5 h-3.5" /> Export MD
                        </button>
                        <ShareButton question={msg.question} />
                      </div>
                    </div>
                  </div>
                  {/* Suggested questions (only last message) */}
                  {idx === chatHistory.length - 1 && msg.result.suggested_questions.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-zinc-600 flex items-center gap-1"><Lightbulb className="w-3 h-3" /> Suggested</p>
                      {msg.result.suggested_questions.map((q, i) => (
                        <button key={i} onClick={() => handleSubmit(q)}
                          className="w-full text-left text-xs text-zinc-400 hover:text-white p-2.5 glass-card hover:border-white/10 transition-all rounded-lg">
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {loading && (
              <div className="flex items-center gap-2 text-zinc-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
                Searching documents and generating answer…
              </div>
            )}

            {error && (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
                {error.toLowerCase().includes("no documents") && (
                  <Link href="/dashboard" className="underline ml-1 whitespace-nowrap">Upload docs →</Link>
                )}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input box */}
          <div className="sticky bottom-6">
            <div className="glass-card p-4">
              <textarea
                ref={textareaRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit(); }}
                placeholder={chatHistory.length > 0 ? "Ask a follow-up question…" : "What does this document say about…?"}
                rows={3}
                className="w-full bg-transparent text-white placeholder-zinc-600 text-sm resize-none outline-none leading-relaxed"
              />
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                <div className="flex items-center gap-3 text-xs text-zinc-600">
                  <span>⌘↵ to send</span>
                  {chatHistory.length > 0 && <span>{chatHistory.length} turn{chatHistory.length > 1 ? "s" : ""}</span>}
                </div>
                <button onClick={() => handleSubmit()} disabled={loading || !question.trim()}
                  className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {loading ? "Thinking…" : "Ask"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: XAI panel ──────────────────────────────────────────── */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">XAI Explainability</h2>
            <p className="text-sm text-zinc-500">Why did the AI give that answer?</p>
          </div>

          <AnimatePresence mode="wait">
            {!activeResult && !loading && (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="glass-card p-12 text-center">
                <Brain className="w-10 h-10 mx-auto mb-4 text-zinc-700" />
                <p className="text-zinc-500 text-sm">Ask a question to see the XAI report.</p>
                <p className="text-zinc-600 text-xs mt-2">Token attribution · grounding score · reasoning chain</p>
              </motion.div>
            )}

            {loading && !activeResult && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="glass-card p-4 animate-pulse">
                    <div className="h-4 bg-surface-300 rounded w-1/3 mb-3" />
                    <div className="h-3 bg-surface-300 rounded w-full mb-2" />
                    <div className="h-3 bg-surface-300 rounded w-2/3" />
                  </div>
                ))}
              </motion.div>
            )}

            {activeResult && (
              <motion.div key={activeResult.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">

                {/* Token attribution */}
                <div className="glass-card p-5">
                  <h3 className="text-sm font-semibold text-white mb-1">Token Attribution Heat Map</h3>
                  <p className="text-xs text-zinc-600 mb-3">Leave-one-out attribution — brighter = drives retrieval more</p>
                  <TokenHeatMap tokens={activeResult.xai.token_importance} />
                </div>

                {/* Grounding + stats */}
                <div className="glass-card p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-white">Grounding & Confidence</h3>
                  <GroundingBar score={activeResult.xai.grounding_score} label={activeResult.xai.grounding_label} />
                  <HallucinationAlert grounding={activeResult.xai.grounding_score} />
                  <div className="grid grid-cols-3 gap-3 pt-1">
                    {[
                      { v: `${(activeResult.confidence_score * 100).toFixed(0)}%`, l: "Confidence" },
                      { v: activeResult.xai.chunks_used, l: "Chunks used" },
                      { v: `${(activeResult.xai.avg_similarity * 100).toFixed(0)}%`, l: "Avg similarity" },
                    ].map((s) => (
                      <div key={s.l} className="text-center bg-surface-200 rounded-lg py-3">
                        <div className="text-lg font-bold text-white">{s.v}</div>
                        <div className="text-xs text-zinc-500 mt-0.5">{s.l}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reasoning chain */}
                <div className="glass-card p-5">
                  <h3 className="text-sm font-semibold text-white mb-3">Reasoning Chain</h3>
                  <div className="space-y-3">
                    {activeResult.xai.reasoning_steps.map((step, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</div>
                        <p className="text-sm text-zinc-400 leading-relaxed">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Source chunks */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white">Source Chunks ({activeResult.source_chunks.length})</h3>
                    <span className="text-xs text-zinc-500">Top: {activeResult.xai.top_source}</span>
                  </div>
                  <div className="space-y-3">
                    {activeResult.source_chunks.map((chunk, i) => (
                      <ChunkCard key={chunk.chunk_id} chunk={chunk} rank={i} />
                    ))}
                  </div>
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default function QueryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface-50 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand-400" /></div>}>
      <QueryPageInner />
    </Suspense>
  );
}

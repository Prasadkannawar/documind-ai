"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Brain, FileText, Zap, Shield, BarChart3, Search,
  ArrowRight, CheckCircle, Github, Layers
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "XAI — Token Attribution",
    desc: "See which words in your question drove the retrieval. Leave-one-out attribution scores every query token in real time.",
    color: "from-brand-500 to-violet-500",
  },
  {
    icon: Shield,
    title: "Hallucination Grounding Score",
    desc: "Every answer gets a grounding score measuring how well it is supported by source documents — anti-hallucination built in.",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: Search,
    title: "Hybrid Search",
    desc: "Vector similarity + BM25 keyword search combined for state-of-the-art retrieval precision, stored in Supabase pgvector.",
    color: "from-orange-500 to-amber-500",
  },
  {
    icon: Zap,
    title: "Zero External API",
    desc: "Runs entirely on own open-source models: BGE-small for embeddings, tinyRoberta for extractive QA. No OpenAI. No Anthropic.",
    color: "from-pink-500 to-rose-500",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    desc: "Track confidence trends, grounding scores, query latency, and document coverage over time.",
    color: "from-cyan-500 to-blue-500",
  },
  {
    icon: Layers,
    title: "Multi-format Ingestion",
    desc: "Upload PDF, DOCX, TXT, and Markdown. Sentence-aware chunking preserves context across boundaries.",
    color: "from-violet-500 to-purple-500",
  },
];

const stats = [
  { value: "0", label: "External APIs needed" },
  { value: "384D", label: "BGE embedding space" },
  { value: "65MB", label: "QA model size" },
  { value: "<2s", label: "Average query time" },
];

const techStack = [
  { name: "Next.js 15", role: "Frontend" },
  { name: "FastAPI", role: "Backend" },
  { name: "Supabase pgvector", role: "Vector DB" },
  { name: "BGE-small-en", role: "Embeddings" },
  { name: "tinyRoberta-SQuAD2", role: "QA Model" },
  { name: "Vercel + Render", role: "Deployment" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface-50 overflow-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-violet-500 flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-white">DocuMind <span className="text-gradient">AI</span></span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Dashboard
            </Link>
            <Link href="/query" className="text-sm bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg transition-colors font-medium">
              Try Demo
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-6">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-brand-500/5 blur-[120px]" />
          <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] rounded-full bg-violet-500/5 blur-[100px]" />
        </div>

        <div className="max-w-5xl mx-auto text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-brand-500/30 bg-brand-500/10 text-brand-400 text-sm mb-8">
              <Zap className="w-3.5 h-3.5" />
              No external AI API — fully open-source models
            </div>

            <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight mb-6">
              Ask your documents.{" "}
              <span className="text-gradient">Understand</span>{" "}
              your AI.
            </h1>

            <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-12 leading-relaxed">
              DocuMind AI is a production-grade RAG system with full explainability.
              Upload documents, ask anything, and see <em>exactly</em> how every answer was derived —
              token by token, chunk by chunk.
            </p>

            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link
                href="/query"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-brand-500 to-violet-500 hover:from-brand-600 hover:to-violet-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all glow-brand"
              >
                Try Demo <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="https://github.com/Prasadkannawar/explainable-doc-rag-system"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-white/10 hover:border-white/20 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all"
              >
                <Github className="w-5 h-5" /> Source Code
              </a>
            </div>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20"
          >
            {stats.map((s) => (
              <div key={s.label} className="glass-card p-6 text-center">
                <div className="text-3xl font-bold text-gradient mb-1">{s.value}</div>
                <div className="text-sm text-zinc-500">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* XAI Demo Preview */}
      <section className="px-6 py-16">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card p-6 border-gradient"
          >
            <div className="text-xs text-zinc-500 mb-4 font-mono flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              LIVE XAI PANEL — Token Importance Attribution
            </div>

            {/* Fake token importance bar */}
            <div className="mb-6">
              <p className="text-sm text-zinc-400 mb-3">Query: <span className="text-white">"What are the key risk factors in the report?"</span></p>
              <div className="flex flex-wrap gap-2">
                {[
                  { token: "What", imp: 0.05 },
                  { token: "are", imp: 0.02 },
                  { token: "the", imp: 0.01 },
                  { token: "key", imp: 0.72 },
                  { token: "risk", imp: 0.95 },
                  { token: "factors", imp: 0.88 },
                  { token: "in", imp: 0.03 },
                  { token: "the", imp: 0.01 },
                  { token: "report", imp: 0.64 },
                ].map((t) => (
                  <span
                    key={t.token}
                    className="px-3 py-1.5 rounded-lg text-sm font-mono font-medium transition-all"
                    style={{
                      backgroundColor: `rgba(99, 102, 241, ${t.imp * 0.6})`,
                      color: t.imp > 0.4 ? "#fff" : "#71717a",
                      border: `1px solid rgba(99, 102, 241, ${t.imp * 0.4})`,
                    }}
                    title={`Importance: ${(t.imp * 100).toFixed(0)}%`}
                  >
                    {t.token}
                    <span className="ml-1 text-xs opacity-60">{(t.imp * 100).toFixed(0)}%</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Grounding score bar */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-zinc-400 whitespace-nowrap">Grounding Score</span>
              <div className="flex-1 h-2 bg-surface-300 rounded-full overflow-hidden">
                <div className="h-full w-[84%] bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" />
              </div>
              <span className="text-sm font-semibold text-emerald-400">84% — Highly Grounded</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              Built for production. Built for <span className="text-gradient">understanding.</span>
            </h2>
            <p className="text-zinc-400 max-w-xl mx-auto">
              Every feature was designed to answer: not just <em>what</em> the AI said, but <em>why</em>.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="glass-card p-6 hover:border-white/10 transition-all group"
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${f.color} flex items-center justify-center mb-4`}>
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="px-6 py-16 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-10">Tech Stack</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {techStack.map((t) => (
              <div key={t.name} className="glass-card p-4 flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-brand-400 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-white">{t.name}</div>
                  <div className="text-xs text-zinc-500">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24">
        <div className="max-w-3xl mx-auto text-center">
          <div className="glass-card p-12 border-gradient">
            <h2 className="text-4xl font-bold text-white mb-4">Ready to explore?</h2>
            <p className="text-zinc-400 mb-8">Upload a PDF and ask your first question in under 60 seconds.</p>
            <Link
              href="/query"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-brand-500 to-violet-500 text-white px-10 py-4 rounded-xl font-semibold text-lg hover:opacity-90 transition-all glow-brand"
            >
              Launch App <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-brand-400" />
            <span className="text-sm text-zinc-400">DocuMind AI — built by <a href="https://github.com/Prasadkannawar" className="text-brand-400 hover:text-brand-300">Prasad Kannawar</a></span>
          </div>
          <div className="flex items-center gap-6 text-sm text-zinc-500">
            <Link href="/dashboard" className="hover:text-zinc-300 transition-colors">Dashboard</Link>
            <Link href="/query" className="hover:text-zinc-300 transition-colors">Query</Link>
            <Link href="/history" className="hover:text-zinc-300 transition-colors">History</Link>
            <a href="https://github.com/Prasadkannawar/explainable-doc-rag-system" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300 transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { documindApi } from "@/lib/api";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, Legend,
} from "recharts";
import { Brain, ArrowRight, TrendingUp, Database, Zap, Shield } from "lucide-react";
import type { AnalyticsData } from "@/types";

const CHART_STYLE = {
  cartesianGrid: { strokeDasharray: "3 3", stroke: "#1f1f1f" },
  tooltip: {
    contentStyle: { background: "#111", border: "1px solid #222", borderRadius: 8, fontSize: 12 },
    labelStyle: { color: "#71717a" },
  },
};

export default function HistoryPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    documindApi.analytics().then(setAnalytics).catch(console.error).finally(() => setLoading(false));
  }, []);

  // Build chart data from recent queries (reverse to chronological order)
  const chartData = (analytics?.recent_queries || [])
    .slice()
    .reverse()
    .map((q, i) => ({
      name: `Q${i + 1}`,
      confidence: Math.round((q.confidence_score || 0) * 100),
      grounding: Math.round((q.grounding_score || 0) * 100),
      question: q.question.slice(0, 40) + (q.question.length > 40 ? "…" : ""),
      time: new Date(q.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }));

  const MetricCard = ({
    value, label, icon: Icon, color, sub,
  }: { value: string | number; label: string; icon: React.ElementType; color: string; sub?: string }) => (
    <div className="glass-card p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-xs text-zinc-500 mt-0.5">{label}</div>
        {sub && <div className="text-xs text-zinc-600 mt-1">{sub}</div>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-50">
      <nav className="border-b border-white/5 px-6 h-16 flex items-center justify-between max-w-7xl mx-auto sticky top-0 bg-surface-50/80 backdrop-blur z-10">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-violet-500 flex items-center justify-center">
            <Brain className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-white">DocuMind <span className="text-gradient">AI</span></span>
        </Link>
        <Link href="/query" className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          Ask Questions <ArrowRight className="w-4 h-4" />
        </Link>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-white mb-1">Analytics Dashboard</h1>
          <p className="text-zinc-400 mb-8">Confidence, grounding, and latency trends across all queries.</p>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[1,2,3,4].map(i => <div key={i} className="glass-card p-5 animate-pulse h-24" />)}
            </div>
          ) : analytics ? (
            <>
              {/* Metric cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <MetricCard value={analytics.total_queries} label="Total Queries" icon={TrendingUp} color="bg-brand-500" />
                <MetricCard value={analytics.total_documents} label="Documents" icon={Database} color="bg-violet-500"
                  sub={`${analytics.total_chunks} chunks indexed`} />
                <MetricCard value={`${((analytics.avg_confidence || 0) * 100).toFixed(0)}%`} label="Avg Confidence" icon={Zap} color="bg-emerald-600" />
                <MetricCard value={`${((analytics.avg_grounding || 0) * 100).toFixed(0)}%`} label="Avg Grounding" icon={Shield} color="bg-amber-600"
                  sub={`${Math.round(analytics.avg_latency_ms || 0)}ms avg latency`} />
              </div>

              {/* Charts — only show if we have data */}
              {chartData.length > 1 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

                  {/* Confidence + grounding trend */}
                  <div className="glass-card p-5">
                    <h2 className="text-sm font-semibold text-white mb-4">Confidence & Grounding Trend</h2>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="groundGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid {...CHART_STYLE.cartesianGrid} />
                        <XAxis dataKey="name" tick={{ fill: "#52525b", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 100]} tick={{ fill: "#52525b", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip {...CHART_STYLE.tooltip} formatter={(v: number) => [`${v}%`]} labelFormatter={(l) => {
                          const d = chartData.find(x => x.name === l);
                          return d?.question || l;
                        }} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: "#71717a" }} />
                        <Area type="monotone" dataKey="confidence" name="Confidence %" stroke="#6366f1" fill="url(#confGrad)" strokeWidth={2} dot={{ fill: "#6366f1", r: 3 }} />
                        <Area type="monotone" dataKey="grounding" name="Grounding %" stroke="#10b981" fill="url(#groundGrad)" strokeWidth={2} dot={{ fill: "#10b981", r: 3 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Confidence vs grounding scatter-style bar */}
                  <div className="glass-card p-5">
                    <h2 className="text-sm font-semibold text-white mb-4">Confidence vs Grounding Per Query</h2>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }} barGap={2}>
                        <CartesianGrid {...CHART_STYLE.cartesianGrid} />
                        <XAxis dataKey="name" tick={{ fill: "#52525b", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 100]} tick={{ fill: "#52525b", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip {...CHART_STYLE.tooltip} formatter={(v: number) => [`${v}%`]} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: "#71717a" }} />
                        <Bar dataKey="confidence" name="Confidence %" fill="#6366f1" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="grounding" name="Grounding %" fill="#10b981" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Recent queries table */}
              <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-white/5">
                  <h2 className="text-sm font-semibold text-white">Recent Queries</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5">
                        {["Question", "Confidence", "Grounding", "When"].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {(analytics.recent_queries || []).map((q) => (
                        <tr key={q.id} className="hover:bg-white/2 transition-colors">
                          <td className="px-4 py-3 text-zinc-300 max-w-xs">
                            <Link href={`/query?q=${encodeURIComponent(q.question)}`}
                              className="hover:text-white transition-colors line-clamp-1">
                              {q.question}
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`font-medium ${(q.confidence_score || 0) >= 0.7 ? "text-emerald-400" : (q.confidence_score || 0) >= 0.4 ? "text-amber-400" : "text-red-400"}`}>
                              {((q.confidence_score || 0) * 100).toFixed(0)}%
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`font-medium ${(q.grounding_score || 0) >= 0.5 ? "text-emerald-400" : (q.grounding_score || 0) >= 0.3 ? "text-amber-400" : "text-red-400"}`}>
                              {((q.grounding_score || 0) * 100).toFixed(0)}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">
                            {new Date(q.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </td>
                        </tr>
                      ))}
                      {!analytics.recent_queries?.length && (
                        <tr><td colSpan={4} className="px-4 py-12 text-center text-zinc-600">No queries yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="glass-card p-12 text-center text-zinc-500">
              Could not load analytics — check backend connection.
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

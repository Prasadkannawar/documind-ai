import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { QueryResponse } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a QueryResponse as a Markdown string for download / clipboard */
export function queryToMarkdown(result: QueryResponse): string {
  const date = new Date(result.timestamp).toLocaleString();
  const lines: string[] = [
    `# DocuMind AI — Query Export`,
    `*Exported: ${date}*`,
    ``,
    `## Question`,
    result.question,
    ``,
    `## Answer`,
    result.answer,
    ``,
    `**Confidence:** ${(result.confidence_score * 100).toFixed(0)}%  `,
    `**Grounding:** ${(result.xai.grounding_score * 100).toFixed(0)}% — ${result.xai.grounding_label}  `,
    `**Latency:** ${result.processing_time_ms.toFixed(0)}ms  `,
    `**Models:** ${result.embedding_model.split("/").pop()} · ${result.qa_model.split("/").pop()}`,
    ``,
    `## Source Chunks`,
  ];

  result.source_chunks.forEach((chunk, i) => {
    lines.push(
      ``,
      `### Chunk ${i + 1} — ${chunk.filename} (${chunk.relevance_label} · ${(chunk.similarity_score * 100).toFixed(0)}% similarity)`,
      chunk.extracted_span ? `> **Extracted span:** "${chunk.extracted_span}"` : ``,
      ``,
      chunk.content,
    );
  });

  lines.push(
    ``,
    `## XAI Explainability`,
    ``,
    `### Token Attribution`,
    result.xai.token_importance
      .map((t) => `- \`${t.token}\`: ${(t.normalized_importance * 100).toFixed(0)}%`)
      .join("\n"),
    ``,
    `### Reasoning Chain`,
    result.xai.reasoning_steps.map((s, i) => `${i + 1}. ${s}`).join("\n"),
  );

  return lines.filter((l) => l !== undefined).join("\n");
}

/** Trigger browser download of a text file */
export function downloadText(content: string, filename: string, mime = "text/markdown") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60);
}

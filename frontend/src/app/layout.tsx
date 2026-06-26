import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DocuMind AI — Ask your documents. Understand your AI.",
  description:
    "Production-ready RAG system with full explainability. Upload documents, ask questions, and see exactly how AI derives each answer — with token-level attribution, grounding scores, and source highlighting.",
  keywords: ["RAG", "Explainable AI", "XAI", "Document QA", "NLP", "Machine Learning"],
  openGraph: {
    title: "DocuMind AI",
    description: "Ask your documents. Understand your AI.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

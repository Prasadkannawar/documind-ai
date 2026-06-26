import re
import logging
from pathlib import Path
from typing import List, Tuple

logger = logging.getLogger(__name__)


class DocumentProcessor:
    def __init__(self, chunk_size: int = 400, chunk_overlap: int = 60):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def extract_text(self, file_path: str, filename: str) -> str:
        ext = Path(filename).suffix.lower()
        if ext == ".pdf":
            return self._from_pdf(file_path)
        if ext == ".docx":
            return self._from_docx(file_path)
        if ext in (".txt", ".md"):
            return self._from_text(file_path)
        raise ValueError(f"Unsupported file type: {ext}")

    def extract_summary(self, text: str, max_sentences: int = 5) -> str:
        """Extractive summary: first N sentences of the document."""
        sentences = re.split(r'(?<=[.!?])\s+', text.strip())
        return " ".join(sentences[:max_sentences])

    def chunk_text(self, text: str, document_id: str, filename: str) -> List[dict]:
        text = self._clean(text)
        sentences = re.split(r'(?<=[.!?])\s+', text)
        sentences = [s.strip() for s in sentences if s.strip()]

        chunks: List[dict] = []
        current: List[str] = []
        current_len = 0

        for sent in sentences:
            slen = len(sent)
            if current_len + slen > self.chunk_size and current:
                chunks.append(self._make(current, document_id, filename, len(chunks)))
                # Retain overlap sentences
                overlap: List[str] = []
                olen = 0
                for s in reversed(current):
                    if olen + len(s) > self.chunk_overlap:
                        break
                    overlap.insert(0, s)
                    olen += len(s)
                current = overlap
                current_len = olen
            current.append(sent)
            current_len += slen

        if current:
            chunks.append(self._make(current, document_id, filename, len(chunks)))

        return chunks

    # ── Private helpers ────────────────────────────────────────────────────────

    def _make(self, sentences: List[str], doc_id: str, filename: str, idx: int) -> dict:
        return {
            "document_id": doc_id,
            "filename": filename,
            "content": " ".join(sentences).strip(),
            "chunk_index": idx,
        }

    def _clean(self, text: str) -> str:
        text = re.sub(r'\n{3,}', '\n\n', text)
        text = re.sub(r'[ \t]{2,}', ' ', text)
        return text.strip()

    def extract_text_with_pages(self, path: str, filename: str) -> list[tuple[int, str]]:
        """Returns list of (page_number, text) tuples for PDF files."""
        ext = Path(filename).suffix.lower()
        if ext != ".pdf":
            return [(1, self.extract_text(path, filename))]
        try:
            import pdfplumber
            pages = []
            with pdfplumber.open(path) as pdf:
                for i, page in enumerate(pdf.pages, 1):
                    t = page.extract_text()
                    if t:
                        pages.append((i, t))
            return pages
        except ImportError:
            import pypdf
            reader = pypdf.PdfReader(path)
            return [
                (i + 1, p.extract_text())
                for i, p in enumerate(reader.pages)
                if p.extract_text()
            ]

    def chunk_text_with_pages(
        self, page_texts: list[tuple[int, str]], document_id: str, filename: str
    ) -> list[dict]:
        """Chunk with page number metadata tracked per chunk."""
        all_chunks = []
        chunk_idx = 0
        for page_num, text in page_texts:
            text = self._clean(text)
            sentences = re.split(r'(?<=[.!?])\s+', text)
            sentences = [s.strip() for s in sentences if s.strip()]
            current: list[str] = []
            current_len = 0
            for sent in sentences:
                slen = len(sent)
                if current_len + slen > self.chunk_size and current:
                    all_chunks.append({
                        **self._make(current, document_id, filename, chunk_idx),
                        "page_number": page_num,
                    })
                    chunk_idx += 1
                    overlap: list[str] = []
                    olen = 0
                    for s in reversed(current):
                        if olen + len(s) > self.chunk_overlap:
                            break
                        overlap.insert(0, s)
                        olen += len(s)
                    current = overlap
                    current_len = olen
                current.append(sent)
                current_len += slen
            if current:
                all_chunks.append({
                    **self._make(current, document_id, filename, chunk_idx),
                    "page_number": page_num,
                })
                chunk_idx += 1
        return all_chunks

    def _from_pdf(self, path: str) -> str:
        try:
            import pdfplumber
            parts = []
            with pdfplumber.open(path) as pdf:
                for page in pdf.pages:
                    t = page.extract_text()
                    if t:
                        parts.append(t)
            return "\n\n".join(parts)
        except ImportError:
            import pypdf
            reader = pypdf.PdfReader(path)
            return "\n\n".join(
                p.extract_text() for p in reader.pages if p.extract_text()
            )

    def _from_docx(self, path: str) -> str:
        from docx import Document
        doc = Document(path)
        return "\n\n".join(p.text for p in doc.paragraphs if p.text.strip())

    def _from_text(self, path: str) -> str:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()

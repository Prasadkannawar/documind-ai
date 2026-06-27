"""
Image analysis service — extracts images from PDFs and captions them with BLIP.
Captions become searchable text chunks in the RAG pipeline.
"""
import io
import logging
from typing import List, Tuple

logger = logging.getLogger(__name__)

# Lazy-loaded BLIP model (downloads ~1 GB on first use)
_processor = None
_model = None


def _load_model():
    global _processor, _model
    if _model is None:
        try:
            from transformers import BlipProcessor, BlipForConditionalGeneration
            logger.info("Loading BLIP image captioning model (Salesforce/blip-image-captioning-base)…")
            _processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
            _model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")
            _model.eval()
            logger.info("BLIP model ready.")
        except Exception as e:
            logger.error(f"Failed to load BLIP model: {e}")
            raise
    return _processor, _model


def caption_image(image_bytes: bytes) -> str:
    """Return a natural-language caption for the given image bytes."""
    try:
        from PIL import Image
        import torch

        processor, model = _load_model()
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        # Resize large images to keep inference fast
        max_dim = 800
        if max(image.size) > max_dim:
            image.thumbnail((max_dim, max_dim), Image.LANCZOS)

        inputs = processor(image, return_tensors="pt")
        with torch.no_grad():
            out = model.generate(**inputs, max_new_tokens=150, num_beams=3)
        caption = processor.decode(out[0], skip_special_tokens=True).strip()
        return caption
    except Exception as e:
        logger.warning(f"Image captioning failed (skipping): {e}")
        return ""


def extract_images_from_pdf(pdf_path: str) -> List[Tuple[int, bytes]]:
    """
    Extract embedded images from a PDF using PyMuPDF.
    Returns list of (page_number, image_bytes) — skips tiny images (icons etc.).
    """
    try:
        import fitz  # PyMuPDF
    except ImportError:
        logger.warning("PyMuPDF not installed — image extraction disabled. Add `pymupdf` to requirements.")
        return []

    images: List[Tuple[int, bytes]] = []
    try:
        doc = fitz.open(pdf_path)
        seen_xrefs = set()
        for page_idx in range(len(doc)):
            page = doc[page_idx]
            for img_info in page.get_images(full=True):
                xref = img_info[0]
                if xref in seen_xrefs:
                    continue
                seen_xrefs.add(xref)
                try:
                    base = doc.extract_image(xref)
                    w, h = base.get("width", 0), base.get("height", 0)
                    # Skip tiny images (logos, bullets, decorators)
                    if w >= 80 and h >= 80:
                        images.append((page_idx + 1, base["image"]))
                except Exception:
                    continue
    except Exception as e:
        logger.warning(f"PDF image extraction failed: {e}")
    return images


def build_image_chunks(
    pdf_path: str,
    document_id: str,
    filename: str,
    starting_chunk_index: int,
) -> List[dict]:
    """
    Extract images from `pdf_path`, caption each with BLIP,
    and return them as chunk dicts ready for embedding.
    """
    raw_images = extract_images_from_pdf(pdf_path)
    if not raw_images:
        return []

    chunks = []
    for page_num, img_bytes in raw_images:
        caption = caption_image(img_bytes)
        if not caption:
            continue
        content = f"[Image on page {page_num}: {caption}]"
        chunks.append({
            "document_id": document_id,
            "filename": filename,
            "content": content,
            "chunk_index": starting_chunk_index + len(chunks),
            "page_number": page_num,
            "is_image_chunk": True,
        })
        logger.info(f"  → Image chunk (page {page_num}): {caption[:80]}…")

    logger.info(f"Generated {len(chunks)} image chunk(s) from {filename}")
    return chunks

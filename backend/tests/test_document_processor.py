from app.services.document_processor import DocumentProcessor


def test_chunking_creates_multiple_chunks():
    p = DocumentProcessor(chunk_size=100, chunk_overlap=20)
    text = "Hello world this is a sentence. " * 20
    chunks = p.chunk_text(text, "doc-001", "test.txt")
    assert len(chunks) > 1
    for c in chunks:
        assert c["document_id"] == "doc-001"
        assert c["filename"] == "test.txt"
        assert len(c["content"]) > 0


def test_summary_extracts_first_sentences():
    p = DocumentProcessor()
    text = "First sentence here. Second sentence here. Third sentence here. Fourth sentence here."
    summary = p.extract_summary(text, max_sentences=2)
    assert "First sentence" in summary
    assert "Fourth" not in summary


def test_clean_removes_extra_whitespace():
    p = DocumentProcessor()
    dirty = "Hello    world\n\n\n\nTest   here"
    clean = p._clean(dirty)
    assert "    " not in clean
    assert "\n\n\n" not in clean

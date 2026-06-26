from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    APP_NAME: str = "DocuMind AI"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = False
    FRONTEND_URL: str = "http://localhost:3000"

    # Supabase
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str

    # Own models — no external API needed
    EMBEDDING_MODEL: str = "BAAI/bge-small-en-v1.5"   # 130 MB, 384-dim
    QA_MODEL: str = "deepset/tinyroberta-squad2"        # 65 MB, extractive QA
    NER_MODEL: str = "dslim/bert-base-NER"              # optional NER

    # RAG settings
    CHUNK_SIZE: int = 400
    CHUNK_OVERLAP: int = 60
    TOP_K_RESULTS: int = 5
    SIMILARITY_THRESHOLD: float = 0.25
    KEYWORD_WEIGHT: float = 0.3          # weight for BM25 in hybrid search

    # XAI settings
    XAI_PERTURBATION_SAMPLES: int = 10  # leave-one-out token importance

    # Upload
    MAX_FILE_SIZE_MB: int = 50
    ALLOWED_EXTENSIONS: list = [".pdf", ".txt", ".docx", ".md"]

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

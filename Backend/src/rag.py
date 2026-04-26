"""
RAG system usando numpy + OpenAI embeddings.
Armazena vetores em .npy e metadados em .json — sem dependências de vector store.
"""

import json
import logging
from pathlib import Path

import numpy as np
from openai import OpenAI

logger = logging.getLogger(__name__)

CHUNK_SIZE = 800
CHUNK_OVERLAP = 120
EMBED_MODEL = "text-embedding-3-small"
EMBED_DIM = 1536
BATCH_SIZE = 100


class RAGSystem:
    def __init__(self, persist_dir: str, docs_dir: str, openai_api_key: str):
        self.persist_dir = Path(persist_dir)
        self.docs_dir = Path(docs_dir)
        self.client = OpenAI(api_key=openai_api_key)
        self.persist_dir.mkdir(parents=True, exist_ok=True)

        self._vecs_path = self.persist_dir / "embeddings.npy"
        self._meta_path = self.persist_dir / "chunks.json"

        self._vectors: np.ndarray | None = None  # shape (N, EMBED_DIM)
        self._chunks: list[dict] = []            # [{text, source, page}, ...]

        self._load()

    # ── persistência ──────────────────────────────────────────────────────────

    def _load(self) -> None:
        if self._vecs_path.exists() and self._meta_path.exists():
            try:
                self._vectors = np.load(str(self._vecs_path))
                with open(self._meta_path, encoding="utf-8") as f:
                    self._chunks = json.load(f)
                logger.info("RAG carregado: %d chunks.", len(self._chunks))
            except Exception:
                logger.warning("Falha ao carregar índice RAG. Execute ingest.py.")
                self._vectors = None
                self._chunks = []

    def _save(self) -> None:
        np.save(str(self._vecs_path), self._vectors)
        with open(self._meta_path, "w", encoding="utf-8") as f:
            json.dump(self._chunks, f, ensure_ascii=False)

    # ── API pública ───────────────────────────────────────────────────────────

    def is_indexed(self) -> bool:
        return self._vectors is not None and len(self._vectors) > 0

    def ingest(self, force: bool = False) -> None:
        if self.is_indexed() and not force:
            logger.info("Já indexado com %d chunks.", len(self._chunks))
            return

        try:
            import pdfplumber
        except ImportError:
            raise RuntimeError("pdfplumber não instalado. Execute: pip install pdfplumber")

        pdf_files = list(self.docs_dir.rglob("*.pdf"))
        if not pdf_files:
            logger.warning("Nenhum PDF encontrado em %s", self.docs_dir)
            return

        logger.info("Processando %d PDFs...", len(pdf_files))

        all_texts: list[str] = []
        all_meta: list[dict] = []

        for pdf_path in pdf_files:
            logger.info("  → %s", pdf_path.name)
            try:
                with pdfplumber.open(pdf_path) as pdf:
                    for page_num, page in enumerate(pdf.pages, start=1):
                        text = (page.extract_text() or "").strip()
                        if len(text) < 80:
                            continue
                        for chunk in self._split(text):
                            all_texts.append(chunk)
                            all_meta.append({"source": pdf_path.name, "page": page_num})
            except Exception:
                logger.exception("Erro ao processar %s", pdf_path.name)

        if not all_texts:
            logger.warning("Nenhum texto extraído dos PDFs.")
            return

        logger.info("Gerando embeddings para %d chunks...", len(all_texts))

        all_vecs: list[np.ndarray] = []

        for i in range(0, len(all_texts), BATCH_SIZE):
            batch = all_texts[i : i + BATCH_SIZE]
            vecs = self._embed(batch)
            all_vecs.append(vecs)
            logger.info("  Indexados %d/%d chunks", min(i + BATCH_SIZE, len(all_texts)), len(all_texts))

        self._vectors = np.vstack(all_vecs).astype(np.float32)
        self._chunks = [
            {"text": t, "source": m["source"], "page": m["page"]}
            for t, m in zip(all_texts, all_meta)
        ]
        self._save()
        logger.info("Ingestão concluída: %d chunks de %d PDFs.", len(self._chunks), len(pdf_files))

    def retrieve(self, query: str, n_results: int = 5) -> str:
        if not self.is_indexed():
            return ""

        q_vec = self._embed([query])                    # (1, D)
        sims = (self._vectors @ q_vec.T).squeeze()      # (N,) — cosine (vetores normalizados)
        top_k = int(min(n_results, len(self._chunks)))
        idxs = np.argpartition(sims, -top_k)[-top_k:]
        idxs = idxs[np.argsort(sims[idxs])[::-1]]

        parts = []
        for idx in idxs:
            c = self._chunks[int(idx)]
            parts.append(f"[{c['source']}, p.{c['page']}]\n{c['text']}")

        return "\n\n---\n\n".join(parts)

    # ── helpers ───────────────────────────────────────────────────────────────

    def _embed(self, texts: list[str]) -> np.ndarray:
        resp = self.client.embeddings.create(model=EMBED_MODEL, input=texts)
        vecs = np.array([e.embedding for e in resp.data], dtype=np.float32)
        norms = np.linalg.norm(vecs, axis=1, keepdims=True)
        return vecs / np.maximum(norms, 1e-9)

    def _split(self, text: str) -> list[str]:
        chunks, start = [], 0
        while start < len(text):
            chunk = text[start : start + CHUNK_SIZE]
            if chunk.strip():
                chunks.append(chunk)
            start += CHUNK_SIZE - CHUNK_OVERLAP
        return chunks

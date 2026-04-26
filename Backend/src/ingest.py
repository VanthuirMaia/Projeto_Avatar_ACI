"""
Script de ingestão dos documentos para o índice RAG.

Uso:
    python ingest.py            # indexa do zero (remove índice anterior)
    python ingest.py --keep     # mantém índice se já existir
"""

import os
import sys
import shutil
import logging
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


def main() -> None:
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        print("Erro: variável OPENAI_API_KEY não definida.")
        sys.exit(1)

    src_dir = Path(__file__).parent
    persist_dir = src_dir.parent / "data" / "rag_store"
    docs_dir = src_dir.parent.parent / "docs_RAG_TEA"

    if not docs_dir.exists():
        print(f"Erro: pasta de documentos não encontrada: {docs_dir}")
        sys.exit(1)

    keep = "--keep" in sys.argv

    if persist_dir.exists() and not keep:
        logger.info("Removendo índice anterior em %s ...", persist_dir)
        shutil.rmtree(persist_dir)
        logger.info("Removido.")

    from rag import RAGSystem

    rag = RAGSystem(
        persist_dir=str(persist_dir),
        docs_dir=str(docs_dir),
        openai_api_key=api_key,
    )

    rag.ingest(force=False)


if __name__ == "__main__":
    main()

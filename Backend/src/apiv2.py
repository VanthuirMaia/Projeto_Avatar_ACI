import os
import json
import logging
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, TimeoutError
from flask import Flask, request, jsonify
from flask_cors import CORS

from utils2 import load_intents
from nlu import processar_texto

if os.getenv("USE_LLM", "False") == "True":
    import google.generativeai as genai
    from google.generativeai.types import GenerationConfig, StopCandidateException, BlockedPromptException
    import grpc

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Paths ──────────────────────────────────────────────────────────────────────
_SRC = Path(__file__).parent
_DATA = _SRC.parent / "data"
_DOCS = _SRC.parent.parent / "docs_RAG_TEA"

# ── OpenAI ─────────────────────────────────────────────────────────────────────
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
use_openai = bool(OPENAI_API_KEY)

if use_openai:
    from openai import OpenAI
    openai_client = OpenAI(api_key=OPENAI_API_KEY)
    logger.info("OpenAI configurado.")

# ── Gemini (mantido como fallback) ─────────────────────────────────────────────
use_gemini = os.getenv("USE_LLM", "False") == "True"
GEMINI_TOTAL_TIMEOUT_SECONDS = 10

if use_gemini:
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
    genai.configure(api_key=GOOGLE_API_KEY)
    gemini_model = genai.GenerativeModel(
        "gemini-1.5-flash",
        generation_config=GenerationConfig(
            temperature=0.7, top_p=0.95, top_k=60, max_output_tokens=200
        ),
    )

executor = ThreadPoolExecutor(max_workers=1)

# ── RAG ────────────────────────────────────────────────────────────────────────
rag_system = None
if use_openai:
    try:
        from rag import RAGSystem
        rag_system = RAGSystem(
            persist_dir=str(_DATA / "rag_store"),
            docs_dir=str(_DOCS),
            openai_api_key=OPENAI_API_KEY,
        )
        if rag_system.is_indexed():
            logger.info("RAG pronto: %d chunks indexados.", len(rag_system._chunks))
        else:
            logger.warning(
                "ChromaDB vazio. Execute 'python ingest.py' para indexar os documentos."
            )
    except Exception:
        logger.exception("Falha ao inicializar RAGSystem. RAG desabilitado.")
        rag_system = None

# ── Intents (NLU) ──────────────────────────────────────────────────────────────
intents = load_intents(str(_DATA / "intents.json"))


# ── Helpers ────────────────────────────────────────────────────────────────────
def _rag_context(query: str, n: int = 5) -> str:
    if rag_system and rag_system.is_indexed():
        return rag_system.retrieve(query, n_results=n)
    return ""


def _openai_chat(system: str, user: str, max_tokens: int = 1000, json_mode: bool = False) -> str:
    kwargs = dict(
        model="gpt-4o",
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        max_tokens=max_tokens,
        temperature=0.7,
    )
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}
    resp = openai_client.chat.completions.create(**kwargs)
    return resp.choices[0].message.content.strip()


def _gemini_call(prompt: str) -> str:
    future = executor.submit(lambda: gemini_model.generate_content({"text": prompt}))
    response = future.result(timeout=GEMINI_TOTAL_TIMEOUT_SECONDS)
    if response.candidates:
        return response.candidates[0].content.parts[0].text.strip()
    return ""


# ── /search ────────────────────────────────────────────────────────────────────
def gerar_resposta(topic: str, age_group: str) -> tuple[dict, int]:
    tag1, prob1, tag2, prob2 = processar_texto(topic)

    # Tenta buscar resposta base no intents.json quando NLU tem boa confiança
    resposta_base = None
    if tag1 and prob1 >= 0.49 and (prob1 - prob2) >= 0.15:
        for intent in intents["intents"]:
            if intent["tag"] == tag1:
                for obj in intent["responses"]:
                    resposta_base = obj["text"]
                    break
                break

    conteudo_final = resposta_base or ""

    # RAG + OpenAI — sempre que disponível (NLU é apenas complemento)
    if use_openai:
        contexto = _rag_context(topic)
        sistema = (
            "Você é uma especialista em educação inclusiva e TEA. "
            "Responda de forma clara, objetiva e útil para professores do ensino básico. "
            "Fundamente sua resposta na literatura especializada quando disponível."
        )
        ctx_section = f"\n\nContexto da literatura especializada:\n{contexto}" if contexto else ""
        base_section = f"\n\nResposta base disponível:\n{resposta_base}" if resposta_base else ""
        usuario = (
            f"Pergunta: {topic}\n"
            f"Faixa etária: {age_group}"
            f"{ctx_section}"
            f"{base_section}\n\n"
            "Forneça uma resposta completa, prática e fundamentada."
        )
        try:
            conteudo_final = _openai_chat(sistema, usuario, max_tokens=600)
        except Exception:
            logger.exception("Erro OpenAI em /search, usando resposta base.")

    elif use_gemini and resposta_base:
        prompt = (
            f"Reformule para faixa etária '{age_group}': '{resposta_base}'"
        )
        try:
            conteudo_final = _gemini_call(prompt) or resposta_base
        except (TimeoutError, StopCandidateException, BlockedPromptException, grpc.RpcError, Exception):
            logger.exception("Erro Gemini em /search, usando resposta base.")

    if not conteudo_final:
        conteudo_final = "Desculpe, não consegui processar sua pergunta. Tente novamente."

    return {
        "content": conteudo_final,
        "tag": tag1,
        "confidence": prob1,
    }, 200


@app.route("/search", methods=["POST"])
def search():
    data = request.get_json(force=True)
    topic = data.get("topic", "").strip()
    age_group = data.get("age_group", "acima de 15 anos")

    if not topic:
        return jsonify({"error": "Tópico não fornecido"}), 400

    result, status = gerar_resposta(topic, age_group)
    return jsonify(result), status


# ── /adapt ─────────────────────────────────────────────────────────────────────
@app.route("/adapt", methods=["POST"])
def adapt_activity():
    data = request.get_json(force=True)
    texto_original = data.get("texto_original", "").strip()
    diagnostico = data.get("diagnostico", "não especificado")
    serie = data.get("serie", "não informada")
    observacoes = data.get("observacoes", "")
    adaptacoes_preferidas = data.get("adaptacoes_preferidas", [])

    if not texto_original:
        return jsonify({"error": "Texto original não fornecido"}), 400
    if not use_openai:
        return jsonify({"error": "OpenAI não configurado. Defina OPENAI_API_KEY."}), 503

    adaptacoes_str = ", ".join(adaptacoes_preferidas) if adaptacoes_preferidas else "não especificadas"

    # RAG: recupera orientações pedagógicas relevantes
    query_rag = f"adaptação de atividade para {diagnostico}"
    contexto = _rag_context(query_rag, n=4)
    ctx_section = f"\n\nOrientações da literatura especializada:\n{contexto}" if contexto else ""

    sistema = (
        "Você é uma especialista em educação inclusiva com expertise em adaptações pedagógicas "
        "para alunos com TEA e outras necessidades educacionais especiais. "
        "Você adapta atividades escolares de forma clara, acessível e personalizada ao perfil do aluno. "
        "Use as orientações da literatura especializada quando disponíveis."
    )
    usuario = (
        f"Adapte a seguinte atividade para um aluno com '{diagnostico}', "
        f"cursando o {serie}.\n\n"
        f"Adaptações preferidas do aluno: {adaptacoes_str}\n"
        f"Observações: {observacoes}"
        f"{ctx_section}\n\n"
        f"Atividade original:\n{texto_original}\n\n"
        "Retorne APENAS o texto adaptado, sem explicações adicionais."
    )

    try:
        texto_adaptado = _openai_chat(sistema, usuario, max_tokens=1000)
        return jsonify({"texto_adaptado": texto_adaptado}), 200
    except Exception as e:
        logger.exception("Erro OpenAI em /adapt")
        return jsonify({"error": str(e)}), 500


# ── /suggest-pei ───────────────────────────────────────────────────────────────
@app.route("/suggest-pei", methods=["POST"])
def suggest_pei():
    data = request.get_json(force=True)
    diagnostico = data.get("diagnostico", "").strip()
    serie = data.get("serie", "não informada")
    observacoes = data.get("observacoes", "")

    if not diagnostico:
        return jsonify({"error": "Diagnóstico não fornecido"}), 400
    if not use_openai:
        return jsonify({"error": "OpenAI não configurado. Defina OPENAI_API_KEY."}), 503

    # RAG: recupera referências sobre PEI para esse diagnóstico
    query_rag = f"plano educacional individualizado PEI {diagnostico}"
    contexto = _rag_context(query_rag, n=4)
    ctx_section = f"\n\nReferências da literatura especializada:\n{contexto}" if contexto else ""

    sistema = (
        "Você é uma especialista em educação inclusiva com expertise em elaboração de PEI "
        "(Plano Educacional Individualizado) para alunos com TEA e outras necessidades educacionais especiais. "
        "Você sugere objetivos, estratégias, recursos e avaliações específicos, mensuráveis e adequados. "
        "Fundamente as sugestões na literatura especializada quando disponível."
    )
    usuario = (
        f"Elabore sugestões de PEI para um aluno com '{diagnostico}', "
        f"cursando o {serie}.\n"
        f"Observações: {observacoes}"
        f"{ctx_section}\n\n"
        "Retorne um JSON válido com exatamente este formato (sem markdown, sem texto extra):\n"
        '{"objetivos": ["..."], "estrategias": ["..."], "recursos": ["..."], "avaliacoes": ["..."]}\n'
        "Cada lista deve ter entre 3 e 5 itens específicos e mensuráveis, em português."
    )

    try:
        raw = _openai_chat(sistema, usuario, max_tokens=800, json_mode=True)
        sugestoes = json.loads(raw)
        return jsonify(sugestoes), 200
    except Exception as e:
        logger.exception("Erro OpenAI em /suggest-pei")
        return jsonify({"error": str(e)}), 500


# ── /health ────────────────────────────────────────────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "openai": use_openai,
        "rag_indexed": rag_system.is_indexed() if rag_system else False,
        "rag_chunks": len(rag_system._chunks) if rag_system else 0,
    })


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=int(os.environ.get("PORT", 5022)))

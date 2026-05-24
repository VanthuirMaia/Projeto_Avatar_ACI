import os
import re
import json
import base64
import logging
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, TimeoutError
import requests as http_requests
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

# ── Expansão de siglas para TTS ────────────────────────────────────────────────
_ACRONYMS: dict[str, str] = {
    "TEA":  "TÉA",
    "TDAH": "T. D. A. H.",
    "PEI":  "PÊI",
    "ACI":  "A. C. I.",
    "MEC":  "M. E. C.",
    "LBI":  "L. B. I.",
    "BNCC": "B. N. C. C.",
    "AEE":  "A. E. E.",
    "PNEE": "P. N. E. E.",
    "NEE":  "N. E. E.",
    "AAC":  "A. A. C.",
    "CID":  "SÍDI",
    "DSM":  "D. S. M.",
    "UPE":  "U. P. E.",
    "LGPD": "L. G. P. D.",
    "CEI":  "C. E. I.",
    "CNS":  "C. N. S.",
}
_ACRONYM_RE = re.compile(
    r'\b(' + '|'.join(re.escape(k) for k in _ACRONYMS) + r')\b'
)

def _expand_acronyms_for_tts(text: str) -> str:
    """Expande siglas para pronúncia letra a letra antes de enviar ao TTS."""
    return _ACRONYM_RE.sub(lambda m: _ACRONYMS[m.group(0)], text)


# ── ElevenLabs TTS ─────────────────────────────────────────────────────────────
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "pNInz6obpgDQGcFmaJgB")
use_elevenlabs = bool(ELEVENLABS_API_KEY)

if use_elevenlabs:
    logger.info("ElevenLabs TTS configurado (voice=%s).", ELEVENLABS_VOICE_ID)


def _elevenlabs_tts(text: str) -> str | None:
    """Chama ElevenLabs e retorna áudio MP3 em base64, ou None em caso de falha."""
    if not use_elevenlabs:
        return None
    try:
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}"
        resp = http_requests.post(
            url,
            headers={"xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json"},
            json={
                "text": text,
                "model_id": "eleven_multilingual_v2",
                "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
            },
            timeout=30,
        )
        if not resp.ok:
            logger.error(
                "ElevenLabs TTS falhou: HTTP %s — voice_id=%s — %s",
                resp.status_code, ELEVENLABS_VOICE_ID, resp.text,
            )
            return None
        return base64.b64encode(resp.content).decode("utf-8")
    except Exception:
        logger.exception("Erro ElevenLabs TTS — resposta sem áudio.")
        return None

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
def _rag_context(query: str, n: int = 3) -> str:
    if rag_system and rag_system.is_indexed():
        return rag_system.retrieve(query, n_results=n)
    return ""


OPENAI_MODEL = os.getenv("OPENAI_MODEL", "openai/gpt-4.1-mini")

def _openai_chat(system: str, user: str, max_tokens: int = 1000, json_mode: bool = False) -> str:
    kwargs = dict(
        model=OPENAI_MODEL,
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
def gerar_resposta(topic: str, age_group: str, aluno_context: dict | None = None) -> tuple[dict, int]:
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

    conteudo_final = ""
    falado = ""  # versão curta para TTS

    # RAG + OpenAI — sempre que disponível (NLU é apenas complemento)
    if use_openai:
        contexto = _rag_context(topic)
        sistema = (
            "Você é Lorna, assistente especializada em educação inclusiva e TEA "
            "(Transtorno do Espectro Autista), criada para auxiliar professores "
            "do ensino básico brasileiro no dia a dia da escola. "
            "Seu trabalho está alinhado à BNCC, à LBI (Lei Brasileira de Inclusão, nº 13.146/2015) "
            "e à Política Nacional de Educação Especial na Perspectiva da Educação Inclusiva (MEC/2008). "
            "Responda SEMPRE em português brasileiro claro, direto e acessível para professores. "
            "Não mostre raciocínio interno nem processo de pensamento — vá direto à resposta. "
            "Use linguagem próxima da realidade escolar brasileira: "
            "cite estratégias aplicáveis em turmas regulares, mencione recursos do AEE quando pertinente "
            "e considere as limitações reais do professor (turmas grandes, poucos recursos). "
            "Prefira exemplos concretos e práticos a definições teóricas. "
            "Fundamente-se na literatura especializada fornecida no contexto quando disponível. "
            "NUNCA mencione 'Nível 1', 'Nível 2', 'Nível 3' ou 'nível de suporte' de TEA — "
            "fale sempre em termos das necessidades individuais do aluno. "
            "Se a pergunta não estiver relacionada a educação, inclusão ou necessidades educacionais especiais, "
            "informe gentilmente que seu foco é esse tema e ofereça ajuda dentro dessa área."
        )

        aluno_section = ""
        if aluno_context:
            adaptacoes = ", ".join(aluno_context.get("adaptacoes_preferidas", [])) or "não informadas"
            aluno_section = (
                f"\n\nPERFIL DO ALUNO:\n"
                f"- Nome: {aluno_context.get('nome', 'não informado')}\n"
                f"- Diagnóstico: {aluno_context.get('diagnostico', 'não informado')}\n"
                f"- Série: {aluno_context.get('serie', 'não informada')}\n"
                f"- Idade: {aluno_context.get('idade', '?')} anos\n"
                f"- Observações: {aluno_context.get('observacoes', 'nenhuma')}\n"
                f"- Adaptações preferidas: {adaptacoes}\n"
                f"Personalize a resposta considerando esse perfil específico."
            )

        ctx_section = f"\n\nContexto da literatura especializada:\n{contexto}" if contexto else ""
        usuario = (
            f"Pergunta: {topic}\n"
            f"Faixa etária: {age_group}"
            f"{aluno_section}"
            f"{ctx_section}\n\n"
            "Retorne JSON com exatamente dois campos:\n"
            '"resposta": resposta completa e prática em markdown (use listas e negrito). '
            "Sem raciocínio interno.\n"
            '"falado": resumo oral para o avatar falar, máx. 2 frases curtas (~200 chars), '
            "sem markdown, tom direto e acolhedor."
        )
        try:
            raw = _openai_chat(sistema, usuario, max_tokens=600, json_mode=True)
            parsed = json.loads(raw)
            conteudo_final = parsed.get("resposta") or raw
            falado = parsed.get("falado", "").strip()
        except Exception as e:
            logger.error("Erro OpenAI em /search: %s — usando resposta base.", str(e))
            conteudo_final = resposta_base or ""

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

    # TTS usa a versão curta para economizar créditos ElevenLabs
    tts_input = falado if falado else conteudo_final[:300]
    audio_b64 = _elevenlabs_tts(_expand_acronyms_for_tts(tts_input))

    return {
        "content": conteudo_final,
        "tag": tag1,
        "confidence": prob1,
        "audio_base64": audio_b64,
    }, 200


@app.route("/search", methods=["POST"])
def search():
    data = request.get_json(force=True)
    topic = data.get("topic", "").strip()
    age_group = data.get("age_group", "acima de 15 anos")
    aluno_context = data.get("aluno_context")  # optional student profile

    if not topic:
        return jsonify({"error": "Tópico não fornecido"}), 400

    # LGPD: não logar conteúdo da pergunta nem dados do aluno
    logger.info("/search — age_group=%s, com_aluno=%s", age_group, bool(aluno_context))
    result, status = gerar_resposta(topic, age_group, aluno_context)
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
    contexto = _rag_context(query_rag, n=3)
    ctx_section = f"\n\nOrientações da literatura especializada:\n{contexto}" if contexto else ""

    sistema = (
        "Você é Lorna, especialista em educação inclusiva e adaptações pedagógicas "
        "para alunos com TEA e outras necessidades educacionais especiais no contexto escolar brasileiro. "
        "Adapte atividades de forma clara, acessível e personalizada ao perfil do aluno, "
        "alinhada à BNCC e às diretrizes do MEC para educação inclusiva. "
        "Produza adaptações práticas que o professor possa aplicar diretamente em sala de aula regular. "
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
    contexto = _rag_context(query_rag, n=3)
    ctx_section = f"\n\nReferências da literatura especializada:\n{contexto}" if contexto else ""

    sistema = (
        "Você é Lorna, especialista em educação inclusiva e elaboração de PEI "
        "(Plano Educacional Individualizado) para alunos com TEA e outras necessidades educacionais especiais "
        "no contexto escolar brasileiro. "
        "Sugira objetivos, estratégias, recursos e avaliações específicos, mensuráveis e aplicáveis "
        "na realidade das escolas públicas e privadas brasileiras, alinhados à BNCC e à LBI. "
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


# ── /voices ────────────────────────────────────────────────────────────────────
@app.route("/voices", methods=["GET"])
def list_voices():
    if not use_elevenlabs:
        return jsonify({"error": "ELEVENLABS_API_KEY não configurado"}), 503
    try:
        resp = http_requests.get(
            "https://api.elevenlabs.io/v1/voices",
            headers={"xi-api-key": ELEVENLABS_API_KEY},
            timeout=10,
        )
        resp.raise_for_status()
        voices = [
            {"voice_id": v["voice_id"], "name": v["name"], "labels": v.get("labels", {})}
            for v in resp.json().get("voices", [])
        ]
        return jsonify({"voices": voices, "current_voice_id": ELEVENLABS_VOICE_ID})
    except Exception as e:
        logger.exception("Erro ao listar vozes ElevenLabs.")
        return jsonify({"error": str(e)}), 500


@app.route("/voices/test", methods=["GET"])
def test_voices():
    """Testa todas as vozes da conta e retorna quais são acessíveis no plano atual."""
    if not use_elevenlabs:
        return jsonify({"error": "ELEVENLABS_API_KEY não configurado"}), 503

    try:
        resp = http_requests.get(
            "https://api.elevenlabs.io/v1/voices",
            headers={"xi-api-key": ELEVENLABS_API_KEY},
            timeout=10,
        )
        resp.raise_for_status()
        all_voices = resp.json().get("voices", [])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    accessible, blocked = [], []
    for v in all_voices:
        try:
            r = http_requests.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{v['voice_id']}",
                headers={"xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json"},
                json={"text": "Olá", "model_id": "eleven_multilingual_v2"},
                timeout=15,
            )
            entry = {
                "voice_id": v["voice_id"],
                "name": v["name"],
                "gender": v.get("labels", {}).get("gender", "?"),
                "language": v.get("labels", {}).get("language", "?"),
            }
            if r.ok:
                accessible.append(entry)
            else:
                blocked.append({**entry, "http": r.status_code})
        except Exception:
            pass

    return jsonify({"accessible": accessible, "blocked": blocked})


# ── /health ────────────────────────────────────────────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "openai": use_openai,
        "elevenlabs": use_elevenlabs,
        "rag_indexed": rag_system.is_indexed() if rag_system else False,
        "rag_chunks": len(rag_system._chunks) if rag_system else 0,
    })


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=int(os.environ.get("PORT", 5022)))

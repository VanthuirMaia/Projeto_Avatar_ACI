import os
import re
import json
import uuid
import hashlib
import base64
import logging
import time
from pathlib import Path
from datetime import datetime, timedelta, timezone
from concurrent.futures import ThreadPoolExecutor, TimeoutError
import requests as http_requests
from flask import Flask, request, jsonify
from flask_cors import CORS

import sentry_sdk
from sentry_sdk.integrations.flask import FlaskIntegration

_SENTRY_DSN = os.getenv("SENTRY_DSN", "")
if _SENTRY_DSN:
    sentry_sdk.init(
        dsn=_SENTRY_DSN,
        integrations=[FlaskIntegration()],
        traces_sample_rate=0.2,   # 20% das requests trackeadas (custo controlado)
        send_default_pii=False,   # LGPD: sem dados pessoais
        environment=os.getenv("ENVIRONMENT", "production"),
    )

from metrics import log_event, get_stats, rotate_if_needed
from audit import (
    audit_event, get_activity_timeline, get_audit_summary, get_users_summary,
    LOGIN, REGISTER, ACCESS_ALUNOS, CREATE_ALUNO, UPDATE_ALUNO, DELETE_ALUNO,
    ACCESS_PEI, SAVE_PEI, DELETE_PEI,
)

try:
    import jwt as _pyjwt
    _HAS_JWT = True
except ImportError:
    _HAS_JWT = False

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

# ── Auth config ────────────────────────────────────────────────────────────────
_USERS_FILE  = _DATA / "users.json"
_PEIS_FILE   = _DATA / "peis.json"

# ── Rate limiting (login) ──────────────────────────────────────────────────────
_login_attempts: dict[str, list[float]] = {}  # ip → [timestamps]
_RATE_LIMIT_MAX = 5
_RATE_LIMIT_WINDOW = 60  # segundos


def _check_rate_limit(ip: str) -> bool:
    """Retorna True se dentro do limite, False se deve rejeitar."""
    now = time.time()
    history = [t for t in _login_attempts.get(ip, []) if now - t < _RATE_LIMIT_WINDOW]
    _login_attempts[ip] = history
    if len(history) >= _RATE_LIMIT_MAX:
        return False
    _login_attempts[ip].append(now)
    return True
_ALUNOS_FILE = _DATA / "alunos.json"
_JWT_SECRET = os.getenv("JWT_SECRET", "avatartea_secret_2025")
_ADMIN_KEY  = os.getenv("ADMIN_KEY",  "avatartea_admin_2025")
_SALT       = "avatartea2025"

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


OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5.4-mini")

def _openai_chat(system: str, user: str, max_tokens: int = 1000, json_mode: bool = False,
                 temperature: float = 0.7, timeout: float = 35.0) -> str:
    kwargs = dict(
        model=OPENAI_MODEL,
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        max_tokens=max_tokens,
        temperature=temperature,
        timeout=timeout,
    )
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}
    resp = openai_client.chat.completions.create(**kwargs)
    return resp.choices[0].message.content.strip()


# ── Guardrails ─────────────────────────────────────────────────────────────────
_GUARDRAIL_SYSTEM = (
    "Você é um classificador de tópicos para o sistema AvaTEA, ferramenta de apoio a professores "
    "que trabalham em contextos de educação inclusiva. "
    "Responda SOMENTE 'SIM' ou 'NAO' (sem pontuação, sem explicação). "
    "Responda 'SIM' se a mensagem tratar de QUALQUER um destes temas: "
    "TEA, autismo, TDAH, dislexia, altas habilidades, superdotação, "
    "deficiência intelectual, síndrome de Down, inclusão escolar, educação especial, "
    "AEE (Atendimento Educacional Especializado), PEI (Plano Educacional Individualizado), "
    "adaptação de atividades pedagógicas, comunicação alternativa e aumentativa (CAA), "
    "estratégias inclusivas em sala de aula, legislação educacional brasileira (LBI, BNCC, MEC), "
    "necessidades educacionais especiais, NEE, transtorno de aprendizagem, "
    "comportamento em sala de aula, manejo de turma inclusiva, "
    "planejamento de aulas e atividades escolares, objetivos pedagógicos de disciplinas, "
    "ensino de matemática, português, ciências, história, geografia ou qualquer disciplina do currículo, "
    "avaliação de alunos, metodologias de ensino, recursos e materiais didáticos, "
    "elaboração de planos de aula, práticas pedagógicas em geral, "
    "gestão de sala de aula, relação professor-aluno, educação básica brasileira. "
    "Responda 'NAO' APENAS para assuntos completamente fora do contexto escolar e educacional, "
    "como política partidária, entretenimento, finanças pessoais, culinária, esportes, etc."
)

_RECUSA_OFFTOPIC = (
    "Olá! Sou a Lorna, especialista em educação inclusiva e TEA. "
    "Parece que sua pergunta está fora do meu foco de atuação. "
    "Posso ajudar com adaptações pedagógicas, elaboração de PEI, estratégias "
    "para alunos com TEA, TDAH, dislexia ou outras necessidades educacionais especiais. "
    "Tem alguma dúvida sobre esses temas? Estou aqui para ajudar!"
)

def _guardrail_check(topic: str) -> bool:
    """Retorna True se o tópico está no escopo. Fail-open: permite em caso de erro."""
    if not use_openai:
        return True
    try:
        resp = openai_client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": _GUARDRAIL_SYSTEM},
                {"role": "user",   "content": topic[:600]},
            ],
            max_tokens=5,
            temperature=0,
            timeout=10.0,
        )
        answer = resp.choices[0].message.content.strip().upper()
        return answer.startswith("SIM")
    except Exception:
        logger.warning("Guardrail check falhou — permitindo request (fail-open).")
        return True


def _gemini_call(prompt: str) -> str:
    future = executor.submit(lambda: gemini_model.generate_content({"text": prompt}))
    response = future.result(timeout=GEMINI_TOTAL_TIMEOUT_SECONDS)
    if response.candidates:
        return response.candidates[0].content.parts[0].text.strip()
    return ""


# ── /search ────────────────────────────────────────────────────────────────────
def gerar_resposta(topic: str, age_group: str, aluno_context: dict | None = None) -> tuple[dict, int]:
    tag1, prob1, tag2, prob2 = processar_texto(topic)

    # NLU: busca resposta base quando há boa confiança (complemento, não gate)
    resposta_base = None
    if tag1 and prob1 >= 0.49 and (prob1 - prob2) >= 0.15:
        for intent in intents["intents"]:
            if intent["tag"] == tag1:
                for obj in intent["responses"]:
                    resposta_base = obj["text"]
                    break
                break

    # ── Guardrail LLM ────────────────────────────────────────────────────────
    # Chamada leve (max_tokens=5, temp=0, timeout=10s) antes da geração principal.
    # Falha aberta: se a chamada de classificação errar, deixa o request prosseguir.
    if not _guardrail_check(topic):
        audio_b64 = _elevenlabs_tts(_expand_acronyms_for_tts(_RECUSA_OFFTOPIC))
        return {
            "content": _RECUSA_OFFTOPIC,
            "tag": None,
            "confidence": 0.0,
            "audio_base64": audio_b64,
            "offtopic": True,
        }, 200

    conteudo_final = ""
    falado = ""

    # ── RAG + OpenAI ─────────────────────────────────────────────────────────
    if use_openai:
        contexto = _rag_context(topic)
        sistema = (
            "Você é Lorna, assistente especializada em educação inclusiva e TEA "
            "(Transtorno do Espectro Autista), criada para auxiliar professores "
            "do ensino básico brasileiro no dia a dia da escola. "
            "Seu trabalho está alinhado à BNCC, à LBI (Lei Brasileira de Inclusão, nº 13.146/2015) "
            "e à Política Nacional de Educação Especial na Perspectiva da Educação Inclusiva (MEC/2008). "
            "Responda SEMPRE em português brasileiro claro, direto e acessível para professores. "
            "Não mostre raciocínio interno — vá direto à resposta. "
            "Use linguagem próxima da realidade escolar brasileira: estratégias aplicáveis em turmas "
            "regulares, recursos do AEE quando pertinente, limitações reais do professor. "
            "Prefira exemplos concretos a definições teóricas. "
            "Fundamente-se na literatura especializada quando disponível. "
            "NUNCA mencione 'Nível 1', 'Nível 2', 'Nível 3' ou 'nível de suporte' de TEA."
        )

        aluno_section = ""
        if aluno_context:
            adaptacoes = ", ".join(aluno_context.get("adaptacoes_preferidas", [])) or "não informadas"
            aluno_section = (
                f"\n\nPERFIL DO ALUNO:\n"
                f"- Nome: {aluno_context.get('nome', 'não informado')}\n"
                f"- Série: {aluno_context.get('serie', 'não informada')}\n"
                f"- Idade: {aluno_context.get('idade', '?')} anos\n"
                f"- Processos cognitivos: {aluno_context.get('observacoes', 'não informado')}\n"
                f"- Adaptações sugeridas: {adaptacoes}\n"
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
    aluno_context = data.get("aluno_context")

    if not topic:
        return jsonify({"error": "Tópico não fornecido"}), 400
    if len(topic) > 1000:
        return jsonify({"error": "Mensagem muito longa (máx. 1000 caracteres)."}), 400

    logger.info("/search — age_group=%s, com_aluno=%s", age_group, bool(aluno_context))
    t0 = time.perf_counter()
    result, status = gerar_resposta(topic, age_group, aluno_context)
    rt_ms = int((time.perf_counter() - t0) * 1000)

    log_event(
        "/search",
        rt_ms,
        intent_tag=result.get("tag"),
        confidence=result.get("confidence"),
        offtopic=result.get("offtopic", False),
        openai_ok=use_openai,
        elevenlabs_ok=result.get("audio_base64") is not None,
        age_group=age_group,
        has_student_context=bool(aluno_context),
    )
    rotate_if_needed()
    result.pop("offtopic", None)  # campo interno, não enviar ao frontend
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
    if len(texto_original) > 5000:
        return jsonify({"error": "Texto muito longo (máx. 5000 caracteres)."}), 400
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

    t0 = time.perf_counter()
    try:
        texto_adaptado = _openai_chat(sistema, usuario, max_tokens=1000)
        log_event("/adapt", int((time.perf_counter() - t0) * 1000), openai_ok=True)
        return jsonify({"texto_adaptado": texto_adaptado}), 200
    except Exception as e:
        log_event("/adapt", int((time.perf_counter() - t0) * 1000), openai_ok=False, error_type=type(e).__name__)
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
    if len(diagnostico) > 300 or len(observacoes) > 2000:
        return jsonify({"error": "Campos excedem o tamanho máximo permitido."}), 400
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

    t0 = time.perf_counter()
    try:
        raw = _openai_chat(sistema, usuario, max_tokens=800, json_mode=True)
        sugestoes = json.loads(raw)
        log_event("/suggest-pei", int((time.perf_counter() - t0) * 1000), openai_ok=True)
        return jsonify(sugestoes), 200
    except Exception as e:
        log_event("/suggest-pei", int((time.perf_counter() - t0) * 1000), openai_ok=False, error_type=type(e).__name__)
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


# ── /admin/stats ───────────────────────────────────────────────────────────────
@app.route("/admin/stats", methods=["GET"])
def admin_stats():
    if request.headers.get("X-Admin-Key") != _ADMIN_KEY:
        return jsonify({"error": "Acesso negado."}), 403
    days = min(int(request.args.get("days", 30)), 365)
    return jsonify(get_stats(days)), 200


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


# ── Auth helpers ───────────────────────────────────────────────────────────────
def _load_users() -> dict:
    if not _USERS_FILE.exists():
        return {"users": []}
    with open(_USERS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def _save_users(data: dict):
    with open(_USERS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _load_peis() -> dict:
    if not _PEIS_FILE.exists():
        return {"peis": []}
    with open(_PEIS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def _save_peis(data: dict):
    with open(_PEIS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _load_alunos() -> dict:
    if not _ALUNOS_FILE.exists():
        return {"alunos": []}
    with open(_ALUNOS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def _save_alunos(data: dict):
    with open(_ALUNOS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _require_jwt() -> dict | None:
    """Extrai e valida o JWT. Retorna {'id': str, 'role': str, 'nome': str} ou None."""
    if not _HAS_JWT:
        return None
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    try:
        payload = _pyjwt.decode(auth[7:], _JWT_SECRET, algorithms=["HS256"])
        return {
            "id":   payload.get("sub"),
            "role": payload.get("role", "professor"),
            "nome": payload.get("nome", ""),
        }
    except Exception:
        return None


def _hash_senha(email: str, senha: str) -> str:
    raw = f"{email}{senha}{_SALT}"
    return hashlib.sha256(raw.encode()).hexdigest()


def _gerar_token(user: dict) -> str:
    payload = {
        "sub":  user["id"],
        "nome": user["nome"],
        "role": user.get("role", "professor"),
        "exp":  datetime.now(timezone.utc) + timedelta(hours=8),
    }
    return _pyjwt.encode(payload, _JWT_SECRET, algorithm="HS256")


# ── POST /auth/register ────────────────────────────────────────────────────────
@app.route("/auth/register", methods=["POST"])
def auth_register():
    data = request.get_json(force=True) or {}
    nome  = data.get("nome",  "").strip()
    email = data.get("email", "").strip().lower()
    senha = data.get("senha", "")

    if not nome or not email or not senha:
        return jsonify({"error": "Nome, email e senha são obrigatórios."}), 400

    db = _load_users()
    if any(u["email"] == email for u in db["users"]):
        return jsonify({"error": "E-mail já cadastrado."}), 409

    role = data.get("role", "professor").strip()
    if role not in ("professor", "coordenador"):
        role = "professor"

    user = {
        "id":         str(uuid.uuid4()),
        "nome":       nome,
        "email":      email,
        "senha_hash": _hash_senha(email, senha),
        "status":     "pendente",
        "role":       role,
        "criado_em":  datetime.now(timezone.utc).isoformat(),
    }
    db["users"].append(user)
    _save_users(db)
    audit_event(user["id"], user["nome"], REGISTER, "user", user["id"])
    return jsonify({"message": "Cadastro realizado. Aguarde aprovação."}), 201


# ── POST /auth/login ───────────────────────────────────────────────────────────
@app.route("/auth/login", methods=["POST"])
def auth_login():
    if not _HAS_JWT:
        return jsonify({"error": "PyJWT não instalado no servidor."}), 503

    ip = request.remote_addr or "unknown"
    if not _check_rate_limit(ip):
        return jsonify({"error": "Muitas tentativas. Aguarde 1 minuto."}), 429

    data  = request.get_json(force=True) or {}
    email = data.get("email", "").strip().lower()
    senha = data.get("senha", "")

    if not email or not senha:
        return jsonify({"error": "Email e senha são obrigatórios."}), 400

    db   = _load_users()
    user = next((u for u in db["users"] if u["email"] == email), None)

    if not user or user["senha_hash"] != _hash_senha(email, senha):
        return jsonify({"error": "Email ou senha incorretos."}), 401

    if user["status"] == "pendente":
        return jsonify({"error": "Cadastro ainda não aprovado. Aguarde."}), 403
    if user["status"] == "bloqueado":
        return jsonify({"error": "Conta bloqueada. Entre em contato com o administrador."}), 403

    token = _gerar_token(user)
    audit_event(user["id"], user["nome"], LOGIN, "user", user["id"])
    return jsonify({"token": token, "nome": user["nome"], "role": user.get("role", "professor")}), 200


# ── GET /auth/admin/users ──────────────────────────────────────────────────────
@app.route("/auth/admin/users", methods=["GET"])
def admin_list_users():
    if request.headers.get("X-Admin-Key") != _ADMIN_KEY:
        return jsonify({"error": "Acesso negado."}), 403
    db = _load_users()
    users_safe = [{k: v for k, v in u.items() if k != "senha_hash"} for u in db["users"]]
    return jsonify({"users": users_safe}), 200


# ── PATCH /auth/admin/users/<id> ───────────────────────────────────────────────
@app.route("/auth/admin/users/<user_id>", methods=["PATCH"])
def admin_update_user(user_id: str):
    if request.headers.get("X-Admin-Key") != _ADMIN_KEY:
        return jsonify({"error": "Acesso negado."}), 403

    data       = request.get_json(force=True) or {}
    novo_status = data.get("status", "").strip()
    if novo_status not in ("aprovado", "bloqueado"):
        return jsonify({"error": "Status inválido. Use 'aprovado' ou 'bloqueado'."}), 400

    db = _load_users()
    for u in db["users"]:
        if u["id"] == user_id:
            u["status"] = novo_status
            _save_users(db)
            return jsonify({"message": f"Status atualizado para {novo_status}."}), 200

    return jsonify({"error": "Usuário não encontrado."}), 404


# ── GET /pei ──────────────────────────────────────────────────────────────────
@app.route("/pei", methods=["GET"])
def list_peis():
    jwt = _require_jwt()
    if not jwt:
        return jsonify({"error": "Autenticação necessária."}), 401

    peis = _load_peis()
    if jwt["role"] == "coordenador":
        result = peis["peis"]
    else:
        result = [p for p in peis["peis"] if p["professor_id"] == jwt["id"]]

    return jsonify(result), 200


# ── GET /alunos ────────────────────────────────────────────────────────────────
@app.route("/alunos", methods=["GET"])
def list_alunos():
    jwt = _require_jwt()
    if not jwt:
        return jsonify({"error": "Autenticação necessária."}), 401

    db = _load_alunos()
    if jwt["role"] == "coordenador":
        alunos = db["alunos"]
    else:
        alunos = [a for a in db["alunos"] if a.get("professor_id") == jwt["id"]]

    audit_event(jwt["id"], jwt["nome"], ACCESS_ALUNOS, "aluno")
    return jsonify({"alunos": alunos}), 200


# ── POST /alunos ───────────────────────────────────────────────────────────────
@app.route("/alunos", methods=["POST"])
def create_aluno():
    jwt = _require_jwt()
    if not jwt:
        return jsonify({"error": "Autenticação necessária."}), 401

    data = request.get_json(force=True) or {}
    nome = data.get("nome", "").strip()
    if not nome:
        return jsonify({"error": "Nome é obrigatório."}), 400

    now = datetime.now(timezone.utc).isoformat()
    aluno = {
        "id":                    data.get("id") or str(uuid.uuid4()),
        "professor_id":          jwt["id"],
        "professor_nome":        jwt["nome"],
        "nome":                  nome,
        "serie":                 data.get("serie", "").strip(),
        "idade":                 int(data.get("idade", 0)),
        "processosCognitivos":   data.get("processosCognitivos", "").strip(),
        "adaptacoesSugeridas":   data.get("adaptacoesSugeridas", []),
        "criado_em":             now,
        "atualizado_em":         now,
    }

    db = _load_alunos()
    db["alunos"].append(aluno)
    _save_alunos(db)
    audit_event(jwt["id"], jwt["nome"], CREATE_ALUNO, "aluno", aluno["id"],
                {"nome": nome, "diagnostico": aluno["diagnostico"]})
    return jsonify(aluno), 201


# ── PATCH /alunos/<id> ─────────────────────────────────────────────────────────
@app.route("/alunos/<aluno_id>", methods=["PATCH"])
def update_aluno(aluno_id: str):
    jwt = _require_jwt()
    if not jwt:
        return jsonify({"error": "Autenticação necessária."}), 401

    db = _load_alunos()
    aluno = next((a for a in db["alunos"] if a["id"] == aluno_id), None)
    if not aluno:
        return jsonify({"error": "Aluno não encontrado."}), 404
    if jwt["role"] != "coordenador" and aluno.get("professor_id") != jwt["id"]:
        return jsonify({"error": "Acesso negado."}), 403

    data = request.get_json(force=True) or {}
    fields = ("nome", "serie", "idade", "processosCognitivos", "adaptacoesSugeridas")
    for f in fields:
        if f in data:
            aluno[f] = data[f]
    aluno["atualizado_em"] = datetime.now(timezone.utc).isoformat()

    _save_alunos(db)
    audit_event(jwt["id"], jwt["nome"], UPDATE_ALUNO, "aluno", aluno_id)
    return jsonify(aluno), 200


# ── DELETE /alunos/<id> ────────────────────────────────────────────────────────
@app.route("/alunos/<aluno_id>", methods=["DELETE"])
def delete_aluno(aluno_id: str):
    jwt = _require_jwt()
    if not jwt:
        return jsonify({"error": "Autenticação necessária."}), 401

    db = _load_alunos()
    aluno = next((a for a in db["alunos"] if a["id"] == aluno_id), None)
    if not aluno:
        return jsonify({"error": "Aluno não encontrado."}), 404
    if jwt["role"] != "coordenador" and aluno.get("professor_id") != jwt["id"]:
        return jsonify({"error": "Acesso negado."}), 403

    nome_aluno = aluno.get("nome", "")
    db["alunos"] = [a for a in db["alunos"] if a["id"] != aluno_id]
    _save_alunos(db)
    audit_event(jwt["id"], jwt["nome"], DELETE_ALUNO, "aluno", aluno_id, {"nome": nome_aluno})
    return jsonify({"message": "Aluno removido."}), 200


# ── POST /pei ──────────────────────────────────────────────────────────────────
@app.route("/pei", methods=["POST"])
def save_pei():
    jwt = _require_jwt()
    if not jwt:
        return jsonify({"error": "Autenticação necessária."}), 401
    professor_id = jwt["id"]

    data = request.get_json(force=True) or {}
    aluno_id = data.get("aluno_id", "").strip()
    if not aluno_id:
        return jsonify({"error": "aluno_id é obrigatório."}), 400

    peis = _load_peis()
    now  = datetime.now(timezone.utc).isoformat()

    existing = next(
        (p for p in peis["peis"] if p["professor_id"] == professor_id and p["aluno_id"] == aluno_id),
        None,
    )

    entry = {
        "professor_id": professor_id,
        "aluno_id":     aluno_id,
        "objetivos":    [v for v in data.get("objetivos",   []) if v],
        "estrategias":  [v for v in data.get("estrategias", []) if v],
        "recursos":     [v for v in data.get("recursos",    []) if v],
        "avaliacoes":   [v for v in data.get("avaliacoes",  []) if v],
        "updated_at":   now,
    }

    if existing:
        existing.update(entry)
    else:
        entry["created_at"] = now
        peis["peis"].append(entry)

    _save_peis(peis)
    audit_event(jwt["id"], jwt["nome"], SAVE_PEI, "pei", aluno_id)
    return jsonify({"message": "PEI salvo com sucesso."}), 200


# ── DELETE /pei/<aluno_id> ────────────────────────────────────────────────────
@app.route("/pei/<aluno_id>", methods=["DELETE"])
def delete_pei(aluno_id: str):
    jwt = _require_jwt()
    if not jwt:
        return jsonify({"error": "Autenticação necessária."}), 401

    peis = _load_peis()
    antes = len(peis["peis"])
    peis["peis"] = [
        p for p in peis["peis"]
        if not (p["professor_id"] == jwt["id"] and p["aluno_id"] == aluno_id)
    ]
    if len(peis["peis"]) == antes:
        return jsonify({"error": "PEI não encontrado."}), 404

    _save_peis(peis)
    audit_event(jwt["id"], jwt["nome"], DELETE_PEI, "pei", aluno_id)
    return jsonify({"message": "PEI removido."}), 200


# ── GET /pei/<aluno_id> ────────────────────────────────────────────────────────
@app.route("/pei/<aluno_id>", methods=["GET"])
def get_pei(aluno_id: str):
    jwt = _require_jwt()
    if not jwt:
        return jsonify({"error": "Autenticação necessária."}), 401
    professor_id = jwt["id"]

    peis = _load_peis()
    pei  = next(
        (p for p in peis["peis"] if p["professor_id"] == professor_id and p["aluno_id"] == aluno_id),
        None,
    )

    if not pei:
        return jsonify({"error": "PEI não encontrado."}), 404

    audit_event(jwt["id"], jwt["nome"], ACCESS_PEI, "pei", aluno_id)
    return jsonify({
        "objetivos":   pei.get("objetivos",   []),
        "estrategias": pei.get("estrategias", []),
        "recursos":    pei.get("recursos",    []),
        "avaliacoes":  pei.get("avaliacoes",  []),
        "updated_at":  pei.get("updated_at"),
    }), 200


# ── Helpers de autorização para coordenador ────────────────────────────────────
def _require_coordinator_or_admin():
    """
    Autoriza coordenadores (via JWT) ou admins (via X-Admin-Key).
    Retorna o user_id do coordenador autenticado, ou None se admin key.
    Lança 403 se nenhuma credencial válida.
    """
    # Tenta admin key primeiro
    if request.headers.get("X-Admin-Key") == _ADMIN_KEY:
        return None  # admin key válida, sem user_id específico

    # Tenta JWT com role=coordenador
    jwt = _require_jwt()
    if jwt and jwt.get("role") == "coordenador":
        return jwt["id"]

    from flask import abort
    abort(403)


# ── GET /coordinator/users ─────────────────────────────────────────────────────
@app.route("/coordinator/users", methods=["GET"])
def coordinator_list_users():
    _require_coordinator_or_admin()
    days = min(int(request.args.get("days", 30)), 365)

    db_users  = _load_users()
    db_alunos = _load_alunos()
    peis_db   = _load_peis()

    summary = get_users_summary(db_users["users"], db_alunos["alunos"], days)

    # Adiciona contagem de PEIs por professor
    for u in summary:
        u["total_peis"] = sum(
            1 for p in peis_db["peis"] if p.get("professor_id") == u["id"]
        )
        # Remove senha_hash se existir (não deve estar, mas por segurança)
        u.pop("senha_hash", None)

    return jsonify({"users": summary, "periodo_dias": days}), 200


# ── GET /coordinator/users/<user_id>/metrics ───────────────────────────────────
@app.route("/coordinator/users/<user_id>/metrics", methods=["GET"])
def coordinator_user_metrics(user_id: str):
    _require_coordinator_or_admin()
    days = min(int(request.args.get("days", 30)), 365)

    db_alunos = _load_alunos()
    peis_db   = _load_peis()

    alunos_do_prof = [a for a in db_alunos["alunos"] if a.get("professor_id") == user_id]
    peis_do_prof   = [p for p in peis_db["peis"]     if p.get("professor_id") == user_id]

    audit_summary = get_audit_summary(user_id=user_id, days=days)

    return jsonify({
        "user_id":       user_id,
        "periodo_dias":  days,
        "total_alunos":  len(alunos_do_prof),
        "total_peis":    len(peis_do_prof),
        "audit":         audit_summary,
    }), 200


# ── GET /coordinator/users/<user_id>/activity ──────────────────────────────────
@app.route("/coordinator/users/<user_id>/activity", methods=["GET"])
def coordinator_user_activity(user_id: str):
    _require_coordinator_or_admin()
    limit = min(int(request.args.get("limit", 50)), 200)

    timeline = get_activity_timeline(user_id=user_id, limit=limit)
    return jsonify({"user_id": user_id, "activity": timeline}), 200


if __name__ == "__main__":
    debug = os.getenv("ENVIRONMENT", "production") != "production"
    app.run(debug=debug, host="0.0.0.0", port=int(os.environ.get("PORT", 5022)))

"""
Módulo de métricas de uso — AvaTEA.

Grava eventos JSONL em Backend/data/metrics.jsonl (append-only, LGPD-safe: sem PII).
Provê get_stats() para o endpoint /admin/stats.
"""

import json
import hashlib
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

_METRICS_FILE = Path(__file__).parent.parent / "data" / "metrics.jsonl"
_MAX_EVENTS = 100_000  # rotaciona mantendo os últimos N eventos


def _uid_hash(user_id: str | None) -> str | None:
    if not user_id:
        return None
    return hashlib.sha256(user_id.encode()).hexdigest()[:12]


def log_event(
    endpoint: str,
    response_time_ms: int,
    *,
    intent_tag: str | None = None,
    confidence: float | None = None,
    offtopic: bool = False,
    openai_ok: bool | None = None,
    elevenlabs_ok: bool | None = None,
    error_type: str | None = None,
    user_id: str | None = None,
    age_group: str | None = None,
    has_student_context: bool = False,
) -> None:
    event: dict = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "ep": endpoint,
        "rt": response_time_ms,
    }
    if intent_tag:          event["intent"] = intent_tag
    if confidence is not None: event["conf"] = round(confidence, 3)
    if offtopic:            event["off"] = True
    if openai_ok is not None: event["ai_ok"] = openai_ok
    if elevenlabs_ok is not None: event["el_ok"] = elevenlabs_ok
    if error_type:          event["err"] = error_type[:80]
    if user_id:             event["uid"] = _uid_hash(user_id)
    if age_group:           event["age"] = age_group
    if has_student_context: event["ctx"] = True

    try:
        _METRICS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(_METRICS_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(event, ensure_ascii=False) + "\n")
    except Exception:
        pass  # métricas não devem quebrar a aplicação


def _read_events(days: int) -> list[dict]:
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    events: list[dict] = []
    try:
        with open(_METRICS_FILE, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    e = json.loads(line)
                    if datetime.fromisoformat(e["ts"]) >= cutoff:
                        events.append(e)
                except Exception:
                    continue
    except FileNotFoundError:
        pass
    return events


def get_stats(days: int = 30) -> dict:
    events = _read_events(days)
    if not events:
        return {"periodo_dias": days, "total_requests": 0, "aviso": "Nenhum evento registrado ainda."}

    search  = [e for e in events if e.get("ep") == "/search"]
    adapt   = [e for e in events if e.get("ep") == "/adapt"]
    pei     = [e for e in events if e.get("ep") == "/suggest-pei"]

    # Intents
    intents = Counter(e["intent"] for e in search if "intent" in e)

    # Tempo de resposta
    rts = [e["rt"] for e in events if "rt" in e]
    avg_rt = int(sum(rts) / len(rts)) if rts else 0
    max_rt = max(rts) if rts else 0

    # Erros
    erros_openai = sum(1 for e in events if e.get("ai_ok") is False)
    erros_el     = sum(1 for e in events if e.get("el_ok") is False)
    offtopic     = sum(1 for e in events if e.get("off"))

    # Confiança NLU
    confs = [e["conf"] for e in search if "conf" in e]
    avg_conf = round(sum(confs) / len(confs), 3) if confs else None

    # Perguntas por dia (últimos N dias)
    daily: dict[str, int] = defaultdict(int)
    for e in search:
        daily[e["ts"][:10]] += 1

    # Usuários únicos (hash anonimizado)
    uids = {e["uid"] for e in events if "uid" in e}

    # Distribuição de faixas etárias
    idades = Counter(e["age"] for e in search if "age" in e)

    # Distribuição de erros por tipo
    erros_tipos = Counter(e["err"] for e in events if "err" in e)

    # Taxa de uso com contexto de aluno
    com_aluno = sum(1 for e in search if e.get("ctx"))

    return {
        "periodo_dias": days,
        "total_requests": len(events),
        "por_endpoint": {
            "/search":      len(search),
            "/adapt":       len(adapt),
            "/suggest-pei": len(pei),
        },
        "uso_pedagogico": {
            "intents_mais_usados": [
                {"tag": t, "count": c} for t, c in intents.most_common(10)
            ],
            "perguntas_com_aluno_ativo": com_aluno,
            "distribuicao_faixa_etaria": dict(idades.most_common()),
        },
        "qualidade_nlu": {
            "confianca_media": avg_conf,
            "perguntas_fora_escopo": offtopic,
            "taxa_offtopic_pct": round(offtopic / len(search) * 100, 1) if search else 0,
        },
        "saude_sistema": {
            "tempo_medio_resposta_ms": avg_rt,
            "tempo_maximo_resposta_ms": max_rt,
            "erros_openai": erros_openai,
            "erros_elevenlabs": erros_el,
            "tipos_de_erro": dict(erros_tipos.most_common()),
        },
        "adocao": {
            "usuarios_unicos_hash": len(uids),
            "perguntas_por_dia": dict(sorted(daily.items())),
        },
    }


def rotate_if_needed() -> None:
    """Remove os eventos mais antigos se o arquivo ultrapassar _MAX_EVENTS linhas."""
    try:
        if not _METRICS_FILE.exists():
            return
        lines = _METRICS_FILE.read_text(encoding="utf-8").splitlines()
        if len(lines) > _MAX_EVENTS:
            keep = lines[-_MAX_EVENTS:]
            _METRICS_FILE.write_text("\n".join(keep) + "\n", encoding="utf-8")
    except Exception:
        pass

"""
Módulo de auditoria LGPD — AvaTEA.

Registra operações de tratamento de dados sensíveis conforme Art. 37 da LGPD
(Lei nº 13.709/2018): criação, acesso, alteração e exclusão de dados de alunos e PEIs.

Arquivo: data/audit.jsonl (append-only, separado de metrics.jsonl)
O user_id NÃO é hasheado aqui — é necessário para rastreabilidade LGPD.
O acesso a este log é protegido por autenticação (coordenador ou admin key).
"""

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

_AUDIT_FILE = Path(__file__).parent.parent / "data" / "audit.jsonl"

# ── Constantes de ação ─────────────────────────────────────────────────────────
LOGIN         = "LOGIN"
REGISTER      = "REGISTER"
ACCESS_ALUNOS = "ACCESS_ALUNOS"
CREATE_ALUNO  = "CREATE_ALUNO"
UPDATE_ALUNO  = "UPDATE_ALUNO"
DELETE_ALUNO  = "DELETE_ALUNO"
ACCESS_PEI    = "ACCESS_PEI"
SAVE_PEI      = "SAVE_PEI"
DELETE_PEI    = "DELETE_PEI"


def audit_event(
    user_id: str,
    user_nome: str,
    action: str,
    entity_type: str = "",
    entity_id: str | None = None,
    details: dict | None = None,
) -> None:
    """Registra uma operação de tratamento de dado sensível."""
    event: dict = {
        "ts":         datetime.now(timezone.utc).isoformat(),
        "user_id":    user_id,
        "user_nome":  user_nome[:60],
        "action":     action,
        "entity_type": entity_type,
    }
    if entity_id:
        event["entity_id"] = entity_id
    if details:
        event["details"] = details

    try:
        _AUDIT_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(_AUDIT_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(event, ensure_ascii=False) + "\n")
    except Exception:
        pass  # auditoria não deve interromper a operação principal


def _read_events(days: int | None = None, user_id: str | None = None) -> list[dict]:
    """Lê eventos do audit log com filtros opcionais."""
    cutoff = (
        datetime.now(timezone.utc) - timedelta(days=days)
        if days else None
    )
    events: list[dict] = []
    try:
        with open(_AUDIT_FILE, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    e = json.loads(line)
                    if cutoff and datetime.fromisoformat(e["ts"]) < cutoff:
                        continue
                    if user_id and e.get("user_id") != user_id:
                        continue
                    events.append(e)
                except Exception:
                    continue
    except FileNotFoundError:
        pass
    return events


def get_activity_timeline(user_id: str | None = None, limit: int = 50) -> list[dict]:
    """Retorna as últimas N ações do usuário (ou de todos se user_id=None)."""
    events = _read_events(user_id=user_id)
    # Ordena por timestamp desc
    events.sort(key=lambda e: e.get("ts", ""), reverse=True)
    return events[:limit]


def get_audit_summary(user_id: str | None = None, days: int = 30) -> dict:
    """
    Agrega eventos por ação para um usuário (ou todos).
    Retorna contagens por tipo de ação e dias com atividade.
    """
    from collections import Counter, defaultdict

    events = _read_events(days=days, user_id=user_id)

    action_counts: Counter = Counter()
    days_active: set = set()
    last_action: str | None = None

    for e in events:
        action_counts[e.get("action", "UNKNOWN")] += 1
        ts = e.get("ts", "")
        if ts:
            days_active.add(ts[:10])  # "YYYY-MM-DD"
        if not last_action or ts > last_action:
            last_action = ts

    return {
        "total_eventos":    len(events),
        "por_acao":         dict(action_counts),
        "dias_ativos":      len(days_active),
        "ultima_atividade": last_action,
    }


def get_users_summary(users: list[dict], alunos: list[dict], days: int = 30) -> list[dict]:
    """
    Cruza dados de users + alunos + audit para gerar resumo por professor.
    Usado em GET /coordinator/users.
    """
    result = []
    for u in users:
        uid = u["id"]
        summary = get_audit_summary(user_id=uid, days=days)
        alunos_do_prof = [a for a in alunos if a.get("professor_id") == uid]
        result.append({
            "id":              uid,
            "nome":            u["nome"],
            "email":           u["email"],
            "role":            u.get("role", "professor"),
            "status":          u.get("status", "aprovado"),
            "criado_em":       u.get("criado_em"),
            "total_alunos":    len(alunos_do_prof),
            "total_eventos":   summary["total_eventos"],
            "dias_ativos":     summary["dias_ativos"],
            "ultima_atividade": summary["ultima_atividade"],
            "por_acao":        summary["por_acao"],
        })
    return result

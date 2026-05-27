# AvaTEA — Backend

API Flask do sistema AvaTEA: assistente inteligente para professores do AEE adaptarem atividades para alunos com TEA e outras NEE.

## Stack

| Componente | Tecnologia |
|---|---|
| API | Flask + Flask-CORS (porta 5022) |
| NLU | PyTorch + Self-Attention — classifica intenções TEA/inclusão |
| RAG | OpenAI Embeddings + numpy (cosine similarity) — recupera trechos dos 18 PDFs |
| Geração | OpenAI `gpt-4.1-mini` — resposta final fundamentada na literatura |
| TTS | ElevenLabs `eleven_multilingual_v2` — resposta em áudio MP3 base64 |
| Guardrails | Classificador LLM dedicado (max_tokens=5, temp=0) — bloqueia off-topic antes da geração |
| Monitoramento | `metrics.py` (JSONL LGPD-safe) + Sentry SDK |
| Auth | JWT (PyJWT) + bcrypt-like hash (SHA-256 + salt) |

## Rodar localmente

```powershell
# Da raiz do projeto
.\Backend\start.ps1
# → http://localhost:5022
```

O `start.ps1` carrega o `.env` e limpa variáveis residuais de sessão (ex: `OPENAI_BASE_URL`).

## Variáveis de ambiente — `Backend/.env`

```env
OPENAI_API_KEY=sk-proj-...        # obrigatório
OPENAI_MODEL=gpt-4.1-mini
ELEVENLABS_API_KEY=sk_...         # obrigatório para TTS
ELEVENLABS_VOICE_ID=Xb7hH8MSUJpSbSDYk0k2   # voz Alice (free tier)
PORT=5022
JWT_SECRET=<string-aleatoria-forte>
ADMIN_KEY=<string-aleatoria-forte>
SENTRY_DSN=                        # opcional — deixar vazio desabilita Sentry
ENVIRONMENT=production
```

> **Não definir `OPENAI_BASE_URL`** — redireciona para outros provedores e quebra a chave direta da OpenAI.

## Endpoints

### `POST /search`
Chat principal com a Lorna.

```jsonc
// Request
{ "topic": "string (máx 1000 chars)", "age_group": "string", "aluno_context": { ... } }

// Response
{ "content": "resposta em markdown", "tag": "intent_tag", "confidence": 0.92, "audio_base64": "..." }
```

**Fluxo interno:**
1. NLU classifica a intenção (self-attention, 10 intents TEA/inclusão)
2. **Guardrail LLM** — classifica se o tópico está no escopo (sim/não, fail-open)
3. RAG recupera trechos relevantes dos PDFs via cosine similarity
4. `gpt-4.1-mini` gera resposta JSON `{resposta, falado}`
5. ElevenLabs converte `falado` em MP3 base64

### `POST /adapt`
Adapta uma atividade pedagógica para o perfil do aluno.

```jsonc
// Request
{ "texto_original": "string (máx 5000)", "diagnostico": "TEA", "serie": "3º ano EF", "observacoes": "...", "adaptacoes_preferidas": ["apoio visual"] }
// Response
{ "texto_adaptado": "..." }
```

### `POST /suggest-pei`
Sugere objetivos, estratégias, recursos e avaliações para um PEI.

```jsonc
// Request
{ "diagnostico": "TEA (máx 300)", "serie": "...", "observacoes": "(máx 2000)" }
// Response
{ "objetivos": [...], "estrategias": [...], "recursos": [...], "avaliacoes": [...] }
```

### `GET /health`
```json
{ "status": "ok", "openai": true, "elevenlabs": true, "rag_indexed": true, "rag_chunks": 4689 }
```

### `GET /admin/stats?days=30`
Métricas de uso agregadas. Requer header `X-Admin-Key`.

```jsonc
{
  "total_requests": 847,
  "por_endpoint": { "/search": 612, "/adapt": 183, "/suggest-pei": 52 },
  "uso_pedagogico": { "intents_mais_usados": [...], "perguntas_com_aluno_ativo": 389 },
  "qualidade_nlu": { "confianca_media": 0.743, "taxa_offtopic_pct": 3.2 },
  "saude_sistema": { "tempo_medio_resposta_ms": 2180, "erros_openai": 4 },
  "adocao": { "usuarios_unicos_hash": 23, "perguntas_por_dia": { "2026-05-27": 48 } }
}
```

### Auth
| Endpoint | Método | Descrição |
|---|---|---|
| `/auth/register` | POST | Cadastro (status `pendente` até aprovação) |
| `/auth/login` | POST | Login → JWT (8h) |
| `/auth/admin/users` | GET | Lista usuários (X-Admin-Key) |
| `/auth/admin/users/<id>` | PATCH | Aprova/bloqueia usuário (X-Admin-Key) |

## Indexar documentos RAG

```powershell
cd Backend/src
python ingest.py
# → gera data/rag_store/embeddings.npy + chunks.json (~4689 chunks)
```

## Estrutura

```
Backend/
├── src/
│   ├── apiv2.py      ← API ativa (Flask, porta 5022)
│   ├── metrics.py    ← log JSONL LGPD-safe + agregação /admin/stats
│   ├── nlu.py        ← carrega modelo + processar_texto()
│   ├── model.py      ← IntentClassifier (self-attention)
│   ├── rag.py        ← RAGSystem (numpy + OpenAI embeddings)
│   ├── ingest.py     ← CLI para indexar PDFs
│   └── utils2.py     ← tokenize, encode_sentence, load_intents
├── data/
│   ├── intents.json  ← 10 intents TEA/inclusão
│   ├── model.pth     ← modelo treinado (75% acc, 5-fold CV)
│   └── rag_store/    ← gitignored (embeddings.npy + chunks.json)
├── Dockerfile
├── requirements.txt
└── start.ps1
```

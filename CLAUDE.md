# Projeto AvaTEA — ACI Mestrado UPE

Sistema de auxílio para professores adaptarem atividades para alunos com TEA (Transtorno do Espectro Autista). Interface de chat com Avatar inteligente.

## Contexto do projeto

Atividade de Mestrado em Aplicações em Computação Inteligente (ACI) na UPE.

- **João**: construiu o backend (Flask + NLU)
- **Ana**: construiu o frontend (Next.js)
- **Responsável atual** (Vanthuir): integração backend↔frontend + regra de negócio + RAG com OpenAI

## Arquitetura

```
Projeto_ACI/
├── Backend/              # Flask API (Python)
│   ├── src/
│   │   ├── apiv2.py      # ← API ativa (porta 5022)
│   │   ├── api.py        # versão anterior, ignorar
│   │   ├── metrics.py    # log JSONL LGPD-safe + agregação /admin/stats
│   │   ├── nlu.py        # carrega modelo + função processar_texto()
│   │   ├── model.py      # IntentClassifier (self-attention)
│   │   ├── rag.py        # RAGSystem (numpy + OpenAI embeddings)
│   │   ├── ingest.py     # script CLI para indexar PDFs
│   │   ├── train.py / trainv2.py
│   │   └── utils2.py     # tokenize, encode_sentence, load_intents
│   ├── data/
│   │   ├── intents.json  # base de conhecimento TEA/inclusão (10 intents)
│   │   ├── intents_pc.json  # backup do intents anterior (pensamento computacional)
│   │   ├── model.pth     # modelo NLU treinado (attention, 75% acc)
│   │   └── rag_store/    # embeddings.npy + chunks.json (gerado pelo ingest.py) — gitignored
│   ├── Dockerfile        # python:3.11-slim, WORKDIR /app, CMD python src/apiv2.py
│   └── requirements.txt
│
├── Frontend/             # Next.js 16 + React 19
│   ├── app/
│   │   ├── login/page.tsx           # auth real via POST /auth/login
│   │   ├── register/page.tsx        # cadastro (status pendente até aprovação)
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx           # wraps AuthGuard + providers
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── assistant/page.tsx          # chat + avatar
│   │   │   ├── activity-adaptation/page.tsx
│   │   │   ├── pei-editor/page.tsx
│   │   │   ├── students/page.tsx
│   │   │   └── students/[id]/page.tsx
│   │   ├── components/
│   │   │   ├── AvatarPlayer.tsx     # avatar circular com crossfade
│   │   │   └── AuthGuard.tsx        # valida JWT (presença + expiração)
│   │   ├── mock/data.ts             # alunos de exemplo (sem persistência)
│   │   └── utils/api.ts             # fetchComTimeout 45s + buscarRespostaChat, adaptarAtividade, sugerirPEI
│   ├── instrumentation.ts           # Sentry server-side
│   ├── instrumentation-client.ts    # Sentry client-side
│   ├── .env.local                   # NEXT_PUBLIC_BACKEND_URL + SENTRY_DSN
│   ├── next.config.ts               # output: 'standalone' (obrigatório para Docker)
│   ├── Dockerfile                   # multistage Node 20-alpine, standalone build
│   └── package.json
│
├── docker-compose.prod.yml   # orquestração produção (Traefik + gestto_gestto-network)
├── deploy.sh                 # script de deploy: git pull + docker compose up --build
├── docs_RAG_TEA/         # 18 PDFs de literatura especializada sobre TEA/inclusão
├── videos/               # assets do avatar (aguardando.mp4, pensando.mp4, comunicando.mp4)
└── index.html            # protótipo inicial do avatar (legado, não usar)
```

## Backend — API

**Arquivo ativo**: `Backend/src/apiv2.py`
**Porta**: 5022
**Rodar**: `.\Backend\start.ps1` (a partir da raiz do projeto — carrega `.env` automaticamente)

### Endpoints

#### `POST /search`
```json
// Request
{ "topic": "string (máx 1000)", "age_group": "string", "aluno_context": { ... } }

// Response
{ "content": "resposta final", "tag": "intent_tag", "confidence": 0.92, "audio_base64": "..." }
```
`audio_base64` é MP3 em base64 gerado pelo ElevenLabs; `null` se TTS indisponível.

#### `POST /adapt`
```json
// Request
{
  "texto_original": "string (máx 5000)",
  "diagnostico": "string",
  "serie": "string",
  "observacoes": "string",
  "adaptacoes_preferidas": ["string"],
  "age_group": "string"
}
// Response
{ "texto_adaptado": "string" }
```

#### `POST /suggest-pei`
```json
// Request
{ "diagnostico": "string (máx 300)", "serie": "string", "observacoes": "string (máx 2000)" }
// Response
{ "objetivos": [...], "estrategias": [...], "recursos": [...], "avaliacoes": [...] }
```

#### `GET /health`
```json
{ "status": "ok", "openai": true, "elevenlabs": true, "rag_indexed": true, "rag_chunks": 4689 }
```

#### `GET /admin/stats?days=30`
Métricas de uso agregadas. Requer header `X-Admin-Key`.
Retorna: total por endpoint, intents mais usados, confiança NLU, taxa off-topic, tempo médio de resposta, erros OpenAI/ElevenLabs, usuários únicos (hash).

#### `GET /voices` / `GET /voices/test`
Lista e testa vozes ElevenLabs disponíveis no plano atual.

#### Auth
- `POST /auth/register` — cadastro (status `pendente`)
- `POST /auth/login` — login → JWT 8h
- `GET /auth/admin/users` — lista usuários (X-Admin-Key)
- `PATCH /auth/admin/users/<id>` — aprova/bloqueia (X-Admin-Key)

### Fluxo interno (`/search`)

1. `processar_texto(topic)` → modelo attention classifica intenção → retorna tag + confiança
2. Se confiança ≥ 0.49 e margem ≥ 0.15: busca resposta base no `intents.json`
3. **Guardrail LLM** — chamada dedicada (`max_tokens=5`, `temperature=0`, timeout 10s) verifica se o tópico está no escopo TEA/inclusão. Se não: retorna recusa cordial com áudio ElevenLabs. Fail-open se o classificador falhar.
4. RAG recupera trechos relevantes dos PDFs via cosine similarity (numpy)
5. `gpt-4.1-mini` gera resposta JSON `{resposta, falado}` (timeout 35s)
6. ElevenLabs TTS converte `falado` em MP3, retornado em base64

## Frontend — Estado atual

**Rodar**: `cd Frontend && npm install && npm run dev` (porta 3000)

### Arquivos de integração

| Arquivo | Função | Backend |
|---------|--------|---------|
| `utils/api.ts` → `buscarRespostaChat()` | Chat do assistente | `POST /search` |
| `utils/api.ts` → `adaptarAtividade()` | Adaptação de atividade | `POST /adapt` |
| `utils/api.ts` → `sugerirPEI()` | Sugestões de PEI | `POST /suggest-pei` |

Todas as funções usam `fetchComTimeout` (timeout 45s) com suporte a `AbortSignal`. Erros de timeout e conexão têm mensagens distintas.

### Componente Avatar

`app/components/AvatarPlayer.tsx` — exibe o avatar em moldura circular com gradiente, crossfade entre vídeos.

- Estados: `aguardando` | `pensando` | `comunicando`
- Cada estado mapeia para um pool de vídeos em loop (`/videos/*.mp4`)
- Sincronizado: aguardando → pensando (fetch) → comunicando (áudio) → aguardando
- ElevenLabs base64 decodificado no browser via `new Audio(...)`
- **Sem fallback Web Speech API** — se ElevenLabs retornar `null`, avatar vai silenciosamente para `aguardando`; professor lê a resposta no chat

### Login / Auth

`app/login/page.tsx` — autenticação real via `POST /auth/login`; armazena JWT em `localStorage`.

`app/components/AuthGuard.tsx` — protege todas as rotas `(dashboard)`:
- Verifica existência do token
- Decodifica JWT e valida campo `exp` — token expirado limpa localStorage e redireciona para `/login`

### Dados mockados

`app/mock/data.ts` — Interface `Aluno`: `id, nome, diagnostico, cid, serie, idade, observacoes, adaptacoesPreferidas`

**Alunos de exemplo**: João Silva (TEA), Maria Santos (TDAH), Pedro Oliveira (Dislexia), Ana Costa (Asperger)

> Nota: campo `nivelSuporte` removido do sistema. O sistema nunca menciona níveis de suporte (Nível 1/2/3) — explícito no system prompt do GPT.

## Status das fases

### ✅ Fase 1 — Integração frontend ↔ backend (CONCLUÍDA)
- `Frontend/app/utils/api.ts` criado com `buscarRespostaChat`, `adaptarAtividade`, `sugerirPEI`
- `assistant/page.tsx`, `activity-adaptation/page.tsx`, `pei-editor/page.tsx` conectados ao backend real
- `Frontend/.env.local` com `NEXT_PUBLIC_BACKEND_URL=http://localhost:5022`

### ✅ Fase 2 — Retreinamento NLU com conteúdo TEA (CONCLUÍDA)
- `intents.json` reescrito com 10 intents sobre TEA/inclusão (adaptacao_tea, elaborar_pei, comunicacao_alternativa, etc.)
- Modelo retreinado via `trainv2.py` — 75.09% acurácia, 5-fold cross-validation
- `model.pth` atualizado

### ✅ Fase 3 — RAG com OpenAI (CONCLUÍDA)
- `Backend/src/rag.py` — `RAGSystem`: numpy vector store (`embeddings.npy` + `chunks.json`)
- `Backend/src/ingest.py` — script CLI para indexar os PDFs de `docs_RAG_TEA/`
- `apiv2.py`: todos os 3 endpoints usam RAG context + `gpt-4.1-mini`
- `/health` endpoint adicionado
- ChromaDB descartado (bug HNSW no v0.6+); substituído por numpy puro

### Documentos RAG — `docs_RAG_TEA/` (18 PDFs, ~4689 chunks)
- ESTUDANTES TEA E TDAH - SUGESTÕES PARA PROFESSORES.pdf
- tea.pdf, politicaeducespecial.pdf, estatuto_da_pessoa_com_deficiencia.pdf (LBI)
- e-book-acessibilidade-curricular-praticas-pedagogicas-inclusivas.pdf
- Livro GEPAEE versão final.pdf, manual de leitura facil.pdf
- PRODUTO - Guia Prático PEI para Altas Habilidades.pdf
- 20220311_relatorio_cp_03_pcdt_tdah.pdf, ah-s.pdf
- Projeto MEC Escola Viva/ (5 cartilhas)
- bonadio, livro-altas-habilidades, DOC-20250510-WA0008

### ✅ Fase 4 — Avatar ElevenLabs (CONCLUÍDA)
- ElevenLabs TTS integrado: backend chama API, retorna MP3 em base64 no campo `audio_base64`
- Voz configurada: **Alice** (`Xb7hH8MSUJpSbSDYk0k2`) — inglesa, acessível no plano free
- Vozes PT-BR da Voice Library (Raquel, Carla, Dieni F) bloqueadas no plano free via API (HTTP 402)
- Frontend: `AvatarPlayer.tsx` com moldura circular + gradiente ocultando marca d'água Veo
- `objectPosition: "center 8%"` enquadra apenas o busto do avatar
- Web Speech API removida — evita voz pt-PT no fallback (bug apresentado em produção)
- `Backend/start.ps1` — startup script que carrega `.env` e limpa variáveis residuais de sessões anteriores

### ✅ Fase 6 — Guardrails, Monitoramento e Hardening (CONCLUÍDA)
- **Guardrail LLM**: classificador dedicado antes de cada resposta `/search`; recusa cordial com voz ElevenLabs para off-topic; fail-open
- **metrics.py**: log JSONL append-only por evento (LGPD-safe, sem PII); endpoint `GET /admin/stats` agrega uso pedagógico, saúde do sistema, adoção e qualidade NLU
- **Sentry**: `sentry-sdk[flask]` no backend + `@sentry/nextjs` no frontend (`instrumentation.ts` + `instrumentation-client.ts`)
- **Timeout LLM**: 35s em todas as chamadas OpenAI; 10s no guardrail
- **Timeout frontend**: 45s com `AbortController` em todos os fetches; mensagens distintas para timeout vs. erro de conexão
- **Limites de input**: `/search` 1000, `/adapt` 5000, `/suggest-pei` 2300 chars
- **AuthGuard** com validação JWT real (verifica `exp`, limpa token expirado)

### 🔄 Fase 5 — Deploy VPS (em andamento)
- URL de produção: **https://avatartea.axiodev.cloud**
- VPS: `serveraxio` — Traefik v3.4 já rodando no container `gestto_traefik`
- Rede Docker: `gestto_gestto-network` (externa, compartilhada com outros serviços do servidor)
- Arquivos criados: `Backend/Dockerfile`, `Frontend/Dockerfile`, `docker-compose.prod.yml`, `deploy.sh`
- `next.config.ts`: `output: 'standalone'` adicionado (obrigatório para o build Docker do Next.js)
- `nlu.py`: caminho do modelo corrigido para `Path(__file__).parent.parent / "data" / "model.pth"`
- **Pendente**: DNS — criar registro `A` para `avatartea.axiodev.cloud` apontando para o IP da VPS
- **Pendente**: copiar `Backend/.env`, `Backend/data/rag_store/` e `videos/` para a VPS via `scp`
- **Pendente**: trocar `JWT_SECRET` e `ADMIN_KEY` por strings fortes no `.env` da VPS

## Como rodar o sistema completo

```powershell
# ── Backend ───────────────────────────────────────────────────────────────────

# 1. Instalar dependências (uma vez)
cd Backend
pip install -r requirements.txt

# 2. Criar Backend/.env com as chaves (ver seção abaixo)

# 3. Indexar documentos RAG (uma vez; re-executar para re-indexar do zero)
cd src
python ingest.py
cd ..\..

# 4. Subir o backend (a partir da raiz do projeto)
.\Backend\start.ps1
# → http://localhost:5022

# 5. Verificar status
Invoke-RestMethod http://localhost:5022/health

# ── Frontend ──────────────────────────────────────────────────────────────────
cd Frontend
npm install
npm run dev
# → http://localhost:3000
```

## Variáveis de ambiente (Backend)

Criar o arquivo `Backend/.env` (não commitar):

```
OPENAI_API_KEY=sk-...                    # obrigatório para RAG + geração
OPENAI_MODEL=gpt-4.1-mini
ELEVENLABS_API_KEY=sk_...                # obrigatório para TTS
ELEVENLABS_VOICE_ID=Xb7hH8MSUJpSbSDYk0k2  # voz Alice (free tier)
PORT=5022
JWT_SECRET=<string-aleatória-forte>      # TROCAR antes de ir ao ar
ADMIN_KEY=<string-aleatória-forte>       # TROCAR antes de ir ao ar
SENTRY_DSN=                              # opcional — vazio desabilita Sentry
ENVIRONMENT=production
```

**Importante**: NÃO definir `OPENAI_BASE_URL` — roteia para outros provedores e quebra a chave direta da OpenAI. O `start.ps1` já limpa essa variável automaticamente.

## Variáveis de ambiente (Frontend)

`Frontend/.env.local`:
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:5022
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
```

## Notas importantes

- O modelo NLU (`model.pth`) usa arquitetura **attention** (não LSTM) — ver `nlu.py`: `model_name = 'attention'`
- RAG usa **numpy puro** (sem ChromaDB) — vetores em `rag_store/embeddings.npy`, metadados em `rag_store/chunks.json`
- GloVe (inglês) usado no NLU; palavras em português recebem embedding aleatório — limitação conhecida, modelo ainda treinou bem
- O frontend usa **Framer Motion** para animações e **react-hook-form + zod** no PEI editor
- CORS habilitado no backend (`flask-cors`)
- `api.py` (raiz do Backend/src) é a versão v1, não usar
- ElevenLabs free plan: vozes da Voice Library bloqueadas via API (HTTP 402) — usar apenas vozes "premade" acessíveis (verificar com `GET /voices/test`)
- O system prompt do GPT instrui explicitamente a responder em PT-BR, sem raciocínio interno, e sem citar níveis de TEA
- `nlu.py` usa `Path(__file__).parent.parent / "data" / "model.pth"` — caminhos relativos ao cwd quebram no Docker
- `apiv2.py` usa `Path(__file__).parent` para todos os paths (`_DATA`, `_DOCS`) — padrão correto a seguir
- **Guardrail fail-open**: se a chamada de classificação falhar (OpenAI indisponível), o request prossegue — evita bloquear professores por falha de infraestrutura
- **Métricas**: `data/metrics.jsonl` rotaciona automaticamente após 100k eventos; consultar via `GET /admin/stats`
- **Sentry**: ativo apenas quando `SENTRY_DSN` está definido; `traces_sample_rate=0.2` (20% das requests) para controlar custo

## Deploy — Docker (Fase 5)

### Infra
- Traefik v3.4 já roda na VPS no container `gestto_traefik`, rede `gestto_gestto-network`
- Backend exposto via `/api` (stripprefix remove o prefixo antes de chegar no Flask)
- Frontend recebe `NEXT_PUBLIC_BACKEND_URL=https://avatartea.axiodev.cloud/api` como build arg

### Rodar deploy na VPS
```bash
cd /var/www/avatartea
./deploy.sh   # git pull + docker compose up -d --build + health check
```

### Assets que não estão no git (copiar via scp da máquina local)
```bash
# Rodar da máquina LOCAL, substituindo VPS_IP e USER
scp Backend/.env USER@VPS_IP:/var/www/avatartea/Backend/.env
scp -r Backend/data/rag_store USER@VPS_IP:/var/www/avatartea/Backend/data/
scp videos/pensando.mp4 USER@VPS_IP:/var/www/avatartea/videos/pensando.mp4
```

### Volumes mapeados no docker-compose.prod.yml
| Volume host | Container | Modo |
|---|---|---|
| `./Backend/data/rag_store` | `/app/data/rag_store` | `:ro` |
| `./docs_RAG_TEA` | `/app/docs_RAG_TEA` | `:ro` |
| `./videos` | `/app/videos` | `:ro` |

## Próximos passos

1. **Trocar segredos** — `JWT_SECRET` e `ADMIN_KEY` no `.env` da VPS por strings fortes (geradas com `openssl rand -hex 32`)
2. **Sentry** — criar projeto em sentry.io, preencher `SENTRY_DSN` no backend e `NEXT_PUBLIC_SENTRY_DSN` no frontend
3. **DNS** — criar registro `A`: `avatartea` → IP da VPS no painel do domínio `axiodev.cloud`
4. **Verificar healthcheck** — após DNS, confirmar `https://avatartea.axiodev.cloud/api/health`
5. **Rate limiting** (opcional pós-lançamento) — Flask-Limiter para proteger quota OpenAI/ElevenLabs
6. **Persistência de alunos** (opcional pós-lançamento) — substituir mock por banco de dados real

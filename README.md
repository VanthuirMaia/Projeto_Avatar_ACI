# AvaTEA — Assistente Educacional para Inclusão

Sistema de apoio pedagógico com avatar inteligente, desenvolvido como atividade de Mestrado em Aplicações em Computação Inteligente (ACI) na UPE.

Auxilia professores do ensino básico a adaptar atividades e elaborar PEIs (Planos Educacionais Individualizados) para alunos com TEA, TDAH, Dislexia e outras necessidades educacionais especiais.

**Produção**: [https://avatartea.axiodev.cloud](https://avatartea.axiodev.cloud)

---

## Funcionalidades

- **Chat com assistente IA** — perguntas pedagógicas sobre inclusão respondidas com base em 18 PDFs de literatura especializada (RAG) e geração via `gpt-4.1-mini`
- **Adaptação de atividades** — recebe texto de atividade + perfil do aluno e retorna versão adaptada ao diagnóstico
- **Editor de PEI** — gera sugestões de objetivos, estratégias, recursos e avaliações a partir do diagnóstico do aluno; PEIs salvos por professor
- **Avatar falante** — vídeo de avatar com 3 estados (aguardando, pensando, comunicando) + áudio ElevenLabs TTS sincronizado
- **Gestão de alunos** — CRUD de alunos com diagnóstico, série e preferências de adaptação; vinculação ao chat personaliza o prompt
- **Histórico persistente** — sessões de chat e adaptações salvas localmente; sidebar colapsável com agrupamento por data
- **Autenticação e aprovação** — cadastro com aprovação manual pelo coordenador; roles professor/coordenador com permissões distintas
- **Painel administrativo** — métricas de uso, saúde do sistema, gestão de usuários e exportação de relatório PDF
- **Responsividade mobile** — sidebar hambúrguer, layout adaptado para 375px

---

## Arquitetura

```
Projeto_ACI/
├── Backend/                          # Flask API — Python 3.11
│   ├── src/
│   │   ├── apiv2.py                  # API ativa (porta 5022)
│   │   ├── nlu.py                    # classificador de intenção (attention)
│   │   ├── model.py                  # IntentClassifier com self-attention
│   │   ├── rag.py                    # RAGSystem (numpy + OpenAI embeddings)
│   │   ├── ingest.py                 # script CLI para indexar PDFs
│   │   ├── metrics.py                # log JSONL LGPD-safe + /admin/stats
│   │   ├── trainv2.py                # treinamento do modelo NLU
│   │   └── utils2.py                 # tokenização e helpers NLU
│   ├── data/
│   │   ├── intents.json              # base de conhecimento TEA/inclusão (10 intents)
│   │   ├── model.pth                 # modelo NLU treinado (75% acc)
│   │   ├── rag_store/                # embeddings.npy + chunks.json — gitignored
│   │   ├── users.json                # store de usuários — gitignored
│   │   ├── alunos.json               # alunos por professor — gitignored
│   │   └── peis.json                 # PEIs salvos por professor — gitignored
│   ├── Dockerfile                    # python:3.11-slim
│   ├── start.ps1                     # startup local (carrega .env, limpa vars)
│   └── requirements.txt
│
├── Frontend/                         # Next.js 16 + React 19 — TypeScript
│   ├── app/
│   │   ├── login/page.tsx            # auth via POST /auth/login
│   │   ├── register/page.tsx         # cadastro com seletor de role
│   │   ├── admin/page.tsx            # painel admin (ADMIN_KEY gate)
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx            # wraps AuthGuard + providers de contexto
│   │   │   ├── dashboard/page.tsx    # KPIs dinâmicos + lista de PEIs
│   │   │   ├── assistant/page.tsx    # chat + avatar + sidebar de histórico
│   │   │   ├── activity-adaptation/page.tsx
│   │   │   ├── pei-editor/page.tsx   # editor com lista de PEIs salvos
│   │   │   ├── students/page.tsx     # CRUD de alunos
│   │   │   └── students/[id]/page.tsx
│   │   ├── components/
│   │   │   ├── AvatarPlayer.tsx      # avatar circular com crossfade de vídeos
│   │   │   ├── AuthGuard.tsx         # valida JWT (presença + expiração)
│   │   │   └── StudentFormModal.tsx  # modal de criação/edição de alunos
│   │   ├── context/
│   │   │   ├── AlunosContext.tsx     # alunos sincronizados com backend + fallback localStorage
│   │   │   ├── ChatHistoryContext.tsx       # histórico de sessões de chat
│   │   │   └── AdaptacoesHistoryContext.tsx # histórico de adaptações geradas
│   │   └── utils/api.ts              # fetchComTimeout 45s + funções de integração
│   ├── instrumentation.ts            # Sentry server-side
│   ├── instrumentation-client.ts     # Sentry client-side
│   ├── next.config.ts                # output: 'standalone' (obrigatório para Docker)
│   ├── Dockerfile                    # multistage Node 20-alpine
│   └── package.json
│
├── .github/workflows/deploy.yml      # CI/CD — deploy automático via GitHub Actions
├── docker-compose.prod.yml           # orquestração produção (Traefik)
├── deploy.sh                         # git fetch --hard + docker compose up --build
├── docs_RAG_TEA/                     # 18 PDFs de literatura especializada (~4689 chunks)
├── videos/                           # assets do avatar (aguardando/pensando/comunicando)
└── index.html                        # protótipo inicial do avatar (legado)
```

---

## Stack tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Backend | Python 3.11, Flask, flask-cors, PyJWT |
| IA / NLP | `gpt-4.1-mini` (OpenAI), `text-embedding-3-small` (OpenAI) |
| NLU | Modelo attention treinado do zero (PyTorch, GloVe) |
| RAG | numpy vector store (cosine similarity) |
| TTS | ElevenLabs — voz Alice (`Xb7hH8MSUJpSbSDYk0k2`) |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Animações | Framer Motion |
| Formulários | react-hook-form + zod |
| Markdown | react-markdown |
| Monitoramento | Sentry (backend Flask + frontend Next.js) |
| Deploy | Docker, Traefik v3.4, GitHub Actions |
| Infraestrutura | VPS Linux — rede `gestto_gestto-network` |

---

## Como rodar

### Pré-requisitos

- Python 3.10+ com `.venv` ativado
- Node.js 18+
- Chave de API OpenAI
- Chave de API ElevenLabs (TTS do avatar)

### Backend

```powershell
# 1. Instalar dependências
cd Backend
pip install -r requirements.txt

# 2. Configurar variáveis (criar Backend/.env — ver seção abaixo)

# 3. Indexar documentos RAG (rodar uma vez; re-indexa do zero se repetido)
cd src
python ingest.py

# 4. Subir a API (a partir da raiz do projeto — carrega .env automaticamente)
.\Backend\start.ps1
# → http://localhost:5022
```

### Frontend

```bash
cd Frontend
npm install
npm run dev
# → http://localhost:3000
```

### Variáveis de ambiente — Backend (`Backend/.env`)

```env
OPENAI_API_KEY=sk-...                          # obrigatório para RAG + geração
OPENAI_MODEL=gpt-4.1-mini
ELEVENLABS_API_KEY=sk_...                      # obrigatório para TTS
ELEVENLABS_VOICE_ID=Xb7hH8MSUJpSbSDYk0k2      # voz Alice (free tier)
PORT=5022
JWT_SECRET=<string-aleatória-forte>            # TROCAR antes de ir ao ar
ADMIN_KEY=<string-aleatória-forte>             # TROCAR antes de ir ao ar
SENTRY_DSN=                                    # opcional — vazio desabilita Sentry
ENVIRONMENT=production
```

### Variáveis de ambiente — Frontend (`Frontend/.env.local`)

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5022
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
```

---

## Endpoints da API

### `POST /search`

Chat com o assistente — responde perguntas pedagógicas sobre inclusão.

```json
// Request (máx 1000 chars em topic)
{
  "topic": "Como adaptar atividades para alunos com TEA?",
  "age_group": "6 a 10 anos",
  "aluno_context": { "diagnostico": "TEA", "observacoes": "..." }
}

// Response
{
  "content": "resposta em texto",
  "tag": "adaptacao_tea",
  "confidence": 0.92,
  "audio_base64": "<MP3 em base64 — null se ElevenLabs indisponível>"
}
```

### `POST /adapt`

Adapta um texto de atividade para o perfil de um aluno específico.

```json
// Request (máx 5000 chars em texto_original)
{
  "texto_original": "Leia e responda...",
  "diagnostico": "TEA",
  "serie": "5º Ano",
  "observacoes": "Prefere atividades estruturadas",
  "adaptacoes_preferidas": ["Linguagem simplificada", "Recursos visuais"],
  "age_group": "6 a 10 anos"
}

// Response
{ "texto_adaptado": "versão adaptada..." }
```

### `POST /suggest-pei`

Gera sugestões de PEI (objetivos, estratégias, recursos, avaliações).

```json
// Request (máx 2300 chars total)
{
  "diagnostico": "TEA",
  "serie": "5º Ano",
  "observacoes": "..."
}

// Response
{
  "objetivos": [...],
  "estrategias": [...],
  "recursos": [...],
  "avaliacoes": [...]
}
```

### Autenticação

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/auth/register` | Cadastro (status inicial: `pendente`) |
| `POST` | `/auth/login` | Login → JWT 8h (inclui role e nome) |
| `GET` | `/auth/admin/users` | Lista usuários — requer `X-Admin-Key` |
| `PATCH` | `/auth/admin/users/<id>` | Aprovar / bloquear usuário — requer `X-Admin-Key` |

### Alunos e PEIs (requer JWT)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/alunos` | Lista alunos do professor (coordenador vê todos) |
| `POST` | `/alunos` | Cria aluno vinculado ao professor_id do JWT |
| `PUT` | `/alunos/<id>` | Atualiza aluno |
| `DELETE` | `/alunos/<id>` | Remove aluno |
| `GET` | `/pei` | Lista PEIs do professor |
| `POST` | `/pei` | Salva PEI vinculado ao professor e aluno |
| `PUT` | `/pei/<id>` | Atualiza PEI |
| `DELETE` | `/pei/<id>` | Remove PEI |

### Monitoramento e utilitários

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/health` | Status do servidor, RAG e integrações |
| `GET` | `/admin/stats?days=30` | Métricas agregadas — requer `X-Admin-Key` |
| `GET` | `/voices` | Lista vozes disponíveis na conta ElevenLabs |
| `GET` | `/voices/test` | Testa vozes acessíveis no plano atual |

---

## Fluxo interno — `POST /search`

```
Professor envia pergunta
        │
        ▼
1. NLU (attention model)
   └── classifica intenção → tag + confiança
        │
        ▼
2. Guardrail LLM (gpt-4.1-mini, max_tokens=5, timeout 10s)
   └── verifica se o tópico está no escopo TEA/inclusão
   ├── fora do escopo → retorna recusa cordial com áudio ElevenLabs
   └── dentro do escopo → continua
        │
        ▼
3. RAG — cosine similarity (numpy + text-embedding-3-small)
   └── recupera 3 trechos mais relevantes dos 18 PDFs (~4689 chunks)
        │
        ▼
4. gpt-4.1-mini (timeout 35s)
   └── gera JSON { resposta, falado } com RAG + perfil do aluno no contexto
        │
        ▼
5. ElevenLabs TTS
   └── converte campo "falado" (~200 chars) em MP3 → retorna em base64
        │
        ▼
Response: { content, tag, confidence, audio_base64 }
```

**Fail-open**: se o guardrail falhar (OpenAI indisponível), a requisição prossegue normalmente — evita bloquear professores por falha de infraestrutura.

---

## Componentes principais

### Avatar (`AvatarPlayer.tsx`)

- Moldura circular com borda gradiente; `objectPosition: "center 8%"` enquadra o busto
- Crossfade suave entre vídeos via dois elementos `<video>` sobrepostos
- 3 estados com pool de vídeos para variação natural: `aguardando` (×2), `pensando` (×1), `comunicando` (×3)
- Sincronizado com o ciclo: aguardando → pensando (durante fetch) → comunicando (durante áudio) → aguardando
- Sem fallback Web Speech API — evita voz pt-PT (bug identificado em produção)

### Histórico (`ChatHistoryContext` / `AdaptacoesHistoryContext`)

- Sessões de chat: até 50, salvas em localStorage, agrupadas por Hoje / Ontem / 7 dias / Mais antigos
- Título da sessão gerado automaticamente da primeira mensagem
- Aluno vinculado visível na sidebar; trocar aluno inicia nova sessão
- Adaptações: salvas automaticamente ao gerar; clicar em um item carrega o resultado no passo 3

### Painel Admin (`/admin`)

- Gate de autenticação por `ADMIN_KEY` (sessionStorage), sem dependência de JWT
- **Visão Geral**: KPIs (total de consultas, usuários únicos, tempo médio, taxa off-topic) + gráfico de atividade diária + distribuição por funcionalidade
- **Usuários**: tabela com filtro por status (pendente/ativo/bloqueado), aprovar/bloquear com toast, badge de pendentes
- **Uso**: tópicos mais consultados, faixa etária dos alunos, % de uso com/sem contexto de aluno
- **Saúde**: erros OpenAI/ElevenLabs, tempo de resposta, confiança NLU, taxa off-topic
- **Relatório**: exportar PDF completo com métricas e lista de usuários
- Seletor de período: 7 / 30 / 90 dias / 1 ano
- Sem dependências novas — CSS puro para gráficos

### Métricas (`metrics.py`)

- Log JSONL append-only por evento (sem PII — LGPD-safe)
- Rotação automática após 100k eventos (`data/metrics.jsonl`)
- Agrega: uso por endpoint, intents mais consultados, confiança NLU, taxa off-topic, tempo médio de resposta, erros por serviço, usuários únicos (hash)

---

## Status das fases

| Fase | Descrição | Status |
|------|-----------|--------|
| 1 | Integração frontend ↔ backend | ✅ Concluída |
| 2 | Retreinamento NLU com conteúdo TEA (10 intents, 75% acc) | ✅ Concluída |
| 3 | RAG com OpenAI — numpy vector store, 18 PDFs, ~4689 chunks | ✅ Concluída |
| 4 | Avatar ElevenLabs TTS + crossfade + toggle de áudio | ✅ Concluída |
| 5 | Deploy VPS — Docker + Traefik + GitHub Actions CI/CD | ✅ Concluída |
| 6 | Guardrails LLM + métricas LGPD-safe + Sentry + hardening | ✅ Concluída |
| 7 | Autenticação JWT + roles professor/coordenador + aprovação | ✅ Concluída |
| 8 | Persistência real de alunos e PEIs + dashboard dinâmico | ✅ Concluída |
| 9 | Painel admin completo + exportação de relatório | ✅ Concluída |
| 10 | Responsividade mobile + histórico persistente de chats | ✅ Concluída |

---

## Deploy

### Infraestrutura

- **VPS**: `serveraxio` — Traefik v3.4 no container `gestto_traefik`, rede `gestto_gestto-network`
- **URL de produção**: `https://avatartea.axiodev.cloud`
- Backend exposto via `/api` (stripprefix antes de chegar no Flask)
- Frontend recebe `NEXT_PUBLIC_BACKEND_URL=https://avatartea.axiodev.cloud/api` como build arg

### CI/CD — GitHub Actions (`.github/workflows/deploy.yml`)

Push para `main` dispara:
1. SSH na VPS
2. `git fetch` + `git reset --hard origin/main`
3. Cria `alunos.json` e `peis.json` se ausentes
4. `docker compose -f docker-compose.prod.yml up -d --build`
5. Health check em `/api/health`

### Deploy manual na VPS

```bash
cd /var/www/avatartea
./deploy.sh
```

### Assets fora do git (copiar via scp)

```bash
# Rodar da máquina LOCAL
scp Backend/.env USER@VPS_IP:/var/www/avatartea/Backend/.env
scp -r Backend/data/rag_store USER@VPS_IP:/var/www/avatartea/Backend/data/
scp videos/pensando.mp4 USER@VPS_IP:/var/www/avatartea/videos/pensando.mp4
```

### Volumes mapeados

| Volume host | Container | Modo |
|-------------|-----------|------|
| `./Backend/data/rag_store` | `/app/data/rag_store` | `:ro` |
| `./docs_RAG_TEA` | `/app/docs_RAG_TEA` | `:ro` |
| `./videos` | `/app/videos` | `:ro` |

---

## Base de conhecimento RAG — `docs_RAG_TEA/`

18 PDFs de literatura especializada sobre TEA e inclusão escolar (~4689 chunks indexados):

- ESTUDANTES TEA E TDAH - SUGESTÕES PARA PROFESSORES.pdf
- tea.pdf, politicaeducespecial.pdf
- Estatuto da Pessoa com Deficiência (LBI)
- e-book-acessibilidade-curricular-praticas-pedagogicas-inclusivas.pdf
- Livro GEPAEE versão final.pdf
- Manual de Leitura Fácil
- PRODUTO - Guia Prático PEI para Altas Habilidades.pdf
- Projeto MEC Escola Viva (5 cartilhas)
- bonadio, livro-altas-habilidades, DOC-20250510-WA0008
- 20220311_relatorio_cp_03_pcdt_tdah.pdf, ah-s.pdf

---

## Notas técnicas

- NLU usa arquitetura **attention** (não LSTM); GloVe inglês — palavras PT-BR recebem embedding aleatório (limitação conhecida, modelo ainda treinou bem com 75% de acurácia)
- RAG usa **numpy puro** (sem ChromaDB — descartado por bug HNSW no v0.6+)
- Threshold mínimo de similaridade coseno: **0.25**; recupera **3 chunks** por consulta
- `nlu.py` usa `Path(__file__).parent.parent / "data" / "model.pth"` — caminho relativo ao `cwd` quebra no Docker
- System prompt instrui explicitamente: responder em PT-BR, sem raciocínio interno exposto, sem citar níveis de TEA (Nível 1/2/3)
- ElevenLabs free plan: vozes da Voice Library bloqueadas via API (HTTP 402); usar apenas vozes "premade" (verificar com `GET /voices/test`)
- `OPENAI_BASE_URL` não deve ser definida — roteia para outros provedores e quebra a chave direta da OpenAI; o `start.ps1` já limpa essa variável automaticamente

---

## Equipe

| Membro | Papel |
|--------|-------|
| **Renata Freire** | PO e Coordenadora do Projeto |
| **Bruno Morato** | Gerente de Projetos |
| **João Araújo** | Backend Flask + NLU (base) |
| **Ana** | Frontend Next.js (base) |
| **Vanthuir Maia** | Integração, RAG, regra de negócio, retreinamento NLU, autenticação, persistência, painel admin, deploy |

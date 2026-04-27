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
│   │   ├── nlu.py        # carrega modelo + função processar_texto()
│   │   ├── model.py      # LSTMClassifier + IntentClassifier (attention)
│   │   ├── rag.py        # RAGSystem (numpy + OpenAI embeddings)
│   │   ├── ingest.py     # script CLI para indexar PDFs
│   │   ├── train.py / trainv2.py
│   │   └── utils2.py     # tokenize, encode_sentence, load_intents
│   ├── data/
│   │   ├── intents.json  # base de conhecimento TEA/inclusão (10 intents)
│   │   ├── intents_pc.json  # backup do intents anterior (pensamento computacional)
│   │   ├── model.pth     # modelo NLU treinado (attention, 75% acc)
│   │   └── rag_store/    # embeddings.npy + chunks.json (gerado pelo ingest.py)
│   └── requirements.txt
│
├── Frontend/             # Next.js app
│   ├── app/
│   │   ├── login/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── assistant/page.tsx          # chat com assistente IA
│   │   │   ├── activity-adaptation/page.tsx # adaptação de atividades
│   │   │   ├── pei-editor/page.tsx          # editor de PEI
│   │   │   ├── students/page.tsx
│   │   │   └── students/[id]/page.tsx
│   │   ├── mock/data.ts       # dados mockados de alunos, atividades, PEIs
│   │   └── utils/api.ts       # chamadas ao backend (buscarRespostaChat, adaptarAtividade, sugerirPEI)
│   ├── .env.local             # NEXT_PUBLIC_BACKEND_URL=http://localhost:5022
│   └── package.json
│
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
{ "topic": "string", "age_group": "string" }

// Response
{ "content": "resposta final", "tag": "intent_tag", "confidence": 0.92, "audio_base64": "..." }
```
`audio_base64` é MP3 em base64 gerado pelo ElevenLabs; `null` se TTS indisponível.

#### `POST /adapt`
```json
// Request
{
  "texto_original": "string",
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
{ "diagnostico": "string", "serie": "string", "observacoes": "string", "age_group": "string" }

// Response
{ "objetivos": [...], "estrategias": [...], "recursos": [...], "avaliacoes": [...] }
```

#### `GET /health`
```json
{ "status": "ok", "openai": true, "elevenlabs": true, "rag_indexed": true, "rag_chunks": 4689 }
```

#### `GET /voices`
Lista vozes disponíveis na conta ElevenLabs (`voice_id`, `name`, `labels`).

#### `GET /voices/test`
Testa todas as vozes e retorna quais são acessíveis no plano atual (`accessible` / `blocked`). Útil para trocar de voz.

### Fluxo interno (`/search`)

1. `processar_texto(topic)` → modelo attention classifica intenção → retorna tag + confiança
2. Se confiança ≥ 0.49 e margem ≥ 0.15: busca resposta base no `intents.json` (primeiro response disponível)
3. RAG recupera trechos relevantes dos PDFs via cosine similarity (numpy)
4. `gpt-4.1-mini` gera resposta final usando RAG + resposta base como contexto
5. ElevenLabs TTS converte a resposta em MP3, retornado em base64 no campo `audio_base64`

## Frontend — Estado atual

**Rodar**: `cd Frontend && npm install && npm run dev` (porta 3000)

### Arquivos de integração

| Arquivo | Função | Backend |
|---------|--------|---------|
| `utils/api.ts` → `buscarRespostaChat()` | Chat do assistente | `POST /search` |
| `utils/api.ts` → `adaptarAtividade()` | Adaptação de atividade | `POST /adapt` |
| `utils/api.ts` → `sugerirPEI()` | Sugestões de PEI | `POST /suggest-pei` |

### Componente Avatar

`app/components/AvatarPlayer.tsx` — exibe o avatar em moldura circular com gradiente.

- Estados: `aguardando` | `pensando` | `comunicando`
- Cada estado mapeia para um vídeo em loop (`/videos/*.mp4`)
- Sincronizado com o ciclo de requisição: aguardando → pensando (fetch) → comunicando (áudio tocando) → aguardando
- ElevenLabs base64 é decodificado no browser e tocado via `new Audio(...)` com fallback para Web Speech API

### Login

`app/login/page.tsx` — form com email/senha, redireciona para `/dashboard` sem validação real (mock aceitável para demo).

### Dados mockados

`app/mock/data.ts` — Interface `Aluno`: `id, nome, diagnostico, cid, serie, idade, observacoes, adaptacoesPreferidas`

**Alunos de exemplo**: João Silva (TEA), Maria Santos (TDAH), Pedro Oliveira (Dislexia), Ana Costa (Asperger)

> Nota: campo `nivelSuporte` removido do sistema a pedido da equipe. O sistema nunca menciona níveis de suporte (Nível 1/2/3) — isso está explícito no system prompt do GPT.

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
- Fallback para Web Speech API (`pt-BR`) quando `audio_base64` é null
- `Backend/start.ps1` — startup script que carrega `.env` e limpa variáveis residuais de sessões anteriores

### 🔲 Fase 5 — Deploy VPS (próximo)
- Docker Compose: backend + frontend em containers separados
- Nginx reverse proxy + Let's Encrypt HTTPS
- Variáveis de ambiente via `.env` no servidor (não commitar chaves)

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
OPENAI_API_KEY=sk-...         # obrigatório para RAG + geração
OPENAI_MODEL=gpt-4.1-mini     # modelo OpenAI a usar
ELEVENLABS_API_KEY=sk_...     # obrigatório para TTS
ELEVENLABS_VOICE_ID=Xb7hH8MSUJpSbSDYk0k2  # voz Alice (free tier)
PORT=5022
```

**Importante**: NÃO definir `OPENAI_BASE_URL` — se definida, o SDK da OpenAI roteia para outro endpoint (ex: OpenRouter) e a chave `sk-proj-...` da OpenAI direta retorna 401. O `start.ps1` já limpa essa variável automaticamente.

## Notas importantes

- O modelo NLU (`model.pth`) usa arquitetura **attention** (não LSTM) — ver `nlu.py`: `model_name = 'attention'`
- RAG usa **numpy puro** (sem ChromaDB) — vetores em `rag_store/embeddings.npy`, metadados em `rag_store/chunks.json`
- GloVe (inglês) usado no NLU; palavras em português recebem embedding aleatório — limitação conhecida, modelo ainda treinou bem
- O frontend usa **Framer Motion** para animações e **react-hook-form + zod** no PEI editor
- CORS habilitado no backend (`flask-cors`)
- `api.py` (raiz do Backend/src) é a versão v1, não usar
- ElevenLabs free plan: vozes da Voice Library bloqueadas via API (HTTP 402) — usar apenas vozes "premade" acessíveis (verificar com `GET /voices/test`)
- O system prompt do GPT instrui explicitamente a responder em PT-BR, sem raciocínio interno, e sem citar níveis de TEA

## Próximo passo — Fase 5: Deploy VPS

Planejado para a próxima sessão. Pontos a definir com o usuário:
- SO e acesso à VPS (IP, usuário SSH)
- Domínio disponível para HTTPS (Let's Encrypt)
- Estratégia para as chaves de API no servidor (`.env` remoto, secrets manager, etc.)
- Repositório git: público ou privado? (`.env` nunca entra no repo)

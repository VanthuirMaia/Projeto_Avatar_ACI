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
**Rodar**: `cd Backend/src && python apiv2.py`

### Endpoints

#### `POST /search`
```json
// Request
{ "topic": "string", "age_group": "string" }

// Response
{ "content": "resposta final", "tag": "intent_tag", "confidence": 0.92 }
```

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
{ "status": "ok", "openai": true, "rag_indexed": true, "rag_chunks": 4689 }
```

### Fluxo interno (`/search`)

1. `processar_texto(topic)` → modelo attention classifica intenção → retorna tag + confiança
2. Se confiança ≥ 0.49 e margem ≥ 0.15: busca resposta base no `intents.json` (primeiro response disponível)
3. RAG recupera trechos relevantes dos PDFs via cosine similarity (numpy)
4. GPT-4o gera resposta final usando RAG + resposta base como contexto

## Frontend — Estado atual

**Rodar**: `cd Frontend && npm install && npm run dev` (porta 3000)

### Arquivos de integração

| Arquivo | Função | Backend |
|---------|--------|---------|
| `utils/api.ts` → `buscarRespostaChat()` | Chat do assistente | `POST /search` |
| `utils/api.ts` → `adaptarAtividade()` | Adaptação de atividade | `POST /adapt` |
| `utils/api.ts` → `sugerirPEI()` | Sugestões de PEI | `POST /suggest-pei` |

### Login

`app/login/page.tsx` — form com email/senha, redireciona para `/dashboard` sem validação real (mock aceitável por enquanto).

### Dados mockados

`app/mock/data.ts` — Interface `Aluno`: `id, nome, diagnostico, cid, serie, idade, observacoes, adaptacoesPreferidas`

**Alunos de exemplo**: João Silva (TEA), Maria Santos (TDAH), Pedro Oliveira (Dislexia), Ana Costa (Asperger)

> Nota: campo `nivelSuporte` removido do sistema a pedido da equipe. O sistema não expõe nem utiliza níveis de suporte do TEA.

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
- `apiv2.py`: todos os 3 endpoints usam RAG context + GPT-4o
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

### 🔲 Fase 4 — Avatar ElevenLabs (pendente)
- TTS ElevenLabs para gerar áudio das respostas
- Avatar atual: vídeos pré-gravados (aguardando.mp4, pensando.mp4, comunicando.mp4)
- Lip sync simples: loop do comunicando.mp4 enquanto áudio toca

### 🔲 Fase 5 — Deploy VPS (pendente)
- Docker Compose: backend + frontend
- Nginx reverse proxy + Let's Encrypt HTTPS

## Como rodar o RAG

```powershell
# 1. Instalar dependências
cd Backend
pip install -r requirements.txt

# 2. Definir variável de ambiente (Windows PowerShell)
$env:OPENAI_API_KEY = "sk-..."

# 3. Indexar documentos (rodar UMA vez; sem --keep para re-indexar do zero)
cd src
python ingest.py

# 4. Subir o backend
python apiv2.py

# 5. Verificar status do RAG
Invoke-RestMethod http://localhost:5022/health
```

## Variáveis de ambiente (Backend)

```
OPENAI_API_KEY=sk-...      # obrigatório para RAG + geração (suporta OpenRouter via OPENAI_BASE_URL)
OPENAI_BASE_URL=...        # opcional: endpoint alternativo (ex: https://openrouter.ai/api/v1)
GOOGLE_API_KEY=...         # Gemini (mantido como fallback, desabilitado por padrão)
USE_LLM=True               # habilita Gemini como fallback
PORT=5022
```

## Notas importantes

- O modelo NLU (`model.pth`) usa arquitetura **attention** (não LSTM) — ver `nlu.py`: `model_name = 'attention'`
- RAG usa **numpy puro** (sem ChromaDB) — vetores em `rag_store/embeddings.npy`, metadados em `rag_store/chunks.json`
- GloVe (inglês) usado no NLU; palavras em português recebem embedding aleatório — limitação conhecida, modelo ainda treinou bem
- O frontend usa **Framer Motion** para animações e **react-hook-form + zod** no PEI editor
- CORS habilitado no backend (`flask-cors`)
- `api.py` (raiz do Backend/src) é a versão v1, não usar

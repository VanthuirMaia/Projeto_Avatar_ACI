# AvaTEA — Assistente Educacional para Inclusão

Sistema de apoio pedagógico com avatar inteligente, desenvolvido como atividade de Mestrado em Aplicações em Computação Inteligente (ACI) na UPE.

Auxilia professores do ensino básico a adaptar atividades e elaborar PEIs para alunos com TEA, TDAH, Dislexia e outras necessidades educacionais especiais.

## Arquitetura

```
Projeto_ACI/
├── Backend/              # Flask API — Python
│   ├── src/
│   │   ├── apiv2.py      # API ativa (porta 5022)
│   │   ├── nlu.py        # classificador de intenção (attention)
│   │   ├── rag.py        # RAG com numpy + OpenAI embeddings
│   │   ├── ingest.py     # indexação dos PDFs
│   │   └── utils2.py     # tokenização e helpers NLU
│   └── data/
│       ├── intents.json  # base de conhecimento TEA/inclusão
│       └── rag_store/    # índice vetorial (gerado pelo ingest.py)
│
├── Frontend/             # Next.js — TypeScript
│   └── app/
│       ├── (dashboard)/
│       │   ├── assistant/          # chat com assistente IA
│       │   ├── activity-adaptation/ # adaptação de atividades
│       │   └── pei-editor/         # editor de PEI
│       ├── mock/data.ts            # dados de alunos de exemplo
│       └── utils/api.ts            # chamadas ao backend
│
├── docs_RAG_TEA/         # 18 PDFs de literatura especializada
├── videos/               # assets do avatar (aguardando/pensando/comunicando)
└── index.html            # protótipo inicial do avatar (legado)
```

## Como rodar

### Pré-requisitos

- Python 3.10+ com `.venv` ativado
- Node.js 18+
- Chave de API OpenAI (ou OpenRouter com `OPENAI_BASE_URL`)

### Backend

```bash
cd Backend

# 1. Instalar dependências
pip install -r requirements.txt

# 2. Configurar variáveis de ambiente (Windows)
$env:OPENAI_API_KEY = "sk-..."

# 3. Indexar documentos RAG (rodar uma vez)
cd src
python ingest.py

# 4. Subir a API
python apiv2.py
# → http://localhost:5022
```

### Frontend

```bash
cd Frontend
npm install
npm run dev
# → http://localhost:3000
```

## Endpoints da API

### `POST /search`
Chat com o assistente — responde perguntas pedagógicas sobre inclusão.

```json
{ "topic": "Como adaptar atividades para alunos com TEA?", "age_group": "6 a 10 anos" }
```

### `POST /adapt`
Adapta um texto de atividade para o perfil de um aluno específico.

```json
{
  "texto_original": "Leia e responda...",
  "diagnostico": "TEA",
  "serie": "5º Ano",
  "observacoes": "Prefere atividades estruturadas",
  "adaptacoes_preferidas": ["Linguagem simplificada", "Recursos visuais"],
  "age_group": "6 a 10 anos"
}
```

### `POST /suggest-pei`
Gera sugestões de PEI (objetivos, estratégias, recursos, avaliações).

```json
{ "diagnostico": "TEA", "serie": "5º Ano", "observacoes": "...", "age_group": "6 a 10 anos" }
```

### `GET /health`
Status do servidor e do índice RAG.

## Fluxo interno da API

1. **NLU** — classifica a intenção da pergunta (modelo attention treinado com `intents.json`)
2. **RAG** — recupera trechos relevantes dos 18 PDFs via similaridade de cosseno (numpy + `text-embedding-3-small`)
3. **GPT-4o** — gera resposta final contextualizada com o RAG + perfil do aluno

## Status das fases

| Fase | Descrição | Status |
|------|-----------|--------|
| 1 | Integração frontend ↔ backend | ✅ Concluída |
| 2 | Retreinamento NLU com conteúdo TEA | ✅ Concluída |
| 3 | RAG com OpenAI (numpy vector store) | ✅ Concluída |
| 4 | Avatar ElevenLabs + lip sync | 🔲 Pendente |
| 5 | Deploy VPS (Docker + Nginx) | 🔲 Pendente |

## Equipe

- **João** — backend Flask + NLU (base)
- **Ana** — frontend Next.js (base)
- **Vanthuir** — integração, RAG, regra de negócio, retreinamento NLU

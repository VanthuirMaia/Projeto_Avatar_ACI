# AvaTEA — Frontend

Interface Next.js do sistema AvaTEA: assistente pedagógico com avatar animado para professores do AEE.

## Stack

| Componente | Tecnologia |
|---|---|
| Framework | Next.js 16 + React 19 (App Router) |
| Estilo | Tailwind CSS v3 |
| Animações | Framer Motion |
| Formulários | react-hook-form + zod |
| Markdown | react-markdown + remark-gfm |
| Monitoramento | @sentry/nextjs |
| Auth | JWT em localStorage + `AuthGuard` com validação de expiração |

## Rodar localmente

```bash
cd Frontend
npm install
npm run dev
# → http://localhost:3000
```

**Variáveis de ambiente — `Frontend/.env.local`:**
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5022

# Sentry — deixar vazio para desabilitar (ex: desenvolvimento)
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
```

## Páginas

| Rota | Descrição |
|---|---|
| `/login` | Autenticação real via `POST /auth/login` |
| `/register` | Cadastro — status `pendente` até aprovação pelo admin |
| `/dashboard` | Visão geral |
| `/assistant` | Chat com a Lorna + Avatar animado + histórico de sessões |
| `/activity-adaptation` | Adaptação de atividades pedagógicas |
| `/pei-editor` | Editor de PEI com sugestões IA |
| `/students` | Gestão de alunos |
| `/students/[id]` | Perfil individual do aluno |

## Avatar (Lorna)

`app/components/AvatarPlayer.tsx` — moldura circular com gradiente, crossfade entre vídeos.

- **Estados:** `aguardando` → `pensando` (fetch) → `comunicando` (áudio) → `aguardando`
- **Áudio:** ElevenLabs MP3 base64 decodificado no browser via `new Audio()`
- **Sem fallback Web Speech API** — se ElevenLabs falhar, avatar retorna silenciosamente a `aguardando`; professor lê a resposta no chat

## Proteção de rotas

`AuthGuard.tsx` — envolve todas as rotas do grupo `(dashboard)`:
- Verifica `avatartea_token` no `localStorage`
- Decodifica o JWT e valida o campo `exp` — redireciona para `/login` se expirado
- Remove token inválido automaticamente

## Chamadas ao backend (`app/utils/api.ts`)

Todas as funções usam `fetchComTimeout` com **timeout de 45s** e suporte a `AbortSignal`.

| Função | Endpoint |
|---|---|
| `buscarRespostaChat()` | `POST /search` |
| `adaptarAtividade()` | `POST /adapt` |
| `sugerirPEI()` | `POST /suggest-pei` |

## Monitoramento (Sentry)

Configurado em `instrumentation.ts` (server) e `instrumentation-client.ts` (browser).
Ativo apenas quando `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` estão definidos.
Erros de autoplay e aborto de fetch são ignorados (não são bugs do app).

## Build Docker

```bash
# A partir da raiz do projeto
docker compose -f docker-compose.prod.yml up --build
```

O `next.config.ts` usa `output: 'standalone'` — obrigatório para o build multistage.

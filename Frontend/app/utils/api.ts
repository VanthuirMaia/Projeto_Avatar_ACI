import type { Aluno } from "../mock/data";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:5022";

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("avatartea_token") : null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

const REQUEST_TIMEOUT_MS = 45_000;

function fetchComTimeout(url: string, options: RequestInit, signal?: AbortSignal): Promise<Response> {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  // Propaga abort externo (ex: navegação do usuário)
  signal?.addEventListener("abort", () => controller.abort());

  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(tid));
}

export interface SugestoesPEI {
  objetivos: string[];
  estrategias: string[];
  recursos: string[];
  avaliacoes: string[];
}

function idadeParaFaixaEtaria(idade: number): string {
  if (idade < 6) return "menor de 6 anos";
  if (idade <= 10) return "6 a 10 anos";
  if (idade <= 14) return "11 a 14 anos";
  return "acima de 15 anos";
}

export interface RespostaChat {
  content: string;
  audio_base64: string | null;
}

export async function buscarRespostaChat(
  topic: string,
  ageGroup = "geral",
  aluno?: Aluno,
  signal?: AbortSignal,
): Promise<RespostaChat> {
  const body: Record<string, unknown> = {
    topic,
    age_group: aluno ? idadeParaFaixaEtaria(aluno.idade) : ageGroup,
  };

  if (aluno) {
    body.aluno_context = {
      nome: aluno.nome,
      serie: aluno.serie,
      idade: aluno.idade,
      observacoes: aluno.processosCognitivos ?? "",
      adaptacoes_preferidas: aluno.adaptacoesSugeridas ?? [],
    };
  }

  const res = await fetchComTimeout(
    `${BACKEND_URL}/search`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    signal,
  );

  if (!res.ok) throw new Error(`Erro ao chamar o backend: ${res.status}`);
  const data = await res.json();
  return { content: data.content as string, audio_base64: data.audio_base64 ?? null };
}

export async function adaptarAtividade(
  textoOriginal: string,
  aluno: Aluno,
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetchComTimeout(
    `${BACKEND_URL}/adapt`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        texto_original: textoOriginal,
        diagnostico: aluno.diagnostico ?? "",
        serie: aluno.serie,
        observacoes: aluno.processosCognitivos ?? "",
        adaptacoes_preferidas: aluno.adaptacoesSugeridas ?? [],
        age_group: idadeParaFaixaEtaria(aluno.idade),
      }),
    },
    signal,
  );

  if (!res.ok) throw new Error(`Erro ao adaptar atividade: ${res.status}`);
  const data = await res.json();
  return data.texto_adaptado as string;
}

export interface PEIPayload {
  aluno_id?:   string;
  objetivos:   string[];
  estrategias: string[];
  recursos:    string[];
  avaliacoes:  string[];
  updated_at?: string;
}

// ── Alunos ────────────────────────────────────────────────────────────────────

export async function listarAlunos(): Promise<Aluno[]> {
  const res = await fetchComTimeout(`${BACKEND_URL}/alunos`, { method: "GET", headers: authHeaders() });
  if (!res.ok) throw new Error(`Erro ao listar alunos: ${res.status}`);
  const data = await res.json();
  return data.alunos as Aluno[];
}

export async function criarAluno(dados: Omit<Aluno, "id"> & { id?: string }): Promise<Aluno> {
  const res = await fetchComTimeout(
    `${BACKEND_URL}/alunos`,
    { method: "POST", headers: authHeaders(), body: JSON.stringify(dados) },
  );
  if (!res.ok) throw new Error(`Erro ao criar aluno: ${res.status}`);
  return res.json() as Promise<Aluno>;
}

export async function editarAluno(id: string, dados: Partial<Omit<Aluno, "id">>): Promise<Aluno> {
  const res = await fetchComTimeout(
    `${BACKEND_URL}/alunos/${id}`,
    { method: "PATCH", headers: authHeaders(), body: JSON.stringify(dados) },
  );
  if (!res.ok) throw new Error(`Erro ao editar aluno: ${res.status}`);
  return res.json() as Promise<Aluno>;
}

export async function removerAluno(id: string): Promise<void> {
  const res = await fetchComTimeout(
    `${BACKEND_URL}/alunos/${id}`,
    { method: "DELETE", headers: authHeaders() },
  );
  if (!res.ok) throw new Error(`Erro ao remover aluno: ${res.status}`);
}

// ── PEIs ──────────────────────────────────────────────────────────────────────
export async function listarPEIs(): Promise<PEIPayload[]> {
  const res = await fetchComTimeout(`${BACKEND_URL}/pei`, { method: "GET", headers: authHeaders() });
  if (!res.ok) throw new Error(`Erro ao listar PEIs: ${res.status}`);
  return res.json() as Promise<PEIPayload[]>;
}

export async function deletarPEI(alunoId: string): Promise<void> {
  const res = await fetchComTimeout(
    `${BACKEND_URL}/pei/${alunoId}`,
    { method: "DELETE", headers: authHeaders() },
  );
  if (!res.ok) throw new Error(`Erro ao deletar PEI: ${res.status}`);
}

export async function salvarPEI(alunoId: string, data: Omit<PEIPayload, "updated_at">): Promise<void> {
  const res = await fetchComTimeout(
    `${BACKEND_URL}/pei`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ aluno_id: alunoId, ...data }),
    },
  );
  if (!res.ok) throw new Error(`Erro ao salvar PEI: ${res.status}`);
}

export async function carregarPEI(alunoId: string, signal?: AbortSignal): Promise<PEIPayload | null> {
  const res = await fetchComTimeout(
    `${BACKEND_URL}/pei/${alunoId}`,
    { method: "GET", headers: authHeaders() },
    signal,
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Erro ao carregar PEI: ${res.status}`);
  return res.json() as Promise<PEIPayload>;
}

// ── Admin ──────────────────────────────────────────────────────────────────────
export interface AdminStats {
  periodo_dias: number;
  total_requests: number;
  aviso?: string;
  por_endpoint?: { "/search": number; "/adapt": number; "/suggest-pei": number };
  uso_pedagogico?: {
    intents_mais_usados: { tag: string; count: number }[];
    perguntas_com_aluno_ativo: number;
    distribuicao_faixa_etaria: Record<string, number>;
  };
  qualidade_nlu?: {
    confianca_media: number | null;
    perguntas_fora_escopo: number;
    taxa_offtopic_pct: number;
  };
  saude_sistema?: {
    tempo_medio_resposta_ms: number;
    tempo_maximo_resposta_ms: number;
    erros_openai: number;
    erros_elevenlabs: number;
    tipos_de_erro: Record<string, number>;
  };
  adocao?: {
    usuarios_unicos_hash: number;
    perguntas_por_dia: Record<string, number>;
  };
}

export interface AdminUser {
  id: string;
  nome: string;
  email: string;
  status: "aprovado" | "pendente" | "bloqueado";
  role: "professor" | "coordenador";
  criado_em: string;
}

function adminHeaders(key: string): Record<string, string> {
  return { "Content-Type": "application/json", "X-Admin-Key": key };
}

export async function buscarAdminStats(adminKey: string, days = 30): Promise<AdminStats> {
  const res = await fetchComTimeout(
    `${BACKEND_URL}/admin/stats?days=${days}`,
    { method: "GET", headers: adminHeaders(adminKey) },
  );
  if (!res.ok) throw new Error(`Erro ao buscar stats: ${res.status}`);
  return res.json() as Promise<AdminStats>;
}

export async function listarAdminUsuarios(adminKey: string): Promise<AdminUser[]> {
  const res = await fetchComTimeout(
    `${BACKEND_URL}/auth/admin/users`,
    { method: "GET", headers: adminHeaders(adminKey) },
  );
  if (!res.ok) throw new Error(`Erro ao listar usuários: ${res.status}`);
  const data = await res.json();
  return data.users as AdminUser[];
}

export async function atualizarStatusUsuario(
  adminKey: string,
  userId: string,
  status: "aprovado" | "bloqueado",
): Promise<void> {
  const res = await fetchComTimeout(
    `${BACKEND_URL}/auth/admin/users/${userId}`,
    { method: "PATCH", headers: adminHeaders(adminKey), body: JSON.stringify({ status }) },
  );
  if (!res.ok) throw new Error(`Erro ao atualizar usuário: ${res.status}`);
}

// ── Coordinator / Observabilidade ─────────────────────────────────────────────

export interface ProfessorResumo {
  id: string;
  nome: string;
  email: string;
  role: string;
  status: string;
  criado_em: string;
  total_alunos: number;
  total_peis: number;
  total_eventos: number;
  dias_ativos: number;
  ultima_atividade: string | null;
  por_acao: Record<string, number>;
}

export interface MetricasProfessor {
  user_id: string;
  periodo_dias: number;
  total_alunos: number;
  total_peis: number;
  audit: {
    total_eventos: number;
    por_acao: Record<string, number>;
    dias_ativos: number;
    ultima_atividade: string | null;
  };
}

export interface AtividadeItem {
  ts: string;
  user_id: string;
  user_nome: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, unknown>;
}

export async function listarProfessores(days = 30): Promise<ProfessorResumo[]> {
  const res = await fetchComTimeout(
    `${BACKEND_URL}/coordinator/users?days=${days}`,
    { method: "GET", headers: authHeaders() },
  );
  if (!res.ok) throw new Error(`Erro ao listar professores: ${res.status}`);
  const data = await res.json();
  return data.users as ProfessorResumo[];
}

export async function buscarMetricasProfessor(userId: string, days = 30, adminKey?: string): Promise<MetricasProfessor> {
  const res = await fetchComTimeout(
    `${BACKEND_URL}/coordinator/users/${userId}/metrics?days=${days}`,
    { method: "GET", headers: adminKey ? adminHeaders(adminKey) : authHeaders() },
  );
  if (!res.ok) throw new Error(`Erro ao buscar métricas: ${res.status}`);
  return res.json() as Promise<MetricasProfessor>;
}

export async function buscarAtividadeProfessor(userId: string, limit = 50, adminKey?: string): Promise<AtividadeItem[]> {
  const res = await fetchComTimeout(
    `${BACKEND_URL}/coordinator/users/${userId}/activity?limit=${limit}`,
    { method: "GET", headers: adminKey ? adminHeaders(adminKey) : authHeaders() },
  );
  if (!res.ok) throw new Error(`Erro ao buscar atividade: ${res.status}`);
  const data = await res.json();
  return data.activity as AtividadeItem[];
}

export async function sugerirPEI(aluno: Aluno, signal?: AbortSignal): Promise<SugestoesPEI> {
  const res = await fetchComTimeout(
    `${BACKEND_URL}/suggest-pei`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        diagnostico: aluno.diagnostico ?? "",
        serie: aluno.serie,
        observacoes: aluno.processosCognitivos ?? "",
        age_group: idadeParaFaixaEtaria(aluno.idade),
      }),
    },
    signal,
  );

  if (!res.ok) throw new Error(`Erro ao buscar sugestões de PEI: ${res.status}`);
  return res.json() as Promise<SugestoesPEI>;
}

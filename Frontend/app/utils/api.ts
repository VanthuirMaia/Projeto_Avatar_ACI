import type { Aluno } from "../mock/data";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:5022";

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
): Promise<RespostaChat> {
  const res = await fetch(`${BACKEND_URL}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, age_group: ageGroup }),
  });

  if (!res.ok) throw new Error(`Erro ao chamar o backend: ${res.status}`);
  const data = await res.json();
  return { content: data.content as string, audio_base64: data.audio_base64 ?? null };
}

export async function adaptarAtividade(
  textoOriginal: string,
  aluno: Aluno,
): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/adapt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      texto_original: textoOriginal,
      diagnostico: aluno.diagnostico,
      serie: aluno.serie,
      observacoes: aluno.observacoes ?? "",
      adaptacoes_preferidas: aluno.adaptacoesPreferidas ?? [],
      age_group: idadeParaFaixaEtaria(aluno.idade),
    }),
  });

  if (!res.ok) throw new Error(`Erro ao adaptar atividade: ${res.status}`);
  const data = await res.json();
  return data.texto_adaptado as string;
}

export async function sugerirPEI(aluno: Aluno): Promise<SugestoesPEI> {
  const res = await fetch(`${BACKEND_URL}/suggest-pei`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      diagnostico: aluno.diagnostico,
      serie: aluno.serie,
      observacoes: aluno.observacoes ?? "",
      age_group: idadeParaFaixaEtaria(aluno.idade),
    }),
  });

  if (!res.ok) throw new Error(`Erro ao buscar sugestões de PEI: ${res.status}`);
  return res.json() as Promise<SugestoesPEI>;
}

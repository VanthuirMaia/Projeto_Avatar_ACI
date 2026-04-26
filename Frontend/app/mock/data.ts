export interface Aluno {
  id: string;
  nome: string;
  foto?: string;
  diagnostico: string;
  cid?: string;
  serie: string;
  idade: number;
  observacoes?: string;
  adaptacoesPreferidas?: string[];
}

export interface AtividadeAdaptada {
  id: string;
  alunoId: string;
  alunoNome: string;
  titulo: string;
  textoOriginal: string;
  textoAdaptado: string;
  data: Date;
  tipoAdaptacao: string[];
}

export interface PEI {
  id: string;
  alunoId: string;
  alunoNome: string;
  objetivos: string[];
  estrategias: string[];
  recursos: string[];
  avaliacoes: string[];
  ultimaAtualizacao: Date;
}

export const mockAlunos: Aluno[] = [
  {
    id: "1",
    nome: "João Silva",
    diagnostico: "TEA",
    cid: "F84.0",
    serie: "5º Ano",
    idade: 11,
    observacoes:
      "João tem excelente memória visual. Prefere atividades estruturadas com começo, meio e fim bem definidos.",
    adaptacoesPreferidas: [
      "Linguagem simplificada",
      "Recursos visuais",
      "Tempo estendido",
    ],
  },
  {
    id: "2",
    nome: "Maria Santos",
    diagnostico: "TDAH",
    cid: "F90.0",
    serie: "4º Ano",
    idade: 10,
    observacoes:
      "Maria se beneficia de pausas regulares durante atividades longas. Responde bem a reforço positivo imediato.",
    adaptacoesPreferidas: [
      "Atividades curtas",
      "Elementos interativos",
      "Checklist visual",
    ],
  },
  {
    id: "3",
    nome: "Pedro Oliveira",
    diagnostico: "Dislexia",
    cid: "F81.0",
    serie: "6º Ano",
    idade: 12,
    observacoes:
      "Pedro tem dificuldade com textos longos e palavras complexas. Usa fonte OpenDyslexic em casa.",
    adaptacoesPreferidas: [
      "Fonte adaptada",
      "Espaçamento aumentado",
      "Áudio disponível",
    ],
  },
  {
    id: "4",
    nome: "Ana Costa",
    diagnostico: "Síndrome de Asperger",
    cid: "F84.5",
    serie: "7º Ano",
    idade: 13,
    observacoes:
      "Ana tem interesse especial em ciências. Pode precisar de apoio em atividades que exigem interpretação de expressões faciais ou linguagem figurada.",
    adaptacoesPreferidas: [
      "Instruções explícitas",
      "Exemplos concretos",
      "Estrutura previsível",
    ],
  },
];

export const mockAtividades: AtividadeAdaptada[] = [
  {
    id: "a1",
    alunoId: "1",
    alunoNome: "João Silva",
    titulo: "Interpretação de Texto - Fábulas",
    textoOriginal:
      "Leia a fábula 'A Cigarra e a Formiga' e responda: Qual a moral da história? O que você faria se fosse a formiga?",
    textoAdaptado:
      "**PASSO 1:** Leia a fábula 'A Cigarra e a Formiga'\n\n**PASSO 2:** Responda:\n• O que a história ensina?\n• Se você fosse a formiga, você ajudaria a cigarra?\n\n**DICA:** Pense no que aconteceu no final da história.",
    data: new Date(2026, 3, 10),
    tipoAdaptacao: [
      "Linguagem simplificada",
      "Estrutura em passos",
      "Negrito para destaque",
    ],
  },
  {
    id: "a2",
    alunoId: "2",
    alunoNome: "Maria Santos",
    titulo: "Problemas de Matemática",
    textoOriginal:
      "Resolva os seguintes problemas matemáticos envolvendo frações e mostre todo o seu raciocínio.",
    textoAdaptado:
      "✓ **Problema 1:** [escrever primeiro problema aqui]\n   ☐ Leia o problema\n   ☐ Faça o cálculo\n   ☐ Confira sua resposta\n\n⏱️ **Pausa de 2 minutos**\n\n✓ **Problema 2:** [escrever segundo problema aqui]\n   ☐ Leia o problema\n   ☐ Faça o cálculo\n   ☐ Confira sua resposta",
    data: new Date(2026, 3, 12),
    tipoAdaptacao: ["Checklist", "Pausas programadas", "Um problema por vez"],
  },
];

export const mockPEIs: PEI[] = [
  {
    id: "p1",
    alunoId: "1",
    alunoNome: "João Silva",
    objetivos: [
      "Desenvolver habilidades de interação social em grupo pequeno",
      "Ampliar repertório de vocabulário emocional",
      "Aprimorar interpretação de textos literários",
    ],
    estrategias: [
      "Uso de apoios visuais (cartões com emoções)",
      "Atividades estruturadas com início, meio e fim claros",
      "Tempo adicional para processamento de informações",
    ],
    recursos: [
      "Cronograma visual diário",
      "Fones de ouvido com cancelamento de ruído",
      "Espaço tranquilo para autorregulação",
    ],
    avaliacoes: [
      "Observação diária da interação social",
      "Portfólio de produções escritas",
      "Registro fotográfico de atividades",
    ],
    ultimaAtualizacao: new Date(2026, 2, 15),
  },
];

export const mockMensagensChat = [
  {
    id: "m1",
    tipo: "user" as const,
    conteudo:
      "Como posso adaptar uma atividade de interpretação de texto para um aluno com TDAH?",
    hora: "14:23",
  },
  {
    id: "m2",
    tipo: "assistant" as const,
    conteudo:
      "Ótima pergunta! Para alunos com TDAH, recomendo estas estratégias:\n\n**1. Divida o texto em seções menores**\nAo invés de apresentar o texto completo, quebre em 2-3 partes com pausas entre elas.\n\n**2. Use elementos visuais**\n• Destaque palavras-chave em negrito\n• Use marcadores e listas\n• Adicione ícones ou imagens\n\n**3. Crie checkpoints**\nColoque perguntas curtas após cada seção para manter o engajamento.\n\n**4. Limite o tempo de cada atividade**\nSessões de 10-15 minutos com pausas funcionam melhor.\n\nGostaria que eu adaptasse um texto específico para você?",
    hora: "14:24",
  },
];

export const perguntasRapidas = [
  "Como adaptar atividades para alunos com TEA?",
  "Estratégias para TDAH em sala",
  "Recursos visuais para Dislexia",
  "Exemplo de objetivo de PEI",
  "Como estruturar atividades?",
];

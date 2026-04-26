export const adaptarTexto = (
  textoOriginal: string,
  diagnostico: string,
): string => {
  let textoAdaptado = textoOriginal;

  if (diagnostico.toLowerCase().includes("autismo")) {
    textoAdaptado = `**INSTRUÇÕES CLARAS:**\n\n${textoOriginal}\n\n**LEMBRE-SE:**\n• Leia com atenção\n• Faça uma coisa por vez\n• Peça ajuda se precisar`;
  } else if (diagnostico.toLowerCase().includes("tdah")) {
    const partes = textoOriginal.split(". ");
    textoAdaptado = partes
      .map((parte, i) => `☐ **${i + 1}.** ${parte}`)
      .join("\n\n⏱️ *Pausa*\n\n");
  } else if (diagnostico.toLowerCase().includes("dislexia")) {
    textoAdaptado = textoOriginal
      .replace(/\b(\w{8,})\b/g, "$1")
      .split(". ")
      .join(".\n\n");
    textoAdaptado = `${textoAdaptado}\n\n📖 **DICA:** Leia em voz alta se preferir`;
  }

  return textoAdaptado;
};

export const gerarRespostaChat = async (
  pergunta: string,
): Promise<string> => {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const perguntaLower = pergunta.toLowerCase();

  if (perguntaLower.includes("autismo")) {
    return `Para alunos com Autismo, recomendo:\n\n**Estrutura e Previsibilidade**\n• Use rotinas consistentes\n• Forneça avisos antes de transições\n• Crie cronogramas visuais\n\n**Comunicação Clara**\n• Linguagem direta e objetiva\n• Evite metáforas e sarcasmo\n• Use apoios visuais\n\n**Ambiente**\n• Minimize estímulos sensoriais excessivos\n• Ofereça espaço para autorregulação\n• Permita uso de fones de ouvido\n\nPosso ajudar com algo mais específico?`;
  }

  if (perguntaLower.includes("tdah")) {
    return `Estratégias para TDAH em sala de aula:\n\n**Atenção e Foco**\n✓ Atividades curtas (10-15 min)\n✓ Intervalos entre tarefas\n✓ Elimine distrações visuais\n\n**Organização**\n✓ Checklists visuais\n✓ Cronômetros visíveis\n✓ Lembretes escritos no quadro\n\n**Movimento**\n✓ Permita mudanças de posição\n✓ Inclua atividades físicas curtas\n✓ Use objetos fidget discretos\n\n**Reforço Positivo**\n✓ Feedback imediato\n✓ Sistema de pontos/recompensas\n✓ Celebre pequenas conquistas\n\nQual aspecto você gostaria de explorar mais?`;
  }

  if (perguntaLower.includes("dislexia")) {
    return `Recursos e estratégias para Dislexia:\n\n**Formatação de Texto**\n• Fonte sans-serif (Arial, Verdana) ou OpenDyslexic\n• Tamanho mínimo 12-14pt\n• Espaçamento entre linhas 1.5 ou 2.0\n• Evite itálico e sublinhado\n\n**Recursos Visuais**\n📖 Régua de leitura colorida\n🎨 Papel colorido (creme, azul claro)\n🔤 Palavras-chave destacadas\n\n**Apoios Multissensoriais**\n🎧 Textos em áudio\n✍️ Permita respostas orais\n💻 Software de leitura em voz alta\n\n**Tempo e Avaliação**\n⏰ Tempo adicional para leitura\n📝 Provas orais como alternativa\n✅ Avalie compreensão, não ortografia\n\nPrecisa de uma adaptação específica?`;
  }

  if (perguntaLower.includes("pei") || perguntaLower.includes("objetivo")) {
    return `Vou ajudar com objetivos de PEI. Eles devem ser **SMART**:\n\n**S**pecífico - Claro e detalhado\n**M**ensurável - Você pode medir o progresso\n**A**lcançável - Realista para o aluno\n**R**elevante - Importante para o desenvolvimento\n**T**emporal - Tem prazo definido\n\n**Exemplos de objetivos bem escritos:**\n\n✓ "Até junho, João participará de 3 conversas em grupo por semana, usando 5+ turnos de fala"\n\n✓ "Em 3 meses, Maria completará 80% das tarefas de matemática com até 2 lembretes verbais"\n\n✓ "Até o fim do semestre, Pedro lerá textos de 200 palavras com 90% de precisão"\n\nQuer que eu ajude a escrever um objetivo para um aluno específico?`;
  }

  return `Entendi sua pergunta sobre "${pergunta}".\n\nComo assistente educacional especializada em educação inclusiva, posso ajudar com:\n\n• **Adaptações de atividades** para diferentes diagnósticos\n• **Estratégias pedagógicas** específicas\n• **Elaboração de PEIs** estruturados\n• **Recursos e materiais** adaptados\n• **Orientações sobre acessibilidade** em sala\n\nPoderia reformular sua pergunta ou me dar mais detalhes sobre o que precisa?`;
};

export const sugerirObjetivoPEI = (
  diagnostico: string,
  serie: string,
): string[] => {
  const objetivos = [
    `Ampliar participação em atividades coletivas de ${serie}`,
    `Desenvolver autonomia em tarefas acadêmicas de ${serie}`,
    `Aprimorar habilidades de comunicação em contexto escolar`,
  ];

  if (diagnostico.toLowerCase().includes("autismo")) {
    objetivos.push(
      "Utilizar estratégias de autorregulação sensorial em 80% das situações de desconforto",
      "Reconhecer e nomear 10 emoções básicas em si mesmo e nos outros",
    );
  }

  if (diagnostico.toLowerCase().includes("tdah")) {
    objetivos.push(
      "Concluir atividades em tempo adequado com até 2 redirecionamentos",
      "Utilizar checklist para organização de material escolar diariamente",
    );
  }

  if (diagnostico.toLowerCase().includes("dislexia")) {
    objetivos.push(
      "Ler textos apropriados para série com 85% de precisão usando recursos de apoio",
      "Utilizar estratégias de soletração com 70% de acurácia",
    );
  }

  return objetivos;
};

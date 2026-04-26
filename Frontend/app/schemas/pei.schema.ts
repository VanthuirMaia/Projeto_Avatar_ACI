import { z } from "zod";

export const peiSchema = z.object({
  alunoId: z.string().min(1, "Selecione um aluno"),

  objetivos: z
    .array(
      z.object({
        value: z.string().min(1, "Obrigatório"),
      }),
    )
    .min(1, "Adicione pelo menos um objetivo"),

  estrategias: z
    .array(
      z.object({
        value: z.string().min(5, "Mínimo 5 caracteres"),
      }),
    )
    .min(1, "Adicione pelo menos uma estratégia"),

  recursos: z
    .array(
      z.object({
        value: z.string().min(3, "Mínimo 3 caracteres"),
      }),
    )
    .min(1, "Adicione pelo menos um recurso"),

  avaliacoes: z
    .array(
      z.object({
        value: z.string().min(5, "Mínimo 5 caracteres"),
      }),
    )
    .min(1, "Adicione pelo menos uma avaliação"),
});

export type PEIFormData = z.infer<typeof peiSchema>;
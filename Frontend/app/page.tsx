import Link from "next/link";
import { mockAlunos } from "../app/mock/data";

export default function Home() {
  return (
    <div className="p-10 space-y-4">
      <h1 className="text-2xl font-bold">Edu IA</h1>
      <div className="flex flex-col gap-3">
        <Link href="/students">Alunos</Link>
        <Link href={`/students/${mockAlunos[0].id}`}>Perfil do Aluno</Link>
        <Link href="/login">Login</Link>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/assistant">Assistente</Link>
        <Link href="/adapt">Adaptar Atividade</Link>
        <Link href="/pei">Criar PEI</Link>
      </div>
    </div>
  );
}

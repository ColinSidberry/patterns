import { notFound } from 'next/navigation'
import { problemsById } from '@/data/problems/index'
import { AlgoViewer } from '@/components/AlgoViewer'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AlgoProblemPage({ params }: Props) {
  const { id } = await params
  const problem = problemsById[id]
  if (!problem) notFound()
  return <AlgoViewer problem={problem} />
}

export function generateStaticParams() {
  return Object.keys(problemsById).map((id) => ({ id }))
}

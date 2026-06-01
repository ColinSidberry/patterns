import { notFound } from 'next/navigation'
import { getPattern } from '@/data/index'
import { SequenceViewer } from '@/components/SequenceViewer/index'

interface Props {
  params: Promise<{ patternId: string }>
}

export default async function PatternPage({ params }: Props) {
  const { patternId } = await params
  const pattern = getPattern(patternId)
  if (!pattern) notFound()
  return <SequenceViewer pattern={pattern} />
}

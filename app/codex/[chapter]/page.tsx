import { CodexChapterReader } from '@/components/CodexChapterReader'

export const metadata = {
  title: 'Codex chapter',
}

export default async function CodexChapterPage({
  params,
}: {
  params: Promise<{ chapter: string }>
}) {
  const { chapter } = await params
  const slug = decodeURIComponent(chapter)
  return (
    <div className="min-h-screen bg-[#13131a] flex flex-col">
      <header className="border-b border-[#313244] bg-[#181825] sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-baseline gap-4">
          <a href="/" className="text-sm font-semibold text-[#cdd6f4] hover:text-indigo-300 transition-colors">
            Fundamentals
          </a>
          <span className="text-[#6c7086]">/</span>
          <a href="/codex" className="text-sm text-[#a6adc8] hover:text-indigo-300 transition-colors">
            Codex
          </a>
          <span className="text-[#6c7086]">/</span>
          <span className="text-sm text-[#cdd6f4] truncate">{slug}</span>
        </div>
      </header>
      <main className="flex-1 pb-32">
        <CodexChapterReader slug={slug} />
      </main>
    </div>
  )
}

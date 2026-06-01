import { CodexReader } from '@/components/CodexReader'

export const metadata = {
  title: 'Codex',
}

export default function CodexPage() {
  return (
    <div className="min-h-screen bg-[#13131a] flex flex-col">
      <header className="border-b border-[#313244] bg-[#181825]">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-baseline gap-4">
          <a href="/" className="text-base font-semibold text-[#cdd6f4] hover:text-indigo-300 transition-colors">
            Fundamentals
          </a>
          <span className="text-[#6c7086]">/</span>
          <span className="text-sm text-[#a6adc8]">Codex</span>
        </div>
      </header>
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <h1 className="text-2xl font-bold text-[#cdd6f4] mb-2">The Cadet&apos;s Codex</h1>
          <p className="text-sm text-[#6c7086] mb-8">
            Study-novel chapters rendered for on-the-go listening. Audio lives in <span className="font-mono">~/Obsidian/2. Codex/audio/</span>.
          </p>
          <CodexReader />
        </div>
      </main>
    </div>
  )
}

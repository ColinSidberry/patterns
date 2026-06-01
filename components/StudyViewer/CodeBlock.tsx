import { SyntaxHighlight } from './SyntaxHighlight'

interface Props {
  code: string
  highlightedLines?: { startLine: number; endLine: number } | null
}

export function CodeBlock({ code, highlightedLines = null }: Props) {
  return (
    <div className="rounded-lg overflow-hidden border border-[#313244] bg-[#181825]">
      <div className="px-4 py-3 font-mono text-[13px] text-[#cdd6f4]">
        <SyntaxHighlight code={code} showLineNumbers highlightedLines={highlightedLines} />
      </div>
    </div>
  )
}

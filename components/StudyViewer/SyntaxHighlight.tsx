import { tokenizeLine, TOKEN_COLORS, OPERATOR_LETTER_SPACING } from '@/lib/tokenize'

interface Props {
  code: string
  showLineNumbers?: boolean
  // 1-indexed inclusive range of lines to tint as the "active focus" in the
  // rendered code. Used by the Codex reader's companion panel to draw the
  // reader's eye to the lines being discussed in the surrounding prose.
  highlightedLines?: { startLine: number; endLine: number } | null
}

export function SyntaxHighlight({ code, showLineNumbers = false, highlightedLines = null }: Props) {
  const lines = code.split('\n')
  return (
    <>
      {lines.map((line, i) => {
        const lineNum = i + 1
        const isHighlighted =
          !!highlightedLines &&
          lineNum >= highlightedLines.startLine &&
          lineNum <= highlightedLines.endLine
        return (
          <div
            key={i}
            className={`flex transition-colors ${
              isHighlighted ? 'bg-amber-500/15' : ''
            }`}
          >
            {showLineNumbers && (
              <span
                className="select-none shrink-0 text-right pr-4 text-[#45475a]"
                style={{ width: 32, fontSize: 11, paddingTop: 2 }}
              >
                {lineNum}
              </span>
            )}
            <span className="whitespace-pre">
              {tokenizeLine(line).map((token, ti) => (
                <span
                  key={ti}
                  style={{
                    color: TOKEN_COLORS[token.type],
                    ...(token.type === 'operator' ? { letterSpacing: OPERATOR_LETTER_SPACING } : {}),
                  }}
                >
                  {token.text}
                </span>
              ))}
              {!line && ' '}
            </span>
          </div>
        )
      })}
    </>
  )
}

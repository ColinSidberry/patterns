export function AnnotatedText({ text, activeTerms }: { text: string; activeTerms: string[] }) {
  if (!activeTerms.length) return <>{text}</>
  const escaped = activeTerms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const re = new RegExp(`(${escaped.join('|')})`, 'gi')
  const parts = text.split(re)
  const termSet = new Set(activeTerms.map(t => t.toLowerCase()))
  return (
    <>
      {parts.map((part, i) =>
        termSet.has(part.toLowerCase())
          ? <mark key={i} className="bg-indigo-900/40 text-indigo-300 rounded px-0.5 not-italic">{part}</mark>
          : <span key={i}>{part}</span>
      )}
    </>
  )
}

// Shared formatter for the "copy as bundle" buttons in MyCode and the
// SolutionDebugger. Emits a structured, LLM-ready payload: the problem, the
// user's attempt, their saved notes, and the reference solution — plus an
// explicit instruction to judge the attempt on correctness and the SPIRIT of
// the approach (there are usually multiple valid designs), not on matching the
// reference solution verbatim.

import { listNotesForProblem } from './notes'

export function buildCopyTemplate(problemId: string, myCode: string, solution: string): string {
  let notesBlock = '(none saved)'
  try {
    const notes = listNotesForProblem(problemId)
    if (notes.length) {
      notesBlock = notes
        .map((n) => `### ${n.title?.trim() || '(untitled)'}\n${n.body}`)
        .join('\n\n')
    }
  } catch {
    // localStorage unavailable — fall through with default
  }

  return [
    `# Problem: ${problemId}`,
    ``,
    `## My approach / code`,
    (myCode || '').trim() || '(empty)',
    ``,
    `## My notes`,
    notesBlock,
    ``,
    `## Reference solution (ONE valid approach — not the only correct one)`,
    (solution || '').trim() || '(none)',
    ``,
    `---`,
    `Please review MY approach and code above. Judge it on correctness and the`,
    `spirit of the idea: there are usually multiple valid approaches, so do NOT`,
    `mark me wrong merely for differing from the reference solution. Call out only`,
    `real bugs, missing edge cases, or genuine gaps in reasoning. Then check`,
    `whether I can state the loop invariant — the single thing that stays true at`,
    `the top of every iteration — and, if I'm missing it, derive it by working`,
    `backwards from what my return statement needs to be true.`,
  ].join('\n')
}

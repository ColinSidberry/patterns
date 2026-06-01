// Shared formatter for the "copy as bundle" buttons in MyCode and the
// SolutionDebugger. Both buttons emit this same structured template so the
// user can paste their attempt alongside the reference solution into chat.

export function buildCopyTemplate(myCode: string, solution: string): string {
  return `## My Code\n${myCode}\n\n## Solution\n${solution}\n`
}

// AST-based statement-level instrumentation. Given a JS source string and the
// name of an entry function, returns a rewritten source where a `__snap(line,
// vars)` call is inserted after every statement in the entry function's body
// (including nested blocks). Used by the trace runner to capture per-step
// snapshots of variable state.
//
// Scope tracking:
//   - Function parameters are in scope from the first body statement.
//   - var/let/const declarations enter scope after their declaration runs;
//     subsequent siblings + nested blocks see them.
//   - For-loop init declarations are in scope inside the loop body.
//   - Each captured variable is wrapped in a try/catch to survive TDZ
//     (e.g., a let declared but not yet evaluated at this snap point).
//
// The instrumented source assumes a globally-available `__snap(line, vars)`.
// The trace worker installs that global before evaluating.

import * as acorn from 'acorn'

interface Insertion {
  offset: number
  line: number
  vars: string[]
}

// Minimal AST node shape we care about. acorn's types are loose; we use any
// internally and rely on the type guards below.
type Node = any

function isIdentifier(n: Node): boolean {
  return n?.type === 'Identifier'
}

// Walk a binding pattern (Identifier | ArrayPattern | ObjectPattern |
// AssignmentPattern | RestElement) and collect every identifier name it
// ultimately binds. Default values, rest-spreads, and nested patterns
// supported. Examples this enables:
//   const [r, c, d] = queue.shift()
//   const { x, y: alias } = pt
//   for (const [dr, dc] of directions)
//   function fn({ a, b: [c, d] }, e = 1)
function collectPatternNames(pat: Node, out: string[]): void {
  if (!pat) return
  switch (pat.type) {
    case 'Identifier':
      out.push(pat.name)
      return
    case 'AssignmentPattern':
      // `x = default` — bind the LHS pattern; default expr ignored
      collectPatternNames(pat.left, out)
      return
    case 'RestElement':
      collectPatternNames(pat.argument, out)
      return
    case 'ArrayPattern':
      for (const el of pat.elements) {
        if (el) collectPatternNames(el, out)
      }
      return
    case 'ObjectPattern':
      for (const prop of pat.properties) {
        if (prop.type === 'RestElement') {
          collectPatternNames(prop.argument, out)
        } else if (prop.type === 'Property') {
          // For shorthand `{x}` and explicit `{x: y}`, the bound identifier
          // is the `value` slot (which is an Identifier or another pattern).
          collectPatternNames(prop.value, out)
        }
      }
      return
    default:
      return
  }
}

function collectDeclaredNames(stmt: Node): string[] {
  if (stmt?.type !== 'VariableDeclaration') return []
  const out: string[] = []
  for (const d of stmt.declarations) {
    collectPatternNames(d.id, out)
  }
  return out
}

function collectParamNames(fn: Node): string[] {
  const out: string[] = []
  for (const p of fn.params) {
    collectPatternNames(p, out)
  }
  return out
}

// Generic recursive AST walk — visits every node, skipping location/range
// bookkeeping keys. Used to find inline callbacks + all declared names
// anywhere inside the entry function.
function walkAll(node: Node, visit: (n: Node) => void): void {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) {
    for (const c of node) walkAll(c, visit)
    return
  }
  if (typeof node.type === 'string') visit(node)
  for (const key in node) {
    if (key === 'type' || key === 'loc' || key === 'range' || key === 'start' || key === 'end') continue
    const child = node[key]
    if (child && typeof child === 'object') walkAll(child, visit)
  }
}

// Inline function/arrow expressions passed as call ARGUMENTS (sort/map/filter/
// reduce/forEach comparators + callbacks). Block-body only — concise arrows
// (`(a,b) => a-b`) have no statements to snap and are skipped. Named nested
// helper FunctionDeclarations are intentionally NOT collected (kept out of
// scope, per the smaller-blast-radius decision).
function collectInlineCallbacks(root: Node): Node[] {
  const out: Node[] = []
  walkAll(root, (n) => {
    if (n.type !== 'CallExpression') return
    for (const arg of n.arguments) {
      if (
        (arg.type === 'FunctionExpression' || arg.type === 'ArrowFunctionExpression') &&
        arg.body?.type === 'BlockStatement'
      ) {
        out.push(arg)
      }
    }
  })
  return out
}

// Every name bound by a var/let/const or function declaration anywhere in the
// subtree. Used to seed callback scopes generously: a callback can close over
// any outer name, and over-capturing is harmless (each capture is TDZ-guarded
// by a try/catch in renderSnap, so names not yet/never in scope just no-op).
function collectAllDeclaredNames(root: Node): string[] {
  const out: string[] = []
  walkAll(root, (n) => {
    if (n.type === 'VariableDeclaration') {
      for (const d of n.declarations) collectPatternNames(d.id, out)
    } else if (n.type === 'FunctionDeclaration' && n.id) {
      out.push(n.id.name)
    }
  })
  return out
}

export function instrumentSource(src: string, fnName: string): string {
  let ast: Node
  try {
    ast = acorn.parse(src, { ecmaVersion: 2022, locations: true, ranges: true }) as unknown as Node
  } catch (e) {
    throw new Error(`Failed to parse solution: ${(e as Error).message}`)
  }

  // Locate target function (declaration or const fnName = function/arrow).
  let target: Node | null = null
  for (const node of ast.body) {
    if (node.type === 'FunctionDeclaration' && node.id?.name === fnName) {
      target = node
      break
    }
    if (node.type === 'VariableDeclaration') {
      for (const d of node.declarations) {
        if (
          isIdentifier(d.id) &&
          d.id.name === fnName &&
          (d.init?.type === 'FunctionExpression' || d.init?.type === 'ArrowFunctionExpression')
        ) {
          target = d.init
          break
        }
      }
      if (target) break
    }
  }
  if (!target) {
    throw new Error(`Function "${fnName}" not found in source`)
  }
  if (target.body?.type !== 'BlockStatement') {
    // Concise arrow-function body — bail; not worth instrumenting.
    throw new Error(`Function "${fnName}" must have a block body to instrument`)
  }

  const insertions: Insertion[] = []

  function visitBlock(block: Node, parentScope: Set<string>): void {
    const scope = new Set(parentScope)
    for (const stmt of block.body) {
      // Recurse into nested blocks BEFORE adding this statement's
      // declarations to scope (so the recursion sees pre-declaration scope).
      visitStatement(stmt, scope)
      collectDeclaredNames(stmt).forEach((n) => scope.add(n))
      // Snap AFTER this statement runs.
      insertions.push({
        offset: stmt.end,
        line: stmt.loc.end.line,
        vars: [...scope],
      })
    }
  }

  // Inject a snap as the FIRST thing in a loop body so each iteration
  // starts with a frame showing freshly-incremented loop vars (e.g., the
  // for-loop's `fast++` runs invisibly between body statements; without
  // this snap, `fast` appears to teleport between iterations).
  function snapAtBodyStart(body: Node, scope: Set<string>): void {
    if (body?.type !== 'BlockStatement') return
    insertions.push({
      offset: body.start + 1,   // right after the `{`
      line: body.loc.start.line,
      vars: [...scope],
    })
  }

  function visitStatement(stmt: Node, scope: Set<string>): void {
    if (!stmt) return
    switch (stmt.type) {
      case 'BlockStatement':
        visitBlock(stmt, scope)
        return
      case 'IfStatement':
        if (stmt.consequent) visitStatement(stmt.consequent, scope)
        if (stmt.alternate) visitStatement(stmt.alternate, scope)
        return
      case 'WhileStatement':
      case 'DoWhileStatement':
        snapAtBodyStart(stmt.body, scope)
        visitStatement(stmt.body, scope)
        return
      case 'ForStatement': {
        const forScope = new Set(scope)
        if (stmt.init?.type === 'VariableDeclaration') {
          collectDeclaredNames(stmt.init).forEach((n) => forScope.add(n))
        }
        snapAtBodyStart(stmt.body, forScope)
        visitStatement(stmt.body, forScope)
        return
      }
      case 'ForInStatement':
      case 'ForOfStatement': {
        const forScope = new Set(scope)
        if (stmt.left?.type === 'VariableDeclaration') {
          collectDeclaredNames(stmt.left).forEach((n) => forScope.add(n))
        } else if (isIdentifier(stmt.left)) {
          forScope.add(stmt.left.name)
        }
        snapAtBodyStart(stmt.body, forScope)
        visitStatement(stmt.body, forScope)
        return
      }
      case 'TryStatement':
        if (stmt.block) visitStatement(stmt.block, scope)
        if (stmt.handler?.body) {
          const catchScope = new Set(scope)
          if (stmt.handler.param && isIdentifier(stmt.handler.param)) {
            catchScope.add(stmt.handler.param.name)
          }
          visitStatement(stmt.handler.body, catchScope)
        }
        if (stmt.finalizer) visitStatement(stmt.finalizer, scope)
        return
      case 'SwitchStatement':
        for (const c of stmt.cases) {
          for (const s of c.consequent) visitStatement(s, scope)
        }
        return
      // FunctionDeclaration nested inside the entry function: skip — we don't
      // instrument inner functions for MVP.
      case 'FunctionDeclaration':
        return
      default:
        // Expression statements, return, throw, break, continue, etc. — no
        // nested blocks to recurse into.
        return
    }
  }

  // Entry function: params are in scope from the first body statement.
  const initialScope = new Set(collectParamNames(target))
  visitBlock(target.body, initialScope)

  // Inline callbacks (sort comparators, map/filter/reduce/forEach callbacks):
  // instrument each so its body steps inline, just like the entry function.
  // Their pairwise/iteration calls are otherwise a single invisible step.
  // Scope = every name declared anywhere in the entry body (closure-visible)
  // + the callback's own params; visitBlock adds the callback's locals as it
  // walks. A body-start snap shows the params the moment we enter (mirrors the
  // loop-body-start snap), so each invocation opens with a/b visible.
  const outerScope = new Set<string>([
    ...collectParamNames(target),
    ...collectAllDeclaredNames(target.body),
  ])
  for (const cb of collectInlineCallbacks(target.body)) {
    const cbScope = new Set(outerScope)
    collectParamNames(cb).forEach((n) => cbScope.add(n))
    snapAtBodyStart(cb.body, cbScope)
    visitBlock(cb.body, cbScope)
  }

  // Append a final snap at the very end of the function body so the user
  // can see the final state right before the function returns implicitly.
  // Only include vars in scope AT THIS POINT — params + top-level body
  // declarations. Nested-block vars (loop iterators, if-block locals) are
  // out of scope here and shouldn't appear.
  const bodyEnd = target.body.end - 1  // position of the closing '}'
  const bodyLevelVars: string[] = [...initialScope]
  for (const stmt of target.body.body) {
    collectDeclaredNames(stmt).forEach((n) => bodyLevelVars.push(n))
  }
  insertions.push({
    offset: bodyEnd,
    line: target.body.loc.end.line,
    vars: bodyLevelVars,
  })

  // Apply insertions in reverse offset order to preserve earlier offsets.
  insertions.sort((a, b) => b.offset - a.offset)
  let result = src
  for (const ins of insertions) {
    const snap = renderSnap(ins.line, ins.vars)
    result = result.slice(0, ins.offset) + snap + result.slice(ins.offset)
  }
  return result
}

// Build the inserted snap call. Each var is wrapped in a try/catch to
// survive TDZ (let/const declared but not yet evaluated at this point).
function renderSnap(line: number, vars: string[]): string {
  if (vars.length === 0) {
    return `;__snap(${line},{});`
  }
  const captures = vars
    .map((v) => `try{__v.${v}=${v}}catch(e){}`)
    .join('')
  return `;(function(){var __v={};${captures}__snap(${line},__v);})();`
}

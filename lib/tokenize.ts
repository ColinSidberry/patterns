// Lightweight TypeScript tokenizer for syntax highlighting read-only code panels.
// Covers the subset used in algo solution code: keywords, types, numbers,
// operators, strings, comments, identifiers, and punctuation.

export type TokenType =
  | 'keyword'
  | 'class-keyword'   // class, constructor — distinct hue from generic keyword
  | 'class-name'      // identifier following `class X` or `new X(...)`
  | 'this'            // the `this` keyword — distinct hue
  | 'type'
  | 'number'
  | 'string'
  | 'comment'
  | 'operator'
  | 'punctuation'
  | 'identifier'
  | 'whitespace'

export interface Token {
  type: TokenType
  text: string
}

const KEYWORDS = new Set([
  'function', 'const', 'let', 'var', 'while', 'for', 'of', 'in',
  'if', 'else', 'return', 'break', 'continue', 'new', 'typeof',
  'instanceof', 'true', 'false', 'null', 'undefined',
  'do', 'switch', 'case', 'default', 'try', 'catch', 'finally', 'throw',
])

const CLASS_KEYWORDS = new Set(['class', 'constructor', 'extends', 'super', 'static'])

const BUILTIN_TYPES = new Set([
  'number', 'string', 'boolean', 'void', 'any', 'never', 'object', 'Array',
])

// Ordered longest-first so multi-char operators match before their subsets
const OPERATOR_RE = /^(===|!==|>=|<=|=>|\+\+|--|&&|\|\||[+\-*\/%<>=!&|^~])/

export function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = []
  let i = 0

  while (i < line.length) {
    // Single-line comment
    if (line[i] === '/' && line[i + 1] === '/') {
      tokens.push({ type: 'comment', text: line.slice(i) })
      break
    }

    // Quoted string (single, double, or template)
    if (line[i] === '"' || line[i] === "'" || line[i] === '`') {
      const q = line[i]
      let j = i + 1
      while (j < line.length && line[j] !== q) {
        if (line[j] === '\\') j++
        j++
      }
      tokens.push({ type: 'string', text: line.slice(i, j + 1) })
      i = j + 1
      continue
    }

    // Number (not preceded by a word char so we don't eat suffixes like `r8`)
    if (/\d/.test(line[i]) && (i === 0 || !/\w/.test(line[i - 1]))) {
      let j = i
      while (j < line.length && /[\d.]/.test(line[j])) j++
      tokens.push({ type: 'number', text: line.slice(i, j) })
      i = j
      continue
    }

    // Identifier / keyword / built-in type
    if (/[a-zA-Z_$]/.test(line[i])) {
      let j = i
      while (j < line.length && /[\w$]/.test(line[j])) j++
      const word = line.slice(i, j)
      if (word === 'this') {
        tokens.push({ type: 'this', text: word })
      } else if (CLASS_KEYWORDS.has(word)) {
        tokens.push({ type: 'class-keyword', text: word })
      } else if (KEYWORDS.has(word)) {
        tokens.push({ type: 'keyword', text: word })
      } else if (BUILTIN_TYPES.has(word)) {
        tokens.push({ type: 'type', text: word })
      } else {
        // Look back for `class` or `new` to mark this identifier as a class name.
        // Skip any whitespace tokens between.
        let prevIdx = tokens.length - 1
        while (prevIdx >= 0 && tokens[prevIdx].type === 'whitespace') prevIdx--
        const prev = prevIdx >= 0 ? tokens[prevIdx] : null
        const isClassName =
          (prev?.type === 'class-keyword' && prev.text === 'class') ||
          (prev?.type === 'keyword' && prev.text === 'new')
        tokens.push({ type: isClassName ? 'class-name' : 'identifier', text: word })
      }
      i = j
      continue
    }

    // Operator
    const opMatch = line.slice(i).match(OPERATOR_RE)
    if (opMatch) {
      tokens.push({ type: 'operator', text: opMatch[0] })
      i += opMatch[0].length
      continue
    }

    // Punctuation
    if (/[()[\]{},;.:]/.test(line[i])) {
      tokens.push({ type: 'punctuation', text: line[i] })
      i++
      continue
    }

    // Whitespace (preserve as-is so whitespace-pre works correctly)
    if (/\s/.test(line[i])) {
      let j = i
      while (j < line.length && /\s/.test(line[j])) j++
      tokens.push({ type: 'whitespace', text: line.slice(i, j) })
      i = j
      continue
    }

    // Anything else (unicode operators like × − in calc text, etc.)
    tokens.push({ type: 'identifier', text: line[i] })
    i++
  }

  return tokens
}

// Catppuccin Mocha palette — matches the existing dark panel theme
export const TOKEN_COLORS: Record<TokenType, string> = {
  keyword:       '#cba6f7',  // mauve   — function, const, while, if, return
  'class-keyword': '#f5c2e7', // pink   — class, constructor, extends, super
  'class-name':  '#f9e2af',  // yellow  — class names (after `class` or `new`)
  this:          '#f38ba8',  // red     — this
  type:          '#89dceb',  // sky     — number, string, boolean
  number:        '#fab387',  // peach   — numeric literals
  string:        '#a6e3a1',  // green   — string literals
  comment:       '#6c7086',  // muted   — // comments
  operator:      '#89dceb',  // sky     — < > = + - * ++ --
  punctuation:   '#7f849c',  // overlay — ( ) [ ] { } , . :
  identifier:    '#cdd6f4',  // text    — variables, function names
  whitespace:    'inherit',
}

// Operator letter-spacing helps `===` / `!==` / `&&` / `||` read as distinct
// glyphs instead of fused horizontal lines. Applied to operator spans in the
// renderers. Set as an explicit em value so it survives font-size changes.
export const OPERATOR_LETTER_SPACING = '0.12em'

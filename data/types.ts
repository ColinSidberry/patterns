export interface CodeLine {
  text: string
  highlight?: boolean
}

export interface Arrow {
  from: string
  to: string
  label: string
  style?: 'solid' | 'dashed'
  color?: 'default' | 'green' | 'red'
}

export interface Step {
  id: string
  label: string
  activeActors: string[]
  arrow: Arrow
  description: string
  code: {
    file: string
    startLine?: number  // 1-indexed line in the full source file where this snippet begins
    lines: CodeLine[]
  }
}

export interface SourceFile {
  name: string
  language: 'python' | 'typescript'
  content: string[]  // full file, one entry per line
}

export interface FailureMode {
  id: string
  label: string
  shortLabel: string
  brokenSteps: Step[]
  fixSteps: Step[]
}

export interface MockConfig {
  type: 'instagram-like'
  username: string
  location: string
  caption: string
  likeCount: string
  image?: string // Unsplash or any image URL
}

export interface Pattern {
  id: string
  title: string
  subtitle: string
  description: string
  mock: MockConfig
  actors: string[]
  steps: Step[]
  failureModes: FailureMode[]
  sourceFiles?: SourceFile[]
}

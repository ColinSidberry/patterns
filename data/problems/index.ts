import { AlgoProblem } from '../algo-types'
import { containerWithMostWater } from './container-with-most-water'
import { trappingRainWater } from './trapping-rain-water'
import { climbingStairs } from './climbing-stairs'
import { reverseLinkedList } from './reverse-linked-list'
import { maxDepthBinaryTree } from './max-depth-binary-tree'
import { numberOfIslands } from './number-of-islands'

export const problems: AlgoProblem[] = [
  containerWithMostWater,
  trappingRainWater,
  climbingStairs,
  reverseLinkedList,
  maxDepthBinaryTree,
  numberOfIslands,
]

export const problemsById = Object.fromEntries(problems.map((p) => [p.id, p]))

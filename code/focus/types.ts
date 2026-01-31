import type { AnyNode, SceneNode } from '@/rendering/scene'
import type { Point } from '@/form/point'

/**
 * A node that can receive focus.
 * This is any SceneNode that has focusable: true.
 */
export type FocusableNode = AnyNode & {
  focusable: true
}

/**
 * Check if a node is focusable.
 */
export function isFocusableNode(node: AnyNode): node is FocusableNode {
  return node.focusable === true
}

/**
 * Focus state for a scene.
 */
export interface FocusState {
  /** Currently focused node (null = nothing focused) */
  current: FocusableNode | null

  /** Focus history for back/forward navigation */
  history: FocusableNode[]

  /** Current position in history */
  historyIndex: number
}

/**
 * Callback for focus change events.
 */
export type FocusChangeCallback = (
  prev: FocusableNode | null,
  next: FocusableNode | null,
) => void

/**
 * Focus ring visual style options.
 */
export interface FocusRingStyle {
  /** Ring color */
  color: string

  /** Ring stroke width in pixels */
  width: number

  /** Dash pattern (empty for solid) */
  dash: number[]

  /** Whether to animate the ring */
  animated: boolean

  /** Animation speed (pulses per second) */
  pulseSpeed: number

  /** Glow effect radius (0 for no glow) */
  glowRadius: number
}

/**
 * Default focus ring style.
 */
export const DEFAULT_FOCUS_RING_STYLE: FocusRingStyle = {
  color: '#00ff88',
  width: 2,
  dash: [6, 4],
  animated: true,
  pulseSpeed: 1.5,
  glowRadius: 0,
}

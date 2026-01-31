import type { Scene, AnyNode } from '@/rendering/scene'
import type {
  FocusableNode,
  FocusState,
  FocusChangeCallback,
} from './types'
import { isFocusableNode } from './types'

/**
 * Check if a node is focusable.
 */
export function isFocusable(node: AnyNode): node is FocusableNode {
  return isFocusableNode(node)
}

/**
 * Manages focus state for a scene.
 * Provides focus/blur operations, tree navigation, and focus history.
 */
export class FocusManager {
  private scene: Scene
  private state: FocusState
  private listeners: Set<FocusChangeCallback> = new Set()
  private nodeIndex: Map<string, AnyNode> = new Map()

  constructor(scene: Scene) {
    this.scene = scene
    this.state = {
      current: null,
      history: [],
      historyIndex: -1,
    }
    this.rebuildIndex()
  }

  /**
   * Rebuild the node index for fast lookups.
   * Call this after scene structure changes.
   */
  rebuildIndex(): void {
    this.nodeIndex.clear()
    this.indexNode(this.scene.nodes)
  }

  private indexNode(nodes: AnyNode[]): void {
    for (const node of nodes) {
      this.nodeIndex.set(node.id, node)
      if (node.children.length > 0) {
        this.indexNode(node.children as AnyNode[])
      }
    }
  }

  /**
   * Update the scene reference.
   * Useful when scene is regenerated.
   */
  setScene(scene: Scene): void {
    this.scene = scene
    this.rebuildIndex()

    // Try to restore focus by ID
    if (this.state.current) {
      const restored = this.nodeIndex.get(this.state.current.id)
      if (restored && isFocusable(restored)) {
        this.state.current = restored
      } else {
        this.blur()
      }
    }
  }

  /**
   * Get the currently focused node.
   */
  getFocused(): FocusableNode | null {
    return this.state.current
  }

  /**
   * Get the ID of the currently focused node.
   */
  getFocusedId(): string | null {
    return this.state.current?.id ?? null
  }

  /**
   * Check if a specific node is focused.
   */
  isFocused(node: AnyNode): boolean {
    return this.state.current?.id === node.id
  }

  /**
   * Focus a specific node.
   */
  focus(node: FocusableNode): void {
    if (!node.focusable) return
    if (this.state.current?.id === node.id) return

    const prev = this.state.current
    this.state.current = node

    // Update history
    if (prev) {
      // Truncate forward history if we're not at the end
      if (this.state.historyIndex < this.state.history.length - 1) {
        this.state.history = this.state.history.slice(
          0,
          this.state.historyIndex + 1,
        )
      }
      this.state.history.push(prev)
      this.state.historyIndex = this.state.history.length - 1
    }

    this.notifyListeners(prev, node)
  }

  /**
   * Focus a node by its ID.
   */
  focusById(id: string): boolean {
    const node = this.nodeIndex.get(id)
    if (node && isFocusable(node)) {
      this.focus(node)
      return true
    }
    return false
  }

  /**
   * Clear focus (unfocus everything).
   */
  blur(): void {
    if (!this.state.current) return

    const prev = this.state.current
    this.state.current = null
    this.notifyListeners(prev, null)
  }

  /**
   * Focus the parent of the currently focused node.
   */
  focusParent(): boolean {
    const current = this.state.current
    if (!current) return false

    const parent = this.findParent(current)
    if (parent && isFocusable(parent)) {
      this.focus(parent)
      return true
    }
    return false
  }

  /**
   * Focus the first focusable child of the currently focused node.
   */
  focusFirstChild(): boolean {
    const current = this.state.current
    if (!current) return false

    for (const child of current.children) {
      if (isFocusable(child as AnyNode)) {
        this.focus(child as FocusableNode)
        return true
      }
    }
    return false
  }

  /**
   * Focus the next sibling of the currently focused node.
   */
  focusNextSibling(): boolean {
    return this.focusSiblingOffset(1)
  }

  /**
   * Focus the previous sibling of the currently focused node.
   */
  focusPreviousSibling(): boolean {
    return this.focusSiblingOffset(-1)
  }

  /**
   * Focus the next focusable node in tab order (depth-first traversal).
   */
  focusNext(): boolean {
    const focusable = this.getAllFocusable()
    if (focusable.length === 0) return false

    if (!this.state.current) {
      this.focus(focusable[0]!)
      return true
    }

    const currentIndex = focusable.findIndex(
      n => n.id === this.state.current?.id,
    )
    const nextIndex = (currentIndex + 1) % focusable.length
    this.focus(focusable[nextIndex]!)
    return true
  }

  /**
   * Focus the previous focusable node in tab order.
   */
  focusPrevious(): boolean {
    const focusable = this.getAllFocusable()
    if (focusable.length === 0) return false

    if (!this.state.current) {
      this.focus(focusable[focusable.length - 1]!)
      return true
    }

    const currentIndex = focusable.findIndex(
      n => n.id === this.state.current?.id,
    )
    const prevIndex =
      (currentIndex - 1 + focusable.length) % focusable.length
    this.focus(focusable[prevIndex]!)
    return true
  }

  /**
   * Navigate back in focus history.
   */
  focusBack(): boolean {
    if (this.state.historyIndex < 0) return false

    const prev = this.state.history[this.state.historyIndex]
    if (prev && this.nodeIndex.has(prev.id)) {
      this.state.historyIndex--
      const oldCurrent = this.state.current
      this.state.current = prev
      this.notifyListeners(oldCurrent, prev)
      return true
    }
    return false
  }

  /**
   * Navigate forward in focus history.
   */
  focusForward(): boolean {
    if (this.state.historyIndex >= this.state.history.length - 1)
      return false

    this.state.historyIndex++
    const next = this.state.history[this.state.historyIndex]
    if (next && this.nodeIndex.has(next.id)) {
      const oldCurrent = this.state.current
      this.state.current = next
      this.notifyListeners(oldCurrent, next)
      return true
    }
    return false
  }

  /**
   * Subscribe to focus change events.
   * Returns an unsubscribe function.
   */
  onFocusChange(callback: FocusChangeCallback): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  /**
   * Get all focusable nodes in the scene (depth-first order).
   */
  getAllFocusable(): FocusableNode[] {
    const result: FocusableNode[] = []

    const visit = (nodes: AnyNode[]) => {
      for (const node of nodes) {
        if (isFocusable(node)) {
          result.push(node)
        }
        if (node.children.length > 0) {
          visit(node.children as AnyNode[])
        }
      }
    }

    visit(this.scene.nodes)

    // Sort by tabIndex if present
    result.sort((a, b) => {
      const aIndex = a.tabIndex ?? Infinity
      const bIndex = b.tabIndex ?? Infinity
      return aIndex - bIndex
    })

    return result
  }

  /**
   * Get a node by ID.
   */
  getNodeById(id: string): AnyNode | undefined {
    return this.nodeIndex.get(id)
  }

  private findParent(node: AnyNode): AnyNode | null {
    const findInNodes = (
      nodes: AnyNode[],
      target: AnyNode,
    ): AnyNode | null => {
      for (const n of nodes) {
        if (n.children.some(c => c.id === target.id)) {
          return n
        }
        const found = findInNodes(n.children as AnyNode[], target)
        if (found) return found
      }
      return null
    }

    return findInNodes(this.scene.nodes, node)
  }

  private focusSiblingOffset(offset: number): boolean {
    const current = this.state.current
    if (!current) return false

    const parent = this.findParent(current)
    const siblings = parent
      ? (parent.children as AnyNode[])
      : this.scene.nodes

    const currentIndex = siblings.findIndex(n => n.id === current.id)
    if (currentIndex === -1) return false

    // Find next focusable sibling in direction
    let index = currentIndex + offset
    while (index >= 0 && index < siblings.length) {
      const sibling = siblings[index]
      if (sibling && isFocusable(sibling)) {
        this.focus(sibling)
        return true
      }
      index += offset
    }

    return false
  }

  private notifyListeners(
    prev: FocusableNode | null,
    next: FocusableNode | null,
  ): void {
    for (const listener of this.listeners) {
      listener(prev, next)
    }
  }
}

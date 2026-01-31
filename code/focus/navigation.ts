import type { FocusManager } from './manager'

/**
 * Keyboard navigation handler for focus management.
 * Binds keyboard events to focus navigation actions.
 */
export class FocusNavigation {
  private manager: FocusManager
  private element: HTMLElement
  private boundHandler: (e: KeyboardEvent) => void

  constructor(manager: FocusManager, element: HTMLElement) {
    this.manager = manager
    this.element = element
    this.boundHandler = this.handleKeyDown.bind(this)

    element.addEventListener('keydown', this.boundHandler)
    // Make element focusable if not already
    if (!element.hasAttribute('tabindex')) {
      element.setAttribute('tabindex', '0')
    }
  }

  /**
   * Remove event listeners.
   */
  dispose(): void {
    this.element.removeEventListener('keydown', this.boundHandler)
  }

  /**
   * Handle keyboard events.
   */
  private handleKeyDown(event: KeyboardEvent): void {
    let handled = false

    switch (event.key) {
      case 'Tab':
        if (event.shiftKey) {
          handled = this.manager.focusPrevious()
        } else {
          handled = this.manager.focusNext()
        }
        break

      case 'ArrowUp':
        handled = this.manager.focusParent()
        break

      case 'ArrowDown':
        handled = this.manager.focusFirstChild()
        // If no children, try next sibling
        if (!handled) {
          handled = this.manager.focusNextSibling()
        }
        break

      case 'ArrowLeft':
        handled = this.manager.focusPreviousSibling()
        break

      case 'ArrowRight':
        handled = this.manager.focusNextSibling()
        break

      case 'Home':
        // Focus first focusable node
        const focusable = this.manager.getAllFocusable()
        if (focusable.length > 0) {
          this.manager.focus(focusable[0]!)
          handled = true
        }
        break

      case 'End':
        // Focus last focusable node
        const allFocusable = this.manager.getAllFocusable()
        if (allFocusable.length > 0) {
          this.manager.focus(allFocusable[allFocusable.length - 1]!)
          handled = true
        }
        break

      case 'Escape':
        this.manager.blur()
        handled = true
        break

      case 'Backspace':
        handled = this.manager.focusBack()
        break
    }

    if (handled) {
      event.preventDefault()
      event.stopPropagation()
    }
  }
}

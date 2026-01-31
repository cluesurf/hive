import type { Matrix } from '@/form/matrix'
import type {
  InteractiveGeometry,
  InteractionConfig,
  DragState,
  ViewState,
  ScreenPoint,
  DiskPoint,
  TransformChangeCallback,
  InteractionStartCallback,
  InteractionEndCallback,
} from './types'
import { DEFAULT_INTERACTION_CONFIG } from './types'

/**
 * Interaction controller for navigating through geometric spaces.
 *
 * This controller is geometry-agnostic. It handles mouse/touch events
 * and delegates the actual coordinate transformations and translations
 * to the provided InteractiveGeometry implementation.
 *
 * Usage:
 *   const geometry = new Hyperbolic2DInteraction(hyperbolic2d)
 *   const controller = new InteractionController(geometry, canvas)
 *   controller.onTransformChange((transform) => {
 *     // Re-render with new transform
 *   })
 */
export class InteractionController {
  private geometry: InteractiveGeometry
  private canvas: HTMLCanvasElement
  private config: InteractionConfig

  private drag: DragState
  private view: ViewState

  private onTransformChangeCallbacks: TransformChangeCallback[] = []
  private onInteractionStartCallbacks: InteractionStartCallback[] = []
  private onInteractionEndCallbacks: InteractionEndCallback[] = []

  private animationFrameId: number | null = null

  // Cached canvas dimensions for coordinate conversion
  private centerX: number = 0
  private centerY: number = 0
  private radius: number = 0

  constructor(
    geometry: InteractiveGeometry,
    canvas: HTMLCanvasElement,
    config: Partial<InteractionConfig> = {},
  ) {
    this.geometry = geometry
    this.canvas = canvas
    this.config = { ...DEFAULT_INTERACTION_CONFIG, ...config }

    // Initialize drag state
    this.drag = {
      active: false,
      startScreen: { x: 0, y: 0 },
      startDisk: { u: 0, v: 0 },
      currentScreen: { x: 0, y: 0 },
      currentDisk: { u: 0, v: 0 },
      startTransform: geometry.identityTransform(),
    }

    // Initialize view state
    this.view = {
      transform: geometry.identityTransform(),
      velocity: { u: 0, v: 0 },
      animating: false,
    }

    this.updateCanvasDimensions()
    this.attachEventListeners()
  }

  /**
   * Update cached canvas dimensions. Call this when canvas resizes.
   */
  updateCanvasDimensions(): void {
    this.centerX = this.canvas.width / 2
    this.centerY = this.canvas.height / 2
    this.radius = Math.min(this.centerX, this.centerY) * 0.9
  }

  /**
   * Set the display radius (for coordinate conversion).
   */
  setRadius(radius: number): void {
    this.radius = radius
  }

  /**
   * Get the current view transform.
   */
  getTransform(): Matrix {
    return this.view.transform
  }

  /**
   * Reset the view to identity (center).
   */
  resetView(): void {
    this.view.transform = this.geometry.identityTransform()
    this.view.velocity = { u: 0, v: 0 }
    this.view.animating = false
    this.notifyTransformChange()
  }

  /**
   * Register callback for transform changes.
   */
  onTransformChange(callback: TransformChangeCallback): () => void {
    this.onTransformChangeCallbacks.push(callback)
    return () => {
      const idx = this.onTransformChangeCallbacks.indexOf(callback)
      if (idx >= 0) this.onTransformChangeCallbacks.splice(idx, 1)
    }
  }

  /**
   * Register callback for interaction start (drag begins).
   */
  onInteractionStart(callback: InteractionStartCallback): () => void {
    this.onInteractionStartCallbacks.push(callback)
    return () => {
      const idx = this.onInteractionStartCallbacks.indexOf(callback)
      if (idx >= 0) this.onInteractionStartCallbacks.splice(idx, 1)
    }
  }

  /**
   * Register callback for interaction end (drag ends).
   */
  onInteractionEnd(callback: InteractionEndCallback): () => void {
    this.onInteractionEndCallbacks.push(callback)
    return () => {
      const idx = this.onInteractionEndCallbacks.indexOf(callback)
      if (idx >= 0) this.onInteractionEndCallbacks.splice(idx, 1)
    }
  }

  /**
   * Clean up event listeners. Call when disposing the controller.
   */
  dispose(): void {
    this.detachEventListeners()
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
    }
  }

  // =========================================================================
  // Private: Event Handling
  // =========================================================================

  private attachEventListeners(): void {
    // Mouse events
    this.canvas.addEventListener('mousedown', this.handleMouseDown)
    window.addEventListener('mousemove', this.handleMouseMove)
    window.addEventListener('mouseup', this.handleMouseUp)

    // Touch events
    this.canvas.addEventListener('touchstart', this.handleTouchStart, {
      passive: false,
    })
    window.addEventListener('touchmove', this.handleTouchMove, {
      passive: false,
    })
    window.addEventListener('touchend', this.handleTouchEnd)

    // Prevent context menu on right-click
    this.canvas.addEventListener('contextmenu', this.handleContextMenu)
  }

  private detachEventListeners(): void {
    this.canvas.removeEventListener('mousedown', this.handleMouseDown)
    window.removeEventListener('mousemove', this.handleMouseMove)
    window.removeEventListener('mouseup', this.handleMouseUp)

    this.canvas.removeEventListener('touchstart', this.handleTouchStart)
    window.removeEventListener('touchmove', this.handleTouchMove)
    window.removeEventListener('touchend', this.handleTouchEnd)

    this.canvas.removeEventListener(
      'contextmenu',
      this.handleContextMenu,
    )
  }

  private handleContextMenu = (e: Event): void => {
    e.preventDefault()
  }

  private handleMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0) return // Only left click
    const screen = this.getScreenPoint(e)
    this.startDrag(screen)
  }

  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.drag.active) return
    const screen = this.getScreenPoint(e)
    this.updateDrag(screen)
  }

  private handleMouseUp = (_e: MouseEvent): void => {
    if (!this.drag.active) return
    this.endDrag()
  }

  private handleTouchStart = (e: TouchEvent): void => {
    if (e.touches.length !== 1) return // Single touch only for now
    e.preventDefault()
    const touch = e.touches[0]!
    const screen = this.getScreenPointFromTouch(touch)
    this.startDrag(screen)
  }

  private handleTouchMove = (e: TouchEvent): void => {
    if (!this.drag.active || e.touches.length !== 1) return
    e.preventDefault()
    const touch = e.touches[0]!
    const screen = this.getScreenPointFromTouch(touch)
    this.updateDrag(screen)
  }

  private handleTouchEnd = (_e: TouchEvent): void => {
    if (!this.drag.active) return
    this.endDrag()
  }

  // =========================================================================
  // Private: Drag Logic
  // =========================================================================

  private startDrag(screen: ScreenPoint): void {
    const disk = this.screenToDisk(screen)

    // Don't start drag if outside the disk
    if (disk.u * disk.u + disk.v * disk.v > 1) return

    this.drag = {
      active: true,
      startScreen: screen,
      startDisk: disk,
      currentScreen: screen,
      currentDisk: disk,
      startTransform: [...this.view.transform] as Matrix,
    }

    // Stop any momentum animation
    this.view.animating = false
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }

    this.notifyInteractionStart()
  }

  private updateDrag(screen: ScreenPoint): void {
    const prevDisk = this.drag.currentDisk
    const disk = this.screenToDisk(screen)

    this.drag.currentScreen = screen
    this.drag.currentDisk = disk

    // Check if we've moved enough to register
    const dx = screen.x - this.drag.startScreen.x
    const dy = screen.y - this.drag.startScreen.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < this.config.dragThreshold) return

    // Compute translation from drag start to current position
    let from = this.drag.startDisk
    let to = disk

    if (this.config.invertDrag) {
      ;[from, to] = [to, from]
    }

    // Build the incremental translation
    const translation = this.geometry.buildTranslation(from, to)

    // New transform = translation * startTransform
    this.view.transform = this.geometry.composeTransforms(
      translation,
      this.drag.startTransform,
    )

    // Track velocity for momentum
    this.view.velocity = {
      u: (disk.u - prevDisk.u) * this.config.sensitivity,
      v: (disk.v - prevDisk.v) * this.config.sensitivity,
    }

    this.notifyTransformChange()
  }

  private endDrag(): void {
    this.drag.active = false

    // Start momentum if enabled and we have velocity
    if (this.config.momentumEnabled) {
      const speed = Math.sqrt(
        this.view.velocity.u ** 2 + this.view.velocity.v ** 2,
      )
      if (speed > 0.001) {
        this.view.animating = true
        this.animateMomentum()
      }
    }

    this.notifyInteractionEnd()
  }

  // =========================================================================
  // Private: Momentum Animation
  // =========================================================================

  private animateMomentum(): void {
    if (!this.view.animating) return

    const { velocity } = this.view
    const speed = Math.sqrt(velocity.u ** 2 + velocity.v ** 2)

    if (speed < 0.0001) {
      this.view.animating = false
      return
    }

    // Apply velocity as a small translation
    const from: DiskPoint = { u: 0, v: 0 }
    const to: DiskPoint = {
      u: this.config.invertDrag ? -velocity.u : velocity.u,
      v: this.config.invertDrag ? -velocity.v : velocity.v,
    }

    const translation = this.geometry.buildTranslation(from, to)
    this.view.transform = this.geometry.composeTransforms(
      translation,
      this.view.transform,
    )

    // Decay velocity
    this.view.velocity = {
      u: velocity.u * this.config.momentumDecay,
      v: velocity.v * this.config.momentumDecay,
    }

    this.notifyTransformChange()

    this.animationFrameId = requestAnimationFrame(() =>
      this.animateMomentum(),
    )
  }

  // =========================================================================
  // Private: Coordinate Conversion
  // =========================================================================

  private getScreenPoint(e: MouseEvent): ScreenPoint {
    const rect = this.canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  private getScreenPointFromTouch(touch: Touch): ScreenPoint {
    const rect = this.canvas.getBoundingClientRect()
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    }
  }

  /**
   * Convert screen coordinates to disk coordinates.
   * Disk is centered in canvas, with radius mapped to [-1, 1].
   */
  private screenToDisk(screen: ScreenPoint): DiskPoint {
    return {
      u: (screen.x - this.centerX) / this.radius,
      v: -(screen.y - this.centerY) / this.radius, // Y is flipped
    }
  }

  // =========================================================================
  // Private: Callbacks
  // =========================================================================

  private notifyTransformChange(): void {
    for (const cb of this.onTransformChangeCallbacks) {
      cb(this.view.transform)
    }
  }

  private notifyInteractionStart(): void {
    for (const cb of this.onInteractionStartCallbacks) {
      cb()
    }
  }

  private notifyInteractionEnd(): void {
    for (const cb of this.onInteractionEndCallbacks) {
      cb()
    }
  }
}

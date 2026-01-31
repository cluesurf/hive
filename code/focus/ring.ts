import type { FocusableNode, FocusRingStyle } from './types'
import type {
  Scene,
  PolygonNode,
  PointNode,
  PathNode,
} from '@/rendering/scene'
import type { GeometryView } from '@/interaction/view'
import type { Point } from '@/form/point'
import { DEFAULT_FOCUS_RING_STYLE } from './types'
import { hyperboloidToPoincare, isInsideDisk } from '@/math/projection'

/**
 * Renders focus indicators for focused nodes.
 */
export class FocusRing {
  private style: FocusRingStyle
  private animationPhase: number = 0
  private lastTime: number = 0

  constructor(style: Partial<FocusRingStyle> = {}) {
    this.style = { ...DEFAULT_FOCUS_RING_STYLE, ...style }
  }

  /**
   * Update the focus ring style.
   */
  setStyle(style: Partial<FocusRingStyle>): void {
    this.style = { ...this.style, ...style }
  }

  /**
   * Update animation phase. Call this each frame.
   */
  update(time: number): void {
    if (this.lastTime === 0) {
      this.lastTime = time
      return
    }

    const dt = (time - this.lastTime) / 1000
    this.lastTime = time

    if (this.style.animated) {
      this.animationPhase += dt * this.style.pulseSpeed * Math.PI * 2
      if (this.animationPhase > Math.PI * 2) {
        this.animationPhase -= Math.PI * 2
      }
    }
  }

  /**
   * Render the focus ring for a node.
   */
  render(
    ctx: CanvasRenderingContext2D,
    node: FocusableNode,
    scene: Scene,
    view: GeometryView | null,
    centerX: number,
    centerY: number,
    radius: number,
  ): void {
    ctx.save()

    // Calculate animated properties
    let alpha = 1
    let lineWidth = this.style.width
    if (this.style.animated) {
      // Pulse between 0.6 and 1.0 opacity
      alpha = 0.6 + 0.4 * Math.sin(this.animationPhase)
      // Slight width variation
      lineWidth =
        this.style.width * (0.9 + 0.1 * Math.sin(this.animationPhase))
    }

    ctx.strokeStyle = this.style.color
    ctx.globalAlpha = alpha
    ctx.lineWidth = lineWidth
    if (this.style.dash.length > 0) {
      ctx.setLineDash(this.style.dash)
    }

    // Render based on node type
    switch (node.type) {
      case 'polygon':
        this.renderPolygonRing(
          ctx,
          node as PolygonNode,
          scene,
          view,
          centerX,
          centerY,
          radius,
        )
        break
      case 'point':
        this.renderPointRing(
          ctx,
          node as PointNode,
          scene,
          view,
          centerX,
          centerY,
          radius,
        )
        break
      case 'path':
        this.renderPathRing(
          ctx,
          node as PathNode,
          scene,
          view,
          centerX,
          centerY,
          radius,
        )
        break
      default:
        // For groups and other types, try to render based on bounds
        break
    }

    ctx.restore()
  }

  private renderPolygonRing(
    ctx: CanvasRenderingContext2D,
    node: PolygonNode,
    scene: Scene,
    view: GeometryView | null,
    centerX: number,
    centerY: number,
    radius: number,
  ): void {
    const geometryType = scene.geometry.getType()
    const canvasPoints: [number, number][] = []

    for (const vertex of node.vertices) {
      const canvasPoint = this.toCanvas(
        vertex,
        geometryType,
        view,
        centerX,
        centerY,
        radius,
      )
      if (canvasPoint) {
        canvasPoints.push(canvasPoint)
      }
    }

    if (canvasPoints.length < 3) return

    const first = canvasPoints[0]
    if (!first) return

    ctx.beginPath()
    ctx.moveTo(first[0], first[1])

    for (let i = 1; i < canvasPoints.length; i++) {
      const pt = canvasPoints[i]
      if (!pt) continue
      ctx.lineTo(pt[0], pt[1])
    }
    ctx.closePath()
    ctx.stroke()
  }

  private renderPointRing(
    ctx: CanvasRenderingContext2D,
    node: PointNode,
    scene: Scene,
    view: GeometryView | null,
    centerX: number,
    centerY: number,
    radius: number,
  ): void {
    const geometryType = scene.geometry.getType()
    const canvasPoint = this.toCanvas(
      node.position,
      geometryType,
      view,
      centerX,
      centerY,
      radius,
    )

    if (!canvasPoint) return

    // Draw ring around the point
    const ringRadius = node.radius + this.style.width + 2
    ctx.beginPath()
    ctx.arc(canvasPoint[0], canvasPoint[1], ringRadius, 0, Math.PI * 2)
    ctx.stroke()
  }

  private renderPathRing(
    ctx: CanvasRenderingContext2D,
    node: PathNode,
    scene: Scene,
    view: GeometryView | null,
    centerX: number,
    centerY: number,
    radius: number,
  ): void {
    const geometryType = scene.geometry.getType()
    const canvasPoints: [number, number][] = []

    for (const point of node.points) {
      const canvasPoint = this.toCanvas(
        point,
        geometryType,
        view,
        centerX,
        centerY,
        radius,
      )
      if (canvasPoint) {
        canvasPoints.push(canvasPoint)
      }
    }

    if (canvasPoints.length < 2) return

    const first = canvasPoints[0]
    if (!first) return

    // Draw the path with focus styling
    ctx.beginPath()
    ctx.moveTo(first[0], first[1])

    for (let i = 1; i < canvasPoints.length; i++) {
      const pt = canvasPoints[i]
      if (!pt) continue
      ctx.lineTo(pt[0], pt[1])
    }

    if (node.closed && canvasPoints.length > 2) {
      ctx.closePath()
    }
    ctx.stroke()
  }

  private tempPoincare: [number, number] = [0, 0]

  private toCanvas(
    point: Point,
    geometryType: string,
    view: GeometryView | null,
    centerX: number,
    centerY: number,
    diskRadius: number,
  ): [number, number] | null {
    if (geometryType === 'hyperbolic') {
      let transformedPoint = point
      if (view) {
        transformedPoint = view.transformPoint(point)
      }

      hyperboloidToPoincare(transformedPoint, this.tempPoincare)

      if (!isInsideDisk(this.tempPoincare, 1.5)) {
        return null
      }

      return [
        centerX + this.tempPoincare[0] * diskRadius,
        centerY - this.tempPoincare[1] * diskRadius,
      ]
    }

    if (geometryType === 'euclidean') {
      const x = point[0] ?? 0
      const y = point[1] ?? 0
      return [centerX + x * diskRadius, centerY - y * diskRadius]
    }

    if (geometryType === 'spherical') {
      const x = point[0] ?? 0
      const y = point[1] ?? 0
      const z = point[2] ?? 1

      const denom = 1 + z
      if (Math.abs(denom) < 1e-10) return null

      const u = x / denom
      const v = y / denom

      return [centerX + u * diskRadius, centerY - v * diskRadius]
    }

    return null
  }
}

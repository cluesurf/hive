import type {
  Scene,
  AnyNode,
  PolygonNode,
  PathNode,
  PointNode,
  TextNode,
  GroupNode,
} from './scene'
import type { Renderer2DConfig } from './types'
import { diskToCanvas } from './projection'
import { hyperboloidToPoincare, isInsideDisk } from '@/math/projection'
import { flattenScene } from './scene'
import {
  DEFAULT_BACKGROUND_COLOR,
  DEFAULT_BOUNDARY_COLOR,
  DEFAULT_BOUNDARY_LINE_WIDTH,
  DEFAULT_INFO_COLOR,
  DEFAULT_INFO_FONT,
  DEFAULT_ZOOM,
} from './colors'
import type { Point } from '@/form/point'
import type { Matrix } from '@/form/matrix'

/**
 * Canvas 2D renderer for scene graphs.
 * Renders hyperbolic, spherical, and Euclidean geometries to a 2D canvas.
 */
export class Canvas2DRenderer {
  private ctx: CanvasRenderingContext2D
  private config: Renderer2DConfig
  private centerX: number
  private centerY: number
  private radius: number

  // Reusable arrays to avoid allocation
  private tempPoincare: [number, number] = [0, 0]
  private tempCanvas: [number, number] = [0, 0]

  constructor(
    canvas: HTMLCanvasElement,
    config?: Partial<Renderer2DConfig>,
  ) {
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context')
    }
    this.ctx = ctx

    this.config = {
      width: config?.width ?? canvas.width,
      height: config?.height ?? canvas.height,
      zoom: config?.zoom ?? DEFAULT_ZOOM,
      backgroundColor:
        config?.backgroundColor ?? DEFAULT_BACKGROUND_COLOR,
    }

    this.centerX = this.config.width / 2
    this.centerY = this.config.height / 2
    this.radius =
      Math.min(this.centerX, this.centerY) * this.config.zoom
  }

  /**
   * Update the renderer configuration.
   */
  setConfig(config: Partial<Renderer2DConfig>): void {
    if (config.width !== undefined) this.config.width = config.width
    if (config.height !== undefined) this.config.height = config.height
    if (config.zoom !== undefined) this.config.zoom = config.zoom
    if (config.backgroundColor !== undefined)
      this.config.backgroundColor = config.backgroundColor

    this.centerX = this.config.width / 2
    this.centerY = this.config.height / 2
    this.radius =
      Math.min(this.centerX, this.centerY) * this.config.zoom
  }

  /**
   * Resize the renderer to match canvas dimensions.
   */
  resize(width: number, height: number): void {
    this.config.width = width
    this.config.height = height
    this.centerX = width / 2
    this.centerY = height / 2
    this.radius =
      Math.min(this.centerX, this.centerY) * this.config.zoom
  }

  /**
   * Clear the canvas with the background color.
   */
  clear(): void {
    this.ctx.fillStyle = this.config.backgroundColor
    this.ctx.fillRect(0, 0, this.config.width, this.config.height)
  }

  /**
   * Draw the Poincare disk boundary circle.
   */
  drawDiskBoundary(
    color: string = DEFAULT_BOUNDARY_COLOR,
    lineWidth: number = DEFAULT_BOUNDARY_LINE_WIDTH,
  ): void {
    this.ctx.strokeStyle = color
    this.ctx.lineWidth = lineWidth
    this.ctx.beginPath()
    this.ctx.arc(
      this.centerX,
      this.centerY,
      this.radius,
      0,
      Math.PI * 2,
    )
    this.ctx.stroke()
  }

  /**
   * Render a complete scene.
   */
  render(scene: Scene): void {
    this.clear()
    this.drawDiskBoundary()

    const nodes = flattenScene(scene)
    for (const node of nodes) {
      this.renderNode(node, null, scene)
    }
  }

  /**
   * Render a single node with accumulated transform.
   */
  private renderNode(
    node: AnyNode,
    parentTransform: Matrix | null,
    scene: Scene,
  ): void {
    switch (node.type) {
      case 'polygon':
        this.renderPolygon(node, scene)
        break
      case 'path':
        this.renderPath(node, scene)
        break
      case 'point':
        this.renderPoint(node, scene)
        break
      case 'text':
        this.renderText(node, scene)
        break
      case 'group':
        // Groups are already flattened, just process children
        break
    }
  }

  /**
   * Convert a point from geometry coordinates to canvas coordinates.
   */
  private toCanvas(
    point: Point,
    geometryType: string,
  ): [number, number] | null {
    if (geometryType === 'hyperbolic') {
      // Project from hyperboloid to Poincare disk
      hyperboloidToPoincare(point, this.tempPoincare)

      // Check visibility - use larger threshold to include edge tiles
      if (!isInsideDisk(this.tempPoincare, 1.5)) {
        return null
      }

      // Convert to canvas coordinates
      diskToCanvas(
        this.tempPoincare,
        this.centerX,
        this.centerY,
        this.radius,
        this.tempCanvas,
      )
      return [this.tempCanvas[0], this.tempCanvas[1]]
    }

    // Euclidean: assume coordinates are in [-1, 1] range
    if (geometryType === 'euclidean') {
      const x = point[0] ?? 0
      const y = point[1] ?? 0
      return [
        this.centerX + x * this.radius,
        this.centerY - y * this.radius,
      ]
    }

    // Spherical: project from sphere using stereographic projection
    if (geometryType === 'spherical') {
      const x = point[0] ?? 0
      const y = point[1] ?? 0
      const z = point[2] ?? 1

      // Stereographic projection from south pole
      const denom = 1 + z
      if (Math.abs(denom) < 1e-10) return null

      const u = x / denom
      const v = y / denom

      return [
        this.centerX + u * this.radius,
        this.centerY - v * this.radius,
      ]
    }

    return null
  }

  /**
   * Render a polygon node.
   */
  private renderPolygon(node: PolygonNode, scene: Scene): void {
    const geometryType = scene.geometry.getType()
    const canvasPoints: [number, number][] = []
    let anyVisible = false

    for (const vertex of node.vertices) {
      const canvasPoint = this.toCanvas(vertex, geometryType)
      if (canvasPoint) {
        canvasPoints.push(canvasPoint)
        anyVisible = true
      } else {
        // For now, skip polygons with any vertices outside
        // TODO: Implement proper clipping
        return
      }
    }

    if (!anyVisible || canvasPoints.length < 3) return

    const first = canvasPoints[0]
    if (!first) return

    this.ctx.beginPath()
    this.ctx.moveTo(first[0], first[1])

    for (let i = 1; i < canvasPoints.length; i++) {
      const pt = canvasPoints[i]
      if (!pt) continue
      // TODO: For hyperbolic geometry, draw geodesic arcs instead of straight lines
      this.ctx.lineTo(pt[0], pt[1])
    }
    this.ctx.closePath()

    if (node.fillColor) {
      this.ctx.fillStyle = node.fillColor
      this.ctx.fill()
    }

    if (node.strokeColor) {
      this.ctx.strokeStyle = node.strokeColor
      this.ctx.lineWidth = node.strokeWidth
      this.ctx.stroke()
    }
  }

  /**
   * Render a path node.
   */
  private renderPath(node: PathNode, scene: Scene): void {
    const geometryType = scene.geometry.getType()
    const canvasPoints: [number, number][] = []

    for (const point of node.points) {
      const canvasPoint = this.toCanvas(point, geometryType)
      if (canvasPoint) {
        canvasPoints.push(canvasPoint)
      }
    }

    if (canvasPoints.length < 2) return

    const first = canvasPoints[0]
    if (!first) return

    this.ctx.beginPath()
    this.ctx.moveTo(first[0], first[1])

    for (let i = 1; i < canvasPoints.length; i++) {
      const pt = canvasPoints[i]
      if (!pt) continue
      this.ctx.lineTo(pt[0], pt[1])
    }

    if (node.closed && canvasPoints.length > 2) {
      this.ctx.closePath()
    }

    this.ctx.strokeStyle = node.strokeColor
    this.ctx.lineWidth = node.strokeWidth
    if (node.lineDash.length > 0) {
      this.ctx.setLineDash(node.lineDash)
    }
    this.ctx.stroke()
    this.ctx.setLineDash([])
  }

  /**
   * Render a point/marker node.
   */
  private renderPoint(node: PointNode, scene: Scene): void {
    const geometryType = scene.geometry.getType()
    const canvasPoint = this.toCanvas(node.position, geometryType)

    if (!canvasPoint) return

    this.ctx.beginPath()
    this.ctx.arc(
      canvasPoint[0],
      canvasPoint[1],
      node.radius,
      0,
      Math.PI * 2,
    )
    this.ctx.fillStyle = node.fillColor
    this.ctx.fill()

    if (node.strokeColor) {
      this.ctx.strokeStyle = node.strokeColor
      this.ctx.lineWidth = 1
      this.ctx.stroke()
    }
  }

  /**
   * Render a text node.
   */
  private renderText(node: TextNode, scene: Scene): void {
    const geometryType = scene.geometry.getType()
    const canvasPoint = this.toCanvas(node.position, geometryType)

    if (!canvasPoint) return

    this.ctx.font = `${node.fontSize}px ${node.fontFamily}`
    this.ctx.fillStyle = node.color
    this.ctx.textAlign = node.align
    this.ctx.textBaseline = 'middle'
    this.ctx.fillText(node.text, canvasPoint[0], canvasPoint[1])
  }

  /**
   * Draw debug info on the canvas.
   */
  drawInfo(lines: string[], x: number = 16, startY: number = 28): void {
    this.ctx.fillStyle = DEFAULT_INFO_COLOR
    this.ctx.font = DEFAULT_INFO_FONT
    this.ctx.textAlign = 'left'

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (line) {
        this.ctx.fillText(line, x, startY + i * 20)
      }
    }
  }

  /**
   * Get the current center coordinates.
   */
  getCenter(): [number, number] {
    return [this.centerX, this.centerY]
  }

  /**
   * Get the current radius.
   */
  getRadius(): number {
    return this.radius
  }

  /**
   * Get the 2D rendering context.
   */
  getContext(): CanvasRenderingContext2D {
    return this.ctx
  }
}

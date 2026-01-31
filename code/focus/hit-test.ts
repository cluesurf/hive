import type { Scene, AnyNode, PolygonNode, PointNode } from '@/rendering/scene'
import type { GeometryView } from '@/interaction/view'
import type { Point } from '@/form/point'
import type { FocusableNode } from './types'
import { isFocusable } from './manager'
import { hyperboloidToPoincare, isInsideDisk } from '@/math/projection'

/**
 * Screen coordinates (canvas pixels).
 */
export interface ScreenPoint {
  x: number
  y: number
}

/**
 * Hit test a screen point against all focusable nodes in a scene.
 * Returns the topmost focusable node at that point, or null if none.
 */
export function hitTest(
  screen: ScreenPoint,
  scene: Scene,
  view: GeometryView | null,
  centerX: number,
  centerY: number,
  radius: number,
): FocusableNode | null {
  // Convert screen to disk coordinates
  const diskX = (screen.x - centerX) / radius
  const diskY = -(screen.y - centerY) / radius

  // Check if inside the disk at all
  if (diskX * diskX + diskY * diskY > 1) {
    return null
  }

  // Collect all focusable nodes with their depths
  const candidates: Array<{ node: FocusableNode; depth: number }> = []

  const visit = (node: AnyNode) => {
    if (isFocusable(node)) {
      if (nodeContainsPoint(node, diskX, diskY, scene, view)) {
        candidates.push({ node, depth: node.depth })
      }
    }
    for (const child of node.children) {
      visit(child as AnyNode)
    }
  }

  for (const node of scene.nodes) {
    visit(node)
  }

  if (candidates.length === 0) {
    return null
  }

  // Return the node with highest depth (rendered on top)
  candidates.sort((a, b) => b.depth - a.depth)
  return candidates[0]!.node
}

/**
 * Check if a node contains a point (in disk coordinates).
 */
function nodeContainsPoint(
  node: FocusableNode,
  diskX: number,
  diskY: number,
  scene: Scene,
  view: GeometryView | null,
): boolean {
  switch (node.type) {
    case 'polygon':
      return polygonContainsPoint(
        node as PolygonNode,
        diskX,
        diskY,
        scene,
        view,
      )
    case 'point':
      return pointContainsPoint(node as PointNode, diskX, diskY, scene, view)
    default:
      return false
  }
}

const tempPoincare: [number, number] = [0, 0]

/**
 * Check if a polygon contains a point using ray casting algorithm.
 */
function polygonContainsPoint(
  node: PolygonNode,
  diskX: number,
  diskY: number,
  scene: Scene,
  view: GeometryView | null,
): boolean {
  const geometryType = scene.geometry.getType()
  const diskPoints: [number, number][] = []

  for (const vertex of node.vertices) {
    const diskPoint = toDisk(vertex, geometryType, view)
    if (diskPoint) {
      diskPoints.push(diskPoint)
    }
  }

  if (diskPoints.length < 3) return false

  return pointInPolygon(diskX, diskY, diskPoints)
}

/**
 * Check if a point marker contains a point.
 */
function pointContainsPoint(
  node: PointNode,
  diskX: number,
  diskY: number,
  scene: Scene,
  view: GeometryView | null,
): boolean {
  const geometryType = scene.geometry.getType()
  const diskPoint = toDisk(node.position, geometryType, view)

  if (!diskPoint) return false

  // Check if click is within the point's radius
  // We need to convert the pixel radius to disk coordinates
  // For simplicity, use a generous hit area
  const hitRadius = 0.05 // Generous hit area in disk coordinates
  const dx = diskX - diskPoint[0]
  const dy = diskY - diskPoint[1]

  return dx * dx + dy * dy <= hitRadius * hitRadius
}

/**
 * Convert a geometry point to disk coordinates.
 */
function toDisk(
  point: Point,
  geometryType: string,
  view: GeometryView | null,
): [number, number] | null {
  if (geometryType === 'hyperbolic') {
    let transformedPoint = point
    if (view) {
      transformedPoint = view.transformPoint(point)
    }

    hyperboloidToPoincare(transformedPoint, tempPoincare)

    if (!isInsideDisk(tempPoincare, 1.5)) {
      return null
    }

    return [tempPoincare[0], tempPoincare[1]]
  }

  if (geometryType === 'euclidean') {
    return [point[0] ?? 0, point[1] ?? 0]
  }

  if (geometryType === 'spherical') {
    const x = point[0] ?? 0
    const y = point[1] ?? 0
    const z = point[2] ?? 1

    const denom = 1 + z
    if (Math.abs(denom) < 1e-10) return null

    return [x / denom, y / denom]
  }

  return null
}

/**
 * Ray casting algorithm for point-in-polygon test.
 */
function pointInPolygon(
  x: number,
  y: number,
  polygon: [number, number][],
): boolean {
  let inside = false
  const n = polygon.length

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i]![0]
    const yi = polygon[i]![1]
    const xj = polygon[j]![0]
    const yj = polygon[j]![1]

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi

    if (intersect) {
      inside = !inside
    }
  }

  return inside
}

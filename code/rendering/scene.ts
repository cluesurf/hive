import type { Point } from '@/form/point'
import type { Matrix } from '@/form/matrix'
import type { Geometry } from '@/form/geometry'
import {
  DEFAULT_FILL_COLOR,
  DEFAULT_STROKE_COLOR,
  DEFAULT_PATH_STROKE_COLOR,
  DEFAULT_POINT_FILL_COLOR,
  DEFAULT_TEXT_COLOR,
  DEFAULT_STROKE_WIDTH,
  DEFAULT_POINT_RADIUS,
  DEFAULT_FONT_SIZE,
  DEFAULT_FONT_FAMILY,
} from './colors'

/**
 * Base node in the scene graph.
 */
export interface SceneNode {
  /** Unique identifier */
  id: string

  /** Node type for rendering dispatch */
  type: string

  /** Whether this node is visible */
  visible: boolean

  /** Depth for z-ordering (lower = render first) */
  depth: number

  /** Child nodes */
  children: SceneNode[]
}

/**
 * A polygon node that can be rendered.
 */
export interface PolygonNode extends SceneNode {
  type: 'polygon'

  /** Vertices in the geometry's native coordinate system */
  vertices: Point[]

  /** Fill color (CSS color string or null for no fill) */
  fillColor: string | null

  /** Stroke color (CSS color string or null for no stroke) */
  strokeColor: string | null

  /** Stroke width in pixels */
  strokeWidth: number
}

/**
 * A line/path node.
 */
export interface PathNode extends SceneNode {
  type: 'path'

  /** Points along the path */
  points: Point[]

  /** Whether the path is closed */
  closed: boolean

  /** Stroke color */
  strokeColor: string

  /** Stroke width */
  strokeWidth: number

  /** Line dash pattern (empty for solid) */
  lineDash: number[]
}

/**
 * A point/marker node.
 */
export interface PointNode extends SceneNode {
  type: 'point'

  /** Position in geometry's native coordinates */
  position: Point

  /** Radius in pixels */
  radius: number

  /** Fill color */
  fillColor: string

  /** Stroke color */
  strokeColor: string | null
}

/**
 * A text label node.
 */
export interface TextNode extends SceneNode {
  type: 'text'

  /** Position in geometry's native coordinates */
  position: Point

  /** Text content */
  text: string

  /** Font size in pixels */
  fontSize: number

  /** Font family */
  fontFamily: string

  /** Text color */
  color: string

  /** Text alignment */
  align: 'left' | 'center' | 'right'
}

/**
 * A group node that contains other nodes with a transform.
 */
export interface GroupNode extends SceneNode {
  type: 'group'

  /** Transform applied to all children */
  transform: Matrix | null
}

/**
 * Union of all node types.
 */
export type AnyNode =
  | PolygonNode
  | PathNode
  | PointNode
  | TextNode
  | GroupNode

/**
 * The root scene containing all renderable objects.
 */
export interface Scene {
  /** Root nodes */
  nodes: AnyNode[]

  /** The geometry used for this scene */
  geometry: Geometry

  /** Scene bounds in geometry coordinates (for culling) */
  bounds?: {
    min: Point
    max: Point
  }
}

/**
 * Create a polygon node.
 */
export function createPolygon(
  id: string,
  vertices: Point[],
  options: {
    fillColor?: string | null
    strokeColor?: string | null
    strokeWidth?: number
    depth?: number
    visible?: boolean
  } = {},
): PolygonNode {
  return {
    id,
    type: 'polygon',
    vertices,
    fillColor: options.fillColor ?? DEFAULT_FILL_COLOR,
    strokeColor: options.strokeColor ?? DEFAULT_STROKE_COLOR,
    strokeWidth: options.strokeWidth ?? DEFAULT_STROKE_WIDTH,
    depth: options.depth ?? 0,
    visible: options.visible ?? true,
    children: [],
  }
}

/**
 * Create a path node.
 */
export function createPath(
  id: string,
  points: Point[],
  options: {
    closed?: boolean
    strokeColor?: string
    strokeWidth?: number
    lineDash?: number[]
    depth?: number
    visible?: boolean
  } = {},
): PathNode {
  return {
    id,
    type: 'path',
    points,
    closed: options.closed ?? false,
    strokeColor: options.strokeColor ?? DEFAULT_PATH_STROKE_COLOR,
    strokeWidth: options.strokeWidth ?? DEFAULT_STROKE_WIDTH,
    lineDash: options.lineDash ?? [],
    depth: options.depth ?? 0,
    visible: options.visible ?? true,
    children: [],
  }
}

/**
 * Create a point/marker node.
 */
export function createPoint(
  id: string,
  position: Point,
  options: {
    radius?: number
    fillColor?: string
    strokeColor?: string | null
    depth?: number
    visible?: boolean
  } = {},
): PointNode {
  return {
    id,
    type: 'point',
    position,
    radius: options.radius ?? DEFAULT_POINT_RADIUS,
    fillColor: options.fillColor ?? DEFAULT_POINT_FILL_COLOR,
    strokeColor: options.strokeColor ?? null,
    depth: options.depth ?? 0,
    visible: options.visible ?? true,
    children: [],
  }
}

/**
 * Create a text node.
 */
export function createText(
  id: string,
  position: Point,
  text: string,
  options: {
    fontSize?: number
    fontFamily?: string
    color?: string
    align?: 'left' | 'center' | 'right'
    depth?: number
    visible?: boolean
  } = {},
): TextNode {
  return {
    id,
    type: 'text',
    position,
    text,
    fontSize: options.fontSize ?? DEFAULT_FONT_SIZE,
    fontFamily: options.fontFamily ?? DEFAULT_FONT_FAMILY,
    color: options.color ?? DEFAULT_TEXT_COLOR,
    align: options.align ?? 'center',
    depth: options.depth ?? 0,
    visible: options.visible ?? true,
    children: [],
  }
}

/**
 * Create a group node.
 */
export function createGroup(
  id: string,
  children: AnyNode[] = [],
  options: {
    transform?: Matrix | null
    depth?: number
    visible?: boolean
  } = {},
): GroupNode {
  return {
    id,
    type: 'group',
    transform: options.transform ?? null,
    depth: options.depth ?? 0,
    visible: options.visible ?? true,
    children,
  }
}

/**
 * Create an empty scene.
 */
export function createScene(geometry: Geometry, nodes: AnyNode[] = []): Scene {
  return {
    nodes,
    geometry,
  }
}

/**
 * Add nodes to a scene. Returns a new scene with the added nodes.
 */
export function addNodes(scene: Scene, nodes: AnyNode[]): Scene {
  return {
    ...scene,
    nodes: [...scene.nodes, ...nodes],
  }
}

/**
 * Flatten a scene graph into a sorted list of nodes for rendering.
 */
export function flattenScene(scene: Scene): AnyNode[] {
  const result: AnyNode[] = []

  function visit(node: AnyNode) {
    if (!node.visible) return
    result.push(node)
    for (const child of node.children) {
      visit(child as AnyNode)
    }
  }

  for (const node of scene.nodes) {
    visit(node)
  }

  // Sort by depth (lower depth rendered first)
  result.sort((a, b) => a.depth - b.depth)

  return result
}

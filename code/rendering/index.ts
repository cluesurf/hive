export * from './types'
export * from './projection'
export * from './scene'
export * from './colors'
export * from './tessellation'
export { Canvas2DRenderer } from './canvas2d'
export { PoincareGeometry, poincareGeometry } from './poincare-geometry'

// Hyperbolic-specific rendering
export {
  addressedTilesToNodes,
  hyperbolicDistance,
  distanceToDepth,
  type AddressedTileData,
} from './hyperbolic'

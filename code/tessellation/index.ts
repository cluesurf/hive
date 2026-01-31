// Static tessellation types (old system)
export type {
  Tile as StaticTile,
  TessellationConfig as StaticTessellationConfig,
  Tessellation,
} from './types'
export {
  getCurvatureType,
  validateConfig,
  isHyperbolic,
  isEuclidean,
  isSpherical,
  getDefectAngle,
  getPolygonAngle,
  getVertexAngle,
} from './types'

// Address-based dynamic tessellation (current system)
export {
  Hyperbolic2DTessellation,
  DEFAULT_TESSELLATION_CONFIG,
} from './hyperbolic2d'

export type { Tile, VisibleTile, TessellationConfig } from './hyperbolic2d'

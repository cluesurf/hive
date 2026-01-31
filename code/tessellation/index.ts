export * from './types'

export { Hyperbolic2DTessellation } from './hyperbolic2d'

// Dynamic tessellation (rename Tile to avoid conflict)
export {
  DynamicTessellationManager,
  DEFAULT_DYNAMIC_CONFIG,
} from './dynamic'
export type {
  Tile as DynamicTile,
  Walker,
  DynamicTessellationConfig,
} from './dynamic'

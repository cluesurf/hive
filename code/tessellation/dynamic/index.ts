export type { Tile, Walker, DynamicTessellationConfig } from './types'

export { DEFAULT_DYNAMIC_CONFIG } from './types'
export { DynamicTessellationManager } from './manager'

// New address-based approach (avoids coordinate explosion)
export type { AddressedTile, AddressBasedConfig } from './address-based'
export { AddressBasedTessellation } from './address-based'

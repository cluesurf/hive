/**
 * Hyperbolic Honeycomb Module
 *
 * Provides everything needed to render and interact with 3D hyperbolic honeycombs.
 */

// Coxeter group and honeycomb structure
export {
  type CoxeterGroup,
  initCoxeterGroup,
  isHyperbolicHoneycomb,
  honeycombName,
} from './coxeter'

// Three.js material and rendering (original)
export {
  type HoneycombMaterialOptions,
  createHoneycombMaterial,
  updateCameraUniforms,
  updateResolution,
  updateTime,
  setHighlight,
} from './material'

// Three.js material V2 with proper cell-depth limiting
export {
  type HoneycombMaterialV2Options,
  createHoneycombMaterialV2,
  updateCameraUniformsV2,
  updateResolutionV2,
} from './material-v2'

// Cell enumeration for depth-limited rendering
export {
  type CellEnumeration,
  enumerateCells,
  estimateCellCount,
} from './cell-enumeration'

// Navigation and controls
export {
  type HyperbolicCameraState,
  type HyperbolicControlsOptions,
  createCameraState,
  updateCameraDirection,
  rotateCamera,
  moveCamera,
  resetCamera,
  syncCameraToMaterial,
  createNavigationHandlers,
} from './navigation'

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

// Three.js material and rendering
export {
  type HoneycombMaterialOptions,
  createHoneycombMaterial,
  updateCameraUniforms,
  updateResolution,
  updateTime,
  setHighlight,
} from './material'

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

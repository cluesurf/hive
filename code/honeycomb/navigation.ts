/**
 * Hyperbolic Navigation Controls
 *
 * Camera movement in 3D hyperbolic space using Mobius addition.
 */

import * as THREE from 'three'
import { mobiusAdd, type Vec3 } from '../math/mobius'
import { updateCameraUniforms } from './material'

/**
 * Camera state for hyperbolic navigation.
 */
export interface HyperbolicCameraState {
  position: THREE.Vector3
  direction: THREE.Vector3
  up: THREE.Vector3
  yaw: number
  pitch: number
}

/**
 * Create initial camera state.
 */
export function createCameraState(): HyperbolicCameraState {
  return {
    position: new THREE.Vector3(0, 0, 0),
    direction: new THREE.Vector3(0, 0, 1),
    up: new THREE.Vector3(0, 1, 0),
    yaw: 0,
    pitch: 0,
  }
}

/**
 * Update camera direction from yaw and pitch.
 */
export function updateCameraDirection(
  state: HyperbolicCameraState,
): void {
  state.direction.set(
    Math.sin(state.yaw) * Math.cos(state.pitch),
    Math.sin(state.pitch),
    Math.cos(state.yaw) * Math.cos(state.pitch),
  )
}

/**
 * Rotate camera by delta yaw and pitch.
 */
export function rotateCamera(
  state: HyperbolicCameraState,
  deltaYaw: number,
  deltaPitch: number,
): void {
  state.yaw -= deltaYaw
  state.pitch -= deltaPitch

  // Clamp pitch to avoid gimbal lock
  const maxPitch = Math.PI / 2 - 0.01
  state.pitch = Math.max(-maxPitch, Math.min(maxPitch, state.pitch))

  updateCameraDirection(state)
}

/**
 * Move camera in hyperbolic space using Mobius addition.
 *
 * @param state - Camera state to update
 * @param forward - Forward movement amount (-1 to 1)
 * @param strafe - Strafe movement amount (-1 to 1)
 * @param speed - Movement speed (hyperbolic distance per step)
 * @param maxRadius - Maximum distance from origin (prevents leaving ball)
 */
export function moveCamera(
  state: HyperbolicCameraState,
  forward: number,
  strafe: number,
  speed: number = 0.02,
  maxRadius: number = 0.95,
): void {
  // Get movement directions
  const dir = state.direction.clone().normalize()
  const right = new THREE.Vector3()
    .crossVectors(dir, state.up)
    .normalize()

  // Combine movement
  const moveDir = new THREE.Vector3()
    .addScaledVector(dir, forward)
    .addScaledVector(right, strafe)

  if (moveDir.length() < 0.0001) return

  moveDir.normalize()

  // Hyperbolic movement using Mobius addition
  const t = Math.tanh(speed / 2)
  const translation: Vec3 = [
    moveDir.x * t,
    moveDir.y * t,
    moveDir.z * t,
  ]

  const pos: Vec3 = [
    state.position.x,
    state.position.y,
    state.position.z,
  ]
  const newPos = mobiusAdd(pos, translation)

  // Always update position - clamp to ball boundary if needed for numerical stability
  let len = Math.sqrt(newPos[0] ** 2 + newPos[1] ** 2 + newPos[2] ** 2)
  if (len > 0.999) {
    // Normalize to stay just inside ball boundary
    const scale = 0.999 / len
    state.position.set(newPos[0] * scale, newPos[1] * scale, newPos[2] * scale)
  } else {
    state.position.set(newPos[0], newPos[1], newPos[2])
  }
}

/**
 * Reset camera to origin.
 */
export function resetCamera(state: HyperbolicCameraState): void {
  state.position.set(0, 0, 0)
  state.yaw = 0
  state.pitch = 0
  updateCameraDirection(state)
}

/**
 * Sync camera state to material uniforms.
 */
export function syncCameraToMaterial(
  state: HyperbolicCameraState,
  material: THREE.ShaderMaterial,
): void {
  updateCameraUniforms(
    material,
    state.position,
    state.direction,
    state.up,
  )
}

/**
 * Options for hyperbolic navigation controls.
 */
export interface HyperbolicControlsOptions {
  /** Rotation sensitivity (radians per pixel) */
  rotateSensitivity?: number
  /** Movement speed (hyperbolic distance per frame) */
  moveSpeed?: number
  /** Zoom speed (hyperbolic distance per scroll step) */
  zoomSpeed?: number
  /** Maximum distance from origin */
  maxRadius?: number
}

/**
 * Create event handlers for hyperbolic navigation.
 */
export function createNavigationHandlers(
  state: HyperbolicCameraState,
  material: THREE.ShaderMaterial,
  domElement: HTMLElement,
  options: HyperbolicControlsOptions = {},
) {
  const {
    rotateSensitivity = 0.003,
    moveSpeed = 0.02,
    zoomSpeed = 0.5,
    maxRadius = 0.95,
  } = options

  const dragState = {
    isDragging: false,
    lastX: 0,
    lastY: 0,
  }

  const keysPressed = new Set<string>()

  function onMouseDown(e: MouseEvent) {
    dragState.isDragging = true
    dragState.lastX = e.clientX
    dragState.lastY = e.clientY
  }

  function onMouseUp() {
    dragState.isDragging = false
  }

  function onMouseMove(e: MouseEvent) {
    if (!dragState.isDragging) return

    const dx = e.clientX - dragState.lastX
    const dy = e.clientY - dragState.lastY
    dragState.lastX = e.clientX
    dragState.lastY = e.clientY

    rotateCamera(state, dx * rotateSensitivity, dy * rotateSensitivity)
    syncCameraToMaterial(state, material)
  }

  function onKeyDown(e: KeyboardEvent) {
    keysPressed.add(e.key.toLowerCase())

    if (e.key === ' ') {
      resetCamera(state)
      syncCameraToMaterial(state, material)
    }
  }

  function onKeyUp(e: KeyboardEvent) {
    keysPressed.delete(e.key.toLowerCase())
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault()
    const delta = -Math.sign(e.deltaY) * zoomSpeed
    moveCamera(state, delta, 0, moveSpeed * 2, maxRadius)
    syncCameraToMaterial(state, material)
  }

  /**
   * Update function to call each frame for continuous movement.
   */
  function update() {
    let forward = 0
    let strafe = 0

    if (keysPressed.has('w') || keysPressed.has('arrowup')) forward += 1
    if (keysPressed.has('s') || keysPressed.has('arrowdown'))
      forward -= 1
    if (keysPressed.has('a') || keysPressed.has('arrowleft'))
      strafe -= 1
    if (keysPressed.has('d') || keysPressed.has('arrowright'))
      strafe += 1

    if (forward !== 0 || strafe !== 0) {
      moveCamera(state, forward, strafe, moveSpeed, maxRadius)
      syncCameraToMaterial(state, material)
    }
  }

  /**
   * Attach event listeners.
   */
  function attach() {
    domElement.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    domElement.addEventListener('wheel', onWheel, { passive: false })
  }

  /**
   * Detach event listeners.
   */
  function detach() {
    domElement.removeEventListener('mousedown', onMouseDown)
    window.removeEventListener('mouseup', onMouseUp)
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    domElement.removeEventListener('wheel', onWheel)
  }

  return { attach, detach, update }
}

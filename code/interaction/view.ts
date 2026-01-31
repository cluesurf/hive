import type { Matrix } from '@/form/matrix'
import type { Point } from '@/form/point'
import type { InteractiveGeometry } from './types'

/**
 * A view manages the current viewpoint transformation for rendering.
 *
 * It works with an InteractiveGeometry to transform points from their
 * original positions to view-transformed positions for display.
 */
export class GeometryView {
  private geometry: InteractiveGeometry
  private transform: Matrix

  constructor(geometry: InteractiveGeometry) {
    this.geometry = geometry
    this.transform = geometry.identityTransform()
  }

  /**
   * Set the current view transform.
   */
  setTransform(transform: Matrix): void {
    this.transform = transform
  }

  /**
   * Get the current view transform.
   */
  getTransform(): Matrix {
    return this.transform
  }

  /**
   * Reset view to identity (original position).
   */
  reset(): void {
    this.transform = this.geometry.identityTransform()
  }

  /**
   * Transform a point from original coordinates to view coordinates.
   */
  transformPoint(point: Point): Point {
    const transformed = this.geometry.applyTransform(this.transform, point)
    return this.geometry.normalizePoint(transformed)
  }

  /**
   * Transform an array of points.
   */
  transformPoints(points: Point[]): Point[] {
    return points.map(p => this.transformPoint(p))
  }

  /**
   * Check if the view has been modified from identity.
   */
  isModified(): boolean {
    const id = this.geometry.identityTransform()
    for (let i = 0; i < this.transform.length; i++) {
      if (Math.abs((this.transform[i] ?? 0) - (id[i] ?? 0)) > 1e-10) {
        return true
      }
    }
    return false
  }
}

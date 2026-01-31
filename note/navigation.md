# Hyperbolic Navigation (Mouse Drag/Pan)

How to implement click-and-drag "scrolling" through a hyperbolic
tessellation.

## The Problem

In Euclidean space, panning is simple: drag the mouse by (dx, dy)
pixels, translate all points by (-dx, -dy). But hyperbolic space is
different. There's no global translation. Instead, we apply hyperbolic
isometries (distance-preserving transformations) that move the
"viewpoint" through the space.

## Core Concept: Moving the Viewpoint

When the user drags in a direction, we want to:

1. Move the "camera" in that direction through hyperbolic space
2. All tiles shift in the opposite direction (like scrolling a map)
3. Tiles near the center get larger, tiles moving toward the edge shrink
4. The transformation preserves hyperbolic distances and angles

This is fundamentally different from Euclidean scrolling because:

- Distances are non-linear (things shrink exponentially toward the
  boundary)
- Straight lines in the Poincare disk are actually circular arcs
- The "amount" of movement depends on where you are in the disk

## Mathematical Foundation

### Hyperbolic Translation = Lorentz Boost

In the hyperboloid model (Minkowski space), hyperbolic translations are
represented by Lorentz boost matrices. A boost moves points along a
geodesic by a hyperbolic distance.

For a boost in direction (ux, uy) by hyperbolic distance d:

```
| 1 + (cosh(d)-1)*ux²    (cosh(d)-1)*ux*uy     sinh(d)*ux |
| (cosh(d)-1)*ux*uy      1 + (cosh(d)-1)*uy²   sinh(d)*uy |
| sinh(d)*ux             sinh(d)*uy            cosh(d)    |
```

This is already implemented in `Hyperbolic2D.translation()`.

### Poincare Disk Interpretation

In the Poincare disk model, a hyperbolic translation corresponds to a
Mobius transformation. When you "pan" by dragging:

- The origin moves to a new point
- All other points shift accordingly
- Circles map to circles (or lines)
- The boundary circle stays fixed

### Converting Mouse Drag to Hyperbolic Distance

The tricky part: a 100-pixel drag near the center of the disk should
move you a different hyperbolic distance than a 100-pixel drag near the
edge.

Two approaches:

**Approach A: Constant Euclidean Sensitivity**

- Drag distance in pixels maps linearly to Poincare disk coordinates
- Near center: small hyperbolic movement
- Near edge: large hyperbolic movement
- Feels natural for small movements

**Approach B: Constant Hyperbolic Sensitivity**

- Drag distance maps to constant hyperbolic distance
- Requires converting pixel distance through the Poincare metric
- More mathematically "correct" but may feel odd near edges

Recommendation: Start with Approach A (simpler), refine later.

## Implementation Plan

### Step 1: Track Mouse State

```
State needed:
- isDragging: boolean
- dragStart: {x, y} in canvas pixels
- dragStartDisk: {u, v} in Poincare disk coordinates
- currentTransform: Matrix (accumulated view transform)
```

### Step 2: Mouse Event Handlers

**onMouseDown:**

1. Set isDragging = true
2. Record dragStart position
3. Convert to disk coordinates: dragStartDisk = canvasToDisk(x, y)

**onMouseMove (while dragging):**

1. Get current position in disk coordinates: currentDisk
2. Compute displacement: delta = currentDisk - dragStartDisk
3. Convert to hyperbolic translation (see Step 3)
4. Apply transform to all tile vertices
5. Re-render

**onMouseUp:**

1. Set isDragging = false
2. Optionally: "commit" the transform to avoid accumulating errors

### Step 3: Computing the Translation

Given drag from point A to point B in the Poincare disk:

1. **Direction**: The direction of translation is from A toward B
2. **Distance**: The hyperbolic distance to translate

For small drags, we can approximate:

```
direction = normalize(B - A)
euclideanDist = |B - A|
hyperbolicDist = 2 * atanh(euclideanDist)  // approximate for small distances
```

For more accuracy, compute the actual hyperbolic distance between A and
B.

### Step 4: Applying the Transform

Two options:

**Option A: Transform All Tile Vertices**

- For each tile, transform each vertex using the boost matrix
- Re-normalize vertices to stay on hyperboloid
- Recompute tile centers
- Simple but may accumulate numerical errors

**Option B: Store View Transform Separately**

- Keep original tile vertices unchanged
- Store a "view transform" matrix
- At render time: transformedVertex = viewTransform \* originalVertex
- More robust, easier to reset

Recommendation: Option B is cleaner and allows easy reset.

### Step 5: Handling the View Transform

The view transform accumulates as the user drags:

```
newViewTransform = dragTransform * currentViewTransform
```

This composition means: first apply current view, then apply the new
drag.

To render a point:

```
hyperboloidPoint = viewTransform * originalHyperboloidPoint
diskPoint = hyperboloidToPoincare(hyperboloidPoint)
canvasPoint = diskToCanvas(diskPoint)
```

## Edge Cases and Considerations

### Numerical Stability

1. **Normalize after transform**: Points may drift off the hyperboloid
   due to floating point errors. Re-normalize after each transform.

2. **Periodic re-centering**: After many drags, consider "re-centering"
   the tessellation by regenerating tiles around the new viewpoint.

### Boundary Behavior

As the user drags toward the edge:

- Points approach the boundary asymptotically
- Never actually reach it (hyperbolic geometry)
- May need to regenerate tiles that come into view
- May need to cull tiles that become too small

### Performance

1. **Throttle updates**: Don't recompute on every mousemove pixel
2. **Transform lazily**: Only transform visible tiles
3. **WebGL batching**: For many tiles, batch the matrix multiply in a
   shader

### Touch Support

Same logic applies:

- touchstart = mousedown
- touchmove = mousemove
- touchend = mouseup
- Handle pinch-to-zoom separately (scaling the view)

## Data Flow Summary

```
Mouse Drag (pixels)
       ↓
Canvas to Disk (Poincare coordinates)
       ↓
Compute Hyperbolic Translation Direction & Distance
       ↓
Build Lorentz Boost Matrix
       ↓
Compose with Current View Transform
       ↓
For Each Tile Vertex:
  - Apply View Transform (hyperboloid space)
  - Project to Poincare Disk
  - Convert to Canvas Coordinates
       ↓
Render
```

## Future Enhancements

1. **Momentum/inertia**: Continue moving after mouse release
2. **Snap to tile**: Option to snap view to center on a tile
3. **Keyboard navigation**: Arrow keys for precise movement
4. **Minimap**: Show current position in the full tiling
5. **Path recording**: Record navigation path for replay

## References

- Hyperbolic isometries: https://en.wikipedia.org/wiki/Hyperbolic_motion
- Lorentz transformation: Used for boosts in Minkowski space
- Mobius transformation: Equivalent approach in Poincare disk model
- Reference implementation: `base/ht.js-make/Extra/Control/Mouse.ts`

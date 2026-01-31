# Hyperbolic Tessellation Engine Architecture

Key insights from implementing hyperbolic tilings like HyperRogue.

## Core Principle: Graph First, Geometry Second

The hyperbolic plane is stored as a **graph with procedural growth**, not as
geometry.

At runtime you need:
- Tiles (cells) with unique IDs
- Adjacency between tiles (neighbors array)
- Optional cached transforms for rendering

No coordinates are required for correctness, only adjacency.

## Data Structure Pattern

### Tile Structure

```typescript
interface Cell {
  id: number
  neighbors: (Cell | null)[]  // size p for {p,q} tiling
  address: MargensternAddress  // combinatorial coordinate
  transform: Matrix | null     // cached for rendering
  data?: unknown               // game/CA state
}
```

### World Storage

```typescript
Map<string, Cell> cellByAddress   // coordinate key -> Cell
Map<string, Cell> cellByHash      // transform hash -> Cell
```

The whole explored world is a hash map. Only stores what you touch.

## Coordinate System: Tree-Word Addresses

Instead of (x,y), tiles use **combinatorial addresses**.

Margenstern style: `sector + treeIndex`

The treeIndex is a path in the spanning tree using Fibonacci/Zeckendorf
representation. Two tiles with the same address are the same tile.

Benefits:
- Infinite address space
- Deterministic neighbor computation
- No floating point drift

## Lazy Instantiation

Tiles are created **on demand** via the `move()` function:

```typescript
function move(cell: Cell, direction: number): Cell {
  // Already exists?
  if (cell.neighbors[direction]) return cell.neighbors[direction]

  // Compute canonical coordinate
  const neighborAddress = computeNeighborAddress(cell.address, direction)

  // Check if exists by address
  let neighbor = cellByAddress.get(addressKey)

  if (!neighbor) {
    // Create new cell
    const neighborTransform = composeSU11(edgeTransform, cell.transform)
    neighbor = createCell(neighborTransform, neighborAddress)
    cellByAddress.set(addressKey, neighbor)
  }

  // Link both directions
  cell.neighbors[direction] = neighbor
  neighbor.neighbors[backDirection] = cell

  return neighbor
}
```

The tiling grows outward only where explored.

## Rendering Layer

Geometry (Poincare disk positions) is derived on the fly:

```typescript
const combined = composeSU11(viewTransform, cell.transform)
const screenPos = applySU11Transform(combined, [0, 0])
```

These positions are recomputed as the camera moves. The combinatorial graph
stays exact even if rendering has floating point issues.

## Navigation and Animation

### Challenge

During animation, we want smooth visual movement but must also ensure the
graph path exists.

### Solution

1. **Visual animation**: Build pure translation transforms for smooth movement
2. **Graph walking**: Separately walk the graph to create cells along the path
3. **Final snap**: At animation end, use the actual cell transform for consistency

```typescript
// During animation frame
view.setTransform(interpolatedTransform)  // Smooth visual
tessellation.walkTowardCell(targetId)     // Create graph path
draw()

// At animation end
const actualTransform = tessellation.navigateToCell(targetId)
view.setTransform(actualTransform)  // Snap to graph-consistent transform
```

### Why This Is Needed

Pure translation transforms don't compose correctly with graph-accumulated
transforms because they lack the rotation component. The visual animation
looks right, but the graph must be walked separately to ensure cells exist.

## Memory Efficiency

Memory grows with explored region, not hyperbolic area.

- O(visible tiles) storage
- Not O(area) which would be exponential

This is why HyperRogue can simulate "infinite" hyperbolic space.

## Key Functions

| Function | Purpose |
|----------|---------|
| `move(cell, dir)` | Lazy neighbor creation |
| `computeNeighborAddress()` | Margenstern coordinate math |
| `getVisibleTiles()` | BFS from center for rendering |
| `updateCenterCell()` | Walk graph toward view center |
| `navigateToCell()` | Set view to center on specific cell |

## References

- HyperRogue source code
- Margenstern (2007/2008) "Cellular Automata in Hyperbolic Spaces"
- note/margenstern-fibonacci-coordinates.md
- note/margenstern-tessellation-implementations.md

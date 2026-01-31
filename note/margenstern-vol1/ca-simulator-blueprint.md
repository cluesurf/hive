# Hyperbolic CA Simulator Blueprint

A practical, buildable blueprint for a simulator that can run CA
variants on regular hyperbolic tilings like {5,4}, {7,3}, and general
{p,q}.

## 1. Core Goals and Non-Goals

### Goals

- Support infinite tilings via sparse storage plus expanding frontier
- Deterministic, reproducible stepping with clear boundary semantics
- Multiple rule modes: oriented and rotation-invariant
- Tooling for debugging: inspect neighborhoods, show causal cones,
  detect motifs
- Responsive rendering while simulated region expands

### Non-Goals Initially

- Exact geometric embedding as source of truth
- Full universality proof machinery
- Perfect adjacency resolution for all {p,q} on day one

## 2. Three-Layer Architecture

Layers that can evolve independently:

| Layer         | Purpose                                   |
| ------------- | ----------------------------------------- |
| Tiling Kernel | Graph definition: coordinates, neighbors  |
| CA Runtime    | State storage, stepping, expansion, rules |
| UX/Inspection | Rendering, controls, probes, persistence  |

**Key insight**: Entangling these layers causes pain when generalizing
from {7,3}/{5,4} to arbitrary {p,q} or adding rotation invariance.

## 3. Tiling Kernel Interface

### Required Operations

```typescript
interface TilingKernel {
  // Edge-neighbors with side information
  neighbors(coord: Coord): Neighbor[]

  // Canonicalize coordinate spelling
  normalize(coord: Coord): Coord

  // Graph distance for ROI and debugging
  distance(a: Coord, b: Coord): number

  // Generate frontier tiles
  enumerateFrontier(seeds: Set<Coord>, budget: number): Coord[]
}

interface Neighbor {
  to: Coord
  sideOut: number // which side we left on
  sideIn?: number // which side we arrive on (for oriented rules)
}
```

### Strongly Recommended

```typescript
interface TilingKernelExtended extends TilingKernel {
  // For rotation-invariant matching
  rotateNeighborhood(coord: Coord, steps: number): Neighbor[]

  // Stable hash key for maps
  coordId(coord: Coord): string
}
```

### Design Insight

Treat "neighbor numbering" and "directed arcs" as first-class. Keep API
shape ready for `(sideOut, sideIn)` because that makes oriented rules
robust when side labels differ across tiles.

## 4. Region Model for Infinite Tiling

### Concepts

| Region        | Description                             |
| ------------- | --------------------------------------- |
| Active R(t)   | Finite set of tiles simulated at step t |
| Boundary B(t) | Adjacent tiles not yet in R(t)          |
| Outside       | Treated as background state or unknown  |

### Two Region Semantics

#### 1. Quiescent Background

Neighbors outside R(t) have state S0 (defined quiescent state).

#### 2. Unknown Semantics

Neighbors outside R(t) are unknown. Rules must either:

- Defer update for that tile
- Expand region to resolve
- Treat unknown as sentinel state

Most people want quiescent background for classical CA behavior.

## 5. State Storage

Hyperbolic growth is exponential. Use sparse storage.

### Data Structures

```typescript
interface CAState {
  current: Map<CoordId, State>
  next: Map<CoordId, State>
  active: Set<CoordId>
  dirty: Set<CoordId> // Tiles that might change next step
  neighborCache: Map<CoordId, Neighbor[]>
  stateIndex?: Map<State, Set<CoordId>> // For motif search
}
```

### Update Set Strategy

**Dirty propagation** (key optimization):

- Dirty set = non-quiescent tiles + their neighbors
- When tile changes, mark itself and neighbors dirty
- Difference between 200k and 2M tiles

### Caching Policy

- Cache neighbors for tiles entering active region
- Store as compact CoordId arrays for speed
- Usually never invalidate (tiling kernel doesn't change)

## 6. Rule System Design

### Three Rule Types

| Type                   | Description                          |
| ---------------------- | ------------------------------------ |
| Totalistic             | Depends on counts of neighbor states |
| Pattern (oriented)     | Ordered neighbor states matter       |
| Pattern (rotation-inv) | Can rotate neighborhood and match    |

### Neighborhood Representation

Canonical ordering for each tile:

- `N[0..k-1]` where k = degree = p for edge-neighbors
- Index 0 often reserved for "father edge" in tree coordinates

Rule input:

```typescript
interface RuleInput {
  centerState: State
  neighborStates: State[] // In canonical order
  sideInfo?: SideInfo[] // For directed semantics
}
```

### Rotation-Invariant Matching

Efficient approach:

1. Get neighbor list in canonical order
2. For each rotation r in 0..(p-1):
   - Rotate neighborStates by r
   - Test rule match
3. Use canonical representative (minimal rotation hash) as lookup key

**Huge performance win when p = 7, 8, 10, 12.**

### Priority and Determinism

If multiple rules match:

- Highest priority wins, or
- First rule in list wins, or
- Most specific wins (fewest wildcards)

Make explicit and stable for debuggability.

## 7. Simulation Step Semantics

### Synchronous Update

Classic CA: compute all new states from old, then swap.

```
1. Ensure dirty tiles have known neighbor states
2. Compute next state for each dirty tile
3. Apply writes to nextStates
4. Swap maps
5. Recompute dirty set from changes
```

### Asynchronous Update

- Random or fixed pseudo-random order
- Apply updates immediately
- Track dirty neighbors
- Tag run with: random seed, schedule type

## 8. Expansion Policy

Critical for hyperbolic CA. Expansion must be controlled.

### Three Policies

| Policy            | Description                             |
| ----------------- | --------------------------------------- |
| Radius-bounded    | All tiles within distance R from origin |
| Activity-driven   | Expand only around non-quiescent tiles  |
| Budgeted frontier | Add up to N tiles per tick              |

### Hybrid Approach

- Radius cap for safety
- Activity-driven inside that cap

### Predictive Expansion

Include at least:

- All neighbors of dirty tiles
- Neighbors of neighbors if rule has range-2 effects

Keep maximum rule radius as part of rule definition.

## 9. Visualization

### Two Views

| View          | Purpose                               |
| ------------- | ------------------------------------- |
| Combinatorial | Spanning tree, tree vs non-tree edges |
| Geometric     | Poincaré disk positions, approximate  |

### Rendering Constraints

- Never draw everything
- Use LOD: aggregated heat maps at zoom-out
- Use instancing: state color as attribute
- Draw region of interest around focus tile

## 10. Inspection and Debugging

### Essential Probes

Click tile to show:

- Coordinate
- Node type, sector, depth
- Neighbor list with side numbers
- Neighborhood state vector
- Which rule fired and why

### Invariant Checkers

- **Reciprocity**: If A lists B, B lists A with corresponding sides
- **Degree**: Each tile has exactly p edge-neighbors
- **Normalization**: Canonicalization doesn't change adjacency

### Causal Cone Tracing

Given tile and time t:

- Walk backwards through dependency graph for k steps
- Show which tiles influenced it and how

**Best way to understand emergent behavior.**

### Motif Library

- Represent motifs as small labeled graphs with constraints
- Search for matches in current state
- Highlight matches

## 11. Reproducibility and Persistence

Export every run as JSON:

```json
{
  "tiling": { "p": 5, "q": 4, "coordinateVersion": "1.0" },
  "rules": [ ... ],
  "initialCondition": [ ["coord1", "state1"], ... ],
  "updateMode": "sync",
  "expansionPolicy": { "type": "radius", "max": 50 },
  "snapshots": [ ... ]
}
```

### Delta Compression

- Store only changed tiles per step
- Checkpoint every N steps with full snapshot
- Critical because hyperbolic regions grow quickly

## 12. Module Boundaries

```
tiling/
  pqKernel.ts         interface
  pentagrid54.ts      {5,4} kernel
  heptagrid73.ts      {7,3} kernel
  pqGeneric.ts        generic engine from grammar specs

ca/
  stateStore.ts       sparse state maps, dirty sets
  ruleTypes.ts        totalistic, pattern, rotation-invariant
  matcher.ts          fast matching and rotation normalization
  runtime.ts          stepping, expansion, snapshots

viz/
  embedDisk.ts        approximate embedding
  render.ts           WebGL or canvas renderer
  inspect.ts          picking, overlays, tooltips

io/
  serialize.ts        snapshots and configs
  load.ts
```

## 13. Implementation Order

### Minimal Correct MVP

1. Implement kernels for {7,3} and {5,4} with stable neighbor ordering
2. Implement synchronous update with quiescent background
3. Implement activity-driven dirty set and bounded radius expansion
4. Implement totalistic rules first (fast, easy to debug)
5. Add oriented pattern rules
6. Add rotation-invariant matching with rotation hashing
7. Add inspectors and reciprocity checks
8. Only then polish embeddings and rendering

## Key Insights

### Why This Architecture

- Three layers allow independent evolution
- Tiling kernel abstraction enables {p,q} generalization
- Dirty propagation makes hyperbolic growth tractable
- Rotation normalization enables efficient pattern matching

### Performance Model

| Operation          | Cost                        |
| ------------------ | --------------------------- |
| Neighbor lookup    | O(1) with cache             |
| Rule matching      | O(p) for rotation-invariant |
| Expansion per step | O(frontier size)            |
| Total step         | O(dirty set size)           |

### Common Pitfalls

1. Entangling tiling logic with CA logic
2. Updating all tiles instead of dirty set
3. No neighbor caching
4. Ignoring side number orientation
5. No deterministic rule priority

# Generalized {p,q} Coordinate Engine

A unified TypeScript engine for any hyperbolic tiling {p,q} following
Margenstern's coordinate philosophy.

## Design Philosophy

From Margenstern's approach:

- Coordinates are always `sector + address`
- The address is a word over a small digit alphabet
- A finite "grammar" (node types + preferred-son rules) determines
  parents, children, neighbors, and shortest paths
- The same engine runs {5,4} and {7,3} by swapping a `TilingSpec`

This is the right abstraction boundary because once you choose a digit
system with a preferred-son property, you can pick the tree structure
that makes rules simplest while keeping coordinates stable.

## Core Type Definitions

```typescript
export type PathDigit = number

export interface TileCoord {
  sector: number // 0..(p-1)
  path: PathDigit[] // tree address inside sector
}

export type NodeType = string

export interface NodeGrammar {
  rootType: NodeType

  // Given a node type, returns the child types in left-to-right order.
  // Example (standard Fibonacci): B -> [B,W], W -> [B,W,W]
  childrenOf(type: NodeType): NodeType[]

  // Optional: return which child index is the "preferred son" for this type.
  // Margenstern uses preferred-son rules to make coordinate/path transforms simple.
  preferredChildIndex?(type: NodeType): number
}

export interface SideRoles {
  // side numbers are 1..p (p sides per tile)
  // side 1 is always the father edge in Margenstern's neighbor numbering.
  fatherSide: 1

  // Which sides go to same-level neighbors, depends on node type.
  // Example {7,3}: W has [2,7], B has [3,7].
  sameLevelSidesByType: Record<NodeType, number[]>

  // Remaining sides (excluding father and same-level) are treated as "downward edges"
  // that map to children in some deterministic order.
  childSidesByType: Record<NodeType, number[]>
}

export interface TilingSpec {
  // Schlafli symbol {p,q} has p-gons, degree p in adjacency graph.
  p: number
  q: number

  // Sector count is typically p in Margenstern's sector splitting around a central tile.
  sectors: number

  grammar: NodeGrammar
  sides: SideRoles

  // Optional: handle what "parent" means at sector root, and crossing sectors.
  // Default: no parent at empty path.
  parentAtSectorRoot?(coord: TileCoord): TileCoord | null

  // Optional: sector rotation when moving "around the center".
  rotateSector?(sector: number, dir: -1 | 1): number
}

export interface Engine {
  spec: TilingSpec

  nodeType(coord: TileCoord): NodeType
  parent(coord: TileCoord): TileCoord | null
  children(coord: TileCoord): TileCoord[]

  prevSibling(coord: TileCoord): TileCoord | null
  nextSibling(coord: TileCoord): TileCoord | null

  neighbors(coord: TileCoord): Array<{ side: number; to: TileCoord }>

  distance(a: TileCoord, b: TileCoord): number
  shortestPath(a: TileCoord, b: TileCoord): TileCoord[]
}
```

## Engine Factory Implementation

```typescript
export function makeEngine(spec: TilingSpec): Engine {
  function nodeType(coord: TileCoord): NodeType {
    let t = spec.grammar.rootType
    for (const d of coord.path) {
      const kids = spec.grammar.childrenOf(t)
      if (d < 0 || d >= kids.length) {
        throw new Error(
          `Invalid digit ${d} for node type ${t} (kids=${kids.length})`,
        )
      }
      t = kids[d]
    }
    return t
  }

  function parent(coord: TileCoord): TileCoord | null {
    if (coord.path.length === 0) {
      return spec.parentAtSectorRoot
        ? spec.parentAtSectorRoot(coord)
        : null
    }
    return { sector: coord.sector, path: coord.path.slice(0, -1) }
  }

  function children(coord: TileCoord): TileCoord[] {
    const t = nodeType(coord)
    const kids = spec.grammar.childrenOf(t)
    return kids.map((_, i) => ({
      sector: coord.sector,
      path: [...coord.path, i],
    }))
  }

  function prevSibling(coord: TileCoord): TileCoord | null {
    const path = coord.path.slice()
    while (path.length > 0) {
      const last = path[path.length - 1]
      if (last > 0) {
        path[path.length - 1] = last - 1
        return { sector: coord.sector, path }
      }
      path.pop()
    }
    return null
  }

  function nextSibling(coord: TileCoord): TileCoord | null {
    const path = coord.path.slice()
    while (path.length > 0) {
      const parentPath = path.slice(0, -1)
      const tParent = nodeType({
        sector: coord.sector,
        path: parentPath,
      })
      const max = spec.grammar.childrenOf(tParent).length - 1
      const last = path[path.length - 1]
      if (last < max) {
        path[path.length - 1] = last + 1
        return { sector: coord.sector, path }
      }
      path.pop()
    }
    return null
  }

  function neighbors(
    coord: TileCoord,
  ): Array<{ side: number; to: TileCoord }> {
    const pSides = spec.p
    const t = nodeType(coord)

    const out: Array<{ side: number; to: TileCoord }> = []

    // Side 1: father edge
    const fa = parent(coord)
    if (fa) out.push({ side: 1, to: fa })

    // Same-level edges: determined by node type
    const sameSides = spec.sides.sameLevelSidesByType[t] ?? []
    const left = prevSibling(coord)
    const right = nextSibling(coord)

    // Deterministic assignment: smaller side -> left, larger side -> right
    const sortedSame = sameSides.slice().sort((a, b) => a - b)
    if (sortedSame.length >= 1 && left)
      out.push({ side: sortedSame[0], to: left })
    if (sortedSame.length >= 2 && right)
      out.push({ side: sortedSame[sortedSame.length - 1], to: right })

    // Child edges: map child indices to specified side numbers
    const childSides = spec.sides.childSidesByType[t] ?? []
    const kids = children(coord)

    for (let i = 0; i < kids.length && i < childSides.length; i++) {
      out.push({ side: childSides[i], to: kids[i] })
    }

    // Sanity: keep only valid sides 1..p
    return out.filter(x => x.side >= 1 && x.side <= pSides)
  }

  function lcaDepth(a: PathDigit[], b: PathDigit[]): number {
    let i = 0
    while (i < a.length && i < b.length && a[i] === b[i]) i++
    return i
  }

  function distance(a: TileCoord, b: TileCoord): number {
    if (a.sector !== b.sector) {
      // Conservative: go up to sector roots and cross.
      return a.path.length + b.path.length + 1
    }
    const k = lcaDepth(a.path, b.path)
    return a.path.length - k + (b.path.length - k)
  }

  function shortestPath(a: TileCoord, b: TileCoord): TileCoord[] {
    if (a.sector !== b.sector) {
      // Simple path: ascend to roots, jump, descend
      const path: TileCoord[] = []
      let cur: TileCoord | null = a
      while (cur && cur.path.length > 0) {
        path.push(cur)
        cur = parent(cur)
      }
      if (cur) path.push(cur)

      // jump sectors at root
      const bRoot: TileCoord = { sector: b.sector, path: [] }
      if (path[path.length - 1].sector !== bRoot.sector)
        path.push(bRoot)

      // descend by replaying b.path
      let down: TileCoord = bRoot
      for (const d of b.path) {
        down = { sector: down.sector, path: [...down.path, d] }
        path.push(down)
      }
      return path
    }

    const k = lcaDepth(a.path, b.path)
    const path: TileCoord[] = []

    // up from a to LCA
    let cur: TileCoord | null = a
    while (cur && cur.path.length > k) {
      path.push(cur)
      cur = parent(cur)
    }
    const lca: TileCoord = cur ?? {
      sector: a.sector,
      path: a.path.slice(0, k),
    }
    path.push(lca)

    // down from LCA to b
    let down: TileCoord = lca
    for (const d of b.path.slice(k)) {
      down = { sector: down.sector, path: [...down.path, d] }
      path.push(down)
    }
    return path
  }

  return {
    spec,
    nodeType,
    parent,
    children,
    prevSibling,
    nextSibling,
    neighbors,
    distance,
    shortestPath,
  }
}
```

## Standard Fibonacci Grammar

Used by both {5,4} and {7,3}:

```typescript
const fibGrammar = {
  rootType: 'W',
  childrenOf(type: string): string[] {
    // Standard Fibonacci tree
    if (type === 'B') return ['B', 'W']
    if (type === 'W') return ['B', 'W', 'W']
    throw new Error(`Unknown node type: ${type}`)
  },
  preferredChildIndex(type: string): number {
    // Margenstern gives preferred-son rules for a 3-digit coordinate variant:
    // black: right son, white: middle son, and preferred son is always white.
    if (type === 'B') return 1
    if (type === 'W') return 1
    return 0
  },
}
```

## {7,3} Ternary Heptagrid Spec

```typescript
export const spec73: TilingSpec = {
  p: 7,
  q: 3,
  sectors: 7,
  grammar: fibGrammar,
  sides: {
    fatherSide: 1,
    sameLevelSidesByType: {
      // From Margenstern: W uses sides 2 and 7, B uses 3 and 7 for same-level.
      W: [2, 7],
      B: [3, 7],
    },
    childSidesByType: {
      // Deterministic mapping of children to remaining sides.
      W: [3, 4, 5], // leaves 6 for "other" relations
      B: [4, 5], // leaves 2,6 besides father and same-level edges
    },
  },
  rotateSector(sector, dir) {
    return (sector + dir + 7) % 7
  },
}
```

## {5,4} Pentagrid Spec

```typescript
export const spec54: TilingSpec = {
  p: 5,
  q: 4,
  sectors: 5,
  grammar: fibGrammar,
  sides: {
    fatherSide: 1,
    sameLevelSidesByType: {
      // Pentagrid: same-level on two sides for W, none for B
      W: [2, 5],
      B: [],
    },
    childSidesByType: {
      W: [3, 4, 5],
      B: [3, 4],
    },
  },
  rotateSector(sector, dir) {
    return (sector + dir + 5) % 5
  },
}
```

## Usage Example

```typescript
import { makeEngine } from './pq-engine-core'
import { spec73, spec54 } from './pq-specs'

const e73 = makeEngine(spec73)
const e54 = makeEngine(spec54)

const a = { sector: 3, path: [0, 2, 1] }
const b = { sector: 3, path: [0, 1] }

console.log(e73.nodeType(a))
console.log(e73.neighbors(a)) // side-labeled neighbors
console.log(e73.distance(a, b))
console.log(e73.shortestPath(a, b))

console.log(e54.neighbors({ sector: 1, path: [1, 0, 2] }))
```

## What's Unified vs Pluggable

### Unified (Fixed Code)

- Coordinate storage format
- Node-type inference from path using finite grammar
- Parent/children/sibling traversal
- LCA-based distance and path in-tree
- Side-labeled neighbor list as public API

### Pluggable (Per Tiling)

- `p, q, sectors`
- A finite `NodeGrammar` (can derive from splitting polynomial and digit
  constraints for many families)
- A `SideRoles` mapping (which edges are father, same-level, child
  edges)

## Extending to New {p,q} Tilings

To add a new tiling:

1. Determine the tree structure (may not be Fibonacci for all tilings)
2. Define the `NodeGrammar` with appropriate node types and branching
3. Map the side numbers to their roles (father, same-level, children)
4. Create a `TilingSpec` and pass it to `makeEngine()`

The core engine stays unchanged.

## Future Extensions

For complete neighbor coverage on all sides:

1. **Strict `neighborsAllSides`**: Return all p neighbors with back-side
   info

   ```typescript
   neighborsAllSides(coord): Array<{
     side: number
     to: TileCoord
     backSide: number
   }>
   ```

2. **Arc labels as ordered pairs (a,b)**: Margenstern uses this for
   disambiguation when a single side number is ambiguous across tiles

3. **Rewrite rules for path normalization**: Rightmost/leftmost
   shortest-path normal forms using path word rewrite rules

## Notes on Margenstern's Approach

- The standard Fibonacci tree plays the same role in both {5,4} and
  {7,3}
- Coordinate systems can stay stable even if you change the underlying
  tree, as long as preferred-son rules hold and digit constraints are
  respected
- For {7,3}, same-level sides are explicitly marked by node type
- Edge-direction ambiguity is handled with ordered pairs (a,b) for moves

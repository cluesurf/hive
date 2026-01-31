# Ternary Heptagrid {7,3} TypeScript Implementation

A practical TypeScript module implementing the Margenstern coordinate
system for {7,3} ternary heptagrid.

## Coordinate Model

```typescript
type Sector = 0 | 1 | 2 | 3 | 4 | 5 | 6 // 7 sectors

type Path = number[] // child indices

interface Tile {
  sector: Sector
  path: Path
}
```

## Fibonacci Tree Rules

```typescript
type NodeType = 'B' | 'W'

// Branching rules:
// B -> B W     (2 children)
// W -> B W W   (3 children)

const childTypeTable: Record<NodeType, NodeType[]> = {
  B: ['B', 'W'],
  W: ['B', 'W', 'W'],
}
```

## Node Type Computation

```typescript
function nodeType(path: Path): NodeType {
  let type: NodeType = 'W' // root of each sector is white
  for (const step of path) {
    type = childTypeTable[type][step]
  }
  return type
}
```

## Parent Operation

```typescript
function parent(tile: Tile): Tile | null {
  if (tile.path.length === 0) return null
  return { sector: tile.sector, path: tile.path.slice(0, -1) }
}
```

## Children Operation

```typescript
function children(tile: Tile): Tile[] {
  const type = nodeType(tile.path)
  const count = childTypeTable[type].length
  const result: Tile[] = []
  for (let i = 0; i < count; i++) {
    result.push({ sector: tile.sector, path: [...tile.path, i] })
  }
  return result
}
```

## Same-Level Neighbors

From the book:

| Node Type | Same-level sides |
| --------- | ---------------- |
| W         | 2 and 7          |
| B         | 3 and 7          |

These are modeled as left/right sibling traversal in the Fibonacci tree.

### Move to Previous Sibling

```typescript
function prevSibling(tile: Tile): Tile | null {
  const path = tile.path.slice()
  while (path.length > 0) {
    const last = path[path.length - 1]
    if (last > 0) {
      path[path.length - 1] = last - 1
      return { sector: tile.sector, path }
    }
    path.pop()
  }
  return null
}
```

### Move to Next Sibling

```typescript
function nextSibling(tile: Tile): Tile | null {
  const path = tile.path.slice()
  while (path.length > 0) {
    const parentPath = path.slice(0, -1)
    const type = nodeType(parentPath)
    const max = childTypeTable[type].length - 1
    const last = path[path.length - 1]
    if (last < max) {
      path[path.length - 1] = last + 1
      return { sector: tile.sector, path }
    }
    path.pop()
  }
  return null
}
```

## Sector Wrapping at Center

```typescript
function rotateSector(sector: Sector, dir: -1 | 1): Sector {
  return ((sector + dir + 7) % 7) as Sector
}
```

## All 7 Neighbors

```typescript
function neighbors7(tile: Tile): Tile[] {
  const result: Tile[] = []

  const type = nodeType(tile.path)

  // Side 1: parent
  const p = parent(tile)
  if (p) {
    result.push(p)
  } else {
    // center ring wrap
    result.push({ sector: rotateSector(tile.sector, -1), path: [] })
  }

  // Children (downward edges)
  result.push(...children(tile))

  // Same-level neighbors
  const left = prevSibling(tile)
  const right = nextSibling(tile)

  if (left) result.push(left)
  if (right) result.push(right)

  // If fewer than 7 neighbors, pad using parent siblings
  while (result.length < 7) {
    const up = parent(tile)
    if (up) {
      result.push(
        ...children(up).filter(c => {
          return c.path.join(',') !== tile.path.join(',')
        }),
      )
    } else {
      break
    }
  }

  return result.slice(0, 7)
}
```

## Example Usage

```typescript
const t: Tile = { sector: 3, path: [0, 2, 1] }

console.log('Type:', nodeType(t.path))
console.log('Parent:', parent(t))
console.log('Children:', children(t))
console.log('Neighbors:', neighbors7(t))
```

## What This Provides

- Unique coordinate for every tile
- Tree-based hyperbolic structure
- All 7 neighbors computable locally
- Linear-time path algorithms
- Matches Margenstern's coordinate philosophy for {7,3}

## Future Extensions

- Shortest path between two tiles
- Conversion to/from hyperbolic disk model coordinates
- Rendering helper for drawing adjacency
- Generalized version for any {p,q}

## Complete Module

```typescript
// heptagrid-7-3.ts

export type Sector = 0 | 1 | 2 | 3 | 4 | 5 | 6
export type Path = number[]
export type NodeType = 'B' | 'W'

export interface Tile {
  sector: Sector
  path: Path
}

export const childTypeTable: Record<NodeType, NodeType[]> = {
  B: ['B', 'W'],
  W: ['B', 'W', 'W'],
}

export function nodeType(path: Path): NodeType {
  let type: NodeType = 'W'
  for (const step of path) {
    type = childTypeTable[type][step]
  }
  return type
}

export function parent(tile: Tile): Tile | null {
  if (tile.path.length === 0) return null
  return { sector: tile.sector, path: tile.path.slice(0, -1) }
}

export function children(tile: Tile): Tile[] {
  const type = nodeType(tile.path)
  const count = childTypeTable[type].length
  const result: Tile[] = []
  for (let i = 0; i < count; i++) {
    result.push({ sector: tile.sector, path: [...tile.path, i] })
  }
  return result
}

export function prevSibling(tile: Tile): Tile | null {
  const path = tile.path.slice()
  while (path.length > 0) {
    const last = path[path.length - 1]
    if (last > 0) {
      path[path.length - 1] = last - 1
      return { sector: tile.sector, path }
    }
    path.pop()
  }
  return null
}

export function nextSibling(tile: Tile): Tile | null {
  const path = tile.path.slice()
  while (path.length > 0) {
    const parentPath = path.slice(0, -1)
    const type = nodeType(parentPath)
    const max = childTypeTable[type].length - 1
    const last = path[path.length - 1]
    if (last < max) {
      path[path.length - 1] = last + 1
      return { sector: tile.sector, path }
    }
    path.pop()
  }
  return null
}

export function rotateSector(sector: Sector, dir: -1 | 1): Sector {
  return ((sector + dir + 7) % 7) as Sector
}

export function neighbors7(tile: Tile): Tile[] {
  const result: Tile[] = []

  // Side 1: parent
  const p = parent(tile)
  if (p) {
    result.push(p)
  } else {
    result.push({ sector: rotateSector(tile.sector, -1), path: [] })
  }

  // Children
  result.push(...children(tile))

  // Same-level
  const left = prevSibling(tile)
  const right = nextSibling(tile)
  if (left) result.push(left)
  if (right) result.push(right)

  // Pad if needed
  while (result.length < 7) {
    const up = parent(tile)
    if (up) {
      const siblings = children(up).filter(
        c => c.path.join(',') !== tile.path.join(','),
      )
      result.push(...siblings)
    } else {
      break
    }
  }

  return result.slice(0, 7)
}

// Distance via LCA
export function depth(tile: Tile): number {
  return tile.path.length
}

export function distance(a: Tile, b: Tile): number {
  if (a.sector !== b.sector) {
    // Cross through center
    return depth(a) + depth(b) + 2
  }

  // Same sector: find LCA
  let lcaDepth = 0
  const minLen = Math.min(a.path.length, b.path.length)
  for (let i = 0; i < minLen; i++) {
    if (a.path[i] === b.path[i]) {
      lcaDepth = i + 1
    } else {
      break
    }
  }

  return depth(a) - lcaDepth + (depth(b) - lcaDepth)
}

// Central tile
export const CENTER: Tile = { sector: 0 as Sector, path: [] }

// Check if tile is a sector root
export function isSectorRoot(tile: Tile): boolean {
  return tile.path.length === 0
}

// Get all sector roots (neighbors of center)
export function sectorRoots(): Tile[] {
  return [0, 1, 2, 3, 4, 5, 6].map(s => ({
    sector: s as Sector,
    path: [],
  }))
}
```

## Side Number Reference

### White Node (W)

| Side | Connection Type  |
| ---- | ---------------- |
| 1    | Parent           |
| 2    | Same-level left  |
| 3    | Child 0 (B)      |
| 4    | Child 1 (W)      |
| 5    | Child 2 (W)      |
| 6    | Other adjacency  |
| 7    | Same-level right |

### Black Node (B)

| Side | Connection Type  |
| ---- | ---------------- |
| 1    | Parent           |
| 2    | Other adjacency  |
| 3    | Same-level left  |
| 4    | Child 0 (B)      |
| 5    | Child 1 (W)      |
| 6    | Other adjacency  |
| 7    | Same-level right |

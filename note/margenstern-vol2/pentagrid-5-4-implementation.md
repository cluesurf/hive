# Pentagrid {5,4} TypeScript Implementation

A practical TypeScript module implementing the Margenstern coordinate
system for {5,4} pentagrid.

## Coordinate Model

```typescript
type Sector = 0 | 1 | 2 | 3 | 4  // 5 sectors

type Path = number[]

interface Tile {
  sector: Sector
  path: Path
}
```

## Fibonacci Tree (Pentagrid Version)

Same standard Fibonacci grammar as in the book:

```
B -> B W     (2 children)
W -> B W W   (3 children)
```

```typescript
type NodeType = 'B' | 'W'

const childTypeTable: Record<NodeType, NodeType[]> = {
  B: ['B', 'W'],
  W: ['B', 'W', 'W']
}

function nodeType(path: Path): NodeType {
  let type: NodeType = 'W'
  for (const step of path) {
    type = childTypeTable[type][step]
  }
  return type
}
```

## Parent

```typescript
function parent(tile: Tile): Tile | null {
  if (tile.path.length === 0) return null
  return { sector: tile.sector, path: tile.path.slice(0, -1) }
}
```

## Children

```typescript
function children(tile: Tile): Tile[] {
  const type = nodeType(tile.path)
  return childTypeTable[type].map((_, i) => ({
    sector: tile.sector,
    path: [...tile.path, i]
  }))
}
```

## Same-Level Neighbors in {5,4}

**Key geometric difference vs {7,3}**:

In the pentagrid, **same-level neighbors only exist for white nodes**.
Black nodes have only parent + children neighbors at that level.

| Node Type | Same-level neighbors |
|-----------|----------------------|
| W         | yes (2)              |
| B         | none                 |

### Previous Sibling

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

### Next Sibling

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

## Sector Wrap at Root

```typescript
function rotateSector(sector: Sector, dir: -1 | 1): Sector {
  return ((sector + dir + 5) % 5) as Sector
}
```

## All 5 Neighbors

Each pentagon has 5 neighbors.

```typescript
function neighbors5(tile: Tile): Tile[] {
  const result: Tile[] = []

  const p = parent(tile)
  if (p) {
    result.push(p)
  } else {
    result.push({ sector: rotateSector(tile.sector, -1), path: [] })
  }

  const kids = children(tile)
  result.push(...kids)

  if (nodeType(tile.path) === 'W') {
    const left = prevSibling(tile)
    const right = nextSibling(tile)
    if (left) result.push(left)
    if (right) result.push(right)
  }

  return result.slice(0, 5)
}
```

## Shortest Path (LCA Logic)

```typescript
function lca(a: Path, b: Path): number {
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  return i
}

function distance(a: Tile, b: Tile): number {
  if (a.sector !== b.sector) {
    return a.path.length + b.path.length + 1
  }
  const k = lca(a.path, b.path)
  return (a.path.length - k) + (b.path.length - k)
}
```

## Hyperbolic Disk Embedding Helper

Rough radial placement for rendering:

```typescript
function hyperbolicPosition(tile: Tile) {
  const depth = tile.path.length
  const angle = (2 * Math.PI / 5) * tile.sector
  const r = 1 - Math.exp(-depth * 0.7) // exponential spacing

  return {
    x: r * Math.cos(angle),
    y: r * Math.sin(angle)
  }
}
```

This places sectors evenly and expands outward hyperbolically.

## Example Usage

```typescript
const t: Tile = { sector: 2, path: [1, 0, 2] }

console.log(nodeType(t.path))
console.log(parent(t))
console.log(children(t))
console.log(neighbors5(t))
console.log(distance(t, { sector: 2, path: [1] }))
console.log(hyperbolicPosition(t))
```

## Complete Module

```typescript
// pentagrid-5-4.ts

export type Sector = 0 | 1 | 2 | 3 | 4
export type Path = number[]
export type NodeType = 'B' | 'W'

export interface Tile {
  sector: Sector
  path: Path
}

export const childTypeTable: Record<NodeType, NodeType[]> = {
  B: ['B', 'W'],
  W: ['B', 'W', 'W']
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
  return childTypeTable[type].map((_, i) => ({
    sector: tile.sector,
    path: [...tile.path, i]
  }))
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
  return ((sector + dir + 5) % 5) as Sector
}

export function neighbors5(tile: Tile): Tile[] {
  const result: Tile[] = []

  const p = parent(tile)
  if (p) {
    result.push(p)
  } else {
    result.push({ sector: rotateSector(tile.sector, -1), path: [] })
  }

  result.push(...children(tile))

  if (nodeType(tile.path) === 'W') {
    const left = prevSibling(tile)
    const right = nextSibling(tile)
    if (left) result.push(left)
    if (right) result.push(right)
  }

  return result.slice(0, 5)
}

export function lca(a: Path, b: Path): number {
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  return i
}

export function distance(a: Tile, b: Tile): number {
  if (a.sector !== b.sector) {
    return a.path.length + b.path.length + 1
  }
  const k = lca(a.path, b.path)
  return (a.path.length - k) + (b.path.length - k)
}

export function depth(tile: Tile): number {
  return tile.path.length
}

export function hyperbolicPosition(tile: Tile) {
  const d = tile.path.length
  const angle = (2 * Math.PI / 5) * tile.sector
  const r = 1 - Math.exp(-d * 0.7)

  return {
    x: r * Math.cos(angle),
    y: r * Math.sin(angle)
  }
}

// Central tile (represents center of pentagrid)
export const CENTER: Tile = { sector: 0 as Sector, path: [] }

export function isSectorRoot(tile: Tile): boolean {
  return tile.path.length === 0
}

export function sectorRoots(): Tile[] {
  return [0, 1, 2, 3, 4].map(s => ({
    sector: s as Sector,
    path: []
  }))
}
```

## Side Number Reference (Pentagrid)

### White Node (W)

| Side | Connection Type            |
|------|----------------------------|
| 1    | Parent                     |
| 2    | Same-level left            |
| 3    | Child 0 (B)                |
| 4    | Child 1 (W)                |
| 5    | Same-level right           |

### Black Node (B)

| Side | Connection Type            |
|------|----------------------------|
| 1    | Parent                     |
| 2    | Child 0 (B)                |
| 3    | Child 1 (W)                |
| 4    | Other adjacency            |
| 5    | Other adjacency            |

## Comparison: {5,4} vs {7,3}

| Aspect              | {5,4}               | {7,3}               |
|---------------------|---------------------|---------------------|
| Sides per tile      | 5                   | 7                   |
| Sectors             | 5                   | 7                   |
| Same-level for W    | Yes (sides 2, 5)    | Yes (sides 2, 7)    |
| Same-level for B    | **No**              | Yes (sides 3, 7)    |
| B children          | 2                   | 2                   |
| W children          | 3                   | 3                   |
| Tree grammar        | Same                | Same                |

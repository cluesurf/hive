# Hyperbolic Coordinate Systems for Cellular Automata

## The Core Insight

Hyperbolic cellular automata become practical only when you stop thinking
"continuous hyperbolic geometry" and start thinking "discrete coordinate
systems that let me index neighbors fast."

**The winning approach**: Use trees, not geometry.

In Euclidean grids you use (x, y, z). In hyperbolic tilings:

1. Represent the tiling as one or more spanning trees
2. Give each cell a tree-based address (a digit string)
3. Compute neighbors using local rewrite rules on that string

This avoids floating point hyperbolic math entirely. The explosion of area
in hyperbolic space makes tree structures a natural fit.

## Coordinate System Approaches

### 1. Fibonacci Tree Coordinates (Margenstern System)

The classic and most important system for CA implementation.

**Key paper**: Margenstern et al. "Cellular Automata in the Hyperbolic Plane:
Proposal for a New Environment" (2004)

**How it works**:

- Split tiling into sectors around a central tile
- Each sector represented by a Fibonacci tree
- Each node has a coordinate that is a Fibonacci-based digit string
- Neighbors computed by digit manipulations, not geometry

**Cell address format**:

```
sector_id + tree_word
```

Where `tree_word` is a sequence of digits obeying constraints (no consecutive
1s in standard Fibonacci representation).

**Why this is brilliant**:

- No floating point
- No hyperbolic trig
- Infinite grid via finite strings
- Neighbor finding becomes string surgery

This is the system most HyperRogue-like engines implicitly reinvent.

### 2. Generalized {p,q} Tree Coordinates

Margenstern later generalized the Fibonacci approach for any regular tiling.

**Key insight**: You can build coordinate trees for many regular tilings
{p,q}, not just {5,4} and {7,3}.

- The branching factor of the tree depends on p and q
- The digit constraints change, but the idea stays the same
- A cell is a node in a combinatorial tree
- Neighbors obtained by moving to parent, children, or lateral siblings

This is the foundation for a general hyperbolic grid engine.

### 3. Barycentric / Simplex Coordinates

Used more in:

- Hyperbolic mesh generation
- Finite element methods
- Geometric modeling

**Not typically used for CA** because:

- Requires floating point
- Neighbor lookup is slower
- Harder to guarantee exact adjacency

Still useful for hybrid geometric + combinatorial engines.

### 4. Group-Theoretic Coordinates (Cayley Graph View)

Treat the tiling as a Cayley graph of a group:

- Each tile coordinate is a word in generators
- Neighbors obtained by multiplying by generator symbols

**Pros**:

- Extremely general
- Elegant
- Works in higher dimensions

**Cons**:

- Words grow long
- Need word-reduction rules
- Harder to optimize for real-time engines

Relevant for mathematically clean symmetry handling.

### 5. Hyperbolic 3D Coordinates

Same philosophy for 3D hyperbolic honeycombs:

- Use a spanning tree of cells
- Each cell gets a word describing its path from the root
- Neighbors correspond to small edits in the word

For {7,3,3} or other honeycomb engines:

- Build a BFS tree of cells
- Store each cell's parent and local face index
- Use local rewrite tables to find neighbors

**Key point**: Tree + local rules > geometry (even in 3D).

## Why This Matters for Cellular Automata

Cellular automata need:

- Fast neighbor lookup
- Rotation-consistent neighborhoods
- Infinite but finitely representable grids

Tree/Fibonacci coordinate systems provide:

- O(length of address) neighbor computation
- Deterministic adjacency
- No distortion or projection artifacts

This is why almost all hyperbolic CA universality constructions rely on
these systems.

## Practical Reading Path

### For coordinates specifically:

1. **Margenstern – "Cellular Automata in the Hyperbolic Plane: Proposal
   for a New Environment"**
   - Fibonacci tree coordinates for pentagrid/heptagrid
   - See `note/margenstern-fibonacci-addressing.md` for detailed notes

2. **Margenstern – papers on coordinates for triangular and general {p,q}
   tilings**
   - Generalization of the tree method

3. **Margenstern – book "Cellular Automata in Hyperbolic Spaces, Volume I"**
   - Collects and systematizes coordinate systems

After understanding coordinates, universality papers make much more sense
because you can visualize where signals are traveling in the tree.

## Implementation Strategy for @cluesurf/hive

### Data Structure for Fibonacci-Tree Coordinates

```typescript
// code/tiling/fibonacci-coords.ts

/**
 * A cell address in the Fibonacci tree coordinate system.
 * Works for {5,4} pentagrid and {7,3} heptagrid.
 */
interface FibonacciAddress {
  /** Sector ID: 0 = central, 1..nbSides = basic regions */
  sector: number

  /** Tree word: Fibonacci digit sequence (no consecutive 1s) */
  word: Uint8Array

  /** Cached: is this a 3-node (even trailing zeros) or 2-node (odd)? */
  is3Node: boolean
}

/**
 * Create address for central cell.
 */
function centralAddress(): FibonacciAddress {
  return { sector: 0, word: new Uint8Array(0), is3Node: true }
}

/**
 * Create address for a sector leader.
 */
function sectorLeader(sector: number): FibonacciAddress {
  return { sector, word: new Uint8Array([1]), is3Node: false }
}

/**
 * Get the parent of a cell (null for central cell).
 */
function getParent(addr: FibonacciAddress): FibonacciAddress | null {
  if (addr.sector === 0) return null  // Central has no parent
  if (addr.word.length === 0) return centralAddress()  // Sector leader's parent is central

  // Remove last 2 digits and adjust
  const parentWord = addr.word.slice(0, -2)
  // ... (see margenstern-fibonacci-addressing.md for rules)
}

/**
 * Get children of a cell (2 or 3 depending on node type).
 */
function getChildren(addr: FibonacciAddress): FibonacciAddress[] {
  // Apply rules from margenstern-fibonacci-addressing.md
}

/**
 * Get neighbor through a specific side.
 * This is the core operation for CA.
 */
function getNeighbor(
  addr: FibonacciAddress,
  side: number,
  nbSides: number,
): FibonacciAddress {
  // Pattern match on word to find neighbor
  // See Figure 3 in Margenstern paper for complete lookup table
}
```

### Sparse Cell Storage

```typescript
// code/tiling/sparse-hyperbolic-grid.ts

/**
 * Sparse storage for hyperbolic CA cells.
 * Uses Fibonacci addresses as keys.
 */
class SparseHyperbolicGrid<T> {
  private cells = new Map<string, T>()

  private addressToKey(addr: FibonacciAddress): string {
    return `${addr.sector}:${Array.from(addr.word).join('')}`
  }

  get(addr: FibonacciAddress): T | undefined {
    return this.cells.get(this.addressToKey(addr))
  }

  set(addr: FibonacciAddress, value: T): void {
    this.cells.set(this.addressToKey(addr), value)
  }

  /**
   * Get all neighbors of a cell.
   */
  getNeighbors(addr: FibonacciAddress, nbSides: number): (T | undefined)[] {
    const neighbors: (T | undefined)[] = []
    for (let side = 1; side <= nbSides; side++) {
      const neighborAddr = getNeighbor(addr, side, nbSides)
      neighbors.push(this.get(neighborAddr))
    }
    return neighbors
  }

  /**
   * Iterate over all stored cells.
   */
  *entries(): IterableIterator<[FibonacciAddress, T]> {
    for (const [key, value] of this.cells) {
      yield [keyToAddress(key), value]
    }
  }
}
```

### Integration with Rendering

The coordinate system is purely combinatorial. For rendering:

1. **Tree walk for display**: Use receiver/giver paradigm
2. **Compute geometry lazily**: Only compute Poincaré coords when rendering
3. **Cache vertex positions**: Associate each address with cached vertices
4. **Garbage collect**: Remove cached geometry for distant cells

```typescript
/**
 * Get Poincaré disk vertices for a cell.
 * Computed lazily and cached.
 */
function getCellVertices(
  addr: FibonacciAddress,
  cache: Map<string, Point[]>,
  basePolygon: Point[],
): Point[] {
  const key = addressToKey(addr)
  if (cache.has(key)) return cache.get(key)!

  // Compute transform from address
  const transform = computeTransformFromAddress(addr)

  // Apply transform to base polygon
  const vertices = basePolygon.map(p => applyMobius(transform, p))

  cache.set(key, vertices)
  return vertices
}
```

## Generalized {p,q} Tree Coordinates (Deep Dive)

### The Key Insight: Fibonacci is Not Special

The Fibonacci coordinate system for {5,4} and {7,3} is not a one-off trick.
It is the **first example of a whole family** of coordinate systems for
hyperbolic tilings where:

- Cells = nodes in constrained trees
- Coordinates = words in a formal language
- Geometry = combinatorics
- Neighborhood = local word rewrite

### From Fibonacci Trees to General {p,q} Trees

**Key paper**: Margenstern - "Coordinates for a new triangular tiling of
the hyperbolic plane"

Instead of only pentagons or heptagons, this studies triangular tilings
that still admit tree-based coordinate systems.

**Key insights**:

1. The tiling can be partitioned into **sectors** around a central tile
2. Each sector corresponds to a **rooted tree**
3. Nodes in the tree correspond to tiles
4. Each node gets a coordinate = finite word over a digit alphabet
5. Allowed words follow **local combinatorial constraints** from tiling angles

So the "Fibonacci rule" becomes a **special case of a broader class of
digit-constraint trees**.

### General Framework for Any {p,q}

Across multiple papers, Margenstern builds a general recipe:

> Any regular hyperbolic tiling {p,q} can be decomposed into sectors that
> are spanned by trees whose branching rules are derived from p and q.

### Coordinate Structure

A tile coordinate has two parts:

```
(sector_number, tree_word)
```

**Sector number**: Identifies which wedge of the tiling the tile lies in.

**Tree word**: A digit string describing path from sector root down a
spanning tree.

### Branching Rules Derive from {p,q}

The branching pattern of the tree is determined by:

- How many tiles meet at a vertex (q)
- How many sides the polygon has (p)
- The angular defect that makes the tiling hyperbolic

This produces:

- A finite digit alphabet
- A grammar of allowed digit sequences
- A parent/child relation
- Explicit neighbor-finding rules via string rewrites

### Why Trees Work for Hyperbolic Space

Hyperbolic tilings expand exponentially.
Trees also expand exponentially.

So a spanning tree can cover a sector **without the distortion problems**
Euclidean coordinates would have.

The combinatorics of how tiles touch exactly match the combinatorics of
how nodes branch in the tree.

Instead of `(x, y)` with trig, you get `digit_string` with grammar.

This is **discrete, exact, and CA-friendly**.

### Neighbor Computation in Generalized Coordinates

In the generalized {p,q} system, a tile's neighbors are found by:

1. **Parent** in the tree
2. **Children** in the tree
3. **Lateral neighbors** (cousins) determined by small local digit edits

Neighbors come from **local transformations of the coordinate word**,
not from geometry. This is exactly what CA rules need.

### Book Reference

**Cellular Automata in Hyperbolic Spaces Volume I** consolidates:

- Sector decomposition
- Tree construction
- Digit systems
- Algorithms for neighbor computation
- Examples for multiple {p,q} tilings

This is the most implementation-ready reference for the generalized method.

### Relationship to CA Universality

Once these coordinate systems exist, universality constructions use them
as the underlying grid engine:

- Encode tracks and signals in tiles
- Use coordinate-local rules
- Never rely on geometry, only adjacency

All universality proofs depend on these coordinate systems.

## Generic {p,q} Coordinate Engine Design

### TypeScript Architecture

```typescript
// code/tiling/generic-pq-coords.ts

/**
 * Configuration for a {p,q} tiling coordinate system.
 * Derived from p (polygon sides) and q (tiles meeting at vertex).
 */
interface TilingConfig {
  p: number  // sides per polygon
  q: number  // polygons per vertex

  // Derived values
  numSectors: number        // = p (sectors around central tile)
  digitAlphabet: number[]   // allowed digits in tree words
  branchingRules: BranchingRule[]  // grammar for valid words
}

/**
 * A branching rule specifies what children a node can have
 * based on the suffix of its coordinate word.
 */
interface BranchingRule {
  /** Pattern to match at end of parent word */
  suffixPattern: number[]

  /** Node type this pattern indicates */
  nodeType: 'A' | 'B' | 'C'  // etc.

  /** Children this node type produces */
  children: { digit: number; type: 'A' | 'B' | 'C' }[]
}

/**
 * Compute tiling configuration from {p,q}.
 */
function computeTilingConfig(p: number, q: number): TilingConfig {
  // The angular defect determines the hyperbolic geometry
  // (p-2)(q-2) > 4 for hyperbolic tilings

  // Number of sectors = number of sides of central polygon
  const numSectors = p

  // Digit alphabet and rules depend on specific {p,q}
  // This is where the math gets interesting...
  const { alphabet, rules } = deriveBranchingRules(p, q)

  return {
    p, q,
    numSectors,
    digitAlphabet: alphabet,
    branchingRules: rules,
  }
}

/**
 * Derive branching rules from {p,q} parameters.
 * This encodes the combinatorics of the tiling.
 */
function deriveBranchingRules(
  p: number,
  q: number,
): { alphabet: number[]; rules: BranchingRule[] } {
  // For {5,4}: Fibonacci rules (no consecutive 1s)
  // For {7,3}: Same tree structure, different side mapping
  // For {p,q} general: Derived from vertex/edge combinatorics

  // This is the core mathematical content of Margenstern's work
  // Each {p,q} has its own rule set

  // Placeholder - actual implementation would have
  // specific rules for each supported {p,q}
  throw new Error(`Rules for {${p},${q}} not yet implemented`)
}
```

### Generic Coordinate Type

```typescript
/**
 * A cell address in a generic {p,q} tree coordinate system.
 */
interface GenericAddress {
  /** Tiling configuration this address belongs to */
  config: TilingConfig

  /** Sector ID: 0 = central, 1..numSectors = basic regions */
  sector: number

  /** Tree word: digit sequence following grammar rules */
  word: number[]
}

/**
 * Get parent of a cell.
 */
function getParent(addr: GenericAddress): GenericAddress | null {
  if (addr.sector === 0) return null
  if (addr.word.length === 0) {
    return { config: addr.config, sector: 0, word: [] }
  }

  // Remove last digit(s) according to rules
  // (details depend on branching structure)
  const parentWord = computeParentWord(addr.word, addr.config)
  return { config: addr.config, sector: addr.sector, word: parentWord }
}

/**
 * Get children of a cell.
 */
function getChildren(addr: GenericAddress): GenericAddress[] {
  // Find which branching rule applies
  const rule = findMatchingRule(addr.word, addr.config)

  // Generate children according to rule
  return rule.children.map(child => ({
    config: addr.config,
    sector: addr.sector,
    word: [...addr.word, child.digit],
  }))
}

/**
 * Get neighbor through a specific side.
 */
function getNeighbor(
  addr: GenericAddress,
  side: number,
): GenericAddress {
  // Side numbering: 1..p-1 are tree neighbors, p is parent side

  if (side === addr.config.p) {
    // Parent side
    return getParent(addr) ?? addr  // or handle central specially
  }

  // Other sides: use lookup tables derived from {p,q}
  // This is where the "string surgery" happens
  return computeLateralNeighbor(addr, side)
}
```

### Supported Tilings Registry

```typescript
/**
 * Registry of supported {p,q} tilings with their coordinate rules.
 */
const SUPPORTED_TILINGS: Map<string, TilingConfig> = new Map()

// {5,4} pentagrid - Fibonacci rules
SUPPORTED_TILINGS.set('5,4', {
  p: 5, q: 4,
  numSectors: 5,
  digitAlphabet: [0, 1],
  branchingRules: FIBONACCI_RULES,
})

// {7,3} heptagrid - Same tree, different sides
SUPPORTED_TILINGS.set('7,3', {
  p: 7, q: 3,
  numSectors: 7,
  digitAlphabet: [0, 1],
  branchingRules: FIBONACCI_RULES,  // Same rules!
})

// {4,5} - Four squares meeting at each vertex
// (Would need different rules)

// {3,7} - Triangular tiling, 7 triangles per vertex
// (Margenstern's triangular tiling paper)

function getTilingConfig(p: number, q: number): TilingConfig {
  const key = `${p},${q}`
  const config = SUPPORTED_TILINGS.get(key)
  if (!config) {
    throw new Error(`Tiling {${p},${q}} not yet supported`)
  }
  return config
}
```

## Key Takeaways

1. **Trees beat geometry** for hyperbolic CA
2. **Fibonacci constraints** encode the combinatorics of {5,4} and {7,3}
3. **Neighbor = string surgery** not trigonometry
4. **Same pattern generalizes** to any {p,q} with derived branching rules
5. **Rendering is separate** from the coordinate system
6. **The viewpoint bridges**: Hyperbolic geometry → Data structures → CA implementation

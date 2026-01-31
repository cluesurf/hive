# Margenstern's Pentagrid Coordinate System

**Citation:**

Margenstern, M. (2002). New tools for cellular automata in the
hyperbolic plane. _Theoretical Computer Science_, 296(3), 405-442.
https://doi.org/10.1016/S0304-3975(02)00660-6

**Local copy:** `./base/papers/1-s2.0-S0304397502006606-main.pdf`

## Overview

This paper establishes a coordinate system for the hyperbolic {5,4}
pentagrid (regular pentagons with 4 meeting at each vertex) and uses it
to prove that a universal cellular automaton can be constructed on it.
The key innovation is using Fibonacci trees and Zeckendorf
representation to uniquely address every cell with a positive integer.

## The Fundamental Problem

### Why Hyperbolic Coordinates Are Hard

In Euclidean space, we have translation symmetry. The group of
translations forms a normal subgroup of isometries, allowing a natural
grid coordinate system (x, y).

In hyperbolic space:

- No translation subgroup exists
- The isometry group has no normal subgroups that induce coordinates
- There is no "natural" coordinate system
- Each tiling requires a custom approach

### The Solution: Tree Decomposition

The hyperbolic plane's exponential growth makes it naturally tree-like.
Margenstern exploits this by:

1. Decomposing the tiling into spanning trees
2. Numbering nodes using Fibonacci sequences
3. Using Zeckendorf representation for unique addressing

## The {5,4} Pentagrid Structure

### Basic Properties

- **Tiles:** Regular pentagons (5 sides)
- **Vertex degree:** 4 pentagons meet at each vertex
- **Curvature check:** (5-2)(4-2) = 6 > 4, so hyperbolic
- **Growth rate:** Exponential (Fibonacci-based)

### Geometric Construction

Each pentagon has 5 neighbors. The tiling can be viewed as:

- A central pentagon (the "root")
- Concentric "rings" of pentagons at increasing distance
- Each ring has more pentagons than the previous (exponential growth)

## Fibonacci Tree Coordinate System

### The Four Trees

The {5,4} pentagrid is covered by exactly four Fibonacci trees, rooted
at the four vertices of a central pentagon. Each tree covers a sector of
the hyperbolic plane.

### Tree Structure

Each tree node can be either:

- **2-node:** Has exactly 2 children (sons)
- **3-node:** Has exactly 3 children (sons)

The pattern of 2-nodes and 3-nodes follows Fibonacci sequences.

### Node Numbering

Nodes are numbered starting from 1 at the root:

- Root node: 1
- Children numbered consecutively
- Numbering follows breadth-first traversal within each level

**Key insight:** The Fibonacci sequence appears naturally in the
numbering. The nth Fibonacci number F(n) marks boundaries between
levels.

### Zeckendorf Representation

Every positive integer has a unique representation as a sum of
non-consecutive Fibonacci numbers:

```
n = Σ αᵢ·F(i) where αᵢ ∈ {0,1} and no two consecutive αᵢ = 1
```

This is called the Zeckendorf representation.

**Example:**

- 7 = 5 + 2 = F(5) + F(3) → representation: 10100
- 12 = 8 + 3 + 1 = F(6) + F(4) + F(2) → representation: 101010

### Notation

For a node n with Zeckendorf representation, we write:

- `αₖ...α₁` for the binary string
- `αₖ...α₁0` means appending a 0
- `αₖ...α₁1` means appending a 1 (if valid)

## Proposition 1: Node Status

**Determining whether a node is a 2-node or 3-node:**

For node n with Zeckendorf representation αₖ...α₁:

| Representation ends with | Node status |
| ------------------------ | ----------- |
| ...10                    | 2-node      |
| ...01                    | 3-node      |
| ...100                   | 2-node      |
| ...010                   | 3-node      |
| ...001                   | 2-node      |

**General rule:** The status depends on the trailing pattern of the
Zeckendorf representation:

- If the representation ends with `10` or `100`, it's a 2-node
- If the representation ends with `01` or `010`, it's a 3-node

## Proposition 2: Computing Preferred Son and Father

### Preferred Son

The **preferred son** of node n is the "first" child in the tree
ordering.

For node n with representation αₖ...α₁:

- Preferred son m has representation αₖ...α₁00

**Formula:**

```
m = n·φ² rounded appropriately
```

where φ = (1 + √5)/2 is the golden ratio.

More precisely:

```
m = floor(n·φ² + 1/2) for most nodes
```

### Father

The **father** f of node n (n > 1):

- Remove trailing zeros from n's representation
- If ends in ...α₁1, the father has representation ...α₁

**Formula:**

```
f = floor(n/φ²) approximately
```

## Proposition 3: Computing Neighbors

This is the key result for navigation. Given a node n with preferred son
m and father f:

### For 2-nodes (2 children)

The 5 neighbors are:

```
f, m, m+1, m+2, f-1
```

Where:

- f = father
- m = preferred son
- m+1, m+2 = other children and adjacent nodes
- f-1 = sibling

### For 3-nodes (3 children)

The 5 neighbors are:

```
f, m-1, m, m+1, m+2
```

Where:

- f = father
- m-1 = adjustment for 3-node structure
- m, m+1, m+2 = children

### Neighbor Order

The neighbors are listed in clockwise order around the pentagon, which
is essential for:

- Cellular automata rules (position-dependent transitions)
- Consistent traversal
- Rendering

## Algorithm: Cell Location

To find a cell at hyperbolic coordinates (x, y):

1. Determine which of the 4 trees contains the point
2. Starting from root, descend the tree:
   - At each node, determine which child sector contains (x, y)
   - Continue until reaching a leaf or target depth
3. The path encodes the Zeckendorf representation

To find neighbors of cell n:

1. Compute Zeckendorf representation of n
2. Determine if n is 2-node or 3-node (Proposition 1)
3. Compute preferred son m (Proposition 2)
4. Compute father f (Proposition 2)
5. Apply neighbor formulas (Proposition 3)

## Comparison with {7,3} Heptagrid

### Similarities

Both tilings use:

- Fibonacci tree decomposition
- Zeckendorf representation
- Similar status/neighbor computation framework

### Differences

| Aspect        | {5,4} Pentagrid | {7,3} Heptagrid |
| ------------- | --------------- | --------------- |
| Polygon sides | 5               | 7               |
| Vertex degree | 4               | 3               |
| Trees needed  | 4               | 3               |
| Neighbors     | 5               | 7               |
| Node types    | 2,3-nodes       | White/Black     |
| Branching     | 2 or 3 children | Different rules |

### {7,3} Neighbor Formulas (for comparison)

White nodes: `[f, n-1, s-1, s, s+1, s+2, n+1]` Black nodes:
`[f, f-1, n-1, s, s+1, s+2, n+1]`

Where s = preferred son, f = father.

## Implementation Considerations

### Data Structures

```typescript
interface FibonacciNode {
  id: number // Positive integer address
  zeckendorf: number[] // Binary representation
  status: '2-node' | '3-node'
  father: number
  preferredSon: number
  neighbors: number[]
}
```

### Precomputation

For efficiency:

- Precompute Fibonacci numbers up to maximum expected ID
- Cache Zeckendorf representations
- Memoize neighbor computations

### Coordinate Conversion

To convert between:

- Integer ID ↔ Zeckendorf representation
- Integer ID ↔ Hyperbolic coordinates (x, y, t)
- Integer ID ↔ Poincaré disk (x, y)

## Application: Cellular Automata

The paper's main result is constructing a universal cellular automaton.

### Why Coordinates Matter

For CA simulation:

1. **State storage:** Map from cell ID to state
2. **Neighbor lookup:** Given ID, find neighbor IDs in O(1)
3. **Transition rules:** Apply based on neighbor states
4. **Infinite grids:** Only store non-empty cells (sparse)

### The Railway Circuit

Margenstern simulates a register machine using:

- "Tracks" = paths through the hyperbolic plane
- "Switches" = cells that redirect signals
- "Signals" = propagating states

The coordinate system enables:

- Precise track placement
- Consistent switch orientation
- Signal routing

## Generalizability

### What Transfers to Other Tilings

The framework is general:

1. **Tree decomposition:** Works for any hyperbolic tiling
2. **Fibonacci numbering:** Growth rate matches most tilings
3. **Zeckendorf uniqueness:** Always gives unique addresses

### What Is Tiling-Specific

Must be derived per tiling:

1. **Number of trees:** Depends on vertex degree
2. **Status rules:** Different patterns per tiling
3. **Neighbor formulas:** Specific to geometry
4. **Branching patterns:** Depends on polygon and vertex count

### Known Tilings with Coordinate Systems

| Tiling  | Status    | Reference             |
| ------- | --------- | --------------------- |
| {5,4}   | Complete  | Margenstern 2002      |
| {7,3}   | Complete  | Margenstern (various) |
| {5,3,4} | Partial   | Later papers          |
| {p,q}   | Framework | Can be derived        |

## Key Formulas Summary

### Fibonacci Sequence

```
F(1) = 1, F(2) = 2
F(n) = F(n-1) + F(n-2)
```

### Zeckendorf Representation

```
n = Σᵢ αᵢ·F(i), αᵢ ∈ {0,1}, no consecutive 1s
```

### Golden Ratio Relations

```
φ = (1 + √5)/2 ≈ 1.618
φ² = φ + 1 ≈ 2.618
1/φ = φ - 1 ≈ 0.618
```

### Node Operations

```
preferred_son(n) ≈ n·φ²
father(n) ≈ n/φ²
```

## References

1. Margenstern, M. (2002). New tools for cellular automata in the
   hyperbolic plane. Journal of Universal Computer Science.

2. Margenstern, M. (2007). Cellular Automata in Hyperbolic Spaces. Old
   City Publishing. (Book-length treatment)

3. Zeckendorf, E. (1972). Représentation des nombres naturels par une
   somme de nombres de Fibonacci.

## See Also

- `note/hyperbolic/ca/heptagrid.md` - {7,3} heptagrid notes
- `note/source-analysis.md` - Repository analysis
- `base/hyperrogue-master/` - HyperRogue implementation
- `base/hyperbolic-ca-simulator-master/` - von Dyck group approach

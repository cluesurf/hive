# Navigation in Hyperbolic Tilings and Applications

**Citation:**

Margenstern, M. (2009). Navigation in tilings of the hyperbolic plane
and possible applications. arXiv preprint arXiv:0909.2157.
https://arxiv.org/abs/0909.2157

**Local copy:** `./base/papers/0909.2157v1.pdf`

## Overview

This 2009 paper provides a more accessible overview of Margenstern's
navigation techniques for hyperbolic tilings, focusing on practical
applications rather than formal proofs. It covers the pentagrid {5,4}
and heptagrid {7,3}, their shared Fibonacci tree structure, and several
real-world applications including color choosers and keyboards.

## Key Insight: Navigation as Instrument Flight

Margenstern compares navigating in hyperbolic space to "flying by
instruments only." The Poincaré disk model distorts the hyperbolic plane
so severely that only a tiny portion is actually visible at any time.
Without a coordinate system, you immediately get lost.

**Implication for this project:** Any hyperbolic visualization needs
both a coordinate system for addressing tiles AND navigation aids (like
an arrow pointing home) to prevent users from getting lost.

## The Two-Part Splitting Technique

### Part 1: Sector Division

The hyperbolic plane is divided into sectors around a central tile:

- **Pentagrid {5,4}:** 5 sectors (one per edge of central pentagon)
- **Heptagrid {7,3}:** 7 sectors (one per edge of central heptagon)

Each sector is infinite and contains exponentially many tiles.

### Part 2: Fibonacci Tree Spanning

Each sector is spanned by a Fibonacci tree with:

- **White nodes:** 3 children
- **Black nodes:** 2 children
- **Pattern:** Leftmost child is always black, others are white

Level n of the tree contains f\_{2n+1} nodes, where f is the Fibonacci
sequence with f_0 = f_1 = 1.

## The Preferred Son Property

This is the key algorithmic insight enabling O(n) path computation:

> For each node in a Fibonacci tree, exactly one of its children has a
> coordinate obtained by appending "00" to the parent's coordinate. This
> child is called the **preferred son**.

**Position of preferred son:**

- Black nodes: Leftmost child is preferred
- White nodes: Second child is preferred

**Why it matters:** This property enables:

1. Linear-time path from root to any node
2. Linear-time neighbor computation
3. Linear-time shortest path between any two tiles

## Generalization to Other Tilings

**Key theorem:** For each p ≥ 5, the SAME Fibonacci tree spans both:

- Tiling {p, 4} (p-gons with 4 at each vertex)
- Tiling {p+2, 3} ((p+2)-gons with 3 at each vertex)

| p   | {p,4} | {p+2,3} | Shared Tree                     |
| --- | ----- | ------- | ------------------------------- |
| 5   | {5,4} | {7,3}   | Same tree                       |
| 6   | {6,4} | {8,3}   | Same tree                       |
| 7   | {7,4} | {9,3}   | Same tree                       |
| ... | ...   | ...     | Different trees for different p |

**Implication:** Once you implement the Fibonacci tree for one p, you
get TWO tilings for free. The tree structure is the same, only the
geometric embedding differs.

## Complexity Results (Theoretical Significance)

### P_hc = NP_hc

For hyperbolic cellular automata:

- **P_hc** (deterministic polynomial time) equals
- **NP_hc** (non-deterministic polynomial time)

This is remarkable because in standard complexity theory, P ≠ NP is
widely believed.

### Why This Matters

> "Hyperbolic cellular automata may run much faster than their Euclidean
> analogues, as they have at their disposal an exponential area which
> can be constructed and used in linear time."

**Practical meaning:** Problems that are NP-complete in Euclidean space
(like scheduling, routing) become polynomial-time solvable when mapped
to hyperbolic space.

### Computational Power

The exact power of P_hc is **PSPACE** (polynomial space on a standard
Turing machine). This means hyperbolic CA can solve any problem solvable
with polynomial memory.

## Universal Cellular Automata

Margenstern constructed universal cellular automata (capable of
simulating any Turing machine) with remarkably few states:

| Tiling | States | Reference        |
| ------ | ------ | ---------------- |
| {5,4}  | 9      | Margenstern 2009 |
| {7,3}  | 6      | Margenstern 2008 |
| {7,3}  | 4      | Margenstern 2009 |

All use a "railway circuit" model with tracks and switches.

## Applications

### 1. Color Chooser (Implemented)

A tool for selecting colors using the heptagrid:

- Central tile shows current selection
- 7 keys navigate to adjacent tiles
- Each tile represents a different color
- Fisher-eye effect provides context + focus

**Design insight:** Heptagrid works better than pentagrid for visual
applications because heptagons "look like hexagons" at first glance.
Users don't notice the 7th side unless they count.

### 2. Latin Keyboard (Implemented)

Cell phone keyboard using the pentagrid:

- At most 3 key presses to reach any letter
- Pentagrid preferred because larger tiles allow bigger letters
- Letters arranged in near-alphabetic order (reduces learning)

**Why pentagrid beats heptagrid here:** The regular pentagon with right
angles is geometrically larger than the rectangular heptagon with 2π/3
angles. Larger tiles = more readable text, less precision needed.

### 3. Japanese Keyboard (Implemented)

Perfect fit because:

- Japanese has exactly 5 vowels (a, i, u, e, o)
- Hiragana/katakana organized in 5-vowel series
- Pentagon structure naturally maps to vowel organization

**Generalization potential:** Many Asian languages (Malaysian,
Philippine, Polynesian) have exactly 5 vowels, making this approach
broadly applicable.

### 4. Internet Representation (Proposed)

Using hyperbolic coordinates for network topology:

- Nodes get coordinates like IP addresses but based on tree position
- Shortest path algorithm enables efficient routing
- Addresses are "continuous" with respect to connection distance

**Key algorithm:** From coordinates of tiles A and B, compute shortest
path in O(|coord(A)| + |coord(B)|) time.

### 5. File System Storage (Proposed)

Organizing files in hyperbolic tree structure:

- Topological neighborhood reflected in coordinates
- Efficient scanning for backup/saving
- "Branch" sweeps around circumference, saving incrementally
- Adjacent branches share common prefix (saves redundant writes)

### 6. Processor Organization (Proposed)

Organizing parallel processors as a hyperbolic grid:

- Each processor has a coordinate
- Communication follows shortest paths
- No central controller required
- Exponential processors reachable in linear steps

## Communication Protocol

Margenstern describes a clever message-passing protocol:

1. Sender considers itself as center (relative address 0)
2. Sends message to all children, appending constant-size routing info
3. Receiver can reply by "reversing" the accumulated address
4. No global coordinate lookup needed for return path

**Implication:** Decentralized routing in hyperbolic networks.

## Lack of Similarity in Hyperbolic Space

An important philosophical point:

> "In the hyperbolic plane, there is a unique size of the edge for a
> regular pentagon with right angles."

Unlike Euclidean geometry, hyperbolic figures cannot be scaled. A
pentagon with 90° angles has exactly one possible size. This means:

- Shapes have inherent scale
- No arbitrary zoom levels
- Coordinates directly encode geometric position

**Biological parallel:** Living organisms also lack true similarity.
Individual differences aren't just scaling. Margenstern suggests
hyperbolic geometry better models biological growth patterns.

## Algorithms Summary

| Operation         | Time Complexity | Description               |
| ----------------- | --------------- | ------------------------- |
| Root to node path | O(n)            | n = coordinate length     |
| Neighbor coords   | O(n)            | From node coordinate      |
| Shortest path A→B | O(n+m)          | n,m = coordinate lengths  |
| Center change     | O(n)            | Re-root coordinate system |

## Key Quotes

> "To navigate in these tilings was for a long time a non trivial
> question."

> "Trees are already used in the organization of operating systems...
> Now, trees are also spanning hyperbolic geometry."

> "Hard problems of everyday life turn out to be solvable in polynomial
> time, very often even in linear time."

## Relevance to This Project

### Direct Applications

1. **Navigation UI:** Implement the "arrow pointing home" pattern
2. **Color picker:** Consider hyperbolic color space visualization
3. **Tree-based data:** File browsers, mind maps, network graphs

### Architectural Insights

1. **Coordinate design:** Preferred son property enables O(1) operations
2. **Dual tilings:** {p,4} and {p+2,3} share trees; implement once
3. **Routing:** Relative addressing for decentralized navigation

### Performance Considerations

1. **Path computation:** O(n) where n is coordinate length
2. **Neighbor lookup:** O(n) with formula, O(1) with caching
3. **Exponential reach:** Distance d reaches O(φ^d) tiles

## Related Papers

- Margenstern (2002) - Formal coordinate system proofs
- Margenstern (2007, 2008) - Cellular Automata in Hyperbolic Spaces
  books
- Martin (2005) - VirHKey implementation details

## See Also

- `note/hyperbolic/margenstern-pentagrid-coordinates.md` - 2002 TCS
  paper
- `note/hyperbolic/coordinate-system-spec.md` - Implementation spec

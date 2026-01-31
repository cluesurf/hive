# Margenstern: Applications of Hyperbolic Tilings

Practical applications from "Cellular Automata in Hyperbolic Spaces"
Volumes 1 and 2 by Maurice Margenstern.

## Color Chooser

A practical application for selecting colors using the pentagrid
structure.

### Design

- 5 sectors of pentagrid used for 5 primary hues
- Tree depth provides luminosity/saturation gradients
- Navigation through hyperbolic space = color exploration

### Implementation Notes

- User interface maps pentagrid to Poincare disk display
- Clicking navigates tree structure
- Can encode RGB or HSL values in tile addresses

## Cell Phone Keyboards

### Japanese Keyboard Problem

Japanese has ~50 hiragana characters organized around 5 vowels:

- A, I, U, E, O (center)
- Consonant rows: K, S, T, N, H, M, Y, R, W + special

### Pentagrid Solution

- Central tile: vowels (A, I, U, E, O)
- 5 sectors for consonant families
- Each sector contains related consonant-vowel combinations
- Spatial relationships mirror linguistic relationships

### Advantages

1. Single hand operation possible
2. Spatial memory aids learning
3. Logical organization matches language structure
4. Scalable to include kanji through deeper tree levels

## Hyperbolic IP Numbers

### Concept

Use ternary heptagrid coordinates as IP addresses:

```
0       = Central administrator
1-5     = Continents (Africa, America, Asia, Europe, Oceania)
6       = Reserved for central admin
7       = Future use (space colonies?)
```

### Format

Each level uses format `l:j` where:

- l = level number (decimal)
- j = position within level (decimal)

### Example

University of Metz server:

```
4.4:10.5:57.3:1.4:5

4       = Europe
4:10    = France (level 4, position 10)
5:57    = Moselle department
3:1     = Administrative services
4:5     = University
```

### Internet Graph Embedding

The Internet topology can be embedded in the ternary heptagrid. Site
addresses then correspond directly to hyperbolic coordinates.

Algorithms from shortest paths and communications apply directly to
network routing.

## P Systems Representation (Biology)

### What are P Systems?

Formal model for biological cell simulation:

- Membranes contain objects
- Objects interact via rules
- Membranes are hierarchical (tree structure)

### Hyperbolic Representation

The membrane hierarchy maps naturally to pentagrid:

- Skin membrane = root of tree
- Nested membranes = subtrees
- Membrane contents = cells within region

### Advantages

1. Tree structure matches membrane hierarchy
2. Exponential space for object populations
3. Region boundaries can expand/contract
4. New membranes easily added at "dent" positions

## Brain Mapping

### Observation

Physical brains have circumvolutions (folds) that resemble hyperbolic
surfaces embedded in Euclidean 3D space.

### Hyperbolic Coordinates for Brains

- Integral part: macro-scale brain region location
- Fractional part: micro-scale (down to neurons)
- Triangle subdivision provides arbitrary precision

### Potential Uses

1. Addressing brain regions systematically
2. Mapping neural connections
3. Representing hierarchical brain structure
4. Scale-invariant coordinate system

## Crocheting and Physical Models

### Daina Taimina's Crochet

Crocheted models of hyperbolic planes demonstrate:

- Equal hyperbolic distances become equal physical distances
- Resulting surface has "ruffled" appearance
- Similar to brain circumvolutions

### The Mantilla

A tiling with heptagons and hexagons that:

- Tessellates the hyperbolic plane
- Creates physically realizable surface when embedded
- Useful for visualization and education

## Memory Allocation / Operating Systems

### Concept

Use hyperbolic coordinates for:

- Virtual memory addressing
- Process space allocation
- Sector isolation between processes

### Advantages

1. Hierarchical allocation mirrors tree structure
2. Easy boundary checking via coordinate comparison
3. Dynamic expansion without fragmentation
4. Natural isolation between branches

## Database Organization

### Tree-Based Indexing

Hyperbolic coordinates provide:

- Natural B-tree-like structure
- Hierarchical key organization
- Efficient range queries via tree navigation

### Example

```
Database records addressed by:
- Sector: top-level category
- Path: hierarchical subcategories
- Leaf: individual record
```

## Virtual Reality

### Hyperbolic VR Spaces

Applications in:

- Non-Euclidean game worlds
- Data visualization
- Artistic exploration

### Implementation Notes

- Poincare disk or half-plane model for display
- Coordinate system provides consistent navigation
- Tree structure enables level-of-detail rendering

## Quantum Error Correction Connection

### The Structural Rhyme: Exponential Room

The hyperbolic plane has exponential growth of circumference vs radius.
Regular tilings like {7,3} and {5,4} are canonical combinatorial
discretizations of that geometry.

This "exponential room" is the common ingredient behind:

- Why hyperbolic tilings are good at routing "wires" without crowding
- Why a boundary layer can be huge relative to bulk depth
- Why tensor networks on hyperbolic tilings look like discrete
  negatively curved space

**This is the seed of the AdS/CFT connection.**

### MERA and Geometry from Entanglement

Brian Swingle's MERA insight: a multiscale entanglement renormalization
network naturally induces a geometry where distances behave
hyperbolically, serving as a discrete model for holography.

Key Ideas:

- A layered network (coarse-graining scale = depth) produces emergent
  radial direction
- The boundary is where fine degrees of freedom live
- Bulk depth indexes renormalization scale
- Graph geodesics approximate minimal surfaces controlling entanglement
  scaling

### The HaPPY Code

"Holographic quantum error-correcting codes: Toy models for the
bulk/boundary correspondence"

Core insights:

- The bulk-to-boundary map behaves like an isometry
- Local bulk operators have multiple boundary reconstructions (subregion
  duality)
- "Entanglement wedge reconstruction" is a QEC recovery statement

### Hyperbolic Tilings as Holographic Code Skeleton

The HaPPY construction uses a tensor network on a hyperbolic tiling.
Tiles provide:

- A uniform local neighborhood
- A natural notion of radius/depth from center
- A huge boundary relative to bulk

### Construction Ingredients

1. Pick a hyperbolic tiling (often regular)
2. Place a special tensor at each tile ("perfect tensor" in toy model)
3. Contracted network is a map from bulk legs (logical) to boundary legs
   (physical)

Result: A code with holographic-like properties.

### Why {5,4} and {7,3} Specifically

Even if papers use different {p,q}, heptagons/pentagons keep showing up
because:

- Low-degree regular hyperbolic tilings are easy to reason about
- They lead to neat local tensor valences
- Visually and algorithmically nice for "radial layering" and "boundary
  cut" experiments

### Ryu-Takayanagi as Minimal Cuts

In AdS/CFT, the Ryu-Takayanagi (RT) formula relates boundary
entanglement entropy to the area of a minimal surface in the bulk.

In discrete tensor network models:

- Entanglement of a boundary interval is approximated by
- The minimal cut through the network separating that boundary region

**Hyperbolic tilings matter because geodesics and minimal cuts behave
like hyperbolic minimal surfaces due to network geometry.**

### Hyperbolic Surface Codes

A separate but related use of {p,q} tilings: bona fide quantum LDPC-like
codes from tilings of hyperbolic surfaces.

Core Insights:

- Hyperbolic tilings allow constant rate (encode constant fraction of
  qubits) while keeping stabilizer weights bounded
- Distances scale more slowly than Euclidean surface codes
- Overhead can be favorable for storage under some regimes

### The Engineering Translation

**A) Hyperbolic Tiling as Discretized Spatial Slice of AdS**

- Constant-time slice of AdS is hyperbolic (negative curvature)
- Regular hyperbolic tiling is combinatorial discretization
- Boundary of slice is large, supports "CFT degrees of freedom"

**B) Tensor Network on Tiling as Bulk-to-Boundary Encoder**

- Put tensors on tiles, contract along edges
- Remaining free legs at boundary are physical qubits
- Bulk legs represent logical degrees of freedom

**C) Error Correction IS the Mechanism of Holography**

- Bulk operators can be reconstructed from different boundary regions
- That is redundancy of encoding, hallmark of QEC

**D) Minimal Cuts Approximate Entanglement Surfaces**

- Boundary entanglement tracks minimal bulk cuts
- Hyperbolic geometry gives correct scaling behavior

### Code Families

| Family                   | Focus                                   |
| ------------------------ | --------------------------------------- |
| HaPPY-like holographic   | Bulk/boundary reconstruction properties |
| Hyperbolic surface codes | LDPC stabilizers, rate, distance        |

### Reading Path

| Paper                                        | Why It Matters                                    |
| -------------------------------------------- | ------------------------------------------------- |
| Holographic QEC codes (arXiv:1503.06237)     | Foundational AdS/CFT + QEC bridge                 |
| Entanglement renormalization (PRD 86.065007) | MERA looks hyperbolic, geometry from entanglement |
| Hyperbolic surface codes (arXiv:1703.00590)  | Practical code substrates                         |
| Decoding holographic codes (PRA 102.062417)  | Implementation and algorithms                     |
| LEGO_HQEC (arXiv:2410.22861)                 | Modern tooling and formalism                      |

### Connection to {p,q} Engine

The same combinatorial kernel can be reused:

**What Your Coordinate System Provides**:

- Fast addressing
- Neighbor lists
- Graph distance (layers)

**What It Enables**:

| Application                   | Uses                                     |
| ----------------------------- | ---------------------------------------- |
| Hyperbolic tensor network sim | Place tensors, contract, compute cuts    |
| Hyperbolic code simulator     | Define stabilizers/checks on faces/edges |
| Hyperbolic CA simulator       | Update local rules                       |

### Immediate Experiment

**Most direct experiment**: Implement a tool that, on {7,3} or {5,4}
graph, computes minimal edge cuts separating a chosen boundary interval
and plots the cut.

This makes the RT-min-cut idea tangible immediately.

## References

- Margenstern, M. (2007). Cellular Automata in Hyperbolic Spaces, Vol 1.
- Margenstern, M. (2008). Cellular Automata in Hyperbolic Spaces, Vol 2.
- Pastawski et al. (2015). Holographic quantum error-correcting codes.
- Swingle, B. (2012). Entanglement renormalization and holography.

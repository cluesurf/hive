# Universality in Hyperbolic Cellular Automata

Chapter 4 of Margenstern Volume 2 covers universality results for
cellular automata in hyperbolic spaces.

## Main Results

### Theorem 1: Intrinsic Universality

There exists a cellular automaton U on the pentagrid that can simulate
any other cellular automaton A on the pentagrid, starting from an
appropriate encoding of A and its initial configuration.

### Theorem 2: Infinite Configurations

For each k, there exists a cellular automaton V on the pentagrid that
works on infinite configurations and can simulate any CA with at most
k states.

### Theorem 3: General Tilings

For any {p,q} tiling of the hyperbolic plane, there exists a CA on the
pentagrid that can simulate any CA on {p,q}.

## Key Concept: Scaled Trees

The main technical innovation for achieving universality in hyperbolic
space is the **scaled tree**.

### Definition

A scaled tree with factor k is constructed by:

1. Select a neighbor of central cell as root
2. Select nodes in the boundary of ball B_k
3. Mark branches to selected nodes
4. Recursively repeat with B_k around each selected node

### Properties

- Simul-nodes represent cells of the simulated CA
- Each simul-node has two coordinates:
  - Initial coordinate (position in standard tree)
  - Scaled coordinate (position in simulated space)
- Distance between simul-nodes is 2k in standard tree

## Simulation Architecture

### Layers

The simulation uses multiple layers (like tracks for Turing machines):

| Layer | Purpose                                    |
|-------|-------------------------------------------|
| L0    | Standard Fibonacci tree structure          |
| L1    | Scaled tree structure                      |
| L2    | Border of configuration (silver cells)     |
| L3    | States of simulated cells                  |
| L4    | Copy of transition table                   |
| L5    | Previous configuration (for comparison)    |

### Simulation Cycle

Each cycle simulates one step of the simulated CA:

1. Copy states of simul-neighbors
2. Find new state in transition table
3. Copy new state to simul-cell on L3
4. Wait for synchronization signal

### Transition Table Encoding

The transition table is encoded as a tree:
- Level 1: current state (n_A nodes)
- Level 2: father's state
- Levels 3-5: other neighbors' states
- Leaves: new state for each rule

## Synchronization

Due to exponential path lengths in scaled trees, synchronization
signals are used to coordinate:
- Cycle boundaries
- Stage transitions within cycles
- Comparison of configurations

The duration of cycles increases exponentially with distance from
center.

## Key Algorithms

### State Copying

States are stored in a spiral path within B_m around each simul-cell.
Three colors define motion direction. Five auxiliary layers used for
transport.

### Border Extension

When a border cell becomes non-blank:
1. Extend all F-trees by one level
2. Copy transition table to new simul-cells
3. Signal `new_cell` to central cell

### Transition Table Copying

1. Mark tree with branching (green) and leaf (blue) colors
2. Serialize tree into list (leftmost branch first)
3. Transport list to target location
4. Deserialize list back into tree structure

## Why Euclidean Techniques Don't Work

In Euclidean space, universality proofs often use similarity:
- Gather cells into larger "super-cells"
- Super-cells are geometrically similar to original cells

In hyperbolic space:
- No similarity exists
- Size and shape are coupled (absolute distance)
- Cannot create "bigger pentagons"

Solution: Use scaled trees that adapt to hyperbolic geometry.

## Complexity of Simulation

The simulation is NOT uniform:
- Cycle duration grows exponentially with distance from center
- Path lengths to lateral neighbors grow exponentially
- No constant slowdown factor possible

This is fundamentally different from Euclidean universality results.

## Extension to Other Tilings

The construction extends to:
- Ternary heptagrid {7,3} (7 trees instead of 5)
- All tilings {p,4} and {p+2,3}
- Tiling {5,3,4} of hyperbolic 3D space

The key is that localization techniques work in all these tilings.

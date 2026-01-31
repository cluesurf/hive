# Margenstern: Cellular Automata in Hyperbolic Spaces

Notes from "Cellular Automata in Hyperbolic Spaces" Volumes 1 and 2 by
Maurice Margenstern.

## Fundamentals

### Definition

A cellular automaton consists of:

- Cells indexed by an interval of ZZ (integers)
- A finite automaton A with alphabet Q x Q x Q
- Distinguished quiescent state q0 with δ(q0, q0, q0) = q0
- Discrete time, all cells update simultaneously

### Neighborhoods

Standard symmetric neighborhood of radius r: `[c-r, ..., c, ..., c+r]`

Generalized: c + J where J is finite subset of ZZ containing 0

### Wolfram's Classification

256 possible elementary automata (2 states, radius 1):

- Class I: Trivial patterns
- Class II: Recursive/fractal patterns (e.g., rule 90, rule 150)
- Class III: Chaotic patterns
- Class IV: Complex global configurations (includes universal automata)

### Rule 90

```
q(c, t+1) = xor(q(c-1, t), q(c+1, t))
```

Produces Sierpinski triangle fractal pattern.

### Rule 110

Universal (proved by Matthew Cook). Transition table:

```
000 001 010 011 100 101 110 111
 0   1   1   1   0   1   1   0
```

## Computational Power

### Turing Machine Simulation (Theorem 2)

For any Turing machine M, there exists a cellular automaton that
simulates it.

A machine with p states and q symbols can be simulated by a cellular
automaton with q + 2p states.

Key insight: The cellular automaton takes the "point of view of the
tape":

- States include alphabet symbols and machine states
- Instructions to the right: one step
- Instructions to the left: two steps (intermediate step for state
  positioning)

### Universal Cellular Automata (Corollary 1)

There exists a cellular automaton that can simulate any Turing machine.

### Intrinsic Universality (Theorem 4)

There exist cellular automata that can simulate any other cellular
automaton directly (not via Turing machine encoding).

### Halting Problem (Theorem 5)

The halting problem for cellular automata is undecidable.

## Programming by Signals

### Signal Representation

Signals are geometric lines in space-time diagrams:

- Maximum speed: 1 (one cell per time step)
- Slower speeds possible (e.g., 1/3 for counting signals)
- Signals leave "shades" to track previous positions

### Computing 2^n Example

Uses 7 states with signals:

- Blue signals at speed 1 (bouncing)
- Red line at speed 1/3 (counting)
- Meeting points mark powers of 2

### Synchronization Problem (Firing Squad)

Goal: n cells enter same state simultaneously

Minsky's solution:

- Send speed-1 signal to boundary
- Send speed-1/3 signal
- Speed-1 bounces back, meets slower signal at midpoint
- Recursively apply to each half

Duration: approximately 3n time steps

## Cellular Automata in the Plane

### Euclidean Tilings

Three possibilities:

- Square grid
- Equilateral triangle grid
- Hexagonal grid

### Billiard Ball Model

Two states (particle present/absent). Rules:

- Conservation: same number of 1s enter and leave each 2x2 block
- Reversibility: can run time backwards

#### Elementary Signal

Two particles at specific distance, moving diagonally together.

#### Mirror Pattern

8 particles in fixed configuration. Signal hits center, reflects.

- Center hit: changes direction
- Edge hit: continues straight

#### Meetings

- Frontal: elastic shock, both deflect π/2
- Side: one deflected, one shifted parallel

### Registers and Gates

#### Logical Clock

High/low tops separated by τ cells. Bit 1: particles at τ, τ-2. Bit 0:
particles at 1, 3.

#### Basic Circuits

1. Delay circuits (parallel segments for synchronization)
2. Merger (installs signal on wire)
3. Reader (tests for signal presence)
4. Rewriter (inverts bit with shift)

#### Fredkin Gate (Reversible AND)

Three inputs (c, p, q), three outputs (c', p', q'):

```
c' = c
p' = c*p + ~c*q
q' = ~c*p + c*q
```

Involutive: gate is its own inverse.
When q = 0: p' = c*p (AND operation)

## Railway Model of Computation

An alternative proof method for weak universality in hyperbolic CA.

### Switches

A **switch** is a point where a track splits from one into two.

| Direction | Description               |
| --------- | ------------------------- |
| Forward   | 1 track -> one of 2 tracks |
| Backward  | one of 2 tracks -> 1 track |

### Switch Types

#### 1. Fixed Switch

Always routes to the same output track on active passage. No state
change, deterministic routing.

#### 2. Toggle (Flip-Flop) Switch

Alternates between output tracks depending on last active passage. Each
active passage flips the switch state.

#### 3. Memory Switch

Sends active passage to the track that the last passive passage came
through. Remembers which passive input last arrived.

### Other Components

| Component | Description                          |
| --------- | ------------------------------------ |
| Tracks    | Directed edges for particle movement |
| Crossing  | Two tracks cross without interaction |
| Station   | Entry/exit points for particles      |

### Unit Register

Used for incrementing and decrementing operations.

```
          ________________ o1
         /        \
i1___(m)/          \(t)___ i2
        \          /
         \________/_______ o2
```

- (m) = memory switch
- (t) = toggle switch
- Going in through left on (m) = read
- Going in from right on (t) = write

### How It Proves Universality

1. Railway circuits can simulate any Boolean circuit
2. Boolean circuits are universal for computation
3. Therefore railway circuits are computationally universal
4. A CA that can implement railway components is universal

### Weak vs Strong Universality

| Type   | Requirement                             |
| ------ | --------------------------------------- |
| Weak   | Requires infinite initial configuration |
| Strong | Works from finite configuration         |

Railway circuit constructions typically prove weak universality.

## Hyperbolic Cellular Automata

### Key Differences from Euclidean

- Exponential growth of cells by distance
- More complex neighborhood structures
- Non-regular splitting languages for some tilings

### Tiling-Based Approach

Cells correspond to tiles in hyperbolic tessellation. Neighborhoods
defined by tile adjacency.

### Coordinate-Based Implementation

Using Fibonacci tree coordinates:

- Each cell has unique integer coordinate
- Neighbors computable from coordinate
- Enables efficient local rules

### Language Properties

For {p, 4} grids: regular splitting language (Pisot number criterion).

For triangle-based tilings: often non-regular language.

## Implementation Considerations

### Finite Configurations

Working with finite configurations:

- Distinguished blank/quiescent state
- Rule: blank neighbors produce blank
- Configuration bounded by finite interval

### Expansion Speed

Configuration expands at most at speed 1 (one cell per time step in each
direction).

### Halting Criterion

Computation halts when two consecutive configurations are identical.

### Rules vs Table

Partial transition function (rules) often much smaller than full table.
Example: 38 rules vs 343 table entries for 7-state automaton.

## Universality in Hyperbolic Space

### Main Results

**Theorem 1 (Intrinsic Universality)**: There exists a cellular
automaton U on the pentagrid that can simulate any other cellular
automaton A on the pentagrid.

**Theorem 2 (Infinite Configurations)**: For each k, there exists a
cellular automaton V on the pentagrid that works on infinite
configurations and can simulate any CA with at most k states.

**Theorem 3 (General Tilings)**: For any {p,q} tiling of the hyperbolic
plane, there exists a CA on the pentagrid that can simulate any CA on
{p,q}.

### Key Concept: Scaled Trees

A scaled tree with factor k is constructed by:

1. Select a neighbor of central cell as root
2. Select nodes in the boundary of ball B_k
3. Mark branches to selected nodes
4. Recursively repeat with B_k around each selected node

Properties:

- Simul-nodes represent cells of the simulated CA
- Each simul-node has two coordinates (initial and scaled)
- Distance between simul-nodes is 2k in standard tree

### Simulation Architecture

The simulation uses multiple layers:

| Layer | Purpose                                 |
| ----- | --------------------------------------- |
| L0    | Standard Fibonacci tree structure       |
| L1    | Scaled tree structure                   |
| L2    | Border of configuration (silver cells)  |
| L3    | States of simulated cells               |
| L4    | Copy of transition table                |
| L5    | Previous configuration (for comparison) |

### Why Euclidean Techniques Don't Work

In Euclidean space, universality proofs often use similarity:

- Gather cells into larger "super-cells"
- Super-cells are geometrically similar to original cells

In hyperbolic space:

- No similarity exists
- Size and shape are coupled (absolute distance)
- Cannot create "bigger pentagons"

Solution: Use scaled trees that adapt to hyperbolic geometry.

### Complexity of Simulation

The simulation is NOT uniform:

- Cycle duration grows exponentially with distance from center
- Path lengths to lateral neighbors grow exponentially
- No constant slowdown factor possible

This is fundamentally different from Euclidean universality results.

## Complexity Results

### P = NP in Hyperbolic Space

**Theorem (Margenstern-Morita)**: In the hyperbolic plane, the
complexity class P equals NP.

This is because hyperbolic geometry allows constructing exponential
space in linear time.

### SAT in Linear Time

**Theorem 2**: 3-SAT can be solved in quadratic time by a cellular
automaton on the pentagrid.

**Theorem 3**: 3-SAT can be solved in linear time when numbers are in
unary representation.

### Why This Works

In Euclidean space, after n steps a CA can only reach O(n^d) cells.

In hyperbolic space, after n steps a CA can reach O(phi^n) cells.

### Ph = PSPACE Theorem

**Theorem 5 (Iwamoto, Margenstern, Morita, Worsch)**: For any
non-deterministic Turing machine N computing on w in space P(|w|),
there is a hyperbolic cellular automaton H which computes whether N
has a successful computation on w in time O(P(|w|)^2).

**Corollary 2**: Ph = PSPACE

**Corollary 3**: Ph = NPh

### Hyperbolic Complexity Landscape

```
Ph = NPh = PSPACE
  |
  | (strict inclusion)
  v
EXPh = NEXPh = EXPSPACEh = NEXPSPACEh
```

The exponential classes also collapse, but there is strict separation
between polynomial and exponential classes.

## References

- Margenstern, M. (2007). Cellular Automata in Hyperbolic Spaces, Vol 1.
- Margenstern, M. (2008). Cellular Automata in Hyperbolic Spaces, Vol 2.
- Cook, M. (2004). Universality in Elementary Cellular Automata.

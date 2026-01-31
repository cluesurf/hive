# Margenstern: Complexity Theory in Hyperbolic Space

Chapter 3 of Margenstern Volume 2 presents groundbreaking complexity
theory results for cellular automata in hyperbolic spaces.

## Main Results

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

## Why This Works

### Exponential Space in Linear Time

In Euclidean space, after n steps a CA can only reach O(n^d) cells (for
d dimensions).

In hyperbolic space, after n steps a CA can reach O(phi^n) cells where
phi is the golden ratio.

### The Key Insight

The question "P = NP?" implicitly assumes polynomial time can only
generate polynomial space. Hyperbolic geometry violates this assumption.

## SAT-Solving Algorithm

### Setup

1. Display n (number of variables) in unary on rightmost branch
2. Display s clauses on a "bus" in quarter 3
3. Create working area (binary tree of depth n) in quarter 4

### Phase 1: Mark Working Area

- Spread n through Fibonacci tree
- Creates 2^n leaf nodes (all possible assignments)
- Time: 3n+1 steps

### Phase 2: Evaluate Clauses

For each clause (yi ∨ yj ∨ yk):

1. Send clause through tree
2. At level i, split based on xi value
3. At level j, split based on xj value
4. At level k, complete evaluation
5. AND with previous clause results

### Phase 3: Collect Results

- OR all leaf evaluations up the tree
- Result reaches central cell

### Complexity Analysis

- Phase 1: O(n) steps
- Phase 2: O(total clause length) steps
- Phase 3: O(n) steps

Total: Linear in input size (unary) or quadratic (binary).

## Implications

### For Complexity Theory

Margenstern argues this shows P = NP is an "ill-posed problem" because
it implicitly assumes Euclidean geometry.

### For Implementation

This provides a theoretical blueprint for using hyperbolic structure to
solve hard problems, though actual hardware implementation remains
challenging.

## Hyperbolic Complexity Classes

The landscape of complexity classes in hyperbolic space differs from
Euclidean:

| Euclidean | Hyperbolic       |
| --------- | ---------------- |
| P         | P = NP = PSPACE  |
| NP        | (collapses to P) |
| PSPACE    | (collapses to P) |

This is because the exponential growth of hyperbolic space provides
"free" parallelism that eliminates the gap between these classes.

## Ph = PSPACE Theorem

**Theorem 5 (Iwamoto, Margenstern, Morita, Worsch)**: For any
non-deterministic Turing machine N computing on w in space P(|w|), there
is a hyperbolic cellular automaton H which computes whether N has a
successful computation on w in time O(P(|w|)^2).

**Corollary 2**: Ph = PSPACE

**Corollary 3**: Ph = NPh

### Savitch's Theorem in Hyperbolic Context

The proof uses Savitch's theorem: NPSPACE = PSPACE.

Key idea: Construct a binary tree B representing all possible
computations of a non-deterministic Turing machine. The hyperbolic CA
can construct this tree in polynomial time due to exponential space
availability.

### Concepts Used

- **History**: Sequence of states of a cell over time
- **Sheaf**: Histories of a cell and its neighbors
- **Slice**: Sheaves along a branch of the Fibonacci tree
- **Big tree B**: Tree of all possible computation paths

## QSAT in Linear Time

**Theorem 7**: QSAT can be solved by a CA on the pentagrid in linear
time when indices are encoded in unary.

QSAT is PSPACE-complete (Theorem 6), so this confirms Ph = PSPACE.

## Non-Deterministic vs Deterministic Simulation

**Theorem 8 (Morita et al.)**: A non-deterministic CA on Fibonacci grid
with time t(n) can be simulated by a deterministic CA on the same grid
in time O(t^3(n)).

This is the hyperbolic analog of Savitch's theorem for CAs.

## Separation Results

**Theorem 9**: For functions t1(n) and t2(n) where t2(n)/t1(n)^3 ->
infinity, there exists a language accepted in time t2(n) by
deterministic CA that cannot be accepted in time t1(n) by any
non-deterministic CA.

### Corollaries

**Corollary 4**: DPh(n^k) strictly contained in DPh(n^4k)

**Corollary 5**: NPh(n^k) strictly contained in NPh(n^4k)

The complexity classes form an infinite hierarchy within Ph.

## Finer Hierarchy

**Theorem 10 (Iwamoto, Margenstern)**: For any rational r > 1 and
epsilon > 0, there is a language acceptable in time n^(r+epsilon) but
not in time n^r.

Uses padding technique and Lemma 3 about complexity class preservation.

## Above PSPACE

### Ph vs EXPh

**Theorem 11**: Ph strictly contained in EXPh

Proof uses diagonal argument: construct language L such that L cannot be
in any Ph class but can be computed in exponential time.

**Corollary 6**: NPh strictly contained in EXPh and PSPACEh strictly
contained in EXPh

### EXPh Level Results

**Result**: EXPh = NEXPh

**Theorem 12**: A non-deterministic CA bounded by time t(n) can be
simulated by:

- 4\*log_beta(t(n))-level bounded deterministic CA
- 2\*log_beta(t(n))-level bounded non-deterministic CA

Where beta = (3 + sqrt(5))/2.

**Theorem 13**: An s(n)-level bounded non-deterministic CA can be
simulated by a deterministic CA in time O(beta^(2s(n))).

## Summary of Hyperbolic Complexity Landscape

```
Ph = NPh = PSPACE
  |
  | (strict inclusion)
  v
EXPh = NEXPh = EXPSPACEh = NEXPSPACEh
```

The exponential classes also collapse, but there is strict separation
between polynomial and exponential classes.

## Key Theorems Summary

| Theorem            | Statement                                 |
| ------------------ | ----------------------------------------- |
| Ph = NPh = PSPACE  | Complexity classes collapse in hyperbolic |
| SAT in O(n)        | 3-SAT solvable in linear time (unary)     |
| Tiling undecidable | Domino problem is undecidable             |
| Beyond Turing      | Infinigrid can decide Σ^0_n formulas      |

## Technical Details

### Working Area Construction

Uses Fibonacci tree structure:

- Level k has F\_{2k+1} nodes
- Levels can be extended dynamically
- Each level corresponds to a variable

### Rule Format

Cellular automaton rules adapted for pentagrid:

- 5 neighbors (edges 1-5)
- Edge 1 always points to father
- Rotation-invariant when possible

### State Space

Multiple state types needed:

- Quiescent state
- Signal states (S, proceed, etc.)
- Evaluation states (true, false, partial)
- Level markers

## Pseudocode

```typescript
function solveSAT(n: number, clauses: Clause[]): boolean {
  // Phase 1: Create working area
  for (let level = 0; level < n; level++) {
    extendLevel()
  }
  initializeLeaves()

  // Phase 2: Evaluate each clause
  for (const clause of clauses) {
    evaluateClause(clause)
  }

  // Phase 3: Collect
  return orAllLeaves()
}
```

The cellular automaton implements this with massive parallelism. All
operations happen simultaneously across all 2^n branches.

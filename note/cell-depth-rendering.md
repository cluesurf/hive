# Cell Depth Rendering for Hyperbolic Honeycombs

## The Problem

With a "fold any point back to the fundamental domain" Distance Estimator
(DE), we destroy the notion of "which cell am I in?", so we cannot
reliably say "only show the first N shells" unless we reintroduce a cell
identity.

## What We Need: Cell Identity + Depth Function

To draw "N layers of polyhedra" we need:

1. A deterministic mapping `point -> cell_id` (or an equivalent group
   element that identifies the cell/coset)
2. A depth metric `depth(cell_id)` that matches our notion of layers
   (usually graph distance in the cell adjacency graph from the base
   cell)
3. A way to "gate" the SDF/DE so points in cells beyond depth N behave
   as empty space (return a large distance so the raymarch skips them)

The key is that (1) and (2) must be consistent with the honeycomb's face
pairing, not Euclidean radius and not "number of folds used".

## Why Previous Approaches Failed

### clipRadius (Euclidean/Poincare radius)

Cuts at a spherical boundary in Euclidean space. This slices through
polyhedra arbitrarily - it has no relationship to "polyhedra deep."

### maxIterations (Folding iteration count)

Limits the folding algorithm. But different parts of the SAME polyhedron
need different iteration counts, so you get partial geometry.

### Reflection count

Counting reflections during folding is unstable because:

- The folding path is not guaranteed to be the shortest
- Same cell can require different reflection counts from different
  points
- Coxeter relations like `s_i * s_i = e` and braid relations cause
  miscounting

## Option A: Hyperbolic-Radius Clipping (Quick, Still Slices Cells)

In the Poincare ball model, hyperbolic distance from origin is:

```
d_hyp(0, x) = 2 * atanh(r)
```

Where `r = ||x||` (Euclidean radius inside the unit ball).

To clip at hyperbolic radius D, the Euclidean radius is:

```
r_max = tanh(D/2)
```

This gives a geodesic sphere cut instead of Euclidean sphere, but still
cuts through polyhedra near the boundary.

## Option B: Track Group Element During Folding + BFS Depth Lookup (THE FIX)

When folding a point into the fundamental domain via reflections,
accumulate the isometry applied:

- Mirrors `Mi` are reflection isometries in H3
- Repeatedly apply mirrors to bring point to fundamental domain
- Maintain transform `G` such that `p_folded = G * p_original`

At the end, `G` is the group element (cell identity) that maps the
original point's cell back to the base cell.

### The Crucial Detail: Don't Use "Number of Folds" as Depth

Define depth by the adjacency graph of cells:

- Each face crossing is one step
- Use Cayley graph word length in "face-pairing generators" (not mirror
  generators)

### Implementation Steps

1. Choose generators that move from a cell to its neighbor across each
   face (face-pairings)
2. BFS from the base cell to depth N to enumerate all reachable cells
   and store:
   - `G` (isometry from base to that cell)
   - `depth`
3. Use that lookup during raymarch

### Precompute: BFS Over Cells to Depth N (CPU/JS)

```typescript
type Mat4 = Float64Array // hyperboloid isometry in SO(3,1) as 4x4
type Key = string

function keyOfMat(M: Mat4): Key {
  // quantize to tolerate float noise
  const q = []
  for (let i = 0; i < 16; i++) q.push(Math.round(M[i] * 1e9))
  return q.join(',')
}

function bfsCells(faceGens: Mat4[], maxDepth: number) {
  const depthByKey = new Map<Key, number>()
  const matByKey = new Map<Key, Mat4>()

  const I = identitySO31()
  const k0 = keyOfMat(I)
  depthByKey.set(k0, 0)
  matByKey.set(k0, I)

  const queue: Mat4[] = [I]

  while (queue.length) {
    const G = queue.shift()!
    const d = depthByKey.get(keyOfMat(G))!
    if (d === maxDepth) continue

    for (const A of faceGens) {
      const H = mulSO31(A, G) // neighbor transform
      normalizeSO31(H) // optional drift correction
      const k = keyOfMat(H)
      if (!depthByKey.has(k)) {
        depthByKey.set(k, d + 1)
        matByKey.set(k, H)
        queue.push(H)
      }
    }
  }
  return { depthByKey, matByKey }
}
```

### During Folding: Accumulate G

```glsl
FoldResult foldToFundamental(vec4 p) {
  mat4 G = I;
  for (int iter = 0; iter < MAX_FOLD; iter++) {
    int i = chooseMirrorToReduceViolation(p);
    if (i < 0) break;
    p = M[i] * p;
    G = M[i] * G;
  }
  return { pFolded: p, G: G };
}
```

Then in the DE:

- Compute `key(G)`
- Lookup `depth`
- If `depth > N`: return a big distance (treat as empty)

### GPU Lookup Patterns

**Pattern 1: CPU raymarch** - Use a `Map` lookup directly.

**Pattern 2: GPU buffer + linear scan** - For small N, upload arrays
`cellMats[i]` and `cellDepth[i]`, then find matching G.

**Pattern 3: GPU hash table** - Build fixed-size hash table with
quantized keys and open addressing for collisions.

## Option C: Enumerate Cells Explicitly (Most Correct, Heavy)

Instead of "infinite fold then DE":

1. Enumerate cells to depth N via BFS
2. For sample point `x`, compute min distance over only those cells:
   - Transform point into each cell's local frame
   - Evaluate base-cell SDF
   - Return minimum

Guarantees only enumerated cells are shown, but expensive.

## Option D: Reflection Word Length with Reduction (Complex)

Track sequence of reflections and compute reduced word length. Only
robust if you factor Coxeter relations. People usually use Option B
instead because BFS bakes all relations automatically.

## Recommended Implementation

1. Keep current folding-based DE for efficiency
2. Modify folding to accumulate `G` (SO(3,1) matrix)
3. Precompute cell adjacency BFS to depth `Nmax` using face-pairing
   generators
4. In DE, after folding:
   - `depth = lookupDepth(G)`
   - if `depth > N`: return large distance (treat as empty)

## Implementation Tips

### Define "Layer" Precisely

"N layers of polyhedra" means BFS shells in the cell adjacency graph
(discrete). Not "cells whose centers are within hyperbolic distance D"
(continuous).

### Use Hyperboloid Matrices for Stability

Accumulate `G` in hyperboloid model as SO(3,1) matrix. Renormalize
occasionally to fight drift (Gram-Schmidt with Minkowski metric).

### Key Quantization

`key(G)` must tolerate float noise:

- Float64 on CPU: quantize to 1e-8 or 1e-9
- Float32 on GPU: quantize to 1e-5 to 1e-6 and use hash

### Face-Pairing Generators

If fundamental domain is a Coxeter simplex with mirror reflections:

- Those mirrors generate the symmetry group
- But "cell adjacency" is about the honeycomb cell, not the simplex
- Move to neighboring cell is a specific product of simplex reflections

Derive face pairings by:

1. Pick the base cell (polyhedron) inside the honeycomb
2. For each face, compute the isometry that glues that face to the
   adjacent cell's corresponding face
3. Those isometries are `faceGens`

## Debugging Checklist

- Does folding return consistent `G` for points in same cell?
- If you nudge a point slightly, does `key(G)` stay identical?
- For known neighbor cell, does BFS produce `G` matching what folding
  reports?
- With `N = 0`, do you see exactly one cell?
- With `N = 1`, do you see base cell plus exactly its adjacent neighbors
  (count = number of faces)?

If any fail, likely issues are "wrong generators" (using mirrors instead
of face pairings) or "key too sensitive" (float noise breaking
identity).

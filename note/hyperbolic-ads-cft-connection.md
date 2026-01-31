# Hyperbolic Tilings and AdS/CFT Connection

How hyperbolic tilings like {7,3} connect to Anti-de Sitter space and
holography.

## 1. Ordinary Space Intuition

In normal 3D space:

- Nearby points interact strongly
- Distant points interact weakly
- Geometry is flat locally
- You can tile space with cubes in a regular grid

That grid picture is what lattice QCD does. You replace continuous
spacetime with a cubic lattice. Fields live on points and links. As the
grid gets finer, you approach the continuum.

**Key idea**: A lattice is not reality. It is a scaffold that preserves
who is next to whom.

Hyperbolic lattices play the same role, but for curved spaces.

## 2. What Anti-de Sitter Space Is

Anti-de Sitter space is a spacetime with constant negative curvature.

Properties:

- Space expands exponentially as you move outward from a center
- There is a boundary at infinity that is still reachable in finite time
  for light
- Distances and volumes grow much faster than in flat space

Common picture is a cylinder:

- Vertical direction = time
- Each horizontal slice = a hyperbolic space
- The outer wall of the cylinder = the boundary of AdS

AdS is not just 2D. It might be AdS4 or AdS5. The disk pictures are just
2D spatial slices used for visualization.

## 3. Why the Poincare Disk and {7,3} Tiling Show Up

A 2D slice of AdS space has hyperbolic geometry. The Poincare disk is a
way to draw that infinite hyperbolic plane inside a circle.

In this model:

- Straight lines are arcs that hit the boundary at right angles
- Shapes shrink as they approach the boundary
- The boundary circle is infinitely far away in hyperbolic distance

The {7,3} tiling means:

- 7-sided polygons
- 3 meet at each vertex

This only works in hyperbolic space, not flat space. So it is a natural
discrete scaffold for a negatively curved space.

**Mental translation**:

| Geometry         | Lattice                                         |
| ---------------- | ----------------------------------------------- |
| Flat space       | Cubic lattice approximates flat geometry        |
| Hyperbolic space | Heptagonal lattice approximates curved geometry |

As you include more tiles, you approximate a larger region of hyperbolic
space, just like refining a square grid approximates flat space.

## 4. How a 2D Hyperbolic Tiling Relates to Higher Dimensions

The disk you see is not the whole spacetime. It is **one spatial slice**
of a higher dimensional curved spacetime.

If you had AdS4 spacetime:

- Time is 1 dimension
- Space is 3 dimensional and negatively curved

To visualize, physicists often show:

- Time vertically
- A 2D hyperbolic slice horizontally

So the picture is missing one spatial dimension, just like a globe map
misses height.

Your {7,3} tiling is then:

- A 2D cross section
- Of a 3D hyperbolic space
- Which itself is a slice of 4D spacetime

It is a reduced dimensional toy model, not the full geometry.

## 5. Where Gravity Enters

In general relativity: **Gravity = curvature of spacetime**

In AdS:

- The background spacetime is already curved (negatively)
- Matter and energy add additional curvature on top of that

If you discretize space using a hyperbolic tiling:

- Each tile or vertex can carry field values
- Curvature can be encoded in how distances and connections are arranged
- You can study how fields propagate on this curved scaffold

This is analogous to lattice QCD, but now the lattice geometry itself
encodes curvature.

Instead of: **Flat grid + fields**

You have: **Hyperbolic grid + fields**

That hyperbolic grid is a crude stand-in for curved spacetime.

## 6. The AdS/CFT Leap

AdS/CFT correspondence says something wild:

**A gravity theory in AdS bulk is equivalent to a non-gravity quantum
field theory living on the boundary**

- Bulk = inside of the disk or cylinder
- Boundary = the edge circle over time

The crazy part:

| AdS Feature            | Boundary Feature                 |
| ---------------------- | -------------------------------- |
| Extra radial direction | Energy scale in boundary theory  |
| Near center of disk    | Low energy, large scale physics  |
| Near boundary          | High energy, fine detail physics |

So geometry in the bulk is like a geometric encoding of how information
is organized by scale in the boundary theory.

## 7. Why Hyperbolic Tilings and Tensor Networks Are Linked

Certain quantum states can be represented by tensor networks that look
like hyperbolic tilings.

In these models:

- Each node is a tensor
- Links are entanglement connections
- The network grows outward like a hyperbolic tiling

**Distance in the hyperbolic network corresponds to how strongly parts
of the quantum system are entangled.**

And amazingly:

**Geometric notions like minimal surfaces in the hyperbolic tiling match
formulas for quantum entanglement entropy on the boundary.**

So hyperbolic geometry is not just pretty. It matches how quantum
information is structured in holographic theories.

## 8. The Complete Mental Picture

| Layer                   | Description                                      |
| ----------------------- | ------------------------------------------------ |
| Your 3D intuition       | Things interact locally. Geometry = nearness.    |
| AdS spacetime           | Curved spacetime with hyperbolic spatial slices. |
| Hyperbolic tiling {7,3} | Discrete graph preserving hyperbolic neighbors.  |
| Fields on the tiling    | Toy model of quantum fields in curved space.     |
| Boundary of the tiling  | Lower dimensional quantum system, no gravity.    |
| AdS/CFT                 | Bulk gravity = boundary quantum (same physics).  |

When you look at a {7,3} tiling in the Poincare disk:

- This is not literally our universe
- It is a simplified spatial slice of a negatively curved spacetime
- Its discrete structure can mimic how distances, scales, and
  information flow in a gravitational AdS world

## Tiling Features Map to Physics

| Tiling Feature    | Physics Concept                   |
| ----------------- | --------------------------------- |
| Layers (depth)    | Energy scale / renormalization    |
| Geodesics         | Propagation paths                 |
| Boundary arcs     | Entanglement regions              |
| Minimal cuts      | Entanglement entropy (RT formula) |
| Tile count growth | Exponential volume of AdS         |

## References

- See also: note/margenstern-applications.md (Quantum Error Correction
  section)
- HaPPY code paper: arXiv:1503.06237
- MERA and holography: PRD 86.065007

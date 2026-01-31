# Hyperbolic Tilings and Quantum Error Correction

The connection between hyperbolic tilings like {7,3} and {5,4} and quantum
field theory, quantum error correction, anti-de Sitter space, and AdS/CFT
correspondence.

## 1. The Structural Rhyme: Exponential Room

The hyperbolic plane has exponential growth of circumference vs radius.
Regular tilings like {7,3} and {5,4} are canonical combinatorial
discretizations of that geometry.

This "exponential room" is the common ingredient behind:

- Why hyperbolic tilings are good at routing "wires" without crowding
- Why a boundary layer can be huge relative to bulk depth
- Why tensor networks on hyperbolic tilings look like discrete negatively
  curved space

**This is the seed of the AdS/CFT connection.**

## 2. MERA and Geometry from Entanglement

Brian Swingle's MERA insight: a multiscale entanglement renormalization
network naturally induces a geometry where distances behave hyperbolically,
serving as a discrete model for holography.

### Key Ideas

- A layered network (coarse-graining scale = depth) produces emergent radial
  direction
- The boundary is where fine degrees of freedom live
- Bulk depth indexes renormalization scale
- Graph geodesics approximate minimal surfaces controlling entanglement
  scaling

MERA is not literally a {7,3} tiling, but the moral is: **hyperbolic-like
connectivity encodes scale.**

Reference: Swingle, "Entanglement renormalization and holography"
(Phys. Rev. D 86, 065007)

## 3. AdS/CFT as Error Correcting Code

The modern conceptual pivot:

- Bulk information can be reconstructed from many different boundary regions
- That redundancy is exactly what quantum error correction formalizes

### The HaPPY Code Paper

"Holographic quantum error-correcting codes: Toy models for the bulk/boundary
correspondence" (arXiv:1503.06237)

Core insights:

- The bulk-to-boundary map behaves like an isometry
- Local bulk operators have multiple boundary reconstructions (subregion
  duality)
- "Entanglement wedge reconstruction" is a QEC recovery statement

**This is not just an analogy. It is a working design pattern for discrete
holographic models.**

## 4. Hyperbolic Tilings as Holographic Code Skeleton

The HaPPY construction uses a tensor network on a hyperbolic tiling. Tiles
provide:

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
- Visually and algorithmically nice for "radial layering" and "boundary cut"
  experiments

{7,3} is the archetypal "order-3" hyperbolic tiling used in many demos.

## 5. Ryu-Takayanagi as Minimal Cuts

In AdS/CFT, the Ryu-Takayanagi (RT) formula relates boundary entanglement
entropy to the area of a minimal surface in the bulk.

In discrete tensor network models:

- Entanglement of a boundary interval is approximated by
- The minimal cut through the network separating that boundary region

**Hyperbolic tilings matter because geodesics and minimal cuts behave like
hyperbolic minimal surfaces due to network geometry.**

## 6. Hyperbolic Surface Codes (Different Thread)

A separate but related use of {p,q} tilings: bona fide quantum LDPC-like
codes from tilings of hyperbolic surfaces.

Reference: "Hyperbolic and Semi-Hyperbolic Surface Codes for Quantum Storage"
(arXiv:1703.00590)

### Core Insights

- Hyperbolic tilings allow constant rate (encode constant fraction of qubits)
  while keeping stabilizer weights bounded
- Distances scale more slowly than Euclidean surface codes
- Overhead can be favorable for storage under some regimes

**Same hyperbolic combinatorics, different coding goal.**

## 7. Decoding as Algorithmic Problem

Once you lay a code on a {p,q}-like hyperbolic network, you can ask:

- How to decode erasures?
- How to decode Pauli noise?
- What is the best recovery map?

Reference: "Decoding holographic codes with an integer optimization decoder"
(Phys. Rev. A 102, 062417)

Connects geometry to implementable decoding tasks and benchmarks.

## 8. Modern Constructions: Hyperbolic Floquet Codes

Recent work uses hyperbolic tilings for codes with attractive overhead/
threshold tradeoffs in fault-tolerant protocols.

References:

- Fault-tolerant hyperbolic Floquet codes (JQI 2025)
- Distributed QEC using hyperbolic Floquet ideas (arXiv:2501.14029)

More applied, relevant for actual code performance.

## 9. The Engineering Translation

### A) Hyperbolic Tiling as Discretized Spatial Slice of AdS

- Constant-time slice of AdS is hyperbolic (negative curvature)
- Regular hyperbolic tiling is combinatorial discretization
- Boundary of slice is large, supports "CFT degrees of freedom"

### B) Tensor Network on Tiling as Bulk-to-Boundary Encoder

- Put tensors on tiles, contract along edges
- Remaining free legs at boundary are physical qubits
- Bulk legs represent logical degrees of freedom

### C) Error Correction IS the Mechanism of Holography

- Bulk operators can be reconstructed from different boundary regions
- That is redundancy of encoding, hallmark of QEC

### D) Minimal Cuts Approximate Entanglement Surfaces

- Boundary entanglement tracks minimal bulk cuts
- Hyperbolic geometry gives correct scaling behavior

### E) Different Code Families Use Geometry Differently

| Family                  | Focus                                   |
| ----------------------- | --------------------------------------- |
| HaPPY-like holographic  | Bulk/boundary reconstruction properties |
| Hyperbolic surface codes| LDPC stabilizers, rate, distance        |

## 10. Reading Path

| Paper                                          | Why It Matters                         |
| ---------------------------------------------- | -------------------------------------- |
| Holographic QEC codes (arXiv:1503.06237)       | Foundational AdS/CFT + QEC bridge      |
| Entanglement renormalization (PRD 86.065007)   | MERA looks hyperbolic, geometry from entanglement |
| Hyperbolic surface codes (arXiv:1703.00590)    | Practical code substrates              |
| Decoding holographic codes (PRA 102.062417)    | Implementation and algorithms          |
| LEGO_HQEC (arXiv:2410.22861)                   | Modern tooling and formalism           |

## 11. Connection to {p,q} Engine and CA Simulator

The same combinatorial kernel can be reused:

### What Your Coordinate System Provides

- Fast addressing
- Neighbor lists
- Graph distance (layers)

### What It Enables

| Application                      | Uses                                    |
| -------------------------------- | --------------------------------------- |
| Hyperbolic tensor network sim    | Place tensors, contract, compute cuts   |
| Hyperbolic code simulator        | Define stabilizers/checks on faces/edges|
| Hyperbolic CA simulator          | Update local rules                      |

### Unifying Architecture

Build a "hyperbolic substrate" once and plug in:

- CA dynamics
- Tensor network encoding / minimal cut visualization
- Surface-code stabilizer complexes on closed hyperbolic surface quotient

## 12. Immediate Next Step

**Most direct experiment**: Implement a tool that, on {7,3} or {5,4} graph,
computes minimal edge cuts separating a chosen boundary interval and plots
the cut.

This makes the RT-min-cut idea tangible immediately.

## 13. Experiment Menu for {7,3}/{5,4} Tilings

1. Build a toy HaPPY-like network
2. Measure minimal cuts
3. Simulate random erasures on boundary
4. Attempt greedy reconstruction

All on top of your coordinate engine.

## Key Insights Summary

| Concept                  | Hyperbolic Connection                         |
| ------------------------ | --------------------------------------------- |
| Exponential growth       | Why boundary >> bulk, why wires route well    |
| MERA                     | Renormalization scale = radial depth          |
| HaPPY codes              | Perfect tensors on tiles, isometric encoding  |
| Ryu-Takayanagi           | Entanglement = minimal cut area               |
| Subregion duality        | Multiple reconstructions = error correction   |
| Constant rate codes      | Hyperbolic tilings enable LDPC-like bounds    |
| Floquet codes            | Modern practical fault-tolerant constructions |

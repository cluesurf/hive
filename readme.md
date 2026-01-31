<br/>
<br/>
<br/>
<br/>
<br/>
<br/>
<br/>

<h3 align='center'>@cluesurf/hive</h3>
<p align='center'>
  Visualization Basics in TypeScript<br/>
  <em>(WIP)</em>
</p>

<br/>
<br/>
<br/>

## Introduction

Hive aims to be TypeScript library for visualizing and exploring the 3
main geometries. It provides a unified framework for working with
hyperbolic, spherical, and Euclidean spaces in 2D, 3D, and higher
dimensions. The library enables generation of tessellations, honeycombs,
fractals, kaleidoscopic patterns, and cellular automata across all three
geometries.

The core design uses pluggable geometry implementations with a shared
abstract interface. This means the same algorithms for tessellation,
curve drawing, camera navigation, and rendering work seamlessly whether
you're tiling the hyperbolic plane with heptagons, packing spheres on a
globe, or laying out a square grid. Internal coordinates use the
mathematically optimal model for each geometry (hyperboloid for
hyperbolic, unit sphere for spherical), with projection layers for
display (Poincare disk, stereographic, etc.).

Beyond basic visualization, the library supports audio-reactive
animations, music visualizers, L-system fractals, escape-time fractals
like Mandelbrot and Julia sets, and deep integration between systems.
You can nest fractals inside tessellation tiles, apply kaleidoscopic
symmetry to particle systems, or explore the limit sets of hyperbolic
honeycombs. The rendering layer is optional, so core geometry can run in
Node.js or Web Workers for computation-heavy tasks.

## Current Example

This is phase 1 of the vibe coding UI, 2D demo. _(Test with
`pnpm test:site` and see)._

<p align='center'>
  <img src='https://github.com/cluesurf/hive/blob/make/view/vibe-phase-1.png?raw=true'/>
</p>

## Digging In

- Start digging around in the
  [`./note`](https://github.com/cluesurf/hive/tree/make/note) folder for
  documentations/plans/specs, and general notes and ideas on how we're
  going to accomplish some things.
- Check the [`./code`](https://github.com/cluesurf/hive/tree/make/code)
  folder for where we put all the library code.

## Inspiration

- [hyperbolic tessellations/honeycombs codebases](https://github.com/lancejpollard?submit=Search&q=hyperbolic&tab=stars&type=&sort=&direction=&submit=Search)

## License

MIT

## ClueSurf

Made by [ClueSurf](https://clue.surf), meditating on the universe ¤.
Follow the work on [YouTube](https://youtube.com/@cluesurf),
[X](https://x.com/cluesurf),
[Instagram](https://instagram.com/cluesurf),
[Substack](https://cluesurf.substack.com),
[Facebook](https://facebook.com/cluesurf), and
[LinkedIn](https://linkedin.com/company/cluesurf), and browse more of
our open-source work here on [GitHub](https://github.com/cluesurf).

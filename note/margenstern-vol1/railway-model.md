# Railway Model of Computation

Notes on the railway model used for proving computational universality
in hyperbolic cellular automata.

From "A universal cellular automaton in the hyperbolic plane" and
Margenstern's Volume 1 and 2.

## Overview

The railway model is an alternative proof method for weak universality
in hyperbolic CA. It uses a track-based metaphor where particles (like
trains) traverse tracks through switches.

## Switches

A **switch** is a point where a track splits from one into two.

### Directions

Two ways to traverse a switch:

| Direction | Description               | Also Called |
| --------- | ------------------------- | ----------- |
| Forward   | 1 track → one of 2 tracks | Active      |
| Backward  | one of 2 tracks → 1 track | Passive     |

### Switch Types

Three types of switches:

#### 1. Fixed Switch

Always routes to the same output track on active passage.

```
      ___ o
i ___/
     \___
```

or

```
      ___
i ___/
     \___ o
```

Behavior: No state change, deterministic routing.

#### 2. Toggle (Flip-Flop) Switch

Alternates between output tracks depending on last active passage.

```
         ___ o
1  i ___/
        \___

         ___
2  i ___/
        \___ o

         ___ o
3  i ___/
        \___

         ___
4  i ___/
        \___ o

...
```

Behavior: Each active passage flips the switch state.

#### 3. Memory Switch

Sends active passage to the track that the last passive passage came
through.

```
          ___ i
1a  o ___/
         \___

          ___ o
2a  i ___/
         \___

          ___ o
3a  i ___/
         \___

...

          ___
1b  o ___/
         \___ i

          ___
2b  i ___/
         \___ o

          ___
3b  i ___/
         \___ o

...
```

Behavior:

- Remembers which passive input last arrived
- Routes active output to that remembered track
- Only changes direction when passive passage comes from alternate track

## Other Components

| Component | Description                          |
| --------- | ------------------------------------ |
| Tracks    | Directed edges for particle movement |
| Crossing  | Two tracks cross without interaction |
| Station   | Entry/exit points for particles      |

## Registers

### Unit Register

Used for incrementing and decrementing operations.

The **content** of the elementary circuit is encoded by switch
positions.

Components:

- (m) = memory switch
- (t) = toggle switch

```
          ________________ o1
         /        \
i1___(m)/          \(t)___ i2
        \          /
         \________/_______ o2
```

Operations:

- Going in through left on (m) = read
- Going in from right on (t) = write

The toggle switch performs a NOT operation on circuit content.

### Incrementing the Unit Register

Pass through toggle to flip state.

### Decrementing the Unit Register

Pass through memory switch to read current state.

## Universality Proof via Railway

### How It Works

1. Railway circuits can simulate any Boolean circuit
2. Boolean circuits are universal for computation
3. Therefore railway circuits are computationally universal
4. A CA that can implement railway components is universal

### Implementation in Hyperbolic CA

Switches and crossings implemented using:

- Local state patterns in cells
- Signal propagation through Fibonacci tree
- State transitions encoding switch behavior

### Weak vs Strong Universality

| Type   | Requirement                             |
| ------ | --------------------------------------- |
| Weak   | Requires infinite initial configuration |
| Strong | Works from finite configuration         |

Railway circuit constructions typically prove weak universality. Strong
universality requires additional self-replication mechanisms.

## Implementation Relevance

### For CA Simulation

Understanding railway components helps with:

- Building computation patterns in hyperbolic CA
- Designing debug visualizations for signal flow
- Understanding why certain state machines emerge

### Component Catalog

For a full CA simulator, implement these primitives:

1. Track segment (straight path)
2. Track crossing (non-interacting)
3. Fixed switch
4. Toggle switch
5. Memory switch
6. Station (input/output)

### Testing Strategy

Verify components work by:

- Sending test particles through each component type
- Checking state changes match expected behavior
- Verifying crossings don't interfere
- Testing multi-component circuits

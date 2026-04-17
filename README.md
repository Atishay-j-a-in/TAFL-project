# CFG <-> PDA Studio
deployed link - https://cfgpdaconversion.netlify.app/
An interactive educational web app for Theory of Computation students to explore equivalence between:
- Context-Free Grammars (CFG)
- Pushdown Automata (PDA)

The project supports both conversion directions, step-by-step explanations, visual diagrams, an interactive PDA editor, and animated stack simulation.

## Project Files

- `index.html`: App structure and UI sections
- `styles.css`: Neobrutalist theme, layout, and animations
- `app.js`: Conversion logic, visualization, editor interactions, and simulation

## How To Run

This is a static frontend project.

1. Open the project folder in VS Code.
2. Open `index.html` in a browser.
3. Optional (recommended): use the VS Code Live Server extension for auto-refresh while editing.

No build step or package installation is required.

## Main Features

- Mode switcher for:
  - CFG -> PDA
  - PDA -> CFG
- CFG -> PDA conversion with generated transitions and PDA diagram
- PDA -> CFG conversion using `[p,X,q]`-style variables
- CFG simplification summary (removes non-generating and unreachable variables)
- Interactive PDA editor:
  - Add/update states
  - Mark start/accept states
  - Add transitions
  - Drag states on the graph
  - Sync editor model to/from JSON
- Animated PDA stack simulation in both modes
- Diagram interactions:
  - Hover bounce
  - Click a state to focus related transitions
  - Click empty area to clear focus

## Input Format Guide

### CFG Input Format

In CFG -> PDA mode, write one production per line:

```text
S -> aSb | T
T -> cT | epsilon
```

Rules:
- Left side should be a single uppercase variable (`S`, `A`, `T`, etc.)
- Use `|` for alternatives
- Use `epsilon` for empty production

### PDA JSON Format

In PDA -> CFG mode, provide JSON like:

```json
{
  "states": ["q0", "q1", "qf"],
  "inputAlphabet": ["a", "b"],
  "stackAlphabet": ["Z", "S", "a", "b"],
  "startState": "q0",
  "startStack": "Z",
  "acceptStates": ["qf"],
  "transitions": [
    { "from": "q0", "input": "epsilon", "pop": "epsilon", "to": "q1", "push": ["S", "Z"] },
    { "from": "q1", "input": "epsilon", "pop": "S", "to": "q1", "push": ["a", "S", "b"] },
    { "from": "q1", "input": "epsilon", "pop": "S", "to": "q1", "push": [] },
    { "from": "q1", "input": "a", "pop": "a", "to": "q1", "push": [] },
    { "from": "q1", "input": "b", "pop": "b", "to": "q1", "push": [] },
    { "from": "q1", "input": "epsilon", "pop": "Z", "to": "qf", "push": [] }
  ]
}
```

Notes:
- Use `epsilon` as a string for epsilon input/pop
- `push` must be an array (empty array means push nothing)

## How To Use (Quick Walkthrough)

### A) CFG -> PDA

1. Select `CFG -> PDA` mode.
2. Enter start symbol and grammar productions.
3. Click `Convert CFG to PDA`.
4. Review:
   - conversion steps
   - transition table
   - generated PDA diagram
5. (Optional) Enter an input string and click `Simulate CFG-derived PDA` to see animated stack behavior.

### B) PDA -> CFG

1. Select `PDA -> CFG` mode.
2. Paste PDA JSON (or build it with the editor tools).
3. Click `Convert PDA to CFG`.
4. Review:
   - conversion steps
   - generated CFG
   - simplification summary
   - visual diagram and transition legend
5. (Optional) Run stack simulation with an input string.

### C) Interactive PDA Editor

1. Add states with `Add/Update State`.
2. Mark start/accept states using checkboxes.
3. Add transitions using the transition row controls.
4. Drag nodes in the graph to rearrange layout.
5. Click `Sync Editor -> JSON` to update the JSON input and convert.

## Troubleshooting

- If conversion fails, check error text shown under the convert button.
- CFG parse errors usually come from invalid production syntax.
- PDA parse errors usually come from missing JSON fields or non-array `push` values.
- If simulation seems stuck, verify transitions allow progress for your input.

## Educational Scope

This tool is designed for learning and visualization of equivalence constructions. For very large PDAs/grammars, generated outputs can become large by nature of formal conversions.

## Demo Examples

Use these examples to test the app quickly.

### Example 1: Balanced a^n b^n (CFG)

Paste into CFG input:

```text
S -> aSb | epsilon
```

Try simulation strings:
- Accepted: `ab`, `aabb`, `aaabbb`, empty string
- Rejected: `aab`, `abb`, `aaabb`

### Example 2: Mixed Pattern with Optional c-chain (CFG)

Paste into CFG input:

```text
S -> aSb | T
T -> cT | epsilon
```

Try simulation strings:
- Accepted: `aacbb`, `cc`, `aabbccc`, empty string
- Rejected: `acbb`, `abccca`, `cab`

### Example 3: PDA for a^n b^n

Paste into PDA JSON input:

```json
{
  "states": ["q0", "q1", "q2", "qf"],
  "inputAlphabet": ["a", "b"],
  "stackAlphabet": ["Z", "A"],
  "startState": "q0",
  "startStack": "Z",
  "acceptStates": ["qf"],
  "transitions": [
    { "from": "q0", "input": "epsilon", "pop": "epsilon", "to": "q1", "push": ["Z"] },
    { "from": "q1", "input": "a", "pop": "epsilon", "to": "q1", "push": ["A"] },
    { "from": "q1", "input": "b", "pop": "A", "to": "q2", "push": [] },
    { "from": "q2", "input": "b", "pop": "A", "to": "q2", "push": [] },
    { "from": "q2", "input": "epsilon", "pop": "Z", "to": "qf", "push": [] }
  ]
}
```

Try simulation strings:
- Accepted: `ab`, `aabb`, `aaabbb`
- Rejected: `aab`, `abb`, empty string

### Example 4: PDA with epsilon branch (matches a* b*)

Paste into PDA JSON input:

```json
{
  "states": ["q0", "q1", "qf"],
  "inputAlphabet": ["a", "b"],
  "stackAlphabet": ["Z"],
  "startState": "q0",
  "startStack": "Z",
  "acceptStates": ["qf"],
  "transitions": [
    { "from": "q0", "input": "a", "pop": "epsilon", "to": "q0", "push": [] },
    { "from": "q0", "input": "epsilon", "pop": "epsilon", "to": "q1", "push": [] },
    { "from": "q1", "input": "b", "pop": "epsilon", "to": "q1", "push": [] },
    { "from": "q1", "input": "epsilon", "pop": "Z", "to": "qf", "push": [] }
  ]
}
```

Try simulation strings:
- Accepted: empty string, `a`, `aaabbb`, `bbb`
- Rejected: `ba`, `abba`

Name - Atishay Jain
Roll No- 2024UCS1510
Submitted To - Prof. Anmol Awasthi

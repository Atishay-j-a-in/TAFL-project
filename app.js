const byId = (id) => document.getElementById(id);

const introPage = byId("introPage");
const converterApp = byId("converterApp");
const startConversionBtn = byId("startConversionBtn");
const backToIntroBtn = byId("backToIntroBtn");

const showCfgModeBtn = byId("showCfgModeBtn");
const showPdaModeBtn = byId("showPdaModeBtn");
const cfgMode = byId("cfgMode");
const pdaMode = byId("pdaMode");

const cfgStartInput = byId("cfgStart");
const cfgInput = byId("cfgInput");
const convertCfgBtn = byId("convertCfgBtn");
const runCfgPdaSimBtn = byId("runCfgPdaSimBtn");
const cfgSimInput = byId("cfgSimInput");
const cfgSimResult = byId("cfgSimResult");
const cfgStackViz = byId("cfgStackViz");
const cfgError = byId("cfgError");
const cfgSteps = byId("cfgSteps");
const cfgToPdaTransitions = byId("cfgToPdaTransitions");
const cfgToPdaDiagram = byId("cfgToPdaDiagram");

const pdaInput = byId("pdaInput");
const convertPdaBtn = byId("convertPdaBtn");
const runPdaSimBtn = byId("runPdaSimBtn");
const pdaSimInput = byId("pdaSimInput");
const pdaSimResult = byId("pdaSimResult");
const pdaStackViz = byId("pdaStackViz");
const pdaError = byId("pdaError");
const pdaSteps = byId("pdaSteps");
const pdaToCfgOutput = byId("pdaToCfgOutput");
const pdaSimplifyInfo = byId("pdaSimplifyInfo");
const pdaDiagram = byId("pdaDiagram");
const cfgDiagram = byId("cfgDiagram");

const editorStateName = byId("editorStateName");
const editorStateAccept = byId("editorStateAccept");
const editorStateStart = byId("editorStateStart");
const editorAddStateBtn = byId("editorAddStateBtn");
const editorFromState = byId("editorFromState");
const editorInputSymbol = byId("editorInputSymbol");
const editorPopSymbol = byId("editorPopSymbol");
const editorToState = byId("editorToState");
const editorPushSymbols = byId("editorPushSymbols");
const editorAddTransitionBtn = byId("editorAddTransitionBtn");
const loadJsonToEditorBtn = byId("loadJsonToEditorBtn");
const syncEditorToJsonBtn = byId("syncEditorToJsonBtn");
const pdaEditorGraph = byId("pdaEditorGraph");

let latestGeneratedPda = null;
let cfgAnimationToken = 0;
let pdaAnimationToken = 0;

const editorModel = {
  states: [],
  startState: "",
  acceptStates: [],
  transitions: [],
  inputAlphabet: [],
  stackAlphabet: [],
  startStack: "Z",
  positions: {},
};

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function showConverterApp() {
  introPage.classList.add("app-hidden");
  converterApp.classList.remove("app-hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showIntroPage() {
  converterApp.classList.add("app-hidden");
  introPage.classList.remove("app-hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setMode(mode) {
  cfgAnimationToken += 1;
  pdaAnimationToken += 1;
  const cfgActive = mode === "cfg";
  cfgMode.classList.toggle("active-view", cfgActive);
  pdaMode.classList.toggle("active-view", !cfgActive);
  showCfgModeBtn.classList.toggle("active", cfgActive);
  showPdaModeBtn.classList.toggle("active", !cfgActive);
}

function setError(el, message) {
  el.textContent = message || "";
}

function setSteps(listEl, steps) {
  listEl.innerHTML = "";
  steps.forEach((step) => {
    const li = document.createElement("li");
    li.textContent = step;
    listEl.appendChild(li);
  });
}

function renderStackSteps(target, trace) {
  target.innerHTML = "";
  if (!trace.length) {
    return;
  }

  trace.forEach((entry) => {
    const row = document.createElement("div");
    row.className = "stack-step";

    const label = document.createElement("div");
    label.className = "stack-label";
    label.textContent = `${entry.step}: ${entry.note}`;
    row.appendChild(label);

    const stackSymbols = entry.stack.length ? [...entry.stack].reverse() : ["epsilon"];
    stackSymbols.forEach((sym) => {
      const chip = document.createElement("div");
      chip.className = "stack-item";
      chip.textContent = sym;
      row.appendChild(chip);
    });

    target.appendChild(row);
  });
}

function animateStackSteps(target, trace, statusEl, finalMessage, tokenGetter) {
  target.innerHTML = "";
  if (!trace.length) {
    statusEl.textContent = finalMessage;
    return;
  }

  let index = 0;
  const delayMs = 430;

  const tick = () => {
    if (tokenGetter() === null) {
      return;
    }

    renderStackSteps(target, trace.slice(0, index + 1));
    statusEl.textContent = `Simulating step ${index + 1} of ${trace.length}...`;
    index += 1;

    if (index < trace.length) {
      setTimeout(tick, delayMs);
      return;
    }

    statusEl.textContent = finalMessage;
  };

  tick();
}

function parseCfg(raw) {
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    throw new Error("Provide at least one production.");
  }

  const productions = [];
  const variables = new Set();
  const terminals = new Set();

  lines.forEach((line) => {
    const parts = line.split("->");
    if (parts.length !== 2) {
      throw new Error(`Invalid production format: ${line}`);
    }
    const left = parts[0].trim();
    const right = parts[1].trim();

    if (!left || left.length !== 1 || !/[A-Z]/.test(left)) {
      throw new Error(`Left side must be one uppercase variable: ${left || "(empty)"}`);
    }

    variables.add(left);

    const alternatives = right.split("|").map((item) => item.trim());
    alternatives.forEach((alt) => {
      const rhs = alt === "epsilon" || alt === "e" || alt === "" ? [] : alt.split("");
      rhs.forEach((symbol) => {
        if (/[A-Z]/.test(symbol)) {
          variables.add(symbol);
        } else {
          terminals.add(symbol);
        }
      });
      productions.push({ left, right: rhs });
    });
  });

  return { productions, variables: [...variables], terminals: [...terminals] };
}

function cfgToPda(cfg, startSymbol) {
  const states = ["q_start", "q_loop", "q_accept"];
  const transitions = [];
  const steps = [];

  transitions.push({
    from: "q_start",
    input: "epsilon",
    pop: "epsilon",
    to: "q_loop",
    pushArray: [startSymbol],
    note: "Push start symbol above existing bottom marker.",
  });
  steps.push("Create q_start, q_loop, q_accept and push S over existing bottom marker $.");

  cfg.productions.forEach((prod) => {
    transitions.push({
      from: "q_loop",
      input: "epsilon",
      pop: prod.left,
      to: "q_loop",
      pushArray: prod.right,
      note: `${prod.left} -> ${prod.right.length ? prod.right.join("") : "epsilon"}`,
    });
  });
  steps.push("Add epsilon transitions for each grammar production expansion.");

  cfg.terminals.forEach((terminal) => {
    transitions.push({
      from: "q_loop",
      input: terminal,
      pop: terminal,
      to: "q_loop",
      pushArray: [],
      note: `Match terminal ${terminal}`,
    });
  });
  steps.push("Add transitions that read and pop matching terminals.");

  transitions.push({
    from: "q_loop",
    input: "epsilon",
    pop: "$",
    to: "q_accept",
    pushArray: [],
    note: "Accept when only bottom marker remains.",
  });
  steps.push("Accept by popping bottom marker in q_loop and moving to q_accept.");

  return {
    states,
    transitions,
    steps,
    startState: "q_start",
    acceptStates: ["q_accept"],
    startStack: "$",
    stackAlphabet: [...new Set(["$", ...cfg.variables, ...cfg.terminals])],
    inputAlphabet: cfg.terminals,
  };
}

function pushLabel(pushArray) {
  return pushArray.length ? pushArray.join("") : "epsilon";
}

function renderTransitionTable(transitions, target) {
  const rows = transitions
    .map(
      (t) => `
      <tr>
        <td>${escapeHtml(t.from)}</td>
        <td>${escapeHtml(t.input)}</td>
        <td>${escapeHtml(t.pop)}</td>
        <td>${escapeHtml(t.to)}</td>
        <td>${escapeHtml(pushLabel(t.pushArray))}</td>
        <td>${escapeHtml(t.note || "")}</td>
      </tr>
    `
    )
    .join("");

  target.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>From</th>
          <th>Input</th>
          <th>Pop</th>
          <th>To</th>
          <th>Push</th>
          <th>Meaning</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function parsePda(raw) {
  const pda = JSON.parse(raw);
  const required = [
    "states",
    "stackAlphabet",
    "startState",
    "startStack",
    "acceptStates",
    "transitions",
  ];

  required.forEach((key) => {
    if (!(key in pda)) {
      throw new Error(`Missing PDA field: ${key}`);
    }
  });

  if (!Array.isArray(pda.states) || !pda.states.length) {
    throw new Error("PDA states must be a non-empty array.");
  }

  pda.transitions.forEach((t, idx) => {
    ["from", "input", "pop", "to", "push"].forEach((field) => {
      if (!(field in t)) {
        throw new Error(`Transition ${idx + 1} missing field ${field}`);
      }
    });
    if (!Array.isArray(t.push)) {
      throw new Error(`Transition ${idx + 1} field push must be an array.`);
    }
  });

  return {
    ...pda,
    transitions: pda.transitions.map((t) => ({
      ...t,
      pushArray: [...t.push],
    })),
  };
}

function variableName(p, symbol, q) {
  return `[${p},${symbol},${q}]`;
}

function pdaToCfg(pda) {
  const productions = new Map();
  const steps = [];

  const states = pda.states;
  const stackAlphabet = pda.stackAlphabet;

  stackAlphabet.forEach((stackSym) => {
    states.forEach((p) => {
      states.forEach((q) => {
        productions.set(variableName(p, stackSym, q), []);
      });
    });
  });
  steps.push("Create variables [p,X,q] for all state pairs and stack symbol X.");

  const startVariable = "S";
  productions.set(startVariable, []);
  pda.acceptStates.forEach((finalState) => {
    productions.get(startVariable).push(variableName(pda.startState, pda.startStack, finalState));
  });
  steps.push("Set S to begin from [startState,startStack,acceptState].");

  pda.transitions.forEach((transition) => {
    if (transition.pop === "epsilon") {
      return;
    }

    const inputSymbol = transition.input === "epsilon" ? "epsilon" : transition.input;

    states.forEach((qTarget) => {
      const left = variableName(transition.from, transition.pop, qTarget);
      const rightList = productions.get(left) || [];

      if (transition.pushArray.length === 0) {
        if (transition.to === qTarget) {
          rightList.push(inputSymbol);
        }
        productions.set(left, rightList);
        return;
      }

      const pushSymbols = transition.pushArray;

      const buildCombinations = (depth, middleStates) => {
        if (depth === pushSymbols.length - 1) {
          const chain = [];
          let currentFrom = transition.to;

          pushSymbols.forEach((symbol, idx) => {
            const currentTo = idx === pushSymbols.length - 1 ? qTarget : middleStates[idx];
            chain.push(variableName(currentFrom, symbol, currentTo));
            currentFrom = currentTo;
          });

          const right = [inputSymbol, ...chain].filter((token) => token !== "epsilon").join(" ") || "epsilon";
          rightList.push(right);
          return;
        }

        states.forEach((stateChoice) => {
          middleStates.push(stateChoice);
          buildCombinations(depth + 1, middleStates);
          middleStates.pop();
        });
      };

      buildCombinations(0, []);
      productions.set(left, rightList);
    });
  });
  steps.push("Translate each PDA transition into corresponding grammar productions.");

  for (const [left, rightList] of productions.entries()) {
    productions.set(left, [...new Set(rightList)]);
  }
  steps.push("Remove duplicate productions.");

  const simplification = simplifyCfg(productions, startVariable);
  steps.push("Apply simplification: remove non-generating and unreachable variables.");

  return {
    startVariable,
    productions: simplification.productions,
    rawProductions: productions,
    text: mapToGrammarText(simplification.productions, startVariable),
    simplifyInfo: simplification.info,
    steps,
  };
}

function tokenizeRhs(rhs) {
  if (rhs === "epsilon") {
    return [];
  }
  return rhs.split(" ").filter(Boolean);
}

function mapToGrammarText(productions, startVariable) {
  const lines = [`Start Symbol: ${startVariable}`, ""];
  for (const [left, rightList] of productions.entries()) {
    if (!rightList.length) {
      continue;
    }
    lines.push(`${left} -> ${rightList.join(" | ")}`);
  }
  return lines.join("\n");
}

function shortTransitionText(t) {
  return `${t.input},${t.pop}->${pushLabel(t.pushArray)}`;
}

function groupedTransitions(transitions) {
  const groupMap = new Map();
  transitions.forEach((t) => {
    const key = `${t.from}@@${t.to}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, { from: t.from, to: t.to, labels: [] });
    }
    groupMap.get(key).labels.push(shortTransitionText(t));
  });
  return [...groupMap.values()];
}

function diagramLegendRows(groupedEdges) {
  const rows = [];
  groupedEdges.forEach((edge, idx) => {
    const uniq = [...new Set(edge.labels)];
    uniq.forEach((label, labelIdx) => {
      rows.push({
        id: idx + 1,
        from: edge.from,
        to: edge.to,
        label,
        first: labelIdx === 0,
      });
    });
  });
  return rows;
}

function multilineTextSvg(x, y, lines, cssClass, fromState, toState) {
  const dataAttrs =
    fromState && toState ? ` data-from="${escapeHtml(fromState)}" data-to="${escapeHtml(toState)}"` : "";
  const tspanLines = lines
    .map((line, idx) => `<tspan x="${x}" dy="${idx === 0 ? 0 : 14}">${escapeHtml(line)}</tspan>`)
    .join("");
  return `<text x="${x}" y="${y}" class="${cssClass}" font-size="12" font-family="Space Mono"${dataAttrs}>${tspanLines}</text>`;
}

function applyDiagramFocus(svg, selectedState) {
  const nodes = [...svg.querySelectorAll(".focusable-state")];
  const edges = [...svg.querySelectorAll(".focusable-edge")];

  if (!selectedState) {
    nodes.forEach((node) => {
      node.classList.remove("is-active", "is-dimmed");
    });
    edges.forEach((edge) => {
      edge.classList.remove("is-active", "is-dimmed");
    });
    return;
  }

  nodes.forEach((node) => {
    const isActive = node.dataset.state === selectedState;
    node.classList.toggle("is-active", isActive);
    node.classList.toggle("is-dimmed", !isActive);
  });

  edges.forEach((edge) => {
    const isRelated = edge.dataset.from === selectedState || edge.dataset.to === selectedState;
    edge.classList.toggle("is-active", isRelated);
    edge.classList.toggle("is-dimmed", !isRelated);
  });
}

function attachDiagramFocusInteractions(target) {
  const svg = target.querySelector("svg");
  if (!svg) {
    return;
  }

  let selectedState = "";

  const focusableStates = svg.querySelectorAll(".focusable-state");
  focusableStates.forEach((node) => {
    node.addEventListener("click", (event) => {
      event.stopPropagation();
      const state = node.dataset.state;
      selectedState = selectedState === state ? "" : state;
      applyDiagramFocus(svg, selectedState);
    });
  });

  svg.addEventListener("click", (event) => {
    if (!event.target.closest(".focusable-state")) {
      selectedState = "";
      applyDiagramFocus(svg, selectedState);
    }
  });
}

function simplifyCfg(initialProductions, startVariable) {
  const variableSet = new Set([...initialProductions.keys()]);

  const generating = new Set();
  let changed = true;
  while (changed) {
    changed = false;
    for (const [left, rightList] of initialProductions.entries()) {
      if (generating.has(left)) {
        continue;
      }
      const hasGeneratingAlternative = rightList.some((rhs) => {
        const tokens = tokenizeRhs(rhs);
        return tokens.every((token) => !variableSet.has(token) || generating.has(token));
      });
      if (hasGeneratingAlternative) {
        generating.add(left);
        changed = true;
      }
    }
  }

  const generatingOnly = new Map();
  for (const [left, rightList] of initialProductions.entries()) {
    if (!generating.has(left)) {
      continue;
    }
    const filtered = rightList.filter((rhs) =>
      tokenizeRhs(rhs).every((token) => !variableSet.has(token) || generating.has(token))
    );
    generatingOnly.set(left, [...new Set(filtered)]);
  }

  const reachable = new Set([startVariable]);
  const queue = [startVariable];
  while (queue.length) {
    const current = queue.shift();
    const rightList = generatingOnly.get(current) || [];
    rightList.forEach((rhs) => {
      tokenizeRhs(rhs).forEach((token) => {
        if (generatingOnly.has(token) && !reachable.has(token)) {
          reachable.add(token);
          queue.push(token);
        }
      });
    });
  }

  const simplified = new Map();
  for (const [left, rightList] of generatingOnly.entries()) {
    if (!reachable.has(left)) {
      continue;
    }
    const kept = rightList.filter((rhs) =>
      tokenizeRhs(rhs).every((token) => !generatingOnly.has(token) || reachable.has(token))
    );
    simplified.set(left, [...new Set(kept)]);
  }

  return {
    productions: simplified,
    info: [
      `Original variables: ${initialProductions.size}`,
      `Generating variables kept: ${generatingOnly.size}`,
      `Reachable variables kept: ${simplified.size}`,
      `Removed variables: ${initialProductions.size - simplified.size}`,
    ].join("\n"),
  };
}

function renderSimplePdaSvg(target, states, transitions, startState, acceptStates) {
  if (!states.length) {
    target.innerHTML = "";
    return;
  }

  const width = Math.max(960, states.length * 280);
  const graphHeight = 320;
  const radius = 48;
  const centerY = 170;
  const gap = width / (states.length + 1);
  const positions = {};

  states.forEach((state, idx) => {
    positions[state] = { x: Math.round((idx + 1) * gap), y: centerY };
  });

  const grouped = groupedTransitions(transitions);
  const legendRows = diagramLegendRows(grouped);
  const legendTop = graphHeight + 24;
  const legendLineHeight = 18;
  const legendTitleHeight = 34;
  const legendHeight = legendTitleHeight + Math.max(legendRows.length, 1) * legendLineHeight + 20;
  const height = graphHeight + legendHeight;

  const edgeLayers = grouped.map((edge, idx) => {
    const from = positions[edge.from] || { x: 120, y: centerY };
    const to = positions[edge.to] || { x: width - 120, y: centerY };
    const edgeTag = `e${idx + 1}`;

    if (edge.from === edge.to) {
      const loopPath = `<path d="M ${from.x} ${from.y - radius} C ${from.x + 54} ${from.y - 132}, ${from.x - 54} ${from.y - 132}, ${from.x} ${from.y - radius}" class="arrow edge-path focusable-edge" data-from="${escapeHtml(
        edge.from
      )}" data-to="${escapeHtml(edge.to)}"></path>`;
      const loopLabel = multilineTextSvg(
        from.x + 62,
        from.y - 120,
        [edgeTag],
        "edge-label focusable-edge",
        edge.from,
        edge.to
      );
      return loopPath + loopLabel;
    }

    const midX = (from.x + to.x) / 2;
    const bend = idx % 2 === 0 ? -42 : -20;
    const path = `<path d="M ${from.x + radius} ${from.y} Q ${midX} ${from.y + bend} ${to.x - radius} ${to.y}" class="arrow edge-path focusable-edge" data-from="${escapeHtml(
      edge.from
    )}" data-to="${escapeHtml(edge.to)}"></path>`;
    const label = multilineTextSvg(
      midX - 10,
      from.y + bend - 8,
      [edgeTag],
      "edge-label focusable-edge",
      edge.from,
      edge.to
    );
    return path + label;
  });

  const legendLines = legendRows
    .map((row, idx) => {
      const y = legendTop + legendTitleHeight + idx * legendLineHeight;
      const prefix = row.first ? `e${row.id} ${row.from} -> ${row.to}: ` : "    ";
      return `<text x="28" y="${y}" class="edge-label edge-legend-text focusable-edge" data-from="${escapeHtml(
        row.from
      )}" data-to="${escapeHtml(row.to)}" font-size="13" font-family="Space Mono">${escapeHtml(prefix + row.label)}</text>`;
    })
    .join("");

  const nodes = states
    .map((state) => {
      const pos = positions[state];
      const isAccept = acceptStates.includes(state);
      const inner = isAccept
        ? `<circle cx="${pos.x}" cy="${pos.y}" r="${radius - 5}" class="state accept"></circle>`
        : "";
      return `<g class="focusable-state" data-state="${escapeHtml(state)}">
      <circle cx="${pos.x}" cy="${pos.y}" r="${radius}" class="state state-node ${isAccept ? "accept" : ""}"></circle>
      ${inner}
      <text x="${pos.x}" y="${pos.y + 5}" text-anchor="middle" font-size="19" font-family="Space Mono">${escapeHtml(
        state
      )}</text>
      </g>`;
    })
    .join("");

  const startPos = positions[startState] || positions[states[0]];

  target.innerHTML = `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${Math.max(360, height * 0.7)}" role="img" aria-label="PDA graph">
    <defs>
      <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <polygon points="0 0, 8 4, 0 8" fill="#111"></polygon>
      </marker>
    </defs>
    <line x1="18" y1="${centerY}" x2="${startPos.x - radius - 8}" y2="${centerY}" class="arrow edge-path"></line>
    ${edgeLayers.join("")}
    ${nodes}
    <line x1="18" y1="${legendTop}" x2="${width - 18}" y2="${legendTop}" style="stroke: #111; stroke-width: 3; stroke-dasharray: 5 5;"></line>
    <text x="24" y="${legendTop + 24}" class="edge-label edge-legend-text" font-size="14" font-family="Space Mono">Transition Legend (all labels)</text>
    ${legendLines}
  </svg>`;

  attachDiagramFocusInteractions(target);
}

function simulatePda(pda, input) {
  const maxNodes = 5000;
  const maxStackSize = 60;

  const startNode = {
    state: pda.startState,
    index: 0,
    stack: [pda.startStack],
    parent: null,
    transition: null,
  };

  const queue = [startNode];
  const visited = new Set([`${startNode.state}|${startNode.index}|${startNode.stack.join("")}`]);
  let processed = 0;
  let bestNode = startNode;

  const reconstructTrace = (node) => {
    const chain = [];
    let cursor = node;
    while (cursor) {
      chain.push(cursor);
      cursor = cursor.parent;
    }
    chain.reverse();

    const trace = [{ step: 0, note: `start in ${chain[0].state}`, stack: [...chain[0].stack] }];
    for (let i = 1; i < chain.length; i += 1) {
      const current = chain[i];
      const t = current.transition;
      trace.push({
        step: i,
        note: `${t.from} -- ${t.input},${t.pop}/${pushLabel(t.pushArray)} --> ${t.to}`,
        stack: [...current.stack],
      });
    }
    return trace;
  };

  while (queue.length && processed < maxNodes) {
    const current = queue.shift();
    processed += 1;

    if (current.index > bestNode.index) {
      bestNode = current;
    }

    if (current.index === input.length && pda.acceptStates.includes(current.state)) {
      return {
        accepted: true,
        trace: reconstructTrace(current),
        finalState: current.state,
        consumed: current.index,
      };
    }

    const nextInput = current.index < input.length ? input[current.index] : "epsilon";
    const top = current.stack.length ? current.stack[current.stack.length - 1] : "epsilon";

    const candidates = pda.transitions
      .filter((t) => {
        if (t.from !== current.state) {
          return false;
        }
        const inputMatches = t.input === "epsilon" || t.input === nextInput;
        const popMatches = t.pop === "epsilon" || t.pop === top;
        return inputMatches && popMatches;
      })
      .sort((a, b) => {
        const aConsumes = a.input !== "epsilon" ? 1 : 0;
        const bConsumes = b.input !== "epsilon" ? 1 : 0;
        return bConsumes - aConsumes;
      });

    candidates.forEach((transition) => {
      const newStack = [...current.stack];
      let newIndex = current.index;

      if (transition.input !== "epsilon") {
        newIndex += 1;
      }

      if (transition.pop !== "epsilon") {
        newStack.pop();
      }

      for (let i = transition.pushArray.length - 1; i >= 0; i -= 1) {
        newStack.push(transition.pushArray[i]);
      }

      if (newStack.length > maxStackSize) {
        return;
      }

      const nextNode = {
        state: transition.to,
        index: newIndex,
        stack: newStack,
        parent: current,
        transition,
      };

      const key = `${nextNode.state}|${nextNode.index}|${nextNode.stack.join("")}`;
      if (visited.has(key)) {
        return;
      }
      visited.add(key);
      queue.push(nextNode);
    });
  }

  return {
    accepted: false,
    trace: reconstructTrace(bestNode),
    finalState: bestNode.state,
    consumed: bestNode.index,
  };
}

function renderPdaSummary(target, pda) {
  const lines = pda.transitions
    .slice(0, 18)
    .map((t) => `${t.from} -- ${t.input}, ${t.pop}/${pushLabel(t.pushArray)} --> ${t.to}`)
    .join("\n");

  target.textContent = [
    `States: ${pda.states.join(", ")}`,
    `Start: ${pda.startState}`,
    `Accept: ${pda.acceptStates.join(", ")}`,
    "",
    "Transitions:",
    lines || "(none)",
  ].join("\n");
}

function renderCfgSummary(target, cfgText) {
  target.textContent = cfgText;
}

function randomPosition(index) {
  return { x: 140 + (index % 4) * 170, y: 180 + Math.floor(index / 4) * 90 };
}

function normalizeEditorModel() {
  editorModel.states = [...new Set(editorModel.states)];
  editorModel.acceptStates = editorModel.acceptStates.filter((s) => editorModel.states.includes(s));
  if (!editorModel.startState || !editorModel.states.includes(editorModel.startState)) {
    editorModel.startState = editorModel.states[0] || "";
  }

  editorModel.states.forEach((state, idx) => {
    if (!editorModel.positions[state]) {
      editorModel.positions[state] = randomPosition(idx);
    }
  });
}

function refreshEditorStateOptions() {
  const options = editorModel.states.map((state) => `<option value="${escapeHtml(state)}">${escapeHtml(state)}</option>`).join("");
  editorFromState.innerHTML = options;
  editorToState.innerHTML = options;
}

function renderEditorGraph() {
  normalizeEditorModel();
  refreshEditorStateOptions();

  if (!editorModel.states.length) {
    pdaEditorGraph.textContent = "Add states to begin building a PDA graph.";
    return;
  }

  const grouped = groupedTransitions(editorModel.transitions);
  const legendRows = diagramLegendRows(grouped);

  const edges = grouped
    .map((edge, idx) => {
      const from = editorModel.positions[edge.from];
      const to = editorModel.positions[edge.to];
      if (!from || !to) {
        return "";
      }

      const edgeTag = `e${idx + 1}`;

      if (edge.from === edge.to) {
        return `<path d="M ${from.x} ${from.y - 34} C ${from.x + 42} ${from.y - 108}, ${from.x - 42} ${from.y - 108}, ${from.x} ${from.y - 34}" class="arrow edge-path focusable-edge" data-from="${escapeHtml(
          edge.from
        )}" data-to="${escapeHtml(edge.to)}"></path>
        <text x="${from.x + 30}" y="${from.y - 98}" class="edge-label focusable-edge" data-from="${escapeHtml(
          edge.from
        )}" data-to="${escapeHtml(edge.to)}" font-size="12" font-family="Space Mono">${escapeHtml(edgeTag)}</text>`;
      }

      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2 - 34;
      return `<path d="M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}" class="arrow edge-path focusable-edge" data-from="${escapeHtml(
        edge.from
      )}" data-to="${escapeHtml(edge.to)}"></path>
      <text x="${midX - 12}" y="${midY - 6}" class="edge-label focusable-edge" data-from="${escapeHtml(
        edge.from
      )}" data-to="${escapeHtml(edge.to)}" font-size="12" font-family="Space Mono">${escapeHtml(edgeTag)}</text>`;
    })
    .join("");

  const nodes = editorModel.states
    .map((state) => {
      const pos = editorModel.positions[state];
      const isAccept = editorModel.acceptStates.includes(state);
      const inner = isAccept ? `<circle cx="${pos.x}" cy="${pos.y}" r="27" class="state accept"></circle>` : "";
      return `<g class="draggable-state focusable-state" data-state="${escapeHtml(state)}">
        <circle cx="${pos.x}" cy="${pos.y}" r="34" class="state state-node ${isAccept ? "accept" : ""}"></circle>
        ${inner}
        <text x="${pos.x}" y="${pos.y + 5}" text-anchor="middle" font-size="16" font-family="Space Mono">${escapeHtml(state)}</text>
      </g>`;
    })
    .join("");

  const startPos = editorModel.positions[editorModel.startState] || { x: 70, y: 90 };

  const legendHtml = legendRows.length
    ? legendRows
        .map((row) => {
          const prefix = row.first ? `e${row.id} ${row.from} -> ${row.to}: ` : "    ";
          return `<div class="edge-legend-row">${escapeHtml(prefix + row.label)}</div>`;
        })
        .join("")
    : `<div class="edge-legend-row">No transitions yet.</div>`;

  pdaEditorGraph.innerHTML = `<svg id="editorSvg" viewBox="0 0 720 340" width="100%" height="280">
    <defs>
      <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <polygon points="0 0, 8 4, 0 8" fill="#111"></polygon>
      </marker>
    </defs>
    <line x1="22" y1="${startPos.y}" x2="${startPos.x - 35}" y2="${startPos.y}" class="arrow"></line>
    ${edges}
    ${nodes}
  </svg>
  <div class="edge-legend">
    <div class="edge-legend-title">Transition Legend (all labels)</div>
    ${legendHtml}
  </div>`;

  attachDiagramFocusInteractions(pdaEditorGraph);
  attachDragHandlers();
}

function attachDragHandlers() {
  const svg = byId("editorSvg");
  if (!svg) {
    return;
  }

  let activeState = null;

  svg.querySelectorAll(".draggable-state").forEach((node) => {
    node.addEventListener("pointerdown", (event) => {
      activeState = node.getAttribute("data-state");
      node.setPointerCapture(event.pointerId);
    });
  });

  svg.addEventListener("pointermove", (event) => {
    if (!activeState) {
      return;
    }
    const rect = svg.getBoundingClientRect();
    const scaleX = 720 / rect.width;
    const scaleY = 340 / rect.height;
    editorModel.positions[activeState] = {
      x: Math.max(36, Math.min(684, (event.clientX - rect.left) * scaleX)),
      y: Math.max(36, Math.min(304, (event.clientY - rect.top) * scaleY)),
    };
    renderEditorGraph();
  });

  svg.addEventListener("pointerup", () => {
    activeState = null;
  });

  svg.addEventListener("pointerleave", () => {
    activeState = null;
  });
}

function loadPdaIntoEditor(pda) {
  editorModel.states = [...pda.states];
  editorModel.startState = pda.startState;
  editorModel.acceptStates = [...pda.acceptStates];
  editorModel.transitions = pda.transitions.map((t) => ({
    from: t.from,
    input: t.input,
    pop: t.pop,
    to: t.to,
    pushArray: [...t.pushArray],
  }));
  editorModel.inputAlphabet = [...(pda.inputAlphabet || [])];
  editorModel.stackAlphabet = [...(pda.stackAlphabet || [])];
  editorModel.startStack = pda.startStack || "Z";
  editorModel.positions = {};
  normalizeEditorModel();
  renderEditorGraph();
}

function editorModelToPda() {
  normalizeEditorModel();

  const inputAlphabet = new Set();
  const stackAlphabet = new Set([editorModel.startStack]);
  editorModel.transitions.forEach((t) => {
    if (t.input !== "epsilon") {
      inputAlphabet.add(t.input);
    }
    if (t.pop !== "epsilon") {
      stackAlphabet.add(t.pop);
    }
    t.pushArray.forEach((sym) => stackAlphabet.add(sym));
  });

  return {
    states: [...editorModel.states],
    inputAlphabet: [...inputAlphabet],
    stackAlphabet: [...stackAlphabet],
    startState: editorModel.startState,
    startStack: editorModel.startStack,
    acceptStates: [...editorModel.acceptStates],
    transitions: editorModel.transitions.map((t) => ({
      from: t.from,
      input: t.input,
      pop: t.pop,
      to: t.to,
      push: [...t.pushArray],
    })),
  };
}

function handleCfgConversion() {
  cfgAnimationToken += 1;
  setError(cfgError, "");
  cfgToPdaTransitions.innerHTML = "";
  cfgToPdaDiagram.innerHTML = "";
  cfgStackViz.innerHTML = "";
  cfgSimResult.textContent = "";

  try {
    const startSymbol = cfgStartInput.value.trim();
    if (!startSymbol || startSymbol.length !== 1 || !/[A-Z]/.test(startSymbol)) {
      throw new Error("Start symbol must be one uppercase letter, such as S.");
    }

    const cfg = parseCfg(cfgInput.value);
    const result = cfgToPda(cfg, startSymbol);
    latestGeneratedPda = result;

    setSteps(cfgSteps, result.steps);
    renderTransitionTable(result.transitions, cfgToPdaTransitions);
    renderSimplePdaSvg(cfgToPdaDiagram, result.states, result.transitions, result.startState, result.acceptStates);
  } catch (error) {
    setError(cfgError, error.message);
    setSteps(cfgSteps, []);
    latestGeneratedPda = null;
  }
}

function handlePdaConversion() {
  pdaAnimationToken += 1;
  setError(pdaError, "");
  pdaToCfgOutput.textContent = "";
  pdaSimplifyInfo.textContent = "";
  pdaStackViz.innerHTML = "";
  pdaSimResult.textContent = "";

  try {
    const parsedPda = parsePda(pdaInput.value);
    const cfgResult = pdaToCfg(parsedPda);

    setSteps(pdaSteps, cfgResult.steps);
    pdaToCfgOutput.textContent = cfgResult.text;
    pdaSimplifyInfo.textContent = cfgResult.simplifyInfo;
    renderSimplePdaSvg(pdaDiagram, parsedPda.states, parsedPda.transitions, parsedPda.startState, parsedPda.acceptStates);
    renderCfgSummary(cfgDiagram, cfgResult.text);
  } catch (error) {
    setError(pdaError, error.message);
    setSteps(pdaSteps, []);
  }
}

showCfgModeBtn.addEventListener("click", () => setMode("cfg"));
showPdaModeBtn.addEventListener("click", () => setMode("pda"));

convertCfgBtn.addEventListener("click", handleCfgConversion);
convertPdaBtn.addEventListener("click", handlePdaConversion);

runCfgPdaSimBtn.addEventListener("click", () => {
  cfgAnimationToken += 1;
  const activeToken = cfgAnimationToken;
  cfgSimResult.textContent = "Preparing simulation...";
  cfgStackViz.innerHTML = "";
  if (!latestGeneratedPda) {
    cfgSimResult.textContent = "Run CFG -> PDA conversion first.";
    return;
  }

  const result = simulatePda(latestGeneratedPda, cfgSimInput.value.trim());
  const finalMessage = result.accepted
    ? `Accepted in state ${result.finalState} after consuming ${result.consumed} symbols.`
    : `Rejected in state ${result.finalState} after consuming ${result.consumed} symbols.`;

  animateStackSteps(cfgStackViz, result.trace, cfgSimResult, finalMessage, () =>
    cfgAnimationToken === activeToken ? activeToken : null
  );
});

runPdaSimBtn.addEventListener("click", () => {
  pdaAnimationToken += 1;
  const activeToken = pdaAnimationToken;
  pdaSimResult.textContent = "Preparing simulation...";
  pdaStackViz.innerHTML = "";
  try {
    const parsedPda = parsePda(pdaInput.value);
    const result = simulatePda(parsedPda, pdaSimInput.value.trim());
    const finalMessage = result.accepted
      ? `Accepted in state ${result.finalState} after consuming ${result.consumed} symbols.`
      : `Rejected in state ${result.finalState} after consuming ${result.consumed} symbols.`;

    animateStackSteps(pdaStackViz, result.trace, pdaSimResult, finalMessage, () =>
      pdaAnimationToken === activeToken ? activeToken : null
    );
  } catch (error) {
    pdaSimResult.textContent = error.message;
  }
});

editorAddStateBtn.addEventListener("click", () => {
  const name = editorStateName.value.trim();
  if (!name) {
    return;
  }

  if (!editorModel.states.includes(name)) {
    editorModel.states.push(name);
    editorModel.positions[name] = randomPosition(editorModel.states.length - 1);
  }

  if (editorStateStart.checked) {
    editorModel.startState = name;
  }

  if (editorStateAccept.checked) {
    if (!editorModel.acceptStates.includes(name)) {
      editorModel.acceptStates.push(name);
    }
  } else {
    editorModel.acceptStates = editorModel.acceptStates.filter((state) => state !== name);
  }

  renderEditorGraph();
});

editorAddTransitionBtn.addEventListener("click", () => {
  const from = editorFromState.value;
  const to = editorToState.value;
  const input = editorInputSymbol.value.trim() || "epsilon";
  const pop = editorPopSymbol.value.trim() || "epsilon";
  const pushArray = editorPushSymbols.value
    .split(",")
    .map((symbol) => symbol.trim())
    .filter(Boolean)
    .filter((symbol) => symbol !== "epsilon");

  if (!from || !to) {
    return;
  }

  editorModel.transitions.push({ from, to, input, pop, pushArray });
  renderEditorGraph();
});

loadJsonToEditorBtn.addEventListener("click", () => {
  try {
    const parsed = parsePda(pdaInput.value);
    loadPdaIntoEditor(parsed);
    setError(pdaError, "");
  } catch (error) {
    setError(pdaError, error.message);
  }
});

syncEditorToJsonBtn.addEventListener("click", () => {
  const pda = editorModelToPda();
  pdaInput.value = JSON.stringify(pda, null, 2);
  handlePdaConversion();
});

startConversionBtn.addEventListener("click", showConverterApp);
backToIntroBtn.addEventListener("click", showIntroPage);

setMode("cfg");
handleCfgConversion();

try {
  loadPdaIntoEditor(parsePda(pdaInput.value));
} catch (error) {
  setError(pdaError, error.message);
}

handlePdaConversion();

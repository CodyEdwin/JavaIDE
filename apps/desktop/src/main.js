import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { basicSetup } from "codemirror";
import { EditorState, StateEffect, StateField } from "@codemirror/state";
import { Decoration, EditorView, WidgetType, hoverTooltip, keymap } from "@codemirror/view";
import { foldService } from "@codemirror/language";
import { autocompletion } from "@codemirror/autocomplete";
import { lintGutter, setDiagnostics } from "@codemirror/lint";
import { java } from "@codemirror/lang-java";
import { json } from "@codemirror/lang-json";
import { oneDark } from "@codemirror/theme-one-dark";

const $ = (id) => document.getElementById(id);

const GRADLE_SETTINGS_KEY = "javaide.gradle.settings";
const PROBLEM_FILTER_KEY = "javaide.problems.filter";

const PROBLEM_FILTERS = new Set(["all", "error", "warning", "info"]);

function loadProblemFilter() {
  try {
    const stored = localStorage.getItem(PROBLEM_FILTER_KEY);
    return PROBLEM_FILTERS.has(stored) ? stored : "all";
  } catch {
    return "all";
  }
}

function loadGradleSettings() {
  const defaults = {
    logLevel: "",
    stacktrace: false,
    offline: false,
    warnings: false,
    extra: "",
  };
  try {
    const stored = JSON.parse(localStorage.getItem(GRADLE_SETTINGS_KEY) || "{}");
    return {
      logLevel: stored.logLevel === "--info" || stored.logLevel === "--debug" ? stored.logLevel : "",
      stacktrace: Boolean(stored.stacktrace),
      offline: Boolean(stored.offline),
      warnings: Boolean(stored.warnings),
      extra: typeof stored.extra === "string" ? stored.extra : "",
    };
  } catch {
    return defaults;
  }
}

const state = {
  root: "",
  files: [],
  collapsed: new Set(),
  docs: new Map(),
  active: null,
  gradle: null,
  gradleActive: null,
  gradleSettings: loadGradleSettings(),
  trust: "unknown",
  split: false,
  gradleSawOutput: false,
  java: {
    status: "stopped",
    message: "",
    pid: null,
    diagnostics: new Map(),
    opened: new Set(),
    versions: new Map(),
    changeTimers: new Map(),
    queue: Promise.resolve(),
    problemFilter: loadProblemFilter(),
    collapsedProblems: new Set(),
    completionEnabled: true,
    formatEnabled: true,
    folds: new Map(),
    surfaceTimers: new Map(),
    extraRoots: [],
  },
  ai: {
    connected: false,
    sessions: [],
    session: null,
    streaming: null,
    parts: new Map(),
    permissions: [],
  },
};

const panes = {
  primary: { view: null, path: null },
  secondary: { view: null, path: null },
};
let focusedPane = "primary";
let mirroring = false;
let paletteMode = "command";
let paletteIndex = 0;
let paletteSymbols = [];
let busyCount = 0;
let busyLabel = "";

function setBusy(label) {
  busyCount += 1;
  busyLabel = label || "working…";
  $("busy").classList.remove("hidden");
  $("busy").textContent = busyLabel;
  $("status-text").textContent = busyLabel;
}

function clearBusy() {
  busyCount = Math.max(0, busyCount - 1);
  if (busyCount === 0) {
    $("busy").classList.add("hidden");
    // Do not clobber a result message that the operation set before finishing.
    if ($("status-text").textContent === busyLabel) {
      $("status-text").textContent = "Ready";
    }
  }
}

async function call(command, args) {
  try {
    return await invoke(command, args);
  } catch (error) {
    showError(String(error));
    throw error;
  }
}

function showError(message) {
  $("status-text").textContent = message;
  $("statusbar").classList.add("error");
  setTimeout(() => $("statusbar").classList.remove("error"), 6000);
}

function setStatus(message) {
  $("status-text").textContent = message;
}

function join(root, relative) {
  return `${root.replace(/\/$/, "")}/${relative}`;
}

function fileName(path) {
  return path.split("/").pop();
}

function workspaceRelative(path) {
  if (!state.root) return path;
  const root = state.root.replace(/[\\/]+$/, "").replace(/\\/g, "/");
  const normalized = String(path).replace(/\\/g, "/");
  const prefix = `${root}/`;
  return normalized.startsWith(prefix) ? normalized.slice(prefix.length) : String(path);
}

/* ---------------- editor ---------------- */

function languageFor(path) {
  if (path.endsWith(".java")) return java();
  if (path.endsWith(".json")) return json();
  return [];
}

function activeView() {
  return panes[focusedPane].view;
}

const setJavaDecorations = StateEffect.define();

const javaDecorationField = StateField.define({
  create() {
    return Decoration.none;
  },
  update(decorations, transaction) {
    decorations = decorations.map(transaction.changes);
    for (const effect of transaction.effects) {
      if (effect.is(setJavaDecorations)) decorations = effect.value;
    }
    return decorations;
  },
  provide: (field) => EditorView.decorations.from(field),
});

class InlayWidget extends WidgetType {
  constructor(text) {
    super();
    this.text = text;
  }

  toDOM() {
    const span = document.createElement("span");
    span.className = "inlay-hint";
    span.textContent = this.text;
    return span;
  }

  eq(other) {
    return other.text === this.text;
  }
}

function editorExtensions(path, pane) {
  return [
    basicSetup,
    javaDecorationField,
    foldService.of((editorState, lineStart) => {
      const ranges = state.java.folds.get(path) || [];
      const line = editorState.doc.lineAt(lineStart);
      const match = ranges.find((range) => range.startLine === line.number - 1);
      if (!match || match.endLine <= match.startLine) return null;
      const endLine = Math.min(match.endLine + 1, editorState.doc.lines);
      return { from: line.to, to: editorState.doc.line(endLine).to };
    }),
    oneDark,
    languageFor(path),
    lintGutter(),
    autocompletion({ override: [javaCompletionSource] }),
    hoverTooltip(javaHoverSource, { hoverTime: 350 }),
    keymap.of([
      {
        key: "Mod-s",
        preventDefault: true,
        run: () => {
          saveActive();
          return true;
        },
      },
      {
        key: "F12",
        preventDefault: true,
        run: () => {
          jumpToDefinition();
          return true;
        },
      },
      {
        key: "Shift-Alt-f",
        preventDefault: true,
        run: () => {
          formatJavaDocument();
          return true;
        },
      },
      {
        key: "Shift-Alt-o",
        preventDefault: true,
        run: () => {
          organizeJavaImports();
          return true;
        },
      },
      {
        key: "F2",
        preventDefault: true,
        run: () => {
          startRename();
          return true;
        },
      },
      {
        key: "Shift-F12",
        preventDefault: true,
        run: () => {
          findReferences();
          return true;
        },
      },
      {
        key: "Mod-.",
        preventDefault: true,
        run: () => {
          showCodeActions();
          return true;
        },
      },
      {
        key: "(",
        run: () => {
          scheduleSignatureHelp();
          return false;
        },
      },
      {
        key: ",",
        run: () => {
          scheduleSignatureHelp();
          return false;
        },
      },
    ]),
    EditorView.updateListener.of((update) => {
      if (mirroring || !update.docChanged) return;
      const current = panes[pane].path;
      const doc = current ? state.docs.get(current) : null;
      if (!doc) return;
      doc.content = update.state.doc.toString();
      if (doc.virtual) return;
      if (!doc.dirty) {
        doc.dirty = true;
        renderTabs();
      }
      updateStatusRight();
      mirrorPane(pane, current, doc.content);
      javaScheduleChange(current);
      scheduleJavaSurface(current);
    }),
    EditorView.domEventHandlers({
      mousedown: () => focusPane(pane),
    }),
  ];
}

function createEditor() {
  panes.primary.view = new EditorView({
    state: EditorState.create({ doc: "" }),
    parent: $("editor"),
  });
}

function focusPane(pane) {
  if (!state.split && pane === "secondary") return;
  focusedPane = pane;
  state.active = panes[pane].path;
  updatePaneChrome();
  renderTabs();
  updateStatusRight();
}

function updatePaneChrome() {
  $("editor").classList.toggle("focused", state.split && focusedPane === "primary");
  $("editor-secondary").classList.toggle("focused", state.split && focusedPane === "secondary");
}

function updateWelcome() {
  const visible = Boolean(panes.primary.path) || (state.split && Boolean(panes.secondary.path));
  $("welcome").classList.toggle("hidden", visible);
  $("editor-split").classList.toggle("hidden", !visible);
}

function showPane(pane, path) {
  const view = panes[pane].view;
  if (!view) return;
  panes[pane].path = path || null;
  if (pane === focusedPane) state.active = panes[pane].path;
  const doc = path ? state.docs.get(path) : null;
  if (!doc) {
    view.setState(EditorState.create({ doc: "" }));
  } else {
    view.setState(
      EditorState.create({ doc: doc.content, extensions: editorExtensions(doc.path, pane) }),
    );
    applyJavaDiagnostics(path);
    if (isJavaPath(path) && !doc.virtual) scheduleJavaSurface(path);
  }
  updateWelcome();
  updatePaneChrome();
  updateStatusRight();
}

function showActiveDocument() {
  showPane(focusedPane, state.active);
}

function toggleSplit() {
  state.split = !state.split;
  $("editor-secondary").classList.toggle("hidden", !state.split);
  if (state.split && !panes.secondary.view) {
    panes.secondary.view = new EditorView({
      state: EditorState.create({ doc: "" }),
      parent: $("editor-secondary"),
    });
  }
  if (state.split && !panes.secondary.path && panes.primary.path) {
    showPane("secondary", panes.primary.path);
  }
  if (!state.split && focusedPane === "secondary") focusPane("primary");
  updateWelcome();
  updatePaneChrome();
  setStatus(state.split ? "Editor split" : "Editor split closed");
}

function mirrorPane(from, path, text) {
  const other = from === "primary" ? "secondary" : "primary";
  if (!state.split || panes[other].path !== path) return;
  const view = panes[other].view;
  if (!view || view.state.doc.toString() === text) return;
  mirroring = true;
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
  mirroring = false;
}

async function openFile(entry) {
  if (entry.isDir) return;
  const path = join(state.root, entry.path);
  if (state.docs.has(path)) {
    state.active = path;
    renderTabs();
    renderTree();
    showActiveDocument();
    return;
  }
  setBusy(`Opening ${entry.name}…`);
  try {
    const content = await call("read_file", { path });
    state.docs.set(path, { path, name: entry.name, content, dirty: false });
    state.active = path;
    renderTabs();
    renderTree();
    showActiveDocument();
    javaDocumentOpened(path);
    setStatus(`Opened ${entry.name}`);
  } finally {
    clearBusy();
  }
}

function closeFile(path, event) {
  event.stopPropagation();
  const doc = state.docs.get(path);
  if (doc?.dirty && !confirm(`${doc.name} has unsaved changes. Close it?`)) return;
  state.docs.delete(path);
  javaDocumentClosed(path);
  const fallback = [...state.docs.keys()].pop() || null;
  for (const pane of ["primary", "secondary"]) {
    if (panes[pane].path !== path) continue;
    const next = pane === focusedPane ? fallback : null;
    if (pane === focusedPane) state.active = next;
    showPane(pane, next);
  }
  if (![panes.primary.path, panes.secondary.path].includes(state.active)) {
    state.active = panes[focusedPane].path;
  }
  renderTabs();
  renderTree();
}

function renderTabs() {
  const tabs = $("tabs");
  tabs.replaceChildren();
  for (const [path, doc] of state.docs) {
    const tab = document.createElement("div");
    tab.className = `tab${path === state.active ? " active" : ""}`;
    tab.title = path;
    tab.addEventListener("click", () => {
      state.active = path;
      renderTabs();
      renderTree();
      showActiveDocument();
    });
    const name = document.createElement("span");
    name.textContent = doc.name;
    tab.appendChild(name);
    if (doc.dirty) {
      const dot = document.createElement("span");
      dot.className = "dirty";
      tab.appendChild(dot);
    }
    const close = document.createElement("button");
    close.className = "close";
    close.textContent = "×";
    close.addEventListener("click", (event) => closeFile(path, event));
    tab.appendChild(close);
    tabs.appendChild(tab);
  }
}

async function saveActive() {
  if (!state.active) return;
  const doc = state.docs.get(state.active);
  if (!doc) return;
  if (doc.virtual) {
    setStatus("Decompiled sources are read-only");
    return;
  }
  try {
    await call("write_file", { path: doc.path, content: doc.content });
    doc.dirty = false;
    renderTabs();
    javaDocumentSaved(doc.path);
    setStatus(`Saved ${doc.name}`);
  } catch {
    /* status already shows the error */
  }
}

function updateStatusRight() {
  const parts = [];
  if (state.active) {
    const doc = state.docs.get(state.active);
    if (doc) parts.push(`${doc.name}${doc.dirty ? " •" : ""}`);
  }
  if (state.gradle) parts.push(`Gradle ${state.gradle.gradleVersion}`);
  if (state.java.status === "ready") {
    const errors = [...state.java.diagnostics.values()]
      .flat()
      .filter((diagnostic) => diagnostic.severity === "error").length;
    parts.push(errors ? `Java ${errors} error${errors === 1 ? "" : "s"}` : "Java ready");
  } else if (state.java.status === "starting") {
    parts.push("Java starting…");
  } else if (state.java.status === "failed" || state.java.status === "unavailable") {
    parts.push("Java unavailable");
  }
  if (state.ai.connected) parts.push("OpenCode ready");
  $("status-right").textContent = parts.join("   ");
}

/* ---------------- explorer ---------------- */

async function openWorkspace(path) {
  setBusy("Opening workspace…");
  try {
    const view = await call("open_workspace", { path });
    state.root = view.root;
    state.files = view.files;
    state.collapsed = new Set(
      view.files.filter((entry) => entry.isDir).map((entry) => entry.path),
    );
    state.docs.clear();
    state.active = null;
    panes.primary.path = null;
    panes.secondary.path = null;
    state.trust = view.trust || "unknown";
    state.gradle = null;
    setGradleActive(null);
    for (const timer of state.java.changeTimers.values()) clearTimeout(timer);
    state.java.diagnostics.clear();
    state.java.opened.clear();
    state.java.versions.clear();
    state.java.changeTimers.clear();
    state.java.collapsedProblems.clear();
    state.java.status = "stopped";
    state.java.message = "Java language server is stopped.";
    $("workspace-path").textContent = view.root;
    $("workspace-path").title = view.root;
    $("gradle-log").textContent = "";
    $("gradle-tests").replaceChildren();
    renderTree();
    renderTabs();
    showActiveDocument();
    renderGradle();
    renderJava();
    renderTrust();
    setStatus(`Workspace: ${view.root}`);
    updateStatusRight();
    javaRefreshStatus();
  } finally {
    clearBusy();
  }
}

function renderTree() {
  const tree = $("file-tree");
  tree.replaceChildren();
  for (const entry of state.files) {
    if (isHiddenByCollapse(entry)) continue;
    const row = document.createElement("div");
    row.className = `tree-row${entry.isDir ? " dir" : ""}`;
    if (!entry.isDir && state.active === join(state.root, entry.path)) {
      row.classList.add("active");
    }
    row.style.paddingLeft = `${8 + entry.depth * 12}px`;
    const icon = document.createElement("span");
    icon.className = "tree-icon";
    if (entry.isDir) {
      icon.textContent = state.collapsed.has(entry.path) ? "▸" : "▾";
    } else {
      icon.textContent = iconFor(entry.name);
    }
    const name = document.createElement("span");
    name.className = "tree-name";
    name.textContent = entry.name;
    row.append(icon, name);
    row.addEventListener("click", () => {
      if (entry.isDir) {
        if (state.collapsed.has(entry.path)) state.collapsed.delete(entry.path);
        else state.collapsed.add(entry.path);
        renderTree();
      } else {
        openFile(entry);
      }
    });
    tree.appendChild(row);
  }
}

function iconFor(name) {
  if (name.endsWith(".java")) return "☕";
  if (name.endsWith(".gradle") || name.endsWith(".kts")) return "⚙";
  if (name.endsWith(".json")) return "{}";
  if (name.endsWith(".md")) return "M";
  return "·";
}

function isHiddenByCollapse(entry) {
  for (const dir of state.collapsed) {
    if (entry.path.startsWith(`${dir}/`)) return true;
  }
  return false;
}

/* ---------------- gradle ---------------- */

function appendGradleLog(line) {
  const log = $("gradle-log");
  log.textContent += `${line}\n`;
  log.scrollTop = log.scrollHeight;
}

function saveGradleSettings() {
  try {
    localStorage.setItem(GRADLE_SETTINGS_KEY, JSON.stringify(state.gradleSettings));
  } catch {
    /* storage may be unavailable; settings still apply to this session */
  }
}

function renderGradleSettings() {
  const settings = state.gradleSettings;
  $("gradle-log-level").value = settings.logLevel;
  $("gradle-opt-stacktrace").checked = settings.stacktrace;
  $("gradle-opt-offline").checked = settings.offline;
  $("gradle-opt-warnings").checked = settings.warnings;
  $("gradle-extra-args").value = settings.extra;
}

function readGradleSettings() {
  state.gradleSettings = {
    logLevel: $("gradle-log-level").value,
    stacktrace: $("gradle-opt-stacktrace").checked,
    offline: $("gradle-opt-offline").checked,
    warnings: $("gradle-opt-warnings").checked,
    extra: $("gradle-extra-args").value,
  };
  saveGradleSettings();
}

function splitGradleArguments(text) {
  const tokens = [];
  const pattern = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    tokens.push(match[1] ?? match[2] ?? match[3]);
  }
  return tokens;
}

function gradleArguments() {
  const settings = state.gradleSettings;
  const args = [];
  if (settings.logLevel) args.push(settings.logLevel);
  if (settings.stacktrace) args.push("--stacktrace");
  if (settings.offline) args.push("--offline");
  if (settings.warnings) args.push("--warning-mode", "all");
  args.push(...splitGradleArguments(settings.extra));
  return args;
}

function isCancellation(error) {
  return /cancel/i.test(String(error));
}

function setGradleActive(active) {
  state.gradleActive = active;
  const running = Boolean(active);
  $("gradle-stop").disabled = !running;
  $("gradle-sync").disabled = running;
  $("gradle-list-tests").disabled = running;
  for (const button of document.querySelectorAll("#gradle-tests button")) {
    button.disabled = running;
  }
  $("gradle-stop").title = running
    ? `Stop ${active.kind || "Gradle operation"}: ${active.label || ""}`.trim()
    : "Stop the running Gradle operation";
  renderGradle();
}

async function withGradle(label, kind, body) {
  if (!workspaceTrusted()) {
    setStatus("Trust this folder before running Gradle");
    renderTrust();
    return;
  }
  if (state.gradleActive) {
    setStatus("Gradle is already running");
    return;
  }
  state.gradleSawOutput = false;
  setGradleActive({ label, kind });
  setBusy(label);
  try {
    await body();
  } finally {
    setGradleActive(null);
    clearBusy();
  }
}

function renderGradle() {
  const projects = $("gradle-projects");
  projects.replaceChildren();
  const snapshot = state.gradle;
  if (!snapshot) {
    $("gradle-summary").textContent = "Not synced. Press ⟳ to sync.";
    updateStatusRight();
    return;
  }
  $("gradle-summary").textContent =
    `Gradle ${snapshot.gradleVersion} · ${snapshot.projects.length} project(s) · ` +
    `${snapshot.problems.length} problem(s)`;
  for (const project of snapshot.projects) {
    const header = document.createElement("div");
    header.className = "gradle-project";
    header.textContent = project.path === ":" ? project.name : `${project.path}`;
    projects.appendChild(header);
    const tasks = [...project.tasks].sort(
      (a, b) => (a.group || "~").localeCompare(b.group || "~") || a.name.localeCompare(b.name),
    );
    for (const task of tasks) {
      const row = document.createElement("div");
      row.className = `gradle-task${state.gradleActive ? " disabled" : ""}`;
      row.title = task.description || task.path;
      const name = document.createElement("span");
      name.className = "gradle-task-name";
      name.textContent = task.name;
      row.appendChild(name);
      if (task.isTest) {
        const badge = document.createElement("span");
        badge.className = "gradle-task-badge test";
        badge.textContent = "test";
        row.appendChild(badge);
      } else if (task.isRun) {
        const badge = document.createElement("span");
        badge.className = "gradle-task-badge";
        badge.textContent = "run";
        row.appendChild(badge);
      }
      row.addEventListener("click", () => {
        if (!state.gradleActive) runGradleTask(task);
      });
      projects.appendChild(row);
    }
  }
  updateStatusRight();
}

async function gradleSync() {
  await withGradle("Syncing Gradle…", "sync", async () => {
    const args = gradleArguments();
    appendGradleLog(`Syncing ${state.root}…`);
    if (args.length) appendGradleLog(`  Gradle args: ${args.join(" ")}`);
    try {
      const snapshot = await call("gradle_sync", { arguments: args });
      state.gradle = snapshot;
      renderGradle();
      appendGradleLog(
        `Synced Gradle ${snapshot.gradleVersion} (${snapshot.projects.length} projects)`,
      );
      setStatus("Gradle sync complete");
    } catch (error) {
      if (isCancellation(error)) {
        appendGradleLog("Sync cancelled.");
        setStatus("Gradle sync cancelled");
      } else {
        appendGradleLog(`Sync failed: ${error}`);
      }
    }
  });
}

async function runGradleTask(task) {
  await withGradle(`Running ${task.path}…`, "task", async () => {
    const args = gradleArguments();
    appendGradleLog(`> ${task.path}`);
    if (args.length) appendGradleLog(`  Gradle args: ${args.join(" ")}`);
    try {
      const result = await call("gradle_run_task", { task: task.path, arguments: args });
      for (const outcome of result.taskOutcomes) {
        appendGradleLog(`  ${outcome.outcome.padEnd(12)} ${outcome.taskPath}`);
      }
      if (!state.gradleSawOutput && result.stdout) appendGradleLog(result.stdout.trimEnd());
      if (!state.gradleSawOutput && result.stderr) appendGradleLog(result.stderr.trimEnd());
      for (const failure of result.failures) appendGradleLog(`FAILURE: ${failure}`);
      if (result.cancelled) {
        appendGradleLog(`  CANCELLED after ${result.durationMs} ms`);
        setStatus(`${task.path} cancelled`);
      } else {
        setStatus(
          `${task.path} ${result.failed ? "failed" : "finished"} in ${result.durationMs} ms`,
        );
      }
    } catch (error) {
      if (isCancellation(error)) {
        appendGradleLog(`Run cancelled: ${error}`);
        setStatus(`${task.path} cancelled`);
      } else {
        appendGradleLog(`Run failed: ${error}`);
      }
    }
  });
}

async function discoverTests() {
  const container = $("gradle-tests");
  await withGradle("Discovering tests…", "test discovery", async () => {
    const args = gradleArguments();
    container.replaceChildren();
    if (args.length) appendGradleLog(`Test discovery args: ${args.join(" ")}`);
    try {
      const listing = await call("gradle_list_tests", { arguments: args });
      if (!listing.tests.length) {
        container.textContent = "No compiled tests found.";
        return;
      }
      for (const testClass of listing.tests) {
        const row = document.createElement("div");
        row.className = "test-class";
        const label = document.createElement("span");
        label.textContent = testClass.className;
        label.title = `${testClass.methods.length} method(s)`;
        const button = document.createElement("button");
        button.className = "text-button";
        button.textContent = "Run";
        button.addEventListener("click", () => {
          if (!state.gradleActive) runTests(testClass.className);
        });
        row.append(label, button);
        container.appendChild(row);
      }
      setStatus(`Discovered ${listing.tests.length} test class(es)`);
    } catch (error) {
      if (isCancellation(error)) {
        container.textContent = "Discovery cancelled.";
        setStatus("Test discovery cancelled");
      } else {
        container.textContent = `Discovery failed: ${error}`;
      }
    }
  });
}

async function runTests(className) {
  await withGradle(`Running ${className || "tests"}…`, "test run", async () => {
    const args = gradleArguments();
    appendGradleLog(`> test ${className || "(all)"}`);
    if (args.length) appendGradleLog(`  Gradle args: ${args.join(" ")}`);
    try {
      const result = await call("gradle_run_tests", {
        className: className || null,
        arguments: args,
      });
      const tests = result.tests.filter((test) => test.atomic);
      for (const test of tests) {
        appendGradleLog(
          `  ${test.state.padEnd(10)} ${test.className || "?"}.${test.methodName || test.name} (${test.durationMs} ms)`,
        );
      }
      if (!tests.length) {
        appendGradleLog(`  no test events (failed=${result.failed})`);
      }
      for (const failure of result.failures) appendGradleLog(`FAILURE: ${failure}`);
      if (result.stdout) appendGradleLog(result.stdout.trimEnd());
      if (result.cancelled) {
        appendGradleLog(`  CANCELLED after ${result.durationMs} ms`);
        setStatus("Tests cancelled");
      } else {
        setStatus(`Tests ${result.failed ? "failed" : "finished"} in ${result.durationMs} ms`);
      }
    } catch (error) {
      if (isCancellation(error)) {
        appendGradleLog(`Test run cancelled: ${error}`);
        setStatus("Tests cancelled");
      } else {
        appendGradleLog(`Test run failed: ${error}`);
      }
    }
  });
}

async function stopGradle() {
  if (!state.gradleActive) return;
  const label = state.gradleActive.label || "Gradle operation";
  $("gradle-stop").disabled = true;
  appendGradleLog(`Cancelling ${label}…`);
  setStatus("Cancelling Gradle…");
  try {
    const result = await call("gradle_cancel");
    if (result.cancelled) {
      appendGradleLog(`  cancellation requested (${result.requestId})`);
    } else {
      appendGradleLog(`  ${result.requestId} already finished`);
      setStatus("Gradle operation already finished");
    }
  } catch (error) {
    appendGradleLog(`Cancel failed: ${error}`);
    if (state.gradleActive) $("gradle-stop").disabled = false;
  }
}

/* ---------------- java language server ---------------- */

const JAVA_LABELS = {
  stopped: "stopped",
  starting: "starting…",
  stopping: "stopping…",
  ready: "ready",
  failed: "failed",
  unavailable: "not available",
  restricted: "restricted",
};

function isJavaPath(path) {
  return typeof path === "string" && path.endsWith(".java");
}

function javaReady() {
  return state.java.status === "ready";
}

function updateJavaStatus(status) {
  if (!status || typeof status !== "object") return;
  const previous = state.java.status;
  state.java.status = status.state || state.java.status;
  state.java.message = status.message || "";
  state.java.pid = status.pid ?? null;
  renderJava();
  if (state.java.status === "ready" && previous !== "ready") {
    // A freshly started server knows nothing about the buffers that are open;
    // re-open them from the editor state rather than the file on disk.
    state.java.opened.clear();
    for (const [path, doc] of state.docs) {
      if (isJavaPath(path)) javaDocumentOpened(path, doc.content);
    }
  }
}

function renderJava() {
  const summary = $("java-summary");
  const detail = $("java-detail");
  if (!summary || !detail) return;
  const server = state.java;
  summary.textContent = `jdtls ${JAVA_LABELS[server.status] || server.status}`
    + (server.pid ? ` · pid ${server.pid}` : "");
  detail.textContent = server.message || "No language server details.";
  $("java-start").textContent = server.status === "ready" ? "Restart" : "Start";
  $("java-start").disabled = server.status === "starting";
  renderProblems();
  updateStatusRight();
}

function appendJavaLog(line) {
  const log = $("java-log");
  if (!log) return;
  log.textContent += `${line}\n`;
  while (log.textContent.length > 8000) {
    log.textContent = log.textContent.slice(2000);
  }
  log.scrollTop = log.scrollHeight;
}

function nextJavaVersion(path) {
  const version = (state.java.versions.get(path) || 0) + 1;
  state.java.versions.set(path, version);
  return version;
}

function queueJava(task) {
  state.java.queue = state.java.queue.then(task).catch((error) => {
    if (javaReady()) showError(`Java sync failed: ${error}`);
  });
  return state.java.queue;
}

function workspaceTrusted() {
  return state.trust === "trusted";
}

function javaDocumentOpened(path, text) {
  if (!workspaceTrusted()) return;
  const existing = state.docs.get(path);
  if (existing?.virtual) return;
  if (!isJavaPath(path) || !state.docs.has(path)) return;
  if (state.java.opened.has(path)) return;
  state.java.opened.add(path);
  queueJava(async () => {
    const doc = state.docs.get(path);
    if (!doc) return;
    try {
      const status = await call("java_open_document", {
        path,
        text: typeof text === "string" ? text : doc.content,
        version: nextJavaVersion(path),
      });
      updateJavaStatus(status);
    } catch (error) {
      state.java.opened.delete(path);
      throw error;
    }
  });
}

function javaScheduleChange(path) {
  if (!isJavaPath(path) || !javaReady() || !state.java.opened.has(path)) return;
  const existing = state.java.changeTimers.get(path);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    state.java.changeTimers.delete(path);
    const doc = state.docs.get(path);
    if (!doc || !javaReady()) return;
    queueJava(() =>
      call("java_change_document", {
        path,
        text: doc.content,
        version: nextJavaVersion(path),
      }),
    );
  }, 350);
  state.java.changeTimers.set(path, timer);
}

function javaDocumentSaved(path) {
  if (!isJavaPath(path) || !javaReady()) return;
  queueJava(() => call("java_save_document", { path }));
}

function javaDocumentClosed(path) {
  state.java.diagnostics.delete(path);
  state.java.collapsedProblems.delete(path);
  renderProblems();
  updateStatusRight();
  if (!isJavaPath(path)) return;
  state.java.opened.delete(path);
  state.java.versions.delete(path);
  const timer = state.java.changeTimers.get(path);
  if (timer) clearTimeout(timer);
  state.java.changeTimers.delete(path);
  if (!javaReady()) return;
  queueJava(() => call("java_close_document", { path }));
}

async function javaRefreshStatus() {
  try {
    updateJavaStatus(await call("java_status"));
  } catch {
    /* keep the last known state */
  }
}

async function javaToggleServer() {
  const restart = state.java.status === "ready";
  setBusy(restart ? "Restarting jdtls…" : "Starting jdtls…");
  try {
    updateJavaStatus(await call(restart ? "java_restart" : "java_start"));
  } catch (error) {
    showError(String(error));
  } finally {
    clearBusy();
  }
}

function offsetAt(doc, position) {
  if (!position) return 0;
  const lineNumber = Math.min(Math.max((position.line || 0) + 1, 1), doc.lines);
  const line = doc.line(lineNumber);
  return line.from + Math.min(Math.max(position.character || 0, 0), line.length);
}

function applyJavaDiagnostics(path) {
  for (const pane of ["primary", "secondary"]) {
    const view = panes[pane].view;
    if (!view || panes[pane].path !== path) continue;
    if (pane === "secondary" && !state.split) continue;
    const doc = view.state.doc;
    const diagnostics = (state.java.diagnostics.get(path) || []).map((diagnostic) => {
      const from = offsetAt(doc, diagnostic.range?.start);
      const to = offsetAt(doc, diagnostic.range?.end);
      return {
        from: Math.min(from, to),
        to: Math.max(from, to),
        severity: diagnostic.severity || "info",
        message: diagnostic.message || "Java diagnostic",
        source: diagnostic.source || "jdtls",
      };
    });
    view.dispatch(setDiagnostics(view.state, diagnostics));
  }
}

function handleJavaDiagnostics(payload) {
  if (!payload || typeof payload.path !== "string") return;
  const diagnostics = Array.isArray(payload.diagnostics) ? payload.diagnostics : [];
  // An empty publication means the file is clean; drop the entry instead of
  // keeping a file group with nothing in it.
  if (diagnostics.length) state.java.diagnostics.set(payload.path, diagnostics);
  else state.java.diagnostics.delete(payload.path);
  if (state.active === payload.path) applyJavaDiagnostics(payload.path);
  renderProblems();
  updateStatusRight();
}

const SEVERITY_ICONS = { error: "✖", warning: "▲", info: "ℹ", hint: "ℹ" };
const SEVERITY_LABELS = { error: "Error", warning: "Warning", info: "Info", hint: "Hint" };

function problemEntries() {
  const entries = [];
  for (const [path, diagnostics] of state.java.diagnostics) {
    for (const diagnostic of diagnostics) {
      entries.push({
        path,
        diagnostic,
        severity: diagnostic.severity || "info",
      });
    }
  }
  return entries;
}

function problemCounts(entries) {
  const counts = { error: 0, warning: 0, info: 0, hint: 0 };
  for (const entry of entries) {
    counts[entry.severity] = (counts[entry.severity] || 0) + 1;
  }
  return counts;
}

function problemMatchesFilter(severity) {
  const filter = state.java.problemFilter;
  if (filter === "all") return true;
  if (filter === "info") return severity === "info" || severity === "hint";
  return severity === filter;
}

function problemSummary(counts, total) {
  if (!total) return javaReady() ? "No problems reported." : "No problems yet.";
  const parts = [];
  const push = (count, singular, plural) => {
    if (count) parts.push(`${count} ${count === 1 ? singular : plural}`);
  };
  push(counts.error, "error", "errors");
  push(counts.warning, "warning", "warnings");
  push(counts.info + counts.hint, "info", "info");
  return parts.join(" · ");
}

function updateProblemFilterLabels(counts) {
  const select = $("java-problem-filter");
  if (!select) return;
  const totals = {
    all: counts.error + counts.warning + counts.info + counts.hint,
    error: counts.error,
    warning: counts.warning,
    info: counts.info + counts.hint,
  };
  const base = { all: "All", error: "Errors", warning: "Warnings", info: "Info" };
  for (const option of select.options) {
    const label = base[option.value] || option.value;
    option.textContent = totals[option.value] ? `${label} (${totals[option.value]})` : label;
  }
  if (select.value !== state.java.problemFilter) select.value = state.java.problemFilter;
}

function problemGroup(path, entries) {
  const group = document.createElement("div");
  group.className = "problem-group";
  const collapsed = state.java.collapsedProblems.has(path);
  const header = document.createElement("div");
  header.className = "problem-file";
  header.title = path;
  const caret = document.createElement("span");
  caret.className = "problem-file-caret";
  caret.textContent = collapsed ? "▸" : "▾";
  const name = document.createElement("span");
  name.className = "problem-file-name";
  name.textContent = workspaceRelative(path);
  header.append(caret, name);
  const counts = problemCounts(entries);
  for (const severity of ["error", "warning", "info", "hint"]) {
    if (!counts[severity]) continue;
    const badge = document.createElement("span");
    badge.className = `problem-count ${severity}`;
    badge.textContent = String(counts[severity]);
    badge.title = `${counts[severity]} ${SEVERITY_LABELS[severity].toLowerCase()}${counts[severity] === 1 ? "" : "s"}`;
    header.appendChild(badge);
  }
  header.addEventListener("click", () => {
    if (state.java.collapsedProblems.has(path)) state.java.collapsedProblems.delete(path);
    else state.java.collapsedProblems.add(path);
    renderProblems();
  });
  group.appendChild(header);
  if (!collapsed) for (const entry of entries) group.appendChild(problemEntry(entry));
  return group;
}

function problemEntry(entry) {
  const { path, diagnostic, severity } = entry;
  const start = diagnostic.range?.start || { line: 0, character: 0 };
  const line = start.line || 0;
  const character = start.character || 0;
  const wrapper = document.createElement("div");
  wrapper.className = "problem-entry";
  const row = document.createElement("div");
  row.className = `problem ${severity}`;
  row.title = `${path}:${line + 1}:${character + 1}\n${diagnostic.message || ""}`;
  const icon = document.createElement("span");
  icon.className = "problem-severity";
  icon.textContent = SEVERITY_ICONS[severity] || "•";
  icon.title = SEVERITY_LABELS[severity] || severity;
  const location = document.createElement("span");
  location.className = "problem-location";
  location.textContent = `${line + 1}:${character + 1}`;
  const message = document.createElement("span");
  message.className = "problem-message";
  message.textContent = diagnostic.message || "";
  row.append(icon, location, message);
  if (diagnostic.code) {
    const code = document.createElement("span");
    code.className = "problem-code";
    code.textContent = diagnostic.code;
    code.title = `Diagnostic code: ${diagnostic.code}`;
    row.appendChild(code);
  }
  row.addEventListener("click", () => openAbsoluteFile(path, line, character));
  wrapper.appendChild(row);

  const related = Array.isArray(diagnostic.relatedInformation)
    ? diagnostic.relatedInformation
    : [];
  if (related.length) {
    const list = document.createElement("div");
    list.className = "problem-related-list";
    for (const info of related.slice(0, 5)) {
      const relatedStart = info.range?.start || { line: 0, character: 0 };
      const item = document.createElement("div");
      item.className = "problem-related";
      item.title = info.path;
      item.textContent = `↳ ${workspaceRelative(info.path)}:${(relatedStart.line || 0) + 1} — ${info.message || ""}`;
      item.addEventListener("click", (event) => {
        event.stopPropagation();
        openAbsoluteFile(info.path, relatedStart.line || 0, relatedStart.character || 0);
      });
      list.appendChild(item);
    }
    if (related.length > 5) {
      const more = document.createElement("div");
      more.className = "problem-related";
      more.textContent = `… ${related.length - 5} more related location(s)`;
      list.appendChild(more);
    }
    wrapper.appendChild(list);
  }
  return wrapper;
}

function renderProblems() {
  const container = $("java-problems");
  if (!container) return;
  const all = problemEntries();
  const counts = problemCounts(all);
  updateProblemFilterLabels(counts);
  const summary = $("java-problem-summary");
  if (summary) summary.textContent = problemSummary(counts, all.length);

  const visible = all.filter((entry) => problemMatchesFilter(entry.severity));
  container.replaceChildren();
  if (!visible.length) {
    const empty = document.createElement("div");
    empty.className = "panel-note";
    empty.textContent = all.length
      ? "No problems match the current filter."
      : javaReady()
        ? "No problems reported."
        : "No problems yet.";
    container.appendChild(empty);
    return;
  }

  const groups = new Map();
  for (const entry of visible) {
    const list = groups.get(entry.path) || [];
    list.push(entry);
    groups.set(entry.path, list);
  }
  const paths = [...groups.keys()].sort((left, right) =>
    workspaceRelative(left).localeCompare(workspaceRelative(right)),
  );
  for (const path of paths) {
    const entries = groups.get(path).sort(
      (left, right) =>
        (left.diagnostic.range?.start?.line || 0) - (right.diagnostic.range?.start?.line || 0) ||
        (left.diagnostic.range?.start?.character || 0) -
          (right.diagnostic.range?.start?.character || 0),
    );
    container.appendChild(problemGroup(path, entries));
  }
}

function clearJavaProblems() {
  state.java.diagnostics.clear();
  state.java.collapsedProblems.clear();
  for (const pane of ["primary", "secondary"]) {
    const view = panes[pane].view;
    if (view) view.dispatch(setDiagnostics(view.state, []));
  }
  renderProblems();
  updateStatusRight();
}

async function javaHoverSource(view, pos) {
  const path = state.active;
  if (!isJavaPath(path) || !javaReady()) return null;
  const line = view.state.doc.lineAt(pos);
  try {
    const info = await invoke("java_hover", {
      path,
      line: line.number - 1,
      character: pos - line.from,
    });
    if (!info?.contents) return null;
    return {
      pos,
      above: true,
      create() {
        const dom = document.createElement("div");
        dom.className = "java-hover";
        dom.textContent = info.contents;
        return { dom };
      },
    };
  } catch {
    return null;
  }
}

function completionName(label) {
  // jdtls display labels look like `out : PrintStream` or `exit(int) : void`.
  return label.split(" : ")[0].split("(")[0].trim() || label;
}

function completionApply(item) {
  const text = item.insertText;
  // jdtls snippets contain LSP placeholders such as `${1:name}`; inserting
  // those literally is worse than inserting the plain identifier.
  if (typeof text === "string" && text && !text.includes("${")) return text;
  return completionName(item.label || "");
}

async function javaCompletionSource(context) {
  const path = state.active;
  if (!state.java.completionEnabled || !isJavaPath(path) || !javaReady()) return null;
  const line = context.state.doc.lineAt(context.pos);
  try {
    const items = await invoke("java_completion", {
      path,
      line: line.number - 1,
      character: context.pos - line.from,
    });
    if (!Array.isArray(items) || !items.length) return null;
    const word = context.matchBefore(/[A-Za-z_$][\w$]*/);
    return {
      from: word ? word.from : context.pos,
      options: items.map((item) => ({
        label: item.label,
        detail: item.detail || undefined,
        info: item.documentation || undefined,
        type: item.kind || "text",
        apply: completionApply(item),
      })),
    };
  } catch {
    return null;
  }
}

async function jumpToDefinition() {
  const editor = activeView();
  const path = state.active;
  if (!editor || !isJavaPath(path)) return;
  if (!javaReady()) {
    setStatus("Java language server is not ready");
    return;
  }
  const pos = editor.state.selection.main.head;
  const line = editor.state.doc.lineAt(pos);
  try {
    const locations = await invoke("java_definition", {
      path,
      line: line.number - 1,
      character: pos - line.from,
    });
    if (!Array.isArray(locations) || !locations.length) {
      setStatus("No definition found at the cursor");
      return;
    }
    const target = locations.find((location) => location.path === path) || locations[0];
    await openLocation(target);
    if (locations.length > 1) setStatus(`${locations.length} definitions available`);
  } catch (error) {
    showError(String(error));
  }
}

async function openLocation(location) {
  if (!location) return;
  const line = location.range?.start?.line || location.line || 0;
  const character = location.range?.start?.character || location.character || 0;
  if (location.uri && String(location.uri).startsWith("jdt:")) {
    await openDecompiled(location.uri, line, character);
    return;
  }
  if (location.path) await openAbsoluteFile(location.path, line, character);
}

async function openDecompiled(uri, line = 0, character = 0) {
  setBusy("Reading decompiled source…");
  try {
    const content = await invoke("java_class_file", { uri });
    const name = decodeURIComponent(uri.split("/").pop() || "class").split("?")[0];
    state.docs.set(uri, { path: uri, name, content, dirty: false, virtual: true });
    state.active = uri;
    renderTabs();
    showActiveDocument();
    revealLine(line, character);
    setStatus(`Decompiled ${name}`);
  } catch (error) {
    showError(String(error));
  } finally {
    clearBusy();
  }
}

async function openAbsoluteFile(path, line = 0, character = 0) {
  if (!path.startsWith(`${state.root}/`)) {
    setStatus(`Definition is outside the workspace: ${path}:${line + 1}`);
    return;
  }
  if (!state.docs.has(path)) {
    try {
      const content = await call("read_file", { path });
      state.docs.set(path, { path, name: fileName(path), content, dirty: false });
    } catch {
      return;
    }
  }
  state.active = path;
  renderTabs();
  renderTree();
  showActiveDocument();
  applyJavaDiagnostics(path);
  revealLine(line, character);
  javaDocumentOpened(path);
}

function revealLine(line, character) {
  const editor = activeView();
  if (!editor) return;
  const at = offsetAt(editor.state.doc, { line, character });
  editor.dispatch({ selection: { anchor: at }, scrollIntoView: true });
  editor.focus();
}

function applyJavaEdits(edits) {
  const editor = activeView();
  if (!editor || !Array.isArray(edits) || !edits.length) return 0;
  const doc = editor.state.doc;
  // CodeMirror applies every change against the original document, so the
  // list must be sorted ascending; jdtls ranges never overlap.
  const changes = edits
    .map((edit) => ({
      from: offsetAt(doc, edit.range?.start),
      to: offsetAt(doc, edit.range?.end),
      insert: edit.newText || "",
    }))
    .filter((change) => change.from <= change.to)
    .sort((left, right) => left.from - right.from);
  if (!changes.length) return 0;
  editor.dispatch({ changes });
  return changes.length;
}

async function formatJavaDocument() {
  const editor = activeView();
  const path = state.active;
  if (!editor || !isJavaPath(path)) return;
  if (!state.java.formatEnabled) {
    setStatus("Java formatting is disabled in settings");
    return;
  }
  if (!javaReady()) {
    setStatus("Java language server is not ready");
    return;
  }
  setBusy("Formatting…");
  try {
    const edits = await call("java_format_document", {
      path,
      tabSize: 4,
      insertSpaces: true,
    });
    const applied = applyJavaEdits(edits);
    setStatus(applied ? `Formatted ${fileName(path)}` : "Already formatted");
  } catch (error) {
    showError(String(error));
  } finally {
    clearBusy();
  }
}

async function organizeJavaImports() {
  const editor = activeView();
  const path = state.active;
  if (!editor || !isJavaPath(path)) return;
  if (!javaReady()) {
    setStatus("Java language server is not ready");
    return;
  }
  setBusy("Organizing imports…");
  try {
    const edits = await call("java_organize_imports", { path });
    const applied = applyJavaEdits(edits);
    setStatus(applied ? `Organized imports in ${fileName(path)}` : "Imports already organized");
  } catch (error) {
    showError(String(error));
  } finally {
    clearBusy();
  }
}

/* ---------------- opencode ---------------- */

function aiAppend(role, text, kind = "") {
  const messages = $("ai-messages");
  const element = document.createElement("div");
  element.className = `ai-message ${kind}`.trim();
  if (role) {
    const label = document.createElement("span");
    label.className = "role";
    label.textContent = role;
    element.appendChild(label);
  }
  element.appendChild(document.createTextNode(text.slice(0, 4000)));
  messages.appendChild(element);
  while (messages.childElementCount > 250) messages.firstElementChild.remove();
  messages.scrollTop = messages.scrollHeight;
  return element;
}

function aiReset() {
  $("ai-messages").replaceChildren();
  state.ai.streaming = null;
  state.ai.parts.clear();
}

async function aiConnect() {
  setBusy("Connecting to OpenCode…");
  try {
    const info = await call("opencode_connect");
    state.ai.connected = true;
    $("ai-status").textContent = `OpenCode ${info.version} · pid ${info.pid} · ${info.url}`;
    await aiRefreshSessions();
    await refreshPermissions();
    updateStatusRight();
    setStatus("OpenCode connected");
  } catch (error) {
    $("ai-status").textContent = `Not connected: ${error}`;
  } finally {
    clearBusy();
  }
}

async function aiRefreshSessions() {
  if (!state.ai.connected) return;
  try {
    const sessions = await call("opencode_sessions");
    state.ai.sessions = sessions;
    const container = $("ai-sessions");
    container.replaceChildren();
    for (const session of sessions) {
      const row = document.createElement("div");
      row.className = `ai-session${session.id === state.ai.session ? " active" : ""}`;
      row.textContent = session.title || session.id;
      row.title = session.id;
      row.addEventListener("click", () => aiSelectSession(session));
      container.appendChild(row);
    }
  } catch (error) {
    $("ai-status").textContent = `Session list failed: ${error}`;
  }
}

async function aiNewSession() {
  if (!state.ai.connected) await aiConnect();
  if (!state.ai.connected) return;
  setBusy("Creating session…");
  try {
    const session = await call("opencode_create_session");
    state.ai.session = session.id;
    aiReset();
    aiAppend("assistant", "New session ready.");
    await aiRefreshSessions();
    setStatus(`OpenCode session ${session.id}`);
  } catch (error) {
    aiAppend("error", String(error), "error");
  } finally {
    clearBusy();
  }
}

async function aiSelectSession(session) {
  state.ai.session = session.id;
  aiReset();
  renderAiSessions();
  try {
    const context = await call("opencode_context", { sessionId: session.id });
    for (const message of context) {
      const role = message?.role || message?.info?.role || "assistant";
      const text = collectText(message);
      if (text) aiAppend(role, text, role === "user" ? "user" : "");
    }
    if (!context.length) aiAppend("assistant", "No messages yet.");
  } catch (error) {
    aiAppend("error", String(error), "error");
  }
  await refreshPermissions();
}

function renderAiSessions() {
  const container = $("ai-sessions");
  container.replaceChildren();
  for (const session of state.ai.sessions) {
    const row = document.createElement("div");
    row.className = `ai-session${session.id === state.ai.session ? " active" : ""}`;
    row.textContent = session.title || session.id;
    row.title = session.id;
    row.addEventListener("click", () => aiSelectSession(session));
    container.appendChild(row);
  }
}

function collectText(value, depth = 0) {
  if (depth > 8 || value == null) return "";
  if (typeof value === "string") return "";
  if (Array.isArray(value)) {
    return value.map((item) => collectText(item, depth + 1)).filter(Boolean).join("\n");
  }
  if (typeof value !== "object") return "";
  if (typeof value.text === "string" && (value.type === "text" || value.type === undefined)) {
    return value.text;
  }
  const candidates = [];
  for (const key of ["parts", "content", "message", "info", "data", "properties"]) {
    const candidate = value[key];
    if (typeof candidate === "string" && (key === "content" || key === "text")) {
      candidates.push(candidate);
    } else if (candidate) {
      candidates.push(collectText(candidate, depth + 1));
    }
  }
  return candidates.filter(Boolean).join("\n");
}

async function aiSend() {
  const input = $("ai-input");
  const text = input.value.trim();
  if (!text) return;
  if (!state.ai.connected) await aiConnect();
  if (!state.ai.connected) return;
  if (!state.ai.session) await aiNewSession();
  if (!state.ai.session) return;
  input.value = "";
  aiAppend("you", text, "user");
  state.ai.streaming = aiAppend("assistant", "");
  state.ai.parts.clear();
  try {
    await call("opencode_prompt", { sessionId: state.ai.session, text });
    setStatus("Prompt sent");
  } catch (error) {
    aiAppend("error", String(error), "error");
  }
}

function handleAiEvent(payload) {
  if (!payload || typeof payload.name !== "string") return;
  const name = payload.name;
  if (name === "stream.reconnected" || name === "stream.closed" || name.includes("permission")) {
    if (state.ai.session) refreshSessionContext(state.ai.session);
    refreshPermissions();
    if (name === "stream.reconnected" || name === "stream.closed") return;
  }
  // Only render the session the user selected. The service broadcasts events
  // for every session; rendering all of them floods the webview.
  if (!state.ai.session) return;
  const data = payload.data || {};
  const sessionId =
    data.sessionID ||
    data.properties?.sessionID ||
    data.data?.sessionID ||
    data.info?.sessionID ||
    null;
  if (sessionId && sessionId !== state.ai.session) return;

  if (name === "session.idle") {
    setStatus("OpenCode idle");
    if (state.ai.session) refreshSessionContext(state.ai.session);
    refreshPermissions();
    return;
  }
  if (name === "session.error" || name.endsWith(".error")) {
    aiAppend("error", collectText(data) || name, "error");
    return;
  }
  const part = data.properties?.part || data.part || data.data?.part;
  if (part && typeof part.text === "string") {
    const key = part.id || part.messageID || "text";
    const previous = state.ai.parts.get(key) || "";
    let delta = part.text;
    if (part.text.startsWith(previous)) delta = part.text.slice(previous.length);
    state.ai.parts.set(key, part.text);
    if (delta) {
      if (!state.ai.streaming) state.ai.streaming = aiAppend("assistant", "");
      state.ai.streaming.appendChild(document.createTextNode(delta));
      const messages = $("ai-messages");
      messages.scrollTop = messages.scrollHeight;
    }
    return;
  }
  const delta = data.delta || data.properties?.delta || data.data?.delta;
  if (typeof delta === "string" && delta) {
    if (!state.ai.streaming) state.ai.streaming = aiAppend("assistant", "");
    state.ai.streaming.appendChild(document.createTextNode(delta));
    return;
  }
  if (name.includes("tool") || name.includes("permission")) {
    const summary = (collectText(data) || JSON.stringify(data)).slice(0, 500);
    aiAppend(name, summary, "tool");
  }
}

async function refreshPermissions() {
  if (!state.ai.connected) return;
  try {
    const requests = await call("opencode_permissions");
    state.ai.permissions = Array.isArray(requests) ? requests : [];
    renderPermissions();
  } catch (error) {
    const container = $("ai-permissions");
    if (container) container.textContent = String(error);
  }
}

function renderPermissions() {
  const container = $("ai-permissions");
  if (!container) return;
  const requests = state.ai.session
    ? state.ai.permissions.filter((request) => !request.sessionId || request.sessionId === state.ai.session)
    : state.ai.permissions;
  container.replaceChildren();
  if (!requests.length) {
    container.textContent = "No pending permissions";
    return;
  }
  for (const request of requests) {
    const card = document.createElement("div");
    card.className = "permission-card";
    const title = document.createElement("strong");
    title.textContent = request.action || "Permission";
    const body = document.createElement("p");
    body.textContent = request.message || request.resources || request.id;
    const actions = document.createElement("div");
    actions.className = "permission-actions";
    for (const decision of ["once", "always", "reject"]) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "text-button";
      button.textContent = decision === "once" ? "Once" : decision === "always" ? "Always" : "Reject";
      button.addEventListener("click", () => replyPermission(request, decision));
      actions.appendChild(button);
    }
    card.append(title, body, actions);
    container.appendChild(card);
  }
}

async function replyPermission(request, decision) {
  try {
    await call("opencode_reply_permission", {
      sessionId: request.sessionId || state.ai.session,
      requestId: request.id,
      decision,
    });
    setStatus(`Permission ${decision}`);
    await refreshPermissions();
  } catch (error) {
    showError(String(error));
    await refreshPermissions();
  }
}

async function refreshSessionContext(sessionId) {
  try {
    const context = await call("opencode_context", { sessionId });
    if (sessionId !== state.ai.session) return;
    const text = context.map((message) => collectText(message)).filter(Boolean).join("\n");
    if (text && state.ai.streaming && !state.ai.streaming.textContent.trim()) {
      state.ai.streaming.textContent = text;
    }
  } catch {
    /* non-fatal */
  }
}

async function aiStop() {
  if (!state.ai.session) return;
  try {
    await call("opencode_interrupt", { sessionId: state.ai.session });
    setStatus("Interrupt requested");
  } catch (error) {
    aiAppend("error", String(error), "error");
  }
}

function showPanel(name) {
  for (const button of document.querySelectorAll(".activity-button")) {
    button.classList.toggle("active", button.dataset.panel === name);
  }
  for (const panel of document.querySelectorAll(".panel")) panel.classList.add("hidden");
  $(`panel-${name}`).classList.remove("hidden");
}

function taskFor(name, predicate) {
  const projects = state.gradle?.projects || [];
  const root = projects.find((project) => project.path === ":") || projects[0];
  const pools = root ? [root, ...projects.filter((project) => project !== root)] : projects;
  for (const project of pools) {
    const match = project.tasks.find((task) =>
      predicate ? predicate(task) : task.name === name,
    );
    if (match) return match;
  }
  return { path: name, name };
}

async function runNamedTask(name, predicate) {
  showPanel("gradle");
  await runGradleTask(taskFor(name, predicate));
}

function renderTrust() {
  const banner = $("trust-banner");
  if (!banner) return;
  if (state.trust === "trusted") {
    banner.classList.add("hidden");
    banner.replaceChildren();
    return;
  }
  banner.classList.remove("hidden");
  banner.replaceChildren();
  const text = document.createElement("span");
  text.textContent = state.trust === "restricted"
    ? "Restricted mode. Editing works, but Java intelligence, Gradle, and OpenCode stay off until you trust this folder."
    : "This folder is not trusted. Java language features and Gradle can execute project code.";
  const trust = document.createElement("button");
  trust.type = "button";
  trust.textContent = "Trust folder";
  trust.addEventListener("click", () => setTrust(true));
  banner.append(text, trust);
  if (state.trust !== "restricted") {
    const restrict = document.createElement("button");
    restrict.type = "button";
    restrict.textContent = "Don't trust";
    restrict.addEventListener("click", () => setTrust(false));
    banner.appendChild(restrict);
  }
}

async function setTrust(trusted) {
  try {
    const view = await call("set_workspace_trust", { trusted });
    state.trust = view.trust;
    renderTrust();
    setStatus(trusted ? "Workspace trusted" : "Workspace restricted");
    if (trusted) {
      for (const path of state.docs.keys()) javaDocumentOpened(path);
    } else {
      state.java.status = "restricted";
      state.java.message = "This folder is restricted.";
      renderJava();
    }
  } catch (error) {
    showError(String(error));
  }
}

function linesOf(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim());
}

async function loadJavaSettings() {
  try {
    const settings = await call("java_settings");
    state.java.formatEnabled = settings.formatEnabled !== false;
    state.java.completionEnabled = settings.completionEnabled !== false;
    $("java-format-enabled").checked = state.java.formatEnabled;
    $("java-completion-enabled").checked = state.java.completionEnabled;
    $("java-guess-arguments").checked = settings.completionGuessMethodArguments !== false;
    $("java-favorites").value = (settings.completionFavorites || []).join("\n");
    $("java-import-order").value = (settings.completionImportOrder || []).join("\n");
    $("java-vmargs").value = settings.vmargs || "";
    $("java-settings-scope").value = settings.origin === "workspace" ? "workspace" : "user";
    $("java-settings-note").textContent = settings.origin === "default"
      ? "Using built-in defaults. VM arguments apply the next time jdtls starts."
      : `Loaded ${settings.origin} settings. VM arguments apply the next time jdtls starts.`;
  } catch (error) {
    $("java-settings-note").textContent = String(error);
  }
}

async function saveJavaSettings() {
  const scope = $("java-settings-scope").value === "workspace" ? "workspace" : "user";
  try {
    const result = await call("save_java_settings", {
      settings: {
        formatEnabled: $("java-format-enabled").checked,
        completionEnabled: $("java-completion-enabled").checked,
        completionGuessMethodArguments: $("java-guess-arguments").checked,
        completionFavorites: linesOf($("java-favorites").value).filter(Boolean),
        completionImportOrder: linesOf($("java-import-order").value),
        vmargs: $("java-vmargs").value.trim(),
        scope,
      },
    });
    state.java.formatEnabled = $("java-format-enabled").checked;
    state.java.completionEnabled = $("java-completion-enabled").checked;
    const restart = result.restartRequired
      ? ` Restart jdtls to apply ${result.reasons.join(", ")}.`
      : "";
    $("java-settings-note").textContent = `Saved ${result.origin} settings.${restart}`;
    setStatus(result.restartRequired ? "Settings saved; restart jdtls to apply VM arguments" : "Java settings saved");
  } catch (error) {
    showError(String(error));
    $("java-settings-note").textContent = String(error);
  }
}

async function showDebugLog() {
  const view = $("java-debug-log");
  view.classList.remove("hidden");
  try {
    const lines = await call("java_debug_log");
    view.textContent = lines.length ? lines.join("\n") : "No debug output buffered.";
    view.scrollTop = view.scrollHeight;
  } catch (error) {
    view.textContent = String(error);
  }
}

function pathAllowed(path) {
  if (!path) return false;
  if (path === state.root || path.startsWith(`${state.root}/`)) return true;
  return state.java.extraRoots.some((root) => path === root || path.startsWith(`${root}/`));
}

function scheduleJavaSurface(path) {
  if (!isJavaPath(path) || !javaReady()) return;
  const existing = state.java.surfaceTimers.get(path);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    state.java.surfaceTimers.delete(path);
    refreshJavaSurface(path).catch(() => {});
  }, 700);
  state.java.surfaceTimers.set(path, timer);
}

async function refreshJavaSurface(path) {
  if (!isJavaPath(path) || !javaReady() || !state.docs.has(path)) return;
  const view = paneForPath(path);
  const doc = view?.state.doc;
  const endLine = doc ? Math.max(doc.lines - 1, 0) : 0;
  const endCharacter = doc ? doc.line(doc.lines).length : 0;
  const [tokens, hints, folds, lenses] = await Promise.all([
    invoke("java_semantic_tokens", { path }).catch(() => []),
    invoke("java_inlay_hints", { path, endLine, endCharacter }).catch(() => []),
    invoke("java_folding_ranges", { path }).catch(() => []),
    invoke("java_code_lens", { path }).catch(() => []),
  ]);
  state.java.folds.set(path, Array.isArray(folds) ? folds : []);
  applyJavaDecorations(path, tokens, hints);
  renderCodeLenses(lenses);
}

function applyJavaDecorations(path, tokens, hints) {
  const view = paneForPath(path);
  if (!view || view.state.field(javaDecorationField, false) == null) return;
  const doc = view.state.doc;
  const ranges = [];
  for (const token of Array.isArray(tokens) ? tokens : []) {
    const from = offsetAt(doc, { line: token.line, character: token.start });
    const to = offsetAt(doc, { line: token.line, character: (token.start || 0) + (token.length || 0) });
    if (from < to) {
      ranges.push(Decoration.mark({ class: `sem-${token.tokenType || "token"}` }).range(from, to));
    }
  }
  for (const hint of Array.isArray(hints) ? hints : []) {
    if (!hint.label) continue;
    const at = offsetAt(doc, { line: hint.line, character: hint.character });
    ranges.push(Decoration.widget({ widget: new InlayWidget(hint.label), side: 1 }).range(at));
  }
  ranges.sort((left, right) => left.from - right.from || left.to - right.to);
  const filtered = [];
  let end = -1;
  for (const range of ranges) {
    if (range.from < end) continue;
    filtered.push(range);
    end = Math.max(end, range.to);
  }
  view.dispatch({ effects: setJavaDecorations.of(Decoration.set(filtered, true)) });
}

function renderCodeLenses(lenses) {
  const container = $("java-hierarchy");
  if (!container || container.dataset.mode === "hierarchy") return;
  container.replaceChildren();
  if (!lenses?.length) {
    container.textContent = "No code lenses";
    return;
  }
  for (const lens of lenses) {
    const row = document.createElement("div");
    row.className = "reference-item";
    row.textContent = `${lens.line + 1}: ${lens.title}`;
    row.addEventListener("click", () => revealLine(lens.line, lens.character));
    container.appendChild(row);
  }
}

async function expandSelection() {
  const cursor = cursorPosition();
  if (!cursor || !isJavaPath(cursor.path) || !javaReady()) return;
  const ranges = await invoke("java_selection_ranges", {
    path: cursor.path,
    line: cursor.line,
    character: cursor.character,
  });
  const doc = cursor.view.state.doc;
  const currentFrom = cursor.from;
  const currentTo = cursor.to;
  const next = (ranges || []).find((range) => {
    const from = offsetAt(doc, range.start);
    const to = offsetAt(doc, range.end);
    return from <= currentFrom && to >= currentTo && (from < currentFrom || to > currentTo);
  });
  if (!next) {
    setStatus("No wider selection");
    return;
  }
  cursor.view.dispatch({
    selection: { anchor: offsetAt(doc, next.start), head: offsetAt(doc, next.end) },
    scrollIntoView: true,
  });
}

async function showHierarchy(direction, label) {
  const cursor = cursorPosition();
  if (!cursor || !isJavaPath(cursor.path) || !javaReady()) {
    setStatus("Java language server is not ready");
    return;
  }
  showPanel("java");
  const container = $("java-hierarchy");
  container.dataset.mode = "hierarchy";
  container.textContent = `Loading ${label}…`;
  try {
    const nodes = await invoke("java_hierarchy", {
      path: cursor.path,
      line: cursor.line,
      character: cursor.character,
      direction,
    });
    container.replaceChildren();
    if (!nodes?.length) {
      container.textContent = `No ${label}`;
      return;
    }
    for (const node of nodes) {
      const row = document.createElement("div");
      row.className = "reference-item";
      row.textContent = `${node.kind} ${node.name}`;
      row.addEventListener("click", () => openLocation(node));
      container.appendChild(row);
    }
    setStatus(`${nodes.length} ${label}`);
  } catch (error) {
    container.textContent = String(error);
  } finally {
    setTimeout(() => {
      if (container.dataset.mode === "hierarchy") delete container.dataset.mode;
    }, 8000);
  }
}

async function addWorkspaceFolder() {
  if (!javaReady()) {
    setStatus("Java language server is not ready");
    return;
  }
  const selected = await open({ directory: true, multiple: false, title: "Add workspace folder" });
  if (!selected || typeof selected !== "string") return;
  try {
    await invoke("java_add_folder", { path: selected });
    if (!state.java.extraRoots.includes(selected)) state.java.extraRoots.push(selected);
    setStatus(`Imported ${selected}`);
  } catch (error) {
    showError(String(error));
  }
}

const COMMANDS = [
  { title: "File: Open Folder", hint: "folder", run: openFolder },
  { title: "Go to File", hint: "Ctrl+P", run: () => openPalette("file") },
  { title: "File: Save", hint: "Ctrl+S", run: () => saveActive() },
  { title: "Java: Format Document", hint: "Shift+Alt+F", run: () => formatJavaDocument() },
  { title: "Java: Organize Imports", hint: "Shift+Alt+O", run: () => organizeJavaImports() },
  { title: "Java: Go to Definition", hint: "F12", run: () => jumpToDefinition() },
  { title: "Java: Find References", hint: "Shift+F12", run: () => findReferences() },
  { title: "Java: Rename Symbol", hint: "F2", run: () => startRename() },
  { title: "Java: Quick Fix", hint: "Ctrl+.", run: () => showCodeActions() },
  { title: "Java: Go to Symbol", hint: "outline", run: () => goToDocumentSymbol() },
  { title: "Java: Go to Implementation", hint: "", run: () => jumpLike("java_implementation", "implementation") },
  { title: "Java: Go to Type Definition", hint: "", run: () => jumpLike("java_type_definition", "type definition") },
  { title: "Java: Expand Selection", hint: "", run: () => expandSelection() },
  { title: "Java: Incoming Calls", hint: "", run: () => showHierarchy("incoming", "incoming calls") },
  { title: "Java: Outgoing Calls", hint: "", run: () => showHierarchy("outgoing", "outgoing calls") },
  { title: "Java: Supertypes", hint: "", run: () => showHierarchy("supertypes", "supertypes") },
  { title: "Java: Subtypes", hint: "", run: () => showHierarchy("subtypes", "subtypes") },
  { title: "Java: Add Workspace Folder", hint: "", run: () => addWorkspaceFolder() },
  { title: "View: Split Editor", hint: "", run: () => toggleSplit() },
  { title: "Gradle: Compile", hint: "compileJava", run: () => runNamedTask("compileJava") },
  { title: "Gradle: Run Application", hint: "run", run: () => runNamedTask("run", (task) => task.isRun && task.name === "run") },
  { title: "Gradle: Run Tests", hint: "test", run: () => runNamedTask("test", (task) => task.isTest && task.name === "test") },
  { title: "Gradle: Sync Project", hint: "", run: () => gradleSync() },
  { title: "Java: Start or Restart Language Server", hint: "", run: () => javaToggleServer() },
  { title: "Java: Show Debug Log", hint: "", run: () => { showPanel("java"); showDebugLog(); } },
  { title: "Workspace: Trust This Folder", hint: "", run: () => setTrust(true) },
  { title: "Workspace: Restrict This Folder", hint: "", run: () => setTrust(false) },
  { title: "View: Explorer", hint: "", run: () => showPanel("files") },
  { title: "View: Java", hint: "", run: () => showPanel("java") },
  { title: "View: Gradle", hint: "", run: () => showPanel("gradle") },
  { title: "View: OpenCode", hint: "", run: () => showPanel("ai") },
];

function cursorPosition() {
  const view = activeView();
  if (!view) return null;
  const pos = view.state.selection.main.head;
  const line = view.state.doc.lineAt(pos);
  return {
    view,
    path: state.active,
    line: line.number - 1,
    character: pos - line.from,
    from: view.state.selection.main.from,
    to: view.state.selection.main.to,
    anchorLine: view.state.doc.lineAt(view.state.selection.main.from),
  };
}

function scheduleSignatureHelp() {
  setTimeout(() => {
    showSignatureHelp().catch(() => {});
  }, 40);
}

async function showSignatureHelp() {
  const cursor = cursorPosition();
  const box = $("signature-help");
  if (!cursor || !isJavaPath(cursor.path) || !javaReady() || !workspaceTrusted()) {
    box.classList.add("hidden");
    return;
  }
  const signatures = await invoke("java_signature_help", {
    path: cursor.path,
    line: cursor.line,
    character: cursor.character,
  });
  if (!Array.isArray(signatures) || !signatures.length) {
    box.classList.add("hidden");
    return;
  }
  box.replaceChildren();
  for (const signature of signatures.slice(0, 4)) {
    const row = document.createElement("div");
    if (signature.active) row.append(document.createTextNode(signature.label));
    else row.textContent = signature.label;
    if (signature.active && signature.parameters?.length) {
      row.textContent = "";
      const active = signature.parameters.find((parameter) => parameter.active);
      row.textContent = signature.label;
      if (active) row.title = active.label;
    }
    box.appendChild(row);
  }
  const active = signatures.find((signature) => signature.active) || signatures[0];
  const parameter = active.parameters?.find((item) => item.active);
  if (parameter) {
    const note = document.createElement("div");
    note.className = "active-param";
    note.textContent = parameter.label;
    box.appendChild(note);
  }
  const coords = cursor.view.coordsAtPos(cursor.view.state.selection.main.head);
  if (coords) {
    box.style.left = `${Math.max(8, coords.left)}px`;
    box.style.top = `${coords.bottom + 6}px`;
  }
  box.classList.remove("hidden");
}

async function findReferences() {
  const cursor = cursorPosition();
  if (!cursor || !isJavaPath(cursor.path)) return;
  if (!javaReady()) {
    setStatus("Java language server is not ready");
    return;
  }
  showPanel("java");
  const container = $("java-references");
  container.textContent = "Searching…";
  try {
    const locations = await invoke("java_references", {
      path: cursor.path,
      line: cursor.line,
      character: cursor.character,
    });
    renderLocations(container, locations, "No references");
    setStatus(`${locations.length} reference(s)`);
  } catch (error) {
    container.textContent = String(error);
  }
}

function renderLocations(container, locations, empty) {
  container.replaceChildren();
  if (!locations?.length) {
    container.textContent = empty;
    return;
  }
  for (const location of locations) {
    const row = document.createElement("div");
    row.className = "reference-item";
    const line = location.range?.start?.line || 0;
    const character = location.range?.start?.character || 0;
    const label = location.uri && String(location.uri).startsWith("jdt:")
      ? location.uri
      : `${workspaceRelative(location.path)}:${line + 1}:${character + 1}`;
    row.textContent = label;
    row.addEventListener("click", () => openLocation(location));
    container.appendChild(row);
  }
}

let renameTarget = null;

async function startRename() {
  const cursor = cursorPosition();
  if (!cursor || !isJavaPath(cursor.path)) return;
  if (!javaReady()) {
    setStatus("Java language server is not ready");
    return;
  }
  hideSignature();
  let placeholder = "";
  try {
    const prepared = await invoke("java_prepare_rename", {
      path: cursor.path,
      line: cursor.line,
      character: cursor.character,
    });
    if (!prepared) {
      setStatus("This symbol cannot be renamed");
      return;
    }
    placeholder = prepared.placeholder || "";
  } catch (error) {
    showError(String(error));
    return;
  }
  renameTarget = cursor;
  $("rename-input").value = placeholder;
  $("rename-preview").textContent = placeholder
    ? `Rename “${placeholder}”`
    : "Rename the symbol at the cursor";
  $("rename-dialog").classList.remove("hidden");
  $("rename-input").focus();
  $("rename-input").select();
}

function cancelRename() {
  renameTarget = null;
  $("rename-dialog").classList.add("hidden");
}

async function applyRename() {
  const cursor = renameTarget;
  const newName = $("rename-input").value.trim();
  if (!cursor || !newName) return;
  cancelRename();
  setBusy(`Renaming to ${newName}…`);
  try {
    const files = await invoke("java_rename", {
      path: cursor.path,
      line: cursor.line,
      character: cursor.character,
      newName,
    });
    const count = await applyWorkspaceEdits(files);
    setStatus(count ? `Renamed in ${files.length} file(s)` : "Rename made no changes");
  } catch (error) {
    showError(String(error));
  } finally {
    clearBusy();
  }
}

async function showCodeActions() {
  const cursor = cursorPosition();
  if (!cursor || !isJavaPath(cursor.path)) return;
  if (!javaReady()) {
    setStatus("Java language server is not ready");
    return;
  }
  const from = cursor.view.state.doc.lineAt(cursor.from);
  const to = cursor.view.state.doc.lineAt(cursor.to);
  const actions = await invoke("java_code_actions", {
    path: cursor.path,
    startLine: from.number - 1,
    startCharacter: cursor.from - from.from,
    endLine: to.number - 1,
    endCharacter: cursor.to - to.from,
  });
  const list = $("code-action-list");
  list.replaceChildren();
  if (!actions?.length) {
    setStatus("No code actions");
    return;
  }
  for (const action of actions) {
    const row = document.createElement("div");
    row.className = `code-action-item${action.disabledReason ? " disabled" : ""}`;
    row.textContent = `${action.preferred ? "★ " : ""}${action.title}`;
    row.title = action.disabledReason || action.kind || "";
    if (!action.disabledReason) {
      row.addEventListener("click", () => applyCodeAction(action));
    }
    list.appendChild(row);
  }
  $("code-actions").classList.remove("hidden");
}

async function applyCodeAction(action) {
  $("code-actions").classList.add("hidden");
  if (!action.edits?.length) {
    setStatus(action.disabledReason || "This code action has no text edit");
    return;
  }
  const count = await applyWorkspaceEdits(action.edits);
  setStatus(count ? action.title : "Code action made no changes");
}

async function applyWorkspaceEdits(files) {
  if (!Array.isArray(files) || !files.length) return 0;
  let count = 0;
  for (const file of files) {
    if (!file?.path || !pathAllowed(file.path)) continue;
    if (!state.docs.has(file.path)) {
      const content = await call("read_file", { path: file.path });
      state.docs.set(file.path, {
        path: file.path,
        name: fileName(file.path),
        content,
        dirty: false,
      });
    }
    const view = paneForPath(file.path);
    if (view) {
      count += applyEditsOnView(view, file.edits || []);
    } else {
      const doc = state.docs.get(file.path);
      const next = applyEditsToString(doc.content, file.edits || []);
      if (next !== doc.content) {
        doc.content = next;
        doc.dirty = true;
        count += (file.edits || []).length;
      }
    }
    javaScheduleChange(file.path);
  }
  renderTabs();
  showActiveDocument();
  return count;
}

function paneForPath(path) {
  for (const pane of ["primary", "secondary"]) {
    if (panes[pane].path === path && panes[pane].view && (pane === "primary" || state.split)) {
      return panes[pane].view;
    }
  }
  return null;
}

function applyEditsOnView(view, edits) {
  if (!edits.length) return 0;
  const doc = view.state.doc;
  const changes = edits
    .map((edit) => ({
      from: offsetAt(doc, edit.range?.start),
      to: offsetAt(doc, edit.range?.end),
      insert: edit.newText || "",
    }))
    .filter((change) => change.from <= change.to)
    .sort((left, right) => left.from - right.from);
  if (!changes.length) return 0;
  view.dispatch({ changes });
  return changes.length;
}

function applyEditsToString(text, edits) {
  const newline = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(/\r?\n/);
  const starts = [];
  let offset = 0;
  for (let index = 0; index < lines.length; index += 1) {
    starts.push(offset);
    offset += lines[index].length;
    if (index < lines.length - 1) offset += newline.length;
  }
  const at = (position) => {
    const line = Math.min(Math.max(position?.line || 0, 0), Math.max(lines.length - 1, 0));
    return (starts[line] || 0) + Math.min(position?.character || 0, lines[line]?.length || 0);
  };
  const located = edits
    .map((edit) => ({
      from: at(edit.range?.start),
      to: at(edit.range?.end),
      insert: edit.newText || "",
    }))
    .filter((edit) => edit.from <= edit.to)
    .sort((left, right) => right.from - left.from);
  let result = text;
  for (const edit of located) {
    result = result.slice(0, edit.from) + edit.insert + result.slice(edit.to);
  }
  return result;
}

function hideSignature() {
  $("signature-help").classList.add("hidden");
}

async function goToDocumentSymbol() {
  const path = state.active;
  if (!isJavaPath(path) || !javaReady()) {
    setStatus("Open a Java file with the language server ready");
    return;
  }
  const symbols = await invoke("java_document_symbols", { path });
  const flat = [];
  const walk = (items, prefix) => {
    for (const symbol of items || []) {
      flat.push({ ...symbol, title: `${prefix}${symbol.name}` });
      walk(symbol.children, `${prefix}${symbol.name}.`);
    }
  };
  walk(symbols, "");
  openPalette("symbol", flat);
}

function openPalette(mode, symbols = []) {
  paletteMode = mode;
  paletteSymbols = symbols;
  paletteIndex = 0;
  const input = $("palette-input");
  input.value = "";
  input.placeholder = mode === "file" ? "Go to file" : "Type a command";
  $("palette").classList.remove("hidden");
  renderPalette();
  input.focus();
}

function closePalette() {
  $("palette").classList.add("hidden");
}

function paletteItems() {
  const query = $("palette-input").value.trim().toLowerCase();
  if (paletteMode === "symbol") {
    return paletteSymbols
      .filter((symbol) => !query || symbol.title.toLowerCase().includes(query) || symbol.name.toLowerCase().includes(query))
      .slice(0, 50)
      .map((symbol) => ({
        title: symbol.title,
        hint: symbol.kind || "",
        run: () =>
          openAbsoluteFile(
            state.active,
            symbol.selection?.start?.line || symbol.range?.start?.line || 0,
            symbol.selection?.start?.character || symbol.range?.start?.character || 0,
          ),
      }));
  }
  if (paletteMode === "file") {
    return state.files
      .filter((entry) => !entry.isDir)
      .filter((entry) => !query || entry.path.toLowerCase().includes(query))
      .slice(0, 50)
      .map((entry) => ({
        title: entry.name,
        hint: entry.path,
        run: () => openFile(entry),
      }));
  }
  return COMMANDS.filter((command) => !query || command.title.toLowerCase().includes(query));
}

function renderPalette() {
  const items = paletteItems();
  if (paletteIndex >= items.length) paletteIndex = 0;
  const list = $("palette-list");
  list.replaceChildren();
  items.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = `palette-item${index === paletteIndex ? " active" : ""}`;
    const title = document.createElement("span");
    title.textContent = item.title;
    const hint = document.createElement("span");
    hint.textContent = item.hint || "";
    row.append(title, hint);
    row.addEventListener("mousedown", (event) => {
      event.preventDefault();
      closePalette();
      item.run();
    });
    list.appendChild(row);
  });
}

function runPaletteSelection() {
  const item = paletteItems()[paletteIndex];
  closePalette();
  if (item) item.run();
}

async function jumpLike(command, label) {
  const cursor = cursorPosition();
  if (!cursor || !isJavaPath(cursor.path) || !javaReady()) {
    setStatus("Java language server is not ready");
    return;
  }
  const locations = await invoke(command, {
    path: cursor.path,
    line: cursor.line,
    character: cursor.character,
  });
  if (!locations?.length) {
    setStatus(`No ${label} found`);
    return;
  }
  const target = locations[0];
  await openAbsoluteFile(
    target.path,
    target.range?.start?.line || 0,
    target.range?.start?.character || 0,
  );
  if (locations.length > 1) setStatus(`${locations.length} ${label} results; opened the first`);
}

async function openFolder() {
  const directory = await open({ directory: true, multiple: false, title: "Open workspace" });
  if (directory) await openWorkspace(directory);
}

/* ---------------- wiring ---------------- */

function bindPanels() {
  for (const button of document.querySelectorAll(".activity-button")) {
    button.addEventListener("click", () => {
      for (const other of document.querySelectorAll(".activity-button")) {
        other.classList.toggle("active", other === button);
      }
      for (const panel of document.querySelectorAll(".panel")) panel.classList.add("hidden");
      $(`panel-${button.dataset.panel}`).classList.remove("hidden");
    });
  }
}

async function boot() {
  createEditor();
  bindPanels();

  $("open-folder").addEventListener("click", openFolder);
  $("compile-java").addEventListener("click", () => runNamedTask("compileJava"));
  $("run-java").addEventListener("click", () => runNamedTask("run", (task) => task.isRun && task.name === "run"));
  $("test-java").addEventListener("click", () => runNamedTask("test", (task) => task.isTest && task.name === "test"));
  $("command-palette").addEventListener("click", () => openPalette("command"));
  $("refresh-files").addEventListener("click", async () => {
    if (state.root) await openWorkspace(state.root);
  });
  $("gradle-sync").addEventListener("click", gradleSync);
  $("gradle-stop").addEventListener("click", stopGradle);
  $("gradle-settings-toggle").addEventListener("click", () => {
    $("gradle-settings").classList.toggle("hidden");
  });
  for (const id of [
    "gradle-log-level",
    "gradle-opt-stacktrace",
    "gradle-opt-offline",
    "gradle-opt-warnings",
  ]) {
    $(id).addEventListener("change", readGradleSettings);
  }
  $("gradle-extra-args").addEventListener("input", readGradleSettings);
  renderGradleSettings();
  $("gradle-list-tests").addEventListener("click", discoverTests);
  $("gradle-clear").addEventListener("click", () => ($("gradle-log").textContent = ""));
  $("java-start").addEventListener("click", javaToggleServer);
  $("java-format").addEventListener("click", formatJavaDocument);
  $("java-organize").addEventListener("click", organizeJavaImports);
  $("java-clear-log").addEventListener("click", () => ($("java-log").textContent = ""));
  $("java-settings-toggle").addEventListener("click", () => {
    $("java-settings").classList.toggle("hidden");
  });
  $("java-settings-save").addEventListener("click", saveJavaSettings);
  $("java-show-debug").addEventListener("click", showDebugLog);
  $("rename-apply").addEventListener("click", applyRename);
  $("rename-cancel").addEventListener("click", cancelRename);
  $("rename-input").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      applyRename();
    }
  });
  const problemFilter = $("java-problem-filter");
  problemFilter.value = state.java.problemFilter;
  problemFilter.addEventListener("change", () => {
    state.java.problemFilter = PROBLEM_FILTERS.has(problemFilter.value)
      ? problemFilter.value
      : "all";
    try {
      localStorage.setItem(PROBLEM_FILTER_KEY, state.java.problemFilter);
    } catch {
      /* storage can be unavailable; the filter still works for this session */
    }
    renderProblems();
  });
  $("java-clear-problems").addEventListener("click", clearJavaProblems);
  $("ai-connect").addEventListener("click", aiConnect);
  $("ai-refresh").addEventListener("click", aiRefreshSessions);
  $("ai-new-session").addEventListener("click", aiNewSession);
  $("ai-send").addEventListener("click", aiSend);
  $("ai-stop").addEventListener("click", aiStop);
  $("ai-input").addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      aiSend();
    }
  });

  await listen("gradle://output", (event) => {
    const text = event.payload?.text;
    if (typeof text !== "string" || !text) return;
    state.gradleSawOutput = true;
    appendGradleLog(text);
  });
  await listen("opencode://event", (event) => handleAiEvent(event.payload));
  await listen("java://diagnostics", (event) => handleJavaDiagnostics(event.payload));
  await listen("java://event", (event) => {
    const payload = event.payload;
    if (!payload) return;
    if (payload.name === "status") {
      updateJavaStatus(payload.data);
      return;
    }
    if (payload.name === "log" || payload.name === "status-message") {
      const message = payload.data?.message;
      if (message) appendJavaLog(String(message));
      return;
    }
    if (payload.name === "workspace-edit") {
      applyWorkspaceEdits(payload.data)
        .then((count) => setStatus(count ? `Applied edits in ${count} place(s)` : "Server edit made no changes"))
        .catch((error) => showError(String(error)));
      return;
    }
    if (payload.name === "workspace-edit-rejected") {
      const reason = payload.data?.reason || "workspace edit rejected";
      appendJavaLog(reason);
      setStatus(reason);
    }
  });
  renderJava();

  document.addEventListener("keydown", (event) => {
    const paletteOpen = !$("palette").classList.contains("hidden");
    if (event.key === "Escape") {
      if (!$("rename-dialog").classList.contains("hidden")) {
        event.preventDefault();
        cancelRename();
        return;
      }
      if (!$("code-actions").classList.contains("hidden")) {
        event.preventDefault();
        $("code-actions").classList.add("hidden");
        return;
      }
      hideSignature();
      if (paletteOpen) {
        event.preventDefault();
        closePalette();
        return;
      }
    }
    if (paletteOpen && event.key === "ArrowDown") {
      event.preventDefault();
      paletteIndex += 1;
      renderPalette();
      return;
    }
    if (paletteOpen && event.key === "ArrowUp") {
      event.preventDefault();
      paletteIndex = Math.max(0, paletteIndex - 1);
      renderPalette();
      return;
    }
    if (paletteOpen && event.key === "Enter") {
      event.preventDefault();
      runPaletteSelection();
      return;
    }
    const mod = event.metaKey || event.ctrlKey;
    if (mod && event.shiftKey && event.key.toLowerCase() === "p") {
      event.preventDefault();
      openPalette("command");
    } else if (mod && !event.shiftKey && event.key.toLowerCase() === "p") {
      event.preventDefault();
      openPalette("file");
    } else if (mod && event.key === "\\" ) {
      event.preventDefault();
      toggleSplit();
    }
  });
  $("palette-input").addEventListener("input", () => {
    paletteIndex = 0;
    renderPalette();
  });

  try {
    const root = await call("default_workspace");
    await openWorkspace(root);
  } catch (error) {
    setStatus(`No default workspace: ${error}`);
  }

  updateStatusRight();
  loadJavaSettings().catch(() => {});
  if (workspaceTrusted()) aiConnect().catch(() => {});
}

boot();

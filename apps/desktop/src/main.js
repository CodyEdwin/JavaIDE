import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { EditorView, hoverTooltip, keymap } from "@codemirror/view";
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
  },
  ai: {
    connected: false,
    sessions: [],
    session: null,
    streaming: null,
    parts: new Map(),
  },
};

let editor = null;
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

function editorExtensions(path) {
  return [
    basicSetup,
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
    ]),
    EditorView.updateListener.of((update) => {
      if (!update.docChanged || !state.active) return;
      const doc = state.docs.get(state.active);
      if (!doc) return;
      doc.content = update.state.doc.toString();
      if (!doc.dirty) {
        doc.dirty = true;
        renderTabs();
      }
      updateStatusRight();
      javaScheduleChange(state.active);
    }),
  ];
}

function createEditor() {
  editor = new EditorView({
    state: EditorState.create({ doc: "" }),
    parent: $("editor"),
  });
}

function showActiveDocument() {
  const doc = state.active ? state.docs.get(state.active) : null;
  if (!doc) {
    $("welcome").classList.remove("hidden");
    $("editor").classList.add("hidden");
    editor.setState(EditorState.create({ doc: "" }));
    updateStatusRight();
    return;
  }
  $("welcome").classList.add("hidden");
  $("editor").classList.remove("hidden");
  editor.setState(
    EditorState.create({ doc: doc.content, extensions: editorExtensions(doc.path) }),
  );
  // `setState` drops decorations, so re-apply the cached publications for the
  // document that just became visible.
  applyJavaDiagnostics(doc.path);
  updateStatusRight();
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
  if (state.active === path) {
    state.active = [...state.docs.keys()].pop() || null;
  }
  renderTabs();
  showActiveDocument();
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
  if (state.gradleActive) {
    setStatus("Gradle is already running");
    return;
  }
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
      if (result.stdout) appendGradleLog(result.stdout.trimEnd());
      if (result.stderr) appendGradleLog(result.stderr.trimEnd());
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

function javaDocumentOpened(path, text) {
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
  if (!editor || state.active !== path) return;
  const doc = editor.state.doc;
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
  editor.dispatch(setDiagnostics(editor.state, diagnostics));
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
  if (editor) editor.dispatch(setDiagnostics(editor.state, []));
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
  if (!isJavaPath(path) || !javaReady()) return null;
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
    await openAbsoluteFile(
      target.path,
      target.range?.start?.line || 0,
      target.range?.start?.character || 0,
    );
    if (locations.length > 1) setStatus(`${locations.length} definitions available`);
  } catch (error) {
    showError(String(error));
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
  if (!editor) return;
  const at = offsetAt(editor.state.doc, { line, character });
  editor.dispatch({ selection: { anchor: at }, scrollIntoView: true });
  editor.focus();
}

function applyJavaEdits(edits) {
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
  const path = state.active;
  if (!editor || !isJavaPath(path)) return;
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
  // Only render the session the user selected. The service broadcasts events
  // for every session; rendering all of them floods the webview.
  if (!state.ai.session) return;
  const name = payload.name;
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

  $("open-folder").addEventListener("click", async () => {
    const directory = await open({ directory: true, multiple: false, title: "Open workspace" });
    if (directory) await openWorkspace(directory);
  });
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
    }
  });
  renderJava();

  try {
    const root = await call("default_workspace");
    await openWorkspace(root);
  } catch (error) {
    setStatus(`No default workspace: ${error}`);
  }

  updateStatusRight();
  aiConnect().catch(() => {});
}

boot();

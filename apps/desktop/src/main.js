import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { java } from "@codemirror/lang-java";
import { json } from "@codemirror/lang-json";
import { oneDark } from "@codemirror/theme-one-dark";

const $ = (id) => document.getElementById(id);

const GRADLE_SETTINGS_KEY = "javaide.gradle.settings";

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
    keymap.of([
      {
        key: "Mod-s",
        preventDefault: true,
        run: () => {
          saveActive();
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
    $("workspace-path").textContent = view.root;
    $("workspace-path").title = view.root;
    $("gradle-log").textContent = "";
    $("gradle-tests").replaceChildren();
    renderTree();
    renderTabs();
    showActiveDocument();
    renderGradle();
    setStatus(`Workspace: ${view.root}`);
    updateStatusRight();
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

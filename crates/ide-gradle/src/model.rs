//! Typed models returned by the Gradle bridge.

use serde::{Deserialize, Serialize};

/// Result of `initialize`.
#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", default)]
pub struct InitializeResult {
    #[serde(default, deserialize_with = "null_string")]
    pub name: String,
    #[serde(default, deserialize_with = "null_string")]
    pub version: String,
    #[serde(default, deserialize_with = "null_string")]
    pub protocol_version: String,
    pub capabilities: Vec<String>,
    #[serde(default, deserialize_with = "null_string")]
    pub java_version: String,
    #[serde(default, deserialize_with = "null_string")]
    pub java_vendor: String,
    #[serde(default, deserialize_with = "null_string")]
    pub tooling_api_version: String,
}

/// One synchronized build.
#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", default)]
pub struct BuildSnapshot {
    #[serde(default, deserialize_with = "null_string")]
    pub root: String,
    #[serde(default, deserialize_with = "null_string")]
    pub build_name: String,
    #[serde(default, deserialize_with = "null_string")]
    pub gradle_version: String,
    #[serde(default, deserialize_with = "null_string")]
    pub gradle_home: String,
    #[serde(default, deserialize_with = "null_string")]
    pub java_home: String,
    #[serde(default, deserialize_with = "null_string")]
    pub daemon_java_home: String,
    pub synced_at: i64,
    pub projects: Vec<BuildProject>,
    pub included_builds: Vec<IncludedBuild>,
    pub problems: Vec<BuildProblem>,
}

/// One Gradle project.
#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", default)]
pub struct BuildProject {
    #[serde(default, deserialize_with = "null_string")]
    pub path: String,
    #[serde(default, deserialize_with = "null_string")]
    pub name: String,
    #[serde(default, deserialize_with = "null_string")]
    pub directory: String,
    #[serde(default, deserialize_with = "null_string")]
    pub description: String,
    #[serde(default, deserialize_with = "null_string")]
    pub build_file: String,
    #[serde(default, deserialize_with = "null_string")]
    pub java_version: String,
    #[serde(default, deserialize_with = "null_string")]
    pub toolchain: String,
    pub tasks: Vec<GradleTask>,
    pub test_tasks: Vec<GradleTask>,
    pub source_sets: Vec<SourceSet>,
    pub configurations: Vec<Configuration>,
    pub plugins: Vec<String>,
}

/// One executable task.
#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", default)]
pub struct GradleTask {
    #[serde(default, deserialize_with = "null_string")]
    pub path: String,
    #[serde(default, deserialize_with = "null_string")]
    pub name: String,
    #[serde(default, deserialize_with = "null_string")]
    pub group: String,
    #[serde(default, deserialize_with = "null_string")]
    pub description: String,
    #[serde(rename = "type")]
    #[serde(default, deserialize_with = "null_string")]
    pub task_type: String,
    pub is_test: bool,
    pub is_run: bool,
}

/// One source set.
#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", default)]
pub struct SourceSet {
    #[serde(default, deserialize_with = "null_string")]
    pub name: String,
    pub java_dirs: Vec<String>,
    pub resource_dirs: Vec<String>,
    pub output_dirs: Vec<String>,
    pub compile_classpath: Vec<String>,
    pub runtime_classpath: Vec<String>,
    #[serde(default, deserialize_with = "null_string")]
    pub resolution_error: String,
}

/// One configuration.
#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Configuration {
    #[serde(default, deserialize_with = "null_string")]
    pub name: String,
    #[serde(default, deserialize_with = "null_string")]
    pub description: String,
    pub resolvable: bool,
    pub consumable: bool,
    pub visible: bool,
}

/// An included build.
#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", default)]
pub struct IncludedBuild {
    #[serde(default, deserialize_with = "null_string")]
    pub name: String,
    #[serde(default, deserialize_with = "null_string")]
    pub directory: String,
    #[serde(default, deserialize_with = "null_string")]
    pub build_file: String,
}

/// A build problem or warning.
#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", default)]
pub struct BuildProblem {
    #[serde(default, deserialize_with = "null_string")]
    pub severity: String,
    #[serde(default, deserialize_with = "null_string")]
    pub message: String,
    #[serde(default, deserialize_with = "null_string")]
    pub file: String,
    pub line: Option<u32>,
    pub column: Option<u32>,
}

/// Result of `sync`.
#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", default)]
pub struct SyncResult {
    #[serde(default, deserialize_with = "null_string")]
    pub request_id: String,
    pub snapshot: BuildSnapshot,
}

/// One task outcome.
#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", default)]
pub struct TaskOutcome {
    #[serde(default, deserialize_with = "null_string")]
    pub task_path: String,
    #[serde(default, deserialize_with = "null_string")]
    pub display_name: String,
    #[serde(default, deserialize_with = "null_string")]
    pub outcome: String,
    pub start_time: i64,
    pub end_time: i64,
    pub duration_ms: i64,
    pub failures: Vec<String>,
}

/// Result of `runTask`.
#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", default)]
pub struct RunTaskResult {
    #[serde(default, deserialize_with = "null_string")]
    pub request_id: String,
    pub cancelled: bool,
    pub timed_out: bool,
    pub failed: bool,
    pub duration_ms: i64,
    pub task_outcomes: Vec<TaskOutcome>,
    pub failures: Vec<String>,
    #[serde(default, deserialize_with = "null_string")]
    pub stdout: String,
    #[serde(default, deserialize_with = "null_string")]
    pub stderr: String,
}

/// A discovered test class.
#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", default)]
pub struct TestClass {
    #[serde(default, deserialize_with = "null_string")]
    pub id: String,
    #[serde(default, deserialize_with = "null_string")]
    pub project_path: String,
    #[serde(default, deserialize_with = "null_string")]
    pub task_path: String,
    #[serde(default, deserialize_with = "null_string")]
    pub class_name: String,
    #[serde(default, deserialize_with = "null_string")]
    pub display_name: String,
    #[serde(default, deserialize_with = "null_string")]
    pub framework: String,
    #[serde(default, deserialize_with = "null_string")]
    pub source_file: String,
    #[serde(default, deserialize_with = "null_string")]
    pub source_path: String,
    pub nested: bool,
    pub methods: Vec<TestMethod>,
}

/// A discovered test method.
#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", default)]
pub struct TestMethod {
    #[serde(default, deserialize_with = "null_string")]
    pub id: String,
    #[serde(default, deserialize_with = "null_string")]
    pub name: String,
    #[serde(default, deserialize_with = "null_string")]
    pub display_name: String,
    pub line: Option<u32>,
    #[serde(default, deserialize_with = "null_string")]
    pub kind: String,
    pub has_parameters: bool,
    pub disabled: bool,
}

/// Result of `listTests`.
#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", default)]
pub struct TestListing {
    #[serde(default, deserialize_with = "null_string")]
    pub request_id: String,
    #[serde(default, deserialize_with = "null_string")]
    pub project_path: String,
    #[serde(default, deserialize_with = "null_string")]
    pub task_path: String,
    pub compiled: bool,
    pub compile_failed: bool,
    #[serde(default, deserialize_with = "null_string")]
    pub compile_output: String,
    pub tests: Vec<TestClass>,
    pub warnings: Vec<String>,
}

/// One test event or result.
#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", default)]
pub struct TestResult {
    #[serde(default, deserialize_with = "null_string")]
    pub id: String,
    #[serde(default, deserialize_with = "null_string")]
    pub name: String,
    #[serde(default, deserialize_with = "null_string")]
    pub display_name: String,
    pub class_name: Option<String>,
    pub method_name: Option<String>,
    pub suite_name: Option<String>,
    #[serde(default, deserialize_with = "null_string")]
    pub kind: String,
    pub atomic: bool,
    #[serde(default, deserialize_with = "null_string")]
    pub state: String,
    pub duration_ms: i64,
    pub failures: Vec<String>,
}

/// Debug listener information returned by `runTests`.
#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", default)]
pub struct DebugInfo {
    #[serde(default, deserialize_with = "null_string")]
    pub host: String,
    pub port: u16,
    pub suspend: bool,
}

/// Result of `runTests`.
#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", default)]
pub struct RunTestsResult {
    #[serde(default, deserialize_with = "null_string")]
    pub request_id: String,
    #[serde(default, deserialize_with = "null_string")]
    pub project_path: String,
    #[serde(default, deserialize_with = "null_string")]
    pub task_path: String,
    pub cancelled: bool,
    pub timed_out: bool,
    pub failed: bool,
    pub duration_ms: i64,
    pub tests: Vec<TestResult>,
    pub task_outcomes: Vec<TaskOutcome>,
    pub failures: Vec<String>,
    #[serde(default, deserialize_with = "null_string")]
    pub stdout: String,
    #[serde(default, deserialize_with = "null_string")]
    pub stderr: String,
    pub debug: Option<DebugInfo>,
}

/// Result of `resolveClasspath`.
#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", default)]
pub struct ClasspathResult {
    #[serde(default, deserialize_with = "null_string")]
    pub request_id: String,
    #[serde(default, deserialize_with = "null_string")]
    pub project_path: String,
    #[serde(default, deserialize_with = "null_string")]
    pub source_set: String,
    pub compile_classpath: Vec<String>,
    pub runtime_classpath: Vec<String>,
    pub output_dirs: Vec<String>,
    #[serde(default, deserialize_with = "null_string")]
    pub resolution_error: String,
}

/// Result of `dependencyReport`.
#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", default)]
pub struct DependencyReportResult {
    #[serde(default, deserialize_with = "null_string")]
    pub request_id: String,
    pub report: DependencyReport,
}

/// A resolved configuration graph.
#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", default)]
pub struct DependencyReport {
    #[serde(default, deserialize_with = "null_string")]
    pub project_path: String,
    #[serde(default, deserialize_with = "null_string")]
    pub configuration: String,
    pub roots: Vec<DependencyEdge>,
    pub artifacts: Vec<DependencyArtifact>,
    pub problems: Vec<BuildProblem>,
}

/// One dependency occurrence.
#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", default)]
pub struct DependencyEdge {
    pub group: Option<String>,
    pub module: Option<String>,
    pub version: Option<String>,
    #[serde(default, deserialize_with = "null_string")]
    pub requested: String,
    pub resolved: Option<String>,
    pub component_id: Option<String>,
    pub conflict: bool,
    pub constraint: bool,
    pub cycle: bool,
    pub failed: bool,
    pub failure_message: Option<String>,
    pub selection_reason: Option<String>,
    pub children: Vec<DependencyEdge>,
}

/// One resolved artifact.
#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", default)]
pub struct DependencyArtifact {
    pub group: Option<String>,
    pub module: Option<String>,
    pub version: Option<String>,
    #[serde(default, deserialize_with = "null_string")]
    pub component_id: String,
    #[serde(default, deserialize_with = "null_string")]
    pub file: String,
}

fn null_string<'de, D>(deserializer: D) -> Result<String, D::Error>
where
    D: serde::Deserializer<'de>,
{
    Ok(Option::<String>::deserialize(deserializer)?.unwrap_or_default())
}

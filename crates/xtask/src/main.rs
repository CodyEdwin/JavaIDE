//! Workspace maintenance commands.
//!
//! `cargo run -p xtask -- check-architecture` compares Cargo dependency edges
//! against the allowlist in this file. The desktop shell is still the
//! composition root, so it may depend on the adapters. It must not depend on
//! `ide-jsonrpc` directly: protocol types stay inside their adapter crates.

use std::collections::{BTreeMap, BTreeSet};
use std::process::Command;

use anyhow::{Context, bail};
use serde_json::Value;

/// Workspace crate edges that are allowed to exist.
///
/// A crate missing from this map, or an edge that is not listed, fails the
/// check. Update [ARCHITECTURE.md](../../../docs/ARCHITECTURE.md) in the same
/// change as a new edge.
const ALLOWED: &[(&str, &[&str])] = &[
    ("ide-config", &[]),
    ("ide-app", &["ide-context", "ide-domain", "ide-editor", "ide-workspace"]),
    ("ide-context", &["ide-domain", "ide-editor"]),
    ("ide-domain", &[]),
    ("ide-editor", &["ide-domain"]),
    ("ide-gradle", &["ide-jsonrpc", "ide-platform"]),
    ("ide-jdtls", &["ide-jsonrpc", "ide-platform"]),
    ("ide-jsonrpc", &[]),
    ("ide-opencode", &["ide-platform"]),
    ("ide-ui-api", &["ide-domain"]),
    ("ide-workspace", &["ide-domain", "ide-editor", "ide-platform"]),
    (
        "ide-phase0",
        &["ide-gradle", "ide-jdtls", "ide-opencode", "ide-platform"],
    ),
    ("ide-platform", &[]),
    (
        "javaide-desktop",
        &[
            "ide-config",
            "ide-gradle",
            "ide-jdtls",
            "ide-opencode",
            "ide-platform",
            "ide-ui-api",
        ],
    ),
    ("xtask", &[]),
];

/// Edges that must never appear, even if someone adds them to the allowlist
/// by mistake. The comment says why.
const FORBIDDEN: &[(&str, &str, &str)] = &[
    (
        "javaide-desktop",
        "ide-jsonrpc",
        "the UI shell must not depend on the JSON-RPC crate",
    ),
    (
        "ide-config",
        "ide-jdtls",
        "settings must not depend on a language adapter",
    ),
    (
        "ide-config",
        "ide-gradle",
        "settings must not depend on the Gradle adapter",
    ),
    ("ide-gradle", "ide-jdtls", "Gradle must not depend on jdtls"),
    (
        "ide-jdtls",
        "ide-gradle",
        "jdtls must not depend on the Gradle adapter",
    ),
];

fn main() -> anyhow::Result<()> {
    match std::env::args().nth(1).as_deref() {
        Some("check-architecture") => check_architecture(),
        Some(other) => bail!("unknown xtask command: {other}"),
        None => bail!("usage: cargo run -p xtask -- check-architecture"),
    }
}

fn check_architecture() -> anyhow::Result<()> {
    let metadata = cargo_metadata()?;
    let members = workspace_members(&metadata)?;
    let mut allowed: BTreeMap<&str, BTreeSet<&str>> = BTreeMap::new();
    for (crate_name, deps) in ALLOWED {
        allowed.insert(crate_name, deps.iter().copied().collect());
    }

    let mut errors = Vec::new();
    for name in &members {
        if !allowed.contains_key(name.as_str()) {
            errors.push(format!(
                "{name} is a workspace member with no architecture allowlist entry"
            ));
        }
    }

    let packages = metadata
        .get("packages")
        .and_then(Value::as_array)
        .context("cargo metadata has no packages")?;
    let mut edges: BTreeMap<String, BTreeSet<String>> = BTreeMap::new();
    for package in packages {
        let Some(name) = package.get("name").and_then(Value::as_str) else {
            continue;
        };
        if !members.contains(name) {
            continue;
        }
        let deps = edges.entry(name.to_owned()).or_default();
        let Some(dependencies) = package.get("dependencies").and_then(Value::as_array) else {
            continue;
        };
        for dependency in dependencies {
            let Some(dep_name) = dependency.get("name").and_then(Value::as_str) else {
                continue;
            };
            if !members.contains(dep_name) {
                continue;
            }
            let kind = dependency
                .get("kind")
                .and_then(Value::as_str)
                .unwrap_or("normal");
            if kind == "dev" {
                errors.push(format!(
                    "{name} has a dev-dependency on {dep_name}; dev-only workspace edges are not allowed yet"
                ));
            }
            deps.insert(dep_name.to_owned());
            let permitted = allowed.get(name).is_some_and(|set| set.contains(dep_name));
            if !permitted {
                errors.push(format!(
                    "{name} depends on {dep_name}, which is not in the architecture allowlist"
                ));
            }
        }
    }

    for (from, to, reason) in FORBIDDEN {
        if edges.get(*from).is_some_and(|deps| deps.contains(*to)) {
            errors.push(format!("forbidden edge {from} -> {to}: {reason}"));
        }
    }

    if let Some(cycle) = find_cycle(&edges) {
        errors.push(format!("dependency cycle: {}", cycle.join(" -> ")));
    }

    if errors.is_empty() {
        println!(
            "architecture check passed ({} workspace crates)",
            members.len()
        );
        Ok(())
    } else {
        for error in &errors {
            eprintln!("architecture: {error}");
        }
        bail!("{} architecture violation(s)", errors.len())
    }
}

fn cargo_metadata() -> anyhow::Result<Value> {
    let output = Command::new("cargo")
        .args(["metadata", "--no-deps", "--format-version", "1"])
        .output()
        .context("failed to run cargo metadata")?;
    if !output.status.success() {
        bail!(
            "cargo metadata failed: {}",
            String::from_utf8_lossy(&output.stderr)
        );
    }
    serde_json::from_slice(&output.stdout).context("cargo metadata was not JSON")
}

fn workspace_members(metadata: &Value) -> anyhow::Result<BTreeSet<String>> {
    let ids = metadata
        .get("workspace_members")
        .and_then(Value::as_array)
        .context("cargo metadata has no workspace_members")?;
    let packages = metadata
        .get("packages")
        .and_then(Value::as_array)
        .context("cargo metadata has no packages")?;
    let mut members = BTreeSet::new();
    for id in ids {
        let Some(id) = id.as_str() else { continue };
        let name = packages.iter().find_map(|package| {
            (package.get("id").and_then(Value::as_str) == Some(id))
                .then(|| package.get("name").and_then(Value::as_str))
                .flatten()
        });
        let Some(name) = name else {
            bail!("workspace member {id} has no package entry");
        };
        members.insert(name.to_owned());
    }
    Ok(members)
}

fn find_cycle(edges: &BTreeMap<String, BTreeSet<String>>) -> Option<Vec<String>> {
    let mut visiting = BTreeSet::new();
    let mut visited = BTreeSet::new();
    let mut stack = Vec::new();
    for node in edges.keys() {
        if let Some(cycle) = visit(node, edges, &mut visiting, &mut visited, &mut stack) {
            return Some(cycle);
        }
    }
    None
}

fn visit(
    node: &str,
    edges: &BTreeMap<String, BTreeSet<String>>,
    visiting: &mut BTreeSet<String>,
    visited: &mut BTreeSet<String>,
    stack: &mut Vec<String>,
) -> Option<Vec<String>> {
    if visited.contains(node) {
        return None;
    }
    if !visiting.insert(node.to_owned()) {
        let start = stack.iter().position(|item| item == node).unwrap_or(0);
        let mut cycle = stack[start..].to_vec();
        cycle.push(node.to_owned());
        return Some(cycle);
    }
    stack.push(node.to_owned());
    if let Some(deps) = edges.get(node) {
        for dep in deps {
            if let Some(cycle) = visit(dep, edges, visiting, visited, stack) {
                return Some(cycle);
            }
        }
    }
    stack.pop();
    visiting.remove(node);
    visited.insert(node.to_owned());
    None
}

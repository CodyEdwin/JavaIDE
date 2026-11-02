//! File tree index: directory listing and filtering.
//!
//! Provides a snapshot of the workspace file tree with optional filtering
//! of build output and hidden directories.

use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};

/// One entry in the file tree.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct FileEntry {
    /// Relative path from the workspace root.
    pub relative_path: PathBuf,
    /// File name.
    pub name: String,
    /// Whether this is a directory.
    pub is_dir: bool,
    /// Depth from the workspace root.
    pub depth: usize,
}

/// A snapshot of the workspace file tree.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct FileTree {
    entries: Vec<FileEntry>,
    max_depth: usize,
    max_entries: usize,
}

impl FileTree {
    /// Creates a new file tree with default limits.
    #[must_use]
    pub fn new() -> Self {
        Self {
            entries: Vec::new(),
            max_depth: 10,
            max_entries: 4000,
        }
    }

    /// Builds a file tree by walking `root`.
    pub fn build(&mut self, root: &Path) {
        self.entries.clear();
        self.collect_entries(root, root, 0);
        self.entries.sort_by(|a, b| {
            b.is_dir.cmp(&a.is_dir).then_with(|| {
                a.relative_path
                    .cmp(&b.relative_path)
            })
        });
    }

    /// Returns all entries.
    #[must_use]
    pub const fn entries(&self) -> &[FileEntry] {
        &self.entries
    }

    /// Returns entries that are directories.
    #[must_use]
    pub fn directories(&self) -> Vec<&FileEntry> {
        self.entries.iter().filter(|e| e.is_dir).collect()
    }

    /// Returns entries that are files.
    #[must_use]
    pub fn files(&self) -> Vec<&FileEntry> {
        self.entries.iter().filter(|e| !e.is_dir).collect()
    }

    fn collect_entries(&mut self, root: &Path, directory: &Path, depth: usize) {
        if depth > self.max_depth || self.entries.len() >= self.max_entries {
            return;
        }
        let Ok(entries) = std::fs::read_dir(directory) else {
            return;
        };
        let mut entries: Vec<_> = entries.filter_map(Result::ok).collect();
        entries.sort_by_key(|e| e.file_name());
        for entry in entries {
            if self.entries.len() >= self.max_entries {
                return;
            }
            let name = entry.file_name();
            let name_str = name.to_string_lossy();
            if name_str.starts_with('.') || Self::is_skipped(&name_str) {
                continue;
            }
            let path = entry.path();
            let Ok(relative) = path.strip_prefix(root) else {
                continue;
            };
            let Ok(kind) = entry.file_type() else {
                continue;
            };
            let is_dir = kind.is_dir();
            self.entries.push(FileEntry {
                relative_path: relative.to_path_buf(),
                name: name_str.to_string(),
                is_dir,
                depth,
            });
            if is_dir {
                self.collect_entries(root, &path, depth + 1);
            }
        }
    }

    fn is_skipped(name: &str) -> bool {
        matches!(
            name,
            "build" | "out" | "bin" | "target" | "node_modules" | "dist" | ".gradle"
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builds_file_tree() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::create_dir_all(dir.path().join("src")).unwrap();
        std::fs::write(dir.path().join("src").join("A.java"), "class A {}").unwrap();
        std::fs::write(dir.path().join("B.java"), "class B {}").unwrap();
        std::fs::create_dir_all(dir.path().join("build")).unwrap();
        std::fs::write(dir.path().join("build").join("out.txt"), "x").unwrap();

        let mut tree = FileTree::new();
        tree.build(dir.path());
        let files: Vec<&str> = tree
            .files()
            .iter()
            .map(|e| e.name.as_str())
            .collect();
        assert!(files.contains(&"A.java"));
        assert!(files.contains(&"B.java"));
        assert!(!files.contains(&"out.txt")); // build/ is skipped
    }
}

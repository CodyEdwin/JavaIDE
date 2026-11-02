//! Tree-sitter syntax tree integration.
//!
//! Wraps a tree-sitter parse tree and provides node queries for the editor.
//! The tree is kept in sync with the buffer via incremental edits.

use std::ops::Range;

use ide_domain::{ByteOffset, TextRange};
use serde::{Deserialize, Serialize};
use tree_sitter::{Node, Tree};

/// A parsed syntax tree for a document.
pub struct SyntaxTree {
    tree: Tree,
}

impl SyntaxTree {
    /// Creates a syntax tree from a tree-sitter tree.
    #[must_use]
    pub fn new(tree: Tree) -> Self {
        Self { tree }
    }

    /// Returns the root node.
    #[must_use]
    pub const fn root_node(&self) -> SyntaxNode {
        SyntaxNode::new(self.tree.root_node())
    }

    /// Returns the underlying tree-sitter tree.
    #[must_use]
    pub const fn tree(&self) -> &Tree {
        &self.tree
    }

    /// Finds the smallest node containing the given byte range.
    #[must_use]
    pub fn node_for_range(&self, range: TextRange) -> Option<SyntaxNode> {
        let node = self.root_node();
        node.descendant_for_byte_range(range.start.get(), range.end.get())
    }
}

/// A node in the syntax tree.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SyntaxNode {
    node: Node,
}

impl SyntaxNode {
    fn new(node: Node) -> Self {
        Self { node }
    }

    /// Returns the node type (e.g. "method_declaration", "class_declaration").
    #[must_use]
    pub const fn kind(&self) -> &str {
        self.node.kind()
    }

    /// Returns the byte range of the node.
    #[must_use]
    pub const fn byte_range(&self) -> Range<usize> {
        self.node.byte_range()
    }

    /// Returns the node's range as a [`TextRange`].
    #[must_use]
    pub const fn text_range(&self) -> TextRange {
        let r = self.node.byte_range();
        TextRange::new(ByteOffset::new(r.start), ByteOffset::new(r.end))
    }

    /// Returns whether the node is named (has a grammar name, not anonymous).
    #[must_use]
    pub const fn is_named(&self) -> bool {
        self.node.is_named()
    }

    /// Returns the number of child nodes.
    #[must_use]
    pub const fn child_count(&self) -> u32 {
        self.node.child_count()
    }

    /// Returns the child at `index`, or `None` if out of range.
    #[must_use]
    pub fn child(&self, index: u32) -> Option<SyntaxNode> {
        self.node.child(index).map(SyntaxNode::new)
    }

    /// Returns the parent node, or `None` if this is the root.
    #[must_use]
    pub fn parent(&self) -> Option<SyntaxNode> {
        self.node.parent().map(SyntaxNode::new)
    }

    /// Finds the smallest named descendant containing the given byte range.
    #[must_use]
    pub fn descendant_for_byte_range(&self, start: usize, end: usize) -> Option<SyntaxNode> {
        self.node
            .descendant_for_byte_range(start, end)
            .map(SyntaxNode::new)
    }

    /// Returns the underlying tree-sitter node.
    #[must_use]
    pub const fn node(&self) -> Node {
        self.node
    }
}

impl Serialize for SyntaxNode {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let r = self.node.byte_range();
        serializer.serialize_str(&format!("{} @ {}..{}", self.node.kind(), r.start, r.end))
    }
}

impl<'de> Deserialize<'de> for SyntaxNode {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        // Syntax nodes are not deserializable directly; they must be re-parsed.
        let _ = deserializer;
        Err(serde::de::Error::custom("SyntaxNode cannot be deserialized"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn text_range_conversion() {
        // Can't easily construct a SyntaxNode without a parser, so just test
        // the TextRange math.
        let range = TextRange::new(ByteOffset::new(0), ByteOffset::new(10));
        let r: Range<usize> = range.start.get()..range.end.get();
        assert_eq!(r, 0..10);
    }
}

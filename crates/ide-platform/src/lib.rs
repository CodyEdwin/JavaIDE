//! Host platform primitives shared by adapters.
//!
//! This crate owns the operations that must behave consistently across Linux,
//! macOS, and Windows:
//!
//! - spawning child processes without a shell, with bounded stdio handling;
//! - reserving and probing loopback ports;
//! - locating the user's home and state directories.
//!
//! It intentionally contains no protocol knowledge. jdtls, the Gradle sidecar,
//! OpenCode, and the debugger all build on these primitives.

#![deny(missing_docs)]
#![deny(rustdoc::broken_intra_doc_links)]

mod child;
mod paths;
mod port;

pub use child::{IoMode, ManagedChild, ProcessSpec};
pub use paths::{config_home, state_home, user_home};
pub use port::{ReservedPort, allocate_loopback_port, wait_for_tcp};

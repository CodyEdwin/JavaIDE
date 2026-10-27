//! Child-process spawning with explicit stdio and no shell.
//!
//! Arguments are passed as an array; a command is never assembled into a shell
//! string. Standard input, output, and error default to piped so protocol
//! streams are never mixed with diagnostics. Callers that do not read a piped
//! stream should either drain it in a task or set that stream to
//! [`IoMode::Inherit`] / [`IoMode::Null`]; otherwise a chatty child can block
//! on a full pipe.

use std::ffi::OsString;
use std::io;
use std::path::{Path, PathBuf};
use std::process::{ExitStatus, Stdio};
use std::time::Duration;

use tokio::process::{Child, ChildStderr, ChildStdin, ChildStdout};

/// How a child's standard stream is connected.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum IoMode {
    /// The parent owns the pipe. Default.
    #[default]
    Piped,
    /// The stream is connected to the parent's stream.
    Inherit,
    /// The stream is connected to the null device.
    Null,
}

impl IoMode {
    fn to_stdio(self) -> Stdio {
        match self {
            Self::Piped => Stdio::piped(),
            Self::Inherit => Stdio::inherit(),
            Self::Null => Stdio::null(),
        }
    }
}

/// A child process specification.
///
/// ```
/// use ide_platform::{IoMode, ProcessSpec};
///
/// let spec = ProcessSpec::new("/bin/echo")
///     .arg("hello")
///     .stdout(IoMode::Piped)
///     .stderr(IoMode::Piped);
/// # let _ = spec;
/// ```
#[derive(Debug, Clone)]
pub struct ProcessSpec {
    program: PathBuf,
    args: Vec<OsString>,
    cwd: Option<PathBuf>,
    env: Vec<(OsString, OsString)>,
    env_remove: Vec<OsString>,
    stdin: IoMode,
    stdout: IoMode,
    stderr: IoMode,
    kill_on_drop: bool,
    label: Option<String>,
}

impl ProcessSpec {
    /// Creates a specification with piped stdio and kill-on-drop enabled.
    #[must_use]
    pub fn new(program: impl Into<PathBuf>) -> Self {
        Self {
            program: program.into(),
            args: Vec::new(),
            cwd: None,
            env: Vec::new(),
            env_remove: Vec::new(),
            stdin: IoMode::Piped,
            stdout: IoMode::Piped,
            stderr: IoMode::Piped,
            kill_on_drop: true,
            label: None,
        }
    }

    /// Appends one argument.
    #[must_use]
    pub fn arg(mut self, arg: impl Into<OsString>) -> Self {
        self.args.push(arg.into());
        self
    }

    /// Appends several arguments.
    #[must_use]
    pub fn args<I, S>(mut self, args: I) -> Self
    where
        I: IntoIterator<Item = S>,
        S: Into<OsString>,
    {
        self.args.extend(args.into_iter().map(Into::into));
        self
    }

    /// Sets the working directory.
    #[must_use]
    pub fn current_dir(mut self, directory: impl Into<PathBuf>) -> Self {
        self.cwd = Some(directory.into());
        self
    }

    /// Adds or replaces an environment variable for the child.
    #[must_use]
    pub fn env(mut self, key: impl Into<OsString>, value: impl Into<OsString>) -> Self {
        self.env.push((key.into(), value.into()));
        self
    }

    /// Removes an inherited environment variable from the child.
    #[must_use]
    pub fn env_remove(mut self, key: impl Into<OsString>) -> Self {
        self.env_remove.push(key.into());
        self
    }

    /// Configures standard input.
    #[must_use]
    pub const fn stdin(mut self, mode: IoMode) -> Self {
        self.stdin = mode;
        self
    }

    /// Configures standard output.
    #[must_use]
    pub const fn stdout(mut self, mode: IoMode) -> Self {
        self.stdout = mode;
        self
    }

    /// Configures standard error.
    #[must_use]
    pub const fn stderr(mut self, mode: IoMode) -> Self {
        self.stderr = mode;
        self
    }

    /// Sets whether the child is killed if the handle is dropped.
    ///
    /// Defaults to `true`. Disable only for processes whose lifetime outlives
    /// the IDE, which should be rare and explicit.
    #[must_use]
    pub const fn kill_on_drop(mut self, enabled: bool) -> Self {
        self.kill_on_drop = enabled;
        self
    }

    /// Sets a human-readable label used in logs.
    #[must_use]
    pub fn label(mut self, label: impl Into<String>) -> Self {
        self.label = Some(label.into());
        self
    }

    /// Returns the program path.
    #[must_use]
    pub fn program(&self) -> &Path {
        &self.program
    }

    /// Spawns the child.
    ///
    /// # Errors
    ///
    /// Returns the operating system error when the program cannot be found or
    /// executed.
    pub fn spawn(&self) -> io::Result<ManagedChild> {
        let mut command = tokio::process::Command::new(&self.program);
        command
            .args(&self.args)
            .stdin(self.stdin.to_stdio())
            .stdout(self.stdout.to_stdio())
            .stderr(self.stderr.to_stdio())
            .kill_on_drop(self.kill_on_drop);
        if let Some(directory) = &self.cwd {
            command.current_dir(directory);
        }
        for (key, value) in &self.env {
            command.env(key, value);
        }
        for key in &self.env_remove {
            command.env_remove(key);
        }

        // Give the child its own process group on Unix so a future
        // terminate-group operation can reach JVMs it starts. This call is
        // safe and does not require `pre_exec`.
        #[cfg(unix)]
        {
            use std::os::unix::process::CommandExt;
            command.as_std_mut().process_group(0);
        }

        let child = command.spawn()?;
        let label = self
            .label
            .clone()
            .unwrap_or_else(|| self.program.display().to_string());
        tracing::debug!(
            label = %label,
            program = %self.program.display(),
            pid = child.id(),
            "spawned child process"
        );
        Ok(ManagedChild { child, label })
    }
}

/// A spawned child process.
///
/// The handle owns the child. With kill-on-drop enabled (the default), dropping
/// the handle kills the child, but does not wait for it to exit; use
/// [`ManagedChild::kill`] or [`ManagedChild::wait_or_kill`] for deterministic
/// cleanup in tests and shutdown paths.
pub struct ManagedChild {
    child: Child,
    label: String,
}

impl std::fmt::Debug for ManagedChild {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter
            .debug_struct("ManagedChild")
            .field("label", &self.label)
            .field("pid", &self.child.id())
            .finish_non_exhaustive()
    }
}

impl ManagedChild {
    /// Returns the operating-system process id while the child is running.
    #[must_use]
    pub fn id(&self) -> Option<u32> {
        self.child.id()
    }

    /// Returns the log label chosen at spawn time.
    #[must_use]
    pub fn label(&self) -> &str {
        &self.label
    }

    /// Takes the child's standard input.
    pub fn take_stdin(&mut self) -> Option<ChildStdin> {
        self.child.stdin.take()
    }

    /// Takes the child's standard output.
    pub fn take_stdout(&mut self) -> Option<ChildStdout> {
        self.child.stdout.take()
    }

    /// Takes the child's standard error.
    pub fn take_stderr(&mut self) -> Option<ChildStderr> {
        self.child.stderr.take()
    }

    /// Returns the exit status if the child has already exited.
    ///
    /// # Errors
    ///
    /// Returns an operating system error if the status cannot be queried.
    pub fn try_wait(&mut self) -> io::Result<Option<ExitStatus>> {
        self.child.try_wait()
    }

    /// Waits for the child to exit.
    ///
    /// # Errors
    ///
    /// Returns an operating system error if waiting fails.
    pub async fn wait(&mut self) -> io::Result<ExitStatus> {
        self.child.wait().await
    }

    /// Kills the child and reaps it.
    ///
    /// This sends `SIGKILL` on Unix and terminates the process on Windows. A
    /// graceful protocol shutdown must be attempted first by the adapter that
    /// owns the child.
    ///
    /// # Errors
    ///
    /// Returns an operating system error if the child cannot be killed or
    /// reaped. An already-exited child is not an error.
    pub async fn kill(&mut self) -> io::Result<()> {
        match self.child.start_kill() {
            Ok(()) => {}
            Err(error) if error.kind() == io::ErrorKind::InvalidInput => {
                // The process already exited.
            }
            Err(error) => return Err(error),
        }
        let _ = self.child.wait().await?;
        Ok(())
    }

    /// Waits up to `grace` for a voluntary exit, then kills the child.
    ///
    /// Returns the exit status when it was observed, or `None` if the child had
    /// to be killed and its status could not be collected afterwards.
    ///
    /// # Errors
    ///
    /// Returns an operating system error if waiting or killing fails.
    pub async fn wait_or_kill(&mut self, grace: Duration) -> io::Result<Option<ExitStatus>> {
        if let Some(status) = self.try_wait()? {
            return Ok(Some(status));
        }
        match tokio::time::timeout(grace, self.child.wait()).await {
            Ok(result) => result.map(Some),
            Err(_) => {
                tracing::warn!(label = %self.label, "child did not exit within grace period; killing");
                self.kill().await?;
                Ok(self.child.try_wait()?)
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use tokio::io::AsyncReadExt;

    use super::*;

    #[cfg(unix)]
    #[tokio::test]
    async fn captures_stdout_and_status() {
        let mut child = ProcessSpec::new("/bin/sh")
            .arg("-c")
            .arg("printf 'hello'")
            .spawn()
            .unwrap();
        let mut stdout = child.take_stdout().expect("stdout is piped");
        let mut output = String::new();
        stdout.read_to_string(&mut output).await.unwrap();
        let status = child.wait().await.unwrap();
        assert!(status.success());
        assert_eq!(output, "hello");
    }

    #[cfg(unix)]
    #[tokio::test]
    async fn kill_reaps_child() {
        let mut child = ProcessSpec::new("/bin/sh")
            .arg("-c")
            .arg("sleep 30")
            .spawn()
            .unwrap();
        child.kill().await.unwrap();
        assert!(child.try_wait().unwrap().is_some());
    }

    #[cfg(unix)]
    #[tokio::test]
    async fn wait_or_kill_enforces_the_deadline() {
        let mut child = ProcessSpec::new("/bin/sh")
            .arg("-c")
            .arg("sleep 30")
            .spawn()
            .unwrap();
        let started = std::time::Instant::now();
        let status = child.wait_or_kill(Duration::from_millis(50)).await.unwrap();
        assert!(started.elapsed() < Duration::from_secs(5));
        assert!(status.is_none() || !status.unwrap().success());
    }
}

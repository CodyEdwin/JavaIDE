//! Phase 0 integration harness.
//!
//! This binary is a spike and diagnostic tool, not the application. It proves
//! the adapters against real processes and prints evidence that goes into
//! `docs/PHASE0_REPORT.md`:
//!
//! - `opencode`: discover the V2 service, verify `/api/info`, list sessions,
//!   optionally create one, observe SSE, and optionally attach client-MCP.
//! - `jdtls`: copy a fixture workspace, launch jdtls, open clean and broken
//!   Java files, print diagnostics, and shut down.
//!
//! The harness never prints prompts, file contents, permissions, or auth data.

use std::path::{Path, PathBuf};
use std::time::Duration;

use anyhow::{Context, Result, bail};
use clap::{Args, Parser, Subcommand};
use ide_gradle::{
    DebugOptions, GradleClient, GradleEvent, GradleOptions, RunTaskRequest, RunTestsRequest,
    TestRef,
};
use ide_jdtls::{JdtlsClient, JdtlsConfig, JdtlsInstallation};
use ide_opencode::{CreateSession, DiscoveredService, OpenCodeClient, PromptInput};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;
use tracing_subscriber::EnvFilter;

#[derive(Debug, Parser)]
#[command(version, about = "JavaIDE Phase 0 integration harness")]
struct Cli {
    /// Enable adapter logs (for example `ide_jdtls=debug`).
    #[arg(long, env = "RUST_LOG", default_value = "info")]
    log: String,
    #[command(subcommand)]
    command: Command,
}

#[derive(Debug, Subcommand)]
enum Command {
    /// Validate discovery, HTTP, SSE, and client-MCP against the running service.
    Opencode(OpenCodeArgs),
    /// Validate jdtls startup, document open, and diagnostics.
    Jdtls(JdtlsArgs),
    /// Validate the Gradle bridge: sync, tasks, tests, debug, classpath, deps.
    Gradle(GradleArgs),
}

#[derive(Debug, Args)]
struct OpenCodeArgs {
    /// Workspace directory used for session filtering and the MCP location.
    #[arg(long, default_value = ".")]
    workspace: PathBuf,
    /// Create a session in this workspace (leaves it in OpenCode history).
    #[arg(long)]
    create_session: bool,
    /// Send a text prompt; implies session creation/reuse. Costs model tokens.
    #[arg(long)]
    prompt: Option<String>,
    /// Attach the client-MCP WebSocket and print the first inbound method name.
    #[arg(long)]
    attach_mcp: bool,
    /// Seconds to listen for SSE events.
    #[arg(long, default_value_t = 3)]
    listen_secs: u64,
}

#[derive(Debug, Args)]
struct JdtlsArgs {
    /// Extracted jdtls distribution root (contains `plugins/`).
    #[arg(long)]
    jdtls_root: PathBuf,
    /// JDK 21+ used to run jdtls.
    #[arg(long)]
    java_home: PathBuf,
    /// Fixture workspace to copy and open.
    #[arg(long, default_value = "fixtures/java-gradle")]
    workspace: PathBuf,
    /// Optional persistent working directory. Defaults to a temporary directory.
    #[arg(long)]
    workdir: Option<PathBuf>,
    /// Seconds to wait for diagnostics for each file.
    #[arg(long, default_value_t = 60)]
    diagnostics_timeout: u64,
}

#[derive(Debug, Args)]
struct GradleArgs {
    /// Installed `gradle-bridge` launcher.
    #[arg(
        long,
        default_value = "sidecar/gradle-bridge/build/install/gradle-bridge/bin/gradle-bridge"
    )]
    bridge: PathBuf,
    /// Gradle project to exercise. Copied to a temporary directory unless `--workdir` is set.
    #[arg(long, default_value = "fixtures/java-gradle")]
    workspace: PathBuf,
    /// Persistent working directory. Used as-is when supplied.
    #[arg(long)]
    workdir: Option<PathBuf>,
    /// JDK used for the sidecar and Gradle.
    #[arg(long, default_value = "/usr/lib/jvm/temurin-21")]
    java_home: PathBuf,
    /// Run the debug test pass with a JDWP handshake and Resume.
    #[arg(long)]
    debug: bool,
    /// JDWP port for the debug pass. A fixed high port avoids racing Gradle's
    /// ephemeral worker-control ports.
    #[arg(long, default_value_t = 5005)]
    debug_port: u16,
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();
    let filter = EnvFilter::try_new(&cli.log).context("invalid RUST_LOG filter")?;
    tracing_subscriber::fmt()
        .with_env_filter(filter)
        .with_target(false)
        .compact()
        .init();

    match cli.command {
        Command::Opencode(args) => run_opencode(args).await,
        Command::Jdtls(args) => run_jdtls(args).await,
        Command::Gradle(args) => run_gradle(args).await,
    }
}

async fn run_opencode(args: OpenCodeArgs) -> Result<()> {
    let workspace = args
        .workspace
        .canonicalize()
        .with_context(|| format!("workspace does not exist: {}", args.workspace.display()))?;
    let service = DiscoveredService::discover().context("OpenCode discovery failed")?;
    println!(
        "discovered service {} version {} pid {} (password: {})",
        service.id(),
        service.version(),
        service.pid(),
        if service.has_password() { "yes" } else { "no" }
    );

    let client = OpenCodeClient::connect(&service)
        .await
        .context("OpenCode /api/info failed")?;
    let info = client.info();
    println!(
        "connected: version {} pid {} tmp {}",
        info.version, info.pid, info.paths.tmp
    );

    let sessions = client
        .list_sessions(Some(&workspace), Some(10))
        .await
        .context("session list failed")?;
    println!(
        "sessions for {}: {}",
        workspace.display(),
        sessions.data.len()
    );
    for session in &sessions.data {
        println!(
            "  {}  {}",
            session.id,
            session.title.as_deref().unwrap_or("<untitled>")
        );
    }

    let target_session = if args.prompt.is_some() && !args.create_session {
        sessions.data.first().map(|session| session.id.clone())
    } else if args.create_session || args.prompt.is_some() {
        let mut request = CreateSession::new(&workspace);
        request.title = Some("JavaIDE Phase 0 spike".to_owned());
        let session = client
            .create_session(&request)
            .await
            .context("session create failed")?;
        println!("created session {}", session.id);
        Some(session.id)
    } else {
        None
    };

    let mut events = client
        .subscribe_events()
        .await
        .context("SSE subscription failed")?;
    println!("SSE subscribed for {}s", args.listen_secs);

    if let (Some(prompt), Some(session)) = (&args.prompt, &target_session) {
        let receipt = client
            .send_prompt(session, &PromptInput::text(prompt))
            .await
            .context("prompt failed")?;
        let message_id = receipt.get("id").and_then(|value| value.as_str());
        println!(
            "prompt queued in {session} (message {})",
            message_id.unwrap_or("-")
        );
    }

    let deadline = tokio::time::Instant::now() + Duration::from_secs(args.listen_secs);
    loop {
        let remaining = deadline.saturating_duration_since(tokio::time::Instant::now());
        if remaining.is_zero() {
            break;
        }
        match tokio::time::timeout(remaining, events.recv()).await {
            Err(_) => break,
            Ok(None) => {
                println!("SSE stream closed");
                break;
            }
            Ok(Some(Err(error))) => {
                println!("SSE error: {error}");
                break;
            }
            Ok(Some(Ok(event))) => {
                println!(
                    "SSE event: {} ({})",
                    event.name,
                    event.id.as_deref().unwrap_or("-")
                );
            }
        }
    }

    if args.attach_mcp {
        println!("attaching client-MCP as `javaide`");
        match client.attach_client_mcp("javaide", &workspace).await {
            Ok(mut mcp) => {
                println!("client-MCP attached");
                match tokio::time::timeout(Duration::from_secs(5), mcp.next_json()).await {
                    Ok(Ok(Some(message))) => {
                        let method = message
                            .get("method")
                            .and_then(|value| value.as_str())
                            .unwrap_or("<response>");
                        println!("client-MCP first message: {method}");
                    }
                    Ok(Ok(None)) => println!("client-MCP closed without a message"),
                    Ok(Err(error)) => println!("client-MCP read error: {error}"),
                    Err(_) => println!("client-MCP attached but sent no message within 5s"),
                }
                mcp.close().await.ok();
            }
            Err(error) => println!("client-MCP attach failed: {error}"),
        }
    }

    Ok(())
}

async fn run_jdtls(args: JdtlsArgs) -> Result<()> {
    let source = args
        .workspace
        .canonicalize()
        .with_context(|| format!("fixture does not exist: {}", args.workspace.display()))?;
    let installation = JdtlsInstallation::discover(&args.jdtls_root)
        .with_context(|| format!("invalid jdtls root: {}", args.jdtls_root.display()))?;

    let temporary;
    let workdir = match &args.workdir {
        Some(workdir) => workdir.clone(),
        None => {
            temporary = tempfile::tempdir().context("cannot create temporary workdir")?;
            temporary.path().to_path_buf()
        }
    };
    let workspace = workdir.join("workspace");
    if workspace.exists() {
        bail!(
            "working directory already exists: {} (choose a new --workdir)",
            workspace.display()
        );
    }
    std::fs::create_dir_all(&workspace).context("cannot create copied workspace")?;
    copy_workspace(&source, &workspace)?;
    let broken = workspace.join("src/main/java/com/example/Broken.java");
    std::fs::write(
        &broken,
        "package com.example;\npublic class Broken {\n    int value = ;\n}\n",
    )
    .context("cannot write broken fixture")?;
    println!("workspace: {}", workspace.display());

    let data_dir = workdir.join("jdtls-data");
    let config = JdtlsConfig::new(&args.java_home, installation.clone(), &data_dir, &workspace);
    println!(
        "launcher: {}\nconfig: {}",
        installation.launcher_jar.display(),
        installation.config_dir.display()
    );

    let mut client = JdtlsClient::start(config)
        .await
        .context("jdtls failed to start")?;
    println!("jdtls pid: {:?}", client.pid());

    let initialized = client.initialize().await.context("initialize failed")?;
    client.initialized().await.context("initialized failed")?;
    println!(
        "initialize: server={:?} triggers={}",
        initialized
            .server_info
            .as_ref()
            .map(|info| info.name.as_str())
            .unwrap_or("<unknown>"),
        initialized
            .capabilities
            .execute_command_provider
            .as_ref()
            .map_or(0, |provider| provider.commands.len())
    );

    client
        .wait_for_service_ready(Duration::from_secs(120))
        .await
        .context("jdtls never reported ServiceReady")?;
    println!("ServiceReady received");

    let clean = workspace.join("src/main/java/com/example/App.java");
    let clean_text = std::fs::read_to_string(&clean).context("cannot read App.java")?;
    let clean_uri = client
        .open_document(&clean, &clean_text, 1)
        .await
        .context("didOpen App.java failed")?;
    print_diagnostics(
        &client,
        &clean_uri,
        Duration::from_secs(args.diagnostics_timeout),
    )
    .await?;

    let broken_text = std::fs::read_to_string(&broken).context("cannot read Broken.java")?;
    let broken_uri = client
        .open_document(&broken, &broken_text, 1)
        .await
        .context("didOpen Broken.java failed")?;
    let diagnostics = print_diagnostics(
        &client,
        &broken_uri,
        Duration::from_secs(args.diagnostics_timeout),
    )
    .await?;
    if diagnostics == 0 {
        bail!("jdtls published no diagnostics for the broken fixture");
    }

    client
        .shutdown(Duration::from_secs(10))
        .await
        .context("jdtls shutdown failed")?;
    println!("jdtls shut down cleanly");
    Ok(())
}

async fn print_diagnostics(
    client: &JdtlsClient,
    uri: &lsp_types::Uri,
    timeout: Duration,
) -> Result<usize> {
    let published = client
        .wait_for_diagnostics(uri, timeout)
        .await
        .with_context(|| format!("no diagnostics published for {}", uri.as_str()))?;
    println!(
        "diagnostics: {} ({} items)",
        uri.as_str(),
        published.diagnostics.len()
    );
    for diagnostic in &published.diagnostics {
        println!(
            "  [{:?}] line {}: {}",
            diagnostic.severity,
            diagnostic.range.start.line + 1,
            diagnostic.message
        );
    }
    Ok(published.diagnostics.len())
}

fn copy_workspace(source: &Path, destination: &Path) -> Result<()> {
    for entry in
        std::fs::read_dir(source).with_context(|| format!("cannot list {}", source.display()))?
    {
        let entry = entry?;
        let name = entry.file_name();
        if matches!(
            name.to_str(),
            Some(
                "build"
                    | ".gradle"
                    | ".git"
                    | ".project"
                    | ".classpath"
                    | ".settings"
                    | "bin"
                    | "out"
            )
        ) {
            continue;
        }
        let path = entry.path();
        let target = destination.join(&name);
        if entry.file_type()?.is_dir() {
            std::fs::create_dir_all(&target)?;
            copy_workspace(&path, &target)?;
        } else {
            std::fs::copy(&path, &target)
                .with_context(|| format!("cannot copy {}", path.display()))?;
        }
    }
    Ok(())
}

async fn run_gradle(args: GradleArgs) -> Result<()> {
    let bridge = args
        .bridge
        .canonicalize()
        .with_context(|| format!("bridge launcher does not exist: {}", args.bridge.display()))?;
    let java_home = args
        .java_home
        .canonicalize()
        .with_context(|| format!("JAVA_HOME does not exist: {}", args.java_home.display()))?;
    let source = args
        .workspace
        .canonicalize()
        .with_context(|| format!("workspace does not exist: {}", args.workspace.display()))?;
    let temporary = tempfile::tempdir().context("cannot create temporary workspace")?;
    let root = if let Some(workdir) = &args.workdir {
        workdir
            .canonicalize()
            .with_context(|| format!("workdir does not exist: {}", workdir.display()))?
    } else {
        copy_workspace(&source, temporary.path())?;
        temporary.path().to_path_buf()
    };
    println!("gradle root: {}", root.display());

    let client = GradleClient::start(GradleOptions {
        bridge,
        root: root.clone(),
        java_home: Some(java_home),
        ..GradleOptions::default()
    })
    .await
    .context("cannot start the Gradle bridge")?;
    let info = client.info();
    println!(
        "bridge: {} {} protocol {} (Java {}, Tooling API {})",
        info.name, info.version, info.protocol_version, info.java_version, info.tooling_api_version
    );
    let mut events = client.subscribe();
    let event_printer = tokio::spawn(async move {
        loop {
            match events.recv().await {
                Ok(GradleEvent::TestFinished { test, .. }) if test.atomic => {
                    println!("  event test.finished {} {}", test.state, test.id);
                }
                Ok(GradleEvent::TaskFinished { task, .. }) => {
                    println!("  event task.finished {} {}", task.outcome, task.task_path);
                }
                Ok(_) => {}
                Err(_) => break,
            }
        }
    });

    let sync = client
        .sync(Duration::from_secs(180))
        .await
        .context("Gradle sync failed")?;
    println!(
        "sync: Gradle {} at {}; {} projects, {} problems",
        sync.snapshot.gradle_version,
        sync.snapshot.gradle_home,
        sync.snapshot.projects.len(),
        sync.snapshot.problems.len()
    );
    let project = sync
        .snapshot
        .projects
        .iter()
        .find(|project| !project.test_tasks.is_empty())
        .or_else(|| sync.snapshot.projects.first())
        .context("the build has no projects")?;
    let project_path = project.path.clone();
    let test_task = project
        .test_tasks
        .first()
        .map_or_else(|| ":test".to_owned(), |task| task.path.clone());
    println!(
        "project {}: {} tasks, test task {}",
        project_path,
        project.tasks.len(),
        test_task
    );

    let task_run = client
        .run_task(
            &RunTaskRequest {
                tasks: vec![test_task.clone()],
                ..RunTaskRequest::default()
            },
            Duration::from_secs(240),
        )
        .await
        .context("Gradle task run failed")?;
    println!(
        "runTask {}: failed={} duration={}ms outcomes={:?}",
        test_task,
        task_run.failed,
        task_run.duration_ms,
        task_run
            .task_outcomes
            .iter()
            .map(|outcome| format!("{}={}", outcome.task_path, outcome.outcome))
            .collect::<Vec<_>>()
    );

    let listing = client
        .list_tests(
            Some(&project_path),
            Some(&test_task),
            true,
            Duration::from_secs(180),
        )
        .await
        .context("Gradle test discovery failed")?;
    println!(
        "listTests: compiled={} {} classes, {} warnings",
        listing.compiled,
        listing.tests.len(),
        listing.warnings.len()
    );
    for class in &listing.tests {
        println!(
            "  class {} ({} methods, framework {})",
            class.class_name,
            class.methods.len(),
            class.framework
        );
    }
    let first_class = listing
        .tests
        .iter()
        .find(|class| !class.methods.is_empty())
        .context("no test methods were discovered")?;
    let class_name = first_class.class_name.clone();
    let method_name = first_class.methods[0]
        .name
        .trim_end_matches("()")
        .to_owned();

    let plain = client
        .run_tests(
            &RunTestsRequest {
                project_path: Some(project_path.clone()),
                task_path: Some(test_task.clone()),
                classes: vec![class_name.clone()],
                ..RunTestsRequest::default()
            },
            Duration::from_secs(240),
        )
        .await
        .context("Gradle test run failed")?;
    print_test_run("runTests", &plain);

    if args.debug {
        let port = args.debug_port;
        println!("debug: requesting JDWP listener on 127.0.0.1:{port}");
        let request = RunTestsRequest {
            project_path: Some(project_path.clone()),
            task_path: Some(test_task.clone()),
            methods: vec![TestRef {
                class_name: class_name.clone(),
                method_name: method_name.clone(),
            }],
            debug: Some(DebugOptions {
                enabled: true,
                host: "127.0.0.1".to_owned(),
                port,
                suspend: true,
            }),
            ..RunTestsRequest::default()
        };
        let run = client.run_tests(&request, Duration::from_secs(240));
        let resume = resume_debugger("127.0.0.1", port, Duration::from_secs(180));
        let (result, resumed) = tokio::join!(run, resume);
        match resumed {
            Ok(()) => println!("debug: JDWP handshake and VirtualMachine.Resume succeeded"),
            Err(error) => println!("debug: JDWP handshake failed: {error:#}"),
        }
        let debug_run = result.context("debug test run failed")?;
        if let Some(debug) = &debug_run.debug {
            println!(
                "debug listener: {}:{} suspend={}",
                debug.host, debug.port, debug.suspend
            );
        }
        print_test_run("runTests --debug", &debug_run);
    }

    let classpath = client
        .resolve_classpath(Some(&project_path), "main", Duration::from_secs(180))
        .await
        .context("Gradle classpath resolution failed")?;
    println!(
        "resolveClasspath main: {} compile entries, {} runtime entries, {} output dirs",
        classpath.compile_classpath.len(),
        classpath.runtime_classpath.len(),
        classpath.output_dirs.len()
    );

    let report = client
        .dependency_report(
            Some(&project_path),
            "testRuntimeClasspath",
            Duration::from_secs(180),
        )
        .await
        .context("Gradle dependency report failed")?;
    println!(
        "dependencyReport testRuntimeClasspath: {} roots, {} artifacts, {} problems",
        report.roots.len(),
        report.artifacts.len(),
        report.problems.len()
    );

    event_printer.abort();
    client.shutdown().await.context("bridge shutdown failed")?;
    println!("gradle phase 0: OK");
    Ok(())
}

fn print_test_run(label: &str, result: &ide_gradle::RunTestsResult) {
    let tests = result
        .tests
        .iter()
        .filter(|test| test.atomic)
        .map(|test| {
            format!(
                "{}.{}={} ({}ms)",
                test.class_name.as_deref().unwrap_or("?"),
                test.method_name.as_deref().unwrap_or(&test.name),
                test.state,
                test.duration_ms
            )
        })
        .collect::<Vec<_>>();
    println!(
        "{label}: failed={} cancelled={} timedOut={} duration={}ms tests={tests:?}",
        result.failed, result.cancelled, result.timed_out, result.duration_ms
    );
    if !result.failures.is_empty() {
        println!("{label} failures: {:?}", result.failures);
    }
}

async fn resume_debugger(host: &str, port: u16, limit: Duration) -> Result<()> {
    let deadline = std::time::Instant::now() + limit;
    let mut stream = loop {
        match TcpStream::connect((host, port)).await {
            Ok(stream) => break stream,
            Err(error) if std::time::Instant::now() < deadline => {
                let _ = error;
                tokio::time::sleep(Duration::from_millis(200)).await;
            }
            Err(error) => {
                return Err(error).with_context(|| format!("cannot connect to {host}:{port}"));
            }
        }
    };
    // JDWP is client-initiated: the debugger sends the 14-byte greeting first
    // and then reads the VM's echo. Reading first deadlocks until the worker's
    // handshake timeout, which surfaces as an early EOF.
    stream
        .write_all(b"JDWP-Handshake")
        .await
        .context("cannot write the JDWP handshake")?;
    let mut handshake = [0_u8; 14];
    stream
        .read_exact(&mut handshake)
        .await
        .context("cannot read the JDWP handshake")?;
    if &handshake != b"JDWP-Handshake" {
        bail!(
            "unexpected JDWP handshake {:?}",
            String::from_utf8_lossy(&handshake)
        );
    }

    // VirtualMachine.Resume: command set 1, command 6, id 1.
    let resume = [0_u8, 0, 0, 11, 0, 0, 0, 1, 0, 1, 6];
    stream
        .write_all(&resume)
        .await
        .context("cannot send VirtualMachine.Resume")?;
    loop {
        let mut header = [0_u8; 11];
        stream
            .read_exact(&mut header)
            .await
            .context("cannot read a JDWP reply")?;
        let length = u32::from_be_bytes(header[0..4].try_into().expect("4 bytes")) as usize;
        let id = u32::from_be_bytes(header[4..8].try_into().expect("4 bytes"));
        let flags = header[8];
        if length < 11 {
            bail!("invalid JDWP packet length {length}");
        }
        let mut body = vec![0_u8; length - 11];
        stream
            .read_exact(&mut body)
            .await
            .context("cannot read a JDWP packet body")?;
        // Reply packets set 0x80 and carry the error code in bytes 9..11 of
        // the header; event packets leave it clear.
        if flags & 0x80 != 0 && id == 1 {
            let error = u16::from_be_bytes([header[9], header[10]]);
            if error != 0 {
                bail!("VirtualMachine.Resume failed with error {error}");
            }
            return Ok(());
        }
    }
}

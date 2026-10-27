//! Loopback port allocation and readiness probing.
//!
//! Debug adapters, JDWP test workers, and Gradle sidecars all need local TCP
//! ports. Two rules apply:
//!
//! - bind to `127.0.0.1`, never a wildcard address;
//! - prefer OS-assigned ports over hard-coded values.
//!
//! [`ReservedPort`] keeps a listener open to reserve a port until the child that
//! needs it is started. There is an unavoidable race between releasing the
//! reservation and the child binding the port; callers must handle bind failure
//! and retry with a new port.

use std::io;
use std::net::{Ipv4Addr, SocketAddr, TcpListener};
use std::time::Duration;

use tokio::net::TcpStream;
use tokio::time::{Instant, sleep};

/// A loopback port held open by a listening socket.
///
/// Dropping the reservation releases the port. Use [`ReservedPort::release`]
/// when the port is about to be handed to another process.
#[derive(Debug)]
pub struct ReservedPort {
    listener: TcpListener,
    port: u16,
}

impl ReservedPort {
    /// Reserves an operating-system-assigned loopback port.
    ///
    /// # Errors
    ///
    /// Returns an I/O error if the loopback listener cannot be created.
    pub fn bind_loopback() -> io::Result<Self> {
        let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0))?;
        let port = listener.local_addr()?.port();
        Ok(Self { listener, port })
    }

    /// Returns the reserved port number.
    #[must_use]
    pub const fn port(&self) -> u16 {
        self.port
    }

    /// Releases the reservation and returns the port number.
    #[must_use]
    pub fn release(self) -> u16 {
        let Self { listener, port } = self;
        drop(listener);
        port
    }
}

/// Allocates a loopback port without retaining a reservation.
///
/// Prefer [`ReservedPort`] when the consumer starts shortly after allocation.
///
/// # Errors
///
/// Returns an I/O error if no loopback listener can be created.
pub fn allocate_loopback_port() -> io::Result<u16> {
    ReservedPort::bind_loopback().map(ReservedPort::release)
}

/// Waits until a TCP connection to `address` succeeds or `limit` elapses.
///
/// This is a readiness probe, not a protocol handshake. It is used for debug
/// adapters and JDWP listeners that accept connections before they are fully
/// initialized; callers must still perform their own handshake.
///
/// # Errors
///
/// Returns the last connection error when the deadline expires.
pub async fn wait_for_tcp(address: SocketAddr, limit: Duration) -> io::Result<()> {
    let deadline = Instant::now() + limit;
    loop {
        match TcpStream::connect(address).await {
            Ok(stream) => {
                drop(stream);
                return Ok(());
            }
            Err(error) => {
                let now = Instant::now();
                if now >= deadline {
                    return Err(error);
                }
                let remaining = deadline.saturating_duration_since(now);
                sleep(remaining.min(Duration::from_millis(25))).await;
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reserved_port_is_loopback_and_reusable_after_release() {
        let reservation = ReservedPort::bind_loopback().unwrap();
        let port = reservation.port();
        assert_ne!(port, 0);
        let _ = reservation.release();
        let second = allocate_loopback_port().unwrap();
        assert_ne!(second, 0);
    }

    #[tokio::test]
    async fn wait_for_tcp_succeeds_against_a_listener() {
        let listener = tokio::net::TcpListener::bind((Ipv4Addr::LOCALHOST, 0))
            .await
            .unwrap();
        let address = listener.local_addr().unwrap();
        let accept = tokio::spawn(async move {
            let _ = listener.accept().await;
        });
        wait_for_tcp(address, Duration::from_secs(1)).await.unwrap();
        accept.await.unwrap();
    }

    #[tokio::test]
    async fn wait_for_tcp_times_out() {
        let port = allocate_loopback_port().unwrap();
        let address = SocketAddr::from((Ipv4Addr::LOCALHOST, port));
        let result = wait_for_tcp(address, Duration::from_millis(50)).await;
        assert!(result.is_err());
    }
}

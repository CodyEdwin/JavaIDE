//! Server-sent event parsing for `GET /api/event`.
//!
//! The V2 service uses conventional SSE framing:
//!
//! ```text
//! data: {"id":"evt_…","type":"server.connected","data":{}}
//!
//! : heartbeat
//! ```
//!
//! Event names are carried inside the JSON envelope (`type`), not in the SSE
//! `event:` field, though a future-compatible decoder accepts both. The stream
//! has no replay: callers must refetch session context and pending requests
//! after a reconnect (see `docs/OPENCODE.md` §3.2).

use serde_json::Value;
use tokio::sync::mpsc;

use crate::OpenCodeError;

/// Largest accepted single SSE line. Tool output is streamed as JSON events;
/// a line beyond this is a protocol or memory problem, not something to buffer.
const MAX_LINE_BYTES: usize = 1024 * 1024;

/// Largest accepted accumulated `data` payload for one event.
const MAX_EVENT_BYTES: usize = 4 * 1024 * 1024;

/// Maximum queued events before the reader applies backpressure.
pub(crate) const EVENT_CHANNEL_CAPACITY: usize = 256;

/// A normalized OpenCode event.
///
/// `data` remains a JSON value on purpose: the V2 event union is large and
/// still experimental. `ide-domain` will project the events needed by the UI;
/// this crate preserves unknown events rather than dropping them silently.
#[derive(Debug, Clone, PartialEq)]
pub struct OpenCodeEvent {
    /// Envelope id (`evt_…`) when present.
    pub id: Option<String>,
    /// Event type, for example `server.connected` or `session.updated`.
    pub name: String,
    /// Decoded JSON payload. Non-JSON data is preserved as a string.
    pub data: Value,
}

impl OpenCodeEvent {
    /// Returns the session id from the payload, if this event belongs to one.
    #[must_use]
    pub fn session_id(&self) -> Option<&str> {
        self.data
            .get("sessionID")
            .and_then(Value::as_str)
            .or_else(|| {
                self.data
                    .get("data")
                    .and_then(|data| data.get("sessionID"))
                    .and_then(Value::as_str)
            })
    }
}

/// A live event subscription.
///
/// Dropping the stream aborts the HTTP body and closes the subscription. The
/// receiver is bounded; if the application stops reading, the reader task
/// stops consuming the socket rather than growing memory without limit.
#[derive(Debug)]
pub struct EventStream {
    receiver: mpsc::Receiver<Result<OpenCodeEvent, OpenCodeError>>,
}

impl EventStream {
    pub(crate) const fn new(
        receiver: mpsc::Receiver<Result<OpenCodeEvent, OpenCodeError>>,
    ) -> Self {
        Self { receiver }
    }

    /// Waits for the next event.
    ///
    /// Returns `None` when the stream ends. A transport failure is delivered as
    /// one final `Some(Err(..))`; callers should then reconnect deliberately.
    pub async fn recv(&mut self) -> Option<Result<OpenCodeEvent, OpenCodeError>> {
        self.receiver.recv().await
    }

    /// Consumes the subscription and returns the raw receiver.
    #[must_use]
    pub fn into_receiver(self) -> mpsc::Receiver<Result<OpenCodeEvent, OpenCodeError>> {
        self.receiver
    }
}

/// One decoded SSE frame before JSON interpretation.
#[derive(Debug, PartialEq, Eq)]
struct RawEvent {
    id: Option<String>,
    event: Option<String>,
    data: String,
}

/// Incremental SSE decoder.
///
/// It is fed arbitrary byte chunks; framing is complete only on blank lines.
/// UTF-8 validation happens per line, so a multi-byte character split across
/// chunks is handled correctly.
#[derive(Debug, Default)]
struct SseDecoder {
    buffer: Vec<u8>,
    id: Option<String>,
    event: Option<String>,
    data: String,
}

impl SseDecoder {
    fn push(&mut self, chunk: &[u8]) -> Result<Vec<RawEvent>, OpenCodeError> {
        self.buffer.extend_from_slice(chunk);
        let mut events = Vec::new();
        while let Some(newline) = self.buffer.iter().position(|byte| *byte == b'\n') {
            let line = self.buffer.drain(..=newline).collect::<Vec<_>>();
            // Drop the LF and an optional CR.
            let line = &line[..line.len() - 1];
            let line = line.strip_suffix(b"\r").unwrap_or(line);
            let line = std::str::from_utf8(line)
                .map_err(|error| OpenCodeError::EventStream(format!("invalid UTF-8: {error}")))?;
            self.line(line, &mut events)?;
        }
        if self.buffer.len() > MAX_LINE_BYTES {
            return Err(OpenCodeError::EventStream(format!(
                "SSE line exceeds {MAX_LINE_BYTES} bytes"
            )));
        }
        Ok(events)
    }

    fn finish(&mut self) -> Result<Vec<RawEvent>, OpenCodeError> {
        let mut events = Vec::new();
        if !self.buffer.is_empty() {
            let line = std::mem::take(&mut self.buffer);
            let line = line.strip_suffix(b"\r").unwrap_or(&line);
            let line = std::str::from_utf8(line)
                .map_err(|error| OpenCodeError::EventStream(format!("invalid UTF-8: {error}")))?;
            self.line(line, &mut events)?;
        }
        self.dispatch(&mut events)?;
        Ok(events)
    }

    fn line(&mut self, line: &str, events: &mut Vec<RawEvent>) -> Result<(), OpenCodeError> {
        if line.is_empty() {
            self.dispatch(events)?;
            return Ok(());
        }
        if line.starts_with(':') {
            // Comment, typically a heartbeat.
            return Ok(());
        }
        let (field, value) = match line.split_once(':') {
            Some((field, value)) => (field, value.strip_prefix(' ').unwrap_or(value)),
            None => (line, ""),
        };
        match field {
            "id" => {
                if !value.contains('\0') {
                    self.id = Some(value.to_owned());
                }
            }
            "event" => self.event = Some(value.to_owned()),
            "data" => {
                if self.data.len() + value.len() + 1 > MAX_EVENT_BYTES {
                    return Err(OpenCodeError::EventStream(format!(
                        "SSE event exceeds {MAX_EVENT_BYTES} bytes"
                    )));
                }
                self.data.push_str(value);
                self.data.push('\n');
            }
            // `retry` is not useful for a live-only stream, and unknown fields
            // are ignored per the SSE specification.
            _ => {}
        }
        Ok(())
    }

    fn dispatch(&mut self, events: &mut Vec<RawEvent>) -> Result<(), OpenCodeError> {
        if self.data.is_empty() {
            self.id = None;
            self.event = None;
            return Ok(());
        }
        let mut data = std::mem::take(&mut self.data);
        if data.ends_with('\n') {
            data.pop();
        }
        events.push(RawEvent {
            id: self.id.take(),
            event: self.event.take(),
            data,
        });
        Ok(())
    }
}

fn parse_event(raw: RawEvent) -> OpenCodeEvent {
    let data = match serde_json::from_str::<Value>(&raw.data) {
        Ok(value) => value,
        Err(_) => Value::String(raw.data),
    };
    // The OpenAPI schema describes `data` as a JSON string. The live service
    // sends an object, but accept both shapes.
    let data = match data {
        Value::String(inner) if inner.starts_with('{') || inner.starts_with('[') => {
            serde_json::from_str(&inner).unwrap_or(Value::String(inner))
        }
        other => other,
    };
    let name = data
        .get("type")
        .and_then(Value::as_str)
        .or(raw.event.as_deref())
        .unwrap_or("message")
        .to_owned();
    let id = data
        .get("id")
        .and_then(Value::as_str)
        .map(ToOwned::to_owned)
        .or(raw.id);
    OpenCodeEvent { id, name, data }
}

/// Reads an HTTP byte stream into the event channel until it ends or fails.
pub(crate) async fn read_stream<S>(
    mut bytes: S,
    sender: mpsc::Sender<Result<OpenCodeEvent, OpenCodeError>>,
) where
    S: futures_util::Stream<Item = Result<bytes::Bytes, reqwest::Error>> + Unpin,
{
    use futures_util::StreamExt;

    let mut decoder = SseDecoder::default();
    loop {
        match bytes.next().await {
            Some(Ok(chunk)) => match decoder.push(&chunk) {
                Ok(raw_events) => {
                    for raw in raw_events {
                        if sender.send(Ok(parse_event(raw))).await.is_err() {
                            return;
                        }
                    }
                }
                Err(error) => {
                    let _ = sender.send(Err(error)).await;
                    return;
                }
            },
            Some(Err(error)) => {
                let _ = sender.send(Err(OpenCodeError::Transport(error))).await;
                return;
            }
            None => {
                match decoder.finish() {
                    Ok(raw_events) => {
                        for raw in raw_events {
                            if sender.send(Ok(parse_event(raw))).await.is_err() {
                                return;
                            }
                        }
                    }
                    Err(error) => {
                        let _ = sender.send(Err(error)).await;
                    }
                }
                return;
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    fn decode(input: &[u8]) -> Vec<OpenCodeEvent> {
        let mut decoder = SseDecoder::default();
        let mut raw = decoder.push(input).unwrap();
        raw.extend(decoder.finish().unwrap());
        raw.into_iter().map(parse_event).collect()
    }

    #[test]
    fn decodes_open_code_events_and_heartbeats() {
        let input = concat!(
            "data: {\"id\":\"evt_1\",\"type\":\"server.connected\",\"data\":{}}\n",
            "\n",
            ": heartbeat\n",
            "\n",
            "data: {\"id\":\"evt_2\",\"type\":\"session.updated\",\"data\":{\"sessionID\":\"ses_1\"}}\n",
            "\n",
        );
        let events = decode(input.as_bytes());
        assert_eq!(events.len(), 2);
        assert_eq!(events[0].name, "server.connected");
        assert_eq!(events[0].id.as_deref(), Some("evt_1"));
        assert_eq!(events[1].name, "session.updated");
        assert_eq!(events[1].session_id(), Some("ses_1"));
    }

    #[test]
    fn handles_multiline_data_crlf_and_comments() {
        let input = concat!(
            "id: 7\r\n",
            "event: custom\r\n",
            "data: {\"type\":\"custom\",\r\n",
            "data: \"data\":{\"a\":1}}\r\n",
            "\r\n",
        );
        let events = decode(input.as_bytes());
        assert_eq!(events.len(), 1);
        assert_eq!(events[0].id.as_deref(), Some("7"));
        assert_eq!(events[0].name, "custom");
        assert_eq!(events[0].data["data"]["a"], json!(1));
    }

    #[test]
    fn handles_split_chunks_and_split_utf8() {
        let text = "data: {\"type\":\"t\",\"data\":{\"x\":\"é😀\"}}\n\n";
        let bytes = text.as_bytes();
        let mut decoder = SseDecoder::default();
        let mut events = Vec::new();
        // Split inside the UTF-8 emoji.
        let split = text.find('😀').unwrap() + 2;
        events.extend(decoder.push(&bytes[..split]).unwrap());
        events.extend(decoder.push(&bytes[split..]).unwrap());
        events.extend(decoder.finish().unwrap());
        assert_eq!(events.len(), 1);
        let event = parse_event(events.remove(0));
        assert_eq!(event.data["data"]["x"], json!("é😀"));
    }

    #[test]
    fn accepts_double_encoded_json() {
        let raw = RawEvent {
            id: Some("outer".to_owned()),
            event: None,
            data: serde_json::to_string(&json!({
                "type": "session.updated",
                "data": {"sessionID": "ses_2"}
            }))
            .unwrap(),
        };
        let event = parse_event(raw);
        assert_eq!(event.name, "session.updated");
        assert_eq!(event.id.as_deref(), Some("outer"));
        assert_eq!(event.session_id(), Some("ses_2"));
    }

    #[test]
    fn preserves_non_json_data() {
        let raw = RawEvent {
            id: None,
            event: Some("plain".to_owned()),
            data: "hello".to_owned(),
        };
        let event = parse_event(raw);
        assert_eq!(event.name, "plain");
        assert_eq!(event.data, json!("hello"));
    }

    #[test]
    fn rejects_invalid_utf8() {
        let mut decoder = SseDecoder::default();
        let error = decoder.push(b"data: \xff\n").unwrap_err();
        assert!(matches!(error, OpenCodeError::EventStream(_)));
    }

    #[test]
    fn rejects_oversized_lines() {
        let mut decoder = SseDecoder::default();
        let chunk = vec![b'a'; MAX_LINE_BYTES + 1];
        let error = decoder.push(&chunk).unwrap_err();
        assert!(matches!(error, OpenCodeError::EventStream(_)));
    }

    #[test]
    fn dispatches_a_trailing_event_without_blank_line() {
        let events = decode(b"data: {\"type\":\"last\"}");
        assert_eq!(events.len(), 1);
        assert_eq!(events[0].name, "last");
    }
}

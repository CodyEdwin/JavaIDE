//! `Content-Length` framing for JSON-RPC.
//!
//! [`JsonRpcCodec`] implements [`tokio_util::codec::Decoder`] and
//! [`tokio_util::codec::Encoder`], so it can be combined with `FramedRead`,
//! `FramedWrite`, or `Framed` over any byte stream.
//!
//! The decoder is deliberately strict about bounded memory:
//!
//! - headers are capped at [`MAX_HEADER_BYTES`];
//! - frames are capped at the codec's configured maximum;
//! - a missing or unparsable `Content-Length` is an error, not a resync attempt.
//!
//! Errors are terminal for a connection. A framing error means the byte stream
//! can no longer be trusted; callers should close the transport rather than try
//! to skip to the next header.

use bytes::{Buf, BytesMut};
use tokio_util::codec::{Decoder, Encoder};

use crate::message::Message;

/// Maximum accepted size of the header block, excluding the blank line.
pub const MAX_HEADER_BYTES: usize = 8 * 1024;

/// The largest frame accepted by default (16 MiB).
///
/// LSP `workspace/applyEdit` messages and Gradle models can be large, but
/// unbounded allocation from a hostile peer is worse. Raise this explicitly for
/// a transport that needs it.
pub const DEFAULT_MAX_FRAME_BYTES: usize = 16 * 1024 * 1024;

/// Framing or JSON errors.
#[derive(Debug, thiserror::Error)]
pub enum CodecError {
    /// A header line was not ASCII `name: value` syntax.
    #[error("invalid JSON-RPC frame header")]
    InvalidHeader,
    /// The header block exceeded [`MAX_HEADER_BYTES`].
    #[error("JSON-RPC header exceeds {max} bytes")]
    HeaderTooLarge {
        /// Configured header limit.
        max: usize,
    },
    /// No `Content-Length` header was present.
    #[error("missing Content-Length header")]
    MissingContentLength,
    /// `Content-Length` appeared more than once.
    #[error("duplicate Content-Length header")]
    DuplicateContentLength,
    /// `Content-Length` was not a non-negative integer.
    #[error("invalid Content-Length value")]
    InvalidContentLength,
    /// A frame exceeded the configured maximum.
    #[error("JSON-RPC frame of {size} bytes exceeds limit of {max} bytes")]
    FrameTooLarge {
        /// Declared or encoded frame size.
        size: usize,
        /// Configured maximum.
        max: usize,
    },
    /// The payload was not valid JSON or did not match the envelope.
    #[error("invalid JSON-RPC payload: {0}")]
    Json(#[from] serde_json::Error),
    /// The underlying transport failed.
    #[error("JSON-RPC transport failed: {0}")]
    Io(#[from] std::io::Error),
}

/// A codec for LSP-style `Content-Length` framed JSON-RPC.
///
/// Cloning the codec is cheap; the reader and writer may each own a clone.
#[derive(Debug, Clone)]
pub struct JsonRpcCodec {
    max_frame_bytes: usize,
}

impl JsonRpcCodec {
    /// Creates a codec with an explicit maximum frame size.
    ///
    /// A maximum of zero is clamped to one byte.
    #[must_use]
    pub fn new(max_frame_bytes: usize) -> Self {
        Self {
            max_frame_bytes: max_frame_bytes.max(1),
        }
    }

    /// Returns the configured maximum frame size in bytes.
    #[must_use]
    pub const fn max_frame_bytes(&self) -> usize {
        self.max_frame_bytes
    }
}

impl Default for JsonRpcCodec {
    fn default() -> Self {
        Self::new(DEFAULT_MAX_FRAME_BYTES)
    }
}

impl Decoder for JsonRpcCodec {
    type Item = Message;
    type Error = CodecError;

    fn decode(&mut self, source: &mut BytesMut) -> Result<Option<Self::Item>, Self::Error> {
        let Some((header_end, terminator_len)) = find_header_end(source) else {
            if source.len() > MAX_HEADER_BYTES {
                return Err(CodecError::HeaderTooLarge {
                    max: MAX_HEADER_BYTES,
                });
            }
            return Ok(None);
        };

        if header_end > MAX_HEADER_BYTES {
            return Err(CodecError::HeaderTooLarge {
                max: MAX_HEADER_BYTES,
            });
        }

        let content_length = parse_content_length(&source[..header_end])?;
        if content_length > self.max_frame_bytes {
            return Err(CodecError::FrameTooLarge {
                size: content_length,
                max: self.max_frame_bytes,
            });
        }

        let body_start = header_end + terminator_len;
        let frame_end = body_start
            .checked_add(content_length)
            .ok_or(CodecError::InvalidContentLength)?;
        if source.len() < frame_end {
            // Avoid repeated reallocations for a large frame arriving in
            // chunks; the bound was checked above.
            source.reserve(frame_end - source.len());
            return Ok(None);
        }

        source.advance(body_start);
        let body = source.split_to(content_length);
        let message = serde_json::from_slice::<Message>(&body)?;
        Ok(Some(message))
    }
}

impl Encoder<Message> for JsonRpcCodec {
    type Error = CodecError;

    fn encode(&mut self, item: Message, destination: &mut BytesMut) -> Result<(), Self::Error> {
        let body = serde_json::to_vec(&item)?;
        if body.len() > self.max_frame_bytes {
            return Err(CodecError::FrameTooLarge {
                size: body.len(),
                max: self.max_frame_bytes,
            });
        }
        destination.reserve(body.len() + 32);
        destination.extend_from_slice(b"Content-Length: ");
        destination.extend_from_slice(body.len().to_string().as_bytes());
        destination.extend_from_slice(b"\r\n\r\n");
        destination.extend_from_slice(&body);
        Ok(())
    }
}

/// Finds the end of the header block.
///
/// Returns `(index, terminator_length)`. CRLF is the canonical form; bare LF is
/// accepted for tolerant interop with test servers.
fn find_header_end(source: &[u8]) -> Option<(usize, usize)> {
    let crlf = find_subslice(source, b"\r\n\r\n").map(|index| (index, 4));
    let lf = find_subslice(source, b"\n\n").map(|index| (index, 2));
    match (crlf, lf) {
        (Some(crlf), Some(lf)) => Some(if crlf.0 <= lf.0 { crlf } else { lf }),
        (Some(found), None) | (None, Some(found)) => Some(found),
        (None, None) => None,
    }
}

fn find_subslice(haystack: &[u8], needle: &[u8]) -> Option<usize> {
    if needle.is_empty() || haystack.len() < needle.len() {
        return None;
    }
    haystack
        .windows(needle.len())
        .position(|window| window == needle)
}

fn parse_content_length(header: &[u8]) -> Result<usize, CodecError> {
    let mut content_length = None;
    let text = std::str::from_utf8(header).map_err(|_| CodecError::InvalidHeader)?;
    for line in text.split('\n') {
        let line = line.strip_suffix('\r').unwrap_or(line);
        if line.trim().is_empty() {
            continue;
        }
        let Some((name, value)) = line.split_once(':') else {
            return Err(CodecError::InvalidHeader);
        };
        if !name.trim().eq_ignore_ascii_case("content-length") {
            continue;
        }
        if content_length.is_some() {
            return Err(CodecError::DuplicateContentLength);
        }
        let value = value.trim();
        content_length = Some(
            value
                .parse::<usize>()
                .map_err(|_| CodecError::InvalidContentLength)?,
        );
    }
    content_length.ok_or(CodecError::MissingContentLength)
}

#[cfg(test)]
mod tests {
    use bytes::BytesMut;
    use serde_json::json;

    use super::*;
    use crate::message::{RequestId, ResponsePayload};

    fn encode_frame(body: &str) -> BytesMut {
        let mut frame = BytesMut::new();
        frame.extend_from_slice(format!("Content-Length: {}\r\n\r\n", body.len()).as_bytes());
        frame.extend_from_slice(body.as_bytes());
        frame
    }

    fn decode_all(codec: &mut JsonRpcCodec, input: &mut BytesMut) -> Vec<Message> {
        let mut messages = Vec::new();
        while let Some(message) = codec.decode(input).unwrap() {
            messages.push(message);
        }
        messages
    }

    #[test]
    fn decodes_complete_frame() {
        let body = r#"{"jsonrpc":"2.0","id":1,"method":"initialize"}"#;
        let mut input = encode_frame(body);
        let mut codec = JsonRpcCodec::default();
        let messages = decode_all(&mut codec, &mut input);
        assert_eq!(messages.len(), 1);
        assert_eq!(messages[0].method(), Some("initialize"));
        assert!(input.is_empty());
    }

    #[test]
    fn waits_for_header_and_body() {
        let body = r#"{"jsonrpc":"2.0","id":1,"result":42}"#;
        let frame = encode_frame(body);
        let mut codec = JsonRpcCodec::default();

        let mut input = BytesMut::new();
        input.extend_from_slice(&frame[..10]);
        assert!(codec.decode(&mut input).unwrap().is_none());

        input.extend_from_slice(&frame[10..frame.len() - 3]);
        assert!(codec.decode(&mut input).unwrap().is_none());

        input.extend_from_slice(&frame[frame.len() - 3..]);
        let message = codec.decode(&mut input).unwrap().unwrap();
        assert_eq!(message, Message::success(RequestId::Number(1), json!(42)));
        assert!(input.is_empty());
    }

    #[test]
    fn decodes_multiple_frames_from_one_buffer() {
        let first = encode_frame(r#"{"jsonrpc":"2.0","method":"a"}"#);
        let second = encode_frame(r#"{"jsonrpc":"2.0","method":"b"}"#);
        let mut input = BytesMut::new();
        input.extend_from_slice(&first);
        input.extend_from_slice(&second);

        let mut codec = JsonRpcCodec::default();
        let messages = decode_all(&mut codec, &mut input);
        assert_eq!(messages.len(), 2);
        assert_eq!(messages[0].method(), Some("a"));
        assert_eq!(messages[1].method(), Some("b"));
    }

    #[test]
    fn header_names_are_case_insensitive() {
        let body = r#"{"jsonrpc":"2.0","method":"x"}"#;
        let mut input = BytesMut::new();
        input.extend_from_slice(
            format!(
                "content-LENGTH: {}\r\nContent-Type: application/json\r\n\r\n",
                body.len()
            )
            .as_bytes(),
        );
        input.extend_from_slice(body.as_bytes());

        let mut codec = JsonRpcCodec::default();
        assert_eq!(decode_all(&mut codec, &mut input).len(), 1);
    }

    #[test]
    fn accepts_bare_lf_terminator() {
        let body = r#"{"jsonrpc":"2.0","method":"x"}"#;
        let mut input = BytesMut::new();
        input.extend_from_slice(format!("Content-Length: {}\n\n", body.len()).as_bytes());
        input.extend_from_slice(body.as_bytes());

        let mut codec = JsonRpcCodec::default();
        assert_eq!(decode_all(&mut codec, &mut input).len(), 1);
    }

    #[test]
    fn rejects_missing_content_length() {
        let mut input = BytesMut::new();
        input.extend_from_slice(b"Content-Type: application/json\r\n\r\n{}");
        let mut codec = JsonRpcCodec::default();
        assert!(matches!(
            codec.decode(&mut input),
            Err(CodecError::MissingContentLength)
        ));
    }

    #[test]
    fn rejects_duplicate_content_length() {
        let mut input = BytesMut::new();
        input.extend_from_slice(b"Content-Length: 2\r\nContent-Length: 2\r\n\r\n{}");
        let mut codec = JsonRpcCodec::default();
        assert!(matches!(
            codec.decode(&mut input),
            Err(CodecError::DuplicateContentLength)
        ));
    }

    #[test]
    fn rejects_invalid_content_length() {
        let mut input = BytesMut::new();
        input.extend_from_slice(b"Content-Length: many\r\n\r\n{}");
        let mut codec = JsonRpcCodec::default();
        assert!(matches!(
            codec.decode(&mut input),
            Err(CodecError::InvalidContentLength)
        ));
    }

    #[test]
    fn rejects_malformed_header_line() {
        let mut input = BytesMut::new();
        input.extend_from_slice(b"nonsense\r\n\r\n{}");
        let mut codec = JsonRpcCodec::default();
        assert!(matches!(
            codec.decode(&mut input),
            Err(CodecError::InvalidHeader)
        ));
    }

    #[test]
    fn rejects_oversized_header() {
        let mut input = BytesMut::new();
        input.resize(MAX_HEADER_BYTES + 1, b'a');
        let mut codec = JsonRpcCodec::default();
        assert!(matches!(
            codec.decode(&mut input),
            Err(CodecError::HeaderTooLarge { .. })
        ));
    }

    #[test]
    fn rejects_oversized_frame_before_allocating() {
        let mut input = BytesMut::new();
        input.extend_from_slice(b"Content-Length: 100\r\n\r\n");
        let mut codec = JsonRpcCodec::new(10);
        assert!(matches!(
            codec.decode(&mut input),
            Err(CodecError::FrameTooLarge { size: 100, max: 10 })
        ));
        // The declared size is rejected without waiting for the body.
        assert_eq!(input.len(), 23);
    }

    #[test]
    fn rejects_invalid_json_payload() {
        let mut input = encode_frame("not json");
        let mut codec = JsonRpcCodec::default();
        assert!(matches!(codec.decode(&mut input), Err(CodecError::Json(_))));
    }

    #[test]
    fn rejects_invalid_envelope() {
        let mut input = encode_frame(r#"{"jsonrpc":"1.0","id":1,"result":0}"#);
        let mut codec = JsonRpcCodec::default();
        assert!(matches!(codec.decode(&mut input), Err(CodecError::Json(_))));
    }

    #[test]
    fn encodes_content_length_header() {
        let message = Message::request(RequestId::Number(3), "x", None);
        let mut codec = JsonRpcCodec::default();
        let mut output = BytesMut::new();
        codec.encode(message.clone(), &mut output).unwrap();

        let header_end = find_subslice(&output, b"\r\n\r\n").unwrap();
        let header = std::str::from_utf8(&output[..header_end]).unwrap();
        let body = &output[header_end + 4..];
        assert_eq!(header, format!("Content-Length: {}", body.len()));
        assert_eq!(serde_json::from_slice::<Message>(body).unwrap(), message);
    }

    #[test]
    fn encoding_respects_maximum_frame_size() {
        let message = Message::notification("x", Some(json!({ "payload": "0123456789" })));
        let mut codec = JsonRpcCodec::new(8);
        let mut output = BytesMut::new();
        assert!(matches!(
            codec.encode(message, &mut output),
            Err(CodecError::FrameTooLarge { .. })
        ));
        assert!(output.is_empty());
    }

    #[test]
    fn response_payload_helpers() {
        let success = Message::success(RequestId::Number(1), json!(null));
        let Message::Response(response) = &success else {
            panic!("expected response");
        };
        assert!(matches!(response.payload, ResponsePayload::Result(_)));
        assert!(response.result().is_some());
        assert!(response.error().is_none());
    }
}

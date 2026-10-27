#!/bin/sh
# Launch the JavaIDE desktop shell from a source checkout.
set -eu
here=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
root=$(CDPATH= cd -- "$here/../.." && pwd)

if [ ! -d "$here/node_modules" ]; then
    (cd "$here" && npm install)
fi

if [ ! -x "$root/target/debug/javaide-desktop" ]; then
    (cd "$here" && npm run tauri build -- --debug)
fi

export WEBKIT_DISABLE_DMABUF_RENDERER=1
export WEBKIT_DISABLE_COMPOSITING_MODE=1
exec "$root/target/debug/javaide-desktop"

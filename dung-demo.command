#!/usr/bin/env bash
# Lab FourT - tắt bản demo trên macOS/Linux. Mở Terminal và gõ:  bash dung-demo.command
exec bash "$(cd "$(dirname "$0")" && pwd)/deploy/demo/dung-demo.sh" "$@"

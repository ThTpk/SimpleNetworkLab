#!/usr/bin/env bash
# build แล็บแล้ววางหน้าเว็บที่ราก (ไฟล์ที่ GitHub Pages เสิร์ฟ)
# ใช้: ./build.sh [labs/<lab>]   ตั้ง SIMULAB_DIR ได้ถ้า skill อยู่ที่อื่น
set -euo pipefail
SD="${SIMULAB_DIR:-$HOME/.claude/skills/simulab}"
LAB="${1:-labs/labN1-cola}"
[ -f "$SD/tools/build.mjs" ] || { echo "ไม่พบ SIMULAB ที่ $SD — ตั้ง SIMULAB_DIR ด้วย" >&2; exit 1; }
node "$SD/tools/build.mjs" "$LAB"
cp "$LAB/dist/index.html" index.html
echo "index.html <- $LAB/dist/index.html  ($(du -k index.html | cut -f1) KB)"

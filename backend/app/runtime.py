from __future__ import annotations

import os
import re
from pathlib import Path


def rss_mb() -> int | None:
    """Resident memory of this process in MB (Linux), or None if unknown."""
    try:
        text = Path("/proc/self/status").read_text()
        match = re.search(r"VmRSS:\s+(\d+)\s+kB", text)
        return int(match.group(1)) // 1024 if match else None
    except OSError:
        return None


def memory_limit_mb() -> int | None:
    """Container memory limit in MB from cgroup v2/v1, or None if unlimited."""
    for path in (
        "/sys/fs/cgroup/memory.max",
        "/sys/fs/cgroup/memory/memory.limit_in_bytes",
    ):
        try:
            raw = Path(path).read_text().strip()
        except OSError:
            continue
        if not raw or raw == "max":
            return None
        try:
            value = int(raw)
        except ValueError:
            continue
        # cgroup v1 reports a huge number when there is no limit.
        if value >= 1 << 60:
            return None
        return value // (1024 * 1024)
    return None


def hosted_platform() -> str | None:
    return "render" if os.environ.get("RENDER", "").strip().lower() == "true" else None

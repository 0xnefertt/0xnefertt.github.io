"""Select GitHub Actions checks from the files that can affect this deployment."""

import os
import re
import subprocess
from pathlib import Path


def git(*args):
    return subprocess.check_output(["git", *args])


def changed_paths(base):
    names = git("diff", "--name-only", "--no-renames", "-z", base, "HEAD")
    return {os.fsdecode(name) for name in names.split(b"\0") if name}


def is_build_input(path):
    directories = ("astro/", "writer/", "shared/", "tests/browser/", "scripts/", "_pages/", "_posts/", "_projects/", "_books/", "_data/")
    files = {
        ".github/workflows/deploy.yml", ".lycheeignore", ".prettierrc", ".prettierignore",
        "package.json", "package-lock.json", "playwright.config.mjs",
    }
    return path.startswith(directories) or path in files


def scope(paths):
    if paths == {"_data/site-settings.json"} and Path("_data/site-settings.json").is_file():
        return "settings"
    if any(is_build_input(path) for path in paths):
        return "full"
    return "format"


def classify():
    event = os.environ["EVENT_NAME"]
    if event == "workflow_dispatch":
        return "full", os.environ["DEPLOY_WRITER"] == "true"

    push = event == "push"
    try:
        paths = changed_paths(os.environ["BEFORE_SHA"] if push else "HEAD^1")
        if push:
            # A failed or superseded push may contain changes that are still unpublished.
            revision = git("show", "refs/remotes/origin/gh-pages:.deployment-revision").decode().strip()
            if not re.fullmatch(r"[0-9a-f]{40}", revision):
                return "full", True
            paths.update(path for path in changed_paths(revision) if is_build_input(path))
    except subprocess.CalledProcessError:
        return "full", push

    worker = any(path.startswith(("writer/", "shared/")) or path in {"_data/site-defaults.json", ".github/workflows/deploy.yml"} for path in paths)
    return scope(paths), push and worker


if __name__ == "__main__":
    mode, worker_changed = classify()
    print(f"mode={mode}")
    print(f"writer_changed={str(worker_changed).lower()}")

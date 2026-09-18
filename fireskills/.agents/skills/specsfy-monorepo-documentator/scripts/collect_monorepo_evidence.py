#!/usr/bin/env python3
"""Coleta evidências seguras e somente leitura do monorepo oficial Specsfy."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path


REMOTE = "https://github.com/promovaweb/specsfy"
MODULES = (".", "brand", "skills", "docs", "example", "specsfy", "specialists", "cli")
SOURCE_CANDIDATES = (
    "AGENTS.md",
    "README.md",
    "Spec.md",
    "pyproject.toml",
    "uv.lock",
    "composer.json",
    "composer.lock",
    "package.json",
    "package-lock.json",
)


class MonorepoError(RuntimeError):
    """Indica que o workspace selecionado não é o monorepo oficial."""


def git(root: Path, *arguments: str) -> str:
    result = subprocess.run(
        ["git", "-C", str(root), *arguments],
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode:
        detail = result.stderr.strip() or result.stdout.strip()
        raise MonorepoError(f"git {' '.join(arguments)} falhou: {detail}")
    return result.stdout.rstrip("\n")


def normalize_remote(remote: str) -> str:
    value = remote.strip().removesuffix("/")
    if value.startswith("git@github.com:"):
        value = "https://github.com/" + value.removeprefix("git@github.com:")
    return value.removesuffix(".git")


def collect(workspace: Path) -> dict[str, object]:
    root = workspace.expanduser().resolve()
    try:
        git_root = Path(git(root, "rev-parse", "--show-toplevel")).resolve()
        if git_root != root:
            raise MonorepoError(f"raiz Git é {git_root}; esperado {root}")
        remote = normalize_remote(git(root, "remote", "get-url", "origin"))
        if remote != REMOTE:
            raise MonorepoError(f"remoto origin é {remote!r}; esperado {REMOTE!r}")
        for module in MODULES:
            path = root if module == "." else root / module
            if not path.is_dir():
                raise MonorepoError(f"módulo ausente: {module}")
            module_root = Path(git(path, "rev-parse", "--show-toplevel")).resolve()
            if module_root != root:
                raise MonorepoError(f"{module}: raiz Git divergente: {module_root}")
    except MonorepoError as error:
        raise MonorepoError(
            f"{root} não representa o monorepo Specsfy: {error}"
        ) from error

    tracked = [line for line in git(root, "ls-files").splitlines() if line]
    status = [line for line in git(root, "status", "--short").splitlines() if line]
    modules = []
    for module in MODULES:
        path = root if module == "." else root / module
        prefix = "" if module == "." else f"{module}/"
        module_files = [name for name in tracked if not prefix or name.startswith(prefix)]
        sources = [
            candidate
            for candidate in SOURCE_CANDIDATES
            if (path / candidate).is_file()
        ]
        modules.append(
            {
                "path": module,
                "tracked_files": len(module_files),
                "sources": sources,
            }
        )

    return {
        "workspace": "promovaweb/specsfy",
        "root": str(root),
        "remote": remote,
        "branch": git(root, "branch", "--show-current"),
        "head": git(root, "rev-parse", "HEAD"),
        "dirty": bool(status),
        "changes": status,
        "tracked_files": len(tracked),
        "modules": modules,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Coleta evidência somente leitura do monorepo Specsfy."
    )
    parser.add_argument(
        "--workspace",
        type=Path,
        required=True,
        help="raiz do checkout promovaweb/specsfy",
    )
    return parser.parse_args()


def main() -> int:
    arguments = parse_args()
    try:
        evidence = collect(arguments.workspace)
    except MonorepoError as error:
        print(error, file=sys.stderr)
        return 2
    print(json.dumps(evidence, ensure_ascii=False, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

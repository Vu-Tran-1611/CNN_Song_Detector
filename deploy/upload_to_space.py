"""Upload backend/ to the Hugging Face Space in one commit.

Env: HF_TOKEN (write token), HF_SPACE (e.g. "username/song-detector").
Files in the Space that are no longer in backend/ are deleted, so the Space mirrors the repo.
"""

import fnmatch
import os
from pathlib import Path

from huggingface_hub import CommitOperationAdd, CommitOperationDelete, HfApi

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
SPACE_README = ROOT / "deploy" / "hf-space" / "README.md"

EXCLUDE = [
    ".venv/*",
    ".parity/*",
    ".pytest_cache/*",
    "*__pycache__*",
    "*.pyc",
    "tests/*",
    "scripts/*",
    "README.md",
    "requirements-dev.txt",
    "pyproject.toml",
]
KEEP_REMOTE = {".gitattributes"}


def files_to_upload() -> dict[str, Path]:
    files = {}
    for path in sorted(BACKEND.rglob("*")):
        if not path.is_file():
            continue
        rel = path.relative_to(BACKEND).as_posix()
        if any(fnmatch.fnmatch(rel, pattern) for pattern in EXCLUDE):
            continue
        files[rel] = path
    files["README.md"] = SPACE_README
    return files


def main() -> None:
    space = os.environ["HF_SPACE"]
    api = HfApi(token=os.environ["HF_TOKEN"])
    files = files_to_upload()
    remote = set(api.list_repo_files(space, repo_type="space"))

    operations = [CommitOperationAdd(path_in_repo=rel, path_or_fileobj=str(path)) for rel, path in files.items()]
    operations += [CommitOperationDelete(path_in_repo=rel) for rel in sorted(remote - set(files) - KEEP_REMOTE)]

    sha = os.environ.get("GITHUB_SHA", "local")[:7]
    info = api.create_commit(
        repo_id=space,
        repo_type="space",
        operations=operations,
        commit_message=f"Deploy backend from GitHub {sha}",
    )
    print(f"Uploaded {len(files)} files to {space}: {info.commit_url}")
    for rel in files:
        print("  ", rel)


if __name__ == "__main__":
    main()

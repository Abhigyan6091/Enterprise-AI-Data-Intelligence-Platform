"""File loaders for different document types."""

from pathlib import Path
from typing import Optional


def load_markdown(file_path: str) -> str:
    """Load and parse markdown file."""
    with open(file_path, "r", encoding="utf-8") as f:
        return f.read()


def load_text(file_path: str) -> str:
    """Load plain text file."""
    with open(file_path, "r", encoding="utf-8") as f:
        return f.read()


def load_sql(file_path: str) -> str:
    """Load SQL file."""
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
        # Add context for SQL files
        return f"SQL File: {Path(file_path).name}\n\n{content}"


def load_python(file_path: str) -> str:
    """Load Python source file."""
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
        # Add context for Python files
        return f"Python Source: {Path(file_path).name}\n\n{content}"


def load_csv(file_path: str) -> str:
    """Load CSV file as structured text."""
    with open(file_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
        # Include header for context
        if len(lines) > 0:
            header = lines[0].strip()
            content = "".join(lines[:100])  # Limit to first 100 rows
            return f"CSV File: {Path(file_path).name}\nColumns: {header}\n\n{content}"
        return ""


def load_document(file_path: str) -> Optional[str]:
    """Load document from file based on extension."""
    path = Path(file_path)
    
    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")
    
    suffix = path.suffix.lower()
    
    try:
        if suffix == ".md":
            return load_markdown(file_path)
        elif suffix == ".txt":
            return load_text(file_path)
        elif suffix == ".sql":
            return load_sql(file_path)
        elif suffix == ".py":
            return load_python(file_path)
        elif suffix == ".csv":
            return load_csv(file_path)
        else:
            return None
    except (UnicodeDecodeError, IOError) as e:
        print(f"Warning: Could not read file {file_path}: {e}")
        return None


def discover_files(directory: str, extensions: list[str] = None) -> list[str]:
    """Recursively discover files of supported types."""
    if extensions is None:
        extensions = [".md", ".txt", ".sql", ".py", ".csv"]
    
    dir_path = Path(directory)
    if not dir_path.exists():
        raise FileNotFoundError(f"Directory not found: {directory}")
    
    files = []
    for ext in extensions:
        files.extend(dir_path.rglob(f"*{ext}"))
    
    return sorted([str(f) for f in files])

"""Text chunking strategies for documents."""

from dataclasses import dataclass


@dataclass
class Chunk:
    """Represents a chunk of text with metadata."""
    text: str
    chunk_id: int
    source_file: str
    file_type: str


def chunk_by_paragraphs(
    text: str,
    source_file: str,
    file_type: str,
    min_chunk_size: int = 256,
    max_chunk_size: int = 1024,
) -> list[Chunk]:
    """
    Chunk text by paragraphs with size constraints.
    
    Args:
        text: Document text to chunk
        source_file: Source file path
        file_type: File extension (e.g., ".md", ".py")
        min_chunk_size: Minimum chunk size in characters
        max_chunk_size: Maximum chunk size in characters
    
    Returns:
        List of Chunk objects
    """
    # Split by double newlines (paragraph breaks)
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    
    chunks = []
    current_chunk = ""
    chunk_id = 0
    
    for para in paragraphs:
        # Add paragraph to current chunk
        if current_chunk:
            test_chunk = current_chunk + "\n\n" + para
        else:
            test_chunk = para
        
        # Check if adding this paragraph exceeds max size
        if len(test_chunk) > max_chunk_size and current_chunk:
            # Save current chunk and start new one
            chunks.append(
                Chunk(
                    text=current_chunk,
                    chunk_id=chunk_id,
                    source_file=source_file,
                    file_type=file_type,
                )
            )
            chunk_id += 1
            current_chunk = para
        else:
            current_chunk = test_chunk
    
    # Add remaining chunk
    if current_chunk and len(current_chunk) >= min_chunk_size:
        chunks.append(
            Chunk(
                text=current_chunk,
                chunk_id=chunk_id,
                source_file=source_file,
                file_type=file_type,
            )
        )
    
    return chunks


def chunk_by_lines(
    text: str,
    source_file: str,
    file_type: str,
    lines_per_chunk: int = 20,
    overlap: int = 2,
) -> list[Chunk]:
    """
    Chunk text by line count with overlap.
    Useful for code and SQL files.
    
    Args:
        text: Document text to chunk
        source_file: Source file path
        file_type: File extension
        lines_per_chunk: Number of lines per chunk
        overlap: Number of overlapping lines
    
    Returns:
        List of Chunk objects
    """
    lines = text.split("\n")
    chunks = []
    chunk_id = 0
    
    for i in range(0, len(lines), lines_per_chunk - overlap):
        chunk_lines = lines[i : i + lines_per_chunk]
        chunk_text = "\n".join(chunk_lines).strip()
        
        if chunk_text:  # Only add non-empty chunks
            chunks.append(
                Chunk(
                    text=chunk_text,
                    chunk_id=chunk_id,
                    source_file=source_file,
                    file_type=file_type,
                )
            )
            chunk_id += 1
    
    return chunks


def chunk_document(
    text: str,
    source_file: str,
    file_type: str,
) -> list[Chunk]:
    """
    Intelligently chunk document based on file type.
    
    Args:
        text: Document text
        source_file: Source file path
        file_type: File extension
    
    Returns:
        List of Chunk objects
    """
    if not text or len(text.strip()) == 0:
        return []
    
    # Use different chunking strategies based on file type
    if file_type in [".py", ".sql"]:
        # Code files: chunk by lines with overlap
        return chunk_by_lines(text, source_file, file_type)
    else:
        # Documents: chunk by paragraphs
        return chunk_by_paragraphs(text, source_file, file_type)

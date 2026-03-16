"""
Document processing services.
"""
import logging
import os
import re
from typing import List, Dict, Any, Optional

from django.conf import settings

logger = logging.getLogger('ai_doc')


class DocumentProcessor:
    """Process documents and extract text content."""

    def __init__(self):
        self.chunk_size = 1000
        self.chunk_overlap = 200

    def process_document(self, document) -> Dict[str, Any]:
        """
        Process a document and extract text content.

        Args:
            document: Document model instance

        Returns:
            Dict with extracted text and metadata
        """
        file_type = document.file_type

        try:
            # Open file as stream
            with document.file.open('rb') as f:
                if file_type == 'pdf':
                    return self._process_pdf(f)
                elif file_type == 'docx':
                    return self._process_docx(f)
                elif file_type == 'doc':
                    return self._process_doc(f)
                elif file_type == 'txt':
                    # For txt, we might need a text wrapper or read carefully
                    return self._process_txt(f)
                else:
                    raise ValueError(f"Unsupported file type: {file_type}")
        except Exception as e:
            logger.error(f"Error processing document {document.id}: {str(e)}")
            raise

    def _process_pdf(self, file_stream) -> Dict[str, Any]:
        """Process PDF document."""
        try:
            from pypdf import PdfReader

            reader = PdfReader(file_stream)
            pages = []
            full_text = ""

            for page_num, page in enumerate(reader.pages, 1):
                text = page.extract_text() or ""
                pages.append({
                    'page_number': page_num,
                    'text': text.strip()
                })
                full_text += text + "\n\n"

            return {
                'text': full_text.strip(),
                'pages': pages,
                'page_count': len(reader.pages),
                'word_count': len(full_text.split()),
            }
        except ImportError:
            logger.warning("pypdf not installed, using fallback")
            return self._fallback_extraction(file_stream)

    def _process_docx(self, file_stream) -> Dict[str, Any]:
        """Process DOCX document."""
        try:
            from docx import Document as DocxDocument

            doc = DocxDocument(file_stream)
            paragraphs = []
            full_text = ""

            for para in doc.paragraphs:
                if para.text.strip():
                    paragraphs.append(para.text.strip())
                    full_text += para.text + "\n\n"

            return {
                'text': full_text.strip(),
                'pages': [{'page_number': 1, 'text': full_text}],  # DOCX doesn't have pages
                'page_count': 1,
                'word_count': len(full_text.split()),
            }
        except ImportError:
            logger.warning("python-docx not installed, using fallback")
            return self._fallback_extraction(file_stream)

    def _process_doc(self, file_stream) -> Dict[str, Any]:
        """Process legacy DOC document."""
        # For DOC files, we'll try fallback extraction
        # In a real-world scenario, you might want to use textract or mammoth
        return self._fallback_extraction(file_stream)

    def _process_txt(self, file_stream) -> Dict[str, Any]:
        """Process TXT document."""
        text = file_stream.read().decode('utf-8', errors='ignore')

        return {
            'text': text.strip(),
            'pages': [{'page_number': 1, 'text': text}],
            'page_count': 1,
            'word_count': len(text.split()),
        }

    def _fallback_extraction(self, file_stream) -> Dict[str, Any]:
        """Fallback text extraction."""
        try:
            # Seek back to start if needed
            if hasattr(file_stream, 'seek'):
                file_stream.seek(0)
            text = file_stream.read().decode('utf-8', errors='ignore')
            return {
                'text': text,
                'pages': [{'page_number': 1, 'text': text}],
                'page_count': 1,
                'word_count': len(text.split()),
            }
        except:
            return {
                'text': '',
                'pages': [],
                'page_count': 0,
                'word_count': 0,
            }

    def chunk_text(self, text: str, metadata: Optional[Dict] = None) -> List[Dict[str, Any]]:
        """
        Split text into chunks for embedding.

        Args:
            text: Full document text
            metadata: Optional metadata to include with chunks

        Returns:
            List of chunk dictionaries
        """
        if not text:
            return []

        chunks = []
        start = 0
        chunk_index = 0

        while start < len(text):
            # Find end of chunk
            end = start + self.chunk_size

            # Try to end at a sentence boundary
            if end < len(text):
                # Look for sentence ending punctuation
                sentence_end = max(
                    text.rfind('. ', start, end),
                    text.rfind('? ', start, end),
                    text.rfind('! ', start, end),
                    text.rfind('\n', start, end),
                )
                if sentence_end > start + self.chunk_size // 2:
                    end = sentence_end + 1

            chunk_text = text[start:end].strip()

            if chunk_text:
                chunks.append({
                    'content': chunk_text,
                    'chunk_index': chunk_index,
                    'start_char': start,
                    'end_char': end,
                    'token_count': len(chunk_text.split()),
                    'metadata': metadata or {},
                })
                chunk_index += 1

            # Move start with overlap
            start = end - self.chunk_overlap if end < len(text) else len(text)

        return chunks

    def estimate_tokens(self, text: str) -> int:
        """Estimate token count for text."""
        # Rough estimation: ~4 characters per token
        return len(text) // 4


class TextCleaner:
    """Clean and normalize text content."""

    @staticmethod
    def clean_text(text: str) -> str:
        """Clean text by removing extra whitespace and special characters."""
        # Remove multiple spaces
        text = re.sub(r'\s+', ' ', text)

        # Remove multiple newlines
        text = re.sub(r'\n{3,}', '\n\n', text)

        # Remove leading/trailing whitespace from lines
        lines = [line.strip() for line in text.split('\n')]
        text = '\n'.join(line for line in lines if line)

        return text.strip()

    @staticmethod
    def remove_headers_footers(text: str) -> str:
        """Remove common headers and footers from text."""
        # Remove page numbers
        text = re.sub(r'\n\s*\d+\s*\n', '\n', text)
        text = re.sub(r'\n\s*Page \d+\s*\n', '\n', text, flags=re.IGNORECASE)

        return text

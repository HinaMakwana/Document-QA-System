"""
Vector store and embedding services.
"""
import logging
import os
import threading
import time
from typing import List, Dict, Any, Optional

from django.conf import settings

logger = logging.getLogger('ai_doc')

# Global lock for ChromaDB client initialization to prevent race conditions in multi-threaded/async environments
_chroma_lock = threading.Lock()


class EmbeddingService:
    """Service for generating embeddings using HuggingFace sentence-transformers."""

    _instance = None
    _model = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        self.model_name = getattr(settings, 'EMBEDDING_MODEL', 'all-MiniLM-L6-v2')

    def _get_model(self):
        """Lazy load the embedding model."""
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer
                self._model = SentenceTransformer(self.model_name, device='cpu')
                logger.info(f"Loaded embedding model: {self.model_name}")
            except ImportError:
                logger.error("sentence-transformers not installed")
                raise ImportError("Please install sentence-transformers: pip install sentence-transformers")
        return self._model

    def get_embedding(self, text: str) -> List[float]:
        """Generate embedding for a single text."""
        model = self._get_model()
        embedding = model.encode(text, convert_to_numpy=True)
        return embedding.tolist()

    def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts."""
        if not texts:
            return []

        model = self._get_model()
        embeddings = model.encode(texts, convert_to_numpy=True, show_progress_bar=True)
        return embeddings.tolist()

    @property
    def dimension(self) -> int:
        """Get embedding dimension."""
        model = self._get_model()
        return model.get_sentence_embedding_dimension()


class VectorStoreService:
    """Service for managing ChromaDB vector store."""

    _instance = None
    _client = None
    _collection = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        self.persist_directory = getattr(settings, 'CHROMA_PERSIST_DIRECTORY', './chroma_db')
        self.collection_name = getattr(settings, 'CHROMA_COLLECTION_NAME', 'documents')
        self.embedding_service = EmbeddingService()

    def _get_client(self):
        """Get ChromaDB client with thread-safe initialization."""
        if self._client is None:
            with _chroma_lock:
                # Double-check after acquiring lock
                if self._client is not None:
                    return self._client
                
                try:
                    import chromadb
                    from chromadb.config import Settings

                    # Ensure directory exists
                    os.makedirs(self.persist_directory, exist_ok=True)

                    # Use a slightly more robust initialization for PersistentClient
                    # The KeyError '/app/chroma_db' often happens when multiple threads 
                    # attempt to register the same path in Chroma's shared client registry.
                    # We add a small retry loop and explicitly check for the registry issue.
                    
                    for attempt in range(3):
                        try:
                            self._client = chromadb.PersistentClient(
                                path=self.persist_directory,
                                settings=Settings(
                                    anonymized_telemetry=False,
                                    allow_reset=True,
                                    is_persistent=True,
                                )
                            )
                            break
                        except Exception as e:
                            if "bindings" in str(e) or attempt == 2:
                                raise
                            logger.warning(f"ChromaDB init attempt {attempt+1} failed: {str(e)}. Retrying...")
                            time.sleep(0.5)

                    logger.info(f"ChromaDB client initialized at {self.persist_directory}")
                except ImportError:
                    logger.error("chromadb not installed")
                    raise ImportError("Please install chromadb: pip install chromadb")
                except Exception as e:
                    logger.error(f"Failed to initialize ChromaDB client: {str(e)}")
                    # Try to get an existing client from ChromaDB's own registry if possible
                    try:
                        import chromadb
                        self._client = chromadb.PersistentClient(path=self.persist_directory)
                        logger.info("Recovered ChromaDB client from registry")
                    except:
                        raise e
        return self._client

    def _get_collection(self):
        """Get or create the document collection."""
        if self._collection is None:
            client = self._get_client()
            self._collection = client.get_or_create_collection(
                name=self.collection_name,
                metadata={"hnsw:space": "cosine"}
            )
            logger.info(f"Using collection: {self.collection_name}")
        return self._collection

    def add_documents(
        self,
        ids: List[str],
        documents: List[str],
        metadatas: Optional[List[Dict[str, Any]]] = None,
        embeddings: Optional[List[List[float]]] = None
    ) -> bool:
        """
        Add documents to the vector store.

        Args:
            ids: Unique identifiers for documents
            documents: Text content of documents
            metadatas: Optional metadata for each document
            embeddings: Optional pre-computed embeddings

        Returns:
            True if successful
        """
        if not ids or not documents:
            return False

        try:
            collection = self._get_collection()

            # Generate embeddings if not provided
            if embeddings is None:
                embeddings = self.embedding_service.get_embeddings(documents)

            # Ensure metadata is provided
            if metadatas is None:
                metadatas = [{}] * len(documents)

            collection.add(
                ids=ids,
                documents=documents,
                embeddings=embeddings,
                metadatas=metadatas
            )

            logger.info(f"Added {len(ids)} documents to vector store")
            return True

        except Exception as e:
            logger.error(f"Error adding documents to vector store: {str(e)}")
            raise

    def search(
        self,
        query: str,
        n_results: int = 5,
        filter_metadata: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for similar documents.

        Args:
            query: Search query text
            n_results: Number of results to return
            filter_metadata: Optional metadata filter

        Returns:
            List of search results with scores
        """
        try:
            collection = self._get_collection()

            # Generate query embedding
            query_embedding = self.embedding_service.get_embedding(query)

            # Prepare search kwargs
            search_kwargs = {
                "query_embeddings": [query_embedding],
                "n_results": n_results,
                "include": ["documents", "metadatas", "distances"]
            }

            if filter_metadata:
                search_kwargs["where"] = filter_metadata

            results = collection.query(**search_kwargs)

            # Format results
            formatted_results = []
            if results and results['ids'] and len(results['ids']) > 0:
                for i, doc_id in enumerate(results['ids'][0]):
                    formatted_results.append({
                        'id': doc_id,
                        'content': results['documents'][0][i] if results.get('documents') else None,
                        'metadata': results['metadatas'][0][i] if results.get('metadatas') else {},
                        'distance': results['distances'][0][i] if results.get('distances') else None,
                        'score': 1 - results['distances'][0][i] if results.get('distances') else None,
                    })

            return formatted_results

        except Exception as e:
            logger.error(f"Error searching vector store: {str(e)}")
            raise

    def search_by_document(
        self,
        query: str,
        document_ids: List[str],
        n_results: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Search within specific documents.

        Args:
            query: Search query text
            document_ids: List of document IDs to search within
            n_results: Number of results to return

        Returns:
            List of search results
        """
        if not document_ids:
            return []

        # ChromaDB filter for multiple document IDs
        if len(document_ids) == 1:
            filter_metadata = {"document_id": document_ids[0]}
        else:
            filter_metadata = {"document_id": {"$in": document_ids}}

        return self.search(query, n_results, filter_metadata)

    def delete_document(self, document_id: str) -> bool:
        """
        Delete all chunks for a document from the vector store.

        Args:
            document_id: Document ID to delete

        Returns:
            True if successful
        """
        try:
            collection = self._get_collection()

            # Delete by document_id metadata filter
            collection.delete(
                where={"document_id": document_id}
            )

            logger.info(f"Deleted document {document_id} from vector store")
            return True

        except Exception as e:
            logger.error(f"Error deleting document from vector store: {str(e)}")
            return False

    def get_document_chunks(self, document_id: str, n_results: int = 5) -> List[Dict[str, Any]]:
        """
        Get specifically indexed chunks for a document without vector search.
        Useful for getting the beginning of a document.
        """
        try:
            collection = self._get_collection()
            results = collection.get(
                where={"document_id": document_id},
                limit=n_results,
                include=["documents", "metadatas"]
            )

            formatted_results = []
            if results and results['ids']:
                for i, doc_id in enumerate(results['ids']):
                    formatted_results.append({
                        'id': doc_id,
                        'content': results['documents'][i] if results.get('documents') else None,
                        'metadata': results['metadatas'][i] if results.get('metadatas') else {},
                        'score': 1.0,  # Manual selection, so score is absolute
                    })
            return formatted_results
        except Exception as e:
            logger.error(f"Error getting document chunks: {str(e)}")
            return []

    def get_collection_stats(self) -> Dict[str, Any]:
        """Get statistics about the vector store collection."""
        try:
            collection = self._get_collection()
            count = collection.count()

            return {
                'collection_name': self.collection_name,
                'document_count': count,
                'persist_directory': self.persist_directory,
            }
        except Exception as e:
            logger.error(f"Error getting collection stats: {str(e)}")
            return {}


class RAGService:
    """Service for RAG (Retrieval-Augmented Generation) operations."""

    def __init__(self):
        self.vector_store = VectorStoreService()

    def retrieve_context(
        self,
        query: str,
        document_ids: Optional[List[str]] = None,
        n_results: int = 5,
        min_score: float = 0.1
    ) -> List[Dict[str, Any]]:
        """
        Retrieve relevant context for a query.

        Args:
            query: User's question
            document_ids: Optional list of document IDs to search within
            n_results: Maximum number of results
            min_score: Minimum similarity score threshold

        Returns:
            List of relevant document chunks with metadata
        """
        if document_ids:
            results = self.vector_store.search_by_document(query, document_ids, n_results)
        else:
            results = self.vector_store.search(query, n_results)

        # Filter by minimum score
        filtered_results = [r for r in results if r.get('score', 0) >= min_score]

        return filtered_results

    def fetch_intro_chunks(self, document_ids: List[str], n_chunks_per_doc: int = 2) -> List[Dict[str, Any]]:
        """
        Fetch introductory chunks for a list of documents.
        """
        all_results = []
        for doc_id in document_ids:
            chunks = self.vector_store.get_document_chunks(doc_id, n_results=n_chunks_per_doc)
            all_results.extend(chunks)
        return all_results

    def format_context(self, results: List[Dict[str, Any]]) -> str:
        """
        Format retrieved results into context string for LLM.

        Args:
            results: List of search results

        Returns:
            Formatted context string
        """
        if not results:
            return ""

        context_parts = []
        for i, result in enumerate(results, 1):
            doc_title = result.get('metadata', {}).get('document_title', 'Unknown Document')
            page_num = result.get('metadata', {}).get('page_number', 'N/A')
            content = result.get('content', '')

            context_parts.append(
                f"[Source {i}: {doc_title}, Page {page_num}]\n{content}"
            )

        return "\n\n---\n\n".join(context_parts)

    def get_citations(self, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Extract citation information from results.

        Args:
            results: List of search results

        Returns:
            List of citation objects
        """
        citations = []
        for i, result in enumerate(results, 1):
            metadata = result.get('metadata', {})
            citations.append({
                'source_number': i,
                'document_id': metadata.get('document_id'),
                'document_title': metadata.get('document_title', 'Unknown'),
                'chunk_index': metadata.get('chunk_index'),
                'page_number': metadata.get('page_number'),
                'score': round(result.get('score', 0), 4),
                'content_preview': result.get('content', '')[:200] + '...' if len(result.get('content', '')) > 200 else result.get('content', ''),
            })
        return citations

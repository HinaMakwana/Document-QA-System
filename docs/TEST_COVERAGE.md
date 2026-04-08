# 📊 Test Coverage Report

This document provides a detailed breakdown of the test coverage for the AI Document Q&A System backend.

## 📈 Coverage Summary

| Metric | Value |
| :--- | :--- |
| **Total Coverage** | **48%** |
| **Pass/Fail** | ✅ **6 Passed** |
| **Test Suite** | Pytest-Django |

---

## 🏗️ Component Breakdown

The following table shows the coverage for major backend modules as of April 2026.

| Module | Lines of Code | Coverage | Key Files |
| :--- | :--- | :--- | :--- |
| **Accounts** | 240 | **100%** | `models.py`, `views.py` |
| **Documents** | 350 | **35%** | `models.py`, `tasks.py` |
| **Conversations** | 420 | **52%** | `consumers.py`, `services.py` |
| **Embeddings** | 200 | **100%** | `services.py` |
| **Analytics** | 150 | **0%** | (Planned) |

---

## 🛠️ How to Generate Reports

To generate the latest coverage report locally, follow these steps:

### 1. Prerequisites
Ensure you have the virtual environment activated and `pytest-cov` installed.

```bash
cd backend
source venv/bin/activate
pip install pytest-django pytest-cov
```

### 2. Run Terminal Report
Generates a summary directly in your shell.

```bash
pytest --cov=. --cov-report=term-missing
```

### 3. Generate HTML Report
Generates a detailed interactive report in the `htmlcov/` directory.

```bash
pytest --cov=. --cov-report=html
open htmlcov/index.html
```

---

## 🎯 Next Milestone Goals

- [ ] Increase **Documents** coverage to 70% by testing edge case file uploads (corrupt PDFs, non-text images).
- [ ] Implement unit tests for **Analytics** module.
- [ ] Add integration tests for **WebSocket streaming** responses.

---

> [!CAUTION]
> Tests that interact with the ChromaDB vector store or Google Gemini API are currently mocked to avoid API costs and environment dependencies during testing.

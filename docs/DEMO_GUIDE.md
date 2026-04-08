# 🎬 Project Demo Guide

This guide explains how to record a high-quality demonstration of the AI Document Q&A System to showcase its capabilities to stakeholders.

---

## 🛠️ Preparation

Before recording, ensure all services are running smoothly:

1.  **Redis**: `redis-server`
2.  **Celery Worker**: `celery -A config worker -l info`
3.  **Backend Server**: `python manage.py runserver`
4.  **Frontend Server**: `npm run dev`

### Recommended Data
- **Sample PDF**: A technical document (e.g., "Python Beginner Guide").
- **Sample PDF**: A business document (e.g., "Quarterly Report").

---

## 📽️ Recording Script (Suggested)

| Duration | Scene | Key Feature to Highlight |
| :--- | :--- | :--- |
| **0:00 - 0:15** | Landing Page | Clean, modern UI and authentication flow. |
| **0:15 - 0:45** | Document Upload | Drag-and-drop upload and background processing (Celery). |
| **0:45 - 1:30** | Semantic Search | Searching for concepts, not just keywords. |
| **1:30 - 3:00** | AI Chat | Real-time streaming (WebSockets) and context-aware answers. |
| **3:00 - 3:30** | Citations | Showing exactly where the AI pulled data from. |

---

## 🖥️ Screen Recording Tools

- **Loom** (Recommended): Great for sharing a quick URL and includes a camera bubble.
- **OBS Studio**: Best for high-quality production with custom overlays.
- **QuickTime (macOS)**: Simple and built-in.

---

## 📤 How to Add to README

Once recorded:
1.  Upload the video to **YouTube** (Unlisted), **Vimeo**, or host it in a cloud storage bucket.
2.  Get the thumbnail image URL.
3.  Update the root `README.md` placeholder:

```markdown
[![Demo Video](YOUR_THUMBNAIL_URL)](YOUR_VIDEO_URL)
```

---

> [!TIP]
> **Pro Tip**: Use a screen recording resolution of 1080p for clarity. If the AI is slow due to API limits, you can speed up that section of the video in post-production to keep the demo snappy!

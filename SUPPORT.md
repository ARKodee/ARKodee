# 📞 Support Guidelines

Welcome to Arkodee developer support! If you have encountered a bug, have questions about the sandbox architecture, or need help setting up the services locally, please consult this document.

---

## 🔍 Self-Help & Documentation

Before raising support requests, check the following resources in the repository:
* **Local Setup Guide**: Refer to [`CONTRIBUTING.md`](CONTRIBUTING.md) for step-by-step local service installation.
* **Sandbox Settings**: Inspect [`apps/backend/apps/problems/sandbox.py`](apps/backend/apps/problems/sandbox.py) to check local compiler locations and settings.
* **API Endpoints**: Inspect [`apps/backend/apps/problems/views.py`](apps/backend/apps/problems/views.py) or relevant view modules to inspect REST endpoint routes.

---

## 🛠️ Raising Issues & Bug Reports

If you find a bug in the application (such as UI display glitches, ELO standing calculation errors, or WebSocket connection drops):
1. Search the **GitHub Issues** tab to verify it hasn't been reported or fixed in a recent branch.
2. Open a new issue with:
   * A descriptive title.
   * Clear steps to reproduce the bug.
   * Expected vs. actual behavior.
   * Console warnings, traceback logs, or screenshots.

---

## ✉️ Reaching the Project Owners

For sensitive questions, private inquiries, Google OAuth client credentials setup, database admin credentials queries, or other questions that should not be shared publicly:

* **Primary Maintainer & Owner**: Nihar Kakani
* **Direct Email Contact**: [niharkakani@gmail.com](mailto:niharkakani@gmail.com)
* **Response SLA**: We try to respond to all developer queries within **1-2 business days**.

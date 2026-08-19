# ⚔️ Arkodee (ARKode) — The Coding Battle Arena

[![Version](https://img.shields.io/badge/version-1.0.0-indigo.svg)](https://github.com/ARKodee/ARKodee)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-web-blue.svg)](https://github.com/ARKodee/ARKodee)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/python-%3E%3D3.11-yellow.svg)](https://www.python.org/)

> **What if competitive programming felt less like an exam and more like an arcade game?** 
> 
> Welcome to **Arkodee** — a real-time, gamified coding arena where speed, problem-solving, and combat strategy collide. Instead of just writing code in isolation, you engage in tactical 1v1 duels, spending Action Points (AP) to disrupt your opponent's workspace with sabotages or shield yourself from incoming attacks. It's the ultimate arcade for coders.

---

## 📖 Document Hierarchy & Navigation

* [1. The Rationale: Why Arkodee?](#-the-rationale-why-arkodee)
* [2. How it Works: The Combat Loop](#-how-it-works-the-combat-loop)
* [3. Core Architecture & Tech Stack](#-core-architecture--tech-stack)
* [4. Repository Directory Structure](#-repository-directory-structure)
* [5. Guidelines & Policies](#-guidelines--policies)
  * [Developer Contribution & Setup Guide](CONTRIBUTING.md)
  * [Security Policy & Disclosures](SECURITY.md)
  * [Support & Contact Information](SUPPORT.md)

---

## 💡 The Rationale: Why Arkodee?

Traditional competitive programming platforms (like LeetCode, Codeforces, or HackerRank) are excellent for training algorithms, but they lack real-time engagement and interactivity. You write code, hit submit, and wait for a static green checkmark. 

**Arkodee changes the game.** We built Arkodee to introduce:
1. **Active Gamification**: A battle economy powered by passively regenerating Action Points (AP). You aren't just coding; you are resource-managing.
2. **Real-time Interaction**: A live socket-driven interface that lets you see your opponent's progress bar, solved status, and ELO standing in real-time.
3. **Tactical Combat**: A system of offensive sabotages and defensive counters that tests your resilience and adaptability under pressure.

---

## 🎮 How it Works: The Combat Loop

Every 1v1 match is a tactical race. Both players receive a set of 4 programming problems to solve. During the duel, you regenerate **1 AP every 5 seconds**. You can use this AP to deploy tactical maneuvers:

### 🔴 Offensive Sabotages
* **Lock Editor (Cost: 50 AP)**: Freeze your opponent's code editor completely for 10 seconds.
* **Scramble Layout (Cost: 40 AP)**: Scramble your opponent's code formatting randomly, forcing them to spend valuable seconds re-organizing it.
* **Blindfold (Cost: 35 AP)**: Hide the problem statement and description from your opponent's viewport for 15 seconds.

### 🔵 Defensive Counters
* **Shield (Cost: 30 AP)**: Active for 15 seconds. Blocks any incoming sabotage cast by your opponent.
* **Cleanse (Cost: 20 AP)**: Instantly purge all active sabotages currently affecting your editor and restore normal workspace access immediately.

---

## 🛠️ Core Architecture & Tech Stack

Arkodee is built with a highly decoupled, modern microservices architecture to ensure sub-millisecond event transmission and secure execution:

* **Frontend SPA (React + Vite + Tailwind CSS)**:
  * Responsive combat HUD including ELO badges, live progress indicators, active countdown overlays, and a custom-integrated Monaco code editor.
  * Real-time state synchronization with the WebSocket layer.
* **WebSocket Service (Node.js + Socket.io)**:
  * Manages active lobbies, private matchmaking codes, live AP regeneration loops, and instantaneous event broadcasting (e.g., matchmaker pairings, sabotage transmissions).
* **REST Backend API (Django REST Framework + PostgreSQL)**:
  * Core database engine handling user authentication (with Google OAuth 2 integration), ELO rating history, contest scheduling, and persistent statistics.
* **Secure Sandbox Runner**:
  * An isolated subprocess execution engine built inside the Django layer. Evaluates Python, C++, Java, and JavaScript solutions against dynamic database testcases with complete compiler error sanitization.

---

## 📂 Repository Directory Structure

```
ARKodee/
├── apps/
│   ├── backend/               # Django REST Framework backend API
│   │   ├── apps/
│   │   │   ├── auth/          # User authentication (Email check, Google OAuth 2)
│   │   │   ├── problems/      # Code execution sandbox, testcase evaluators, database schemas
│   │   │   ├── contests/      # Scheduled tournament logic & standings computation
│   │   │   └── duels/         # ELO rating calculation & history records
│   │   └── config/            # Django settings, middleware routing, WSGI/ASGI setup
│   │
│   ├── web/                   # Vite + React Single-Page Application (Frontend)
│   │   ├── src/
│   │   │   ├── components/    # Layout, Arena, Contests, Profile, and UI widgets
│   │   │   └── pages/         # Dashboard, Arena1v1, Contests, Profile views
│   │   └── package.json
│   │
│   └── websocket-service/     # Node.js + Socket.io WebSocket Server
│       ├── src/
│       │   ├── socket/        # Socket connection routing & lobby event listeners
│       │   └── matchmaker.js  # Public matchmaking queue, passive AP regeneration
│       └── package.json
│
├── .env.example               # Root environment variables template
├── CONTRIBUTING.md            # Setup guidelines, branch rules, and contribution workflow
├── SECURITY.md                # Vulnerability reporting & security contact details
└── SUPPORT.md                 # Contact details, bug reporting, and developer support
```

---

## 🚀 Quick Setup Reference

To spin up your local instance of Arkodee, you will need to start the three core apps:
1. **Backend API**: Set up python virtual environment, install packages from `apps/backend/requirements.txt`, run migrations, and run `python manage.py runserver`.
2. **WebSocket Microservice**: Install dependencies in `apps/websocket-service/` and run `npm run dev`.
3. **Frontend Client**: Install dependencies in `apps/web/` and run `npm run dev`.

For step-by-step instructions on environment configs and running testing suites, consult the [Developer Contribution Guide](CONTRIBUTING.md).

---

## 🤝 Guidelines & Policies

* **Contributions & Local Setup**: Please review [CONTRIBUTING.md](CONTRIBUTING.md) for local configuration and branch standards.
* **Security & Sandboxing**: For reporting sandbox escape exploits or auth vulnerabilities, see [SECURITY.md](SECURITY.md).
* **Support & Owners Contact**: If you have general queries, need help, or want to reach the project owners privately, refer to [SUPPORT.md](SUPPORT.md).

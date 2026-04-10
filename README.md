# 🤖 Mini Project

A full-stack AI Agent application built with a React frontend, a Node.js/Express API layer, and a Python-powered agent backend. Deployed on Vercel.

---

## 📁 Project Structure

```
Mini-project/
├── Agent/          # Python-based AI agent logic
├── api/            # Node.js/Express backend API
├── client/         # React frontend (Vite)
├── .vite/          # Vite build cache
├── .gitignore
└── package-lock.json
```

---

## 🚀 Features

- 🧠 **AI Agent** — Python agent that handles intelligent task execution
- 🔌 **REST API** — Node.js/Express server bridging the frontend and the agent
- ⚡ **React + Vite Frontend** — Fast, modern UI for interacting with the agent
- ☁️ **Vercel Deployment** — Hosted and deployed via Vercel

---

## 🛠️ Tech Stack

| Layer     | Technology            |
|-----------|-----------------------|
| Frontend  | React, Vite           |
| Backend   | Node.js, Express      |
| Agent     | Python                |
| Hosting   | Vercel                |

---

## ⚙️ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Python](https://www.python.org/) (v3.9+)
- npm

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/SaranshUpadhyay07/Mini-project.git
   cd Mini-project
   ```

2. **Install Node.js dependencies**
   ```bash
   npm install
   ```

3. **Install Python dependencies**
   ```bash
   cd Agent
   pip install -r requirements.txt
   cd ..
   ```

### Running Locally

1. **Start the Python Agent**
   ```bash
   cd Agent
   python main.py
   ```

2. **Start the API server**
   ```bash
   cd api
   node index.js
   ```

3. **Start the React frontend**
   ```bash
   cd client
   npm run dev
   ```

4. Open your browser at `http://localhost:5173`

---

## 🌐 Live Demo

[mini-project-mu-one.vercel.app](https://mini-project-mu-one.vercel.app)

---

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

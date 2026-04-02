# My-To-Do-List

# 📋 Dynamic To-Do List Application

A full-stack To-Do List with CRUD, persistent database, and a polished dark UI.

---

## 🗂 Project Structure

```
dynamic_todo_list/
├── frontend/
│   ├── index.html    ← Main UI
│   ├── style.css     ← Styling
│   └── script.js     ← Frontend logic + IndexedDB
└── backend/
    ├── server.js     ← Express REST API
    ├── package.json  ← Dependencies
    └── db.sqlite     ← Auto-created on first run
```

---

## 🚀 Option A — Open Directly (IndexedDB, No Server Needed)

1. Open `frontend/index.html` in any modern browser.
2. Tasks are stored in **IndexedDB** (browser's built-in database).
3. Data **persists** across page refreshes automatically.

---

## 🖥 Option B — Run with Node.js Backend (SQLite)

### Prerequisites
- [Node.js](https://nodejs.org/) v16+

### Setup

```bash
# 1. Go to backend folder
cd dynamic_todo_list/backend

# 2. Install dependencies
npm install

# 3. Start the server
npm start
```

4. Open browser at: `http://localhost:3000`

---

## 📡 REST API Reference

| Method | Endpoint              | Description         |
|--------|-----------------------|---------------------|
| GET    | `/tasks`              | Get all tasks       |
| POST   | `/tasks`              | Add a new task      |
| PUT    | `/tasks/:id`          | Update a task       |
| PATCH  | `/tasks/:id/status`   | Toggle completed    |
| DELETE | `/tasks/:id`          | Delete a task       |

### Example Requests

**Add Task (POST /tasks)**
```json
{
  "title": "Buy groceries",
  "description": "Milk, eggs, bread",
  "priority": "High",
  "dueDate": "2025-03-10"
}
```

**Response:**
```json
{
  "success": true,
  "task": {
    "id": 1,
    "title": "Buy groceries",
    "priority": "High",
    "isDone": 0,
    "createdAt": "2025-03-05T10:30:00.000Z"
  }
}
```

---

## 🗄 Database Schema

```sql
CREATE TABLE tasks (
  id          INTEGER  PRIMARY KEY AUTOINCREMENT,
  title       TEXT     NOT NULL,
  description TEXT     DEFAULT '',
  priority    TEXT     DEFAULT 'Medium',   -- 'Low' | 'Medium' | 'High'
  isDone      INTEGER  DEFAULT 0,          -- 0 = active, 1 = completed
  dueDate     TEXT     DEFAULT NULL,
  createdAt   DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## ✅ Features Implemented

- **Add Task** — title, description, priority, due date
- **Edit Task** — update any field via modal
- **Delete Task** — with smooth animation
- **Toggle Complete** — checkbox with visual feedback
- **Filter** — All / Active / Completed
- **Search** — keyword search on title & description
- **Sort** — Newest / Oldest / Priority / A–Z
- **Export** — Download tasks as JSON
- **Overdue highlight** — past-due tasks flagged in red
- **Input validation** — empty check, max 50 chars
- **Persistent storage** — IndexedDB (frontend) or SQLite (backend)
- **Responsive** — works on mobile & desktop

  ---
  Author """Mohammad Faiz"""
  ---

/**
 * =============================================
 * To-Do List Backend — Node.js + Express + SQLite
 * =============================================
 * REST API:
 *   GET    /tasks            → Fetch all tasks
 *   POST   /tasks            → Add new task
 *   PUT    /tasks/:id        → Update task title/priority
 *   PATCH  /tasks/:id/status → Toggle completed
 *   DELETE /tasks/:id        → Delete task
 *
 * Run:  node server.js
 * =============================================
 */

const express    = require('express');
const Database   = require('better-sqlite3');
const cors       = require('cors');
const path       = require('path');

const app  = express();
const PORT = 3000;

// ---- Middleware ----
app.use(cors());
app.use(express.json());

// Serve frontend files statically
app.use(express.static(path.join(__dirname, '../frontend')));

// ---- Database Setup ----
const db = new Database(path.join(__dirname, 'db.sqlite'));

// Create tasks table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id        INTEGER  PRIMARY KEY AUTOINCREMENT,
    title     TEXT     NOT NULL,
    description TEXT   DEFAULT '',
    priority  TEXT     DEFAULT 'Medium',
    isDone    INTEGER  DEFAULT 0,
    dueDate   TEXT     DEFAULT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

console.log('✅ Database ready: db.sqlite');

// ---- API Routes ----

/**
 * GET /tasks
 * Returns all tasks ordered by newest first
 */
app.get('/tasks', (req, res) => {
  try {
    const tasks = db.prepare('SELECT * FROM tasks ORDER BY createdAt DESC').all();
    res.json({ success: true, tasks });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /tasks
 * Body: { title, description?, priority?, dueDate? }
 * Adds a new task
 */
app.post('/tasks', (req, res) => {
  try {
    const { title, description = '', priority = 'Medium', dueDate = null } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({ success: false, error: 'Title is required.' });
    }
    if (title.length > 50) {
      return res.status(400).json({ success: false, error: 'Title max 50 characters.' });
    }
    if (!['Low', 'Medium', 'High'].includes(priority)) {
      return res.status(400).json({ success: false, error: 'Invalid priority.' });
    }

    const stmt   = db.prepare(
      'INSERT INTO tasks (title, description, priority, dueDate) VALUES (?, ?, ?, ?)'
    );
    const result = stmt.run(title.trim(), description.trim(), priority, dueDate);
    const task   = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({ success: true, task });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /tasks/:id
 * Body: { title, description?, priority?, dueDate? }
 * Updates task title/priority/description/dueDate
 */
app.put('/tasks/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, description = '', priority = 'Medium', dueDate = null } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({ success: false, error: 'Title is required.' });
    }
    if (title.length > 50) {
      return res.status(400).json({ success: false, error: 'Title max 50 characters.' });
    }

    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Task not found.' });
    }

    db.prepare(
      'UPDATE tasks SET title=?, description=?, priority=?, dueDate=? WHERE id=?'
    ).run(title.trim(), description.trim(), priority, dueDate, id);

    const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    res.json({ success: true, task: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /tasks/:id/status
 * Toggles the isDone field (0 ↔ 1)
 */
app.patch('/tasks/:id/status', (req, res) => {
  try {
    const id   = parseInt(req.params.id);
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found.' });
    }

    const newStatus = task.isDone ? 0 : 1;
    db.prepare('UPDATE tasks SET isDone=? WHERE id=?').run(newStatus, id);

    const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    res.json({ success: true, task: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /tasks/:id
 * Removes a task permanently
 */
app.delete('/tasks/:id', (req, res) => {
  try {
    const id   = parseInt(req.params.id);
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found.' });
    }

    db.prepare('DELETE FROM tasks WHERE id=?').run(id);
    res.json({ success: true, message: 'Task deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---- Start Server ----
app.listen(PORT, () => {
  console.log(`\n🚀 Server running at http://localhost:${PORT}`);
  console.log(`📂 Frontend served at http://localhost:${PORT}/`);
  console.log(`📡 API Base URL: http://localhost:${PORT}/tasks\n`);
});

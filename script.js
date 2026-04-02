/**
 * ========================================================
 * My To-Do List — Full CRUD with IndexedDB (Persistent DB)
 * ========================================================
 * IndexedDB = browser's built-in database
 * Data persists across page refreshes and browser restarts.
 *
 * API simulation (mirrors the required REST API spec):
 *   getTasks()          → GET    /tasks
 *   addTask(data)       → POST   /tasks
 *   updateTask(id,data) → PUT    /tasks/:id
 *   toggleTask(id)      → PATCH  /tasks/:id/status
 *   deleteTask(id)      → DELETE /tasks/:id
 * ========================================================
 */

/* ===========================
   DATABASE LAYER (IndexedDB)
=========================== */
const DB_NAME    = 'TodoListDB';
const DB_VERSION = 1;
const STORE_NAME = 'tasks';
let db;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const database = e.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true
        });
        // Indexes for searching/sorting
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('priority',  'priority',  { unique: false });
        store.createIndex('isDone',    'isDone',    { unique: false });
      }
    };

    req.onsuccess = (e) => { db = e.target.result; resolve(db); };
    req.onerror   = (e) => reject(e.target.error);
  });
}

/* --- DB CRUD helpers --- */

function dbGetAll() {
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req   = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function dbAdd(task) {
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req   = store.add(task);
    req.onsuccess = () => resolve({ ...task, id: req.result });
    req.onerror   = () => reject(req.error);
  });
}

function dbGet(id) {
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req   = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function dbPut(task) {
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req   = store.put(task);
    req.onsuccess = () => resolve(task);
    req.onerror   = () => reject(req.error);
  });
}

function dbDelete(id) {
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req   = store.delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror   = () => reject(req.error);
  });
}

/* ===========================
   API LAYER (mirrors REST API)
=========================== */

// GET /tasks
async function getTasks() {
  return await dbGetAll();
}

// POST /tasks
async function addTask({ title, description = '', priority = 'Medium', dueDate = null }) {
  const task = {
    title:       title.trim(),
    description: description.trim(),
    priority,
    isDone:      0,
    dueDate,
    createdAt:   new Date().toISOString()
  };
  return await dbAdd(task);
}

// PUT /tasks/:id
async function updateTask(id, { title, description, priority, dueDate }) {
  const existing = await dbGet(id);
  if (!existing) throw new Error('Task not found');
  const updated = {
    ...existing,
    title:       title.trim(),
    description: description.trim(),
    priority,
    dueDate
  };
  return await dbPut(updated);
}

// PATCH /tasks/:id/status
async function toggleTask(id) {
  const task   = await dbGet(id);
  if (!task) throw new Error('Task not found');
  task.isDone  = task.isDone ? 0 : 1;
  return await dbPut(task);
}

// DELETE /tasks/:id
async function deleteTask(id) {
  return await dbDelete(id);
}

/* ===========================
   APP STATE
=========================== */
let currentFilter = 'all';
let currentSort   = 'newest';
let searchQuery   = '';
let editingId     = null;

/* ===========================
   DOM REFS
=========================== */
const taskTitleEl  = document.getElementById('taskTitle');
const taskDescEl   = document.getElementById('taskDesc');
const taskPrioEl   = document.getElementById('taskPriority');
const taskDueDateEl= document.getElementById('taskDueDate');
const addBtn       = document.getElementById('addBtn');
const formError    = document.getElementById('formError');
const taskList     = document.getElementById('taskList');
const emptyState   = document.getElementById('emptyState');
const searchInput  = document.getElementById('searchInput');
const sortSelect   = document.getElementById('sortSelect');
const filterBtns   = document.querySelectorAll('.filter-btn');
const doneCountEl  = document.getElementById('doneCount');
const totalCountEl = document.getElementById('totalCount');
const charCountEl  = document.getElementById('charCount');
const exportBtn    = document.getElementById('exportBtn');
const editModal    = document.getElementById('editModal');
const editTitleEl  = document.getElementById('editTitle');
const editDescEl   = document.getElementById('editDesc');
const editPrioEl   = document.getElementById('editPriority');
const editDueDateEl= document.getElementById('editDueDate');
const editError    = document.getElementById('editError');
const cancelEdit   = document.getElementById('cancelEdit');
const saveEdit     = document.getElementById('saveEdit');
const toast        = document.getElementById('toast');

/* ===========================
   RENDER
=========================== */
async function render() {
  let tasks = await getTasks();

  // Search
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    tasks = tasks.filter(t =>
      t.title.toLowerCase().includes(q) ||
      (t.description && t.description.toLowerCase().includes(q))
    );
  }

  // Filter
  if (currentFilter === 'active')    tasks = tasks.filter(t => !t.isDone);
  if (currentFilter === 'completed') tasks = tasks.filter(t => t.isDone);

  // Sort
  const PRIO_ORDER = { High: 0, Medium: 1, Low: 2 };
  tasks = tasks.sort((a, b) => {
    switch (currentSort) {
      case 'newest':   return new Date(b.createdAt) - new Date(a.createdAt);
      case 'oldest':   return new Date(a.createdAt) - new Date(b.createdAt);
      case 'priority': return (PRIO_ORDER[a.priority] ?? 1) - (PRIO_ORDER[b.priority] ?? 1);
      case 'az':       return a.title.localeCompare(b.title);
      default:         return 0;
    }
  });

  // Stats (from all tasks, not filtered)
  const all = await getTasks();
  doneCountEl.textContent  = all.filter(t => t.isDone).length;
  totalCountEl.textContent = all.length;

  // Render tasks
  const existing = taskList.querySelectorAll('.task-item');
  existing.forEach(el => el.remove());

  if (tasks.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  tasks.forEach((task, i) => {
    const el = createTaskEl(task, i);
    taskList.appendChild(el);
  });
}

function createTaskEl(task, animIndex) {
  const today = new Date().toISOString().split('T')[0];
  const isOverdue = task.dueDate && !task.isDone && task.dueDate < today;

  const div = document.createElement('div');
  div.className = `task-item priority-${task.priority}${task.isDone ? ' completed' : ''}`;
  div.dataset.id = task.id;
  div.style.animationDelay = `${animIndex * 0.04}s`;

  div.innerHTML = `
    <div class="task-check ${task.isDone ? 'checked' : ''}" data-id="${task.id}" role="checkbox" aria-checked="${!!task.isDone}" tabindex="0" title="Toggle complete"></div>
    <div class="task-body">
      <div class="task-title">${escapeHtml(task.title)}</div>
      ${task.description ? `<div class="task-desc">${escapeHtml(task.description)}</div>` : ''}
      <div class="task-meta">
        <span class="badge badge-${task.priority}">${task.priority}</span>
        <span class="task-date">${formatDate(task.createdAt)}</span>
        ${task.dueDate ? `<span class="task-due ${isOverdue ? 'overdue' : ''}">📅 Due: ${task.dueDate}${isOverdue ? ' ⚠ Overdue' : ''}</span>` : ''}
      </div>
    </div>
    <div class="task-actions">
      <button class="action-btn edit" data-id="${task.id}" title="Edit task">✎</button>
      <button class="action-btn delete" data-id="${task.id}" title="Delete task">✕</button>
    </div>
  `;

  // Toggle on checkbox click or keyboard
  const check = div.querySelector('.task-check');
  check.addEventListener('click', () => handleToggle(task.id));
  check.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') handleToggle(task.id); });

  div.querySelector('.action-btn.edit').addEventListener('click', () => openEditModal(task));
  div.querySelector('.action-btn.delete').addEventListener('click', () => handleDelete(task.id));

  return div;
}

/* ===========================
   HANDLERS
=========================== */

// ADD TASK
async function handleAdd() {
  const title    = taskTitleEl.value.trim();
  const desc     = taskDescEl.value.trim();
  const priority = taskPrioEl.value;
  const dueDate  = taskDueDateEl.value || null;

  // Validation
  if (!title) {
    showFormError(formError, 'Task title cannot be empty.');
    taskTitleEl.focus();
    return;
  }
  if (title.length > 50) {
    showFormError(formError, 'Title must be 50 characters or fewer.');
    return;
  }
  hideEl(formError);

  // POST /tasks
  await addTask({ title, description: desc, priority, dueDate });

  taskTitleEl.value = '';
  taskDescEl.value  = '';
  taskDueDateEl.value = '';
  taskPrioEl.value  = 'Medium';
  charCountEl.textContent = '0';

  await render();
  showToast('✔ Task added!');
}

// TOGGLE TASK
async function handleToggle(id) {
  // PATCH /tasks/:id/status
  const task = await toggleTask(id);
  await render();
  showToast(task.isDone ? '✔ Task completed!' : '↩ Task marked active');
}

// DELETE TASK
async function handleDelete(id) {
  const item = document.querySelector(`.task-item[data-id="${id}"]`);
  if (item) { item.style.opacity = '0'; item.style.transform = 'translateX(30px)'; }
  setTimeout(async () => {
    // DELETE /tasks/:id
    await deleteTask(id);
    await render();
    showToast('🗑 Task deleted');
  }, 220);
}

// OPEN EDIT MODAL
function openEditModal(task) {
  editingId            = task.id;
  editTitleEl.value    = task.title;
  editDescEl.value     = task.description || '';
  editPrioEl.value     = task.priority;
  editDueDateEl.value  = task.dueDate || '';
  hideEl(editError);
  editModal.classList.remove('hidden');
  editTitleEl.focus();
}

// SAVE EDIT
async function handleSaveEdit() {
  const title    = editTitleEl.value.trim();
  const desc     = editDescEl.value.trim();
  const priority = editPrioEl.value;
  const dueDate  = editDueDateEl.value || null;

  if (!title) { showFormError(editError, 'Title cannot be empty.'); return; }
  if (title.length > 50) { showFormError(editError, 'Max 50 characters.'); return; }
  hideEl(editError);

  // PUT /tasks/:id
  await updateTask(editingId, { title, description: desc, priority, dueDate });

  editModal.classList.add('hidden');
  await render();
  showToast('✏ Task updated!');
}

// EXPORT JSON
async function handleExport() {
  const tasks = await getTasks();
  const blob  = new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' });
  const url   = URL.createObjectURL(blob);
  const a     = document.createElement('a');
  a.href      = url;
  a.download  = `tasks_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('⬇ Exported to JSON!');
}

/* ===========================
   EVENT LISTENERS
=========================== */
addBtn.addEventListener('click', handleAdd);
taskTitleEl.addEventListener('keydown', e => { if (e.key === 'Enter') handleAdd(); });

taskTitleEl.addEventListener('input', () => {
  charCountEl.textContent = taskTitleEl.value.length;
});

searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value.trim();
  render();
});

sortSelect.addEventListener('change', () => {
  currentSort = sortSelect.value;
  render();
});

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    render();
  });
});

exportBtn.addEventListener('click', handleExport);
saveEdit.addEventListener('click', handleSaveEdit);
cancelEdit.addEventListener('click', () => editModal.classList.add('hidden'));
editModal.addEventListener('click', (e) => { if (e.target === editModal) editModal.classList.add('hidden'); });
editTitleEl.addEventListener('keydown', e => { if (e.key === 'Enter') handleSaveEdit(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') editModal.classList.add('hidden'); });

/* ===========================
   UTILITIES
=========================== */
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.remove('hidden');
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.classList.add('hidden'), 320);
  }, 2200);
}

function showFormError(el, msg) {
  el.textContent = msg;
  el.classList.remove('hidden');
}
function hideEl(el) { el.classList.add('hidden'); }

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ===========================
   INIT
=========================== */
openDB()
  .then(() => {
    document.getElementById('dbStatus').style.display = 'flex';
    render();
  })
  .catch(err => {
    console.error('DB Error:', err);
    document.getElementById('dbStatus').innerHTML =
      '<span style="color:var(--red)">⚠ DB Error</span>';
  });

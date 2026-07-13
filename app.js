/* ==========================================================================
   FocusFlow Application Logic (Mobile-First Layout)
   ========================================================================== */

// --- Global Application State ---
let state = {
  tasks: [],
  categories: ["Work", "Personal", "Shopping"],
  activeCategory: "Work", // for new task creation
  activeView: "home",
  homeFilter: "all", // all, pending, completed, urgent
  homeSort: "newest", // newest, oldest, priority, deadline
  sprintFilter: "pending", // pending, completed, all
  sprintSortByPriority: true,
  theme: "light",
  username: "Alex",
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256&h=256",
  taskToDeleteId: null, // stores task ID when opening confirmation modal
  
  // Auth State
  isLoggedIn: false,
  currentUser: null,
  authMode: "login", // login or register
  selectedRegisterAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256&h=256",

  // Pomodoro Focus Timer State
  focusTimerMinutes: 25,
  focusTimerSeconds: 0,
  isTimerRunning: false,
  timerIntervalId: null,
  currentPreset: 25, // default 25 minutes preset
  activeFocusTaskId: null
};

// --- Mock Initial Tasks ---
const DEFAULT_TASKS = [
  {
    id: "task-1",
    title: "Finalize FocusFlow UI Style Guide",
    completed: false,
    category: "Work",
    priority: "High",
    deadline: getFutureDateString(0, 14, 30), // Today at 2:30 PM
    createdAt: Date.now() - 3600000 * 4
  },
  {
    id: "task-2",
    title: "Review team performance metrics",
    completed: false,
    category: "Work",
    priority: "Medium",
    deadline: getFutureDateString(1, 10, 0), // Tomorrow
    createdAt: Date.now() - 3600000 * 2
  },
  {
    id: "task-3",
    title: "Send weekly newsletter",
    completed: true,
    category: "Personal",
    priority: "Low",
    deadline: getFutureDateString(-1, 17, 0), // Yesterday
    createdAt: Date.now() - 3600000 * 24
  },
  {
    id: "task-4",
    title: "Quarterly budget planning meeting",
    completed: false,
    category: "Work",
    priority: "High",
    deadline: getCustomDateString("Oct 24", 11, 0),
    createdAt: Date.now() - 3600000 * 12
  },
  {
    id: "task-5",
    title: "Complete quarterly project proposal",
    completed: false,
    category: "Work",
    priority: "High",
    deadline: getCustomDateString("Oct 24", 15, 0),
    createdAt: Date.now() - 3600000 * 18
  },
  {
    id: "task-6",
    title: "Update client roadmap",
    completed: false,
    category: "Work",
    priority: "Medium",
    deadline: "",
    createdAt: Date.now() - 3600000 * 6
  }
];

// --- Helper Functions to Generate Dates for Dummy Data ---
function getFutureDateString(daysOffset, hours, minutes) {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  date.setHours(hours, minutes, 0, 0);
  
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function getCustomDateString(monthDayStr, hours, minutes) {
  const date = new Date();
  if (monthDayStr.includes("Oct 24")) {
    date.setMonth(9); // October is 9
    date.setDate(24);
  }
  date.setHours(hours, minutes, 0, 0);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

// --- Date Formatting Helper ---
function formatDeadlineDisplay(deadlineString) {
  if (!deadlineString) return "";
  
  try {
    const deadline = new Date(deadlineString);
    const now = new Date();
    
    if (isNaN(deadline.getTime())) return deadlineString;

    const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
    const timeStr = deadline.toLocaleTimeString([], timeOptions);

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
    
    const diffTime = target - today;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Today, ${timeStr}`;
    } else if (diffDays === 1) {
      return `Tomorrow`;
    } else if (diffDays === -1) {
      return `Yesterday`;
    } else {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${monthNames[deadline.getMonth()]} ${deadline.getDate()}`;
    }
  } catch (e) {
    return deadlineString;
  }
}

// --- REST API State & Auth Headers ---
function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-username': state.currentUser || ''
  };
}

function saveState() {
  // Database persists state on every modification, saveState is kept as dummy to maintain references
}

async function loadState() {
  const currentUser = localStorage.getItem("focusflow_current_user");
  if (currentUser) {
    state.isLoggedIn = true;
    state.currentUser = currentUser;
    
    try {
      const profileRes = await fetch('/api/profile', { headers: getAuthHeaders() });
      if (profileRes.ok) {
        const profile = await profileRes.json();
        state.username = profile.username;
        state.avatar = profile.avatar;
        state.theme = profile.theme;
      } else {
        throw new Error('Failed to load user profile.');
      }
      
      const tasksRes = await fetch('/api/tasks', { headers: getAuthHeaders() });
      if (tasksRes.ok) {
        state.tasks = await tasksRes.json();
      }
      
      const catsRes = await fetch('/api/categories', { headers: getAuthHeaders() });
      if (catsRes.ok) {
        state.categories = await catsRes.json();
      }
    } catch (err) {
      console.error(err);
      localStorage.removeItem("focusflow_current_user");
      state.isLoggedIn = false;
      state.currentUser = null;
    }
  } else {
    state.isLoggedIn = false;
    state.currentUser = null;
    state.tasks = [];
    state.categories = ["Work", "Personal", "Shopping"];
    state.theme = "light";
  }
}

// --- Initialize App ---
async function initApp() {
  await loadState();
  
  // Set theme class
  if (state.theme === "dark") {
    document.body.classList.add("dark-mode");
    const themeIcon = document.getElementById("theme-icon");
    if (themeIcon) themeIcon.setAttribute("data-lucide", "sun");
  } else {
    document.body.classList.remove("dark-mode");
    const themeIcon = document.getElementById("theme-icon");
    if (themeIcon) themeIcon.setAttribute("data-lucide", "moon");
  }

  // Render Date Indicator on Daily Sprint
  updateSprintDateDisplay();

  // Setup Event Listeners
  setupEventListeners();

  // If not logged in, force login view
  if (!state.isLoggedIn) {
    state.activeView = "login";
  }

  // Route to initial view
  switchView(state.activeView);

  // Initial UI Render
  updateUI();
  
  // Re-process any Lucide icons
  lucide.createIcons();
}

function updateSprintDateDisplay() {
  const dateSpan = document.getElementById("current-sprint-date");
  if (dateSpan) {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    dateSpan.textContent = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;
  }
}

// --- Dynamic UI updates ---
function updateUI() {
  const totalTasks = state.tasks.length;
  const completedTasks = state.tasks.filter(t => t.completed).length;
  const pendingTasks = state.tasks.filter(t => !t.completed).length;
  const completionPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Stay Focused greeting name
  const greetingEl = document.getElementById("hero-greeting-text");
  if (greetingEl) greetingEl.textContent = `Stay Focused, ${state.username || 'Friend'}.`;

  const subtitleEl = document.getElementById("hero-subtitle-text");
  if (subtitleEl) {
    subtitleEl.textContent = pendingTasks === 1 
      ? "You have 1 task to finish today." 
      : `You have ${pendingTasks} tasks to finish today.`;
  }

  // Progress Bar updates
  const countEl = document.getElementById("progress-tasks-count");
  if (countEl) countEl.textContent = `${completedTasks}/${totalTasks} tasks completed`;

  const pctEl = document.getElementById("progress-pct-text");
  if (pctEl) pctEl.textContent = `${completionPct}%`;

  const barEl = document.getElementById("hero-progress-bar");
  if (barEl) barEl.style.width = `${completionPct}%`;

  // High Priority widget updates
  const highPriorityPending = state.tasks.filter(t => t.priority === "High" && !t.completed);
  const priorityAlertWidget = document.getElementById("priority-alert-widget");
  
  if (highPriorityPending.length > 0) {
    if (priorityAlertWidget) priorityAlertWidget.classList.remove("hidden");
    const countAlertEl = document.getElementById("priority-alert-count");
    const dueAlertEl = document.getElementById("priority-alert-due");

    if (countAlertEl) countAlertEl.textContent = `${highPriorityPending.length} High Priority`;
    
    const tasksWithDeadline = highPriorityPending.filter(t => t.deadline).map(t => new Date(t.deadline).getTime());
    if (tasksWithDeadline.length > 0) {
      const nextDeadline = new Date(Math.min(...tasksWithDeadline));
      if (dueAlertEl) dueAlertEl.textContent = `Due before ${nextDeadline.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    } else {
      if (dueAlertEl) dueAlertEl.textContent = "Action required today";
    }
  } else {
    if (priorityAlertWidget) priorityAlertWidget.classList.add("hidden");
  }

  // Set Profile display
  const avatarEl = document.getElementById("user-avatar-display");
  if (avatarEl) avatarEl.src = state.avatar;
  const usernameInput = document.getElementById("settings-username");
  if (usernameInput) usernameInput.value = state.username;
  const avatarInput = document.getElementById("settings-avatar");
  if (avatarInput) avatarInput.value = state.avatar;

  // Render list panels
  renderHomeTaskList();
  renderSprintTaskList();
  renderFoldersGrid();
  updateSettingsStats(totalTasks, completedTasks, pendingTasks, completionPct);

  if (state.activeView === "database" && state.workbenchTables) {
    renderWorkbenchTablesGrid();
  }
}

// --- Render Tasks: Home View ---
function renderHomeTaskList() {
  const container = document.getElementById("home-tasks-list");
  if (!container) return;

  container.innerHTML = "";

  let filtered = [...state.tasks];
  
  if (state.homeFilter === "pending") {
    filtered = filtered.filter(t => !t.completed);
  } else if (state.homeFilter === "completed") {
    filtered = filtered.filter(t => t.completed);
  } else if (state.homeFilter === "urgent") {
    filtered = filtered.filter(t => t.priority === "High" && !t.completed);
  }

  filtered.sort((a, b) => {
    if (state.homeSort === "newest") {
      return b.createdAt - a.createdAt;
    } else if (state.homeSort === "oldest") {
      return a.createdAt - b.createdAt;
    } else if (state.homeSort === "priority") {
      const priorityMap = { "High": 3, "Medium": 2, "Low": 1 };
      return priorityMap[b.priority] - priorityMap[a.priority];
    } else if (state.homeSort === "deadline") {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline) - new Date(b.deadline);
    }
    return 0;
  });

  if (filtered.length === 0) {
    showEmptyState(container, () => {
      state.homeFilter = "all";
      document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.classList.toggle("active", btn.getAttribute("data-filter") === "all");
      });
      updateUI();
    });
    return;
  }

  filtered.forEach(task => {
    const card = createTaskCardDOM(task, false); // false = Home style card
    container.appendChild(card);
  });
  
  lucide.createIcons();
}

// --- Render Tasks: Daily Sprint View ---
function renderSprintTaskList() {
  const container = document.getElementById("sprint-tasks-list");
  if (!container) return;

  container.innerHTML = "";

  let filtered = [...state.tasks];
  if (state.sprintFilter === "pending") {
    filtered = filtered.filter(t => !t.completed);
  } else if (state.sprintFilter === "completed") {
    filtered = filtered.filter(t => t.completed);
  }

  if (state.sprintCategoryFilter) {
    filtered = filtered.filter(t => t.category === state.sprintCategoryFilter);
  }

  if (state.sprintSortByPriority) {
    filtered.sort((a, b) => {
      const priorityMap = { "High": 3, "Medium": 2, "Low": 1 };
      if (priorityMap[b.priority] !== priorityMap[a.priority]) {
        return priorityMap[b.priority] - priorityMap[a.priority];
      }
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline) - new Date(b.deadline);
    });
  } else {
    filtered.sort((a, b) => b.createdAt - a.createdAt);
  }

  if (filtered.length === 0) {
    showEmptyState(container, () => {
      state.sprintFilter = "all";
      document.querySelectorAll(".sprint-tab-btn").forEach(btn => {
        btn.classList.toggle("active", btn.getAttribute("data-sprint-filter") === "all");
      });
      updateUI();
    });
    return;
  }

  filtered.forEach(task => {
    const card = createTaskCardDOM(task, true); // true = Sprint style card with folder icon
    container.appendChild(card);
  });

  lucide.createIcons();
}

// --- Create Common Task Card DOM element ---
function createTaskCardDOM(task, isSprint = false) {
  const card = document.createElement("div");
  card.className = `task-item-card ${task.completed ? 'completed' : ''}`;
  card.id = `task-card-${task.id}`;

  const checkboxId = `checkbox-${task.id}`;
  const badgeClass = `badge badge-${task.priority.toLowerCase()}`;
  const formattedDate = formatDeadlineDisplay(task.deadline);
  
  if (isSprint) {
    // Sprint View layout with folder category tag
    card.innerHTML = `
      <div class="checkbox-wrapper">
        <input type="checkbox" id="${checkboxId}" class="checkbox-input" ${task.completed ? 'checked' : ''}>
        <div class="custom-checkbox-visual"></div>
      </div>
      
      <div class="task-item-content">
        <h3 class="task-item-title">${escapeHTML(task.title)}</h3>
        <div class="task-item-meta">
          <span class="${badgeClass}">${task.priority}</span>
          <span class="category-tag">
            <i data-lucide="folder" style="width: 12px; height: 12px;"></i>
            ${escapeHTML(task.category)}
          </span>
          ${formattedDate ? `
            <span class="task-item-date">
              <i data-lucide="clock" style="width: 12px; height: 12px;"></i>
              ${formattedDate}
            </span>
          ` : ''}
        </div>
      </div>

      <div class="task-actions">
        ${!task.completed ? `
          <button class="task-action-btn btn-focus" title="Start Focus Session" data-id="${task.id}">
            <i data-lucide="clock" style="width: 18px; height: 18px;"></i>
          </button>
        ` : ''}
        <button class="task-action-btn btn-delete" title="Delete task" data-id="${task.id}">
          <i data-lucide="trash-2" style="width: 18px; height: 18px;"></i>
        </button>
      </div>
    `;
  } else {
    // Home View layout with inline tag details
    card.innerHTML = `
      <div class="checkbox-wrapper">
        <input type="checkbox" id="${checkboxId}" class="checkbox-input" ${task.completed ? 'checked' : ''}>
        <div class="custom-checkbox-visual"></div>
      </div>
      
      <div class="task-item-content">
        <h3 class="task-item-title">${escapeHTML(task.title)}</h3>
        <div class="task-item-meta">
          <span class="${badgeClass}">${task.priority}</span>
          ${formattedDate ? `
            <span class="task-item-date">
              <i data-lucide="clock" style="width: 12px; height: 12px;"></i>
              ${formattedDate}
            </span>
          ` : ''}
        </div>
      </div>

      <div class="task-actions">
        ${!task.completed ? `
          <button class="task-action-btn btn-focus" title="Start Focus Session" data-id="${task.id}">
            <i data-lucide="clock" style="width: 18px; height: 18px;"></i>
          </button>
        ` : ''}
        <button class="task-action-btn btn-delete" title="Delete task" data-id="${task.id}">
          <i data-lucide="trash-2" style="width: 18px; height: 18px;"></i>
        </button>
      </div>
    `;
  }

  // Bind checkbox toggle event
  const checkbox = card.querySelector(".checkbox-input");
  checkbox.addEventListener("change", () => {
    toggleTaskCompletion(task.id);
  });

  // Bind focus timer action
  const focusBtn = card.querySelector(".btn-focus");
  if (focusBtn) {
    focusBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openFocusTimer(task.id);
    });
  }

  // Bind delete button
  const delBtn = card.querySelector(".btn-delete");
  delBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    openDeleteModal(task.id);
  });

  return card;
}

// --- Render Categories Grid (Folders Page) ---
function renderFoldersGrid() {
  const container = document.getElementById("folders-grid-container");
  if (!container) return;

  container.innerHTML = "";

  state.categories.forEach(cat => {
    const catTasks = state.tasks.filter(t => t.category === cat);
    const catCompleted = catTasks.filter(t => t.completed).length;
    const catTotal = catTasks.length;
    const pct = catTotal > 0 ? Math.round((catCompleted / catTotal) * 100) : 0;
    
    let classTheme = "custom";
    let iconName = "folder";
    
    if (cat.toLowerCase() === "work") {
      classTheme = "work";
      iconName = "briefcase";
    } else if (cat.toLowerCase() === "personal") {
      classTheme = "personal";
      iconName = "smile";
    } else if (cat.toLowerCase() === "shopping") {
      classTheme = "shopping";
      iconName = "shopping-bag";
    }

    const card = document.createElement("div");
    card.className = "folder-card";
    
    card.innerHTML = `
      <div class="folder-card-header">
        <div class="folder-icon-box ${classTheme}">
          <i data-lucide="${iconName}"></i>
        </div>
        ${classTheme === "custom" ? `
          <button class="folder-delete-btn" data-category="${escapeHTML(cat)}" title="Delete Category">
            <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
          </button>
        ` : ''}
      </div>
      <div class="folder-card-meta">
        <h3 class="folder-name">${escapeHTML(cat)}</h3>
        <span class="folder-stats">${catTotal} tasks • ${pct}% done</span>
      </div>
      <div class="folder-progress-bar-container">
        <div class="folder-progress-bar-inner" style="width: ${pct}%"></div>
      </div>
    `;

    card.addEventListener("click", (e) => {
      if (e.target.closest(".folder-delete-btn")) return;
      state.sprintCategoryFilter = cat;
      switchView("tasks");
      
      const sprintTitle = document.querySelector("#view-tasks .sprint-title");
      const sprintSub = document.querySelector("#view-tasks .sprint-subtitle");
      
      if (sprintTitle) sprintTitle.textContent = `${cat} Sprint`;
      if (sprintSub) sprintSub.textContent = `Tasks filtered under ${cat} project folder.`;
      
      state.sprintFilter = "all";
      updateUI();
    });

    if (classTheme === "custom") {
      const delCatBtn = card.querySelector(".folder-delete-btn");
      delCatBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteCategory(cat);
      });
    }

    container.appendChild(card);
  });

  lucide.createIcons();
}

// --- Render Settings Stats Panel ---
function updateSettingsStats(total, completed, pending, rate) {
  const createdEl = document.getElementById("stats-total-created");
  const completedEl = document.getElementById("stats-total-completed");
  const pendingEl = document.getElementById("stats-total-pending");
  const rateEl = document.getElementById("stats-productivity-rate");

  if (createdEl) createdEl.textContent = total;
  if (completedEl) completedEl.textContent = completed;
  if (pendingEl) pendingEl.textContent = pending;
  if (rateEl) rateEl.textContent = `${rate}%`;
}

// --- Show Empty State Element Helper ---
function showEmptyState(targetContainer, resetCallback) {
  const template = document.getElementById("empty-state-template");
  if (!template) return;

  const clone = template.cloneNode(true);
  clone.id = "";
  clone.classList.remove("hidden");

  const createBtn = clone.querySelector("#empty-create-btn");
  if (createBtn) {
    createBtn.addEventListener("click", () => {
      switchView("tasks");
      setTimeout(() => {
        const inp = document.getElementById("task-title-input");
        if (inp) inp.focus();
      }, 350);
    });
  }

  const importBtn = clone.querySelector("#empty-import-btn");
  if (importBtn) {
    importBtn.addEventListener("click", () => {
      if (confirm("Would you like to import mock template tasks list?")) {
        state.tasks = [...DEFAULT_TASKS];
        saveState();
        updateUI();
      }
    });
  }

  targetContainer.appendChild(clone);
  lucide.createIcons();
}

// --- View Router Controller ---
function switchView(viewName) {
  // If not logged in, only allow login view
  if (!state.isLoggedIn) {
    viewName = "login";
  }
  
  state.activeView = viewName;
  
  document.querySelectorAll(".app-view").forEach(view => {
    view.classList.remove("active");
  });
  
  const targetView = document.getElementById(`view-${viewName}`);
  if (targetView) {
    targetView.classList.add("active");
    targetView.scrollTop = 0;
  }

  // Toggle app shell headers/footers visibility
  const headerEl = document.querySelector(".app-header");
  const bottomNavEl = document.querySelector(".app-bottom-nav");
  
  if (viewName === "login") {
    if (headerEl) headerEl.classList.add("shell-hidden");
    if (bottomNavEl) bottomNavEl.classList.add("shell-hidden");
  } else {
    if (headerEl) headerEl.classList.remove("shell-hidden");
    if (bottomNavEl) bottomNavEl.classList.remove("shell-hidden");
  }

  if (viewName !== "tasks" && viewName !== "login") {
    state.sprintCategoryFilter = null;
    const sprintTitle = document.querySelector("#view-tasks .sprint-title");
    const sprintSub = document.querySelector("#view-tasks .sprint-subtitle");
    if (sprintTitle) sprintTitle.textContent = "Daily Sprint";
    if (sprintSub) sprintSub.textContent = "Manage your active priorities and work flow.";
  }

  // Update bottom navigation button highlights
  document.querySelectorAll(".nav-item").forEach(item => {
    const isTarget = item.getAttribute("data-view") === viewName;
    item.classList.toggle("active", isTarget);
  });

  if (viewName === "database") {
    loadDatabaseMetadata();
  }
  
  updateUI();
}

// --- Task State Manipulations ---
async function toggleTaskCompletion(taskId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (task) {
    const nextCompleted = !task.completed;
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ completed: nextCompleted })
      });
      if (res.ok) {
        task.completed = nextCompleted;
        const cardEl = document.getElementById(`task-card-${taskId}`);
        if (cardEl) {
          cardEl.classList.toggle("completed", task.completed);
          setTimeout(() => {
            updateUI();
          }, 350);
        } else {
          updateUI();
        }
      } else {
        alert("Failed to update task completion.");
      }
    } catch (err) {
      console.error(err);
    }
  }
}

async function handleAddTask(e) {
  e.preventDefault();

  const titleInput = document.getElementById("task-title-input");
  const prioritySelect = document.getElementById("task-priority-input");
  const deadlineInput = document.getElementById("task-deadline-input");

  if (!titleInput || !titleInput.value.trim()) return;

  const newTask = {
    id: "task-" + Date.now(),
    title: titleInput.value.trim(),
    completed: false,
    category: state.activeCategory,
    priority: prioritySelect.value,
    deadline: deadlineInput.value || "",
    createdAt: Date.now()
  };

  try {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(newTask)
    });
    if (res.ok) {
      state.tasks.push(newTask);
      
      titleInput.value = "";
      prioritySelect.value = "Medium";
      deadlineInput.value = "";

      updateUI();

      const newlyCreated = document.getElementById(`task-card-${newTask.id}`);
      if (newlyCreated) {
        newlyCreated.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    } else {
      alert("Failed to save task.");
    }
  } catch (err) {
    console.error(err);
  }
}

// Category Custom Addition
async function handleAddCategory(e) {
  e.preventDefault();
  const input = document.getElementById("new-category-name");
  if (!input || !input.value.trim()) return;

  const name = input.value.trim();
  const formattedName = name.charAt(0).toUpperCase() + name.slice(1);

  if (state.categories.some(c => c.toLowerCase() === formattedName.toLowerCase())) {
    alert("Category already exists.");
    return;
  }

  try {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name: formattedName })
    });
    if (res.ok) {
      state.categories.push(formattedName);
      input.value = "";
      updateUI();
      renderCategoryFormPills();
    } else {
      alert("Failed to create category.");
    }
  } catch (err) {
    console.error(err);
  }
}

async function deleteCategory(catName) {
  if (confirm(`Are you sure you want to delete "${catName}" category? Associated tasks fall back to "Personal".`)) {
    try {
      const res = await fetch(`/api/categories/${encodeURIComponent(catName)}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        state.categories = state.categories.filter(c => c !== catName);
        state.tasks.forEach(t => {
          if (t.category === catName) {
            t.category = "Personal";
          }
        });
        updateUI();
        renderCategoryFormPills();
      } else {
        alert("Failed to delete category.");
      }
    } catch (err) {
      console.error(err);
    }
  }
}

// --- Delete Modal confirmation flow ---
function openDeleteModal(taskId) {
  state.taskToDeleteId = taskId;
  const modal = document.getElementById("delete-confirm-modal");
  if (modal) {
    modal.classList.remove("hidden");
  }
}

function closeDeleteModal() {
  state.taskToDeleteId = null;
  const modal = document.getElementById("delete-confirm-modal");
  if (modal) {
    modal.classList.add("hidden");
  }
}

async function executeDeleteTask() {
  if (state.taskToDeleteId) {
    try {
      const res = await fetch(`/api/tasks/${state.taskToDeleteId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        state.tasks = state.tasks.filter(t => t.id !== state.taskToDeleteId);
        closeDeleteModal();
        updateUI();
      } else {
        alert("Failed to delete task.");
      }
    } catch (err) {
      console.error(err);
    }
  }
}

// --- Pomodoro Focus Timer Controllers ---
function openFocusTimer(taskId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;

  state.activeFocusTaskId = taskId;
  
  // Set task title text
  const activeTaskTitleEl = document.getElementById("focus-active-task-title");
  if (activeTaskTitleEl) {
    activeTaskTitleEl.textContent = task.title;
  }

  // Reset timer parameters to current preset minutes
  state.focusTimerMinutes = state.currentPreset;
  state.focusTimerSeconds = 0;
  state.isTimerRunning = false;
  if (state.timerIntervalId) {
    clearInterval(state.timerIntervalId);
    state.timerIntervalId = null;
  }

  // Update controls display
  updateFocusTimerUI();

  // Show focus timer overlay
  const focusModal = document.getElementById("focus-timer-modal");
  if (focusModal) {
    focusModal.classList.remove("hidden");
    updatePlayPauseBtnIcon();
  }
}

function closeFocusTimer() {
  // Pause countdown timer if running
  pauseFocusTimer();
  
  state.activeFocusTaskId = null;
  
  const focusModal = document.getElementById("focus-timer-modal");
  if (focusModal) {
    focusModal.classList.add("hidden");
  }
}

function togglePlayPauseFocusTimer() {
  if (state.isTimerRunning) {
    pauseFocusTimer();
  } else {
    startFocusTimer();
  }
}

function startFocusTimer() {
  if (state.isTimerRunning) return;

  state.isTimerRunning = true;
  state.timerIntervalId = setInterval(tickFocusTimer, 1000);
  
  updatePlayPauseBtnIcon();
}

function pauseFocusTimer() {
  if (!state.isTimerRunning) return;

  state.isTimerRunning = false;
  if (state.timerIntervalId) {
    clearInterval(state.timerIntervalId);
    state.timerIntervalId = null;
  }
  
  updatePlayPauseBtnIcon();
}

function resetFocusTimer() {
  pauseFocusTimer();
  state.focusTimerMinutes = state.currentPreset;
  state.focusTimerSeconds = 0;
  updateFocusTimerUI();
}

function changeTimerPreset(minutes) {
  pauseFocusTimer();
  state.currentPreset = minutes;
  state.focusTimerMinutes = minutes;
  state.focusTimerSeconds = 0;
  
  // Update class lists highlights on buttons
  document.querySelectorAll(".preset-btn").forEach(btn => {
    const btnMins = parseInt(btn.getAttribute("data-minutes"));
    btn.classList.toggle("active", btnMins === minutes);
  });
  
  updateFocusTimerUI();
}

function tickFocusTimer() {
  if (state.focusTimerMinutes === 0 && state.focusTimerSeconds === 0) {
    // Session Done!
    pauseFocusTimer();
    playTimerAlertSound();
    alert("Focus session completed! Time to take a break.");
    resetFocusTimer();
    return;
  }

  if (state.focusTimerSeconds === 0) {
    state.focusTimerMinutes--;
    state.focusTimerSeconds = 59;
  } else {
    state.focusTimerSeconds--;
  }

  updateFocusTimerUI();
}

function updatePlayPauseBtnIcon() {
  const iconEl = document.getElementById("timer-play-icon");
  if (iconEl) {
    iconEl.setAttribute("data-lucide", state.isTimerRunning ? "pause" : "play");
    lucide.createIcons();
  }
}

function updateFocusTimerUI() {
  // Update numbers countdown display text
  const displayEl = document.getElementById("timer-display-time");
  if (displayEl) {
    const minsStr = String(state.focusTimerMinutes).padStart(2, '0');
    const secsStr = String(state.focusTimerSeconds).padStart(2, '0');
    displayEl.textContent = `${minsStr}:${secsStr}`;
  }

  // Update circular progress SVG track stroke-dashoffset
  const progressEl = document.getElementById("timer-circle-progress");
  if (progressEl) {
    const totalSeconds = state.currentPreset * 60;
    const remainingSeconds = state.focusTimerMinutes * 60 + state.focusTimerSeconds;
    const fraction = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
    
    // SVG circle circumference for r=90 is 2 * Math.PI * 90 = 565.48
    const circumference = 565.48;
    const offset = circumference * (1 - fraction);
    progressEl.style.strokeDashoffset = offset;
  }
}

function completeActiveFocusTask() {
  if (state.activeFocusTaskId) {
    toggleTaskCompletion(state.activeFocusTaskId);
    closeFocusTimer();
  }
}

function playTimerAlertSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const playBeep = (freq, duration, delay) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
      
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + delay + duration - 0.05);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start(audioCtx.currentTime + delay);
      osc.stop(audioCtx.currentTime + delay + duration);
    };
    
    // Play double beep notification chime
    playBeep(880, 0.35, 0);       // A5 Note
    playBeep(1174.66, 0.5, 0.18); // D6 Note
  } catch (e) {
    console.error("Synthesizing timer chime alert failed:", e);
  }
}

// --- Settings Modifiers ---
async function saveUsername() {
  const input = document.getElementById("settings-username");
  if (input && input.value.trim()) {
    const nextUsername = input.value.trim();
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ username: nextUsername })
      });
      if (res.ok) {
        state.username = nextUsername;
        state.currentUser = nextUsername;
        localStorage.setItem("focusflow_current_user", nextUsername);
        updateUI();
        alert("Display name updated!");
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to update username.");
      }
    } catch (err) {
      console.error(err);
    }
  }
}

async function saveAvatar() {
  const input = document.getElementById("settings-avatar");
  if (input && input.value.trim()) {
    const nextAvatar = input.value.trim();
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ avatar: nextAvatar })
      });
      if (res.ok) {
        state.avatar = nextAvatar;
        const displayEl = document.getElementById("user-avatar-display");
        if (displayEl) displayEl.src = state.avatar;
        alert("Profile avatar updated!");
      } else {
        alert("Failed to update avatar.");
      }
    } catch (err) {
      console.error(err);
    }
  }
}

async function resetAllData() {
  if (confirm("WARNING: This will wipe your tasks, custom categories, and personalization settings. Proceed?")) {
    try {
      const res = await fetch('/api/reset', {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        state.theme = 'light';
        state.avatar = data.avatar;
        
        document.body.classList.remove("dark-mode");
        const themeIcon = document.getElementById("theme-icon");
        if (themeIcon) themeIcon.setAttribute("data-lucide", "moon");
        const avatarEl = document.getElementById("user-avatar-display");
        if (avatarEl) avatarEl.src = state.avatar;

        await loadState();
        renderCategoryFormPills();
        updateUI();
        alert("Workspace reset.");
      } else {
        alert("Failed to reset workspace.");
      }
    } catch (err) {
      console.error(err);
    }
  }
}

// --- Form Category Pills Render ---
function renderCategoryFormPills() {
  const pillsContainer = document.getElementById("category-pills-container");
  if (!pillsContainer) return;

  pillsContainer.innerHTML = "";

  state.categories.forEach(cat => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `pill-btn ${state.activeCategory === cat ? 'active' : ''}`;
    btn.setAttribute("data-category", cat);
    btn.textContent = cat;
    
    btn.addEventListener("click", () => {
      pillsContainer.querySelectorAll(".pill-btn").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      state.activeCategory = cat;
    });

    pillsContainer.appendChild(btn);
  });
}

// --- Event Listeners wire-up ---
function setupEventListeners() {
  // Navigation tabs router clicks
  document.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", () => {
      const targetView = item.getAttribute("data-view");
      switchView(targetView);
    });
  });

  // Welcome page filters
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.homeFilter = btn.getAttribute("data-filter");
      updateUI();
    });
  });

  // Home Sorting
  const homeSortSelect = document.getElementById("home-sort");
  if (homeSortSelect) {
    homeSortSelect.value = state.homeSort;
    homeSortSelect.addEventListener("change", (e) => {
      state.homeSort = e.target.value;
      updateUI();
    });
  }

  // Dashboard "View Urgent" widget trigger
  const viewUrgentBtn = document.getElementById("view-urgent-btn");
  if (viewUrgentBtn) {
    viewUrgentBtn.addEventListener("click", () => {
      state.homeFilter = "urgent";
      document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
      renderHomeTaskList();
    });
  }

  // Sprint View Filter Tabs
  document.querySelectorAll(".sprint-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".sprint-tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.sprintFilter = btn.getAttribute("data-sprint-filter");
      updateUI();
    });
  });

  // Sprint Sort Toggle Priority
  const sprintSortBtn = document.getElementById("sprint-sort-btn");
  if (sprintSortBtn) {
    sprintSortBtn.addEventListener("click", () => {
      state.sprintSortByPriority = !state.sprintSortByPriority;
      const label = document.getElementById("sprint-sort-label");
      if (label) {
        label.textContent = state.sprintSortByPriority ? "Sort by Priority" : "Sort by Newest";
      }
      updateUI();
    });
  }

  // Floating Plus Button Router Trigger
  const globalAddBtn = document.getElementById("global-floating-add-btn");
  if (globalAddBtn) {
    globalAddBtn.addEventListener("click", () => {
      switchView("tasks");
      setTimeout(() => {
        const inp = document.getElementById("task-title-input");
        if (inp) inp.focus();
      }, 350);
    });
  }

  // Form Category Pills initialization
  renderCategoryFormPills();

  // Submit forms triggers
  const addTaskForm = document.getElementById("add-task-form");
  if (addTaskForm) {
    addTaskForm.addEventListener("submit", handleAddTask);
  }

  const addCategoryForm = document.getElementById("add-category-form");
  if (addCategoryForm) {
    addCategoryForm.addEventListener("submit", handleAddCategory);
  }

  // Modal actions
  const modalDelBtn = document.getElementById("modal-delete-confirm-btn");
  if (modalDelBtn) {
    modalDelBtn.addEventListener("click", executeDeleteTask);
  }

  const modalCancelBtn = document.getElementById("modal-delete-cancel-btn");
  if (modalCancelBtn) {
    modalCancelBtn.addEventListener("click", closeDeleteModal);
  }

  const deleteModal = document.getElementById("delete-confirm-modal");
  if (deleteModal) {
    deleteModal.addEventListener("click", (e) => {
      if (e.target === deleteModal) {
        closeDeleteModal();
      }
    });
  }

  // Pomodoro Focus Timer controls listeners
  const closeFocusBtn = document.getElementById("focus-close-btn");
  if (closeFocusBtn) {
    closeFocusBtn.addEventListener("click", closeFocusTimer);
  }

  const timerPlayBtn = document.getElementById("timer-play-btn");
  if (timerPlayBtn) {
    timerPlayBtn.addEventListener("click", togglePlayPauseFocusTimer);
  }

  const timerResetBtn = document.getElementById("timer-reset-btn");
  if (timerResetBtn) {
    timerResetBtn.addEventListener("click", resetFocusTimer);
  }

  const timerCompleteBtn = document.getElementById("timer-complete-btn");
  if (timerCompleteBtn) {
    timerCompleteBtn.addEventListener("click", completeActiveFocusTask);
  }

  // Preset buttons click bindings
  document.querySelectorAll(".preset-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const minutes = parseInt(btn.getAttribute("data-minutes"));
      changeTimerPreset(minutes);
    });
  });

  const focusTimerModal = document.getElementById("focus-timer-modal");
  if (focusTimerModal) {
    focusTimerModal.addEventListener("click", (e) => {
      if (e.target === focusTimerModal) {
        closeFocusTimer();
      }
    });
  }

  // Theme Toggle Toggler
  const themeToggleBtn = document.getElementById("theme-toggle-btn");
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", async () => {
      const body = document.body;
      const themeIcon = document.getElementById("theme-icon");
      let nextTheme;
      
      if (body.classList.contains("dark-mode")) {
        body.classList.remove("dark-mode");
        nextTheme = "light";
        if (themeIcon) themeIcon.setAttribute("data-lucide", "moon");
      } else {
        body.classList.add("dark-mode");
        nextTheme = "dark";
        if (themeIcon) themeIcon.setAttribute("data-lucide", "sun");
      }
      
      state.theme = nextTheme;
      lucide.createIcons();
      
      try {
        await fetch('/api/theme', {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ theme: nextTheme })
        });
      } catch (err) {
        console.error(err);
      }
    });
  }

  // Settings saving
  const saveNameBtn = document.getElementById("save-username-btn");
  if (saveNameBtn) saveNameBtn.addEventListener("click", saveUsername);

  const saveAvatarBtn = document.getElementById("save-avatar-btn");
  if (saveAvatarBtn) saveAvatarBtn.addEventListener("click", saveAvatar);

  const resetBtn = document.getElementById("reset-app-btn");
  if (resetBtn) resetBtn.addEventListener("click", resetAllData);

  // Profile icon routes to Settings
  const profileBtn = document.getElementById("profile-btn");
  if (profileBtn) {
    profileBtn.addEventListener("click", () => {
      switchView("settings");
    });
  }

  // Auth Form Submit
  const authForm = document.getElementById("auth-form");
  if (authForm) {
    authForm.addEventListener("submit", handleAuthSubmit);
  }

  // Auth Mode toggle link
  const authModeToggleLink = document.getElementById("auth-mode-toggle-link");
  if (authModeToggleLink) {
    authModeToggleLink.addEventListener("click", toggleAuthMode);
  }

  // Password visibility eye button
  const togglePasswordBtn = document.getElementById("toggle-password-btn");
  if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener("click", togglePasswordVisibility);
  }

  // Logout button click
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogout);
  }

  // Register Avatar selections carousel setup
  document.querySelectorAll(".avatar-option-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".avatar-option-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.selectedRegisterAvatar = btn.getAttribute("data-avatar-url");
    });
  });

  // Keyboard Shortcuts Hook
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      switchView("tasks");
      setTimeout(() => {
        const inp = document.getElementById("task-title-input");
        if (inp) inp.focus();
      }, 350);
    }
    if (e.key === "Escape") {
      closeDeleteModal();
      closeFocusTimer();
    }
  });

  // Database Workbench navigation & actions bindings
  const headerDbBtn = document.getElementById("header-db-btn");
  if (headerDbBtn) {
    headerDbBtn.addEventListener("click", () => {
      switchView("database");
    });
  }

  const settingsDbBtn = document.getElementById("settings-db-workbench-btn");
  if (settingsDbBtn) {
    settingsDbBtn.addEventListener("click", () => {
      switchView("database");
    });
  }

  const queryTemplateSelect = document.getElementById("workbench-query-templates");
  if (queryTemplateSelect) {
    queryTemplateSelect.addEventListener("change", (e) => {
      const val = e.target.value;
      if (val) {
        const sqlTextarea = document.getElementById("workbench-sql-input");
        if (sqlTextarea) {
          sqlTextarea.value = val;
        }
      }
    });
  }

  const runQueryBtn = document.getElementById("workbench-run-query-btn");
  if (runQueryBtn) {
    runQueryBtn.addEventListener("click", handleRunSQLQuery);
  }

  const closeExplorerBtn = document.getElementById("workbench-close-explorer-btn");
  if (closeExplorerBtn) {
    closeExplorerBtn.addEventListener("click", () => {
      document.getElementById("workbench-explorer-card").classList.add("hidden");
    });
  }
}

// --- HTML Escaper Helper ---
function escapeHTML(str) {
  if (!str) return "";
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// --- Authentication Flow Logic ---
async function handleAuthSubmit(e) {
  e.preventDefault();
  
  const usernameInput = document.getElementById("auth-username");
  const passwordInput = document.getElementById("auth-password");
  
  if (!usernameInput || !passwordInput) return;
  
  const usernameVal = usernameInput.value.trim();
  const passwordVal = passwordInput.value;
  
  if (!usernameVal || !passwordVal) return;
  
  if (state.authMode === "login") {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameVal, password: passwordVal })
      });
      if (res.ok) {
        const user = await res.json();
        localStorage.setItem("focusflow_current_user", user.username);
        
        await loadState();
        
        usernameInput.value = "";
        passwordInput.value = "";
        
        switchView("home");
      } else {
        alert("Invalid username or password.");
      }
    } catch (err) {
      console.error(err);
      alert("Server error during login.");
    }
  } else {
    const confirmPasswordInput = document.getElementById("auth-confirm-password");
    if (!confirmPasswordInput) return;
    
    const confirmPasswordVal = confirmPasswordInput.value;
    
    if (passwordVal !== confirmPasswordVal) {
      alert("Passwords do not match.");
      return;
    }
    
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: usernameVal,
          password: passwordVal,
          avatar: state.selectedRegisterAvatar
        })
      });
      if (res.ok) {
        const user = await res.json();
        localStorage.setItem("focusflow_current_user", user.username);
        
        await loadState();
        
        usernameInput.value = "";
        passwordInput.value = "";
        confirmPasswordInput.value = "";
        
        switchView("home");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to register account.");
      }
    } catch (err) {
      console.error(err);
      alert("Server error during registration.");
    }
  }
}

function toggleAuthMode() {
  state.authMode = state.authMode === "login" ? "register" : "login";
  
  const formTitle = document.getElementById("login-form-title");
  const formDesc = document.getElementById("login-form-desc");
  const btnText = document.getElementById("auth-btn-text");
  const toggleBtn = document.getElementById("auth-mode-toggle-link");
  
  const confirmGroup = document.getElementById("confirm-password-group");
  const avatarGroup = document.getElementById("avatar-selection-group");
  
  const confirmInput = document.getElementById("auth-confirm-password");
  
  if (state.authMode === "register") {
    if (formTitle) formTitle.textContent = "Create Account";
    if (formDesc) formDesc.textContent = "Sign up to start planning your flow and tracking metrics.";
    if (btnText) btnText.textContent = "Create Account";
    if (toggleBtn) toggleBtn.textContent = "Already have an account? Login";
    
    if (confirmGroup) confirmGroup.classList.remove("hidden");
    if (avatarGroup) avatarGroup.classList.remove("hidden");
    if (confirmInput) confirmInput.setAttribute("required", "required");
  } else {
    if (formTitle) formTitle.textContent = "Welcome Back";
    if (formDesc) formDesc.textContent = "Please sign in to unlock your personal workspace.";
    if (btnText) btnText.textContent = "Unlock Workspace";
    if (toggleBtn) toggleBtn.textContent = "Don't have an account? Sign Up";
    
    if (confirmGroup) confirmGroup.classList.add("hidden");
    if (avatarGroup) avatarGroup.classList.add("hidden");
    if (confirmInput) confirmInput.removeAttribute("required");
  }
  
  lucide.createIcons();
}

function togglePasswordVisibility() {
  const passwordInput = document.getElementById("auth-password");
  const confirmPasswordInput = document.getElementById("auth-confirm-password");
  const eyeIcon = document.getElementById("password-eye-icon");
  
  if (!passwordInput || !eyeIcon) return;
  
  const isPassword = passwordInput.getAttribute("type") === "password";
  
  passwordInput.setAttribute("type", isPassword ? "text" : "password");
  if (confirmPasswordInput) {
    confirmPasswordInput.setAttribute("type", isPassword ? "text" : "password");
  }
  
  eyeIcon.setAttribute("data-lucide", isPassword ? "eye-off" : "eye");
  lucide.createIcons();
}

async function handleLogout() {
  if (confirm("Are you sure you want to log out of FocusFlow?")) {
    localStorage.removeItem("focusflow_current_user");
    
    state.isLoggedIn = false;
    state.currentUser = null;
    state.tasks = [];
    state.categories = ["Work", "Personal", "Shopping"];
    state.theme = "light";
    
    const uInp = document.getElementById("auth-username");
    const pInp = document.getElementById("auth-password");
    const cpInp = document.getElementById("auth-confirm-password");
    if (uInp) uInp.value = "";
    if (pInp) pInp.value = "";
    if (cpInp) cpInp.value = "";
    
    state.authMode = "register"; // will toggle to login
    toggleAuthMode();
    
    switchView("login");
  }
}

// --- Database Workbench Helpers ---

state.workbenchTables = [];

async function loadDatabaseMetadata() {
  try {
    const res = await fetch('/api/workbench/tables', { headers: getAuthHeaders() });
    if (res.ok) {
      const data = await res.json();
      state.workbenchTables = data.tables || [];
      renderWorkbenchTablesGrid();
    } else {
      console.error('Failed to fetch table metadata');
    }
  } catch (err) {
    console.error(err);
  }
}

function renderWorkbenchTablesGrid() {
  const container = document.getElementById("workbench-tables-list");
  if (!container) return;

  container.innerHTML = "";

  if (!state.workbenchTables || state.workbenchTables.length === 0) {
    container.innerHTML = "<p style='color: var(--color-text-muted); font-size: 13px;'>No tables found.</p>";
    return;
  }

  state.workbenchTables.forEach(table => {
    const card = document.createElement("div");
    card.className = "workbench-table-card animate-pop";
    
    let iconName = "table";
    if (table.name === "users") iconName = "users";
    else if (table.name === "tasks") iconName = "clipboard-list";
    else if (table.name === "categories") iconName = "folder";

    card.innerHTML = `
      <div class="card-icon-box">
        <i data-lucide="${iconName}" style="width: 20px; height: 20px;"></i>
      </div>
      <div class="card-meta">
        <h3 class="card-name">${escapeHTML(table.name)}</h3>
        <span class="card-count">${table.count} rows</span>
      </div>
    `;

    card.addEventListener("click", () => {
      exploreTable(table.name);
    });

    container.appendChild(card);
  });

  lucide.createIcons();
}

async function exploreTable(tableName) {
  const explorerCard = document.getElementById("workbench-explorer-card");
  const tableNameEl = document.getElementById("workbench-explorer-table-name");
  const tableEl = document.getElementById("workbench-explorer-table");
  
  if (!explorerCard || !tableNameEl || !tableEl) return;

  tableNameEl.textContent = tableName;
  explorerCard.classList.remove("hidden");

  // Show loading indicator
  tableEl.innerHTML = `<thead><tr><th>Loading table data...</th></tr></thead>`;

  try {
    const res = await fetch('/api/workbench/query', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ query: `SELECT * FROM \`${tableName}\` LIMIT 100;` })
    });

    const data = await res.json();
    if (!res.ok) {
      tableEl.innerHTML = `<thead><tr><th>Error loading data: ${escapeHTML(data.error)}</th></tr></thead>`;
      return;
    }

    if (data.rows.length === 0) {
      tableEl.innerHTML = `<thead><tr><th>Table is empty</th></tr></thead>`;
      return;
    }

    const columns = data.columns || [];
    const primaryKey = columns.includes('id') ? 'id' : columns[0];

    // Header
    let headerHTML = "<tr>";
    columns.forEach(col => {
      headerHTML += `<th>${escapeHTML(col)}</th>`;
    });
    headerHTML += "<th>Actions</th></tr>";
    
    // Body rows
    let bodyHTML = "";
    data.rows.forEach(row => {
      bodyHTML += "<tr>";
      columns.forEach(col => {
        let val = row[col];
        if (val === null || val === undefined) {
          val = `<span style="color: var(--color-text-muted); font-style: italic;">NULL</span>`;
        } else if (typeof val === 'object') {
          val = JSON.stringify(val);
        } else {
          val = escapeHTML(String(val));
        }
        bodyHTML += `<td>${val}</td>`;
      });
      
      const pkValue = row[primaryKey];
      bodyHTML += `
        <td>
          <button class="btn-delete-row" title="Delete record" onclick="deleteWorkbenchRecord('${tableName}', '${primaryKey}', '${String(pkValue).replace(/'/g, "\\'")}')">
            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
          </button>
        </td>
      </tr>`;
    });

    tableEl.innerHTML = `
      <thead>${headerHTML}</thead>
      <tbody>${bodyHTML}</tbody>
    `;
    lucide.createIcons();

  } catch (err) {
    tableEl.innerHTML = `<thead><tr><th>Connection error: ${escapeHTML(err.message)}</th></tr></thead>`;
  }
}

window.deleteWorkbenchRecord = async function(tableName, primaryKey, pkValue) {
  if (!confirm(`Are you sure you want to delete this record from '${tableName}' where ${primaryKey} = '${pkValue}'?`)) {
    return;
  }
  
  const query = `DELETE FROM \`${tableName}\` WHERE \`${primaryKey}\` = '${pkValue.replace(/'/g, "\\'")}';`;
  
  try {
    const res = await fetch('/api/workbench/query', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ query })
    });
    
    const data = await res.json();
    if (res.ok) {
      alert(`Deleted record successfully. ${data.affectedRows} row(s) affected.`);
      exploreTable(tableName);
      loadDatabaseMetadata();
      await loadState();
      updateUI();
    } else {
      alert(`Failed to delete record: ${data.error}`);
    }
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
};

async function handleRunSQLQuery() {
  const sqlInput = document.getElementById("workbench-sql-input");
  const queryStatus = document.getElementById("workbench-query-status");
  const errorBanner = document.getElementById("workbench-error-banner");
  const errorMessage = document.getElementById("workbench-error-message");
  const resultsCard = document.getElementById("workbench-results-card");
  const resultsInfo = document.getElementById("workbench-query-info-badge");
  const resultsTable = document.getElementById("workbench-results-table");

  if (!sqlInput || !queryStatus || !errorBanner || !errorMessage || !resultsCard || !resultsInfo || !resultsTable) return;

  const query = sqlInput.value.trim();
  if (!query) {
    alert("Please enter a SQL query first.");
    return;
  }

  errorBanner.classList.add("hidden");
  resultsCard.classList.add("hidden");
  queryStatus.textContent = "Executing query...";

  try {
    const res = await fetch('/api/workbench/query', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ query })
    });

    const data = await res.json();

    if (!res.ok) {
      queryStatus.textContent = "Execution failed.";
      errorMessage.textContent = data.error;
      errorBanner.classList.remove("hidden");
      return;
    }

    queryStatus.textContent = `Executed successfully in ${data.duration}ms.`;
    resultsCard.classList.remove("hidden");

    if (data.type === 'select') {
      resultsInfo.textContent = `${data.affectedRows} row(s) returned (${data.duration}ms)`;
      
      if (data.rows.length === 0) {
        resultsTable.innerHTML = `<thead><tr><th>Empty result set</th></tr></thead>`;
        return;
      }

      const columns = data.columns || [];
      
      let headerHTML = "<tr>";
      columns.forEach(col => {
        headerHTML += `<th>${escapeHTML(col)}</th>`;
      });
      headerHTML += "</tr>";

      let bodyHTML = "";
      data.rows.forEach(row => {
        bodyHTML += "<tr>";
        columns.forEach(col => {
          let val = row[col];
          if (val === null || val === undefined) {
            val = `<span style="color: var(--color-text-muted); font-style: italic;">NULL</span>`;
          } else if (typeof val === 'object') {
            val = JSON.stringify(val);
          } else {
            val = escapeHTML(String(val));
          }
          bodyHTML += `<td>${val}</td>`;
        });
        bodyHTML += "</tr>";
      });

      resultsTable.innerHTML = `
        <thead>${headerHTML}</thead>
        <tbody>${bodyHTML}</tbody>
      `;
    } else {
      resultsInfo.textContent = `${data.affectedRows} row(s) affected (${data.duration}ms)`;
      
      let detailsHTML = `
        <tr><td>Affected Rows</td><td>${data.affectedRows}</td></tr>
        <tr><td>Insert ID</td><td>${data.insertId !== null ? data.insertId : 'N/A'}</td></tr>
        <tr><td>Message/Info</td><td>${escapeHTML(data.info || 'Successful completion.')}</td></tr>
      `;
      
      resultsTable.innerHTML = `
        <thead><tr><th colspan="2">Mutation Summary</th></tr></thead>
        <tbody>${detailsHTML}</tbody>
      `;

      loadDatabaseMetadata();
      await loadState();
      updateUI();
    }
  } catch (err) {
    queryStatus.textContent = "Connection error.";
    errorMessage.textContent = err.message;
    errorBanner.classList.remove("hidden");
  }
}

// Start application when DOM load completes
document.addEventListener("DOMContentLoaded", initApp);

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

// --- Local Storage Management ---
function saveState() {
  localStorage.setItem("focusflow_tasks", JSON.stringify(state.tasks));
  localStorage.setItem("focusflow_categories", JSON.stringify(state.categories));
  localStorage.setItem("focusflow_theme", state.theme);
  localStorage.setItem("focusflow_username", state.username);
  localStorage.setItem("focusflow_avatar", state.avatar);
}

function loadState() {
  const savedTasks = localStorage.getItem("focusflow_tasks");
  const savedCats = localStorage.getItem("focusflow_categories");
  const savedTheme = localStorage.getItem("focusflow_theme");
  const savedUsername = localStorage.getItem("focusflow_username");
  const savedAvatar = localStorage.getItem("focusflow_avatar");

  if (savedTasks) {
    state.tasks = JSON.parse(savedTasks);
  } else {
    state.tasks = [...DEFAULT_TASKS];
  }

  if (savedCats) {
    state.categories = JSON.parse(savedCats);
  }

  if (savedTheme) {
    state.theme = savedTheme;
  }

  if (savedUsername) {
    state.username = savedUsername;
  }

  if (savedAvatar) {
    state.avatar = savedAvatar;
  }
}

// --- Initialize App ---
function initApp() {
  loadState();
  
  // Set theme class
  if (state.theme === "dark") {
    document.body.classList.add("dark-mode");
    const themeIcon = document.getElementById("theme-icon");
    if (themeIcon) themeIcon.setAttribute("data-lucide", "sun");
  }

  // Set Profile display
  const avatarEl = document.getElementById("user-avatar-display");
  if (avatarEl) avatarEl.src = state.avatar;
  const usernameInput = document.getElementById("settings-username");
  if (usernameInput) usernameInput.value = state.username;
  const avatarInput = document.getElementById("settings-avatar");
  if (avatarInput) avatarInput.value = state.avatar;

  // Render Date Indicator on Daily Sprint
  updateSprintDateDisplay();

  // Setup Event Listeners
  setupEventListeners();

  // Route to initial view (Home)
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
  if (greetingEl) greetingEl.textContent = `Stay Focused, ${state.username}.`;

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
    priorityAlertWidget.classList.remove("hidden");
    const countAlertEl = document.getElementById("priority-alert-count");
    const dueAlertEl = document.getElementById("priority-alert-due");

    countAlertEl.textContent = `${highPriorityPending.length} High Priority`;
    
    const tasksWithDeadline = highPriorityPending.filter(t => t.deadline).map(t => new Date(t.deadline).getTime());
    if (tasksWithDeadline.length > 0) {
      const nextDeadline = new Date(Math.min(...tasksWithDeadline));
      dueAlertEl.textContent = `Due before ${nextDeadline.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    } else {
      dueAlertEl.textContent = "Action required today";
    }
  } else {
    priorityAlertWidget.classList.add("hidden");
  }

  // Render list panels
  renderHomeTaskList();
  renderSprintTaskList();
  renderFoldersGrid();
  updateSettingsStats(totalTasks, completedTasks, pendingTasks, completionPct);
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
  state.activeView = viewName;
  
  document.querySelectorAll(".app-view").forEach(view => {
    view.classList.remove("active");
  });
  
  const targetView = document.getElementById(`view-${viewName}`);
  if (targetView) {
    targetView.classList.add("active");
    targetView.scrollTop = 0;
  }

  if (viewName !== "tasks") {
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
  
  updateUI();
}

// --- Task State Manipulations ---
function toggleTaskCompletion(taskId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (task) {
    task.completed = !task.completed;
    saveState();
    
    const cardEl = document.getElementById(`task-card-${taskId}`);
    if (cardEl) {
      cardEl.classList.toggle("completed", task.completed);
      setTimeout(() => {
        updateUI();
      }, 350);
    } else {
      updateUI();
    }
  }
}

function handleAddTask(e) {
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

  state.tasks.push(newTask);
  saveState();

  titleInput.value = "";
  prioritySelect.value = "Medium";
  deadlineInput.value = "";

  updateUI();

  const newlyCreated = document.getElementById(`task-card-${newTask.id}`);
  if (newlyCreated) {
    newlyCreated.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// Category Custom Addition
function handleAddCategory(e) {
  e.preventDefault();
  const input = document.getElementById("new-category-name");
  if (!input || !input.value.trim()) return;

  const name = input.value.trim();
  const formattedName = name.charAt(0).toUpperCase() + name.slice(1);

  if (state.categories.some(c => c.toLowerCase() === formattedName.toLowerCase())) {
    alert("Category already exists.");
    return;
  }

  state.categories.push(formattedName);
  saveState();
  input.value = "";
  updateUI();
  renderCategoryFormPills();
}

function deleteCategory(catName) {
  if (confirm(`Are you sure you want to delete "${catName}" category? Associated tasks fall back to "Personal".`)) {
    state.categories = state.categories.filter(c => c !== catName);
    state.tasks.forEach(t => {
      if (t.category === catName) {
        t.category = "Personal";
      }
    });

    saveState();
    updateUI();
    renderCategoryFormPills();
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

function executeDeleteTask() {
  if (state.taskToDeleteId) {
    state.tasks = state.tasks.filter(t => t.id !== state.taskToDeleteId);
    saveState();
    closeDeleteModal();
    updateUI();
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
function saveUsername() {
  const input = document.getElementById("settings-username");
  if (input && input.value.trim()) {
    state.username = input.value.trim();
    saveState();
    updateUI();
    alert("Display name updated!");
  }
}

function saveAvatar() {
  const input = document.getElementById("settings-avatar");
  if (input && input.value.trim()) {
    state.avatar = input.value.trim();
    saveState();
    const displayEl = document.getElementById("user-avatar-display");
    if (displayEl) displayEl.src = state.avatar;
    alert("Profile avatar updated!");
  }
}

function resetAllData() {
  if (confirm("WARNING: Wipes tasks and settings cache. Proceed?")) {
    localStorage.removeItem("focusflow_tasks");
    localStorage.removeItem("focusflow_categories");
    localStorage.removeItem("focusflow_theme");
    localStorage.removeItem("focusflow_username");
    localStorage.removeItem("focusflow_avatar");
    
    state.tasks = [...DEFAULT_TASKS];
    state.categories = ["Work", "Personal", "Shopping"];
    state.theme = "light";
    state.username = "Alex";
    state.avatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256&h=256";
    
    document.body.classList.remove("dark-mode");
    const themeIcon = document.getElementById("theme-icon");
    if (themeIcon) themeIcon.setAttribute("data-lucide", "moon");
    const avatarEl = document.getElementById("user-avatar-display");
    if (avatarEl) avatarEl.src = state.avatar;

    saveState();
    renderCategoryFormPills();
    updateUI();
    alert("Workspace reset.");
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
    themeToggleBtn.addEventListener("click", () => {
      const body = document.body;
      const themeIcon = document.getElementById("theme-icon");
      
      if (body.classList.contains("dark-mode")) {
        body.classList.remove("dark-mode");
        state.theme = "light";
        if (themeIcon) themeIcon.setAttribute("data-lucide", "moon");
      } else {
        body.classList.add("dark-mode");
        state.theme = "dark";
        if (themeIcon) themeIcon.setAttribute("data-lucide", "sun");
      }
      
      lucide.createIcons();
      saveState();
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

// Start application when DOM load completes
document.addEventListener("DOMContentLoaded", initApp);

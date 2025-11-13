// Life Compass state & logic with reminders
const STORAGE_KEY = "life-compass-state-v1";

const defaultState = {
  goals: [],
  steps: [], // { id, goalId, title, dueDate, isToday, completed, createdAt, lastReminderDate }
  settings: {
    remindersEnabled: true,
    remindDaysBefore: 1, // days before due date
  },
};

let state = loadState();
const todayStr = new Date().toISOString().slice(0, 10);

// DOM refs
const todayDateLabel = document.getElementById("todayDateLabel");
const statGoals = document.getElementById("statGoals");
const statStepsToday = document.getElementById("statStepsToday");
const statCompleted = document.getElementById("statCompleted");
const motivationText = document.getElementById("motivationText");
const todayList = document.getElementById("todayList");
const quickStepForm = document.getElementById("quickStepForm");
const quickStepText = document.getElementById("quickStepText");
const quickStepGoalSelect = document.getElementById("quickStepGoalSelect");
const goalForm = document.getElementById("goalForm");
const goalsList = document.getElementById("goalsList");

const insightTotalGoals = document.getElementById("insightTotalGoals");
const insightTotalSteps = document.getElementById("insightTotalSteps");
const insightStepsCompleted = document.getElementById("insightStepsCompleted");
const insightCompletionRate = document.getElementById("insightCompletionRate");

const prioritizeTodayBtn = document.getElementById("prioritizeTodayBtn");
const exportBackupBtn = document.getElementById("exportBackupBtn");

const remindersEnabledInput = document.getElementById("remindersEnabled");
const remindDaysBeforeSelect = document.getElementById("remindDaysBefore");

const reminderBanner = document.getElementById("reminderBanner");
const reminderList = document.getElementById("reminderList");

const navLinks = document.querySelectorAll(".nav-link");
const sections = document.querySelectorAll(".content-section");
const premiumPill = document.querySelector(".btn-premium-pill");
const heroButtons = document.querySelectorAll(".hero-cta-row [data-section]");

// --- Storage helpers ---
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    if (!parsed.goals || !parsed.steps) {
      return structuredClone(defaultState);
    }
    if (!parsed.settings) {
      parsed.settings = structuredClone(defaultState.settings);
    }
    return parsed;
  } catch (e) {
    console.warn("Failed to load state, using default", e);
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// --- Utility ---
function uuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function formatDate(dateStr) {
  if (!dateStr) return "No date";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const now = new Date();
  const target = new Date(dateStr + "T00:00:00");
  const diffMs = target - now;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// Simple "smart" due date chooser based on goal timeframe
function pickSmartDueDate(goal) {
  const base = new Date();
  let addDays = 0;
  switch (goal.timeframe) {
    case "Today":
      addDays = 0;
      break;
    case "This Week":
      addDays = 2;
      break;
    case "This Month":
      addDays = 7;
      break;
    case "Long Term":
      addDays = 30;
      break;
    default:
      addDays = 3;
  }
  base.setDate(base.getDate() + addDays);
  return base.toISOString().slice(0, 10);
}

// Motivation
const MOTIVATION_LINES = [
  "You don’t have to fix everything today. One small step is enough.",
  "Done > perfect. A tiny messy step still counts.",
  "If it takes less than 2 minutes, do it now.",
  "Future you will be grateful for even 10% effort today.",
  "Rest is also productive when you choose it on purpose.",
];

function randomMotivation() {
  const idx = Math.floor(Math.random() * MOTIVATION_LINES.length);
  return MOTIVATION_LINES[idx];
}

// --- Rendering ---
function renderAll() {
  renderHeader();
  renderQuickGoalSelect();
  renderTodayList();
  renderGoals();
  renderInsights();
  renderSettings();
  renderReminders();
}

function renderHeader() {
  const today = new Date();
  todayDateLabel.textContent = today.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const totalGoals = state.goals.length;
  const stepsToday = state.steps.filter((s) => s.isToday && !s.completed).length;
  const completed = state.steps.filter((s) => s.completed).length;

  statGoals.textContent = totalGoals;
  statStepsToday.textContent = stepsToday;
  statCompleted.textContent = completed;

  motivationText.textContent = randomMotivation();
}

function renderQuickGoalSelect() {
  quickStepGoalSelect.innerHTML = "";
  if (state.goals.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No goals yet – create one first";
    quickStepGoalSelect.appendChild(opt);
    quickStepGoalSelect.disabled = true;
    return;
  }

  quickStepGoalSelect.disabled = false;
  state.goals.forEach((goal) => {
    const opt = document.createElement("option");
    opt.value = goal.id;
    opt.textContent = goal.title.slice(0, 40);
    quickStepGoalSelect.appendChild(opt);
  });
}

function renderTodayList() {
  todayList.innerHTML = "";
  const todaySteps = state.steps
    .filter((s) => s.isToday)
    .sort((a, b) => (a.completed === b.completed ? 0 : a.completed ? 1 : -1));

  if (todaySteps.length === 0) {
    const li = document.createElement("li");
    li.className = "step-item";
    li.innerHTML =
      '<div class="step-main"><div class="step-title">No steps for today yet.</div><div class="step-meta">Add one small thing you can actually do.</div></div>';
    todayList.appendChild(li);
    return;
  }

  todaySteps.forEach((step) => {
    const goal = state.goals.find((g) => g.id === step.goalId);
    const li = document.createElement("li");
    li.className = "step-item" + (step.completed ? " completed" : "");
    li.dataset.stepId = step.id;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "step-checkbox";
    checkbox.checked = step.completed;
    checkbox.addEventListener("change", () => {
      step.completed = checkbox.checked;
      saveState();
      renderAll();
    });

    const main = document.createElement("div");
    main.className = "step-main";

    const title = document.createElement("div");
    title.className = "step-title";
    title.textContent = step.title;

    const meta = document.createElement("div");
    meta.className = "step-meta";
    const pieces = [];
    if (goal) pieces.push(`Goal: ${goal.title}`);
    if (step.dueDate) {
      const dDiff = daysUntil(step.dueDate);
      pieces.push(`Due: ${formatDate(step.dueDate)}${dDiff < 0 ? " (overdue)" : ""}`);
    }
    pieces.push(step.completed ? "Done" : "Not done yet");
    meta.textContent = pieces.join(" • ");

    main.appendChild(title);
    main.appendChild(meta);

    li.appendChild(checkbox);
    li.appendChild(main);
    todayList.appendChild(li);
  });
}

function renderGoals() {
  goalsList.innerHTML = "";

  if (state.goals.length === 0) {
    const p = document.createElement("p");
    p.className = "micro-text";
    p.textContent = "No goals yet. Start with one small thing that matters to you.";
    goalsList.appendChild(p);
    return;
  }

  state.goals.forEach((goal) => {
    const goalCard = document.createElement("div");
    goalCard.className = "goal-card";

    const header = document.createElement("div");
    header.className = "goal-header";

    const left = document.createElement("div");
    const title = document.createElement("div");
    title.className = "goal-title";
    title.textContent = goal.title;

    const meta = document.createElement("div");
    meta.className = "goal-meta";
    meta.textContent = goal.why ? goal.why : "No reason added yet.";

    left.appendChild(title);
    left.appendChild(meta);

    const right = document.createElement("div");
    const chipRow = document.createElement("div");
    chipRow.className = "goal-chip-row";

    const catChip = document.createElement("span");
    catChip.className = "chip category";
    catChip.textContent = goal.category;

    const tfChip = document.createElement("span");
    tfChip.className = "chip timeframe";
    tfChip.textContent = goal.timeframe;

    const stepsForGoal = state.steps.filter((s) => s.goalId === goal.id);
    const countChip = document.createElement("span");
    countChip.className = "chip chip-count";
    const completedCount = stepsForGoal.filter((s) => s.completed).length;
    countChip.textContent = `${completedCount}/${stepsForGoal.length || 0} steps`;

    chipRow.appendChild(catChip);
    chipRow.appendChild(tfChip);
    chipRow.appendChild(countChip);
    right.appendChild(chipRow);

    header.appendChild(left);
    header.appendChild(right);
    goalCard.appendChild(header);

    // Steps
    const list = document.createElement("ul");
    list.className = "goal-steps-list";

    if (stepsForGoal.length === 0) {
      const li = document.createElement("li");
      li.className = "goal-step-item";
      li.innerHTML =
        '<span>No steps yet.</span><span class="goal-step-meta">Add 1–3 tiny steps to get started.</span>';
      list.appendChild(li);
    } else {
      stepsForGoal.forEach((step) => {
        const li = document.createElement("li");
        li.className = "goal-step-item";

        const leftPart = document.createElement("div");
        leftPart.textContent = step.title;

        const rightPart = document.createElement("div");
        rightPart.className = "goal-step-meta";
        const bits = [];
        if (step.dueDate) bits.push(formatDate(step.dueDate));
        if (step.isToday) bits.push("On today's list");
        if (step.completed) bits.push("Done");
        rightPart.textContent = bits.join(" • ") || "No date";

        li.appendChild(leftPart);
        li.appendChild(rightPart);
        list.appendChild(li);
      });
    }

    goalCard.appendChild(list);

    // Footer / mini form
    const footer = document.createElement("div");
    footer.className = "goal-footer";

    const miniForm = document.createElement("form");
    miniForm.className = "mini-form";
    miniForm.dataset.goalId = goal.id;

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Add new step (small & specific)";
    input.required = true;

    const dateInput = document.createElement("input");
    dateInput.type = "date";

    const addBtn = document.createElement("button");
    addBtn.type = "submit";
    addBtn.className = "btn-secondary";
    addBtn.textContent = "Add step";

    miniForm.appendChild(input);
    miniForm.appendChild(dateInput);
    miniForm.appendChild(addBtn);

    miniForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const titleVal = input.value.trim();
      if (!titleVal) return;

      let due = dateInput.value;
      if (!due) {
        due = pickSmartDueDate(goal);
      }

      const step = {
        id: uuid(),
        goalId: goal.id,
        title: titleVal,
        dueDate: due,
        isToday: true,
        completed: false,
        createdAt: new Date().toISOString(),
        lastReminderDate: null,
      };
      state.steps.push(step);
      saveState();
      input.value = "";
      dateInput.value = "";
      renderAll();
    });

    footer.appendChild(miniForm);
    goalCard.appendChild(footer);

    goalsList.appendChild(goalCard);
  });
}

function renderInsights() {
  const totalGoals = state.goals.length;
  const totalSteps = state.steps.length;
  const stepsCompleted = state.steps.filter((s) => s.completed).length;
  const completionRate =
    totalSteps === 0 ? 0 : Math.round((stepsCompleted / totalSteps) * 100);

  insightTotalGoals.textContent = totalGoals;
  insightTotalSteps.textContent = totalSteps;
  insightStepsCompleted.textContent = stepsCompleted;
  insightCompletionRate.textContent = `${completionRate}%`;
}

function renderSettings() {
  remindersEnabledInput.checked = !!state.settings.remindersEnabled;
  remindDaysBeforeSelect.value = String(state.settings.remindDaysBefore);
}

// --- Reminders ---
function renderReminders() {
  if (!state.settings.remindersEnabled) {
    reminderBanner.classList.add("hidden");
    reminderList.innerHTML = "";
    return;
  }

  const upcoming = [];
  const daysBefore = Number(state.settings.remindDaysBefore);

  state.steps.forEach((step) => {
    if (!step.dueDate || step.completed) return;
    const diff = daysUntil(step.dueDate);
    if (diff === null) return;
    if (diff < 0) return; // already overdue
    if (diff <= daysBefore) {
      upcoming.push(step);
    }
  });

  if (upcoming.length === 0) {
    reminderBanner.classList.add("hidden");
    reminderList.innerHTML = "";
    return;
  }

  reminderBanner.classList.remove("hidden");
  reminderList.innerHTML = "";
  upcoming.slice(0, 5).forEach((step) => {
    const li = document.createElement("li");
    li.className = "reminder-item";
    const goal = state.goals.find((g) => g.id === step.goalId);
    const goalTitle = goal ? goal.title : "Untitled goal";
    const diff = daysUntil(step.dueDate);
    let timeText = "Due today";
    if (diff > 0) timeText = `Due in ${diff} day${diff === 1 ? "" : "s"}`;
    li.textContent = `${step.title} · ${goalTitle} · ${timeText}`;
    reminderList.appendChild(li);
  });

  maybeShowBrowserNotification(upcoming);
}

function maybeShowBrowserNotification(upcomingSteps) {
  if (!state.settings.remindersEnabled) return;
  if (!("Notification" in window)) return;

  // Only notify once per day per step
  const todayDateOnly = new Date().toISOString().slice(0, 10);

  const stepsToNotify = upcomingSteps.filter((step) => {
    return step.lastReminderDate !== todayDateOnly;
  });

  if (stepsToNotify.length === 0) return;

  if (Notification.permission === "default") {
    Notification.requestPermission().then((perm) => {
      if (perm === "granted") {
        maybeShowBrowserNotification(upcomingSteps);
      }
    });
    return;
  }

  if (Notification.permission !== "granted") return;

  const first = stepsToNotify[0];
  const goal = state.goals.find((g) => g.id === first.goalId);
  const goalTitle = goal ? goal.title : "a goal";

  new Notification("Life Compass – step due soon", {
    body: `${first.title} (${goalTitle}) is getting close to its due date.`,
  });

  stepsToNotify.forEach((step) => {
    step.lastReminderDate = todayDateOnly;
  });
  saveState();
}

// --- Export backup ---
function exportBackup() {
  try {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const dateTag = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `life-compass-backup-${dateTag}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Backup export failed", err);
    alert("Sorry, something went wrong while creating the backup file.");
  }
}

// --- Events ---
goalForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = document.getElementById("goalTitle").value.trim();
  if (!title) return;

  const category = document.getElementById("goalCategory").value;
  const timeframe = document.getElementById("goalTimeframe").value;
  const why = document.getElementById("goalWhy").value.trim();

  const goal = {
    id: uuid(),
    title,
    category,
    timeframe,
    why,
    createdAt: new Date().toISOString(),
  };

  state.goals.push(goal);
  saveState();

  // reset
  goalForm.reset();
  document.getElementById("goalCategory").value = "Life";
  document.getElementById("goalTimeframe").value = "Today";

  renderAll();
});

quickStepForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (state.goals.length === 0) return;

  const title = quickStepText.value.trim();
  if (!title) return;

  const selectedGoalId = quickStepGoalSelect.value || state.goals[0].id;
  const goal = state.goals.find((g) => g.id === selectedGoalId) || {
    timeframe: "Today",
  };

  const due = pickSmartDueDate(goal);

  const step = {
    id: uuid(),
    goalId: selectedGoalId,
    title,
    dueDate: due,
    isToday: true,
    completed: false,
    createdAt: new Date().toISOString(),
    lastReminderDate: null,
  };

  state.steps.push(step);
  saveState();

  quickStepForm.reset();
  renderAll();
});

prioritizeTodayBtn.addEventListener("click", () => {
  // Pick up to 7 not-completed steps, prioritizing those with dueDate <= today
  const notDone = state.steps.filter((s) => !s.completed);
  const withDate = notDone.filter((s) => s.dueDate);
  const overdueOrToday = withDate.filter((s) => s.dueDate <= todayStr);
  const others = notDone.filter((s) => !s.dueDate || s.dueDate > todayStr);

  const combined = [...overdueOrToday, ...others];
  const top = combined.slice(0, 7);

  // Set isToday flags
  state.steps.forEach((s) => {
    s.isToday = top.some((t) => t.id === s.id);
  });

  saveState();
  renderAll();
});

// Export backup button
if (exportBackupBtn) {
  exportBackupBtn.addEventListener("click", exportBackup);
}

// Settings changes
remindersEnabledInput.addEventListener("change", () => {
  state.settings.remindersEnabled = remindersEnabledInput.checked;
  saveState();
  renderAll();
});

remindDaysBeforeSelect.addEventListener("change", () => {
  state.settings.remindDaysBefore = Number(remindDaysBeforeSelect.value);
  saveState();
  renderAll();
});

// Navigation
navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    const sectionId = link.dataset.section;
    if (!sectionId) return;
    setActiveSection(sectionId);
  });
});

// Hero buttons that navigate to sections
heroButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const sectionId = btn.dataset.section;
    if (!sectionId) return;
    setActiveSection(sectionId);
  });
});

premiumPill.addEventListener("click", () => {
  setActiveSection("premiumSection");
});

function setActiveSection(sectionId) {
  sections.forEach((sec) => {
    sec.classList.toggle("visible", sec.id === sectionId);
  });
  navLinks.forEach((link) => {
    link.classList.toggle("active", link.dataset.section === sectionId);
  });
}

// Initial render
document.addEventListener("DOMContentLoaded", () => {
  renderAll();
});

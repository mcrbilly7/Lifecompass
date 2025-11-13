// Simple Life Compass state & logic
const STORAGE_KEY = "life-compass-state-v1";

const defaultState = {
  goals: [],
  steps: [], // { id, goalId, title, dueDate, isToday, completed, createdAt }
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
    if (step.dueDate) pieces.push(`Due: ${formatDate(step.dueDate)}`);
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
    dateInput.value = todayStr;

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
      const step = {
        id: uuid(),
        goalId: goal.id,
        title: titleVal,
        dueDate: dateInput.value || todayStr,
        isToday: true,
        completed: false,
        createdAt: new Date().toISOString(),
      };
      state.steps.push(step);
      saveState();
      input.value = "";
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
  const step = {
    id: uuid(),
    goalId: selectedGoalId,
    title,
    dueDate: todayStr,
    isToday: true,
    completed: false,
    createdAt: new Date().toISOString(),
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

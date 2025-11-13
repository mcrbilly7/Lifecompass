// Life Compass - Frontend Logic (no backend, tablet-friendly)
// Uses localStorage only. Designed for GitHub + Vercel static hosting.

const STORAGE_KEY = "life-compass-state-v2";

const defaultState = {
  goals: [],
  steps: [], // { id, goalId, title, dueDate, isToday, completed, createdAt, lastReminderDate, completedAt }
  settings: {
    remindersEnabled: true,
    remindDaysBefore: 1,
  },
  flags: {
    premiumEnabled: true,
    suggestionsEnabled: true,
    experimentalEnabled: false,
  },
  profile: {
    firstUseDate: null,
    activeDays: 0,
    lastActiveDate: null,
  },
  account: {
    hasAccount: false, // learning & personalization only if true
    name: "",
    email: "",
  },
};

let state = loadState();
const todayDateStr = new Date().toISOString().slice(0, 10);

// --- NAV / PAGE ELEMENTS -----------------------------------------------------

const sideLinks = document.querySelectorAll(".side-link");
const sections = document.querySelectorAll(".content-section");
const premiumPill = document.querySelector(".btn-premium-pill");
const topGreeting = document.getElementById("topGreeting");

// Today page
const todayDateLabel = document.getElementById("todayDateLabel");
const statGoals = document.getElementById("statGoals");
const statStepsToday = document.getElementById("statStepsToday");
const statCompleted = document.getElementById("statCompleted");
const motivationText = document.getElementById("motivationText");
const todayList = document.getElementById("todayList");
const todaySuggestions = document.getElementById("todaySuggestions");
const quickStepForm = document.getElementById("quickStepForm");
const quickStepText = document.getElementById("quickStepText");
const quickStepGoalSelect = document.getElementById("quickStepGoalSelect");
const prioritizeTodayBtn = document.getElementById("prioritizeTodayBtn");
const reminderBanner = document.getElementById("reminderBanner");
const reminderList = document.getElementById("reminderList");

// Energy + Overwhelm (Today)
const energySlider = document.getElementById("todayEnergy"); // range input
const overwhelmBtn = document.getElementById("overwhelmBtn");

// Goals page
const goalForm = document.getElementById("goalForm");
const goalsList = document.getElementById("goalsList");

// Ideas page
const shortTermIdeasEl = document.getElementById("shortTermIdeas");
const longTermIdeasEl = document.getElementById("longTermIdeas");
const personalIdeasEl = document.getElementById("personalIdeas");

// Insights page
const insightTotalGoals = document.getElementById("insightTotalGoals");
const insightTotalSteps = document.getElementById("insightTotalSteps");
const insightStepsCompleted = document.getElementById("insightStepsCompleted");
const insightCompletionRate = document.getElementById("insightCompletionRate");
const insightActiveDays = document.getElementById("insightActiveDays");
const insightPersonalization = document.getElementById("insightPersonalization");

// Weekly reset
const weeklyNotesEl = document.getElementById("weeklyNotes");
const weeklyShrinkBtn = document.getElementById("weeklyShrinkBtn");

// Templates
const templateButtons = document.querySelectorAll("[data-template]");

// Settings / notifications / mode
const remindersEnabledInput = document.getElementById("remindersEnabled");
const remindDaysBeforeSelect = document.getElementById("remindDaysBefore");
const adminPassInput = document.getElementById("adminPass");
const modeToggle = document.getElementById("modeToggle");

// Account
const accountToggleBtn = document.getElementById("accountToggleBtn");
const accountNameInput = document.getElementById("accountName");
const accountEmailInput = document.getElementById("accountEmail");
const accountStatusLabel = document.getElementById("accountStatusLabel");

// Export backup
const exportBackupBtn = document.getElementById("exportBackupBtn");

// Admin flags
const adminFlagsForm = document.getElementById("adminFlagsForm");
const flagPremiumEnabled = document.getElementById("flagPremiumEnabled");
const flagSuggestionsEnabled = document.getElementById("flagSuggestionsEnabled");
const flagExperimentalEnabled = document.getElementById("flagExperimentalEnabled");
const adminLink = document.querySelector(".side-link-admin");
const premiumPlanCard = document.getElementById("premiumPlanCard");

// Hamburger / dropdown side nav
const navToggle = document.getElementById("navToggle");
const sideNav = document.querySelector(".side-nav");

// -----------------------------------------------------------------------------
// STATE / STORAGE
// -----------------------------------------------------------------------------

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const base = structuredClone(defaultState);
      base.profile.firstUseDate = todayDateStr;
      base.profile.lastActiveDate = todayDateStr;
      base.profile.activeDays = 1;
      return base;
    }
    const parsed = JSON.parse(raw);
    // merge defaults
    Object.keys(defaultState).forEach((key) => {
      if (parsed[key] == null) parsed[key] = structuredClone(defaultState[key]);
    });
    if (!parsed.profile.firstUseDate) {
      parsed.profile.firstUseDate = todayDateStr;
    }
    return parsed;
  } catch (err) {
    console.warn("Failed to load state, using defaults", err);
    const base = structuredClone(defaultState);
    base.profile.firstUseDate = todayDateStr;
    base.profile.lastActiveDate = todayDateStr;
    base.profile.activeDays = 1;
    return base;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// -----------------------------------------------------------------------------
// UTILITIES
// -----------------------------------------------------------------------------

function uuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function formatDate(dateStr) {
  if (!dateStr) return "No date";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const now = new Date();
  const target = new Date(dateStr + "T00:00:00");
  const diffMs = target - now;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// -----------------------------------------------------------------------------
// MOTIVATION + GREETING
// -----------------------------------------------------------------------------

const MOTIVATION_LINES = [
  "You don’t have to fix everything today. One small step is enough.",
  "Done > perfect. A tiny messy step still counts.",
  "If it takes less than 2 minutes, do it now.",
  "Future you will be grateful for even 10% effort today.",
  "Rest is also productive when you choose it on purpose.",
];

function randomMotivation() {
  return randomItem(MOTIVATION_LINES);
}

function computeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning. One small step is enough.";
  if (hour < 18) return "Good afternoon. You don’t have to do it all today.";
  return "Good evening. It still counts if you start now.";
}

// -----------------------------------------------------------------------------
// PROFILE / LEARNING (ACCOUNT-ONLY)
// -----------------------------------------------------------------------------

function updateActiveDay() {
  const profile = state.profile;
  if (!profile.firstUseDate) profile.firstUseDate = todayDateStr;
  if (profile.lastActiveDate !== todayDateStr) {
    profile.lastActiveDate = todayDateStr;
    profile.activeDays = (profile.activeDays || 0) + 1;
  }
}

function personalizationLevel() {
  if (!state.account.hasAccount) return "Off (guest mode)";
  const days = state.profile.activeDays || 0;
  if (days < 7) return "Starting";
  if (days < 30) return "Learning you";
  if (days < 60) return "Getting personal";
  return "Highly tuned";
}

function getCompletionStats() {
  const completed = state.steps.filter((s) => s.completed && s.dueDate);
  if (completed.length === 0) return { avgDelayDays: 0 };
  let totalDelay = 0;
  completed.forEach((step) => {
    const due = new Date(step.dueDate + "T00:00:00");
    const done = new Date(step.completedAt || step.createdAt);
    const diff = Math.round((done - due) / (1000 * 60 * 60 * 24));
    totalDelay += diff;
  });
  return { avgDelayDays: totalDelay / completed.length };
}

// smart due date based on timeframe + learning (if account enabled)
function pickSmartDueDate(goal) {
  const base = new Date();
  let addDays = 3;
  switch (goal.timeframe) {
    case "Today":
      addDays = 0;
      break;
    case "This Week":
      addDays = 2;
      break;
    case "This Month":
      addDays = 8;
      break;
    case "Long Term":
      addDays = 30;
      break;
  }

  if (state.account.hasAccount) {
    const stats = getCompletionStats();
    if (stats.avgDelayDays > 2) addDays += 3; // more buffer for “late finisher”
  }

  base.setDate(base.getDate() + addDays);
  return base.toISOString().slice(0, 10);
}

// -----------------------------------------------------------------------------
// SUGGESTIONS + IDEAS
// -----------------------------------------------------------------------------

const DEFAULT_SHORT_TERM = [
  "Clean one small surface (desk, nightstand, or chair).",
  "Reply to one message you’ve been avoiding.",
  "Open a school task and do 5 focused minutes.",
  "Drink a full glass of water and stretch.",
  "Put tomorrow’s outfit or bag ready.",
];

const DEFAULT_LONG_TERM = [
  "List 3 things you want better a year from now.",
  "Write one paragraph describing your future self.",
  "Decide on a realistic savings goal for this month.",
  "Pick 2 days for light exercise and commit to them.",
  "Choose one subject to raise by one grade letter.",
];

function getMostUsedCategories() {
  const counts = {};
  state.goals.forEach((g) => {
    counts[g.category] = (counts[g.category] || 0) + 1;
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([cat]) => cat)
    .slice(0, 2);
}

function generateTodaySuggestions() {
  if (!todaySuggestions) return;
  todaySuggestions.innerHTML = "";
  if (!state.flags.suggestionsEnabled) return;

  const base = [...DEFAULT_SHORT_TERM];
  const userCategories = getMostUsedCategories();

  if (state.account.hasAccount) {
    userCategories.forEach((cat) => {
      if (cat === "School") base.push("Spend 10 minutes on the assignment closest to due.");
      if (cat === "Health") base.push("Do a 5 minute walk or light stretch.");
      if (cat === "Money") base.push("Check your balances and move $5 to savings.");
    });
  }

  const unique = [...new Set(base)];
  const picks = unique.slice(0, 5);

  picks.forEach((txt) => {
    const li = document.createElement("li");
    li.className = "suggestion-item";
    li.textContent = txt;
    li.addEventListener("click", () => quickAddSuggestedStep(txt));
    todaySuggestions.appendChild(li);
  });
}

function quickAddSuggestedStep(text) {
  if (state.goals.length === 0) {
    alert("Create a goal first, then attach suggestions to it.");
    return;
  }
  const goal = state.goals[0];
  const due = pickSmartDueDate(goal);
  const step = {
    id: uuid(),
    goalId: goal.id,
    title: text,
    dueDate: due,
    isToday: true,
    completed: false,
    createdAt: new Date().toISOString(),
    lastReminderDate: null,
  };
  state.steps.push(step);
  saveState();
  renderAll();
}

function renderIdeas() {
  if (!shortTermIdeasEl) return;

  shortTermIdeasEl.innerHTML = "";
  DEFAULT_SHORT_TERM.forEach((txt) => {
    const li = document.createElement("li");
    li.className = "idea-item";
    li.textContent = txt;
    li.addEventListener("click", () => quickAddSuggestedStep(txt));
    shortTermIdeasEl.appendChild(li);
  });

  longTermIdeasEl.innerHTML = "";
  DEFAULT_LONG_TERM.forEach((txt) => {
    const li = document.createElement("li");
    li.className = "idea-item";
    li.textContent = txt;
    li.addEventListener("click", () => quickAddSuggestedStep(txt));
    longTermIdeasEl.appendChild(li);
  });

  personalIdeasEl.innerHTML = "";
  if (!state.flags.suggestionsEnabled) {
    const li = document.createElement("li");
    li.className = "idea-item";
    li.textContent = "Personal suggestions are turned off in Admin settings.";
    personalIdeasEl.appendChild(li);
    return;
  }

  const cats = getMostUsedCategories();
  if (!state.account.hasAccount || cats.length === 0) {
    const li = document.createElement("li");
    li.className = "idea-item";
    li.textContent = "Create a free account and add a few goals to see personal suggestions.";
    personalIdeasEl.appendChild(li);
    return;
  }

  cats.forEach((cat) => {
    const li = document.createElement("li");
    li.className = "idea-item";
    if (cat === "School") {
      li.textContent = "Choose one class and write down the next tiny action needed.";
    } else if (cat === "Health") {
      li.textContent = "Pick a realistic bedtime for tonight and prepare for it.";
    } else if (cat === "Money") {
      li.textContent = "Open your banking app and just look, without judging.";
    } else {
      li.textContent = `Do one tiny thing that would move your “${cat}” goals forward.`;
    }
    li.addEventListener("click", () => quickAddSuggestedStep(li.textContent));
    personalIdeasEl.appendChild(li);
  });
}

// -----------------------------------------------------------------------------
// HEADER / SNAPSHOT
// -----------------------------------------------------------------------------

function renderHeaderAndProfile() {
  if (topGreeting) topGreeting.textContent = computeGreeting();

  const today = new Date();
  if (todayDateLabel) {
    todayDateLabel.textContent = today.toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  }

  const totalGoals = state.goals.length;
  const stepsToday = state.steps.filter((s) => s.isToday && !s.completed).length;
  const completed = state.steps.filter((s) => s.completed).length;

  if (statGoals) statGoals.textContent = totalGoals;
  if (statStepsToday) statStepsToday.textContent = stepsToday;
  if (statCompleted) statCompleted.textContent = completed;
  if (motivationText) motivationText.textContent = randomMotivation();

  if (accountStatusLabel) {
    if (state.account.hasAccount) {
      accountStatusLabel.textContent = `Personalization on for ${state.account.name || "you"}`;
    } else {
      accountStatusLabel.textContent = "Guest mode – no learning, just gentle structure.";
    }
  }
}

// -----------------------------------------------------------------------------
// TODAY LIST + ENERGY / OVERWHELM
// -----------------------------------------------------------------------------

function renderQuickGoalSelect() {
  if (!quickStepGoalSelect) return;
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
  if (!todayList) return;
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
      if (checkbox.checked) {
        step.completedAt = new Date().toISOString();
      }
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
      const diff = daysUntil(step.dueDate);
      pieces.push(`Due: ${formatDate(step.dueDate)}${diff < 0 ? " (overdue)" : ""}`);
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

// Overwhelm – shrink to most important 1–3 steps
function applyOverwhelmShrink() {
  const notDone = state.steps.filter((s) => !s.completed);
  if (notDone.length === 0) return;

  // sort by due date: overdue/soon first
  const withDate = notDone.filter((s) => s.dueDate);
  withDate.sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));

  const withoutDate = notDone.filter((s) => !s.dueDate);
  const combined = [...withDate, ...withoutDate];

  const keep = combined.slice(0, 3); // only 1–3 core tasks
  state.steps.forEach((s) => {
    s.isToday = keep.some((k) => k.id === s.id);
  });

  saveState();
  renderAll();
}

function renderReminders() {
  if (!reminderBanner || !reminderList) return;
  if (!state.settings.remindersEnabled) {
    reminderBanner.classList.add("hidden");
    reminderList.innerHTML = "";
    return;
  }

  const daysBefore = Number(state.settings.remindDaysBefore || 1);
  const upcoming = [];

  state.steps.forEach((step) => {
    if (!step.dueDate || step.completed) return;
    const diff = daysUntil(step.dueDate);
    if (diff === null || diff < 0) return;
    if (diff <= daysBefore) upcoming.push(step);
  });

  if (upcoming.length === 0) {
    reminderBanner.classList.add("hidden");
    reminderList.innerHTML = "";
    return;
  }

  reminderBanner.classList.remove("hidden");
  reminderList.innerHTML = "";
  upcoming.slice(0, 4).forEach((step) => {
    const goal = state.goals.find((g) => g.id === step.goalId);
    const diff = daysUntil(step.dueDate);
    let when = "today";
    if (diff > 0) when = `in ${diff} day${diff === 1 ? "" : "s"}`;
    const chip = document.createElement("li");
    chip.className = "reminder-chip";
    chip.textContent = `${step.title} · ${goal ? goal.title : "goal"} · ${when}`;
    reminderList.appendChild(chip);
  });

  maybeShowBrowserNotification(upcoming);
}

// -----------------------------------------------------------------------------
// GOALS
// -----------------------------------------------------------------------------

function renderGoals() {
  if (!goalsList) return;
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
    meta.textContent = goal.why || "No reason added yet.";

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
    const completedCount = stepsForGoal.filter((s) => s.completed).length;
    const countChip = document.createElement("span");
    countChip.className = "chip";
    countChip.textContent = `${completedCount}/${stepsForGoal.length || 0} steps`;

    chipRow.appendChild(catChip);
    chipRow.appendChild(tfChip);
    chipRow.appendChild(countChip);
    right.appendChild(chipRow);

    header.appendChild(left);
    header.appendChild(right);
    goalCard.appendChild(header);

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
      if (!due) due = pickSmartDueDate(goal);

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
      renderAll();
      input.value = "";
      dateInput.value = "";
    });

    footer.appendChild(miniForm);
    goalCard.appendChild(footer);

    goalsList.appendChild(goalCard);
  });
}

// -----------------------------------------------------------------------------
// INSIGHTS + WEEKLY RESET
// -----------------------------------------------------------------------------

function renderInsights() {
  if (!insightTotalGoals) return;
  const totalGoals = state.goals.length;
  const totalSteps = state.steps.length;
  const stepsCompleted = state.steps.filter((s) => s.completed).length;
  const completionRate =
    totalSteps === 0 ? 0 : Math.round((stepsCompleted / totalSteps) * 100);

  insightTotalGoals.textContent = totalGoals;
  insightTotalSteps.textContent = totalSteps;
  insightStepsCompleted.textContent = stepsCompleted;
  insightCompletionRate.textContent = `${completionRate}%`;
  insightActiveDays.textContent = state.profile.activeDays || 0;
  insightPersonalization.textContent = personalizationLevel();
}

function applyWeeklyShrink() {
  // Drop or postpone steps that have no due date and are not completed.
  const stillSteps = [];
  state.steps.forEach((s) => {
    if (s.completed) {
      stillSteps.push(s);
      return;
    }
    if (!s.dueDate) {
      // Drop low-priority floating step
      return;
    }
    // push forward to next week
    const date = new Date(s.dueDate + "T00:00:00");
    date.setDate(date.getDate() + 7);
    s.dueDate = date.toISOString().slice(0, 10);
    stillSteps.push(s);
  });
  state.steps = stillSteps;
  saveState();
  renderAll();
}

// -----------------------------------------------------------------------------
// SETTINGS / NOTIFICATIONS / MODE
// -----------------------------------------------------------------------------

function renderSettings() {
  if (!remindersEnabledInput) return;
  remindersEnabledInput.checked = !!state.settings.remindersEnabled;
  remindDaysBeforeSelect.value = String(state.settings.remindDaysBefore || 1);
}

function maybeShowBrowserNotification(upcomingSteps) {
  if (!state.settings.remindersEnabled) return;
  if (!("Notification" in window)) return;

  const todayOnly = todayDateStr;
  const toNotify = upcomingSteps.filter(
    (s) => !s.lastReminderDate || s.lastReminderDate !== todayOnly
  );
  if (toNotify.length === 0) return;

  const askAndNotify = () => {
    const first = toNotify[0];
    const goal = state.goals.find((g) => g.id === first.goalId);
    new Notification("Life Compass – step due soon", {
      body: `${first.title} (${goal ? goal.title : "goal"}) is getting close to its due date.`,
    });
    toNotify.forEach((s) => (s.lastReminderDate = todayOnly));
    saveState();
  };

  if (Notification.permission === "granted") {
    askAndNotify();
  } else if (Notification.permission === "default") {
    Notification.requestPermission().then((perm) => {
      if (perm === "granted") askAndNotify();
    });
  }
}

// -----------------------------------------------------------------------------
// ADMIN FLAGS / PREMIUM VISIBILITY
// -----------------------------------------------------------------------------

function renderAdminFlags() {
  if (!adminFlagsForm) return;
  flagPremiumEnabled.checked = !!state.flags.premiumEnabled;
  flagSuggestionsEnabled.checked = !!state.flags.suggestionsEnabled;
  flagExperimentalEnabled.checked = !!state.flags.experimentalEnabled;
}

function applyAdminFlagsToUI() {
  if (premiumPlanCard) {
    premiumPlanCard.style.display = state.flags.premiumEnabled ? "" : "none";
  }
}

// -----------------------------------------------------------------------------
// TEMPLATES
// -----------------------------------------------------------------------------

function applyTemplate(name) {
  const templates = {
    school: [
      "Write out all assignments due this week.",
      "Spend 10 minutes on the hardest class first.",
      "Pack bag or materials for tomorrow.",
    ],
    room: [
      "Clear just the floor around your bed.",
      "Make a small 'donate / throw out' bag.",
      "Wipe one surface that annoys you most.",
    ],
    money: [
      "Check your main balance without judging.",
      "List your 3 biggest expenses this month.",
      "Move $5 to savings if you can.",
    ],
    mental: [
      "Write down everything that’s on your mind.",
      "Pick one thing you can let go of this week.",
      "Text one person you trust just to say hi.",
    ],
    health: [
      "Drink a full glass of water.",
      "Plan your next bedtime & wake-up time.",
      "Do a 5 minute walk or stretch.",
    ],
    motivation: [
      "Remember one time you got through something hard.",
      "Write one sentence future-you would say to you today.",
      "Choose a tiny win you can get in under 5 minutes.",
    ],
  };

  const pack = templates[name];
  if (!pack) return;

  const mainGoalTitle =
    {
      school: "School Reset",
      room: "Room Reset",
      money: "Money Starter",
      mental: "Mental Clean-Up",
      health: "Health Basics",
      motivation: "Motivation Restart",
    }[name] || "New Goal";

  const goal = {
    id: uuid(),
    title: mainGoalTitle,
    category:
      name === "school"
        ? "School"
        : name === "money"
        ? "Money"
        : name === "health"
        ? "Health"
        : "Life",
    timeframe: name === "money" || name === "health" ? "This Month" : "This Week",
    why: "Template pack added to gently reset this area.",
    createdAt: new Date().toISOString(),
  };
  state.goals.push(goal);

  pack.forEach((text) => {
    const step = {
      id: uuid(),
      goalId: goal.id,
      title: text,
      dueDate: pickSmartDueDate(goal),
      isToday: true,
      completed: false,
      createdAt: new Date().toISOString(),
      lastReminderDate: null,
    };
    state.steps.push(step);
  });

  saveState();
  renderAll();
}

// -----------------------------------------------------------------------------
// ACCOUNT TOGGLE (free, optional, learning-only)
// -----------------------------------------------------------------------------

function toggleAccount() {
  state.account.hasAccount = !state.account.hasAccount;
  if (state.account.hasAccount) {
    state.account.name = (accountNameInput && accountNameInput.value.trim()) || "";
    state.account.email = (accountEmailInput && accountEmailInput.value.trim()) || "";
    alert(
      "Account mode on. Life Compass will now slowly learn your patterns and suggestions get more personal (still on this device only)."
    );
  } else {
    alert("Account mode off. No more learning – just basic suggestions.");
  }
  saveState();
  renderAll();
}

// -----------------------------------------------------------------------------
// RENDER ALL
// -----------------------------------------------------------------------------

function renderAll() {
  renderHeaderAndProfile();
  renderQuickGoalSelect();
  renderTodayList();
  renderGoals();
  renderInsights();
  renderSettings();
  renderReminders();
  generateTodaySuggestions();
  renderIdeas();
  renderAdminFlags();
  applyAdminFlagsToUI();
}

// -----------------------------------------------------------------------------
// NAVIGATION + EVENTS
// -----------------------------------------------------------------------------

function setActiveSection(sectionId) {
  sections.forEach((sec) => {
    sec.classList.toggle("visible", sec.id === sectionId);
  });
  sideLinks.forEach((link) => {
    link.classList.toggle("active", link.dataset.section === sectionId);
  });

  // if side drawer is open on mobile, close it after navigation
  if (sideNav && sideNav.classList.contains("open")) {
    sideNav.classList.remove("open");
  }
}

// Side nav links
sideLinks.forEach((link) => {
  link.addEventListener("click", () => {
    const sectionId = link.dataset.section;
    if (!sectionId) return;
    setActiveSection(sectionId);
  });
});

// Premium pill button goes to Premium section
if (premiumPill) {
  premiumPill.addEventListener("click", () => {
    setActiveSection("premiumSection");
  });
}

// Hamburger / dropdown side nav (three sideways lines)
if (navToggle && sideNav) {
  navToggle.addEventListener("click", () => {
    sideNav.classList.toggle("open");
  });
}

// Goal form
if (goalForm) {
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
    goalForm.reset();
    document.getElementById("goalCategory").value = "Life";
    document.getElementById("goalTimeframe").value = "Today";
    renderAll();
  });
}

// Quick add step
if (quickStepForm) {
  quickStepForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (state.goals.length === 0) {
      alert("Create a goal first.");
      return;
    }
    const title = quickStepText.value.trim();
    if (!title) return;
    const selectedGoalId = quickStepGoalSelect.value || state.goals[0].id;
    const goal = state.goals.find((g) => g.id === selectedGoalId) || state.goals[0];
    const due = pickSmartDueDate(goal);

    const step = {
      id: uuid(),
      goalId: goal.id,
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
}

// Auto-prioritize Today
if (prioritizeTodayBtn) {
  prioritizeTodayBtn.addEventListener("click", () => {
    const notDone = state.steps.filter((s) => !s.completed);
    const withDate = notDone.filter((s) => s.dueDate);
    const overdueOrToday = withDate.filter((s) => s.dueDate <= todayDateStr);
    const others = notDone.filter((s) => !s.dueDate || s.dueDate > todayDateStr);
    const combined = [...overdueOrToday, ...others];
    const energy = energySlider ? Number(energySlider.value || 2) : 2;
    let maxTasks = 5;
    if (energy === 1) maxTasks = 3;
    if (energy === 3) maxTasks = 7;
    const top = combined.slice(0, maxTasks);
    state.steps.forEach((s) => {
      s.isToday = top.some((t) => t.id === s.id);
    });
    saveState();
    renderAll();
  });
}

// Overwhelm button
if (overwhelmBtn) {
  overwhelmBtn.addEventListener("click", () => {
    applyOverwhelmShrink();
  });
}

// Weekly reset shrink button
if (weeklyShrinkBtn) {
  weeklyShrinkBtn.addEventListener("click", () => {
    applyWeeklyShrink();
  });
}

// Settings listeners
if (remindersEnabledInput) {
  remindersEnabledInput.addEventListener("change", () => {
    state.settings.remindersEnabled = remindersEnabledInput.checked;
    saveState();
    renderAll();
  });
}

if (remindDaysBeforeSelect) {
  remindDaysBeforeSelect.addEventListener("change", () => {
    state.settings.remindDaysBefore = Number(remindDaysBeforeSelect.value);
    saveState();
    renderAll();
  });
}

// Admin unlock
if (adminPassInput) {
  adminPassInput.addEventListener("change", () => {
    const val = adminPassInput.value.trim();
    // Simple prototype passphrase – feel free to change
    if (val === "lifecompass270") {
      if (adminLink) adminLink.classList.remove("hidden");
      adminPassInput.value = "";
      alert("Admin mode unlocked (local prototype).");
    } else if (val !== "") {
      alert("Wrong admin passphrase.");
    }
  });
}

// Admin flags change
if (adminFlagsForm) {
  adminFlagsForm.addEventListener("change", () => {
    state.flags.premiumEnabled = flagPremiumEnabled.checked;
    state.flags.suggestionsEnabled = flagSuggestionsEnabled.checked;
    state.flags.experimentalEnabled = flagExperimentalEnabled.checked;
    saveState();
    renderAll();
  });
}

// Account toggle button
if (accountToggleBtn) {
  accountToggleBtn.addEventListener("click", () => {
    toggleAccount();
  });
}

// Template buttons
templateButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const name = btn.dataset.template;
    applyTemplate(name);
  });
});

// Export backup
if (exportBackupBtn) {
  exportBackupBtn.addEventListener("click", () => {
    try {
      const dataStr = JSON.stringify(state, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `life-compass-backup-${todayDateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Backup export failed", err);
      alert("Sorry, something went wrong while creating the backup file.");
    }
  });
}

// -----------------------------------------------------------------------------
// INIT
// -----------------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  updateActiveDay();
  saveState();
  renderAll();
  // Start on Home by default
  setActiveSection("homeSection");
});

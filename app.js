/* ==========================================
   PAISAPILOT — MAROON & OFF-WHITE EDITION
   JavaScript application
========================================== */

const COLORS = {
  Food: "#8F4558",
  Transport: "#B58A58",
  Education: "#9B819F",
  Fun: "#C88772",
  Subscriptions: "#B77F8B",
  Savings: "#A89B83",
  Income: "#557D61",
  Other: "#B6A6A0"
};

const ICONS = {
  Food: "☕",
  Transport: "🚇",
  Education: "📚",
  Fun: "🎟️",
  Subscriptions: "🎵",
  Savings: "🐷",
  Income: "↗",
  Other: "🧾"
};

const THEME = {
  light: {
    chartGrid: "#EAE0D9",
    chartLine: "#6F2035",
    chartFillTop: "rgba(111,32,53,.22)",
    chartFillBottom: "rgba(111,32,53,.01)"
  },
  dark: {
    chartGrid: "#49363D",
    chartLine: "#C58B9A",
    chartFillTop: "rgba(197,139,154,.24)",
    chartFillBottom: "rgba(197,139,154,.01)"
  }
};

let state = null;
let activeUser = null;
let editingBudget = null;
let contributingGoal = null;

const $ = selector => document.querySelector(selector);

const money = value =>
  "₹" + Math.round(Number(value) || 0).toLocaleString("en-IN");

function localDate() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function safe(value) {
  const node = document.createElement("span");
  node.textContent = String(value ?? "");
  return node.innerHTML;
}

function monthKey(date = localDate()) {
  return date.slice(0, 7);
}

function formatDate(date) {
  return new Date(date + "T12:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function expenses() {
  return state.transactions.filter(item => item.type === "expense");
}

function toast(message) {
  const element = $("#toast");
  if (!element) return;

  element.textContent = message;
  element.classList.add("show");

  clearTimeout(toast.timer);

  toast.timer = setTimeout(() => {
    element.classList.remove("show");
  }, 2700);
}

async function api(path, method = "GET", body) {
  const response = await fetch(path, {
    method,
    credentials: "same-origin",
    headers: body ? {
      "Content-Type": "application/json"
    } : {},
    body: body ? JSON.stringify(body) : undefined
  });

  const result = await response.json().catch(() => ({
    error: "The server returned an unreadable response."
  }));

  if (!response.ok) {
    throw new Error(result.error || "Request failed.");
  }

  return result;
}

async function saveState() {
  try {
    await api("/api/state", "POST", state);
    return true;
  } catch (error) {
    // Do not let callers show a success toast when the server rejected the save.
    toast(`Could not save your data: ${error.message}`);
    throw error;
  }
}

/* ==========================================
   AUTHENTICATION
========================================== */

function chooseAuthTab(which) {
  const login = which === "login";

  $("#login-form").hidden = !login;
  $("#register-form").hidden = login;

  document.querySelectorAll("[data-auth-tab]").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.authTab === which
    );
  });

  $("#auth-error").textContent = "";
}

document.querySelectorAll("[data-auth-tab]").forEach(button => {
  button.addEventListener("click", () => {
    chooseAuthTab(button.dataset.authTab);
  });
});

async function enterApplication(user) {
  activeUser = user;

  $("#auth-screen").hidden = true;
  $("#app-shell").hidden = false;

  $("#profile-name").textContent = user.name;
  $("#profile-email").textContent = user.email;

  const initial = (user.name.trim()[0] || "P").toUpperCase();

  $("#profile-avatar").textContent = initial;
  $("#top-avatar").textContent = initial;
  $("#greeting-name").textContent =
    user.name.trim().split(/\s+/)[0];

  state = await api("/api/state");

  draw();
  navigate(location.hash.slice(1) || "dashboard");
}

async function start() {
  try {
    const result = await api("/api/me");

    if (result.user) {
      await enterApplication(result.user);
    }
  } catch (error) {
    $("#auth-error").textContent = error.message;
  }
}

async function authSubmit(form, path) {
  const button = form.querySelector("[type=submit]");

  button.disabled = true;
  $("#auth-error").textContent = "";

  const data = Object.fromEntries(new FormData(form));

  if (data.email) data.email = data.email.trim();
  if (data.name) data.name = data.name.trim();

  try {
    const result = await api(path, "POST", data);

    form.reset();
    await enterApplication(result.user);
  } catch (error) {
    $("#auth-error").textContent = error.message;
  } finally {
    button.disabled = false;
  }
}

$("#login-form").addEventListener("submit", event => {
  event.preventDefault();
  authSubmit(event.currentTarget, "/api/login");
});

$("#register-form").addEventListener("submit", event => {
  event.preventDefault();
  authSubmit(event.currentTarget, "/api/register");
});

$("#logout-button").addEventListener("click", async () => {
  try {
    await api("/api/logout", "POST", {});

    state = null;
    activeUser = null;

    $("#app-shell").hidden = true;
    $("#auth-screen").hidden = false;

    chooseAuthTab("login");
    toast("You’ve been logged out.");
  } catch (error) {
    toast(error.message);
  }
});

/* ==========================================
   RESPONSIVE SIDEBAR
========================================== */

function setSidebar(open) {
  const mobile = window.matchMedia(
    "(max-width: 820px)"
  ).matches;

  $("#sidebar").classList.toggle("open", open);
  $("#sidebar").classList.toggle("closed", !open);

  $("#sidebar-backdrop").classList.toggle(
    "visible",
    open && mobile
  );

  $(".main-content").classList.toggle(
    "sidebar-wide",
    !open
  );

  $("#menu-toggle").setAttribute(
    "aria-expanded",
    String(open)
  );
}

function closeSidebar() {
  if (window.matchMedia("(max-width: 820px)").matches) {
    setSidebar(false);
  }
}

$("#menu-toggle").addEventListener("click", () => {
  setSidebar(!$("#sidebar").classList.contains("open"));
});

$("#sidebar-backdrop").addEventListener("click", closeSidebar);

window.matchMedia("(max-width: 820px)").addEventListener(
  "change",
  event => setSidebar(!event.matches)
);

setSidebar(window.innerWidth > 820);

/* ==========================================
   MAROON THEME SWITCHER
========================================== */

function setTheme(theme) {
  const isDark = theme === "dark";
  const selectedTheme = isDark ? "dark" : "light";

  document.body.dataset.theme = selectedTheme;

  $("#theme-toggle").setAttribute(
    "aria-pressed",
    String(isDark)
  );

  $("#theme-toggle").setAttribute(
    "aria-label",
    `Switch to ${isDark ? "light" : "dark"} theme`
  );

  $("#theme-word").textContent = isDark ? "Dark" : "Light";

  $(".theme-symbol").textContent = isDark ? "☾" : "☼";

  localStorage.setItem("paisapilot-theme", selectedTheme);

  // Redraw the chart using the selected theme's palette.
  if (state) {
    drawChart(
      currentMonthTransactions().filter(
        item => item.type === "expense"
      )
    );

    drawInsights();
  }
}

$("#theme-toggle").addEventListener("click", () => {
  setTheme(
    document.body.dataset.theme === "dark"
      ? "light"
      : "dark"
  );
});

setTheme(
  localStorage.getItem("paisapilot-theme") || "light"
);

/* ==========================================
   NAVIGATION
========================================== */

function navigate(page) {
  const allowed = [
    "dashboard",
    "transactions",
    "budgets",
    "goals",
    "recurring",
    "insights"
  ];

  if (!allowed.includes(page)) page = "dashboard";

  document.querySelectorAll(".page").forEach(element => {
    element.classList.toggle(
      "active",
      element.id === `page-${page}`
    );
  });

  document.querySelectorAll(".nav-item").forEach(element => {
    element.classList.toggle(
      "active",
      element.dataset.page === page
    );
  });

  const labels = {
    dashboard: "Overview",
    transactions: "Transactions",
    budgets: "Budgets",
    goals: "Savings goals",
    recurring: "Recurring payments",
    insights: "Insights"
  };

  $("#page-title").textContent = labels[page];

  closeSidebar();
  history.replaceState(null, "", `#${page}`);

  if (page === "transactions") drawTransactions();
  if (page === "insights") drawInsights();
}

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", () => {
    navigate(button.dataset.page);
  });
});

document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => {
    navigate(button.dataset.go);
  });
});

document.querySelectorAll("[data-open]").forEach(button => {
  button.addEventListener("click", () => {
    openDialog(button.dataset.open);
  });
});

window.addEventListener("hashchange", () => {
  navigate(location.hash.slice(1));
});

$("#help-btn").addEventListener("click", () => {
  $("#help-dialog").showModal();
});

/* ==========================================
   DIALOGS
========================================== */

function openDialog(which) {
  if (which === "transaction") {
    const form = $("#transaction-form");

    form.reset();
    form.elements.date.value = localDate();

    populateCategorySelect();
    $("#transaction-dialog").showModal();
  }

  if (which === "goal") {
    const form = $("#goal-form");

    form.reset();
    form.elements.saved.value = 0;

    $("#goal-dialog").showModal();
  }

  if (which === "recurring") {
    const form = $("#recurring-form");

    form.reset();
    form.elements.date.value = localDate();

    $("#recurring-dialog").showModal();
  }

  if (which === "budget") {
    editingBudget = null;

    const form = $("#budget-form");

    form.reset();
    $("#budget-dialog-title").textContent =
      "Add a budget category";

    form.elements.category.disabled = false;

    $("#budget-dialog").showModal();
  }
}

function populateCategorySelect() {
  const categories = Object.keys(state.budgets);
  const select = $("#tx-category-select");

  select.innerHTML = categories
    .map(name => (
      `<option value="${safe(name)}">${safe(name)}</option>`
    ))
    .join("") +
    '<option value="Other">Other (unbudgeted)</option>';
}
/* ==========================================
   RENDER APPLICATION
========================================== */

function draw() {
  if (!state) return;

  $("#header-date").textContent =
    new Date().toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short"
    }).toUpperCase();

  $("#nav-tx-count").textContent = state.transactions.length;

  drawDashboard();
  drawTransactions();
  drawBudgets();
  drawGoals();
  drawRecurring();
  drawInsights();
  populateCategoryFilter();
}

function currentMonthTransactions() {
  return state.transactions.filter(
    item => item.date.startsWith(monthKey())
  );
}

function categorySpend() {
  const result = {};

  currentMonthTransactions()
    .filter(item => item.type === "expense")
    .forEach(item => {
      result[item.category] =
        (result[item.category] || 0) + Number(item.amount);
    });

  return result;
}

/* ==========================================
   DASHBOARD
========================================== */

function drawDashboard() {
  const monthTransactions = currentMonthTransactions();

  const monthlyExpenses = monthTransactions.filter(
    item => item.type === "expense"
  );

  const monthlyIncome = monthTransactions.filter(
    item => item.type === "income"
  );

  const spent = monthlyExpenses.reduce(
    (sum, item) => sum + Number(item.amount),
    0
  );

  const income = monthlyIncome.reduce(
    (sum, item) => sum + Number(item.amount),
    0
  );

  const budgetTotal = Object.values(state.budgets).reduce(
    (sum, amount) => sum + Number(amount),
    0
  );

  const saved = state.goals.reduce(
    (sum, goal) => sum + Number(goal.saved),
    0
  );

  $("#balance").textContent = money(state.balance);
  $("#spent").textContent = money(spent);

  $("#spend-status").textContent =
    spent > budgetTotal
      ? "Above your total planned budgets"
      : spent
        ? "This month so far"
        : "Add your first expense to begin";

  $("#budget-left").textContent =
    money(Math.max(0, budgetTotal - spent));

  $("#budget-caption").textContent =
    `of ${money(budgetTotal)} planned`;

  $("#budget-meter").style.width =
    Math.min(100, spent / Math.max(budgetTotal, 1) * 100) + "%";

  $("#saved-total").textContent = money(saved);

  $("#goal-caption").textContent = state.goals.length
    ? `${state.goals.length} goal${state.goals.length === 1 ? "" : "s"} in progress`
    : "Start with something you want";

  $("#chart-total").textContent = money(spent);

  $("#chart-days").textContent =
    new Date().toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric"
    });

  drawChart(monthlyExpenses);
  drawDashboardBudgets();
  drawRecent();
  drawDashboardGoals();
}

/* ==========================================
   MAROON SPENDING CHART
========================================== */

function drawChart(transactions) {
  const canvas = $("#spending-chart");
  if (!canvas) return;

  const context = canvas.getContext("2d");
  const bounds = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  if (!bounds.width || !bounds.height) return;

  canvas.width = Math.round(bounds.width * dpr);
  canvas.height = Math.round(bounds.height * dpr);

  context.setTransform(dpr, 0, 0, dpr, 0, 0);

  const width = bounds.width;
  const height = bounds.height;

  context.clearRect(0, 0, width, height);

  const palette =
    THEME[document.body.dataset.theme === "dark" ? "dark" : "light"];

  // Subtle off-white / dark-wine chart grid.
  context.strokeStyle = palette.chartGrid;
  context.lineWidth = 1;

  for (let i = 0; i < 5; i++) {
    const y = 4 + (height - 8) * i / 4;

    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }

  const today = new Date();

  const days = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0
  ).getDate();

  const values = Array(days).fill(0);

  transactions.forEach(item => {
    const day = Number(item.date.slice(8, 10));

    if (day > 0 && day <= days) {
      values[day - 1] += Number(item.amount);
    }
  });

  const max = Math.max(...values, 1) * 1.2;
  const step = width / Math.max(1, days - 1);

  const yAt = value =>
    height - 6 - value / max * (height - 14);

  // Fill below the spending line.
  context.beginPath();

  values.forEach((value, index) => {
    if (index) {
      context.lineTo(index * step, yAt(value));
    } else {
      context.moveTo(0, yAt(value));
    }
  });

  context.lineTo(width, height);
  context.lineTo(0, height);
  context.closePath();

  const fill = context.createLinearGradient(0, 0, 0, height);

  fill.addColorStop(0, palette.chartFillTop);
  fill.addColorStop(1, palette.chartFillBottom);

  context.fillStyle = fill;
  context.fill();

  // Burgundy line.
  context.beginPath();

  values.forEach((value, index) => {
    if (index) {
      context.lineTo(index * step, yAt(value));
    } else {
      context.moveTo(0, yAt(value));
    }
  });

  context.strokeStyle = palette.chartLine;
  context.lineWidth = 2;
  context.lineJoin = "round";
  context.lineCap = "round";
  context.stroke();
}

/* ==========================================
   DASHBOARD BUDGETS
========================================== */

function budgetRow(category, limit, spent) {
  const percent = limit
    ? Math.min(100, spent / limit * 100)
    : spent ? 100 : 0;

  return `
    <div class="compact-budget ${spent > limit ? "over" : ""}">
      <div class="compact-head">
        <span>${ICONS[category] || "🧾"} ${safe(category)}</span>
        <b>${money(spent)} / ${money(limit)}</b>
      </div>
      <div class="progress">
        <i style="width:${percent}%"></i>
      </div>
    </div>`;
}

function drawDashboardBudgets() {
  const spent = categorySpend();

  const budgets = Object.entries(state.budgets)
    .sort((a, b) =>
      (spent[b[0]] || 0) / Math.max(1, b[1]) -
      (spent[a[0]] || 0) / Math.max(1, a[1])
    )
    .slice(0, 4);

  $("#dashboard-budgets").innerHTML = budgets.length
    ? budgets.map(([category, limit]) =>
        budgetRow(category, limit, spent[category] || 0)
      ).join("")
    : '<div class="empty-state">Add your first category budget.</div>';
}

/* ==========================================
   RECENT TRANSACTIONS
========================================== */

function txRow(item) {
  return `
    <div class="list-row">
      <span class="item-icon">
        ${ICONS[item.category] || "✦"}
      </span>
      <span class="item-copy">
        <b>${safe(item.name)}</b>
        <small>${safe(item.category)} · ${formatDate(item.date)}</small>
      </span>
      <span class="item-amount ${item.type}">
        ${item.type === "income" ? "+" : "−"}${money(item.amount)}
      </span>
    </div>`;
}

function drawRecent() {
  const items = [...state.transactions]
    .sort((a, b) =>
      b.date.localeCompare(a.date) || b.id - a.id
    )
    .slice(0, 5);

  $("#recent-list").innerHTML = items.length
    ? items.map(txRow).join("")
    : '<div class="empty-state">Your first transaction is a great place to start.</div>';
}

function drawDashboardGoals() {
  $("#dashboard-goals").innerHTML =
    state.goals.slice(0, 3).map(goal => `
      <div class="list-row">
        <span class="item-icon">${safe(goal.emoji || "🎯")}</span>
        <span class="item-copy">
          <b>${safe(goal.name)}</b>
          <small>${money(goal.saved)} of ${money(goal.target)}</small>
        </span>
        <span class="item-amount">
          ${goal.target
            ? Math.round(goal.saved / goal.target * 100)
            : 0}%
        </span>
      </div>
    `).join("") ||
    '<div class="empty-state">Create a savings goal.</div>';
}

/* ==========================================
   TRANSACTION FILTERS
========================================== */

function populateCategoryFilter() {
  const select = $("#tx-category-filter");
  const current = select.value;

  const categories = [...new Set([
    ...Object.keys(state.budgets),
    ...state.transactions.map(item => item.category)
  ])].sort();

  select.innerHTML =
    '<option value="all">All categories</option>' +
    categories.map(category =>
      `<option value="${safe(category)}">${safe(category)}</option>`
    ).join("");

  if (categories.includes(current)) {
    select.value = current;
  }
}

function drawTransactions() {
  if (!state) return;

  const search = $("#tx-search").value.trim().toLowerCase();
  const type = $("#tx-type-filter").value;
  const category = $("#tx-category-filter").value;

  const rows = [...state.transactions]
    .sort((a, b) =>
      b.date.localeCompare(a.date) || b.id - a.id
    )
    .filter(item =>
      (!search ||
        `${item.name} ${item.category}`.toLowerCase().includes(search)) &&
      (type === "all" || item.type === type) &&
      (category === "all" || item.category === category)
    );

  $("#transaction-table").innerHTML = rows.map(item => `
    <tr>
      <td>${ICONS[item.category] || "✦"} &nbsp;${safe(item.name)}</td>
      <td>${safe(item.category)}</td>
      <td>${formatDate(item.date)}</td>
      <td>${item.type === "income" ? "Income" : "Expense"}</td>
      <td class="right ${item.type}">
        ${item.type === "income" ? "+" : "−"}${money(item.amount)}
      </td>
      <td>
        <button class="delete-row"
          data-delete-tx="${item.id}"
          aria-label="Delete transaction">×</button>
      </td>
    </tr>
  `).join("");

  $("#tx-empty").hidden = rows.length > 0;

  document.querySelectorAll("[data-delete-tx]").forEach(button => {
    button.addEventListener("click", () => {
      deleteTransaction(Number(button.dataset.deleteTx));
    });
  });
}

$("#tx-search").addEventListener("input", drawTransactions);
$("#tx-type-filter").addEventListener("change", drawTransactions);
$("#tx-category-filter").addEventListener("change", drawTransactions);
/* ==========================================
   DELETE TRANSACTION
========================================== */

async function deleteTransaction(id) {
  if (!confirm("Delete this transaction?")) return;

  const item = state.transactions.find(
    transaction => transaction.id === id
  );

  if (!item) return;

  state.balance -= item.type === "income"
    ? Number(item.amount)
    : -Number(item.amount);

  if (item.type === "income") {
    state.monthlyIncome = Math.max(
      0,
      Number(state.monthlyIncome) - Number(item.amount)
    );
  }

  state.transactions = state.transactions.filter(
    transaction => transaction.id !== id
  );

  await saveState();
  draw();
  toast("Transaction deleted.");
}

/* ==========================================
   BUDGET MANAGEMENT
========================================== */

function drawBudgets() {
  const spent = categorySpend();
  const entries = Object.entries(state.budgets);

  const total = entries.reduce(
    (sum, [, limit]) => sum + Number(limit),
    0
  );

  const used = Object.values(spent).reduce(
    (sum, amount) => sum + amount,
    0
  );

  $("#budget-total").textContent = money(total);
  $("#budget-spent").textContent = money(used);
  $("#budget-available").textContent =
    money(Math.max(0, total - used));

  $("#budget-cards").innerHTML = entries.length
    ? entries.map(([category, limit]) => {
        const amount = spent[category] || 0;

        const percent = limit
          ? Math.min(100, amount / limit * 100)
          : amount ? 100 : 0;

        return `
          <article class="budget-card">
            <div class="budget-card-head">
              <span class="budget-emoji">
                ${ICONS[category] || "🧾"}
              </span>
              <span class="budget-card-info">
                <b>${safe(category)}</b>
                <small>
                  ${amount > limit
                    ? "Over your limit"
                    : "Monthly spending limit"}
                </small>
              </span>
              <span class="budget-card-amount">
                <b>${money(limit)}</b>
                <small>limit</small>
              </span>
            </div>

            <div class="progress">
              <i style="width:${percent}%;${
                amount > limit ? "background:#C86F70" : ""
              }"></i>
            </div>

            <div class="budget-card-foot">
              <span>${money(amount)} spent</span>
              <span>
                ${amount > limit
                  ? `${money(amount - limit)} over`
                  : `${money(limit - amount)} left`}
              </span>
            </div>

            <div class="budget-card-actions">
              <button class="text-button danger"
                data-remove-budget="${safe(category)}">
                Remove
              </button>
              <button class="text-button"
                data-edit-budget="${safe(category)}">
                Edit limit
              </button>
            </div>
          </article>`;
      }).join("")
    : `<div class="empty-panel">
        <h2>No budgets yet</h2>
        <p>Add any category and set the monthly limit that works for you.</p>
        <button class="button dark" data-open="budget">Add a budget</button>
      </div>`;

  document.querySelectorAll("[data-edit-budget]").forEach(button => {
    button.addEventListener("click", () => {
      editBudget(button.dataset.editBudget);
    });
  });

  document.querySelectorAll("[data-remove-budget]").forEach(button => {
    button.addEventListener("click", () => {
      removeBudget(button.dataset.removeBudget);
    });
  });

  document.querySelectorAll("#budget-cards [data-open]").forEach(button => {
    button.addEventListener("click", () => {
      openDialog(button.dataset.open);
    });
  });
}

function editBudget(category) {
  editingBudget = category;

  const form = $("#budget-form");

  form.elements.category.value = category;
  form.elements.category.disabled = true;
  form.elements.limit.value = state.budgets[category];

  $("#budget-dialog-title").textContent = `Edit ${category} budget`;
  $("#budget-dialog").showModal();
}

$("#budget-form").addEventListener("submit", async event => {
  event.preventDefault();

  const form = event.currentTarget;
  const data = new FormData(form);

  const name = (
    editingBudget || form.elements.category.value
  ).trim();

  const limit = Number(data.get("limit"));

  if (
    !name ||
    name.length > 32 ||
    !Number.isFinite(limit) ||
    limit < 0
  ) return;

  state.budgets[name] = limit;
  editingBudget = null;

  form.elements.category.disabled = false;

  await saveState();

  $("#budget-dialog").close();

  draw();
  toast("Budget saved.");
});

async function removeBudget(category) {
  if (!confirm(
    `Remove the ${category} budget? Existing transactions will stay in your history.`
  )) return;

  delete state.budgets[category];

  await saveState();
  draw();
  toast("Budget category removed.");
}

/* ==========================================
   SAVINGS GOALS
========================================== */

function drawGoals() {
  const host = $("#goal-cards");

  host.innerHTML = state.goals.map(goal => {
    const percent = goal.target
      ? Math.min(100, goal.saved / goal.target * 100)
      : 0;

    return `
      <article class="goal-card">
        <div class="goal-card-top">
          <span class="goal-card-icon">
            ${safe(goal.emoji || "🎯")}
          </span>
          <button class="delete-row"
            data-delete-goal="${goal.id}"
            aria-label="Delete goal">×</button>
        </div>

        <h3>${safe(goal.name)}</h3>
        <p>${money(goal.saved)} saved of ${money(goal.target)}</p>

        <div class="progress">
          <i style="width:${percent}%"></i>
        </div>

        <div class="goal-foot">
          <span>${Math.round(percent)}% complete</span>
          <span>${money(Math.max(0, goal.target - goal.saved))} to go</span>
        </div>

        <div class="goal-actions">
          <button class="text-button" data-contribute="${goal.id}">
            ＋ Add savings
          </button>
          <span class="fine-print">
            ${percent >= 100 ? "Goal reached!" : "Keep it going"}
          </span>
        </div>
      </article>`;
  }).join("");

  $("#goals-empty").hidden = state.goals.length > 0;
  host.hidden = state.goals.length === 0;

  host.querySelectorAll("[data-contribute]").forEach(button => {
    button.addEventListener("click", () => {
      openContribution(Number(button.dataset.contribute));
    });
  });

  host.querySelectorAll("[data-delete-goal]").forEach(button => {
    button.addEventListener("click", () => {
      deleteGoal(Number(button.dataset.deleteGoal));
    });
  });
}

$("#goal-form").addEventListener("submit", async event => {
  event.preventDefault();

  const data = new FormData(event.currentTarget);

  state.goals.push({
    id: Date.now(),
    name: data.get("name").trim(),
    target: Number(data.get("target")),
    saved: Number(data.get("saved")) || 0,
    emoji: "🎯"
  });

  await saveState();

  $("#goal-dialog").close();

  draw();
  toast("Savings goal created.");
});

function openContribution(id) {
  contributingGoal = state.goals.find(goal => goal.id === id);

  if (!contributingGoal) return;

  $("#contribution-goal-name").textContent =
    `${contributingGoal.name} · ${money(contributingGoal.saved)} of ${money(contributingGoal.target)} saved`;

  $("#contribution-form").reset();
  $("#contribution-dialog").showModal();
}

$("#contribution-form").addEventListener("submit", async event => {
  event.preventDefault();

  const amount = Number(
    new FormData(event.currentTarget).get("amount")
  );

  if (!contributingGoal || amount <= 0) return;

  contributingGoal.saved += amount;
  state.balance -= amount;

  state.transactions.push({
    id: Date.now(),
    name: `Savings contribution: ${contributingGoal.name}`,
    category: "Savings",
    amount,
    type: "expense",
    date: localDate()
  });

  await saveState();

  $("#contribution-dialog").close();

  draw();
  toast("Savings contribution recorded.");
});

async function deleteGoal(id) {
  if (!confirm("Delete this savings goal?")) return;

  state.goals = state.goals.filter(goal => goal.id !== id);

  await saveState();

  draw();
  toast("Goal removed.");
}

/* ==========================================
   RECURRING PAYMENTS
========================================== */

function monthlyEquivalent(item) {
  const amount = Number(item.amount) || 0;

  if (item.frequency === "Weekly") return amount * 4.33;
  if (item.frequency === "Yearly") return amount / 12;
  if (item.frequency === "One time") return 0;

  return amount;
}

function drawRecurring() {
  const sorted = [...state.subscriptions].sort(
    (a, b) => a.date.localeCompare(b.date)
  );

  const monthly = sorted.reduce(
    (sum, item) => sum + monthlyEquivalent(item),
    0
  );

  const next = sorted.find(item => item.date >= localDate());

  $("#recurring-total").textContent = money(monthly);

  $("#next-payment").textContent = next
    ? money(next.amount)
    : "Nothing scheduled";

  $("#next-payment-date").textContent = next
    ? `${safe(next.name)} · ${formatDate(next.date)}`
    : "Add a reminder to see what’s coming.";

  $("#recurring-list").innerHTML = sorted.map(item => `
    <article class="recurring-card">
      <span class="item-icon">${safe(item.emoji || "◷")}</span>
      <span class="item-copy">
        <b>${safe(item.name)}</b>
        <small>
          ${safe(item.frequency || "Monthly")} · Next due ${formatDate(item.date)}
        </small>
      </span>
      <span class="item-amount">${money(item.amount)}</span>
      <button class="delete-row"
        data-delete-recurring="${item.id}"
        aria-label="Delete reminder">×</button>
    </article>
  `).join("");

  $("#recurring-empty").hidden = sorted.length > 0;
  $("#recurring-list").hidden = sorted.length === 0;

  document.querySelectorAll("[data-delete-recurring]").forEach(button => {
    button.addEventListener("click", () => {
      deleteRecurring(Number(button.dataset.deleteRecurring));
    });
  });
}
$("#recurring-form").addEventListener("submit", async event => {
  event.preventDefault();

  const data = new FormData(event.currentTarget);

  state.subscriptions.push({
    id: Date.now(),
    name: data.get("name").trim(),
    amount: Number(data.get("amount")),
    date: data.get("date"),
    frequency: data.get("frequency"),
    emoji: "◷"
  });

  await saveState();

  $("#recurring-dialog").close();

  draw();
  toast("Payment reminder saved.");
});

async function deleteRecurring(id) {
  if (!confirm("Delete this payment reminder?")) return;

  state.subscriptions = state.subscriptions.filter(
    item => item.id !== id
  );

  await saveState();

  draw();
  toast("Reminder removed.");
}

/* ==========================================
   SPENDING INSIGHTS
========================================== */

function drawInsights() {
  if (!state) return;

  const allTime = $("#insight-period").value === "all";

  const selected = allTime
    ? state.transactions
    : currentMonthTransactions();

  const expensesInPeriod = selected.filter(
    item => item.type === "expense"
  );

  const incomeInPeriod = selected.filter(
    item => item.type === "income"
  );

  const spent = expensesInPeriod.reduce(
    (sum, item) => sum + Number(item.amount),
    0
  );

  const income = incomeInPeriod.reduce(
    (sum, item) => sum + Number(item.amount),
    0
  );

  const dayCount = allTime
    ? Math.max(1, new Set(selected.map(item => item.date)).size)
    : Math.max(1, new Date().getDate());

  $("#insight-income").textContent = money(income);
  $("#insight-spent").textContent = money(spent);
  $("#insight-net").textContent = money(income - spent);
  $("#insight-average").textContent = money(spent / dayCount);

  const categories = {};

  expensesInPeriod.forEach(item => {
    categories[item.category] =
      (categories[item.category] || 0) + Number(item.amount);
  });

  const entries = Object.entries(categories).sort(
    (a, b) => b[1] - a[1]
  );

  const maximum = entries[0]?.[1] || 1;

  $("#insight-categories").innerHTML = entries.length
    ? entries.map(([category, amount]) => {
        const color = COLORS[category] || COLORS.Other;

        return `
          <div class="insight-category">
            <div class="insight-cat-head">
              <span>${ICONS[category] || "🧾"} ${safe(category)}</span>
              <b>${money(amount)}</b>
            </div>
            <div class="progress">
              <i style="width:${amount / maximum * 100}%;background:${color}"></i>
            </div>
          </div>`;
      }).join("")
    : '<div class="empty-state">Add expenses to see your category breakdown.</div>';

  const notes = [];

  if (!selected.length) {
    notes.push(
      "Add a few transactions and your money notes will appear here."
    );
  } else {
    if (income > 0) {
      notes.push(
        `You recorded ${money(income)} in income for this period.`
      );
    }

    if (spent > 0) {
      notes.push(
        `Your largest spending category is ${entries[0][0]} at ${money(entries[0][1])}.`
      );
    }

    const budgetTotal = Object.values(state.budgets).reduce(
      (sum, limit) => sum + Number(limit),
      0
    );

    if (!allTime && budgetTotal > 0) {
      notes.push(
        spent <= budgetTotal
          ? `You have ${money(budgetTotal - spent)} left against your combined budget limits.`
          : `Recorded spending is ${money(spent - budgetTotal)} above combined budget limits.`
      );
    }

    const unbudgeted = entries.filter(
      ([category]) => !(category in state.budgets)
    );

    if (unbudgeted.length) {
      const total = unbudgeted.reduce(
        (sum, [, amount]) => sum + amount,
        0
      );

      notes.push(
        `You spent ${money(total)} in categories without a budget.`
      );
    }

    if (state.goals.length) {
      notes.push(
        `You’re working toward ${state.goals.length} savings goal${state.goals.length === 1 ? "" : "s"}.`
      );
    }
  }

  $("#insight-notes").innerHTML = notes.map(note => `
    <div class="insight-note">
      <i>✦</i>
      <span>${safe(note)}</span>
    </div>
  `).join("");
}

$("#insight-period").addEventListener("change", drawInsights);

/* ==========================================
   ADD TRANSACTION
========================================== */

$("#transaction-form").addEventListener("submit", async event => {
  event.preventDefault();

  const data = new FormData(event.currentTarget);

  const amount = Number(data.get("amount"));
  const type = data.get("type");

  state.transactions.push({
    id: Date.now(),
    name: data.get("name").trim(),
    category: data.get("category"),
    amount,
    type,
    date: data.get("date")
  });

  state.balance = Number(state.balance) +
    (type === "income" ? amount : -amount);

  if (type === "income") {
    state.monthlyIncome =
      Number(state.monthlyIncome || 0) + amount;
  }

  await saveState();

  $("#transaction-dialog").close();

  draw();
  toast("Transaction saved.");
});

/* ==========================================
   PURCHASE AFFORDABILITY CHECKER
========================================== */

$("#check-afford").addEventListener("click", () => {
  const amount = Number($("#purchase-amount").value);
  const result = $("#afford-result");

  if (amount <= 0) {
    result.className = "afford-result warn";
    result.textContent =
      "Enter a purchase amount to check it.";
    return;
  }

  const spent = currentMonthTransactions()
    .filter(item => item.type === "expense")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const budget = Object.values(state.budgets).reduce(
    (sum, limit) => sum + Number(limit),
    0
  );

  const remaining = budget - spent;

  const goal = state.goals.find(
    item => item.saved < item.target
  );

  if (remaining - amount >= 0) {
    result.className = "afford-result good";

    result.textContent =
      `Looks possible. You’d have ${money(remaining - amount)} left within your combined budgets` +
      (goal
        ? `, while your ${goal.name} goal stays in view.`
        : ".");
  } else {
    result.className = "afford-result warn";

    result.textContent =
      `This would put you ${money(amount - remaining)} over your combined budget limits` +
      (goal
        ? ` and may slow your ${goal.name} goal.`
        : ".");
  }
});

$("#purchase-amount").addEventListener("keydown", event => {
  if (event.key === "Enter") {
    $("#check-afford").click();
  }
});

/* ==========================================
   RESIZE HANDLING
========================================== */

let chartResizeFrame = null;

window.addEventListener("resize", () => {
  if (!state) return;

  cancelAnimationFrame(chartResizeFrame);

  chartResizeFrame = requestAnimationFrame(() => {
    drawChart(
      currentMonthTransactions().filter(
        item => item.type === "expense"
      )
    );
  });
});


/* ==========================================
   GEMINI AI ASSISTANT
========================================== */

const aiLauncher = $("#ai-launcher");
const aiPanel = $("#ai-panel");
const aiClose = $("#ai-close");
const aiForm = $("#ai-form");
const aiInput = $("#ai-input");
const aiSend = $("#ai-send");
const aiMessages = $("#ai-messages");
const aiSuggestions = $("#ai-suggestions");

function openAiAssistant(open = true) {
  if (!aiPanel || !aiLauncher) return;

  aiPanel.hidden = !open;
  aiLauncher.setAttribute("aria-expanded", String(open));

  if (open) {
    setTimeout(() => aiInput?.focus(), 0);
    aiMessages.scrollTop = aiMessages.scrollHeight;
  }
}

function addAiMessage(role, text, options = {}) {
  const article = document.createElement("article");
  article.className = `ai-message ${role}`;

  if (role === "assistant") {
    const avatar = document.createElement("div");
    avatar.className = "ai-message-avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = "✦";
    article.appendChild(avatar);
  }

  const bubble = document.createElement("div");
  bubble.className = "ai-bubble";

  const paragraph = document.createElement("p");
  paragraph.textContent = text;

  if (options.typing) {
    paragraph.textContent = "";

    const typing = document.createElement("span");
    typing.className = "ai-typing";

    typing.appendChild(
      document.createTextNode("PaisaPilot AI is thinking ")
    );

    for (let i = 0; i < 3; i++) {
      const dot = document.createElement("span");
      dot.setAttribute("aria-hidden", "true");
      typing.appendChild(dot);
    }

    paragraph.appendChild(typing);
  }

  bubble.appendChild(paragraph);
  article.appendChild(bubble);
  aiMessages.appendChild(article);

  aiMessages.scrollTop = aiMessages.scrollHeight;

  return article;
}

async function askPaisaPilotAI(message) {
  const cleaned = String(message || "").trim();

  if (!cleaned || cleaned.length > 2000 || aiSend.disabled) {
    return;
  }

  if (aiSuggestions) {
    aiSuggestions.hidden = true;
  }

  addAiMessage("user", cleaned);

  const typingMessage = addAiMessage(
    "assistant",
    "",
    { typing: true }
  );

  aiSend.disabled = true;
  aiInput.disabled = true;

  try {
    const result = await api(
      "/api/ai-assistant",
      "POST",
      { message: cleaned }
    );

    typingMessage.remove();

    addAiMessage(
      "assistant",
      result.answer ||
        "I couldn't generate a response. Please try again."
    );
  } catch (error) {
    typingMessage.remove();

    addAiMessage(
      "assistant",
      `${error.message || "I couldn't reach the AI assistant."} If the problem continues, check that the PaisaPilot server is running and your Gemini API is available.`
    );
  } finally {
    aiSend.disabled = false;
    aiInput.disabled = false;
    aiInput.value = "";
    aiInput.focus();

    aiMessages.scrollTop = aiMessages.scrollHeight;
  }
}

aiLauncher?.addEventListener("click", () => {
  openAiAssistant(aiPanel.hidden);
});

aiClose?.addEventListener("click", () => {
  openAiAssistant(false);
});

aiForm?.addEventListener("submit", event => {
  event.preventDefault();
  askPaisaPilotAI(aiInput.value);
});

aiInput?.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    aiForm.requestSubmit();
  }
});

aiSuggestions?.querySelectorAll("[data-ai-prompt]").forEach(button => {
  button.addEventListener("click", () => {
    askPaisaPilotAI(button.dataset.aiPrompt);
  });
});


/* ==========================================
   START APPLICATION
========================================== */

start();
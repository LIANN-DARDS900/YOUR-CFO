// js/pages/dashboard.js

function formatMAD(value) {
  const number = Number(value || 0);
  return `${number.toLocaleString("fr-MA")} MAD`;
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }

  return `${Math.round(value * 100)}%`;
}

function getHealthClass(status) {
  if (!status) return "";

  const normalized = status.toLowerCase();

  if (normalized.includes("strong")) return "health-strong";
  if (normalized.includes("stable")) return "health-stable";
  if (normalized.includes("control")) return "health-warning";
  if (normalized.includes("risky")) return "health-risky";

  return "";
}

function renderRecentTransactions(transactions = []) {
  const container = document.getElementById("recentTransactions");

  if (!container) return;

  const recent = [...transactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  if (recent.length === 0) {
    container.innerHTML = `
      <div class="card">
        <p style="margin:0;color:#6b7280;">
          No daily transactions yet. Start by adding expenses from the console or the Expenses page later.
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = recent.map(tx => {
    return `
      <div class="list-item">
        <div>
          <strong>${tx.label}</strong><br>
          <small>${tx.category} • ${tx.intent} • ${tx.date}</small>
        </div>
        <strong>${formatMAD(tx.amount)}</strong>
      </div>
    `;
  }).join("");
}

function renderDashboard() {
  const analysis = CFOEngine.getDashboardAnalysis();

  const {
    data,
    incomeAnalysis,
    expenseAnalysis,
    budgetAnalysis,
    healthAnalysis,
    recommendation
  } = analysis;

  const profile = data.profile;

  document.getElementById("welcomeTitle").textContent = profile
    ? `Good to see you, ${profile.name}`
    : "Welcome to Your CFO";

  document.getElementById("profileBadge").textContent = profile
    ? `${profile.userType} • ${profile.currency}`
    : "No profile";

  document.getElementById("monthlyIncome").textContent =
    formatMAD(incomeAnalysis.safeMonthlyIncome);

  document.getElementById("fixedBills").textContent =
    formatMAD(budgetAnalysis.fixedTotal);

  document.getElementById("dailySpending").textContent =
    formatMAD(expenseAnalysis.totalMonthlyTransactions);

const safeToSpendEl = document.getElementById("safeToSpend");

safeToSpendEl.textContent = formatMAD(budgetAnalysis.safeToSpend);

if (budgetAnalysis.safeToSpend < 0) {
  safeToSpendEl.classList.add("health-risky");
} else {
  safeToSpendEl.classList.remove("health-risky");
}

  document.getElementById("envelopeTotal").textContent =
    formatMAD(budgetAnalysis.envelopeTotal);

  document.getElementById("verdictTitle").textContent =
    recommendation.title;

  document.getElementById("verdictMessage").textContent =
    recommendation.message;

  const healthScore = document.getElementById("healthScore");
  const healthStatus = document.getElementById("healthStatus");

  if (healthAnalysis.score === null) {
    healthScore.textContent = "--";
  } else {
    healthScore.textContent = `${healthAnalysis.score}/100`;
  }

  healthStatus.textContent = healthAnalysis.status;
  healthStatus.className = `card-sub ${getHealthClass(healthAnalysis.status)}`;

  renderRecentTransactions(data.transactions);
}
function renderCFOBriefing() {
  const briefing = BriefingEngine.generate();

  const statusBadge = document.getElementById("briefingStatusBadge");
  const title = document.getElementById("briefingTitle");
  const message = document.getElementById("briefingMessage");
  const todayLimit = document.getElementById("todayLimit");
  const biggestLeak = document.getElementById("biggestLeak");
  const goalRisk = document.getElementById("goalRisk");
  const safeToSpend = document.getElementById("briefingSafeToSpend");
  const actions = document.getElementById("nextActions");

  if (!title) return;

  statusBadge.textContent = `CFO Briefing • ${briefing.status.toUpperCase()}`;
  title.textContent = briefing.title;
  message.textContent = briefing.message;
  todayLimit.textContent = formatMAD(briefing.todayLimit);
  biggestLeak.textContent = `${briefing.leak.category} — ${formatMAD(briefing.leak.amount)}`;
  goalRisk.textContent = briefing.goalRisk.message;
  safeToSpend.textContent = formatMAD(briefing.safeToSpend);

  if (briefing.safeToSpend < 0) {
    safeToSpend.classList.add("health-risky");
    todayLimit.classList.add("health-risky");
  } else {
    safeToSpend.classList.remove("health-risky");
    todayLimit.classList.remove("health-risky");
  }

  actions.innerHTML = briefing.actions.map(action => {
    return `
      <div class="list-item">
        <div>
          <strong>${action}</strong>
        </div>
      </div>
    `;
  }).join("");
}


function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function loadDemoData() {
  const confirmLoad = confirm("This will replace your current data with demo data. Continue?");
  if (!confirmLoad) return;

  CFOStorage.reset();

  CFOStorage.setProfile({
    name: "Ilyas",
    userType: "employee",
    incomeType: "monthly",
    baseIncomeAmount: 8000,
    currency: "MAD",
    riskTolerance: "medium"
  });

  CFOStorage.addFixedBill({
    name: "Rent",
    amount: 2500,
    category: "Housing",
    frequency: "monthly",
    dueDay: 1
  });

  CFOStorage.addFixedBill({
    name: "Phone plan",
    amount: 120,
    category: "Phone",
    frequency: "monthly",
    dueDay: 5
  });

  CFOStorage.addFixedBill({
    name: "Netflix",
    amount: 90,
    category: "Subscriptions",
    frequency: "monthly",
    dueDay: 15
  });

  const coffeeEnv = CFOStorage.addBudgetEnvelope({
    name: "Coffee Budget",
    allocatedAmount: 300,
    category: "Coffee",
    period: "monthly"
  });

  const lunchEnv = CFOStorage.addBudgetEnvelope({
    name: "Daily Lunch",
    allocatedAmount: 880,
    category: "Food",
    period: "monthly"
  });

  const transportEnv = CFOStorage.addBudgetEnvelope({
    name: "Transport Budget",
    allocatedAmount: 600,
    category: "Transport",
    period: "monthly"
  });

  const demoTransactions = [
    ["Coffee", 12, "Coffee", coffeeEnv.id, daysAgo(20), "lifestyle"],
    ["Coffee", 14, "Coffee", coffeeEnv.id, daysAgo(18), "lifestyle"],
    ["Coffee", 15, "Coffee", coffeeEnv.id, daysAgo(16), "lifestyle"],
    ["Coffee", 10, "Coffee", coffeeEnv.id, daysAgo(14), "lifestyle"],
    ["Coffee", 18, "Coffee", coffeeEnv.id, daysAgo(12), "lifestyle"],
    ["Coffee", 13, "Coffee", coffeeEnv.id, daysAgo(10), "lifestyle"],
    ["Coffee", 16, "Coffee", coffeeEnv.id, daysAgo(8), "lifestyle"],
    ["Coffee", 34, "Coffee", coffeeEnv.id, daysAgo(1), "lifestyle"],

    ["Lunch", 40, "Food", lunchEnv.id, daysAgo(1), "essential"],
    ["Lunch", 45, "Food", lunchEnv.id, daysAgo(3), "essential"],
    ["Taxi", 35, "Transport", transportEnv.id, daysAgo(2), "essential"],
    ["Restaurant", 160, "Food", lunchEnv.id, daysAgo(4), "lifestyle"],
    ["Shopping", 450, "Shopping", null, daysAgo(8), "lifestyle"],
    ["Gaming accessory", 300, "Entertainment", null, daysAgo(15), "lifestyle"]
  ];

  demoTransactions.forEach(item => {
    CFOStorage.addTransaction({
      label: item[0],
      amount: item[1],
      category: item[2],
      envelopeId: item[3],
      date: item[4],
      quantity: 1,
      intent: item[5]
    });
  });

  CFOStorage.addGoal({
    title: "Buy Laptop",
    targetAmount: 10000,
    currentAmount: 2000,
    monthlyContribution: 1500,
    priority: "medium"
  });

  alert("Demo data loaded.");
  location.reload();
}

function exportData() {
  const data = CFOStorage.load();
  const json = JSON.stringify(data, null, 2);

  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "your-cfo-data.json";
  link.click();

  URL.revokeObjectURL(url);
}

function resetData() {
  const confirmReset = confirm("This will delete all Your CFO data from this browser. Continue?");
  if (!confirmReset) return;

  CFOStorage.reset();
  alert("Data reset.");
  location.href = "onboarding.html";
}

function setupImportData() {
  const input = document.getElementById("importFile");
  if (!input) return;

  input.addEventListener("change", event => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function(e) {
      try {
        const importedData = JSON.parse(e.target.result);

        if (
          !importedData ||
          !Array.isArray(importedData.transactions) ||
          !Array.isArray(importedData.fixedBills) ||
          !Array.isArray(importedData.budgetEnvelopes)
        ) {
          alert("Invalid Your CFO data file.");
          return;
        }

        CFOStorage.save(importedData);
        alert("Data imported successfully.");
        location.reload();
      } catch (error) {
        alert("Could not import data. Invalid JSON file.");
      }
    };

    reader.readAsText(file);
  });
}

function initDashboardPage() {
  renderDashboard();
  renderCFOBriefing();
  setupImportData();
}

document.addEventListener("DOMContentLoaded", initDashboardPage);
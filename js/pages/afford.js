// js/pages/afford.js

let lastAffordResult = null;

function formatMAD(value) {
  const number = Number(value || 0);
  return `${number.toLocaleString("fr-MA")} MAD`;
}

function formatImpact(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }

  return `${Math.round(value * 100)}%`;
}

function renderResult(result) {
  lastAffordResult = result;

  document.getElementById("resultEmpty").style.display = "none";
  document.getElementById("resultContent").style.display = "block";

  const verdict = document.getElementById("resultVerdict");
  const title = document.getElementById("resultTitle");

  verdict.textContent = result.verdict;
  verdict.className = `card-value ${result.statusClass || ""}`;

  title.textContent = result.title;

  document.getElementById("resultMessage").textContent = result.message;
  document.getElementById("resultAmount").textContent = formatMAD(result.amount);
  document.getElementById("resultSafe").textContent = formatMAD(result.safeToSpend);
  document.getElementById("resultImpact").textContent = formatImpact(result.purchaseImpact);

  const actions = document.getElementById("resultActions");

  if (result.verdict === "YES" || result.verdict === "YES_BUT_CAREFUL") {
    actions.innerHTML = `
      <button class="btn btn-primary" onclick="addAsExpense()">Add as Expense</button>
      <button class="btn" onclick="location.href='dashboard.html'">Back to Dashboard</button>
    `;
    return;
  }

  if (result.verdict === "WAIT" || result.verdict === "SET_GOAL") {
    actions.innerHTML = `
      <button class="btn btn-primary" onclick="createGoalFromPurchase()">Create Goal</button>
      <button class="btn" onclick="location.href='dashboard.html'">Back to Dashboard</button>
    `;
    return;
  }

  actions.innerHTML = "";
}

function handleAffordSubmit(event) {
  event.preventDefault();

  const purchase = {
    name: document.getElementById("purchaseName").value.trim(),
    amount: Number(document.getElementById("purchaseAmount").value),
    category: document.getElementById("purchaseCategory").value,
    intent: document.getElementById("purchaseIntent").value,
    timing: document.getElementById("purchaseTiming").value
  };

  if (!purchase.name || purchase.amount <= 0) {
    alert("Please enter a valid purchase name and price.");
    return;
  }

  const data = CFOStorage.load();
  const result = AffordabilityEngine.checkPurchase(purchase, data);

  result.purchase = purchase;

  renderResult(result);
}

function addAsExpense() {
  if (!lastAffordResult || !lastAffordResult.purchase) return;

  const purchase = lastAffordResult.purchase;

  CFOStorage.addTransaction({
    label: purchase.name,
    amount: purchase.amount,
    category: purchase.category,
    envelopeId: null,
    date: CFO_today(),
    quantity: 1,
    intent: purchase.intent
  });

  alert("Purchase added as expense.");
  location.href = "expenses.html";
}

function createGoalFromPurchase() {
  if (!lastAffordResult || !lastAffordResult.suggestedGoal) return;

  CFOStorage.addGoal({
    title: lastAffordResult.suggestedGoal.title,
    targetAmount: lastAffordResult.suggestedGoal.targetAmount,
    currentAmount: 0,
    monthlyContribution: lastAffordResult.suggestedGoal.monthlyContribution,
    priority: "medium",
    linkedPurchase: lastAffordResult.purchase
  });

  alert("Goal created successfully.");
  location.href = "goals.html";
}

function initAffordPage() {
  const form = document.getElementById("affordForm");

  if (form) {
    form.addEventListener("submit", handleAffordSubmit);
  }
}

document.addEventListener("DOMContentLoaded", initAffordPage);
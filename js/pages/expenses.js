// js/pages/expenses.js
// FINAL MVP V1 + Lifestyle Creep Alert + Delete Transaction

function formatMAD(value) {
  const number = Number(value || 0);
  return `${number.toLocaleString("fr-MA")} MAD`;
}

function setTodayDate() {
  const dateInput = document.getElementById("date");
  if (dateInput && !dateInput.value) {
    dateInput.value = CFO_today();
  }
}

function loadEnvelopeOptions() {
  const data = CFOStorage.load();
  const select = document.getElementById("envelopeId");

  if (!select) return;

  const activeEnvelopes = data.budgetEnvelopes.filter(env => env.active !== false);

  select.innerHTML = `<option value="">No envelope</option>`;

  activeEnvelopes.forEach(env => {
    const option = document.createElement("option");
    option.value = env.id;
    option.textContent = `${env.name} — ${formatMAD(env.allocatedAmount)}`;
    select.appendChild(option);
  });
}

function renderStats() {
  const data = CFOStorage.load();
  const analysis = ExpenseEngine.analyze(data.transactions);

  const lifestyle = analysis.byIntent.lifestyle || 0;
  const essential = analysis.byIntent.essential || 0;

  document.getElementById("monthTotal").textContent =
    formatMAD(analysis.totalMonthlyTransactions);

  document.getElementById("lifestyleTotal").textContent =
    formatMAD(lifestyle);

  document.getElementById("essentialTotal").textContent =
    formatMAD(essential);
}

function getEnvelopeName(envelopeId) {
  if (!envelopeId) return "";

  const data = CFOStorage.load();
  const envelope = data.budgetEnvelopes.find(env => env.id === envelopeId);

  return envelope ? envelope.name : "";
}

function renderTransactions() {
  const data = CFOStorage.load();
  const container = document.getElementById("transactionsList");

  if (!container) return;

  const transactions = [...data.transactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  if (transactions.length === 0) {
    container.innerHTML = `
      <div class="card">
        <p style="margin:0;color:#6b7280;">
          No transactions yet. Add your first expense above.
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = transactions.map(tx => {
    const envelopeName = getEnvelopeName(tx.envelopeId);
    const flags = tx.systemFlags || [];
    const hasCreep = flags.includes("lifestyle_creep");
    const overLimit = flags.includes("over_daily_limit");
    const noProfile = flags.includes("no_profile");
    const noIncomeLifestyle = flags.includes("no_income_lifestyle");
    const budgetPressure = (
      flags.includes("budget_pressure") ||
      flags.includes("turns_budget_negative")
    );

    return `
      <div class="list-item">
        <div>
          <strong>${CFO_escapeHTML(tx.label)}</strong>
          ${hasCreep ? `<span class="transaction-flag flag-danger">Cost of Life Alert</span>` : ""}
          ${overLimit ? `<span class="transaction-flag flag-warning">Over Daily Limit</span>` : ""}
          ${budgetPressure ? `<span class="transaction-flag flag-danger">Budget Pressure</span>` : ""}
          ${noProfile ? `<span class="transaction-flag flag-warning">Profile Needed</span>` : ""}
          ${noIncomeLifestyle ? `<span class="transaction-flag flag-danger">No-Income Lifestyle Risk</span>` : ""}
          <br>
          <small>
            ${CFO_escapeHTML(tx.category)} • ${CFO_escapeHTML(tx.intent)} • Qty: ${CFO_escapeHTML(tx.quantity)} • ${CFO_escapeHTML(tx.date)}
            ${envelopeName ? `• Envelope: ${CFO_escapeHTML(envelopeName)}` : ""}
          </small>
        </div>

        <div style="display:flex;align-items:center;gap:12px;">
          <strong>${formatMAD(tx.amount)}</strong>
          <button class="btn btn-danger" data-transaction-id="${CFO_escapeHTML(tx.id)}">
            Delete
          </button>
        </div>
      </div>
    `;
  }).join("");

  container.querySelectorAll("[data-transaction-id]").forEach(button => {
    button.addEventListener("click", () => {
      deleteTransaction(button.dataset.transactionId);
    });
  });
}

function deleteTransaction(id) {
  const confirmDelete = confirm("Delete this transaction?");
  if (!confirmDelete) return;

  const data = CFOStorage.load();

  data.transactions = data.transactions.filter(tx => tx.id !== id);

  CFOStorage.save(data);

  renderStats();
  renderTransactions();
}

function showLifestyleAlert(alertData) {
  if (!alertData) return;

  const message = `
Cost of Life Alert 🚨

${alertData.message}

Your CFO thinks this may be lifestyle creep:
you are not necessarily consuming more, you may be choosing a more expensive version of the same habit.

Creep amount: ${alertData.creepAmount} MAD above your normal median.
`;

  alert(message);
}

function handleExpenseSubmit(event) {
  event.preventDefault();

  const label = document.getElementById("label").value.trim();
  const amount = Number(document.getElementById("amount").value);
  const category = document.getElementById("category").value;
  const envelopeId = document.getElementById("envelopeId").value || null;
  const intent = document.getElementById("intent").value;
  const quantity = Number(document.getElementById("quantity").value || 1);
  const date = document.getElementById("date").value || CFO_today();

  if (!label || amount <= 0) {
    alert("Please enter a valid expense name and amount.");
    return;
  }

const transactionDraft = {
  label,
  amount,
  category,
  envelopeId,
  intent,
  quantity,
  date
};

const dataBeforeSave = CFOStorage.load();

const cfoDecision = DecisionGuardEngine.evaluateExpenseBeforeSave(
  transactionDraft,
  dataBeforeSave
);

if (cfoDecision.requiresConfirmation) {
  const confirmSave = confirm(
    `${cfoDecision.title}\n\n${cfoDecision.message}\n\nDo you want to save it anyway?`
  );

  if (!confirmSave) {
    return;
  }
}

const savedTransaction = CFOStorage.addTransaction({
  ...transactionDraft,
  systemFlags: cfoDecision.systemFlags || []
});
  const dataAfterSave = CFOStorage.load();

  const lifestyleAlert = ExpenseEngine.detectLifestyleCreep(
    savedTransaction,
    dataAfterSave.transactions
  );

  if (lifestyleAlert) {
    const data = CFOStorage.load();

    data.transactions = data.transactions.map(tx => {
      if (tx.id !== savedTransaction.id) return tx;

      return {
        ...tx,
        systemFlags: [...(tx.systemFlags || []), "lifestyle_creep"]
      };
    });

    CFOStorage.save(data);
    showLifestyleAlert(lifestyleAlert);
  }

  event.target.reset();
  setTodayDate();

  renderStats();
  renderTransactions();
}

function initExpensesPage() {
  setTodayDate();
  loadEnvelopeOptions();
  renderStats();
  renderTransactions();

  const form = document.getElementById("expenseForm");
  if (form) {
    form.addEventListener("submit", handleExpenseSubmit);
  }
}

document.addEventListener("DOMContentLoaded", initExpensesPage);

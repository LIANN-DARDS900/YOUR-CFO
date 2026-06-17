// js/pages/envelopes.js

function formatMAD(value) {
  const number = Number(value || 0);
  return `${number.toLocaleString("fr-MA")} MAD`;
}

function getCurrentMonthTransactions(transactions = []) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  return transactions.filter(tx => {
    const txDate = new Date(tx.date);

    return (
      txDate.getMonth() === currentMonth &&
      txDate.getFullYear() === currentYear
    );
  });
}

function getEnvelopeUsage(envelopeId, transactions = []) {
  return transactions
    .filter(tx => tx.envelopeId === envelopeId)
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
}

function renderEnvelopes() {
  const data = CFOStorage.load();

  const envelopes = data.budgetEnvelopes.filter(env => env.active !== false);
  const monthTransactions = getCurrentMonthTransactions(data.transactions);

  let totalBudget = 0;
  let totalUsed = 0;

  envelopes.forEach(env => {
    totalBudget += Number(env.allocatedAmount || 0);
    totalUsed += getEnvelopeUsage(env.id, monthTransactions);
  });

  const remaining = totalBudget - totalUsed;

  document.getElementById("envelopeTotal").textContent = formatMAD(totalBudget);
  document.getElementById("usedTotal").textContent = formatMAD(totalUsed);
  document.getElementById("remainingTotal").textContent = formatMAD(remaining);

  const container = document.getElementById("envelopesList");

  if (!container) return;

  if (envelopes.length === 0) {
    container.innerHTML = `
      <div class="card">
        <p style="margin:0;color:#6b7280;">
          No envelopes yet. Create one for coffee, lunch, transport, or shopping.
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = envelopes.map(env => {
    const used = getEnvelopeUsage(env.id, monthTransactions);
    const allocated = Number(env.allocatedAmount || 0);
    const remaining = allocated - used;
    const usageRate = allocated > 0 ? Math.round((used / allocated) * 100) : 0;

    let statusText = "Good";
    let statusColor = "#22c55e";

    if (usageRate >= 100) {
      statusText = "Over budget";
      statusColor = "#ef4444";
    } else if (usageRate >= 80) {
      statusText = "Careful";
      statusColor = "#f59e0b";
    }

    return `
      <div class="card">
        <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;">
          <div>
            <strong style="font-size:18px;">${env.name}</strong><br>
            <small style="color:#6b7280;">
              ${env.category} • ${env.period}
            </small>
          </div>

          <button class="btn btn-danger" onclick="deleteEnvelope('${env.id}')">Delete</button>
        </div>

        <div style="margin-top:16px;">
          <div class="card-title">Budget usage</div>
          <div class="card-value">${formatMAD(used)} / ${formatMAD(allocated)}</div>
          <div class="card-sub">Remaining: ${formatMAD(remaining)}</div>
        </div>

        <div style="margin-top:14px;height:12px;background:#e5e7eb;border-radius:999px;overflow:hidden;">
          <div style="height:100%;width:${Math.min(usageRate, 100)}%;background:${statusColor};"></div>
        </div>

        <div style="margin-top:10px;color:${statusColor};font-weight:800;">
          ${statusText} • ${usageRate}%
        </div>
      </div>
    `;
  }).join("");
}

function deleteEnvelope(id) {
  const data = CFOStorage.load();

  data.budgetEnvelopes = data.budgetEnvelopes.filter(env => env.id !== id);

  data.transactions = data.transactions.map(tx => {
    if (tx.envelopeId === id) {
      return {
        ...tx,
        envelopeId: null
      };
    }

    return tx;
  });

  CFOStorage.save(data);
  renderEnvelopes();
}

function handleEnvelopeSubmit(event) {
  event.preventDefault();

  const name = document.getElementById("name").value.trim();
  const allocatedAmount = Number(document.getElementById("allocatedAmount").value);
  const category = document.getElementById("category").value;
  const period = document.getElementById("period").value;

  if (!name || allocatedAmount <= 0) {
    alert("Please enter a valid envelope name and amount.");
    return;
  }

  CFOStorage.addBudgetEnvelope({
    name,
    allocatedAmount,
    category,
    period
  });

  event.target.reset();

  renderEnvelopes();
}

function initEnvelopesPage() {
  const form = document.getElementById("envelopeForm");

  if (form) {
    form.addEventListener("submit", handleEnvelopeSubmit);
  }

  renderEnvelopes();
}

document.addEventListener("DOMContentLoaded", initEnvelopesPage);
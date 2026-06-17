// js/pages/bills.js

function formatMAD(value) {
  const number = Number(value || 0);
  return `${number.toLocaleString("fr-MA")} MAD`;
}

function normalizeBillToMonthlyLocal(bill) {
  const amount = Number(bill.amount || 0);

  switch (bill.frequency) {
    case "weekly":
      return (amount * 52) / 12;

    case "yearly":
      return amount / 12;

    case "monthly":
    default:
      return amount;
  }
}

function getFixedTotal(bills = []) {
  return bills
    .filter(bill => bill.active !== false)
    .reduce((sum, bill) => sum + normalizeBillToMonthlyLocal(bill), 0);
}

function renderBills() {
  const data = CFOStorage.load();
  const bills = data.fixedBills || [];

  const activeBills = bills.filter(bill => bill.active !== false);
  const total = getFixedTotal(activeBills);

  document.getElementById("fixedTotal").textContent = formatMAD(Math.round(total));
  document.getElementById("billCount").textContent = activeBills.length;

  const note = document.getElementById("billNote");

  if (activeBills.length === 0) {
    note.textContent = "No fixed bills yet. Add rent, phone plan, internet, subscriptions, etc.";
  } else {
    note.textContent = "These bills are treated as real monthly commitments by Your CFO.";
  }

  const container = document.getElementById("billsList");

  if (!container) return;

  if (activeBills.length === 0) {
    container.innerHTML = `
      <div class="card">
        <p style="margin:0;color:#6b7280;">
          No fixed bills yet. Add your first recurring payment above.
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = activeBills.map(bill => {
    const monthlyEquivalent = Math.round(normalizeBillToMonthlyLocal(bill));

    return `
      <div class="list-item">
        <div>
          <strong>${bill.name}</strong><br>
          <small>
            ${bill.category} • ${bill.frequency} • Due day: ${bill.dueDay}
            <br>
            Monthly equivalent: ${formatMAD(monthlyEquivalent)}
          </small>
        </div>

        <div style="display:flex;align-items:center;gap:12px;">
          <strong>${formatMAD(bill.amount)}</strong>
          <button class="btn btn-danger" onclick="deleteBill('${bill.id}')">Delete</button>
        </div>
      </div>
    `;
  }).join("");
}

function deleteBill(id) {
  const data = CFOStorage.load();

  data.fixedBills = data.fixedBills.filter(bill => bill.id !== id);

  CFOStorage.save(data);
  renderBills();
}

function handleBillSubmit(event) {
  event.preventDefault();

  const name = document.getElementById("name").value.trim();
  const amount = Number(document.getElementById("amount").value);
  const category = document.getElementById("category").value;
  const frequency = document.getElementById("frequency").value;
  const dueDay = Number(document.getElementById("dueDay").value || 1);

  if (!name || amount <= 0) {
    alert("Please enter a valid bill name and amount.");
    return;
  }

  CFOStorage.addFixedBill({
    name,
    amount,
    category,
    frequency,
    dueDay
  });

  event.target.reset();
  document.getElementById("dueDay").value = 1;

  renderBills();
}

function initBillsPage() {
  const form = document.getElementById("billForm");

  if (form) {
    form.addEventListener("submit", handleBillSubmit);
  }

  renderBills();
}

document.addEventListener("DOMContentLoaded", initBillsPage);
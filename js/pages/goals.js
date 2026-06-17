// js/pages/goals.js

function formatMAD(value) {
  const number = Number(value || 0);
  return `${number.toLocaleString("fr-MA")} MAD`;
}

function calculateGoalProgress(goal) {
  const target = Number(goal.targetAmount || 0);
  const current = Number(goal.currentAmount || 0);

  if (target <= 0) return 0;

  return Math.min(100, Math.round((current / target) * 100));
}

function calculateMonthsNeeded(goal) {
  const target = Number(goal.targetAmount || 0);
  const current = Number(goal.currentAmount || 0);
  const monthly = Number(goal.monthlyContribution || 0);

  const remaining = target - current;

  if (remaining <= 0) return 0;
  if (monthly <= 0) return null;

  return Math.ceil(remaining / monthly);
}

function renderGoalSummary(goals) {
  const activeGoals = goals.filter(goal => goal.status === "active");

  const totalTarget = activeGoals.reduce((sum, goal) => {
    return sum + Number(goal.targetAmount || 0);
  }, 0);

  const totalSaved = activeGoals.reduce((sum, goal) => {
    return sum + Number(goal.currentAmount || 0);
  }, 0);

  document.getElementById("activeGoals").textContent = activeGoals.length;
  document.getElementById("totalTarget").textContent = formatMAD(totalTarget);
  document.getElementById("totalSaved").textContent = formatMAD(totalSaved);
}

function renderGoals() {
  const data = CFOStorage.load();
  const goals = data.goals || [];

  renderGoalSummary(goals);

  const container = document.getElementById("goalsList");

  if (!container) return;

  const activeGoals = goals.filter(goal => goal.status === "active");

  if (activeGoals.length === 0) {
    container.innerHTML = `
      <div class="card">
        <p style="margin:0;color:#6b7280;">
          No goals yet. Create one above or use "Can I afford this?" to turn a purchase into a goal.
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = activeGoals.map(goal => {
    const progress = calculateGoalProgress(goal);
    const monthsNeeded = calculateMonthsNeeded(goal);
    const target = Number(goal.targetAmount || 0);
    const current = Number(goal.currentAmount || 0);
    const remaining = Math.max(0, target - current);

    let timeline = "No monthly contribution set";

    if (monthsNeeded === 0) {
      timeline = "Goal completed";
    } else if (monthsNeeded !== null) {
      timeline = `${monthsNeeded} month${monthsNeeded > 1 ? "s" : ""} remaining`;
    }

    let statusColor = "#2563eb";

    if (progress >= 100) statusColor = "#22c55e";
    else if (goal.priority === "high") statusColor = "#f59e0b";

    return `
      <div class="card">
        <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;">
          <div>
            <strong style="font-size:18px;">${goal.title}</strong><br>
            <small style="color:#6b7280;">
              Priority: ${goal.priority} • ${timeline}
            </small>
          </div>

          <button class="btn btn-danger" onclick="deleteGoal('${goal.id}')">Delete</button>
        </div>

        <div style="margin-top:18px;">
          <div class="card-title">Progress</div>
          <div class="card-value">${formatMAD(current)} / ${formatMAD(target)}</div>
          <div class="card-sub">Remaining: ${formatMAD(remaining)}</div>
        </div>

        <div style="margin-top:14px;height:12px;background:#e5e7eb;border-radius:999px;overflow:hidden;">
          <div style="height:100%;width:${progress}%;background:${statusColor};"></div>
        </div>

        <div style="margin-top:10px;color:${statusColor};font-weight:800;">
          ${progress}% completed
        </div>

        <div class="actions">
          <button class="btn btn-primary" onclick="addContribution('${goal.id}')">
            Add Contribution
          </button>
          <button class="btn" onclick="completeGoal('${goal.id}')">
            Mark Completed
          </button>
        </div>
      </div>
    `;
  }).join("");
}

function handleGoalSubmit(event) {
  event.preventDefault();

  const title = document.getElementById("title").value.trim();
  const targetAmount = Number(document.getElementById("targetAmount").value);
  const currentAmount = Number(document.getElementById("currentAmount").value || 0);
  const monthlyContribution = Number(document.getElementById("monthlyContribution").value || 0);
  const priority = document.getElementById("priority").value;

  if (!title || targetAmount <= 0) {
    alert("Please enter a valid goal name and target amount.");
    return;
  }

  CFOStorage.addGoal({
    title,
    targetAmount,
    currentAmount,
    monthlyContribution,
    priority
  });

  event.target.reset();
  document.getElementById("currentAmount").value = 0;
  document.getElementById("priority").value = "medium";

  renderGoals();
}

function addContribution(goalId) {
  const amount = Number(prompt("How much did you save for this goal?"));

  if (!amount || amount <= 0) return;

  const data = CFOStorage.load();

  data.goals = data.goals.map(goal => {
    if (goal.id !== goalId) return goal;

    const newAmount = Number(goal.currentAmount || 0) + amount;
    const completed = newAmount >= Number(goal.targetAmount || 0);

    return {
      ...goal,
      currentAmount: newAmount,
      status: completed ? "completed" : goal.status
    };
  });

  CFOStorage.save(data);
  renderGoals();
}

function completeGoal(goalId) {
  const data = CFOStorage.load();

  data.goals = data.goals.map(goal => {
    if (goal.id !== goalId) return goal;

    return {
      ...goal,
      currentAmount: goal.targetAmount,
      status: "completed"
    };
  });

  CFOStorage.save(data);
  renderGoals();
}

function deleteGoal(goalId) {
  const data = CFOStorage.load();

  data.goals = data.goals.filter(goal => goal.id !== goalId);

  CFOStorage.save(data);
  renderGoals();
}

function initGoalsPage() {
  const form = document.getElementById("goalForm");

  if (form) {
    form.addEventListener("submit", handleGoalSubmit);
  }

  renderGoals();
}

document.addEventListener("DOMContentLoaded", initGoalsPage);
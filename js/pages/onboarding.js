// js/pages/onboarding.js
// FINAL MVP V1

function loadExistingProfile() {
  const data = CFOStorage.load();
  const profile = data.profile;

  if (!profile) return;

  document.getElementById("name").value = profile.name || "";
  document.getElementById("userType").value = profile.userType || "employee";
  document.getElementById("incomeType").value = profile.incomeType || "monthly";
  document.getElementById("baseIncomeAmount").value = profile.baseIncomeAmount || 0;
  document.getElementById("currency").value = profile.currency || "MAD";
  document.getElementById("riskTolerance").value = profile.riskTolerance || "medium";
}

function handleProfileSubmit(event) {
  event.preventDefault();

  const name = document.getElementById("name").value.trim();
  const userType = document.getElementById("userType").value;
  const incomeType = document.getElementById("incomeType").value;
  const baseIncomeAmount = Number(document.getElementById("baseIncomeAmount").value || 0);
  const currency = document.getElementById("currency").value;
  const riskTolerance = document.getElementById("riskTolerance").value;

  if (!name) {
    alert("Please enter your name.");
    return;
  }

  if (incomeType !== "none" && baseIncomeAmount <= 0) {
    const confirmNoIncome = confirm(
      "Income amount is 0. Do you want to continue anyway?"
    );

    if (!confirmNoIncome) return;
  }

  CFOStorage.setProfile({
    name,
    userType,
    incomeType,
    baseIncomeAmount,
    currency,
    riskTolerance
  });

  alert("Profile saved successfully.");
  location.href = "dashboard.html";
}

function initOnboardingPage() {
  loadExistingProfile();

  const form = document.getElementById("profileForm");

  if (form) {
    form.addEventListener("submit", handleProfileSubmit);
  }
}

document.addEventListener("DOMContentLoaded", initOnboardingPage);
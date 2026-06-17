// js/thresholds.js

const CFO_THRESHOLDS = {
  student: {
    maxFixedRatio: 0.45,
    minSavingsRate: 0.05,
    safetyBufferMonths: 0.25,
    incomeConservatism: 1
  },

  employee: {
    maxFixedRatio: 0.5,
    minSavingsRate: 0.1,
    safetyBufferMonths: 1,
    incomeConservatism: 1
  },

  young_professional: {
    maxFixedRatio: 0.45,
    minSavingsRate: 0.12,
    safetyBufferMonths: 1,
    incomeConservatism: 1
  },

  freelancer: {
    maxFixedRatio: 0.35,
    minSavingsRate: 0.15,
    safetyBufferMonths: 3,
    incomeConservatism: 0.8
  },

  business_owner: {
    maxFixedRatio: 0.35,
    minSavingsRate: 0.15,
    safetyBufferMonths: 3,
    incomeConservatism: 0.75
  },

  no_income: {
    maxFixedRatio: 0,
    minSavingsRate: 0,
    safetyBufferMonths: 0,
    incomeConservatism: 1
  },

  lifestyleCreep: {
    minEntries: 7,
    minDaysOfHistory: 14,
    medianMultiplier: 1.5
  }
};

function CFO_getThresholds(userType) {
  return CFO_THRESHOLDS[userType] || CFO_THRESHOLDS.employee;
}
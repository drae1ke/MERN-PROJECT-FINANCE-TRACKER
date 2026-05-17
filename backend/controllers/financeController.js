const Expense = require("../models/Expense");
const User = require("../models/user");

const DEFAULT_CATEGORIES = [
  "Food & groceries",
  "Rent",
  "Transport",
  "Utilities",
  "Airtime & bundles",
  "School fees",
  "Healthcare",
  "M-Pesa charges",
  "Savings",
  "Entertainment",
];

const PAYMENT_METHODS = ["M-Pesa", "Cash", "Bank transfer", "Card"];

const normalizeText = (value = "") => value.trim().replace(/\s+/g, " ");

const toPositiveNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const mergeCategories = (user = {}, expenses = []) => {
  const items = [
    ...DEFAULT_CATEGORIES,
    ...(user.customCategories || []),
    ...expenses.map((expense) => expense.category),
  ];

  return [...new Set(items.map(normalizeText).filter(Boolean))];
};

const buildBreakdown = (expenses) => {
  const totals = expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + Number(expense.amount);
    return acc;
  }, {});

  return Object.entries(totals)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);
};

const buildSummary = (budget, expenses) => {
  const totalSpent = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const remaining = budget - totalSpent;
  const today = new Date();
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const daysLeft = Math.max(endOfMonth.getDate() - today.getDate(), 0);
  const categoryBreakdown = buildBreakdown(expenses);
  const topCategory = categoryBreakdown[0]?.name || null;

  return {
    totalSpent,
    remaining,
    daysLeft,
    percentUsed: budget > 0 ? Number(((totalSpent / budget) * 100).toFixed(1)) : 0,
    dailySafeSpend: remaining > 0 ? Number((remaining / Math.max(daysLeft, 1)).toFixed(2)) : 0,
    topCategory,
    categoryBreakdown,
    transactionCount: expenses.length,
  };
};

const buildOverviewResponse = (user, expenses) => {
  const budget = Number(user.budget || 0);

  return {
    profile: {
      username: user.username,
      email: user.email,
      currency: user.currency || "KES",
    },
    budget,
    categories: mergeCategories(user, expenses),
    paymentMethods: PAYMENT_METHODS,
    summary: buildSummary(budget, expenses),
    expenses,
  };
};

const validateExpensePayload = (payload) => {
  const title = normalizeText(payload.title || "");
  const category = normalizeText(payload.category || "");
  const paymentMethod = normalizeText(payload.paymentMethod || "M-Pesa");
  const notes = normalizeText(payload.notes || "");
  const amount = toPositiveNumber(payload.amount);
  const date = payload.date ? new Date(payload.date) : new Date();

  if (!title) {
    return { error: "Expense title is required." };
  }

  if (!amount) {
    return { error: "Enter a valid amount greater than 0." };
  }

  if (!category) {
    return { error: "Choose or create a category." };
  }

  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    return { error: "Choose a valid payment method." };
  }

  if (Number.isNaN(date.getTime())) {
    return { error: "Enter a valid expense date." };
  }

  return {
    value: {
      title,
      amount,
      category,
      paymentMethod,
      notes,
      date,
    },
  };
};

exports.getFinanceOverview = async (req, res) => {
  try {
    const [user, expenses] = await Promise.all([
      User.findById(req.user.id).lean(),
      Expense.find({ userId: req.user.id }).sort({ date: -1, _id: -1 }).lean(),
    ]);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    res.status(200).json(buildOverviewResponse(user, expenses));
  } catch (err) {
    console.error("Get overview error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

exports.addExpense = async (req, res) => {
  try {
    const validation = validateExpensePayload(req.body);
    if (validation.error) {
      return res.status(400).json({ msg: validation.error });
    }

    const newExpense = new Expense({ ...validation.value, userId: req.user.id });
    const saved = await newExpense.save();

    res.status(201).json(saved);
  } catch (err) {
    console.error("Add expense error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

exports.updateExpense = async (req, res) => {
  try {
    const validation = validateExpensePayload(req.body);
    if (validation.error) {
      return res.status(400).json({ msg: validation.error });
    }

    const updated = await Expense.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      validation.value,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ msg: "Expense not found" });
    }

    res.status(200).json(updated);
  } catch (err) {
    console.error("Update expense error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

exports.deleteExpense = async (req, res) => {
  try {
    const deleted = await Expense.findOneAndDelete({ _id: req.params.id, userId: req.user.id });

    if (!deleted) {
      return res.status(404).json({ msg: "Expense not found" });
    }

    res.status(200).json({ msg: "Expense deleted" });
  } catch (err) {
    console.error("Delete expense error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

exports.getExpenses = async (req, res) => {
  try {
    const data = await Expense.find({ userId: req.user.id }).sort({ date: -1, _id: -1 });
    res.status(200).json(data);
  } catch (err) {
    console.error("Get expenses error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

exports.setBudget = async (req, res) => {
  try {
    const budget = toPositiveNumber(req.body.budget);

    if (!budget) {
      return res.status(400).json({ msg: "Enter a valid monthly budget greater than 0." });
    }

    await User.findByIdAndUpdate(req.user.id, { budget });
    res.status(200).json({ msg: "Budget updated", budget });
  } catch (err) {
    console.error("Set budget error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

exports.getBudget = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    res.status(200).json({ budget: Number(user.budget || 0), currency: user.currency || "KES" });
  } catch (err) {
    console.error("Get budget error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

exports.addCategory = async (req, res) => {
  try {
    const category = normalizeText(req.body.name || "");

    if (!category) {
      return res.status(400).json({ msg: "Category name is required." });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const exists = mergeCategories(user).some(
      (item) => item.toLowerCase() === category.toLowerCase()
    );

    if (!exists) {
      user.customCategories = [...(user.customCategories || []), category];
      await user.save();
    }

    res.status(201).json({ categories: mergeCategories(user) });
  } catch (err) {
    console.error("Add category error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

exports.resetFinanceData = async (req, res) => {
  try {
    await Expense.deleteMany({ userId: req.user.id });
    await User.findByIdAndUpdate(req.user.id, {
      $set: { budget: 0, customCategories: [] },
    });

    res.status(200).json({ msg: "Your finance data has been reset." });
  } catch (err) {
    console.error("Reset error:", err);
    res.status(500).json({ msg: "Failed to reset data." });
  }
};

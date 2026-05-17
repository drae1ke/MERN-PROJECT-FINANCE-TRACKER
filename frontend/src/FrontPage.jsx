import React, { useCallback, useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useNavigate } from "react-router-dom";
import api, { clearSession, getStoredUser } from "./api";

const CHART_COLORS = ["#d95d39", "#123524", "#f2b950", "#2f6f72", "#7d8f69", "#6d3b47"];
const FALLBACK_CATEGORY = "Food & groceries";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value) =>
  new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
  }).format(new Date(value));

const getTodayInputValue = () => new Date().toISOString().split("T")[0];

const createEmptyExpenseForm = (category = FALLBACK_CATEGORY) => ({
  title: "",
  amount: "",
  category,
  paymentMethod: "M-Pesa",
  notes: "",
  date: getTodayInputValue(),
});

const FrontPage = () => {
  const navigate = useNavigate();
  const storedUser = getStoredUser();
  const [overview, setOverview] = useState(null);
  const [budgetInput, setBudgetInput] = useState("");
  const [expenseForm, setExpenseForm] = useState(createEmptyExpenseForm());
  const [newCategory, setNewCategory] = useState("");
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [feedback, setFeedback] = useState({ type: "", text: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [busyAction, setBusyAction] = useState("");

  const loadOverview = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setIsLoading(true);
      }

      try {
        const { data } = await api.get("/finance/overview");
        setOverview(data);
        setBudgetInput(data.budget ? String(data.budget) : "");
        setExpenseForm((current) => {
          const fallbackCategory = data.categories[0] || FALLBACK_CATEGORY;
          return data.categories.includes(current.category)
            ? current
            : { ...current, category: fallbackCategory };
        });
        setActiveCategory((current) =>
          current !== "All" && !data.categories.includes(current) ? "All" : current
        );

        return data;
      } catch (error) {
        if (error.response?.status === 401) {
          clearSession();
          navigate("/signin", { replace: true, state: { message: "Your session expired. Sign in again." } });
          return null;
        }

        setFeedback({
          type: "error",
          text: error.response?.data?.msg || "Unable to load your dashboard right now.",
        });
        return null;
      } finally {
        if (!silent) {
          setIsLoading(false);
        }
      }
    },
    [navigate]
  );

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const handleBudgetSubmit = async (event) => {
    event.preventDefault();
    setBusyAction("budget");
    setFeedback({ type: "", text: "" });

    try {
      await api.post("/finance/budget", { budget: Number(budgetInput) });
      await loadOverview({ silent: true });
      setFeedback({ type: "success", text: "Monthly budget updated." });
    } catch (error) {
      setFeedback({
        type: "error",
        text: error.response?.data?.msg || "Unable to save your budget.",
      });
    } finally {
      setBusyAction("");
    }
  };

  const resetComposer = (category) => {
    setEditingExpenseId(null);
    setExpenseForm(createEmptyExpenseForm(category));
  };

  const handleExpenseSubmit = async (event) => {
    event.preventDefault();
    setBusyAction("expense");
    setFeedback({ type: "", text: "" });

    const payload = {
      ...expenseForm,
      amount: Number(expenseForm.amount),
    };

    try {
      if (editingExpenseId) {
        await api.patch(`/finance/expense/${editingExpenseId}`, payload);
      } else {
        await api.post("/finance/add", payload);
      }

      const data = await loadOverview({ silent: true });
      resetComposer(data?.categories?.includes(payload.category) ? payload.category : data?.categories?.[0]);
      setFeedback({
        type: "success",
        text: editingExpenseId ? "Expense updated." : "Expense added.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        text: error.response?.data?.msg || "Unable to save that expense.",
      });
    } finally {
      setBusyAction("");
    }
  };

  const handleAddCategory = async (event) => {
    event.preventDefault();
    setBusyAction("category");
    setFeedback({ type: "", text: "" });

    try {
      const { data } = await api.post("/finance/categories", { name: newCategory });
      setOverview((current) => (current ? { ...current, categories: data.categories } : current));
      const normalizedCategory = newCategory.trim().replace(/\s+/g, " ");
      setExpenseForm((current) => ({ ...current, category: normalizedCategory || current.category }));
      setNewCategory("");
      setFeedback({ type: "success", text: "Category saved." });
    } catch (error) {
      setFeedback({
        type: "error",
        text: error.response?.data?.msg || "Unable to add that category.",
      });
    } finally {
      setBusyAction("");
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm("Delete this expense entry?")) {
      return;
    }

    setBusyAction(`delete-${expenseId}`);
    setFeedback({ type: "", text: "" });

    try {
      await api.delete(`/finance/expense/${expenseId}`);
      await loadOverview({ silent: true });

      if (editingExpenseId === expenseId) {
        resetComposer(overview?.categories?.[0] || FALLBACK_CATEGORY);
      }

      setFeedback({ type: "success", text: "Expense deleted." });
    } catch (error) {
      setFeedback({
        type: "error",
        text: error.response?.data?.msg || "Unable to delete that expense.",
      });
    } finally {
      setBusyAction("");
    }
  };

  const handleEditExpense = (expense) => {
    setEditingExpenseId(expense._id);
    setExpenseForm({
      title: expense.title,
      amount: String(expense.amount),
      category: expense.category,
      paymentMethod: expense.paymentMethod || "M-Pesa",
      notes: expense.notes || "",
      date: new Date(expense.date).toISOString().split("T")[0],
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleReset = async () => {
    if (!window.confirm("Reset your budget, expenses, and custom categories for this month?")) {
      return;
    }

    setBusyAction("reset");
    setFeedback({ type: "", text: "" });

    try {
      const data = await api.delete("/finance/reset");
      await loadOverview({ silent: true });
      setBudgetInput("");
      resetComposer(FALLBACK_CATEGORY);
      setQuery("");
      setActiveCategory("All");
      setFeedback({ type: "success", text: data.data.msg });
    } catch (error) {
      setFeedback({
        type: "error",
        text: error.response?.data?.msg || "Reset failed. Please try again.",
      });
    } finally {
      setBusyAction("");
    }
  };

  const handleSignOut = () => {
    clearSession();
    navigate("/signin", { replace: true, state: { message: "Signed out successfully." } });
  };

  if (isLoading) {
    return (
      <div className="page-shell">
        <div className="loading-state">
          <div className="loading-orb" />
          <p>Loading your Kenya finance dashboard...</p>
        </div>
      </div>
    );
  }

  const profile = overview?.profile || storedUser || {};
  const summary = overview?.summary || {
    totalSpent: 0,
    remaining: 0,
    daysLeft: 0,
    percentUsed: 0,
    dailySafeSpend: 0,
    categoryBreakdown: [],
    transactionCount: 0,
  };
  const categories = overview?.categories || [FALLBACK_CATEGORY];
  const paymentMethods = overview?.paymentMethods || ["M-Pesa", "Cash", "Bank transfer", "Card"];
  const categoryBreakdown = summary.categoryBreakdown || [];
  const budget = Number(overview?.budget || 0);
  const usedPercent = Math.min(summary.percentUsed || 0, 100);
  const monthLabel = new Intl.DateTimeFormat("en-KE", {
    month: "long",
    year: "numeric",
  }).format(new Date());

  const filteredExpenses = (overview?.expenses || []).filter((expense) => {
    const matchesCategory = activeCategory === "All" || expense.category === activeCategory;
    const searchValue = query.trim().toLowerCase();
    const matchesSearch =
      !searchValue ||
      expense.title.toLowerCase().includes(searchValue) ||
      expense.category.toLowerCase().includes(searchValue) ||
      (expense.paymentMethod || "").toLowerCase().includes(searchValue);

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="page-shell">
      <div className="page-glow page-glow-left" />
      <div className="page-glow page-glow-right" />

      <main className="dashboard-shell">
        <section className="panel hero-panel">
          <div className="hero-topbar">
            <div>
              <p className="eyebrow">Kenya budget dashboard</p>
              <h1>{profile.username ? `${profile.username}, keep your month in view.` : "Keep your month in view."}</h1>
              <p className="hero-copy">
                {budget > 0
                  ? `Tracking your ${monthLabel} budget in KES with clearer visibility on the money left, the days ahead, and where spending is clustering.`
                  : `Set your ${monthLabel} budget first, then start logging spending across the categories Kenyan users reach for most often.`}
              </p>
            </div>

            <div className="hero-actions">
              <button className="ghost-button" type="button" onClick={handleReset} disabled={busyAction === "reset"}>
                {busyAction === "reset" ? "Resetting..." : "Reset month"}
              </button>
              <button className="secondary-button" type="button" onClick={handleSignOut}>
                Sign out
              </button>
            </div>
          </div>

          {feedback.text ? <div className={`feedback-banner ${feedback.type}`}>{feedback.text}</div> : null}

          <div className="stats-grid">
            <article className="stat-card">
              <span>Monthly budget</span>
              <strong>{formatCurrency(budget)}</strong>
              <small>{budget > 0 ? "Current plan" : "Not set yet"}</small>
            </article>

            <article className="stat-card">
              <span>Total spent</span>
              <strong>{formatCurrency(summary.totalSpent)}</strong>
              <small>{summary.transactionCount} entries logged</small>
            </article>

            <article className="stat-card">
              <span>Remaining</span>
              <strong className={summary.remaining < 0 ? "danger-text" : ""}>
                {formatCurrency(summary.remaining)}
              </strong>
              <small>{summary.remaining < 0 ? "Budget exceeded" : "Still available"}</small>
            </article>

            <article className="stat-card">
              <span>Daily safe spend</span>
              <strong>{formatCurrency(summary.dailySafeSpend)}</strong>
              <small>{summary.daysLeft} day(s) left this month</small>
            </article>
          </div>

          <div className="progress-panel">
            <div className="progress-copy">
              <div>
                <span className="progress-label">Budget usage</span>
                <strong>{summary.percentUsed}% used</strong>
              </div>
              <small>
                {summary.topCategory
                  ? `Biggest spend so far: ${summary.topCategory}`
                  : "Your top category will appear here after the first few entries."}
              </small>
            </div>

            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${usedPercent}%` }} />
            </div>
          </div>
        </section>

        <div className="dashboard-grid">
          <section className="panel composer-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Plan and capture</p>
                <h2>{editingExpenseId ? "Edit expense" : "Add a new expense"}</h2>
              </div>
            </div>

            <form className="stack-form" onSubmit={handleBudgetSubmit}>
              <div className="form-row compact">
                <label>
                  <span>Monthly budget (KES)</span>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 45000"
                    value={budgetInput}
                    onChange={(event) => setBudgetInput(event.target.value)}
                    required
                  />
                </label>

                <button className="primary-button" type="submit" disabled={busyAction === "budget"}>
                  {busyAction === "budget" ? "Saving..." : budget > 0 ? "Update budget" : "Save budget"}
                </button>
              </div>
            </form>

            <form className="stack-form" onSubmit={handleExpenseSubmit}>
              <label>
                <span>Expense title</span>
                <input
                  type="text"
                  placeholder="e.g. House shopping, fuel, school pickup"
                  value={expenseForm.title}
                  onChange={(event) => setExpenseForm({ ...expenseForm, title: event.target.value })}
                  required
                />
              </label>

              <div className="form-row">
                <label>
                  <span>Amount (KES)</span>
                  <input
                    type="number"
                    min="1"
                    placeholder="0"
                    value={expenseForm.amount}
                    onChange={(event) => setExpenseForm({ ...expenseForm, amount: event.target.value })}
                    required
                  />
                </label>

                <label>
                  <span>Date</span>
                  <input
                    type="date"
                    value={expenseForm.date}
                    onChange={(event) => setExpenseForm({ ...expenseForm, date: event.target.value })}
                    required
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  <span>Category</span>
                  <select
                    value={expenseForm.category}
                    onChange={(event) => setExpenseForm({ ...expenseForm, category: event.target.value })}
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Payment method</span>
                  <select
                    value={expenseForm.paymentMethod}
                    onChange={(event) => setExpenseForm({ ...expenseForm, paymentMethod: event.target.value })}
                  >
                    {paymentMethods.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label>
                <span>Notes</span>
                <textarea
                  rows="3"
                  placeholder="Optional context, like route, merchant, or bill note"
                  value={expenseForm.notes}
                  onChange={(event) => setExpenseForm({ ...expenseForm, notes: event.target.value })}
                />
              </label>

              <div className="action-row">
                <button className="primary-button" type="submit" disabled={busyAction === "expense"}>
                  {busyAction === "expense"
                    ? "Saving..."
                    : editingExpenseId
                      ? "Save changes"
                      : "Add expense"}
                </button>

                {editingExpenseId ? (
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => resetComposer(categories[0] || FALLBACK_CATEGORY)}
                  >
                    Cancel edit
                  </button>
                ) : null}
              </div>
            </form>

            <form className="category-form" onSubmit={handleAddCategory}>
              <label>
                <span>Add your own category</span>
                <input
                  type="text"
                  placeholder="e.g. Chama, farm supplies, church giving"
                  value={newCategory}
                  onChange={(event) => setNewCategory(event.target.value)}
                />
              </label>
              <button className="secondary-button" type="submit" disabled={busyAction === "category"}>
                {busyAction === "category" ? "Saving..." : "Save category"}
              </button>
            </form>
          </section>

          <section className="panel chart-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Spending mix</p>
                <h2>Where the money is going</h2>
              </div>
            </div>

            {categoryBreakdown.length ? (
              <>
                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={categoryBreakdown}
                        dataKey="amount"
                        nameKey="name"
                        innerRadius={60}
                        outerRadius={104}
                        paddingAngle={3}
                      >
                        {categoryBreakdown.map((entry, index) => (
                          <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="breakdown-list">
                  {categoryBreakdown.map((item, index) => {
                    const share = summary.totalSpent
                      ? Math.round((item.amount / summary.totalSpent) * 100)
                      : 0;

                    return (
                      <div className="breakdown-item" key={item.name}>
                        <div className="breakdown-label">
                          <span
                            className="color-dot"
                            style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                          />
                          <strong>{item.name}</strong>
                        </div>
                        <div className="breakdown-value">
                          <span>{formatCurrency(item.amount)}</span>
                          <small>{share}%</small>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="empty-state">
                <h3>No spending data yet</h3>
                <p>Add your first expense and the category mix will appear here.</p>
              </div>
            )}
          </section>
        </div>

        <section className="panel ledger-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Expense ledger</p>
              <h2>Recent activity</h2>
            </div>
            <small>{filteredExpenses.length} item(s) shown</small>
          </div>

          <div className="toolbar">
            <input
              type="search"
              placeholder="Search title, category, or payment method"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />

            <select value={activeCategory} onChange={(event) => setActiveCategory(event.target.value)}>
              <option value="All">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="ledger-list">
            {filteredExpenses.length ? (
              filteredExpenses.map((expense) => (
                <article className="ledger-item" key={expense._id}>
                  <div className="ledger-main">
                    <div className="ledger-copy">
                      <div className="ledger-title-row">
                        <h3>{expense.title}</h3>
                        <span className="amount-pill">{formatCurrency(expense.amount)}</span>
                      </div>

                      <div className="tag-row">
                        <span className="tag">{expense.category}</span>
                        <span className="tag muted">{expense.paymentMethod || "M-Pesa"}</span>
                        <span className="tag muted">{formatDate(expense.date)}</span>
                      </div>

                      {expense.notes ? <p className="ledger-note">{expense.notes}</p> : null}
                    </div>

                    <div className="ledger-actions">
                      <button className="ghost-button" type="button" onClick={() => handleEditExpense(expense)}>
                        Edit
                      </button>
                      <button
                        className="danger-button"
                        type="button"
                        onClick={() => handleDeleteExpense(expense._id)}
                        disabled={busyAction === `delete-${expense._id}`}
                      >
                        {busyAction === `delete-${expense._id}` ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <h3>No matching expenses</h3>
                <p>Try a different search or category filter, or add a new expense.</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default FrontPage;

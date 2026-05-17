const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const {
  addCategory,
  addExpense,
  deleteExpense,
  getBudget,
  getExpenses,
  getFinanceOverview,
  resetFinanceData,
  setBudget,
  updateExpense,
} = require("../controllers/financeController");

router.get("/overview", verifyToken, getFinanceOverview);
router.post("/add", verifyToken, addExpense);
router.patch("/expense/:id", verifyToken, updateExpense);
router.delete("/expense/:id", verifyToken, deleteExpense);
router.get("/all", verifyToken, getExpenses);
router.post("/budget", verifyToken, setBudget);
router.get("/budget", verifyToken, getBudget);
router.post("/categories", verifyToken, addCategory);
router.delete("/reset", verifyToken, resetFinanceData);

module.exports = router;

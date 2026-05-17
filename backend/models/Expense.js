const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    paymentMethod: {
      type: String,
      enum: ["M-Pesa", "Cash", "Bank transfer", "Card"],
      default: "M-Pesa",
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 180,
      default: "",
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Expense", expenseSchema);

const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },

    customerName: {
      type: String,
      required: true,
      trim: true,
    },

    customerEmail: {
      type: String,
      required: true,
      trim: true,
    },

    customerPhone: {
      type: String,
      required: true,
      trim: true,
    },

    bookingDate: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "PAID", "CANCELLED", "REFUNDED"],
      default: "PENDING",
    },

    paymentId: {
      type: String,
      default: null,
    },

    orderId: {
      type: String,
      default: null,
    },

    paymentAmount: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate active bookings for the same service and time
bookingSchema.index(
  { service: 1, bookingDate: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["PENDING", "PAID"] },
    },
  }
);

module.exports = mongoose.model("Booking", bookingSchema);
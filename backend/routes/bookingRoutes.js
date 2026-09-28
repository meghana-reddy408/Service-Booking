const express = require("express");
const crypto = require("crypto");
const Booking = require("../models/Booking");
const Service = require("../models/Service");
const Razorpay = require("razorpay");

const router = express.Router();

const getRazorpayClient = () => {
  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;

  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    return null;
  }

  return new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  });
};

// Create a booking
router.post("/", async (req, res) => {
  try {
    const {
      service,
      customerName,
      customerEmail,
      customerPhone,
      bookingDate,
    } = req.body;

    // Basic validation
    if (
      !service ||
      !customerName ||
      !customerEmail ||
      !customerPhone ||
      !bookingDate
    ) {
      return res.status(400).json({
        message: "All booking fields are required",
      });
    }

    // Check whether service exists and is active
    const selectedService = await Service.findOne({
      _id: service,
      isActive: true,
    });

    if (!selectedService) {
      return res.status(404).json({
        message: "Service not found or inactive",
      });
    }

    // Convert incoming date into a real Date
    const requestedDate = new Date(bookingDate);

    if (Number.isNaN(requestedDate.getTime())) {
      return res.status(400).json({
        message: "Invalid booking date",
      });
    }

    // Normalize appointment to the exact minute
    requestedDate.setSeconds(0, 0);

    // Create a one-minute search range
    const startOfSlot = new Date(requestedDate);
    const endOfSlot = new Date(requestedDate);
    endOfSlot.setMinutes(endOfSlot.getMinutes() + 1);

    // Check for an existing active booking in the same slot
    const existingBooking = await Booking.findOne({
      service,
      bookingDate: {
        $gte: startOfSlot,
        $lt: endOfSlot,
      },
      status: {
        $in: ["PENDING", "PAID"],
      },
    });

    if (existingBooking) {
      console.log(
        "Duplicate booking prevented:",
        existingBooking._id.toString()
      );

      return res.status(409).json({
        message:
          "This time slot is already booked. Please choose another time.",
      });
    }

    // Create the booking
    const booking = await Booking.create({
      service,
      customerName,
      customerEmail,
      customerPhone,
      bookingDate: requestedDate,
      status: "PENDING",
    });

    const populatedBooking = await Booking.findById(booking._id).populate(
      "service"
    );

    res.status(201).json(populatedBooking);
  } catch (error) {
    // Handle MongoDB duplicate key errors
    if (error.code === 11000) {
      return res.status(409).json({
        message:
          "This time slot is already booked. Please choose another time.",
      });
    }

    console.error("Create booking error:", error.message);

    res.status(500).json({
      message: "Failed to create booking",
    });
  }
});

// Get all bookings
router.get("/", async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("service")
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    console.error("Get bookings error:", error.message);

    res.status(500).json({
      message: "Failed to fetch bookings",
    });
  }
});

// Cancel a booking
router.patch("/:bookingId/cancel", async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    if (booking.status === "CANCELLED") {
      return res.status(400).json({
        message: "Booking is already cancelled",
      });
    }

    if (booking.status === "REFUNDED") {
      return res.status(400).json({
        message: "Refunded bookings cannot be cancelled",
      });
    }

    booking.status = "CANCELLED";

    await booking.save();

    const updatedBooking = await Booking.findById(booking._id).populate(
      "service"
    );

    res.json({
      message: "Booking cancelled successfully",
      booking: updatedBooking,
    });
  } catch (error) {
    console.error("Cancel booking error:", error.message);

    res.status(500).json({
      message: "Failed to cancel booking",
    });
  }
});

// Create a Razorpay order for a pending booking
router.post("/:bookingId/create-order", async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findById(bookingId).populate("service");

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    if (booking.status !== "PENDING") {
      return res.status(400).json({
        message: "Only pending bookings can be paid",
      });
    }

    const razorpay = getRazorpayClient();

    if (!razorpay) {
      return res.status(503).json({
        message: "Razorpay is not configured on the server",
      });
    }

    if (booking.orderId && booking.paymentAmount) {
      return res.json({
        keyId: process.env.RAZORPAY_KEY_ID,
        orderId: booking.orderId,
        amount: booking.paymentAmount,
        currency: "INR",
      });
    }

    const amount = Math.round(booking.service.price * 100);

    if (amount < 100) {
      return res.status(400).json({
        message: "The service price must be at least ₹1 to accept payment",
      });
    }

    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: booking._id.toString(),
    });

    booking.orderId = order.id;
    booking.paymentAmount = order.amount;
    await booking.save();

    res.json({
      keyId: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    console.error("Create Razorpay order error:", error.message);

    res.status(500).json({
      message: "Failed to start payment",
    });
  }
});

// Verify the Checkout signature and confirm the payment with Razorpay
router.post("/:bookingId/verify-payment", async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        message: "Payment verification details are required",
      });
    }

    const booking = await Booking.findById(bookingId).populate("service");

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    if (booking.status === "PAID" && booking.paymentId === razorpay_payment_id) {
      return res.json({ message: "Payment already verified", booking });
    }

    if (booking.status !== "PENDING" || booking.orderId !== razorpay_order_id) {
      return res.status(400).json({
        message: "Payment does not match this pending booking",
      });
    }

    const razorpay = getRazorpayClient();

    if (!razorpay) {
      return res.status(503).json({
        message: "Razorpay is not configured on the server",
      });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest();
    const receivedSignature = Buffer.from(razorpay_signature, "hex");

    if (
      expectedSignature.length !== receivedSignature.length ||
      !crypto.timingSafeEqual(expectedSignature, receivedSignature)
    ) {
      return res.status(400).json({
        message: "Payment signature is invalid",
      });
    }

    let payment = await razorpay.payments.fetch(razorpay_payment_id);

    if (
      payment.order_id !== booking.orderId ||
      payment.amount !== booking.paymentAmount ||
      payment.currency !== "INR"
    ) {
      return res.status(400).json({
        message: "Payment details do not match this booking",
      });
    }

    if (payment.status === "authorized") {
      payment = await razorpay.payments.capture(
        razorpay_payment_id,
        booking.paymentAmount,
        "INR"
      );
    }

    if (payment.status !== "captured") {
      return res.status(400).json({
        message: "Payment has not been captured",
      });
    }

    booking.status = "PAID";
    booking.paymentId = razorpay_payment_id;
    await booking.save();

    res.json({
      message: "Payment successful",
      booking,
    });
  } catch (error) {
    console.error("Verify Razorpay payment error:", error.message);

    res.status(500).json({
      message: "Failed to verify payment",
    });
  }
});

module.exports = router;
const express = require("express");
const Service = require("../models/Service");

const router = express.Router();

// Get all active services
router.get("/", async (req, res) => {
  try {
    const services = await Service.find({ isActive: true }).sort({
      createdAt: -1,
    });

    res.json(services);
  } catch (error) {
    console.error("Get services error:", error.message);
    res.status(500).json({
      message: "Failed to fetch services",
    });
  }
});

// Create a service
router.post("/", async (req, res) => {
  try {
    const { name, description, price, duration } = req.body;

    if (!name || !description || price === undefined || !duration) {
      return res.status(400).json({
        message: "All service fields are required",
      });
    }

    const service = await Service.create({
      name,
      description,
      price,
      duration,
    });

    res.status(201).json(service);
  } catch (error) {
    console.error("Create service error:", error.message);
    res.status(500).json({
      message: "Failed to create service",
    });
  }
});

module.exports = router;
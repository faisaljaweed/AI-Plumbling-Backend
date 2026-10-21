const express = require("express");

const {
  getAvailableSlots,
  createAvailabilitySlot,
  deleteAvailabilitySlot,
} = require("../controllers/availabilityController");

const router = express.Router();

router.get("/", getAvailableSlots);
router.post("/", createAvailabilitySlot);
router.delete("/:id", deleteAvailabilitySlot);

module.exports = router;

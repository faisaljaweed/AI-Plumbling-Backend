const express = require("express");

const {
  createLead,
  getLeads,
  getLeadById,
  updateLeadStatus,
} = require("../controllers/leadController");

const router = express.Router();

router.post("/", createLead);
router.get("/", getLeads);
router.get("/:id", getLeadById);
router.patch("/:id/status", updateLeadStatus);

module.exports = router;

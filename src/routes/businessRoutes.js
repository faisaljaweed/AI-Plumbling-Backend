const express = require("express");

const {
  getBusiness,
  updateBusiness,
} = require("../controllers/businessController");

const router = express.Router();

router.get("/:id", getBusiness);
router.patch("/:id", updateBusiness);

module.exports = router;

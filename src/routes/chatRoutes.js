const express = require("express");

const { chatWithAI,getChatHistory,startChat } = require("../controllers/chatController");

const router = express.Router();

router.post("/", chatWithAI);
router.get("/:lead_id", getChatHistory);
router.post("/start", startChat);

module.exports = router;

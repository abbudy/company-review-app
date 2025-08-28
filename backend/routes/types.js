const express = require("express");
const router = express.Router();
const { getTypes, createType, deleteType } = require("../controllers/typesController");
const auth = require("../middleware/authMiddleware");

router.get("/", getTypes);
router.post("/", auth, createType);
router.delete("/:id", auth, deleteType);

module.exports = router;

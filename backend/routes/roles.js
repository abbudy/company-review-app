const express = require("express");
const router = express.Router();
const {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
} = require("../controllers/rolesController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// GET all roles
router.get("/", authMiddleware, roleMiddleware(1), getRoles);

// GET role by id
router.get("/:id", authMiddleware, roleMiddleware(1), getRoleById);

// POST create role
router.post("/", authMiddleware, roleMiddleware(1), createRole);

// PUT update role
router.put("/:id", authMiddleware, roleMiddleware(1), updateRole);

// DELETE role
router.delete("/:id", authMiddleware, roleMiddleware(1), deleteRole);

module.exports = router;

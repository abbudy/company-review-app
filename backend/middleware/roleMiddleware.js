// roleMiddleware.js
module.exports = function(requiredRoleId) {
  return (req, res, next) => {
    const user = req.user; // must be set by auth middleware (decoded token)
    
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    if (user.roleId !== requiredRoleId) {
      return res.status(403).json({ message: "Forbidden: insufficient role" });
    }

    next(); // user has required role
  };
};

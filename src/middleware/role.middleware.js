import { supabaseAdmin } from "../config/supabase.js";

const requireRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const { data: profile, error } = await supabaseAdmin
        .from("profiles")
        .select("id, role, status")
        .eq("id", req.user.id)
        .single();

      if (error || !profile) {
        return res.status(404).json({
          success: false,
          message: "User profile not found",
        });
      }

      if (profile.status !== "active") {
        return res.status(403).json({
          success: false,
          message: "Your account is inactive",
        });
      }

      if (!allowedRoles.includes(profile.role)) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to access this resource",
        });
      }

      req.profile = profile;

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default requireRole;

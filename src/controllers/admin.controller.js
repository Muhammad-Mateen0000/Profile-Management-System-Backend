import { supabaseAdmin } from "../config/supabase.js";

const BUCKET_NAME = "profile-images";
const SIGNED_URL_EXPIRES_IN = 60 * 60;

const createSignedAvatarUrl = async (avatarPath) => {
  if (!avatarPath) return null;

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .createSignedUrl(avatarPath, SIGNED_URL_EXPIRES_IN);

  return error ? null : data.signedUrl;
};

const createUser = async (req, res, next) => {
  try {
    const {
      first_name,
      last_name,
      email,
      phone,
      password,
      role = "user",
    } = req.body;

    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "First name, last name, email and password are required",
      });
    }

    if (first_name.trim().length < 2 || last_name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "First and last name must be at least 2 characters",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role must be either user or admin",
      });
    }

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password,
        email_confirm: true,
      });

    if (authError) {
      return res.status(400).json({
        success: false,
        message: authError.message,
      });
    }

    const { data: user, error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: authData.user.id,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        role,
        status: "active",
      })
      .select(
        "id, first_name, last_name, email, phone, bio, avatar_url, role, status, created_at, updated_at",
      )
      .single();

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);

      return res.status(500).json({
        success: false,
        message: "Failed to create user profile",
        error: profileError.message,
      });
    }

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      user,
    });
  } catch (error) {
    next(error);
  }
};

const getAllUsers = async (req, res, next) => {
  try {
    const { search = "" } = req.query;

    let query = supabaseAdmin
      .from("profiles")
      .select(
        "id, first_name, last_name, email, phone, bio, avatar_url, role, status, created_at, updated_at",
      )
      .order("created_at", { ascending: false });

    if (search.trim()) {
      const value = search.trim();

      query = query.or(
        `first_name.ilike.%${value}%,last_name.ilike.%${value}%,email.ilike.%${value}%`,
      );
    }

    const { data: users, error } = await query;

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch users",
        error: error.message,
      });
    }

    const usersWithAvatarUrls = await Promise.all(
      users.map(async (user) => ({
        ...user,
        avatar_url: await createSignedAvatarUrl(user.avatar_url),
      })),
    );

    return res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      users: usersWithAvatarUrls,
      count: usersWithAvatarUrls.length,
    });
  } catch (error) {
    next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: user, error } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, first_name, last_name, email, phone, bio, avatar_url, role, status, created_at, updated_at",
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch user",
        error: error.message,
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User fetched successfully",
      user: {
        ...user,
        avatar_url: await createSignedAvatarUrl(user.avatar_url),
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, phone, bio } = req.body;

    const fullName = `${first_name || ""} ${last_name || ""}`.trim();

    if (fullName.length < 3 || fullName.length > 50) {
      return res.status(400).json({
        success: false,
        message: "Full name must be between 3 and 50 characters",
      });
    }

    const { data: existingUser, error: findError } = await supabaseAdmin
      .from("profiles")
      .select("id, avatar_url")
      .eq("id", id)
      .maybeSingle();

    if (findError) {
      return res.status(500).json({
        success: false,
        message: "Failed to verify user",
        error: findError.message,
      });
    }

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User profile not found",
      });
    }

    const { data: user, error } = await supabaseAdmin
      .from("profiles")
      .update({
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        phone: phone?.trim() || null,
        bio: bio?.trim() || null,
      })
      .eq("id", id)
      .select(
        "id, first_name, last_name, email, phone, bio, avatar_url, role, status, created_at, updated_at",
      )
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to update user",
        error: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: "User profile updated successfully",
      user: {
        ...user,
        avatar_url: await createSignedAvatarUrl(user.avatar_url),
      },
    });
  } catch (error) {
    next(error);
  }
};

const changeUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role must be either user or admin",
      });
    }

    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "You cannot change your own role",
      });
    }

    const { data: user, error } = await supabaseAdmin
      .from("profiles")
      .update({ role })
      .eq("id", id)
      .select(
        "id, first_name, last_name, email, phone, bio, avatar_url, role, status, created_at, updated_at",
      )
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        message: "User profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User role updated successfully",
      user: {
        ...user,
        avatar_url: await createSignedAvatarUrl(user.avatar_url),
      },
    });
  } catch (error) {
    next(error);
  }
};

const changeUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be either active or inactive",
      });
    }

    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "You cannot change your own account status",
      });
    }

    const { data: user, error } = await supabaseAdmin
      .from("profiles")
      .update({ status })
      .eq("id", id)
      .select(
        "id, first_name, last_name, email, phone, bio, avatar_url, role, status, created_at, updated_at",
      )
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        message: "User profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User status updated successfully",
      user: {
        ...user,
        avatar_url: await createSignedAvatarUrl(user.avatar_url),
      },
    });
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account",
      });
    }

    const { data: user, error: findError } = await supabaseAdmin
      .from("profiles")
      .select("id, avatar_url")
      .eq("id", id)
      .maybeSingle();

    if (findError) {
      return res.status(500).json({
        success: false,
        message: "Failed to verify user",
        error: findError.message,
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User profile not found",
      });
    }

    if (user.avatar_url) {
      await supabaseAdmin.storage.from(BUCKET_NAME).remove([user.avatar_url]);
    }

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (authError) {
      return res.status(500).json({
        success: false,
        message: "Failed to delete user account",
        error: authError.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  changeUserRole,
  changeUserStatus,
  deleteUser,
};

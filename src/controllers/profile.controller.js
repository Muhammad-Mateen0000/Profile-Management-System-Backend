import { supabaseAdmin } from "../config/supabase.js";

const BUCKET_NAME = "profile-images";
const SIGNED_URL_EXPIRES_IN = 60 * 60;

const createSignedAvatarUrl = async (avatarPath) => {
  if (!avatarPath) {
    return null;
  }

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .createSignedUrl(avatarPath, SIGNED_URL_EXPIRES_IN);

  if (error) {
    return null;
  }

  return data.signedUrl;
};

const getMyProfile = async (req, res, next) => {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, first_name, last_name, email, phone, bio, avatar_url, role, status, created_at, updated_at",
      )
      .eq("id", req.user.id)
      .maybeSingle();

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch profile",
        error: error.message,
      });
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    const avatarUrl = await createSignedAvatarUrl(profile.avatar_url);

    return res.status(200).json({
      success: true,
      message: "Profile fetched successfully",
      profile: {
        ...profile,
        avatar_url: avatarUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateMyProfile = async (req, res, next) => {
  try {
    const { first_name, last_name, phone, bio } = req.body;

    const fullName = `${first_name} ${last_name}`.trim();

    if (fullName.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Full name must be at least 3 characters",
      });
    }

    if (fullName.length > 50) {
      return res.status(400).json({
        success: false,
        message: "Full name must not exceed 50 characters",
      });
    }

    const { data: existingProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, role, status")
      .eq("id", req.user.id)
      .maybeSingle();

    if (profileError) {
      return res.status(500).json({
        success: false,
        message: "Failed to verify profile",
        error: profileError.message,
      });
    }

    if (!existingProfile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    if (existingProfile.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive",
      });
    }

    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .update({
        first_name,
        last_name,
        phone: phone || "",
        bio: bio || "",
      })
      .eq("id", req.user.id)
      .select(
        "id, first_name, last_name, email, phone, bio, avatar_url, role, status, created_at, updated_at",
      )
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to update profile",
        error: error.message,
      });
    }

    const avatarUrl = await createSignedAvatarUrl(profile.avatar_url);

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      profile: {
        ...profile,
        avatar_url: avatarUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

const uploadProfileImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Profile image is required",
      });
    }

    const file = req.file;

    const fileExtension = file.originalname.split(".").pop().toLowerCase();

    const newFilePath = `${req.user.id}/${req.user.id}-${Date.now()}.${fileExtension}`;

    const { data: existingProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, avatar_url, status")
      .eq("id", req.user.id)
      .maybeSingle();

    if (profileError) {
      return res.status(500).json({
        success: false,
        message: "Failed to verify profile",
        error: profileError.message,
      });
    }

    if (!existingProfile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    if (existingProfile.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive",
      });
    }

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(newFilePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      return res.status(500).json({
        success: false,
        message: "Failed to upload profile image",
        error: uploadError.message,
      });
    }

    const oldFilePath = existingProfile.avatar_url;

    const { data: profile, error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        avatar_url: newFilePath,
      })
      .eq("id", req.user.id)
      .select(
        "id, first_name, last_name, email, phone, bio, avatar_url, role, status, created_at, updated_at",
      )
      .single();

    if (updateError) {
      await supabaseAdmin.storage.from(BUCKET_NAME).remove([newFilePath]);

      return res.status(500).json({
        success: false,
        message: "Failed to update profile image",
        error: updateError.message,
      });
    }

    if (oldFilePath) {
      const { error: deleteError } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .remove([oldFilePath]);

      if (deleteError) {
        console.error(
          "Old profile image could not be deleted:",
          deleteError.message,
        );
      }
    }

    const avatarUrl = await createSignedAvatarUrl(profile.avatar_url);

    return res.status(200).json({
      success: true,
      message: "Profile image uploaded successfully",
      profile: {
        ...profile,
        avatar_url: avatarUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

const deleteProfileImage = async (req, res, next) => {
  try {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, avatar_url, status")
      .eq("id", req.user.id)
      .maybeSingle();

    if (profileError) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch profile",
        error: profileError.message,
      });
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    if (profile.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive",
      });
    }

    if (!profile.avatar_url) {
      return res.status(404).json({
        success: false,
        message: "Profile image not found",
      });
    }

    const { error: deleteError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .remove([profile.avatar_url]);

    if (deleteError) {
      return res.status(500).json({
        success: false,
        message: "Failed to delete profile image",
        error: deleteError.message,
      });
    }

    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        avatar_url: null,
      })
      .eq("id", req.user.id)
      .select(
        "id, first_name, last_name, email, phone, bio, avatar_url, role, status, created_at, updated_at",
      )
      .single();

    if (updateError) {
      return res.status(500).json({
        success: false,
        message: "Image deleted but profile update failed",
        error: updateError.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile image deleted successfully",
      profile: updatedProfile,
    });
  } catch (error) {
    next(error);
  }
};

export {
  getMyProfile,
  updateMyProfile,
  uploadProfileImage,
  deleteProfileImage,
};

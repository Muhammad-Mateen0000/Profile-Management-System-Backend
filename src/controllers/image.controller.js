import { supabaseAdmin } from "../config/supabase.js";

const BUCKET_NAME = "profile-images";
const SIGNED_URL_EXPIRES_IN = 60 * 60;

const getFileExtension = (fileName) => {
  const parts = fileName.split(".");

  if (parts.length < 2) {
    return "jpg";
  }

  return parts.pop().toLowerCase();
};

const getStoragePathFromUrl = (avatarUrl) => {
  if (!avatarUrl) {
    return null;
  }

  const marker = `/storage/v1/object/`;

  const markerIndex = avatarUrl.indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  let pathPart = avatarUrl.substring(markerIndex + marker.length);

  pathPart = pathPart.split("?")[0];

  const possiblePrefixes = [
    `sign/${BUCKET_NAME}/`,
    `public/${BUCKET_NAME}/`,
    `authenticated/${BUCKET_NAME}/`,
  ];

  for (const prefix of possiblePrefixes) {
    if (pathPart.startsWith(prefix)) {
      return pathPart.substring(prefix.length);
    }
  }

  return null;
};

const createSignedAvatarUrl = async (filePath) => {
  if (!filePath) {
    return null;
  }

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .createSignedUrl(filePath, SIGNED_URL_EXPIRES_IN);

  if (error) {
    return null;
  }

  return data.signedUrl;
};

const uploadProfileImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Profile image is required",
      });
    }

    const userId = req.user.id;

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, avatar_url, status")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
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

    const extension = getFileExtension(req.file.originalname);

    const filePath = `${userId}/profile-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      return res.status(500).json({
        success: false,
        message: "Failed to upload profile image",
        error: uploadError.message,
      });
    }

    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        avatar_url: filePath,
      })
      .eq("id", userId)
      .select(
        "id, first_name, last_name, email, phone, bio, avatar_url, role, status, created_at, updated_at",
      )
      .single();

    if (updateError) {
      await supabaseAdmin.storage.from(BUCKET_NAME).remove([filePath]);

      return res.status(500).json({
        success: false,
        message: "Failed to update profile image",
        error: updateError.message,
      });
    }

    if (profile.avatar_url) {
      const oldFilePath = getStoragePathFromUrl(profile.avatar_url);

      if (oldFilePath) {
        await supabaseAdmin.storage.from(BUCKET_NAME).remove([oldFilePath]);
      }
    }

    const avatarUrl = await createSignedAvatarUrl(filePath);

    return res.status(200).json({
      success: true,
      message: "Profile image uploaded successfully",
      profile: {
        ...updatedProfile,
        avatar_url: avatarUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

export { uploadProfileImage, createSignedAvatarUrl };

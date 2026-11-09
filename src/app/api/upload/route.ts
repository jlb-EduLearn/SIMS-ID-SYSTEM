import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import { requireSchoolContext, apiSuccess, apiError } from "@/lib/api-auth";

const MAX_UPLOAD_MB = 15;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);
const ALLOWED_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "heic",
  "heif",
]);

function cloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

async function uploadToCloudinary(
  buffer: Buffer,
  type: string | null,
  ext: string
) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  const folder = process.env.CLOUDINARY_FOLDER || "assets/SIMS";
  const publicId = `${type || "photo"}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;

  const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder,
          public_id: publicId,
          resource_type: "image",
          format: ext === "jpg" ? "jpg" : undefined,
        },
        (err, res) => {
          if (err || !res?.secure_url) {
            reject(err || new Error("Cloudinary upload failed"));
            return;
          }
          resolve({ secure_url: res.secure_url });
        }
      )
      .end(buffer);
  });

  return result.secure_url;
}

async function uploadToLocal(buffer: Buffer, type: string | null, ext: string) {
  const filename = `${type || "photo"}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads");

  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), buffer);

  return `/uploads/${filename}`;
}

export async function POST(req: NextRequest) {
  const { error } = await requireSchoolContext();
  if (error) return error;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const type = formData.get("type") as string | null;

  if (!file) {
    return apiError("No file provided");
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const typeAllowed = ALLOWED_MIME_TYPES.has(file.type);
  const extensionAllowed = ALLOWED_EXTENSIONS.has(ext);

  if (!typeAllowed && !extensionAllowed) {
    return apiError(
      "Invalid file type. Use JPG, JPEG, PNG, WebP, GIF, HEIC, or HEIF."
    );
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return apiError(`File too large. Maximum ${MAX_UPLOAD_MB}MB.`);
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  try {
    const url = cloudinaryConfigured()
      ? await uploadToCloudinary(buffer, type, ext)
      : await uploadToLocal(buffer, type, ext);

    return apiSuccess({ url });
  } catch (err) {
    console.error("Upload failed:", err);
    return apiError("Upload failed. Please try again.");
  }
}

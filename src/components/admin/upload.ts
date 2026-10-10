import { supabase } from "@/integrations/supabase/client";

/** Re-encodes a photo as WebP (max width, ~80% quality) in the browser so uploads load fast on the site. */
export async function toWebp(file: File, maxWidth = 1600): Promise<File> {
  if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) return file; // SVG and others stay as they are
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bmp.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale); canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.8));
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], file.name.replace(/\.\w+$/, "") + ".webp", { type: "image/webp" });
}

const LIMIT = 50 * 1024 * 1024;
/** Uploads to the public "media" bucket and returns its public link and storage path. */
export async function uploadMedia(file: File, folder: "images" | "logos" | "videos" | "syllabus") {
  const f = folder === "images" || folder === "logos" ? await toWebp(file, folder === "logos" ? 600 : 1600) : file;
  if (f.size > LIMIT) throw new Error("That file is over 50 MB. For long videos, upload to Vimeo and paste the link instead.");
  const safe = f.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "");
  const path = `${folder}/${Date.now().toString(36)}-${safe}`;
  const { error } = await supabase.storage.from("media").upload(path, f, { contentType: f.type, upsert: false, cacheControl: "31536000" });
  if (error) throw new Error(error.message.includes("Bucket not found") ? "Run the latest database update first (the media storage is missing)." : error.message);
  const { data } = supabase.storage.from("media").getPublicUrl(path);
  return { url: data.publicUrl, path, size: f.size, type: f.type };
}

import { supabase } from "./supabase";
import slugify from "slugify";
import xss from "xss";

export async function getMeals() {
  const { data, error } = await supabase.from("meals").select("*");
  if (error || !data) {
    console.error("Fetch meals error:", error);
    throw new Error("Failed to fetch meals");
  }
  return data;
}

export async function getMeal(slug) {
  const { data, error } = await supabase
    .from("meals")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    console.error("Fetch single meal error:", error);
    return null;
  }

  return data;
}

export async function saveMeal(meal) {
  // Clean up text input
  meal.instructions = xss(meal.instructions);

  // Generate unique slug
  const baseSlug = slugify(meal.title, { lower: true });
  const { data: existingSlugs } = await supabase.from("meals").select("slug");
  const allSlugs = existingSlugs?.map((row) => row.slug) || [];

  let uniqueSlug = baseSlug;
  let counter = 1;
  while (allSlugs.includes(uniqueSlug)) {
    uniqueSlug = `${baseSlug}-${counter++}`;
  }
  meal.slug = uniqueSlug;

  // Upload image to Supabase Storage
  const file = meal.image;
  const extension = file.name.split(".").pop();
  const fileName = `${meal.slug}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("images")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    console.error("Image upload error:", uploadError);
    throw new Error("Supabase image upload failed");
  }

  // Get public URL of uploaded image
  const { data: publicUrlData } = supabase.storage
    .from("images")
    .getPublicUrl(fileName);

  meal.image = publicUrlData?.publicUrl;

  // Save meal to DB
  const { error: insertError } = await supabase.from("meals").insert([meal]);

  if (insertError) {
    console.error("Insert meal error:", insertError);
    throw new Error("Inserting meal failed");
  }
}

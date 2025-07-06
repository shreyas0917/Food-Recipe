import { supabase } from "./supabase";
import slugify from "slugify";
import xss from "xss";

export async function getMeals() {
  const { data, error } = await supabase.from("meals").select("*");
  if (error) throw new Error("Failed to fetch meals");
  return data;
}

export async function getMeal(slug) {
  const { data, error } = await supabase.from("meals").select("*").eq("slug", slug).single();
  if (error) throw new Error("Failed to fetch meal");
  return data;
}

export async function saveMeal(meal) {
  meal.instructions = xss(meal.instructions);
  const baseSlug = slugify(meal.title, { lower: true });
  const { data: existingSlugs } = await supabase.from("meals").select("slug");
  const allSlugs = existingSlugs.map(row => row.slug);

  let uniqueSlug = baseSlug;
  let counter = 1;
  while (allSlugs.includes(uniqueSlug)) {
    uniqueSlug = `${baseSlug}-${counter++}`;
  }
  meal.slug = uniqueSlug;

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

  if (uploadError) throw new Error("Supabase image upload failed");

  const { data: publicUrlData } = supabase.storage.from("images").getPublicUrl(fileName);
  meal.image = publicUrlData.publicUrl;

  const { error: insertError } = await supabase.from("meals").insert([meal]);
  if (insertError) throw new Error("Inserting meal failed");
}

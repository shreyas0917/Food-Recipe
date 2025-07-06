
import { supabase } from "./supabase";
import sql from "better-sqlite3";
import slugify from "slugify";
import xss from "xss";
const db = sql("meals.db");

export async function getMeals() {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  // throw new Error('Laoding meals failed') ;
  return db.prepare("SELECT * FROM meals").all();
}

export async function getMeal(slug) {
  return db.prepare("SELECT * FROM meals WHERE slug = ?").get(slug);
}

export async function saveMeal(meal) {
  
  meal.instructions = xss(meal.instructions);

  
  const baseSlug = slugify(meal.title, { lower: true });
  const allSlugs = db.prepare("SELECT slug FROM meals").all().map(row => row.slug);

  let uniqueSlug = baseSlug;
  let counter = 1;
  while (allSlugs.includes(uniqueSlug)) {
    uniqueSlug = `${baseSlug}-${counter++}`;
  }
  meal.slug = uniqueSlug;

  
  const imageFile = meal.image;
  const extension = imageFile.name.split(".").pop();
  const fileName = `${meal.slug}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("images")
    .upload(fileName, imageFile, {
      cacheControl: "3600",
      upsert: true,
      contentType: imageFile.type,
    });

  if (uploadError) {
    console.error("Upload Error:", uploadError);
    throw new Error("Supabase image upload failed");
  }

 
  const { data } = supabase.storage.from("images").getPublicUrl(fileName);
  meal.image = data.publicUrl;

  
  db.prepare(
    `INSERT INTO meals
     (title, summary, instructions, creator, creator_email, image, slug)
     VALUES (
       @title,
       @summary,
       @instructions,
       @creator,
       @creator_email,
       @image,
       @slug
     )`
  ).run(meal);
}



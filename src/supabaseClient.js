import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://czqdjvxghgnhhkvxuzqa.supabase.co";

const supabaseKey = "eyJhbGc..."; // pega aquí la anon key

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://czqdjvxghgnhhkvxuzqa.supabase.co";
const supabaseAnonKey = "PEGA_AQUI_TU_ANON_KEY_REAL";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
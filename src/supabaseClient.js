import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://czqdjvxghgnhhkvxuzqa.supabase.co";

const supabaseAnonKey =
  "sb_publishable_gT7K2zgSwbUc83JKDW4Izw_ZGJz02R7";

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://czqdjvxghgnhhkvxuzqa.supabase.co";

const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6cWRqdnhnaGduaGhrdnh1enFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NDI0MjUsImV4cCI6MjA5NDUxODQyNX0.fmT6c2h2cVMDzyQVqEq8HVf741VnsgM6QNwc42i04tA";

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});
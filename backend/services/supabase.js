import { createClient } from "@supabase/supabase-js";

// Lazy initialization - don't initialize until needed
let supabaseInstance = null;

export const getSupabaseClient = () => {
  if (!supabaseInstance) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    
    if (!url || !key) {
      throw new Error(`Supabase credentials missing: URL=${!!url}, KEY=${!!key}`);
    }
    
    supabaseInstance = createClient(url, key);
  }
  return supabaseInstance;
};

// Keep backward compatibility
export const supabase = new Proxy({}, {
  get: (target, prop) => {
    return getSupabaseClient()[prop];
  }
});

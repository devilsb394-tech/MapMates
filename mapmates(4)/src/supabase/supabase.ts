import { createClient } from '@supabase/supabase-js';

let supabaseInstance: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  if (supabaseInstance) return supabaseInstance;

  let supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    const errorMsg = "Supabase is not configured. Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your platform settings or .env file.";
    console.error(errorMsg);
    
    return {
      storage: {
        from: () => ({
          upload: async () => { 
            alert("Error: Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to settings.");
            throw new Error("Supabase not configured."); 
          },
          getPublicUrl: () => ({ data: { publicUrl: "" } })
        })
      }
    } as any;
  }

  // Sanitize URL: Remove /rest/v1/ if it accidentally got included
  if (supabaseUrl.includes('/rest/v1')) {
    supabaseUrl = supabaseUrl.split('/rest/v1')[0];
  }
  // Ensure no trailing slash
  if (supabaseUrl.endsWith('/')) {
    supabaseUrl = supabaseUrl.slice(0, -1);
  }

  if (!supabaseUrl.startsWith('https://')) {
    const msg = "Error: Invalid Supabase URL. It must start with https:// - current value: " + supabaseUrl;
    console.error(msg);
    alert(msg);
    throw new Error("Invalid Supabase URL");
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseInstance;
}

/**
 * Uploads a file to Supabase storage.
 * @param bucket - The name of the storage bucket.
 * @param path - The path within the bucket (e.g., 'avatars/uid/filename.png').
 * @param file - The file object to upload.
 * @returns The public URL of the uploaded file.
 */
export async function uploadFile(bucket: string, path: string, file: File | Blob) {
  const supabase = getSupabase();
  
  console.log("STARTING UPLOAD:", { bucket, path });
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error("SUPABASE UPLOAD ERROR:", error);
    alert("Upload failed: " + error.message);
    throw error;
  }

  console.log("UPLOAD DATA:", data);

  if (!data?.path) {
    alert("Error: Invalid image path returned from storage.");
    throw new Error("Invalid upload path");
  }

  const { data: resp } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  const publicUrl = resp?.publicUrl;
  console.log("PUBLIC URL:", publicUrl);

  if (!publicUrl || typeof publicUrl !== "string" || !publicUrl.startsWith("https://")) {
    alert("Error: Invalid Supabase URL generated. Upload failed.");
    throw new Error("Invalid public URL generated");
  }

  return publicUrl;
}

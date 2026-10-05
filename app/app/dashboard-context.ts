import { cache } from "react";
import { authenticatedClient } from "@/lib/supabase-server";

export const dashboardContext = cache(async () => {
  const { supabase, user } = await authenticatedClient();
  const { data: profile, error } = await supabase.from("profiles").select("display_name,avatar_url,premium_until").eq("id", user.id).maybeSingle();
  const name = typeof profile?.display_name === "string" && profile.display_name.trim() ? profile.display_name.trim() : "teman";
  const premium = typeof profile?.premium_until === "string" && new Date(profile.premium_until).getTime() > Date.now();
  let avatar = typeof profile?.avatar_url === "string" && /^https:\/\//.test(profile.avatar_url) ? profile.avatar_url : null;
  if(typeof profile?.avatar_url === "string" && profile.avatar_url.startsWith(`${user.id}/`)) {
    const {data}=await supabase.storage.from("avatars").createSignedUrl(profile.avatar_url,3600); avatar=data?.signedUrl??null;
  }
  return { supabase, user, name, avatar, status: error ? "Status belum tersedia" : premium ? "Premium" : "Gratis" };
});

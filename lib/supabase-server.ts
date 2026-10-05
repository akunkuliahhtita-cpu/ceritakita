import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function authenticatedClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) redirect("/masuk");
  const store = await cookies();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(values: {name:string;value:string;options:CookieOptions}[]) {
        try {
          values.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Server Components cannot write cookies; middleware refreshes them.
        }
      },
    },
  });
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || !user.email_confirmed_at) redirect("/masuk");
  const {data:profile,error:profileError}=await supabase.from("profiles").select("suspended_at").eq("id",user.id).maybeSingle();
  if(profileError)redirect("/masuk");
  if(profile?.suspended_at)redirect("/ditangguhkan");
  return { supabase, user };
}

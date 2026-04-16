import "react-native-url-polyfill/auto";
import { Platform } from "react-native";
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const storage =
  Platform.OS === "web"
    ? {
        getItem: (key: string) =>
          typeof window !== "undefined"
            ? window.localStorage.getItem(key)
            : null,
        setItem: (key: string, value: string) => {
          if (typeof window !== "undefined")
            window.localStorage.setItem(key, value);
        },
        removeItem: (key: string) => {
          if (typeof window !== "undefined")
            window.localStorage.removeItem(key);
        },
      }
    : AsyncStorage;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

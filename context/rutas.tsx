import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

type Ruta = Database["public"]["Tables"]["rutas"]["Row"];

interface RutasContextType {
  rutas: Ruta[];
  loading: boolean;
  refresh: () => Promise<void>;
}

const RutasContext = createContext<RutasContextType>({
  rutas: [],
  loading: true,
  refresh: async () => {},
});

export function RutasProvider({ children }: PropsWithChildren) {
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRutas = useCallback(async () => {
    const { data } = await supabase
      .from("rutas")
      .select("*")
      .eq("activo", true)
      .order("nombre");
    setRutas(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRutas();
  }, [fetchRutas]);

  const refresh = useCallback(async () => {
    await fetchRutas();
  }, [fetchRutas]);

  return (
    <RutasContext.Provider value={{ rutas, loading, refresh }}>
      {children}
    </RutasContext.Provider>
  );
}

export function useRutas() {
  return useContext(RutasContext);
}

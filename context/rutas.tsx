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
type Parada = Database["public"]["Tables"]["paradas"]["Row"];
type RutaParada = Database["public"]["Tables"]["ruta_paradas"]["Row"];

interface ParadaDeRuta extends Parada {
  orden: number;
  tiempo_estimado_min: number;
}

interface RutaParadaJoin {
  ruta_id: RutaParada["ruta_id"];
  orden: RutaParada["orden"];
  tiempo_estimado_min: RutaParada["tiempo_estimado_min"];
  parada: Parada | null;
}

interface RutaConParadas extends Ruta {
  paradas?: ParadaDeRuta[];
}

interface RutasContextType {
  rutas: RutaConParadas[];
  loading: boolean;
  refresh: () => Promise<void>;
}

const RutasContext = createContext<RutasContextType>({
  rutas: [],
  loading: true,
  refresh: async () => {},
});

export function RutasProvider({ children }: PropsWithChildren) {
  const [rutas, setRutas] = useState<RutaConParadas[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRutas = useCallback(async () => {
    try {
      const { data: rutasData, error: rutasError } = await supabase
        .from("rutas")
        .select("*")
        .eq("activo", true)
        .order("nombre");

      if (rutasError) {
        setRutas([]);
        return;
      }

      const rutasBase = (rutasData ?? []) as Ruta[];
      const rutaIds = rutasBase.map((ruta) => ruta.id_ruta);

      if (rutaIds.length === 0) {
        setRutas([]);
        return;
      }

      const { data: joinsData, error: joinsError } = await supabase
        .from("ruta_paradas")
        .select("ruta_id, orden, tiempo_estimado_min, parada:paradas(*)")
        .in("ruta_id", rutaIds)
        .order("orden", { ascending: true });

      if (joinsError) {
        // Mantiene rutas visibles aunque falle la consulta de paradas.
        console.error("Error fetching ruta_paradas:", joinsError);
        setRutas(rutasBase);
        return;
      }

      const joins = (joinsData ?? []) as RutaParadaJoin[];
      const paradasPorRuta = new Map<number, ParadaDeRuta[]>();

      joins.forEach((item) => {
        if (!item.parada) return;

        const parada: ParadaDeRuta = {
          ...(item.parada as Parada),
          latitud: Number((item.parada as Parada).latitud),
          longitud: Number((item.parada as Parada).longitud),
          orden: item.orden,
          tiempo_estimado_min: item.tiempo_estimado_min,
        };

        const existing = paradasPorRuta.get(item.ruta_id) ?? [];
        existing.push(parada);
        paradasPorRuta.set(item.ruta_id, existing);
      });

      const rutasConParadas: RutaConParadas[] = rutasBase.map((ruta) => ({
        ...ruta,
        paradas: (paradasPorRuta.get(ruta.id_ruta) ?? []).sort(
          (a, b) => a.orden - b.orden,
        ),
      }));

      setRutas(rutasConParadas);
    } catch (err) {
      console.error("Error fetching rutas:", err);
      setRutas([]);
    } finally {
      setLoading(false);
    }
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

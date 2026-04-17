import { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  Platform,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useRutas } from "@/context/rutas";
import type { Database } from "@/types/database";

type Ruta = Database["public"]["Tables"]["rutas"]["Row"];

const SANTO_DOMINGO = { lng: -69.9312, lat: 18.4861 };

const ROUTE_COLORS = [
  "#1E6FD9",
  "#22C55E",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#F97316",
];

// Origin & destination waypoints for each route (Santo Domingo)
// All points verified to be on land (lat ≥ 18.47 to stay north of the Malecón coastline)
const ROUTE_WAYPOINTS: Record<string, { points: [number, number][] }> = {
  "R-001": {
    // Villa Mella → Megacentro (Av. Charles de Gaulle sur)
    points: [
      [-69.933, 18.536],
      [-69.9305, 18.518],
      [-69.926, 18.502],
      [-69.918, 18.492],
      [-69.911, 18.482],
    ],
  },
  "R-002": {
    // Herrera → San Isidro (Av. Luperón → Av. 27 de Febrero → este)
    points: [
      [-69.968, 18.495],
      [-69.95, 18.489],
      [-69.932, 18.486],
      [-69.91, 18.488],
      [-69.89, 18.493],
      [-69.876, 18.496],
    ],
  },
  "R-003": {
    // Los Alcarrizos → Sans Souci (Autopista Duarte → Av. Kennedy → Av. España)
    points: [
      [-69.986, 18.512],
      [-69.965, 18.5],
      [-69.943, 18.49],
      [-69.92, 18.486],
      [-69.895, 18.492],
      [-69.857, 18.5],
    ],
  },
  "R-004": {
    // Arroyo Hondo → Centro Olímpico (Av. Núñez de Cáceres sur)
    points: [
      [-69.943, 18.505],
      [-69.935, 18.498],
      [-69.93, 18.492],
      [-69.925, 18.486],
      [-69.921, 18.479],
      [-69.92, 18.473],
    ],
  },
  "R-005": {
    // Villa Duarte → Av. Máximo Gómez (Puente Duarte → norte)
    points: [
      [-69.875, 18.483],
      [-69.885, 18.481],
      [-69.896, 18.483],
      [-69.91, 18.487],
      [-69.922, 18.491],
      [-69.932, 18.496],
    ],
  },
  "R-006": {
    // Cristo Rey → Los Mina (Av. Correa y Cidrón → este del río Ozama)
    points: [
      [-69.935, 18.501],
      [-69.923, 18.496],
      [-69.91, 18.492],
      [-69.897, 18.488],
      [-69.883, 18.486],
      [-69.868, 18.488],
    ],
  },
  "R-007": {
    // Los Ríos → Zona Colonial (Av. Tiradentes → Av. Independencia → Parque Colón)
    points: [
      [-69.96, 18.492],
      [-69.947, 18.488],
      [-69.933, 18.484],
      [-69.919, 18.48],
      [-69.904, 18.477],
      [-69.8835, 18.4735],
    ],
  },
  "R-008": {
    // Gazcue → Villa Mella (Av. Máximo Gómez norte → Av. Charles de Gaulle)
    points: [
      [-69.92, 18.471],
      [-69.924, 18.481],
      [-69.928, 18.492],
      [-69.931, 18.504],
      [-69.932, 18.518],
      [-69.933, 18.536],
    ],
  },
};

/**
 * Fetch a street-following route from OSRM (free, no API key).
 * Falls back to a straight line between first/last waypoint on error.
 */
async function fetchOSRMRoute(
  waypoints: [number, number][],
): Promise<[number, number][]> {
  try {
    const coords = waypoints.map((p) => `${p[0]},${p[1]}`).join(";");
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const json = await res.json();
    if (json.code === "Ok" && json.routes?.[0]?.geometry?.coordinates) {
      return json.routes[0].geometry.coordinates as [number, number][];
    }
  } catch {
    // fall through to fallback
  }
  return waypoints;
}

// ── Web Map Component ────────────────────────────────────

function WebMap({
  rutas,
  colors,
  selectedRoute,
  onSelectRoute,
}: {
  rutas: Ruta[];
  colors: typeof Colors.dark;
  selectedRoute: Ruta | null;
  onSelectRoute: (r: Ruta | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cancelled = false;

    (async () => {
      const maplibregl = await import("maplibre-gl");

      // Inject MapLibre CSS
      if (!document.getElementById("maplibre-css")) {
        const link = document.createElement("link");
        link.id = "maplibre-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/maplibre-gl@latest/dist/maplibre-gl.css";
        document.head.appendChild(link);
      }

      if (cancelled || !containerRef.current) return;

      const map = new maplibregl.default.Map({
        container: containerRef.current,
        style: "https://tiles.openfreemap.org/styles/liberty",
        center: [SANTO_DOMINGO.lng, SANTO_DOMINGO.lat],
        zoom: 12.5,
        attributionControl: false,
      });

      mapRef.current = map;

      map.addControl(
        new maplibregl.default.NavigationControl(),
        "bottom-right",
      );

      map.on("load", async () => {
        // Fetch all OSRM routes in parallel
        const routeGeometries = await Promise.all(
          rutas.map(async (ruta) => {
            const wp = ROUTE_WAYPOINTS[ruta.codigo];
            if (!wp) return null;
            const path = await fetchOSRMRoute(wp.points);
            return {
              codigo: ruta.codigo,
              path,
              origin: wp.points[0],
              dest: wp.points[wp.points.length - 1],
            };
          }),
        );

        if (cancelled) return;

        rutas.forEach((ruta, idx) => {
          const geo = routeGeometries.find((g) => g?.codigo === ruta.codigo);
          if (!geo) return;

          const color = ROUTE_COLORS[idx % ROUTE_COLORS.length];
          const sourceId = `route-${ruta.codigo}`;

          // Route line (follows streets)
          map.addSource(sourceId, {
            type: "geojson",
            data: {
              type: "Feature",
              properties: { codigo: ruta.codigo, nombre: ruta.nombre },
              geometry: { type: "LineString", coordinates: geo.path },
            },
          });

          // Route border (outline for visibility)
          map.addLayer({
            id: `${sourceId}-border`,
            type: "line",
            source: sourceId,
            layout: { "line-join": "round", "line-cap": "round" },
            paint: {
              "line-color": "#000",
              "line-width": 7,
              "line-opacity": 0.15,
            },
          });

          map.addLayer({
            id: `${sourceId}-line`,
            type: "line",
            source: sourceId,
            layout: { "line-join": "round", "line-cap": "round" },
            paint: {
              "line-color": color,
              "line-width": 4,
              "line-opacity": 0.9,
            },
          });

          // Origin marker
          map.addSource(`${sourceId}-origin`, {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: { type: "Point", coordinates: geo.origin },
            },
          });

          map.addLayer({
            id: `${sourceId}-origin-circle`,
            type: "circle",
            source: `${sourceId}-origin`,
            paint: {
              "circle-radius": 7,
              "circle-color": "#fff",
              "circle-stroke-color": color,
              "circle-stroke-width": 3,
            },
          });

          // Destination marker
          map.addSource(`${sourceId}-dest`, {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: { type: "Point", coordinates: geo.dest },
            },
          });

          map.addLayer({
            id: `${sourceId}-dest-circle`,
            type: "circle",
            source: `${sourceId}-dest`,
            paint: {
              "circle-radius": 7,
              "circle-color": color,
              "circle-stroke-color": "#fff",
              "circle-stroke-width": 3,
            },
          });

          // Click handler on route line
          map.on("click", `${sourceId}-line`, () => {
            const clicked = rutas.find((r) => r.codigo === ruta.codigo);
            onSelectRoute(clicked ?? null);

            // Fit to route bounds
            const bounds = geo.path.reduce(
              (b, c) => b.extend(c as [number, number]),
              new maplibregl.default.LngLatBounds(geo.path[0], geo.path[0]),
            );
            map.fitBounds(bounds, { padding: 60, duration: 800 });
          });

          // Cursor pointer on hover
          map.on("mouseenter", `${sourceId}-line`, () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", `${sourceId}-line`, () => {
            map.getCanvas().style.cursor = "";
          });
        });
      });
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [rutas]);

  // Show only selected route, hide the rest
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    rutas.forEach((ruta, idx) => {
      const sourceId = `route-${ruta.codigo}`;
      const color = ROUTE_COLORS[idx % ROUTE_COLORS.length];
      const isSelected = selectedRoute?.codigo === ruta.codigo;
      const hasSelection = selectedRoute !== null;
      const visible = !hasSelection || isSelected;
      const visibility = visible ? "visible" : "none";

      try {
        map.setLayoutProperty(`${sourceId}-line`, "visibility", visibility);
        map.setLayoutProperty(`${sourceId}-border`, "visibility", visibility);
        map.setLayoutProperty(
          `${sourceId}-origin-circle`,
          "visibility",
          visibility,
        );
        map.setLayoutProperty(
          `${sourceId}-dest-circle`,
          "visibility",
          visibility,
        );
        if (visible) {
          map.setPaintProperty(`${sourceId}-line`, "line-color", color);
          map.setPaintProperty(`${sourceId}-line`, "line-opacity", 0.9);
          map.setPaintProperty(
            `${sourceId}-line`,
            "line-width",
            isSelected ? 6 : 4,
          );
          map.setPaintProperty(`${sourceId}-border`, "line-opacity", 0.15);
          map.setPaintProperty(
            `${sourceId}-origin-circle`,
            "circle-stroke-color",
            color,
          );
          map.setPaintProperty(
            `${sourceId}-origin-circle`,
            "circle-opacity",
            1,
          );
          map.setPaintProperty(
            `${sourceId}-origin-circle`,
            "circle-stroke-opacity",
            1,
          );
          map.setPaintProperty(
            `${sourceId}-dest-circle`,
            "circle-color",
            color,
          );
          map.setPaintProperty(`${sourceId}-dest-circle`, "circle-opacity", 1);
          map.setPaintProperty(
            `${sourceId}-dest-circle`,
            "circle-stroke-opacity",
            1,
          );
        }
      } catch {
        // layer may not exist yet
      }
    });
  }, [selectedRoute, rutas]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", position: "absolute" }}
    />
  );
}

// ── Main Screen ──────────────────────────────────────────

export default function MapaScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  const { rutas } = useRutas();
  const [selectedRoute, setSelectedRoute] = useState<Ruta | null>(null);
  const [showLegend, setShowLegend] = useState(false);

  if (Platform.OS !== "web") {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.fallback}>
          <IconSymbol name="map.fill" size={48} color={colors.subtitle} />
          <Text style={[styles.fallbackTitle, { color: colors.text }]}>
            Mapa no disponible
          </Text>
          <Text style={[styles.fallbackText, { color: colors.subtitle }]}>
            El mapa interactivo solo está disponible en la versión web
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Map */}
      <WebMap
        rutas={rutas}
        colors={colors}
        selectedRoute={selectedRoute}
        onSelectRoute={setSelectedRoute}
      />

      {/* Top bar */}
      <SafeAreaView style={styles.topBar} edges={["top"]}>
        <View
          style={[
            styles.topBarInner,
            {
              backgroundColor: colors.card + "E6",
              borderColor: colors.cardBorder,
            },
          ]}
        >
          <IconSymbol name="map.fill" size={20} color={colors.accent} />
          <Text style={[styles.topBarTitle, { color: colors.text }]}>
            Rutas de Santo Domingo
          </Text>
          <TouchableOpacity onPress={() => setShowLegend(!showLegend)}>
            <IconSymbol
              name="bus.fill"
              size={22}
              color={showLegend ? colors.accent : colors.subtitle}
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Legend panel */}
      {showLegend && (
        <View
          style={[
            styles.legendPanel,
            {
              backgroundColor: colors.card + "F2",
              borderColor: colors.cardBorder,
            },
          ]}
        >
          <Text style={[styles.legendTitle, { color: colors.text }]}>
            Leyenda de Rutas
          </Text>
          <ScrollView style={styles.legendScroll}>
            {rutas.map((ruta, idx) => (
              <TouchableOpacity
                key={ruta.id_ruta}
                style={styles.legendItem}
                onPress={() => {
                  setSelectedRoute(ruta);
                  setShowLegend(false);
                }}
              >
                <View
                  style={[
                    styles.legendColor,
                    {
                      backgroundColor: ROUTE_COLORS[idx % ROUTE_COLORS.length],
                    },
                  ]}
                />
                <View style={styles.legendTextWrap}>
                  <Text style={[styles.legendCode, { color: colors.text }]}>
                    {ruta.codigo}
                  </Text>
                  <Text
                    style={[styles.legendName, { color: colors.subtitle }]}
                    numberOfLines={1}
                  >
                    {ruta.origen} → {ruta.destino}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Selected route info */}
      {selectedRoute && (
        <View
          style={[
            styles.routeInfo,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <View style={styles.routeInfoHeader}>
            <View style={styles.routeInfoLeft}>
              <IconSymbol name="bus.fill" size={20} color={colors.accent} />
              <Text style={[styles.routeInfoTitle, { color: colors.text }]}>
                {selectedRoute.nombre}
              </Text>
            </View>
          </View>
          <View style={styles.routeInfoBody}>
            <View style={styles.routeInfoPoint}>
              <IconSymbol
                name="mappin.and.ellipse"
                size={14}
                color={colors.success}
              />
              <Text style={[styles.routeInfoText, { color: colors.subtitle }]}>
                {selectedRoute.origen}
              </Text>
            </View>
            <IconSymbol name="arrow.right" size={12} color={colors.subtitle} />
            <View style={styles.routeInfoPoint}>
              <IconSymbol
                name="mappin.and.ellipse"
                size={14}
                color={colors.danger}
              />
              <Text style={[styles.routeInfoText, { color: colors.subtitle }]}>
                {selectedRoute.destino}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[
              styles.unfollowBtn,
              { backgroundColor: colors.danger + "18" },
            ]}
            onPress={() => setSelectedRoute(null)}
          >
            <IconSymbol name="location.fill" size={16} color={colors.danger} />
            <Text style={[styles.unfollowText, { color: colors.danger }]}>
              Dejar de seguir
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    padding: 40,
  },
  fallbackTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 8,
  },
  fallbackText: {
    fontSize: 14,
    textAlign: "center",
  },

  // Top bar
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
  },
  topBarInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginTop: 8,
  },
  topBarTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
  },

  // Legend
  legendPanel: {
    position: "absolute",
    top: 100,
    right: 16,
    width: 260,
    maxHeight: 350,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    zIndex: 10,
  },
  legendTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
  },
  legendScroll: {
    maxHeight: 280,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    gap: 10,
  },
  legendColor: {
    width: 14,
    height: 14,
    borderRadius: 4,
  },
  legendTextWrap: {
    flex: 1,
  },
  legendCode: {
    fontSize: 13,
    fontWeight: "600",
  },
  legendName: {
    fontSize: 12,
  },

  // Route info bottom card
  routeInfo: {
    position: "absolute",
    bottom: 24,
    left: 16,
    right: 16,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    zIndex: 10,
  },
  routeInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  routeInfoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  routeInfoTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  routeInfoBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  routeInfoPoint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  routeInfoText: {
    fontSize: 13,
  },
  unfollowBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  unfollowText: {
    fontSize: 14,
    fontWeight: "600",
  },
});

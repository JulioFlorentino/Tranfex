import { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Polyline, Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useRutas } from "@/context/rutas";
import type { Database } from "@/types/database";

type Ruta = Database["public"]["Tables"]["rutas"]["Row"];
type Parada = Database["public"]["Tables"]["paradas"]["Row"];

interface ParadaDeRuta extends Parada {
  orden: number;
  tiempo_estimado_min: number;
}

interface RutaConParadas extends Ruta {
  paradas?: ParadaDeRuta[];
}

const SANTO_DOMINGO = { latitude: 18.4861, longitude: -69.9312 };

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

// [lng, lat] waypoints — same as the web version
const ROUTE_WAYPOINTS: Record<string, { points: [number, number][] }> = {
  "R-001": {
    points: [
      [-69.933, 18.536],
      [-69.9305, 18.518],
      [-69.926, 18.502],
      [-69.918, 18.492],
      [-69.911, 18.482],
    ],
  },
  "R-002": {
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

// Convert [lng, lat] → { latitude, longitude } for react-native-maps
function toLatLng(points: [number, number][]) {
  return points.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
}

export default function MapaScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  const { rutas } = useRutas();
  const [selectedRoute, setSelectedRoute] = useState<RutaConParadas | null>(
    null,
  );
  const [showLegend, setShowLegend] = useState(false);

  const mapRef = useState<MapView | null>(null);

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={{
          ...SANTO_DOMINGO,
          latitudeDelta: 0.12,
          longitudeDelta: 0.12,
        }}
      >
        {rutas.map((ruta, idx) => {
          const wp = ROUTE_WAYPOINTS[ruta.codigo];
          if (!wp) return null;

          const coordinates = toLatLng(wp.points);
          const color = ROUTE_COLORS[idx % ROUTE_COLORS.length];
          const isSelected = selectedRoute?.codigo === ruta.codigo;
          const hasSelection = selectedRoute !== null;
          const visible = !hasSelection || isSelected;

          if (!visible) return null;

          const lineWidth = isSelected ? 6 : 3;
          const origin = coordinates[0];
          const dest = coordinates[coordinates.length - 1];

          // Ordenar paradas por orden
          const paradasOrdenadas = ruta.paradas
            ? [...ruta.paradas].sort((a, b) => a.orden - b.orden)
            : [];

          return [
            <Polyline
              key={`line-${ruta.codigo}`}
              coordinates={coordinates}
              strokeColor={color}
              strokeWidth={lineWidth}
              strokeColors={[color]}
              tappable
              onPress={() => setSelectedRoute(isSelected ? null : ruta)}
            />,
            <Marker
              key={`origin-${ruta.codigo}`}
              coordinate={origin}
              anchor={{ x: 0.5, y: 0.5 }}
              onPress={() => setSelectedRoute(isSelected ? null : ruta)}
            >
              <View
                style={[
                  styles.markerOuter,
                  {
                    borderColor: color,
                  },
                ]}
              >
                <View
                  style={[styles.markerInner, { backgroundColor: "#fff" }]}
                />
              </View>
            </Marker>,
            <Marker
              key={`dest-${ruta.codigo}`}
              coordinate={dest}
              anchor={{ x: 0.5, y: 0.5 }}
              onPress={() => setSelectedRoute(isSelected ? null : ruta)}
            >
              <View
                style={[
                  styles.markerOuter,
                  {
                    borderColor: "#fff",
                    backgroundColor: color,
                  },
                ]}
              />
            </Marker>,
            // Renderizar paradas intermedias cuando la ruta está seleccionada
            ...(isSelected && paradasOrdenadas.length > 0
              ? paradasOrdenadas.map((parada) => (
                  <Marker
                    key={`parada-${parada.id_parada}`}
                    coordinate={{
                      latitude: Number(parada.latitud),
                      longitude: Number(parada.longitud),
                    }}
                    anchor={{ x: 0.5, y: 0.5 }}
                  >
                    <View style={styles.paradaMarker}>
                      <View
                        style={[
                          styles.paradaMarkerInner,
                          { backgroundColor: color },
                        ]}
                      />
                    </View>
                  </Marker>
                ))
              : []),
          ];
        })}
      </MapView>

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

          {/* Paradas list */}
          {selectedRoute.paradas && selectedRoute.paradas.length > 0 && (
            <View style={styles.paradasSection}>
              <Text style={[styles.paradasTitle, { color: colors.text }]}>
                Paradas ({selectedRoute.paradas.length})
              </Text>
              <ScrollView
                style={styles.paradasList}
                scrollEnabled={selectedRoute.paradas.length > 3}
              >
                {[...selectedRoute.paradas]
                  .sort((a, b) => a.orden - b.orden)
                  .map((parada, idx) => (
                    <View
                      key={parada.id_parada}
                      style={[
                        styles.paradaItem,
                        {
                          borderColor: colors.cardBorder,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.paradaNumber,
                          {
                            backgroundColor: colors.accent + "20",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.paradaNumberText,
                            { color: colors.accent },
                          ]}
                        >
                          {idx + 1}
                        </Text>
                      </View>
                      <Text
                        style={[styles.paradaName, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {parada.nombre}
                      </Text>
                    </View>
                  ))}
              </ScrollView>
            </View>
          )}

          {(!selectedRoute.paradas || selectedRoute.paradas.length === 0) && (
            <View style={styles.paradasSection}>
              <Text style={[styles.paradasTitle, { color: colors.text }]}>
                Paradas
              </Text>
              <Text style={[styles.routeInfoText, { color: colors.subtitle }]}>
                Esta ruta no tiene paradas disponibles.
              </Text>
            </View>
          )}

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  markerOuter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  markerInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  paradaMarker: {
    width: 12,
    height: 12,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 2,
  },
  paradaMarkerInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    borderColor: "#fff",
    borderWidth: 1,
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
    width: 240,
    maxHeight: 320,
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
    maxHeight: 260,
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
  paradasSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  paradasTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  paradasList: {
    maxHeight: 120,
  },
  paradaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 6,
    marginBottom: 6,
    borderBottomWidth: 1,
  },
  paradaNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  paradaNumberText: {
    fontSize: 12,
    fontWeight: "600",
  },
  paradaName: {
    fontSize: 12,
    flex: 1,
  },
  unfollowBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  unfollowText: {
    fontSize: 13,
    fontWeight: "600",
  },
});

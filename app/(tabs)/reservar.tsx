import { useCallback, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/context/auth";
import { useRutas } from "@/context/rutas";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

type Ruta = Database["public"]["Tables"]["rutas"]["Row"];

// ── Helpers ──────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-DO", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Components ───────────────────────────────────────────

function RouteOption({
  ruta,
  colors,
  onBook,
  booking,
}: {
  ruta: Ruta;
  colors: typeof Colors.dark;
  onBook: (ruta: Ruta) => void;
  booking: boolean;
}) {
  return (
    <View
      style={[
        styles.routeCard,
        { backgroundColor: colors.card, borderColor: colors.cardBorder },
      ]}
    >
      <View style={styles.routeHeader}>
        <View style={styles.routeIcon}>
          <IconSymbol name="bus.fill" size={22} color={colors.accent} />
        </View>
        <View style={styles.routeDetails}>
          <Text style={[styles.routeName, { color: colors.text }]}>
            {ruta.nombre}
          </Text>
          <Text style={[styles.routeDesc, { color: colors.subtitle }]}>
            {ruta.codigo}
          </Text>
        </View>
      </View>

      <View style={styles.routeMeta}>
        <View style={styles.metaItem}>
          <IconSymbol
            name="mappin.and.ellipse"
            size={14}
            color={colors.subtitle}
          />
          <Text style={[styles.metaText, { color: colors.subtitle }]}>
            {ruta.origen}
          </Text>
        </View>
        <IconSymbol name="arrow.right" size={12} color={colors.subtitle} />
        <View style={styles.metaItem}>
          <IconSymbol
            name="mappin.and.ellipse"
            size={14}
            color={colors.accent}
          />
          <Text style={[styles.metaText, { color: colors.subtitle }]}>
            {ruta.destino}
          </Text>
        </View>
      </View>

      <View style={styles.routeFooter}>
        <TouchableOpacity
          style={[styles.bookButton, { backgroundColor: colors.accent }]}
          onPress={() => onBook(ruta)}
          disabled={booking}
          activeOpacity={0.8}
        >
          {booking ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <View style={styles.bookButtonContent}>
              <IconSymbol name="ticket.fill" size={16} color="#fff" />
              <Text style={styles.bookButtonText}>Reservar</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────

export default function ReservarScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  const { user } = useAuth();
  const { rutas, loading: loadingRutas, refresh } = useRutas();

  const [bookingRutaId, setBookingRutaId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const handleBook = async (ruta: Ruta) => {
    if (!user) return;

    Alert.alert(
      "Confirmar reserva",
      `¿Reservar ticket para "${ruta.nombre}"?\n${ruta.origen} → ${ruta.destino}`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Reservar",
          onPress: async () => {
            setBookingRutaId(ruta.id_ruta);

            // 1. Crear reservación
            const { data: reservacion, error: resError } = await supabase
              .from("reservaciones")
              .insert({
                usuario_id: user.id,
                ruta_id: ruta.id_ruta,
                asientos: 1,
                total: 0,
              })
              .select("id_reservacion")
              .single();

            if (resError || !reservacion) {
              setBookingRutaId(null);
              Alert.alert("Error", resError?.message ?? "Error al reservar");
              return;
            }

            // 2. Crear ticket
            const codigo = `TRF-${Date.now().toString(36).toUpperCase()}`;
            const { error: ticketError } = await supabase
              .from("tickets")
              .insert({
                reservacion_id: reservacion.id_reservacion,
                codigo_ticket: codigo,
              });

            setBookingRutaId(null);

            if (ticketError) {
              Alert.alert("Error", ticketError.message);
            } else {
              Alert.alert(
                "¡Reserva confirmada!",
                `Tu ticket: ${codigo}\nRevisa la pestaña Tickets.`,
              );
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={[styles.screenTitle, { color: colors.text }]}>
          Reservar ticket
        </Text>
        <Text style={[styles.screenSubtitle, { color: colors.subtitle }]}>
          Selecciona una ruta disponible
        </Text>

        {/* Available routes */}
        {loadingRutas ? (
          <ActivityIndicator
            size="large"
            color={colors.accent}
            style={styles.loader}
          />
        ) : rutas.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <IconSymbol name="bus" size={32} color={colors.subtitle} />
            <Text style={[styles.emptyText, { color: colors.subtitle }]}>
              No hay rutas disponibles
            </Text>
          </View>
        ) : (
          rutas.map((ruta) => (
            <RouteOption
              key={ruta.id_ruta}
              ruta={ruta}
              colors={colors}
              onBook={handleBook}
              booking={bookingRutaId === ruta.id_ruta}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  screenSubtitle: {
    fontSize: 15,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 28,
    marginBottom: 12,
  },
  loader: {
    marginVertical: 24,
  },

  // Route card
  routeCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  routeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  routeIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(30,111,217,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  routeDetails: {
    flex: 1,
    marginLeft: 12,
  },
  routeName: {
    fontSize: 16,
    fontWeight: "600",
  },
  routeDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  routeMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
    paddingLeft: 4,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 13,
  },
  routeFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  bookButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  bookButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  bookButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },

  // Empty state
  emptyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
  },
});

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
  Modal,
  Pressable,
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

const PRECIO_POR_ASIENTO = 35; // RD$ ficticio
const SALDO_FICTICIO = 500; // RD$ ficticio

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
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRuta, setSelectedRuta] = useState<Ruta | null>(null);
  const [asientos, setAsientos] = useState(1);
  const [saldo, setSaldo] = useState(SALDO_FICTICIO);
  const [confirming, setConfirming] = useState(false);

  const total = asientos * PRECIO_POR_ASIENTO;
  const saldoSuficiente = saldo >= total;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const openModal = (ruta: Ruta) => {
    setSelectedRuta(ruta);
    setAsientos(1);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedRuta(null);
  };

  const confirmBooking = async () => {
    if (!user || !selectedRuta || !saldoSuficiente) return;
    setConfirming(true);

    // 1. Crear reservación
    const { data: reservacion, error: resError } = await supabase
      .from("reservaciones")
      .insert({
        usuario_id: user.id,
        ruta_id: selectedRuta.id_ruta,
        asientos,
        total,
      })
      .select("id_reservacion")
      .single();

    if (resError || !reservacion) {
      setConfirming(false);
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

    setConfirming(false);

    if (ticketError) {
      Alert.alert("Error", ticketError.message);
    } else {
      setSaldo((prev) => prev - total);
      closeModal();
      Alert.alert(
        "¡Reserva confirmada!",
        `Ticket: ${codigo}\nTotal: RD$${total.toFixed(2)}\nRevisa la pestaña Tickets.`,
      );
    }
  };

  const handleBook = (ruta: Ruta) => {
    if (!user) return;
    openModal(ruta);
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

      {/* ── Modal de reserva ── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <Pressable
            style={[styles.modalContent, { backgroundColor: colors.card }]}
            onPress={() => {}}
          >
            {/* Header */}
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Confirmar reserva
            </Text>

            {/* Ruta info */}
            {selectedRuta && (
              <View
                style={[
                  styles.modalRouteBox,
                  { backgroundColor: colors.background },
                ]}
              >
                <View style={styles.modalRouteRow}>
                  <IconSymbol
                    name="bus.fill"
                    size={20}
                    color={colors.accent}
                  />
                  <Text style={[styles.modalRouteName, { color: colors.text }]}>
                    {selectedRuta.nombre}
                  </Text>
                  <Text
                    style={[
                      styles.modalRouteCodigo,
                      { color: colors.subtitle },
                    ]}
                  >
                    {selectedRuta.codigo}
                  </Text>
                </View>
                <View style={styles.modalRoutePoints}>
                  <IconSymbol
                    name="mappin.and.ellipse"
                    size={13}
                    color={colors.subtitle}
                  />
                  <Text
                    style={[styles.modalRouteText, { color: colors.subtitle }]}
                  >
                    {selectedRuta.origen}
                  </Text>
                  <IconSymbol
                    name="arrow.right"
                    size={11}
                    color={colors.subtitle}
                  />
                  <Text
                    style={[styles.modalRouteText, { color: colors.subtitle }]}
                  >
                    {selectedRuta.destino}
                  </Text>
                </View>
              </View>
            )}

            {/* Saldo */}
            <View style={styles.modalSaldoRow}>
              <Text style={[styles.modalLabel, { color: colors.subtitle }]}>
                Tu saldo
              </Text>
              <Text
                style={[
                  styles.modalSaldo,
                  { color: saldoSuficiente ? colors.success : colors.danger },
                ]}
              >
                RD${saldo.toFixed(2)}
              </Text>
            </View>

            {/* Asientos */}
            <View style={styles.modalSaldoRow}>
              <Text style={[styles.modalLabel, { color: colors.subtitle }]}>
                Asientos
              </Text>
              <View style={styles.modalCounter}>
                <TouchableOpacity
                  style={[
                    styles.counterBtn,
                    { borderColor: colors.cardBorder },
                  ]}
                  onPress={() => setAsientos((a) => Math.max(1, a - 1))}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.counterText, { color: colors.text }]}>
                    −
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.counterValue, { color: colors.text }]}>
                  {asientos}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.counterBtn,
                    { borderColor: colors.cardBorder },
                  ]}
                  onPress={() => setAsientos((a) => Math.min(10, a + 1))}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.counterText, { color: colors.text }]}>
                    +
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Precio */}
            <View style={styles.modalSaldoRow}>
              <Text style={[styles.modalLabel, { color: colors.subtitle }]}>
                Precio por asiento
              </Text>
              <Text style={[styles.modalPrecio, { color: colors.text }]}>
                RD${PRECIO_POR_ASIENTO.toFixed(2)}
              </Text>
            </View>

            {/* Divider + Total */}
            <View
              style={[
                styles.modalDivider,
                { borderTopColor: colors.cardBorder },
              ]}
            />
            <View style={styles.modalSaldoRow}>
              <Text style={[styles.modalTotalLabel, { color: colors.text }]}>
                Total
              </Text>
              <Text style={[styles.modalTotalValue, { color: colors.accent }]}>
                RD${total.toFixed(2)}
              </Text>
            </View>

            {!saldoSuficiente && (
              <Text style={[styles.modalError, { color: colors.danger }]}>
                Saldo insuficiente para esta reserva
              </Text>
            )}

            {/* Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalCancelBtn,
                  { borderColor: colors.cardBorder },
                ]}
                onPress={closeModal}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.modalCancelText, { color: colors.subtitle }]}
                >
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  {
                    backgroundColor: saldoSuficiente
                      ? colors.accent
                      : colors.cardBorder,
                  },
                ]}
                onPress={confirmBooking}
                disabled={!saldoSuficiente || confirming}
                activeOpacity={0.8}
              >
                {confirming ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>Confirmar</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(148,163,184,0.3)",
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },
  modalRouteBox: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    gap: 8,
  },
  modalRouteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalRouteName: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  modalRouteCodigo: {
    fontSize: 13,
  },
  modalRoutePoints: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 2,
  },
  modalRouteText: {
    fontSize: 13,
  },
  modalSaldoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  modalLabel: {
    fontSize: 15,
  },
  modalSaldo: {
    fontSize: 16,
    fontWeight: "700",
  },
  modalPrecio: {
    fontSize: 15,
    fontWeight: "600",
  },
  modalCounter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  counterBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  counterText: {
    fontSize: 18,
    fontWeight: "600",
  },
  counterValue: {
    fontSize: 18,
    fontWeight: "700",
    minWidth: 24,
    textAlign: "center",
  },
  modalDivider: {
    borderTopWidth: 1,
    marginBottom: 14,
  },
  modalTotalLabel: {
    fontSize: 17,
    fontWeight: "700",
  },
  modalTotalValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  modalError: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 10,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: "600",
  },
  modalConfirmBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalConfirmText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});

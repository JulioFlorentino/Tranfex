import { useCallback, useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
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

// ── Constants ───────────────────────────────────────────
const SALDO_DISPONIBLE = 1500; // RD$ ficticio
const PRECIO_POR_ASIENTO = 150; // RD$ por asiento

type Ruta = Database["public"]["Tables"]["rutas"]["Row"];

// ── Helpers ──────────────────────────────────────────────

function roundToNextHalfHour(date: Date) {
  const rounded = new Date(date);
  rounded.setSeconds(0, 0);

  const minutes = rounded.getMinutes();
  const nextMinutes =
    minutes <= 30 && minutes !== 0 ? 30 : minutes === 0 ? 0 : 60;

  if (nextMinutes === 60) {
    rounded.setHours(rounded.getHours() + 1, 0, 0, 0);
  } else {
    rounded.setMinutes(nextMinutes, 0, 0);
  }

  return rounded;
}

function getInitialBookingDate() {
  const now = roundToNextHalfHour(new Date());
  return now;
}

function getBookingDateOptions() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: 4 }, (_, index) => {
    const option = new Date(today);
    option.setDate(today.getDate() + index);
    return option;
  });
}

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
  const [pendingRuta, setPendingRuta] = useState<Ruta | null>(null);
  const [bookingConfirm, setBookingConfirm] = useState(false);
  const [successTicket, setSuccessTicket] = useState<string | null>(null);
  const [asientos, setAsientos] = useState(1);
  const [fechaViaje, setFechaViaje] = useState<Date>(() =>
    getInitialBookingDate(),
  );

  const bookingDateOptions = getBookingDateOptions();
  const [horaTexto, setHoraTexto] = useState<string | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    const now = roundToNextHalfHour(new Date());
    const isToday = fechaViaje.toDateString() === new Date().toDateString();
    for (let h = 0; h < 24; h++) {
      for (const m of [0, 30]) {
        if (isToday) {
          const candidate = new Date(fechaViaje);
          candidate.setHours(h, m, 0, 0);
          if (candidate < now) continue;
        }
        slots.push(
          `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
        );
      }
    }
    return slots;
  }, [fechaViaje]);

  const total = asientos * PRECIO_POR_ASIENTO;
  const saldoTrasCompra = SALDO_DISPONIBLE - total;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const handleBook = (ruta: Ruta) => {
    if (!user) return;
    setAsientos(1);
    const initial = getInitialBookingDate();
    setFechaViaje(initial);
    setHoraTexto(
      `${String(initial.getHours()).padStart(2, "0")}:${String(initial.getMinutes()).padStart(2, "0")}`,
    );
    setShowTimePicker(false);
    setPendingRuta(ruta);
  };

  const confirmBook = async () => {
    if (!user || !pendingRuta) return;
    setBookingConfirm(true);
    setBookingRutaId(pendingRuta.id_ruta);

    // 0. Buscar viaje_activo que coincida con la ruta y la fecha seleccionada
    let viajeId: number | null = null;
    const dayStart = new Date(fechaViaje);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(fechaViaje);
    dayEnd.setHours(23, 59, 59, 999);

    const { data: viajes } = await (supabase
      .from("viajes_activos")
      .select("id_viaje, inicio_programado")
      .eq("ruta_id", pendingRuta.id_ruta)
      .gte("inicio_programado", dayStart.toISOString())
      .lte("inicio_programado", dayEnd.toISOString())
      .in("estado", ["programado", "en_curso"]) as unknown as Promise<{
      data: { id_viaje: number; inicio_programado: string }[] | null;
    }>);

    if (viajes && viajes.length > 0) {
      const target = fechaViaje.getTime();
      const best = viajes.reduce((a, b) => {
        const da = Math.abs(new Date(a.inicio_programado).getTime() - target);
        const db = Math.abs(new Date(b.inicio_programado).getTime() - target);
        return da <= db ? a : b;
      });
      viajeId = best.id_viaje;
    }

    // 1. Crear reservación
    const { data: reservacion, error: resError } = await supabase
      .from("reservaciones")
      .insert({
        usuario_id: user.id,
        ruta_id: pendingRuta.id_ruta,
        viaje_id: viajeId,
        fecha_reserva: fechaViaje.toISOString(),
        asientos,
        total,
      })
      .select("id_reservacion")
      .single();

    if (resError || !reservacion) {
      setBookingRutaId(null);
      setBookingConfirm(false);
      setPendingRuta(null);
      setShowTimePicker(false);
      Alert.alert("Error", resError?.message ?? "Error al reservar");
      return;
    }

    // 2. Crear ticket
    const codigo = `TRF-${Date.now().toString(36).toUpperCase()}`;
    const { error: ticketError } = await supabase.from("tickets").insert({
      reservacion_id: reservacion.id_reservacion,
      codigo_ticket: codigo,
    });

    setBookingRutaId(null);
    setBookingConfirm(false);
    setPendingRuta(null);
    setShowTimePicker(false);
    setHoraTexto(null);

    if (ticketError) {
      Alert.alert("Error", ticketError.message);
    } else {
      setSuccessTicket(codigo);
    }
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

      {/* Confirm booking modal */}
      <Modal
        visible={pendingRuta !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingRuta(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => !bookingConfirm && setPendingRuta(null)}
        >
          <Pressable
            style={[
              styles.modalCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
            onPress={() => {}}
          >
            {/* Icon + title + route */}
            <View style={styles.modalTop}>
              <View
                style={[
                  styles.modalIconWrap,
                  { backgroundColor: colors.accent + "20" },
                ]}
              >
                <IconSymbol
                  name="ticket.fill"
                  size={28}
                  color={colors.accent}
                />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Confirmar reserva
              </Text>
              <Text style={[styles.modalMsg, { color: colors.subtitle }]}>
                ¿Reservar ticket para{"\n"}
                <Text style={{ fontWeight: "700", color: colors.text }}>
                  {pendingRuta?.nombre}
                </Text>
                ?
              </Text>
              <View
                style={[
                  styles.modalRoute,
                  { backgroundColor: colors.background },
                ]}
              >
                <Text
                  style={[styles.modalRouteText, { color: colors.subtitle }]}
                >
                  {pendingRuta?.origen}
                </Text>
                <IconSymbol
                  name="arrow.right"
                  size={12}
                  color={colors.subtitle}
                />
                <Text
                  style={[styles.modalRouteText, { color: colors.subtitle }]}
                >
                  {pendingRuta?.destino}
                </Text>
              </View>
            </View>

            {/* Fecha */}
            <View style={styles.fieldBlock}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Fecha
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dateChipsRow}
              >
                {bookingDateOptions.map((option) => {
                  const selected =
                    option.toDateString() === fechaViaje.toDateString();
                  const isToday =
                    option.toDateString() === new Date().toDateString();
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  const isTomorrow =
                    option.toDateString() === tomorrow.toDateString();
                  return (
                    <TouchableOpacity
                      key={option.toISOString()}
                      style={[
                        styles.dateChip,
                        {
                          backgroundColor: selected
                            ? colors.accent
                            : colors.background,
                          borderColor: selected
                            ? colors.accent
                            : colors.cardBorder,
                        },
                      ]}
                      onPress={() =>
                        setFechaViaje((c) => {
                          const n = new Date(option);
                          n.setHours(c.getHours(), c.getMinutes(), 0, 0);
                          return n;
                        })
                      }
                      disabled={bookingConfirm}
                    >
                      <Text
                        style={[
                          styles.dateChipTop,
                          {
                            color: selected
                              ? "rgba(255,255,255,0.75)"
                              : colors.subtitle,
                          },
                        ]}
                      >
                        {isToday
                          ? "Hoy"
                          : isTomorrow
                            ? "Mañana"
                            : option.toLocaleDateString("es-DO", {
                                weekday: "short",
                              })}
                      </Text>
                      <Text
                        style={[
                          styles.dateChipBottom,
                          { color: selected ? "#fff" : colors.text },
                        ]}
                      >
                        {option.toLocaleDateString("es-DO", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Hora de salida */}
            <View style={styles.fieldBlock}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Hora de salida
              </Text>
              <TouchableOpacity
                style={[
                  styles.timeField,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.cardBorder,
                  },
                ]}
                onPress={() => setShowTimePicker((v) => !v)}
                disabled={bookingConfirm}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.timeFieldText,
                    { color: horaTexto ? colors.text : colors.subtitle },
                  ]}
                >
                  {horaTexto ?? "Seleccionar hora"}
                </Text>
                <View
                  style={{
                    transform: [
                      { rotate: showTimePicker ? "-90deg" : "90deg" },
                    ],
                  }}
                >
                  <IconSymbol
                    name="chevron.right"
                    size={16}
                    color={colors.subtitle}
                  />
                </View>
              </TouchableOpacity>
              {showTimePicker && (
                <ScrollView
                  style={[
                    styles.timeDropdown,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.cardBorder,
                    },
                  ]}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={false}
                >
                  {timeSlots.map((slot) => {
                    const sel = slot === horaTexto;
                    return (
                      <TouchableOpacity
                        key={slot}
                        style={[
                          styles.timeSlotItem,
                          sel && { backgroundColor: colors.accent + "15" },
                        ]}
                        onPress={() => {
                          const [h, m] = slot.split(":").map(Number);
                          setFechaViaje((d) => {
                            const n = new Date(d);
                            n.setHours(h, m, 0, 0);
                            return n;
                          });
                          setHoraTexto(slot);
                          setShowTimePicker(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.timeSlotText,
                            {
                              color: sel ? colors.accent : colors.text,
                              fontWeight: sel ? "700" : "400",
                            },
                          ]}
                        >
                          {slot}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {/* Asientos */}
            <View style={[styles.seatsRow, { borderColor: colors.cardBorder }]}>
              <Text style={[styles.seatsLabel, { color: colors.text }]}>
                Asientos
              </Text>
              <View style={styles.seatsControl}>
                <TouchableOpacity
                  style={[
                    styles.seatsBtn,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.cardBorder,
                    },
                  ]}
                  onPress={() => setAsientos((a) => Math.max(1, a - 1))}
                  disabled={bookingConfirm || asientos <= 1}
                >
                  <Text style={[styles.seatsBtnText, { color: colors.text }]}>
                    −
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.seatsValue, { color: colors.text }]}>
                  {asientos}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.seatsBtn,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.cardBorder,
                    },
                  ]}
                  onPress={() => setAsientos((a) => Math.min(8, a + 1))}
                  disabled={bookingConfirm || asientos >= 8}
                >
                  <Text style={[styles.seatsBtnText, { color: colors.text }]}>
                    +
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Resumen de precio */}
            <View
              style={[
                styles.priceSummary,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, { color: colors.subtitle }]}>
                  {asientos} × RD${PRECIO_POR_ASIENTO.toFixed(2)}
                </Text>
                <Text style={[styles.priceValue, { color: colors.text }]}>
                  RD${total.toFixed(2)}
                </Text>
              </View>
              <View
                style={[
                  styles.priceDivider,
                  { backgroundColor: colors.cardBorder },
                ]}
              />
              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, { color: colors.subtitle }]}>
                  Saldo disponible
                </Text>
                <Text style={[styles.priceValue, { color: colors.accent }]}>
                  RD${SALDO_DISPONIBLE.toFixed(2)}
                </Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, { color: colors.subtitle }]}>
                  Saldo tras compra
                </Text>
                <Text
                  style={[
                    styles.priceValue,
                    {
                      color: saldoTrasCompra >= 0 ? "#22C55E" : "#EF4444",
                    },
                  ]}
                >
                  RD${saldoTrasCompra.toFixed(2)}
                </Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.cardBorder,
                    borderWidth: 1,
                  },
                ]}
                onPress={() => setPendingRuta(null)}
                disabled={bookingConfirm}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.accent }]}
                onPress={confirmBook}
                disabled={bookingConfirm}
              >
                {bookingConfirm ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: "#fff" }]}>
                    Reservar
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Success modal */}
      <Modal
        visible={successTicket !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSuccessTicket(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSuccessTicket(null)}
        >
          <Pressable
            style={[
              styles.modalCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
            onPress={() => {}}
          >
            <View
              style={[
                styles.modalIconWrap,
                { backgroundColor: "rgba(34,197,94,0.15)" },
              ]}
            >
              <IconSymbol
                name="checkmark.circle.fill"
                size={28}
                color="#22C55E"
              />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              ¡Reserva confirmada!
            </Text>
            <Text style={[styles.modalMsg, { color: colors.subtitle }]}>
              Tu ticket fue generado exitosamente.
            </Text>
            <View
              style={[
                styles.modalRoute,
                { backgroundColor: colors.background },
              ]}
            >
              <Text
                style={[
                  styles.modalBtnText,
                  { color: colors.text, fontFamily: "monospace" },
                ]}
              >
                {successTicket}
              </Text>
            </View>
            <Text style={[styles.modalHint, { color: colors.subtitle }]}>
              Revisa la pestaña Tickets para verlo.
            </Text>
            <TouchableOpacity
              style={[styles.modalBtnFull, { backgroundColor: colors.accent }]}
              onPress={() => setSuccessTicket(null)}
            >
              <Text style={[styles.modalBtnText, { color: "#fff" }]}>
                Entendido
              </Text>
            </TouchableOpacity>
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

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 18,
    borderWidth: 1,
    padding: 24,
    gap: 14,
  },
  modalTop: {
    alignItems: "center" as const,
    gap: 6,
  },
  modalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  modalMsg: {
    fontSize: 14,
    textAlign: "center" as const,
    lineHeight: 22,
  },
  modalRoute: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modalRouteText: {
    fontSize: 13,
  },
  modalHint: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },

  // Seats selector
  seatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 12,
  },
  seatsLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  seatsControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  seatsBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  seatsBtnText: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 22,
  },
  seatsValue: {
    fontSize: 18,
    fontWeight: "700",
    minWidth: 24,
    textAlign: "center",
  },

  selectionGroup: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    justifyContent: "flex-end" as const,
    gap: 8,
    flex: 1,
  },

  // Date / time field styles
  fieldBlock: {
    width: "100%" as const,
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
  },
  dateChipsRow: {
    flexDirection: "row" as const,
    gap: 8,
    paddingVertical: 2,
  },
  dateChip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center" as const,
    gap: 2,
  },
  dateChipTop: {
    fontSize: 11,
    fontWeight: "500" as const,
  },
  dateChipBottom: {
    fontSize: 13,
    fontWeight: "700" as const,
  },
  timeField: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  timeFieldText: {
    fontSize: 15,
  },
  timeDropdown: {
    maxHeight: 180,
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 4,
  },
  timeSlotItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  timeSlotText: {
    fontSize: 15,
  },

  // Price summary
  priceSummary: {
    width: "100%",
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    gap: 8,
    marginBottom: 20,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceLabel: {
    fontSize: 13,
  },
  priceValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  priceDivider: {
    height: 1,
    marginVertical: 2,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnFull: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  modalBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
});

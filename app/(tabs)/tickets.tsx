import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Image,
  Alert,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/context/auth";
import { supabase } from "@/lib/supabase";
import QRCode from "qrcode";

interface TicketConDetalles {
  id_ticket: number;
  codigo_ticket: string;
  asiento: string | null;
  estado: string;
  emitido_en: string;
  reservaciones: {
    id_reservacion: number;
    fecha_reserva: string;
    asientos: number;
    estado: string;
    total: number;
    rutas: {
      nombre: string;
      codigo: string;
      origen: string;
      destino: string;
    };
  };
}

// ── Helpers ──────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-DO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const estadoConfig: Record<string, { label: string; color: string }> = {
  activo: { label: "Activo", color: "#22C55E" },
  usado: { label: "Usado", color: "#64748B" },
  expirado: { label: "Expirado", color: "#F59E0B" },
  cancelado: { label: "Cancelado", color: "#EF4444" },
};

// ── Components ───────────────────────────────────────────

function TicketCard({
  ticket,
  colors,
  onPress,
  onDelete,
}: {
  ticket: TicketConDetalles;
  colors: typeof Colors.dark;
  onPress: () => void;
  onDelete: () => void;
}) {
  const ruta = ticket.reservaciones?.rutas;
  const reserva = ticket.reservaciones;
  const config = estadoConfig[ticket.estado] ?? {
    label: ticket.estado,
    color: "#64748B",
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.ticketCard,
        { backgroundColor: colors.card, borderColor: colors.cardBorder },
      ]}
    >
      {/* Header */}
      <View style={styles.ticketHeader}>
        <View style={styles.ticketIconWrap}>
          <IconSymbol name="ticket.fill" size={20} color={config.color} />
        </View>
        <View style={styles.ticketHeaderText}>
          <Text style={[styles.ticketRuta, { color: colors.text }]}>
            {ruta?.nombre ?? "Ruta desconocida"}
          </Text>
          <Text style={[styles.ticketCodigo, { color: colors.subtitle }]}>
            {ticket.codigo_ticket}
          </Text>
        </View>
        <View
          style={[styles.estadoBadge, { backgroundColor: config.color + "20" }]}
        >
          <Text style={[styles.estadoText, { color: config.color }]}>
            {config.label}
          </Text>
        </View>
      </View>

      {/* Route info */}
      {ruta && (
        <View style={styles.rutaInfo}>
          <View style={styles.rutaPoint}>
            <IconSymbol
              name="mappin.and.ellipse"
              size={14}
              color={colors.subtitle}
            />
            <Text style={[styles.rutaText, { color: colors.subtitle }]}>
              {ruta.origen}
            </Text>
          </View>
          <IconSymbol name="arrow.right" size={12} color={colors.subtitle} />
          <View style={styles.rutaPoint}>
            <IconSymbol
              name="mappin.and.ellipse"
              size={14}
              color={colors.accent}
            />
            <Text style={[styles.rutaText, { color: colors.subtitle }]}>
              {ruta.destino}
            </Text>
          </View>
        </View>
      )}

      {/* Details */}
      <View style={styles.ticketDetails}>
        {reserva?.fecha_reserva && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.subtitle }]}>
              Fecha de viaje
            </Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {formatDate(reserva.fecha_reserva)}
            </Text>
          </View>
        )}
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.subtitle }]}>
            Emitido
          </Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {formatDate(ticket.emitido_en)}
          </Text>
        </View>
        {ticket.asiento && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.subtitle }]}>
              Asiento
            </Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {ticket.asiento}
            </Text>
          </View>
        )}
        {reserva && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.subtitle }]}>
              Total
            </Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              RD${Number(reserva.total).toFixed(2)}
            </Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.accent + "15" }]}
          onPress={onPress}
        >
          <IconSymbol name="magnifyingglass" size={14} color={colors.accent} />
          <Text style={[styles.actionBtnText, { color: colors.accent }]}>
            Ver QR
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: "#EF444415" }]}
          onPress={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <IconSymbol name="arrow.right" size={14} color="#EF4444" />
          <Text style={[styles.actionBtnText, { color: "#EF4444" }]}>
            Eliminar
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ── Main Screen ──────────────────────────────────────────

export default function TicketsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  const { user } = useAuth();

  const [tickets, setTickets] = useState<TicketConDetalles[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTicket, setSelectedTicket] =
    useState<TicketConDetalles | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [ticketToDelete, setTicketToDelete] =
    useState<TicketConDetalles | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTickets = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("tickets")
      .select(
        `
        id_ticket,
        codigo_ticket,
        asiento,
        estado,
        emitido_en,
        reservaciones!inner (
          id_reservacion,
          fecha_reserva,
          asientos,
          estado,
          total,
          rutas (
            nombre,
            codigo,
            origen,
            destino
          )
        )
      `,
      )
      .eq("reservaciones.usuario_id", user.id)
      .order("emitido_en", { ascending: false });

    if (error) {
      console.error("Error fetching tickets:", error.message);
    }
    setTickets((data as unknown as TicketConDetalles[]) ?? []);
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchTickets();
    }, [fetchTickets]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTickets();
    setRefreshing(false);
  }, [fetchTickets]);

  const openQR = useCallback(async (ticket: TicketConDetalles) => {
    setSelectedTicket(ticket);
    try {
      const url = await QRCode.toDataURL(ticket.codigo_ticket, {
        width: 250,
        margin: 2,
        color: { dark: "#000000", light: "#FFFFFF" },
      });
      setQrDataUrl(url);
    } catch {
      setQrDataUrl(null);
    }
  }, []);

  const closeQR = useCallback(() => {
    setSelectedTicket(null);
    setQrDataUrl(null);
  }, []);

  const handleDelete = useCallback((ticket: TicketConDetalles) => {
    setTicketToDelete(ticket);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!ticketToDelete) return;
    setDeleting(true);
    const { error } = await supabase
      .from("tickets")
      .delete()
      .eq("id_ticket", ticketToDelete.id_ticket);
    setDeleting(false);
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setTickets((prev) =>
        prev.filter((t) => t.id_ticket !== ticketToDelete.id_ticket),
      );
      setTicketToDelete(null);
    }
  }, [ticketToDelete]);

  const cancelDelete = useCallback(() => {
    setTicketToDelete(null);
  }, []);

  const activos = tickets.filter((t) => t.estado === "activo");
  const pasados = tickets.filter((t) => t.estado !== "activo");

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
          Mis Tickets
        </Text>
        <Text style={[styles.screenSubtitle, { color: colors.subtitle }]}>
          Tickets de tus reservaciones
        </Text>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={colors.accent}
            style={styles.loader}
          />
        ) : tickets.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <IconSymbol name="ticket.fill" size={40} color={colors.subtitle} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Sin tickets
            </Text>
            <Text style={[styles.emptyText, { color: colors.subtitle }]}>
              Reserva una ruta para obtener tu primer ticket
            </Text>
          </View>
        ) : (
          <>
            {activos.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Activos ({activos.length})
                </Text>
                {activos.map((ticket) => (
                  <TicketCard
                    key={ticket.id_ticket}
                    ticket={ticket}
                    colors={colors}
                    onPress={() => openQR(ticket)}
                    onDelete={() => handleDelete(ticket)}
                  />
                ))}
              </>
            )}

            {pasados.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Historial ({pasados.length})
                </Text>
                {pasados.map((ticket) => (
                  <TicketCard
                    key={ticket.id_ticket}
                    ticket={ticket}
                    colors={colors}
                    onPress={() => openQR(ticket)}
                    onDelete={() => handleDelete(ticket)}
                  />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={ticketToDelete !== null}
        transparent
        animationType="fade"
        onRequestClose={cancelDelete}
      >
        <Pressable style={styles.modalOverlay} onPress={cancelDelete}>
          <Pressable
            style={[
              styles.modalCard,
              styles.deleteModal,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
            onPress={() => {}}
          >
            <View style={styles.deleteIconWrap}>
              <IconSymbol name="trash.fill" size={28} color="#EF4444" />
            </View>
            <Text style={[styles.deleteModalTitle, { color: colors.text }]}>
              Eliminar ticket
            </Text>
            <Text style={[styles.deleteModalMsg, { color: colors.subtitle }]}>
              ¿Seguro que deseas eliminar el ticket{"\n"}
              <Text style={{ fontWeight: "700", color: colors.text }}>
                {ticketToDelete?.codigo_ticket}
              </Text>
              ?{"\n"}Esta acción no se puede deshacer.
            </Text>
            <View style={styles.deleteModalActions}>
              <TouchableOpacity
                style={[
                  styles.deleteModalBtn,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.cardBorder,
                    borderWidth: 1,
                  },
                ]}
                onPress={cancelDelete}
                disabled={deleting}
              >
                <Text
                  style={[styles.deleteModalBtnText, { color: colors.text }]}
                >
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteModalBtn, { backgroundColor: "#EF4444" }]}
                onPress={confirmDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.deleteModalBtnText, { color: "#fff" }]}>
                    Eliminar
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* QR Modal */}
      <Modal
        visible={selectedTicket !== null}
        transparent
        animationType="fade"
        onRequestClose={closeQR}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            {selectedTicket && (
              <>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {selectedTicket.reservaciones?.rutas?.nombre ?? "Ticket"}
                </Text>

                {qrDataUrl ? (
                  <View style={styles.qrWrap}>
                    <Image source={{ uri: qrDataUrl }} style={styles.qrImage} />
                  </View>
                ) : (
                  <ActivityIndicator
                    size="large"
                    color={colors.accent}
                    style={{ marginVertical: 20 }}
                  />
                )}

                <Text style={[styles.modalCode, { color: colors.text }]}>
                  {selectedTicket.codigo_ticket}
                </Text>

                <View style={styles.modalDetails}>
                  <View style={styles.modalDetailRow}>
                    <Text
                      style={[
                        styles.modalDetailLabel,
                        { color: colors.subtitle },
                      ]}
                    >
                      Estado
                    </Text>
                    <View
                      style={[
                        styles.estadoBadge,
                        {
                          backgroundColor:
                            (estadoConfig[selectedTicket.estado]?.color ??
                              "#64748B") + "20",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.estadoText,
                          {
                            color:
                              estadoConfig[selectedTicket.estado]?.color ??
                              "#64748B",
                          },
                        ]}
                      >
                        {estadoConfig[selectedTicket.estado]?.label ??
                          selectedTicket.estado}
                      </Text>
                    </View>
                  </View>
                  {selectedTicket.reservaciones?.rutas && (
                    <View style={styles.modalDetailRow}>
                      <Text
                        style={[
                          styles.modalDetailLabel,
                          { color: colors.subtitle },
                        ]}
                      >
                        Ruta
                      </Text>
                      <Text
                        style={[
                          styles.modalDetailValue,
                          { color: colors.text },
                        ]}
                      >
                        {selectedTicket.reservaciones.rutas.origen} →{" "}
                        {selectedTicket.reservaciones.rutas.destino}
                      </Text>
                    </View>
                  )}
                  {selectedTicket.reservaciones?.fecha_reserva && (
                    <View style={styles.modalDetailRow}>
                      <Text
                        style={[
                          styles.modalDetailLabel,
                          { color: colors.subtitle },
                        ]}
                      >
                        Fecha de viaje
                      </Text>
                      <Text
                        style={[
                          styles.modalDetailValue,
                          { color: colors.text },
                        ]}
                      >
                        {formatDate(selectedTicket.reservaciones.fecha_reserva)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.modalDetailRow}>
                    <Text
                      style={[
                        styles.modalDetailLabel,
                        { color: colors.subtitle },
                      ]}
                    >
                      Emitido
                    </Text>
                    <Text
                      style={[styles.modalDetailValue, { color: colors.text }]}
                    >
                      {formatDate(selectedTicket.emitido_en)}
                    </Text>
                  </View>
                  {selectedTicket.asiento && (
                    <View style={styles.modalDetailRow}>
                      <Text
                        style={[
                          styles.modalDetailLabel,
                          { color: colors.subtitle },
                        ]}
                      >
                        Asiento
                      </Text>
                      <Text
                        style={[
                          styles.modalDetailValue,
                          { color: colors.text },
                        ]}
                      >
                        {selectedTicket.asiento}
                      </Text>
                    </View>
                  )}
                  {selectedTicket.reservaciones && (
                    <View style={styles.modalDetailRow}>
                      <Text
                        style={[
                          styles.modalDetailLabel,
                          { color: colors.subtitle },
                        ]}
                      >
                        Total
                      </Text>
                      <Text
                        style={[
                          styles.modalDetailValue,
                          { color: colors.text },
                        ]}
                      >
                        RD$
                        {Number(selectedTicket.reservaciones.total).toFixed(2)}
                      </Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={[
                    styles.modalCloseBtn,
                    { backgroundColor: colors.accent },
                  ]}
                  onPress={closeQR}
                >
                  <Text style={styles.modalCloseBtnText}>Cerrar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
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
    marginTop: 20,
    marginBottom: 12,
  },
  loader: {
    marginVertical: 24,
  },

  // Ticket card
  ticketCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  ticketHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  ticketIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(34,197,94,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  ticketHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  ticketRuta: {
    fontSize: 16,
    fontWeight: "600",
  },
  ticketCodigo: {
    fontSize: 13,
    marginTop: 2,
    fontFamily: "monospace",
  },
  estadoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  estadoText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // Route info
  rutaInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    paddingLeft: 4,
  },
  rutaPoint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rutaText: {
    fontSize: 13,
  },

  // Details
  ticketDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(148,163,184,0.15)",
    gap: 6,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailLabel: {
    fontSize: 13,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Empty state
  emptyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 40,
    alignItems: "center",
    gap: 8,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 4,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
  },

  // Card actions
  cardActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(148,163,184,0.15)",
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },

  // QR Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 18,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  qrWrap: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  qrImage: {
    width: 220,
    height: 220,
  },
  modalCode: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "monospace",
    letterSpacing: 1,
    marginBottom: 16,
  },
  modalDetails: {
    width: "100%",
    gap: 8,
    marginBottom: 20,
  },
  modalDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalDetailLabel: {
    fontSize: 13,
  },
  modalDetailValue: {
    fontSize: 13,
    fontWeight: "600",
  },
  modalCloseBtn: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  modalCloseBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },

  // Delete confirmation modal
  deleteModal: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  deleteIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(239,68,68,0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 10,
    textAlign: "center",
  },
  deleteModalMsg: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  deleteModalActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  deleteModalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteModalBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
});

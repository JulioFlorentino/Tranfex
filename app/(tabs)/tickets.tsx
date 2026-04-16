import { useCallback, useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/context/auth";
import { supabase } from "@/lib/supabase";

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
}: {
  ticket: TicketConDetalles;
  colors: typeof Colors.dark;
}) {
  const ruta = ticket.reservaciones?.rutas;
  const reserva = ticket.reservaciones;
  const config = estadoConfig[ticket.estado] ?? {
    label: ticket.estado,
    color: "#64748B",
  };

  return (
    <View
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
    </View>
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

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTickets();
    setRefreshing(false);
  }, [fetchTickets]);

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
                  />
                ))}
              </>
            )}
          </>
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
});

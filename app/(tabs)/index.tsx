import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/context/auth";

function Avatar({ initials, color }: { initials: string; color: string }) {
  return (
    <View style={[styles.avatar, { backgroundColor: color }]}>
      <Text style={styles.avatarText}>{initials}</Text>
    </View>
  );
}

function RouteCard({
  name,
  description,
  badge,
  badgeColor,
  colors,
}: {
  name: string;
  description: string;
  badge: string;
  badgeColor: string;
  colors: typeof Colors.dark;
}) {
  return (
    <View
      style={[
        styles.routeCard,
        { backgroundColor: colors.card, borderColor: colors.cardBorder },
      ]}
    >
      <View style={styles.routeInfo}>
        <Text style={[styles.routeName, { color: colors.text }]}>{name}</Text>
        <Text style={[styles.routeDescription, { color: colors.subtitle }]}>
          {description}
        </Text>
      </View>
      <View style={[styles.badge, { backgroundColor: badgeColor + "20" }]}>
        <Text style={[styles.badgeText, { color: badgeColor }]}>{badge}</Text>
      </View>
    </View>
  );
}

function QuickAccessCard({
  icon,
  label,
  colors,
}: {
  icon: React.ComponentProps<typeof IconSymbol>["name"];
  label: string;
  colors: typeof Colors.dark;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.quickCard,
        { backgroundColor: colors.card, borderColor: colors.cardBorder },
      ]}
      activeOpacity={0.7}
    >
      <IconSymbol name={icon} size={28} color={colors.accent} />
      <Text style={[styles.quickLabel, { color: colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  const { user } = useAuth();

  const fullName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuario";
  const initials = fullName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Buenos días" : hour < 18 ? "Buenas tardes" : "Buenas noches";

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Header */}
        <Text style={[styles.logo, { color: colors.accent }]}>Tranfex</Text>

        {/* Greeting */}
        <View
          style={[
            styles.greetingCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Avatar initials={initials} color="#7C3AED" />
          <View style={styles.greetingText}>
            <Text style={[styles.greeting, { color: colors.text }]}>
              {greeting}, {fullName.split(" ")[0]}
            </Text>
            <Text style={[styles.location, { color: colors.subtitle }]}>
              Santo Domingo, RD
            </Text>
          </View>
          <View
            style={[styles.onlineDot, { backgroundColor: colors.success }]}
          />
        </View>

        {/* Search */}
        <View
          style={[
            styles.searchBox,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <IconSymbol
            name="magnifyingglass"
            size={18}
            color={colors.subtitle}
          />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Buscar ruta o parada..."
            placeholderTextColor={colors.subtitle}
          />
        </View>

        {/* Rutas activas */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Rutas activas
        </Text>
        <RouteCard
          name="Ruta 3 — Av. 27 de Febrero"
          description="Próximo en 4 min · 2 paradas"
          badge="En ruta"
          badgeColor={colors.success}
          colors={colors}
        />
        <RouteCard
          name="Ruta 7 — Máximo Gómez"
          description="Próximo en 11 min · 5 paradas"
          badge="Demora"
          badgeColor={colors.warning}
          colors={colors}
        />

        {/* Acceso rápido */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Acceso rápido
        </Text>
        <View style={styles.quickRow}>
          <QuickAccessCard
            icon="ticket.fill"
            label="Mis tickets"
            colors={colors}
          />
          <QuickAccessCard icon="map.fill" label="Ver mapa" colors={colors} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  logo: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
  },
  greetingCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  greetingText: {
    flex: 1,
    marginLeft: 12,
  },
  greeting: {
    fontSize: 17,
    fontWeight: "600",
  },
  location: {
    fontSize: 13,
    marginTop: 2,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  routeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  routeInfo: {
    flex: 1,
  },
  routeName: {
    fontSize: 15,
    fontWeight: "600",
  },
  routeDescription: {
    fontSize: 13,
    marginTop: 3,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  quickRow: {
    flexDirection: "row",
    gap: 12,
  },
  quickCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  quickLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
});

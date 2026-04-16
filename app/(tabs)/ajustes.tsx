import { StyleSheet, View, Text, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/context/auth";

export default function AjustesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  const { user, signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert("Cerrar sesión", "¿Estás seguro que deseas salir?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Salir", style: "destructive", onPress: signOut },
    ]);
  };

  const initial = user?.user_metadata?.fullName
    ? (user.user_metadata.fullName as string).charAt(0).toUpperCase()
    : "?";

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Text style={[styles.title, { color: colors.text }]}>Ajustes</Text>

      {/* Profile card */}
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.cardBorder },
        ]}
      >
        <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { color: colors.text }]}>
            {(user?.user_metadata?.fullName as string) ?? "Usuario"}
          </Text>
          <Text style={[styles.profileEmail, { color: colors.subtitle }]}>
            {user?.email}
          </Text>
        </View>
      </View>

      {/* Sign out */}
      <TouchableOpacity
        style={[
          styles.card,
          styles.signOutCard,
          { backgroundColor: colors.card, borderColor: colors.cardBorder },
        ]}
        onPress={handleSignOut}
      >
        <IconSymbol name="arrow.right" size={20} color={colors.danger} />
        <Text style={[styles.signOutText, { color: colors.danger }]}>
          Cerrar sesión
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 20,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  profileInfo: {
    marginLeft: 14,
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: "600",
  },
  profileEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  signOutCard: {
    gap: 10,
    marginTop: 8,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: "600",
  },
});

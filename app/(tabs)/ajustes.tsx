import { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/context/auth";

export default function AjustesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  const { user, signOut } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSignOut = () => setShowConfirm(true);

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

      {/* Confirm sign out modal */}
      <Modal
        visible={showConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirm(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowConfirm(false)}
        >
          <Pressable
            style={[
              styles.modalBox,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
            onPress={() => {}}
          >
            <View style={styles.signOutIconWrap}>
              <IconSymbol name="arrow.right" size={28} color={colors.danger} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Cerrar sesión
            </Text>
            <Text style={[styles.modalMsg, { color: colors.subtitle }]}>
              ¿Estás seguro que deseas salir?
            </Text>
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
                onPress={() => setShowConfirm(false)}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.danger }]}
                onPress={() => {
                  setShowConfirm(false);
                  signOut();
                }}
              >
                <Text style={[styles.modalBtnText, { color: "#fff" }]}>
                  Salir
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalBox: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
  },
  signOutIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(239,68,68,0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: "700",
    marginBottom: 8,
  },
  modalMsg: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 22,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  modalBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
});

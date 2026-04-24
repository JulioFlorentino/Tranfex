import { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/context/auth";
import { supabase } from "@/lib/supabase";

interface MetodoPago {
  id_metodo: number;
  tipo: string;
  ultimos4: string | null;
  marca: string | null;
  activo: boolean;
}

const tipoLabel: Record<string, string> = {
  tarjeta_credito: "Tarjeta de crédito",
  tarjeta_debito: "Tarjeta de débito",
  prepago: "Tarjeta prepago",
};

const TIPOS = Object.keys(tipoLabel) as (keyof typeof tipoLabel)[];
const MARCAS = ["visa", "mastercard", "amex", "discover", "otra"];
const marcaLabel: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  discover: "Discover",
  otra: "Otra",
};

export default function AjustesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  const { user, signOut } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
  const [loadingMetodos, setLoadingMetodos] = useState(true);
  const [showAddMetodo, setShowAddMetodo] = useState(false);
  const [savingMetodo, setSavingMetodo] = useState(false);
  const [formTipo, setFormTipo] = useState(TIPOS[0]);
  const [formMarca, setFormMarca] = useState(MARCAS[0]);
  const [formUltimos4, setFormUltimos4] = useState("");

  const fetchMetodos = useCallback(async () => {
    if (!user?.email) return;
    setLoadingMetodos(true);

    // metodos_pago.usuario_id es INT → necesitamos el id_usuario de la tabla usuarios
    const { data: usuarioRow } = await supabase
      .from("usuarios")
      .select("id_usuario")
      .eq("email", user.email)
      .maybeSingle<{ id_usuario: number }>();

    if (!usuarioRow) {
      setMetodosPago([]);
      setLoadingMetodos(false);
      return;
    }

    const { data } = await supabase
      .from("metodos_pago")
      .select("id_metodo, tipo, ultimos4, marca, activo")
      .eq("usuario_id", usuarioRow.id_usuario)
      .eq("activo", true)
      .order("creado_en", { ascending: false });
    setMetodosPago((data as MetodoPago[]) ?? []);
    setLoadingMetodos(false);
  }, [user]);

  useEffect(() => {
    fetchMetodos();
  }, [fetchMetodos]);

  const openAddMetodo = () => {
    setFormTipo(TIPOS[0]);
    setFormMarca(MARCAS[0]);
    setFormUltimos4("");
    setShowAddMetodo(true);
  };

  const saveMetodo = async () => {
    if (formUltimos4.length !== 4 || !/^\d{4}$/.test(formUltimos4)) {
      Alert.alert("Error", "Ingresa exactamente 4 dígitos numéricos.");
      return;
    }
    if (!user?.email) return;
    setSavingMetodo(true);

    const { data: usuarioRow } = await supabase
      .from("usuarios")
      .select("id_usuario")
      .eq("email", user.email)
      .maybeSingle<{ id_usuario: number }>();

    if (!usuarioRow) {
      setSavingMetodo(false);
      Alert.alert("Error", "No se encontró tu perfil en la base de datos.");
      return;
    }

    const { error } = await supabase.from("metodos_pago").insert({
      usuario_id: usuarioRow.id_usuario,
      tipo: formTipo,
      marca: formMarca,
      ultimos4: formUltimos4,
      activo: true,
    });

    setSavingMetodo(false);
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setShowAddMetodo(false);
      fetchMetodos();
    }
  };

  const handleSignOut = () => setShowConfirm(true);

  const initial = user?.user_metadata?.fullName
    ? (user.user_metadata.fullName as string).charAt(0).toUpperCase()
    : "?";

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
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

        {/* Métodos de pago */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionLabel, { color: colors.subtitle }]}>
            Métodos de pago
          </Text>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.accent }]}
            onPress={openAddMetodo}
          >
            <IconSymbol name="plus.circle" size={15} color="#fff" />
            <Text style={styles.addBtnText}>Agregar</Text>
          </TouchableOpacity>
        </View>
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          {loadingMetodos ? (
            <ActivityIndicator
              size="small"
              color={colors.accent}
              style={{ paddingVertical: 16 }}
            />
          ) : metodosPago.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol
                name="creditcard.fill"
                size={36}
                color={colors.subtitle}
              />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                Sin métodos de pago
              </Text>
              <Text style={[styles.emptyMsg, { color: colors.subtitle }]}>
                Aún no tienes un método de pago registrado. Agrega uno para
                poder realizar reservas.
              </Text>
            </View>
          ) : (
            metodosPago.map((m, idx) => (
              <View key={m.id_metodo}>
                {idx > 0 && (
                  <View
                    style={[
                      styles.divider,
                      { backgroundColor: colors.cardBorder },
                    ]}
                  />
                )}
                <View style={styles.metodoRow}>
                  <View
                    style={[
                      styles.metodoIcon,
                      { backgroundColor: colors.accent + "18" },
                    ]}
                  >
                    <IconSymbol
                      name="creditcard.fill"
                      size={20}
                      color={colors.accent}
                    />
                  </View>
                  <View style={styles.metodoInfo}>
                    <Text style={[styles.metodoTipo, { color: colors.text }]}>
                      {tipoLabel[m.tipo] ?? m.tipo}
                    </Text>
                    <Text
                      style={[styles.metodoDetalle, { color: colors.subtitle }]}
                    >
                      {m.marca
                        ? m.marca.charAt(0).toUpperCase() + m.marca.slice(1)
                        : ""}
                      {m.marca && m.ultimos4 ? " · " : ""}
                      {m.ultimos4 ? `•••• ${m.ultimos4}` : ""}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
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
      </ScrollView>

      {/* Modal agregar método de pago */}
      <Modal
        visible={showAddMetodo}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddMetodo(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowAddMetodo(false)}
          >
            <Pressable
              style={[
                styles.modalBox,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                },
              ]}
              onPress={() => {}}
            >
              <View
                style={[
                  styles.metodoIcon,
                  { backgroundColor: colors.accent + "20", marginBottom: 12 },
                ]}
              >
                <IconSymbol
                  name="creditcard.fill"
                  size={22}
                  color={colors.accent}
                />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Agregar método de pago
              </Text>

              {/* Tipo */}
              <Text style={[styles.formLabel, { color: colors.subtitle }]}>
                Tipo de tarjeta
              </Text>
              <View style={styles.chipRow}>
                {TIPOS.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.chip,
                      {
                        backgroundColor:
                          formTipo === t ? colors.accent : colors.background,
                        borderColor:
                          formTipo === t ? colors.accent : colors.cardBorder,
                      },
                    ]}
                    onPress={() => setFormTipo(t)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: formTipo === t ? "#fff" : colors.subtitle },
                      ]}
                    >
                      {tipoLabel[t]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Marca */}
              <Text style={[styles.formLabel, { color: colors.subtitle }]}>
                Marca
              </Text>
              <View style={styles.chipRow}>
                {MARCAS.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.chip,
                      {
                        backgroundColor:
                          formMarca === m ? colors.accent : colors.background,
                        borderColor:
                          formMarca === m ? colors.accent : colors.cardBorder,
                      },
                    ]}
                    onPress={() => setFormMarca(m)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: formMarca === m ? "#fff" : colors.subtitle },
                      ]}
                    >
                      {marcaLabel[m]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Últimos 4 dígitos */}
              <Text style={[styles.formLabel, { color: colors.subtitle }]}>
                Últimos 4 dígitos
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.cardBorder,
                    color: colors.text,
                  },
                ]}
                placeholder="0000"
                placeholderTextColor={colors.subtitle}
                keyboardType="number-pad"
                maxLength={4}
                value={formUltimos4}
                onChangeText={(v) => setFormUltimos4(v.replace(/\D/g, ""))}
              />

              <View style={[styles.modalActions, { marginTop: 20 }]}>
                <TouchableOpacity
                  style={[
                    styles.modalBtn,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.cardBorder,
                      borderWidth: 1,
                    },
                  ]}
                  onPress={() => setShowAddMetodo(false)}
                  disabled={savingMetodo}
                >
                  <Text style={[styles.modalBtnText, { color: colors.text }]}>
                    Cancelar
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.accent }]}
                  onPress={saveMetodo}
                  disabled={savingMetodo}
                >
                  {savingMetodo ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={[styles.modalBtnText, { color: "#fff" }]}>
                      Guardar
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

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
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 4,
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 16,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 4,
  },
  emptyMsg: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
  metodoRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  metodoIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  metodoInfo: {
    flex: 1,
  },
  metodoTipo: {
    fontSize: 15,
    fontWeight: "600",
  },
  metodoDetalle: {
    fontSize: 13,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginHorizontal: 14,
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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    marginTop: 4,
    marginHorizontal: 4,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  addBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  formLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    alignSelf: "flex-start",
    marginBottom: 8,
    marginTop: 14,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    width: "100%",
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  formInput: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 22,
    letterSpacing: 8,
    textAlign: "center",
    fontWeight: "700",
  },
});

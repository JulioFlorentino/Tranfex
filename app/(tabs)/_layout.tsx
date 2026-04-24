import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { RutasProvider } from "@/context/rutas";

// ── Web Phone Shell ──────────────────────────────────────
function PhoneShell({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== "web") return <>{children}</>;

  return (
    <div style={s.page}>
      {/* Ambient blobs */}
      <div style={s.blob1} />
      <div style={s.blob2} />

      {/* Top branding */}
      <div style={s.brand}>
        <span style={s.brandMark}>◈</span>
        <span style={s.brandName}>Tranfex</span>
        <span style={s.brandTag}>Transporte público RD</span>
      </div>

      {/* Phone frame */}
      <div style={s.phoneOuter}>
        {/* Notch */}
        <div style={s.notch}>
          <div style={s.notchCamera} />
        </div>

        {/* Side buttons */}
        <div style={{ ...s.sideBtn, top: 100, left: -4 }} />
        <div style={{ ...s.sideBtn, top: 148, left: -4 }} />
        <div style={{ ...s.sideBtnPower, top: 120, right: -4 }} />

        {/* Screen — children fill this */}
        <div style={s.screen}>{children}</div>

        {/* Home indicator */}
        <div style={s.homeIndicator} />
      </div>

      <p style={s.hint}>Disponible en iOS y Android</p>
    </div>
  );
}

// ── Layout ───────────────────────────────────────────────
export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];

  return (
    <RutasProvider>
      <PhoneShell>
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: colors.tint,
            tabBarInactiveTintColor: colors.tabIconDefault,
            tabBarStyle: {
              backgroundColor: colors.card,
              borderTopColor: colors.cardBorder,
              height: 65,
              paddingBottom: 10,
              paddingTop: 6,
            },
            tabBarLabelStyle: {
              fontSize: 11,
              marginTop: -2,
            },
            tabBarIconStyle: {
              marginBottom: -2,
            },
            headerShown: false,
            tabBarButton: HapticTab,
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: "Inicio",
              tabBarIcon: ({ color }) => (
                <IconSymbol size={24} name="house.fill" color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="reservar"
            options={{
              title: "Reservar",
              tabBarIcon: ({ color }) => (
                <IconSymbol size={24} name="calendar" color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="tickets"
            options={{
              title: "Tickets",
              tabBarIcon: ({ color }) => (
                <IconSymbol size={24} name="ticket.fill" color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="mapa"
            options={{
              title: "Mapa",
              tabBarIcon: ({ color }) => (
                <IconSymbol size={24} name="map.fill" color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="ajustes"
            options={{
              title: "Ajustes",
              tabBarIcon: ({ color }) => (
                <IconSymbol size={24} name="gearshape.fill" color={color} />
              ),
            }}
          />
          <Tabs.Screen name="explore" options={{ href: null }} />
        </Tabs>
      </PhoneShell>
    </RutasProvider>
  );
}

// ── Web-only styles ──────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #0f0c29 0%, #1a1040 50%, #0d1b2a 100%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px",
    position: "relative",
    overflow: "hidden",
  },
  blob1: {
    position: "absolute",
    width: 500,
    height: 500,
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(124,58,237,0.25) 0%, transparent 70%)",
    top: -100,
    left: -150,
    pointerEvents: "none",
  },
  blob2: {
    position: "absolute",
    width: 400,
    height: 400,
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%)",
    bottom: -80,
    right: -100,
    pointerEvents: "none",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 32,
    zIndex: 1,
  },
  brandMark: {
    fontSize: 26,
    color: "#7C3AED",
    lineHeight: "1",
  },
  brandName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: "-0.5px",
  },
  brandTag: {
    fontSize: 11,
    color: "rgba(255,255,255,0.4)",
    borderLeft: "1px solid rgba(255,255,255,0.2)",
    paddingLeft: 10,
    marginLeft: 2,
    letterSpacing: "0.5px",
    textTransform: "uppercase",
  },
  phoneOuter: {
    width: 375,
    height: 780,
    background: "linear-gradient(145deg, #2a2a3e, #1a1a2e)",
    borderRadius: 50,
    padding: "12px",
    boxShadow: [
      "0 0 0 1px rgba(255,255,255,0.08)",
      "0 40px 80px rgba(0,0,0,0.6)",
      "0 0 60px rgba(124,58,237,0.2)",
      "inset 0 1px 0 rgba(255,255,255,0.12)",
    ].join(", "),
    position: "relative",
    zIndex: 1,
    display: "flex",
    flexDirection: "column",
  },
  notch: {
    position: "absolute",
    top: 12,
    left: "50%",
    transform: "translateX(-50%)",
    width: 120,
    height: 30,
    background: "#0f0f1a",
    borderRadius: "0 0 20px 20px",
    zIndex: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  notchCamera: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "#1e1e30",
    border: "1px solid rgba(255,255,255,0.05)",
    marginTop: 6,
  },
  sideBtn: {
    position: "absolute",
    width: 4,
    height: 40,
    background: "linear-gradient(180deg, #3a3a50, #2a2a3e)",
    borderRadius: "2px 0 0 2px",
  },
  sideBtnPower: {
    position: "absolute",
    width: 4,
    height: 60,
    background: "linear-gradient(180deg, #3a3a50, #2a2a3e)",
    borderRadius: "0 2px 2px 0",
  },
  screen: {
    flex: 1,
    borderRadius: 40,
    overflow: "hidden",
    marginTop: 8,
    display: "flex",
    flexDirection: "column",
    // Ensures RN web fills the screen area correctly
    position: "relative",
  },
  homeIndicator: {
    width: 120,
    height: 4,
    background: "rgba(255,255,255,0.25)",
    borderRadius: 2,
    margin: "8px auto 4px",
  },
  hint: {
    marginTop: 24,
    fontSize: 12,
    color: "rgba(255,255,255,0.3)",
    letterSpacing: "0.5px",
    zIndex: 1,
  },
};

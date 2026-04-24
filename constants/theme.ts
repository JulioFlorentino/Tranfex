/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from "react-native";

const tintColorLight = "#1A4FA3";
const tintColorDark = "#3B82F6";

export const Colors = {
  light: {
    text: "#0D1B3E",
    background: "#E8EDF8",
    tint: tintColorLight,
    icon: "#3B5280",
    tabIconDefault: "#6B7FA8",
    tabIconSelected: tintColorLight,
    card: "#F0F4FF",
    cardBorder: "#C5D0E8",
    subtitle: "#4A6490",
    accent: "#1A4FA3",
    success: "#16A34A",
    warning: "#D97706",
    danger: "#DC2626",
  },
  dark: {
    text: "#E2E8F8",
    background: "#060C1A",
    tint: tintColorDark,
    icon: "#7A90C0",
    tabIconDefault: "#3D5080",
    tabIconSelected: tintColorDark,
    card: "#0C1428",
    cardBorder: "#152040",
    subtitle: "#7A90B8",
    accent: "#3B82F6",
    success: "#22C55E",
    warning: "#F59E0B",
    danger: "#EF4444",
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

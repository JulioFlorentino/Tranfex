/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from "react-native";

const tintColorLight = "#1E6FD9";
const tintColorDark = "#4A9EFF";

export const Colors = {
  light: {
    text: "#11181C",
    background: "#F0F4FA",
    tint: tintColorLight,
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
    card: "#FFFFFF",
    cardBorder: "#E2E8F0",
    subtitle: "#64748B",
    accent: "#1E6FD9",
    success: "#22C55E",
    warning: "#F59E0B",
    danger: "#EF4444",
  },
  dark: {
    text: "#ECEDEE",
    background: "#0B1120",
    tint: tintColorDark,
    icon: "#9BA1A6",
    tabIconDefault: "#5A6272",
    tabIconSelected: tintColorDark,
    card: "#131C2E",
    cardBorder: "#1E293B",
    subtitle: "#94A3B8",
    accent: "#4A9EFF",
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

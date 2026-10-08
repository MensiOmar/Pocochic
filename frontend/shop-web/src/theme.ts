import { ref } from "vue";
import backgroundDark from "@assets/backgrounddark.png";
import backgroundLight from "@assets/backgroundlight.png";
import coin from "@assets/coin.png";
import logoDark from "@assets/logodark.png";
import logoLight from "@assets/logolight.png";

export type ThemeMode = "light" | "dark";

export const brandAssets: Record<ThemeMode, { logo: string; background: string }> = {
  light: { logo: logoLight, background: backgroundLight },
  dark: { logo: logoDark, background: backgroundDark },
};

export const coinSrc = coin;

const THEME_KEY = "pocochic.theme.v1";

function readTheme(): ThemeMode {
  try {
    const saved = globalThis.localStorage?.getItem(THEME_KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    /* keep light */
  }
  return "light";
}

/** Player navbar toggles this. Light is the default. */
export const themeMode = ref<ThemeMode>(readTheme());

export function applyTheme(mode: ThemeMode = themeMode.value) {
  themeMode.value = mode;
  document.documentElement.dataset.theme = mode;
  try {
    globalThis.localStorage?.setItem(THEME_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function toggleTheme() {
  applyTheme(themeMode.value === "dark" ? "light" : "dark");
}

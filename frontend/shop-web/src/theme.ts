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

/** Light is the only mode painted today. The dark pair is wired for the switcher. */
export const themeMode: ThemeMode = "light";

export function applyTheme(mode: ThemeMode = themeMode) {
  document.documentElement.dataset.theme = mode;
}

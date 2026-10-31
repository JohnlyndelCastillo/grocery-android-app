/** Capacitor haptics are optional at runtime: the browser build remains fully usable. */
export async function lightTap(): Promise<void> {
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    // Native bridge unavailable (e.g. ordinary browser) or haptics unsupported.
  }
}

export async function successTap(): Promise<void> {
  try {
    const { Haptics, NotificationType } = await import("@capacitor/haptics");
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    // Keep trip completion independent of device vibration support.
  }
}

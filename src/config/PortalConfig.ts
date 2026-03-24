export const PORTAL_CONFIG = {
  width: 4.0,
  height: 6.0,
  colorA: 0x00ff00,
  colorB: 0x0088ff,
};

export type PortalConfig = typeof PORTAL_CONFIG;
export const INITIAL_PORTAL_CONFIG: PortalConfig = JSON.parse(JSON.stringify(PORTAL_CONFIG));

export function resetPortalConfig(): void {
  Object.assign(PORTAL_CONFIG, JSON.parse(JSON.stringify(INITIAL_PORTAL_CONFIG)));
}

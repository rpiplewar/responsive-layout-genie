export interface DeviceConfig {
  name: string;
  width: number;
  height: number;
}

export const devices: Record<string, DeviceConfig> = {
  'iPhone SE': {
    name: 'iPhone SE',
    width: 375,
    height: 667,
  },
  'iPhone 14': {
    name: 'iPhone 14',
    width: 390,
    height: 844,
  },
};
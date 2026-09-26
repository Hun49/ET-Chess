import etChessPreset from '@et-chess/config/tailwind.preset';
import nativewindPreset from 'nativewind/preset';
import type { Config } from 'tailwindcss';

const config: Config = {
  presets: [nativewindPreset, etChessPreset],
  content: ['./app/**/*.{js,ts,jsx,tsx}', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;

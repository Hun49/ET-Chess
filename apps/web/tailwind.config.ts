import etChessPreset from '@et-chess/config/tailwind.preset';
import type { Config } from 'tailwindcss';

const config: Config = {
  presets: [etChessPreset],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;

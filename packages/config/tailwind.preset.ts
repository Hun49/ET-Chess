export const etChessTailwindPreset = {
  theme: {
    extend: {
      colors: {
        board: {
          light: '#f0d9b5',
          dark: '#b58863',
          highlight: 'rgba(255, 255, 0, 0.4)',
          selected: 'rgba(20, 85, 30, 0.5)',
        },
        surface: {
          base: '#121212',
          card: '#1e1e1e',
          accent: '#2a2a2a',
          border: '#333333',
        },
      },
    },
  },
  plugins: [],
};

export default etChessTailwindPreset;

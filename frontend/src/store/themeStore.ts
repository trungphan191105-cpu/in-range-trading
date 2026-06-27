import { create } from 'zustand';

export type MindTheme = 'void' | 'mono' | 'ocean';

interface ThemeState {
  mindTheme: MindTheme;
  setMindTheme: (t: MindTheme) => void;
}

// Persist in localStorage so Dashboard reads MindMap's theme
const saved = (localStorage.getItem('mind-theme') as MindTheme) || 'void';

export const useThemeStore = create<ThemeState>(set => ({
  mindTheme: saved,
  setMindTheme: (t) => {
    localStorage.setItem('mind-theme', t);
    set({ mindTheme: t });
  },
}));

// Theme-specific chart colors
export const CHART_COLORS: Record<MindTheme, { profit: string; loss: string; profitDim: string; lossDim: string }> = {
  void:  { profit: '#4ebe96', loss: '#c8746a', profitDim: 'rgba(78,190,150,0.18)',  lossDim: 'rgba(200,116,106,0.18)'  },
  mono:  { profit: '#e0e0e0', loss: '#888888', profitDim: 'rgba(220,220,220,0.18)', lossDim: 'rgba(120,120,120,0.18)' },
  ocean: { profit: '#3b9eff', loss: '#ff6b6b', profitDim: 'rgba(59,158,255,0.18)',  lossDim: 'rgba(255,107,107,0.18)'  },
};

// KPI App — Configuration Supabase
// Clé anon uniquement — ne jamais exposer la service_role

export const SUPABASE_URL  = 'https://iomzcbmyzjwtswrkvxqk.supabase.co';
export const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvbXpjYm15emp3dHN3cmt2eHFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjM4MTAsImV4cCI6MjA4NTc5OTgxMH0.ap4Fk6pxGZgVSAdb6krWbv8CM-Dzw0ZQRcsKPKScSVw';

export const MODALITES = {
  presentiel:        { label: 'Présentiel',          icon: 'users',        color: '#6366f1' },
  distanciel_sync:   { label: 'Distanciel sync.',    icon: 'video',        color: '#0ea5e9' },
  distanciel_async:  { label: 'Distanciel async.',   icon: 'clock',        color: '#8b5cf6' },
  elearning:         { label: 'E-learning',           icon: 'monitor',      color: '#10b981' },
  tutorat:           { label: 'Tutorat',              icon: 'user-check',   color: '#f59e0b' },
};

export const NIVEAUX_COLORS = {
  eillettrisme:  '#94a3b8',
  neophyte:      '#60a5fa',
  debutant:      '#34d399',
  intermediaire: '#a78bfa',
  avance:        '#f59e0b',
  expert:        '#ef4444',
};

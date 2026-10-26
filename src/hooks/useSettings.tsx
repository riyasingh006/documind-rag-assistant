import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export interface RetrievalSettings {
  chunkSize: number;
  chunkOverlap: number;
  topK: number;
  threshold: number;
}

export const DEFAULT_SETTINGS: RetrievalSettings = {
  chunkSize: 800,
  chunkOverlap: 120,
  topK: 5,
  threshold: 0.2,
};

const STORAGE_KEY = "documind:settings:v1";

function clampInteger(value: unknown, fallback: number, min: number, max: number) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, Math.round(numeric)));
}

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

export function sanitizeSettings(
  candidate: Partial<RetrievalSettings> | null | undefined,
): RetrievalSettings {
  const chunkSize = clampInteger(
    candidate?.chunkSize,
    DEFAULT_SETTINGS.chunkSize,
    100,
    2000,
  );
  const maxOverlap = Math.floor(chunkSize / 2);
  const chunkOverlap = clampInteger(
    candidate?.chunkOverlap,
    Math.min(DEFAULT_SETTINGS.chunkOverlap, maxOverlap),
    0,
    maxOverlap,
  );
  return {
    chunkSize,
    chunkOverlap,
    topK: clampInteger(candidate?.topK, DEFAULT_SETTINGS.topK, 1, 10),
    threshold: clampNumber(
      candidate?.threshold,
      DEFAULT_SETTINGS.threshold,
      0,
      1,
    ),
  };
}

function loadSettings(): RetrievalSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return sanitizeSettings(JSON.parse(raw) as Partial<RetrievalSettings>);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

interface SettingsContextValue {
  settings: RetrievalSettings;
  saveSettings: (next: RetrievalSettings) => RetrievalSettings;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<RetrievalSettings>(loadSettings);

  const saveSettings = useCallback((next: RetrievalSettings) => {
    const sanitized = sanitizeSettings(next);
    setSettings(sanitized);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    } catch {
      // localStorage may be unavailable in private browsing; keep in memory.
    }
    return sanitized;
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore storage failures
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore storage failures
    }
  }, [settings]);

  const value = useMemo(
    () => ({ settings, saveSettings, resetSettings }),
    [settings, saveSettings, resetSettings],
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return context;
}

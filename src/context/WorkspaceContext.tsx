import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { api, ApiError } from "@/lib/api";
import type { DocumentRecord, HealthResponse } from "@/lib/types";

interface WorkspaceContextValue {
  health: HealthResponse | null;
  healthError: string | null;
  healthLoading: boolean;
  documents: DocumentRecord[];
  documentsError: string | null;
  documentsLoading: boolean;
  refreshHealth: (silent?: boolean) => Promise<void>;
  refreshDocuments: (silent?: boolean) => Promise<void>;
  registerDocument: (document: DocumentRecord) => void;
  deleteDocument: (id: string) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred.";
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [documentsLoading, setDocumentsLoading] = useState(true);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refreshHealth = useCallback(async (silent = false) => {
    if (!silent) setHealthLoading(true);
    try {
      const result = await api.getHealth();
      if (!mounted.current) return;
      setHealth(result);
      setHealthError(null);
    } catch (error) {
      if (!mounted.current) return;
      setHealth(null);
      setHealthError(errorMessage(error));
    } finally {
      if (mounted.current) setHealthLoading(false);
    }
  }, []);

  const refreshDocuments = useCallback(async (silent = false) => {
    if (!silent) setDocumentsLoading(true);
    try {
      const result = await api.listDocuments();
      if (!mounted.current) return;
      setDocuments(result);
      setDocumentsError(null);
    } catch (error) {
      if (!mounted.current) return;
      setDocumentsError(errorMessage(error));
    } finally {
      if (mounted.current) setDocumentsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshHealth();
    void refreshDocuments();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshHealth(true);
      }
    }, 25_000);
    return () => window.clearInterval(interval);
  }, [refreshHealth, refreshDocuments]);

  const registerDocument = useCallback(
    (document: DocumentRecord) => {
      setDocuments((current) => [
        document,
        ...current.filter((item) => item.id !== document.id),
      ]);
      setDocumentsError(null);
      void refreshHealth(true);
    },
    [refreshHealth],
  );

  const deleteDocument = useCallback(
    async (id: string) => {
      await api.deleteDocument(id);
      setDocuments((current) => current.filter((item) => item.id !== id));
      void refreshHealth(true);
    },
    [refreshHealth],
  );

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      health,
      healthError,
      healthLoading,
      documents,
      documentsError,
      documentsLoading,
      refreshHealth,
      refreshDocuments,
      registerDocument,
      deleteDocument,
    }),
    [
      health,
      healthError,
      healthLoading,
      documents,
      documentsError,
      documentsLoading,
      refreshHealth,
      refreshDocuments,
      registerDocument,
      deleteDocument,
    ],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return context;
}

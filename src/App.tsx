import { lazy, Suspense, useEffect, type ReactNode } from "react";
import {
  BrowserRouter,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { AppShell } from "@/components/workspace/AppShell";
import { SettingsProvider } from "@/hooks/useSettings";

const DocumentsPage = lazy(() =>
  import("@/pages/DocumentsPage").then((module) => ({
    default: module.DocumentsPage,
  })),
);
const LandingPage = lazy(() =>
  import("@/pages/LandingPage").then((module) => ({
    default: module.LandingPage,
  })),
);
const NotFoundPage = lazy(() =>
  import("@/pages/NotFoundPage").then((module) => ({
    default: module.NotFoundPage,
  })),
);
const SettingsPage = lazy(() =>
  import("@/pages/SettingsPage").then((module) => ({
    default: module.SettingsPage,
  })),
);
const WorkspacePage = lazy(() =>
  import("@/pages/WorkspacePage").then((module) => ({
    default: module.WorkspacePage,
  })),
);

function RouteContent({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div
          className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground"
          role="status"
        >
          Loading DocuMind…
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

function ScrollManager() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const id = hash.replace(/^#/, "");
      let attempts = 0;
      const tryScroll = () => {
        const element = document.getElementById(id);
        if (element) {
          const reduce = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
          ).matches;
          element.scrollIntoView({
            behavior: reduce ? "auto" : "smooth",
            block: "start",
          });
          return;
        }
        if (attempts < 20) {
          attempts += 1;
          window.setTimeout(tryScroll, 50);
        }
      };
      window.setTimeout(tryScroll, 30);
      return;
    }

    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname, hash]);

  return null;
}

export default function App() {
  return (
    <SettingsProvider>
      <BrowserRouter>
        <ScrollManager />
        <Routes>
          <Route
            path="/"
            element={
              <RouteContent>
                <LandingPage />
              </RouteContent>
            }
          />
          <Route element={<AppShell />}>
            <Route
              path="/workspace"
              element={
                <RouteContent>
                  <WorkspacePage />
                </RouteContent>
              }
            />
            <Route
              path="/workspace/documents"
              element={
                <RouteContent>
                  <DocumentsPage />
                </RouteContent>
              }
            />
            <Route
              path="/settings"
              element={
                <RouteContent>
                  <SettingsPage />
                </RouteContent>
              }
            />
          </Route>
          <Route
            path="*"
            element={
              <RouteContent>
                <NotFoundPage />
              </RouteContent>
            }
          />
        </Routes>
      </BrowserRouter>
    </SettingsProvider>
  );
}

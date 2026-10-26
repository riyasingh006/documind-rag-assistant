import { useEffect } from "react";
import {
  BrowserRouter,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { AppShell } from "@/components/workspace/AppShell";
import { SettingsProvider } from "@/hooks/useSettings";
import { DocumentsPage } from "@/pages/DocumentsPage";
import { LandingPage } from "@/pages/LandingPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { WorkspacePage } from "@/pages/WorkspacePage";

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
          <Route path="/" element={<LandingPage />} />
          <Route element={<AppShell />}>
            <Route path="/workspace" element={<WorkspacePage />} />
            <Route
              path="/workspace/documents"
              element={<DocumentsPage />}
            />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </SettingsProvider>
  );
}

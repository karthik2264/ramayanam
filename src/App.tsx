import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Shell } from "./components/Shell";
import { CreditsPage } from "./pages/CreditsPage";
import { HomePage } from "./pages/HomePage";
import { KandaPage } from "./pages/KandaPage";
import { SargaPage } from "./pages/SargaPage";
import { SavedPage } from "./pages/SavedPage";
import { SearchPage } from "./pages/SearchPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<HomePage />} />
          <Route path="kanda/:kandaId" element={<KandaPage />} />
          <Route path="kanda/:kandaId/sarga/:sargaNumber" element={<SargaPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="saved" element={<SavedPage />} />
          <Route path="credits" element={<CreditsPage />} />
          <Route path="*" element={<p className="page">That page is not on this desk.</p>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

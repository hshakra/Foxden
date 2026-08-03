import { Routes, Route, BrowserRouter } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { RangeProvider } from "./lib/RangeContext";
import LiveFeed from "./views/LiveFeed";
import TagExplorer from "./views/TagExplorer";
import { FamilyProfile } from "./views/FamilyProfile";

function App() {
  return (
    <BrowserRouter>
      <RangeProvider>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<LiveFeed />} />
            <Route path="/family/:name" element={<FamilyProfile />} />
            <Route path="/tag/:name" element={<TagExplorer />} />
          </Route>
        </Routes>
      </RangeProvider>
    </BrowserRouter>
  );
}

export default App;

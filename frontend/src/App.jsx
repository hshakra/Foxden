import { useState } from "react";
import { Routes, Route, BrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { RangeProvider } from "./lib/RangeProvider";
import LiveFeed from "./views/LiveFeed";
import TagExplorer from "./views/TagExplorer";
import FamilyProfile from "./views/FamilyProfile";
import FamiliesIndex from "./views/FamiliesIndex";
import IOCBrowse from "./views/IOCBrowse";
import TagsIndex from "./views/TagsIndex";
import About from "./views/About";
import NotFound from "./views/NotFound";

// the very first visit lands on the story, every visit after on the data
function Home() {
  const [firstVisit] = useState(
    () => !localStorage.getItem("foxden-welcomed"),
  );
  if (firstVisit) return <Navigate to="/about" replace />;
  return <LiveFeed />;
}

function App() {
  return (
    <BrowserRouter>
      <RangeProvider>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Home />} />
            <Route path="/iocs" element={<IOCBrowse />} />
            <Route path="/families" element={<FamiliesIndex />} />
            <Route path="/tags" element={<TagsIndex />} />
            <Route path="/family/:name" element={<FamilyProfile />} />
            <Route path="/tag/:name" element={<TagExplorer />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </RangeProvider>
    </BrowserRouter>
  );
}

export default App;

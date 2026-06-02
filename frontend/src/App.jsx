import { Routes, Route, BrowserRouter } from "react-router-dom";
import LiveFeed from "./views/livefeed";
import TagExplorer from "./views/tagexplorer";
import { FamilyCard } from "./views/FamilyCard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LiveFeed />} />
        <Route path="/family/:name" element={<FamilyCard />} />
        <Route path="/tag/:name" element={<TagExplorer />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

import { useEffect } from "react";

// the browser tab names the page, so history, bookmarks and a wall of
// open tabs stay tellable apart
export default function useTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Foxden` : "Foxden";
    return () => {
      document.title = "Foxden";
    };
  }, [title]);
}

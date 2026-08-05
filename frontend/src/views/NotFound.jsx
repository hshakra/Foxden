import { Link } from "react-router-dom";
import { ArrowRight, Compass } from "lucide-react";
import useTitle from "../hooks/useTitle";

// unknown urls land here instead of an empty shell
export default function NotFound() {
  useTitle("Not found");
  return (
    <div className="reveal flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <Compass size={24} className="text-ink-low" />
      <p className="font-mono text-title font-semibold tracking-tight">404</p>
      <p className="max-w-[44ch] text-body leading-relaxed text-ink-mid">
        This page does not exist. Nothing at this address has ever been
        reported to the feed.
      </p>
      <Link
        to="/"
        className="mt-2 flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-body font-medium text-white transition-colors duration-150 hover:bg-accent/85"
      >
        Back to the overview <ArrowRight size={13} />
      </Link>
    </div>
  );
}

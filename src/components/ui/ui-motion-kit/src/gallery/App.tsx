import { useEffect } from "react";
import { getPiece } from "@/kit/registry";
import { ExportPage } from "./ExportPage";
import { Header } from "./Header";
import { Home } from "./Home";
import { KitPage } from "./KitPage";
import { TemplatesPage } from "./TemplatesPage";
import { Link, matchRoute, usePathname } from "./router";

function NotFound() {
  return (
    <main className="mx-auto w-full max-w-[1100px] px-5 pt-16 sm:px-8">
      <h1 className="m-0 text-[28px] font-semibold">Pattern not found</h1>
      <p className="mt-3 text-[16px] text-muted">
        <Link href="/" className="text-ink underline underline-offset-4">
          Back to all patterns
        </Link>
      </p>
    </main>
  );
}

export function App() {
  const route = matchRoute(usePathname());
  const piece = route.name === "kit" || route.name === "export" ? getPiece(route.slug) : undefined;

  useEffect(() => {
    document.title = piece ? `${piece.meta.name} · UI Motion Kit` : route.name === "templates" ? "Page templates · UI Motion Kit" : "UI Motion Kit";
  }, [piece, route.name]);

  if (route.name === "export") return piece ? <ExportPage piece={piece} /> : <NotFound />;
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-control focus:bg-raised focus:px-4 focus:py-2 focus:text-ink">
        Skip to content
      </a>
      <Header />
      <div id="main">{route.name === "home" ? <Home /> : route.name === "templates" ? <TemplatesPage /> : piece ? <KitPage key={piece.meta.slug} piece={piece} /> : <NotFound />}</div>
    </>
  );
}

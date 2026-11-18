import { useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from "react";

/** Tiny pushState router: four routes do not justify a dependency. */

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}

export function usePathname() {
  return useSyncExternalStore(subscribe, () => window.location.pathname, () => "/");
}

export function navigate(to: string) {
  window.history.pushState(null, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo(0, 0);
}

export function Link({ href, onClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(href);
  };
  return <a href={href} onClick={handle} {...props} />;
}

export type Route = { name: "home" } | { name: "templates" } | { name: "kit"; slug: string } | { name: "export"; slug: string } | { name: "missing" };

export function matchRoute(pathname: string): Route {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/") return { name: "home" };
  if (path === "/templates") return { name: "templates" };
  const kit = /^\/kit\/([a-z0-9-]+)$/.exec(path);
  if (kit?.[1]) return { name: "kit", slug: kit[1] };
  const exp = /^\/export\/([a-z0-9-]+)$/.exec(path);
  if (exp?.[1]) return { name: "export", slug: exp[1] };
  return { name: "missing" };
}

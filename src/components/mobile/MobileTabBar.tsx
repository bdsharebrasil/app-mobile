import { NavLink, useLocation } from "react-router-dom";
import { BarChart3, Home, Plane, User, Wrench } from "lucide-react";

const navItems = [
  { title: "Início", ariaLabel: "Página inicial", icon: Home, href: "/", paths: ["/"] },
  { title: "Voos", ariaLabel: "Diário de bordo e voos", icon: Plane, href: "/diario-bordo", paths: ["/diario-bordo", "/meus-voos", "/plano-voo"] },
  { title: "Manut.", ariaLabel: "Manutenção de aeronaves", icon: Wrench, href: "/manutencao/ctm", paths: ["/manutencao"] },
  { title: "Despesas", ariaLabel: "Despesas de viagem", icon: BarChart3, href: "/financeiro/despesas-viagem", paths: ["/financeiro"] },
  { title: "Perfil", ariaLabel: "Meu perfil", icon: User, href: "/perfil", paths: ["/perfil"] },
];

export const MobileTabBar = () => {
  const { pathname } = useLocation();
  return (
  <nav aria-label="Navegação principal" className="mobile-tab-bar">
    <div className="mobile-tab-bar__inner">
      {navItems.map(({ title, ariaLabel, icon: Icon, href, paths }) => {
        const isActive = paths.some((path) => path === "/" ? pathname === path : pathname === path || pathname.startsWith(`${path}/`));
        return (
        <NavLink
          key={href}
          to={href}
          aria-label={ariaLabel}
          aria-current={isActive ? "page" : undefined}
          className={`mobile-tab-bar__item${isActive ? " is-active" : ""}`}
          end={href === "/"}
        >
          <Icon aria-hidden="true" className="mobile-tab-bar__icon" strokeWidth={2} />
          <span className="mobile-tab-bar__label">{title}</span>
        </NavLink>
        );
      })}
    </div>
  </nav>
  );
};

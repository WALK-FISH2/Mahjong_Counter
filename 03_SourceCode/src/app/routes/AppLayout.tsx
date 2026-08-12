import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { NavigationCoordinator } from './NavigationCoordinator';
import { navigationStore } from './navigation-store';

const navigationItems = [
  { label: '算番', to: '/calculator' },
  { label: '规则百科', to: '/rules' },
  { label: '已保存牌例', to: '/saved' },
  { label: '设置', to: '/settings' },
] as const;

export function AppLayout() {
  const location = useLocation();

  return (
    <div className="app-shell">
      <NavigationCoordinator />
      <main className="app-main">
        <Outlet
          context={{ restoreCalculatorScroll: navigationStore.getState().calculatorScrollY }}
        />
      </main>

      <nav className="primary-navigation" aria-label="主导航">
        {navigationItems.map((item) => (
          <NavLink
            className="primary-navigation__link"
            key={item.to}
            to={item.to}
            onClick={() => {
              if (location.pathname === '/calculator' && item.to !== '/calculator') {
                navigationStore.getState().recordCalculatorScroll(window.scrollY);
              }
            }}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

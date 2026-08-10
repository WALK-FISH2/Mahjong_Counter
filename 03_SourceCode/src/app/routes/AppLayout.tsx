import { NavLink, Outlet } from 'react-router-dom';

const navigationItems = [
  { label: '算番', to: '/calculator' },
  { label: '规则百科', to: '/rules' },
  { label: '已保存牌例', to: '/saved' },
  { label: '设置', to: '/settings' },
] as const;

export function AppLayout() {
  return (
    <div className="app-shell">
      <main className="app-main">
        <Outlet />
      </main>

      <nav className="primary-navigation" aria-label="主导航">
        {navigationItems.map((item) => (
          <NavLink className="primary-navigation__link" key={item.to} to={item.to}>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

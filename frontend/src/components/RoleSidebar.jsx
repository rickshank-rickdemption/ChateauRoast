import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, LogOut } from 'lucide-react';

const roleRoute = {
  admin: '/admin',
  cashier: '/shop',
  kitchen: '/kitchen'
};

export default function RoleSidebar({ role, onLogout, items, activeItem, className = '' }) {
  const navigate = useNavigate();

  const fallbackItems = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid, to: roleRoute[role] || '/' }
  ];
  const navItems = items && items.length > 0 ? items : fallbackItems;

  return (
    <aside className={`role-sidebar ${className}`.trim()}>
      <nav className="role-sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon || LayoutGrid;
          const active = activeItem ? activeItem === item.id : item.to ? roleRoute[role] === item.to : false;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.onClick) item.onClick();
                else if (item.to) navigate(item.to);
              }}
              aria-label={item.label}
              className={`role-nav-item ${active ? 'role-nav-item-active' : ''}`}
            >
              <Icon size={18} />
              <span className="role-tooltip">{item.label}</span>
              <span className="sr-only">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="role-sidebar-logout">
        <button onClick={onLogout} className="role-nav-item role-nav-item-logout" aria-label="Log out">
          <LogOut size={18} />
          <span className="role-tooltip">Log out</span>
          <span className="sr-only">Log out</span>
        </button>
      </div>
    </aside>
  );
}

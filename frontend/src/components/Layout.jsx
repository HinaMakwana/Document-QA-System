import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  FileText,
  History,
  LayoutDashboard,
  Settings,
  LogOut,
  Menu,
  X,
  User as UserIcon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const SidebarItem = ({ icon: Icon, label, href, active, collapsed }) => (
  <Link
    to={href}
    className={cn(
      "flex items-center p-3 rounded-xl transition-all duration-200 group mb-1",
      active
        ? "bg-primary-600/10 text-primary-400"
        : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
    )}
  >
    <Icon className={cn("w-5 h-5 transition-transform duration-200", !collapsed && "mr-3", active ? "scale-105" : "group-hover:scale-105")} />
    {!collapsed && <span className="text-sm font-medium tracking-tight">{label}</span>}
  </Link>
);

const Layout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { icon: MessageSquare, label: 'Chat', href: '/' },
    { icon: FileText, label: 'Documents', href: '/documents' },
    { icon: History, label: 'History', href: '/history' },
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: Settings, label: 'Settings', href: '/settings' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 overflow-hidden font-sans">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-md"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col bg-slate-950/80 border-r border-slate-800/50 transition-all duration-300 lg:relative backdrop-blur-xl",
        collapsed ? "w-20" : "w-64",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="p-6 pb-2 flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center space-x-3 group cursor-pointer">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shadow-lg shadow-primary-600/20 group-hover:rotate-3 transition-transform duration-300">
                <MessageSquare className="text-white w-4 h-4" />
              </div>
              <div className="flex flex-col">
                  <span className="text-lg font-bold text-white tracking-tight">AI.DOC</span>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center mx-auto shadow-lg shadow-primary-600/20">
                <MessageSquare className="text-white w-4 h-4" />
            </div>
          )}
        </div>

        <nav className="flex-1 px-6 py-8 overflow-y-auto space-y-1">
            <div className="px-4 pb-4">
                <h3 className={cn("text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em]", collapsed && "text-center")}>Main Menu</h3>
            </div>
            {menuItems.map((item) => (
                <SidebarItem
                    key={item.href}
                    {...item}
                    active={location.pathname === item.href}
                    collapsed={collapsed}
                />
            ))}
        </nav>

        <div className="p-4 border-t border-slate-800/50">
          {!collapsed && (
            <div className="flex items-center p-3 mb-2 rounded-xl bg-white/5 relative group cursor-default">
              <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 mr-3">
                <UserIcon size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-white truncate">{user?.username || 'Guest User'}</p>
                <p className="text-[10px] text-slate-500 truncate font-semibold uppercase">{user?.tier || 'Free'} Plan</p>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className={cn(
              "flex items-center w-full p-3 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all duration-200 group",
              collapsed && "justify-center"
            )}
          >
            <LogOut size={16} className={cn(!collapsed && "mr-3")} />
            {!collapsed && <span className="font-medium text-[13px]">Sign Out</span>}
          </button>
        </div>
        
        <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex absolute -right-4 top-10 p-2 bg-slate-900 border border-white/5 rounded-full text-slate-500 hover:text-white transition-all shadow-xl z-50 hover:scale-110"
        >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative bg-slate-950">
        <header className="h-20 flex items-center justify-between px-8 lg:hidden border-b border-white/5 bg-slate-950/80 backdrop-blur-3xl z-40">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-3 text-slate-400 hover:text-white bg-white/5 rounded-xl"
          >
            <Menu size={24} />
          </button>
           <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary-600/30">
              <MessageSquare size={20} />
            </div>
            <span className="font-bold text-white tracking-tight text-lg">AI.DOC</span>
          </div>
          <div className="w-10" />
        </header>

        <div className={cn("flex-1 relative flex flex-col min-h-0", location.pathname === '/' ? "overflow-hidden" : "overflow-y-auto")}>
             <div className={cn("relative z-10 flex flex-col flex-1 min-h-0", location.pathname !== '/' && "p-6 lg:p-10")}>
                {children}
             </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;

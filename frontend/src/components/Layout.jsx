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
        ? "bg-primary-600 text-white shadow-lg shadow-primary-600/20"
        : "text-slate-400 hover:bg-slate-800 hover:text-white"
    )}
  >
    <Icon className={cn("w-5 h-5", !collapsed && "mr-3")} />
    {!collapsed && <span className="font-medium">{label}</span>}
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
        "fixed inset-y-0 left-0 z-50 flex flex-col bg-slate-950 border-r border-white/5 transition-all duration-300 lg:relative backdrop-blur-3xl",
        collapsed ? "w-24" : "w-72",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="p-8 flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center space-x-4 group cursor-pointer">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-[1rem] flex items-center justify-center shadow-xl shadow-primary-500/20 group-hover:scale-110 transition-transform">
                <MessageSquare className="text-white w-6 h-6" />
              </div>
              <div className="flex flex-col">
                  <span className="text-xl font-black text-white tracking-tighter italic">AI.DOC</span>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] -mt-1">Neural Core</span>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-[1rem] flex items-center justify-center mx-auto shadow-xl shadow-primary-500/20">
                <MessageSquare className="text-white w-6 h-6" />
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-all ml-2"
          >
            {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-6 py-8 overflow-y-auto space-y-2">
            <div className="px-4 pb-4">
                <h3 className={cn("text-[9px] font-black text-slate-600 uppercase tracking-[0.5em]", collapsed && "text-center")}>Navigator</h3>
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

        <div className="p-6 border-t border-white/5">
          {!collapsed && (
            <div className="flex items-center p-4 mb-6 rounded-3xl glass-panel relative overflow-hidden group">
              <div className="absolute top-0 right-0 -m-4 w-16 h-16 bg-primary-600/10 rounded-full blur-xl group-hover:bg-primary-600/20 transition-all"></div>
              <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 mr-4 shadow-inner ring-1 ring-white/10 group-hover:bg-primary-600/20 group-hover:text-primary-400 transition-all">
                <UserIcon size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-white truncate tracking-tight uppercase italic">{user?.username || 'GUEST'}</p>
                <div className="flex items-center mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mr-2 shadow-[0_0_8px_rgba(37,99,235,0.5)]"></div>
                    <p className="text-[9px] text-slate-500 truncate font-black uppercase tracking-widest">{user?.tier || 'FREE'} PROTOCOL</p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className={cn(
              "flex items-center w-full p-4 text-slate-500 hover:text-red-400 hover:bg-red-400/5 rounded-2xl transition-all duration-300 group",
              collapsed && "justify-center"
            )}
          >
            <LogOut size={22} className={cn(!collapsed && "mr-4 transition-transform group-hover:-translate-x-1")} />
            {!collapsed && <span className="font-bold text-xs uppercase tracking-[0.2em]">Terminate</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative">
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
            <span className="font-black text-white uppercase tracking-tighter text-lg italic italic">AI.DOC</span>
          </div>
          <div className="w-10" />
        </header>

        <div className="flex-1 overflow-y-auto p-6 lg:p-12 relative">
             {/* Dynamic background element */}
             <div className="absolute top-0 right-0 -m-32 w-96 h-96 bg-primary-600/5 rounded-full blur-[120px] pointer-events-none"></div>
             <div className="absolute bottom-0 left-0 -m-32 w-96 h-96 bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none"></div>

             <div className="relative z-10">
                {children}
             </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;

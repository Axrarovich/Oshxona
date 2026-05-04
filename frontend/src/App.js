import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import './App.css';

// Pages
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Recipes from './pages/Recipes';
import Consumptions from './pages/Consumptions';
import Wastage from './pages/Wastage';
import Reports from './pages/Reports';
import Invoices from './pages/Invoices';
import Login from './pages/Login';

const THEME_STORAGE_KEY = 'km_oshxona_theme';
const BRAND_ASSET_PATH = `${process.env.PUBLIC_URL}/assets/brand`;

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState('Oshxona');
  // Lokal saqlangan login holati bilan boshlash
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isLoggedIn') === 'true';
  });
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_STORAGE_KEY) || 'light');
  const workspaceMenuRef = useRef(null);
  const userMenuRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const menuItems = useMemo(
    () => [
      { to: '/', label: 'Bosh sahifa', icon: '🏠', end: true },
      { to: '/products', label: 'Mahsulotlar', icon: '📦' },
      { to: '/recipes', label: 'Retseptlar', icon: '🧾' },
      { to: '/consumptions', label: "Iste'mollar", icon: '🍽️' },
      { to: '/wastage', label: "Yo'qotishlar", icon: '⚠️' },
      { to: '/invoices', label: 'Nakladnoylar', icon: '📑' },
      { to: '/reports', label: 'Hisobotlar', icon: '📊' },
    ],
    [],
  );
  const workspaceOptions = useMemo(() => ['Oshxona', 'Kadr'], []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (workspaceMenuRef.current && !workspaceMenuRef.current.contains(event.target)) {
        setIsWorkspaceMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsWorkspaceMenuOpen(false);
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const closeSidebar = () => setIsSidebarOpen(false);
  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const toggleWorkspaceMenu = () => setIsWorkspaceMenuOpen((prev) => !prev);
  const toggleUserMenu = () => setIsUserMenuOpen((prev) => !prev);
  
  const setLightTheme = () => {
    setTheme('light');
    setIsUserMenuOpen(false);
  };
  
  const setDarkTheme = () => {
    setTheme('dark');
    setIsUserMenuOpen(false);
  };

  const handleWorkspaceSelect = (workspace) => {
    setSelectedWorkspace(workspace);
    setIsWorkspaceMenuOpen(false);
  };

  const handleNavClick = () => {
    if (window.innerWidth <= 768) closeSidebar();
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
    localStorage.setItem('isLoggedIn', 'true');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('isLoggedIn');
    setIsUserMenuOpen(false);
  };

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className={`app ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <header className="navbar">
        <div className="navbar-left">
          <button type="button" className="menu-toggle" aria-label="Toggle menu" onClick={toggleSidebar}>
            <i className={`fas ${isSidebarOpen ? 'fa-chevron-left' : 'fa-chevron-right'}`}></i>
          </button>
          <div className="navbar-brand" role="img" aria-label="Keng Makon">
            <img
              className="brand-logo-image brand-logo-image-on-light"
              src={`${BRAND_ASSET_PATH}/km-logo-mark-on-light.png`}
              alt=""
              aria-hidden="true"
            />
            <img
              className="brand-logo-image brand-logo-image-on-dark"
              src={`${BRAND_ASSET_PATH}/km-logo-mark-on-dark.png`}
              alt=""
              aria-hidden="true"
            />
          </div>
        </div>
        <div className="navbar-right">
          <div className="workspace-switcher" ref={workspaceMenuRef}>
            <button
              type="button"
              className={`workspace-trigger ${isWorkspaceMenuOpen ? 'open' : ''}`}
              aria-haspopup="menu"
              aria-expanded={isWorkspaceMenuOpen}
              aria-label="Window switcher"
              onClick={toggleWorkspaceMenu}
            >
              <span className="workspace-trigger-icon" aria-hidden="true">
                <i className="far fa-clone"></i>
              </span>
              <span className="workspace-trigger-label">{selectedWorkspace}</span>
              <i
                className={`fas fa-chevron-down workspace-trigger-caret ${
                  isWorkspaceMenuOpen ? 'open' : ''
                }`}
                aria-hidden="true"
              ></i>
            </button>

            {isWorkspaceMenuOpen && (
              <div className="workspace-dropdown" role="menu" aria-label="Window switcher options">
                {workspaceOptions.map((workspace) => {
                  const isSelected = workspace === selectedWorkspace;

                  return (
                    <button
                      key={workspace}
                      type="button"
                      className={`workspace-option ${isSelected ? 'selected' : ''}`}
                      role="menuitemradio"
                      aria-checked={isSelected}
                      onClick={() => handleWorkspaceSelect(workspace)}
                    >
                      <span className="workspace-option-icon" aria-hidden="true">
                        <i className="far fa-clone"></i>
                      </span>
                      <span className="workspace-option-label">{workspace}</span>
                      <span className={`workspace-option-check ${isSelected ? 'visible' : ''}`} aria-hidden="true">
                        <i className="fas fa-check"></i>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="search-bar">
            <i className="fas fa-search"></i>
            <input type="text" placeholder="Qidirish" />
          </div>
          <div className="user-section" ref={userMenuRef}>
            <div className="user-avatar" onClick={toggleUserMenu}>A</div>
            {isUserMenuOpen && (
              <div className="user-dropdown">
                <div className="user-dropdown-header">
                  <i className="far fa-user-circle"></i>
                  <span>Admin</span>
                </div>
                <div className="theme-switcher">
                  <button
                    type="button"
                    className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                    onClick={setLightTheme}
                    aria-label="Kunduzgi rejim"
                    aria-pressed={theme === 'light'}
                  >
                    <i className="fas fa-sun"></i>
                  </button>
                  <button
                    type="button"
                    className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                    onClick={setDarkTheme}
                    aria-label="Tungi rejim"
                    aria-pressed={theme === 'dark'}
                  >
                    <i className="fas fa-moon"></i>
                  </button>
                </div>
                <button className="user-dropdown-item logout-item" onClick={handleLogout}>
                  <i className="fas fa-sign-out-alt"></i>
                  <span>Chiqish</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="app-layout">
        <nav className="sidebar" aria-label="Main menu">
          <ul className="menu">
            {menuItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={handleNavClick}
                  className={({ isActive }) => (isActive ? 'active' : '')}
                >
                  <span className="menu-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className="menu-label">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close menu"
          onClick={closeSidebar}
        />

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/recipes" element={<Recipes />} />
            <Route path="/consumptions" element={<Consumptions />} />
            <Route path="/wastage" element={<Wastage />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;

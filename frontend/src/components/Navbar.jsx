import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { 
  ShoppingCart, 
  MessageSquare, 
  Heart, 
  PlusCircle, 
  LogOut, 
  User, 
  Sun, 
  Moon, 
  Shield,
  Bell,
  Tag,
  Percent,
  CalendarDays,
  LayoutDashboard
} from 'lucide-react';

export default function Navbar() {
  const { user, token, logout } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Fetch initial notifications count on mount or path changes
  useEffect(() => {
    if (!user || !token) return;

    const fetchUnreadCount = async () => {
      try {
        const response = await fetch('http://127.0.0.1:5050/api/notifications', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        if (response.ok) {
          setUnreadCount(data.notifications.filter(n => !n.read).length);
        }
      } catch (err) {
        console.error('Error fetching unread notification count:', err);
      }
    };

    fetchUnreadCount();
  }, [user, token, location.pathname]);

  // Listen for live socket notifications
  useEffect(() => {
    if (!socket) return;

    const handleNotification = () => {
      // Increment unread count unless user is currently viewing the notifications page
      if (location.pathname !== '/notifications') {
        setUnreadCount(prev => prev + 1);
      }
    };

    socket.on('notification_received', handleNotification);

    return () => {
      socket.off('notification_received', handleNotification);
    };
  }, [socket, location.pathname]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="navbar-container">
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px'
      }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <div style={{
            background: 'var(--primary-gradient)',
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: 'var(--glow-shadow)'
          }}>
            <ShoppingCart size={20} />
          </div>
          <span style={{
            fontFamily: 'var(--font-title)',
            fontSize: '20px',
            fontWeight: 800,
            color: 'var(--text-main)'
          }}>
            Campus<span style={{ color: 'var(--primary)' }}>Cart</span>
          </span>
        </Link>

        {/* Navigation Items */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          {/* Theme Toggle */}
          <button 
            onClick={toggleTheme}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'var(--transition)'
            }}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {user ? (
            <>
              {/* Dashboard Link */}
              <Link 
                to="/" 
                style={{ 
                  color: location.pathname === '/' ? 'var(--primary)' : 'var(--text-secondary)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'var(--transition)' 
                }}
                title="Dashboard"
              >
                <LayoutDashboard size={18} />
                <span className="nav-text">Dashboard</span>
              </Link>

              {/* Sell Item Button - always visible */}
              <Link to="/sell" className="btn btn-primary" style={{ padding: '7px 14px', fontSize: '13px', gap: '6px' }}>
                <PlusCircle size={16} />
                <span>Sell Item</span>
              </Link>

              {/* My Listings Link */}
              <Link 
                to="/my-listings" 
                style={{ 
                  color: location.pathname === '/my-listings' ? 'var(--primary)' : 'var(--text-secondary)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'var(--transition)' 
                }}
                title="My Listings"
              >
                <Tag size={18} />
                <span className="nav-text">Inventory</span>
              </Link>

              {/* Offers Hub Link */}
              <Link 
                to="/offers" 
                style={{ 
                  color: location.pathname === '/offers' ? 'var(--primary)' : 'var(--text-secondary)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'var(--transition)' 
                }}
                title="Negotiation Hub"
              >
                <Percent size={18} />
                <span className="nav-text">Negotiations</span>
              </Link>

              {/* Transaction Tracker Link */}
              <Link 
                to="/transactions" 
                style={{ 
                  color: location.pathname === '/transactions' ? 'var(--primary)' : 'var(--text-secondary)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'var(--transition)' 
                }}
                title="Transactions Tracker"
              >
                <CalendarDays size={18} />
                <span className="nav-text">Track Deals</span>
              </Link>

              {/* Chat Link */}
              <Link 
                to="/chat" 
                style={{ 
                  color: location.pathname === '/chat' ? 'var(--primary)' : 'var(--text-secondary)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  transition: 'var(--transition)' 
                }}
                title="Messenger"
              >
                <MessageSquare size={18} />
              </Link>

              {/* Wishlist Link */}
              <Link 
                to="/wishlist" 
                style={{ 
                  color: location.pathname === '/wishlist' ? 'var(--primary)' : 'var(--text-secondary)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  transition: 'var(--transition)' 
                }}
                title="Wishlist"
              >
                <Heart size={18} />
              </Link>

              {/* Notifications Link with Badge */}
              <Link 
                to="/notifications" 
                style={{ 
                  color: location.pathname === '/notifications' ? 'var(--primary)' : 'var(--text-secondary)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  position: 'relative',
                  padding: '4px',
                  transition: 'var(--transition)' 
                }}
                title="Notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-2px',
                    right: '-2px',
                    background: 'var(--danger)',
                    color: 'white',
                    fontSize: '9px',
                    fontWeight: 'bold',
                    borderRadius: '50%',
                    width: '15px',
                    height: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>

              {/* Admin Panel */}
              {user.role === 'admin' && (
                <Link 
                  to="/admin" 
                  style={{ 
                    color: location.pathname === '/admin' ? 'var(--warning)' : 'var(--text-secondary)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    transition: 'var(--transition)' 
                  }}
                  title="Admin Dashboard"
                >
                  <Shield size={18} />
                </Link>
              )}

              {/* User Dropdown / Profile */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid var(--nav-divider)', paddingLeft: '14px' }}>
                <Link to="/profile" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                  <div style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    background: 'var(--nav-profile-bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary)',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    overflow: 'hidden',
                    border: '1px solid var(--nav-profile-border)'
                  }}>
                    {user.avatar ? (
                      <img src={user.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      user.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="nav-user-text" style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>{user.name}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Student</span>
                  </div>
                </Link>

                <button 
                  onClick={handleLogout}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--danger)',
                    padding: '6px',
                    marginLeft: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'var(--transition)'
                  }}
                  title="Sign Out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </>
          ) : (
            <Link to="/login" className="btn btn-primary" style={{ padding: '8px 18px', fontSize: '13px' }}>
              Sign In
            </Link>
          )}
        </div>
      </div>
      
      <style>{`
        @media (max-width: 768px) {
          .nav-text, .nav-user-text {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
}

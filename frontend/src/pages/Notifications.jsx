import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Bell, BellOff, CheckCircle2, MessageSquare, DollarSign, Award, AlertCircle, ShieldAlert } from 'lucide-react';

export default function Notifications() {
  const { token } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:5050/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setNotifications(data.notifications);
      } else {
        addToast(data.message || 'Failed to fetch notifications', 'error');
      }
    } catch (error) {
      console.error('Fetch notifications failed:', error);
      addToast('Server error loading notifications.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchNotifications();
    }
  }, [token]);

  const handleMarkAllRead = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5050/api/notifications/read-all', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        addToast('All notifications marked as read', 'success');
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      } else {
        addToast('Failed to mark notifications read', 'error');
      }
    } catch (error) {
      console.error('Mark all read error:', error);
      addToast('Server error marking notifications read.', 'error');
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.read) {
      try {
        await fetch(`http://127.0.0.1:5050/api/notifications/${notif._id}/read`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` }
        });
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, read: true } : n))
        );
      } catch (error) {
        console.error('Mark read error:', error);
      }
    }

    if (notif.link) {
      navigate(notif.link);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'offer': return <DollarSign size={20} style={{ color: 'var(--warning)' }} />;
      case 'message': return <MessageSquare size={20} style={{ color: 'var(--primary)' }} />;
      case 'transaction': return <CheckCircle2 size={20} style={{ color: 'var(--success)' }} />;
      case 'review': return <Award size={20} style={{ color: 'var(--success)' }} />;
      case 'admin': return <ShieldAlert size={20} style={{ color: 'var(--danger)' }} />;
      default: return <Bell size={20} style={{ color: 'var(--text-muted)' }} />;
    }
  };

  return (
    <div style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto', minHeight: 'calc(100vh - 73px)' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{ fontSize: '32px', color: 'var(--text-main)', marginBottom: '8px' }}>Notifications</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Live activity feed and campus trade updates.</p>
        </div>
        {notifications.some((n) => !n.read) && (
          <button
            onClick={handleMarkAllRead}
            className="btn"
            style={{
              padding: '10px 18px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--text-main)',
              fontSize: '14px',
              fontWeight: 500
            }}
          >
            Mark All Read
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3].map((n) => (
            <div key={n} className="glass-panel" style={{ height: '70px', opacity: 0.6 }} />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="glass-panel" style={{
          padding: '60px 20px',
          textAlign: 'center',
          maxWidth: '500px',
          margin: '40px auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px'
        }}>
          <div style={{
            background: 'var(--primary-glow)',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)'
          }}>
            <BellOff size={40} />
          </div>
          <div>
            <h3 style={{ fontSize: '20px', color: 'var(--text-main)', marginBottom: '8px' }}>All Caught Up!</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>
              You don't have any notifications right now. We'll alert you here when new activities occur.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {notifications.map((notif) => (
            <div
              key={notif._id}
              onClick={() => handleNotificationClick(notif)}
              className="glass-panel card-hover"
              style={{
                padding: '16px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                cursor: 'pointer',
                borderRadius: 'var(--radius-sm)',
                borderLeft: notif.read ? '1px solid rgba(255,255,255,0.06)' : '4px solid var(--primary)',
                backgroundColor: notif.read ? 'transparent' : 'rgba(99, 102, 241, 0.03)',
                transition: 'all 0.2s ease-in-out'
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {getIcon(notif.type)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={{
                  fontSize: '14px',
                  fontWeight: notif.read ? 500 : 600,
                  color: notif.read ? 'var(--text-main)' : '#ffffff',
                  marginBottom: '2px',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap'
                }}>
                  {notif.title}
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {notif.content}
                </p>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>
                {new Date(notif.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

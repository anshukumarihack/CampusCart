import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  Shield, 
  Flag, 
  UserX, 
  Trash2, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  ExternalLink,
  Users as UsersIcon,
  Tag,
  BarChart3,
  Search,
  Check
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminPanel() {
  const { token } = useAuth();
  const { addToast } = useToast();
  
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'users' | 'listings' | 'reports'
  
  // Dashboard Stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalListings: 0,
    activeListings: 0,
    completedTransactions: 0,
    pendingReports: 0
  });

  // Data lists
  const [reports, setReports] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [listingsList, setListingsList] = useState([]);

  // Loadings and searches
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingListings, setLoadingListings] = useState(false);

  const [userSearch, setUserSearch] = useState('');
  const [listingSearch, setListingSearch] = useState('');

  // Fetch admin dashboard stats
  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch('http://127.0.0.1:5050/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStats(false);
    }
  };

  // Fetch moderation reports
  const fetchReports = async () => {
    setLoadingReports(true);
    try {
      const response = await fetch('http://127.0.0.1:5050/api/admin/reports', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setReports(data.reports);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingReports(false);
    }
  };

  // Fetch users list
  const fetchUsers = async (searchVal = '') => {
    setLoadingUsers(true);
    try {
      const response = await fetch(`http://127.0.0.1:5050/api/admin/users?search=${encodeURIComponent(searchVal)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setUsersList(data.users);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch listings list
  const fetchListings = async (searchVal = '') => {
    setLoadingListings(true);
    try {
      const response = await fetch(`http://127.0.0.1:5050/api/listings?search=${encodeURIComponent(searchVal)}`);
      const data = await response.json();
      if (response.ok) {
        setListingsList(data.listings);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingListings(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchStats();
      fetchReports();
      fetchUsers();
      fetchListings();
    }
  }, [token]);

  const handleResolveReport = async (id) => {
    try {
      const response = await fetch(`http://127.0.0.1:5050/api/admin/reports/${id}/resolve`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        addToast('Report resolved', 'success');
        setReports(prev => prev.map(rep => rep._id === id ? { ...rep, status: 'Resolved' } : rep));
        fetchStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleBlockUser = async (userId, userName, currentBlockedState) => {
    const actionText = currentBlockedState ? 'unblock' : 'ban';
    if (!window.confirm(`Are you sure you want to ${actionText} ${userName}?`)) {
      return;
    }

    try {
      const response = await fetch(`http://127.0.0.1:5050/api/admin/users/${userId}/toggle-block`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();

      if (response.ok) {
        addToast(data.message || 'Block status updated', 'success');
        fetchUsers(userSearch);
        fetchReports();
        fetchStats();
      } else {
        addToast(data.message || 'Action failed', 'error');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveListing = async (listingId, listingTitle) => {
    if (!window.confirm(`Are you sure you want to remove listing "${listingTitle}"?`)) {
      return;
    }

    try {
      const response = await fetch(`http://127.0.0.1:5050/api/admin/listings/${listingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        addToast('Listing removed successfully', 'success');
        fetchListings(listingSearch);
        fetchReports();
        fetchStats();
      } else {
        addToast('Failed to delete listing', 'error');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Debounced search handlers
  useEffect(() => {
    const timer = setTimeout(() => {
      if (token) fetchUsers(userSearch);
    }, 400);
    return () => clearTimeout(timer);
  }, [userSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (token) fetchListings(listingSearch);
    }, 400);
    return () => clearTimeout(timer);
  }, [listingSearch]);

  return (
    <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 20px', minHeight: 'calc(100vh - 73px)' }} className="animate-fade">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '36px' }}>
        <div style={{
          background: 'var(--primary-gradient)',
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          boxShadow: 'var(--glow-shadow)'
        }}>
          <Shield size={22} />
        </div>
        <div>
          <h2 style={{ fontSize: '26px', fontFamily: 'var(--font-title)', color: 'var(--text-main)' }}>Admin Dashboard</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Moderate users, flag audits, and inspect listings.</p>
        </div>
      </div>

      {/* Tabs Row */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        marginBottom: '32px',
        gap: '24px',
        overflowX: 'auto',
        paddingBottom: '2px'
      }}>
        {[
          { id: 'dashboard', label: 'Overview', icon: <BarChart3 size={16} /> },
          { id: 'users', label: 'Manage Users', icon: <UsersIcon size={16} /> },
          { id: 'listings', label: 'Manage Listings', icon: <Tag size={16} /> },
          { id: 'reports', label: 'Moderation Reports', icon: <Flag size={16} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: 'none',
              border: 'none',
              padding: '12px 4px',
              color: activeTab === tab.id ? 'var(--text-main)' : 'var(--text-muted)',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'var(--transition)'
            }}
          >
            {tab.icon}
            {tab.label}
            {tab.id === 'reports' && reports.filter(r => r.status === 'Pending').length > 0 && (
              <span style={{
                background: 'var(--danger)',
                color: '#ffffff',
                fontSize: '10px',
                fontWeight: 'bold',
                borderRadius: '8px',
                padding: '2px 6px',
              }}>
                {reports.filter(r => r.status === 'Pending').length}
              </span>
            )}
            {activeTab === tab.id && (
              <div style={{ position: 'absolute', bottom: '-1px', left: 0, right: 0, height: '2px', backgroundColor: 'var(--primary)' }} />
            )}
          </button>
        ))}
      </div>

      {/* Tab: Overview (Dashboard stats) */}
      {activeTab === 'dashboard' && (
        <div>
          {loadingStats ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading statistics...</div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '24px',
              marginBottom: '40px'
            }}>
              <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', padding: '14px', borderRadius: '16px' }}>
                  <UsersIcon size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-main)' }}>{stats.totalUsers}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Total Students</div>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '14px', borderRadius: '16px' }}>
                  <Tag size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-main)' }}>{stats.totalListings}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Total Listings</div>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '14px', borderRadius: '16px' }}>
                  <CheckCircle size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-main)' }}>{stats.completedTransactions}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Completed Deals</div>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '14px', borderRadius: '16px' }}>
                  <Flag size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-main)' }}>{stats.pendingReports}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Pending Reports</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Users Management */}
      {activeTab === 'users' && (
        <div>
          {/* Search bar */}
          <div style={{ position: 'relative', marginBottom: '24px', maxWidth: '400px' }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="input-field"
              placeholder="Search users by name or email..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              style={{ paddingLeft: '44px' }}
            />
          </div>

          <div className="glass-panel" style={{ overflowX: 'auto', padding: '20px' }}>
            {loadingUsers ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Searching users...</div>
            ) : usersList.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No student accounts found.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px' }}>Name</th>
                    <th style={{ padding: '12px' }}>Email</th>
                    <th style={{ padding: '12px' }}>Rating</th>
                    <th style={{ padding: '12px' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((usr) => (
                    <tr key={usr._id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      <td style={{ padding: '14px 12px', fontWeight: 600, color: 'var(--text-main)' }}>{usr.name}</td>
                      <td style={{ padding: '14px 12px' }}>{usr.email}</td>
                      <td style={{ padding: '14px 12px' }}>{usr.averageRating.toFixed(1)} ★ ({usr.ratingCount})</td>
                      <td style={{ padding: '14px 12px' }}>
                        <span style={{
                          color: usr.isBlocked ? 'var(--danger)' : 'var(--success)',
                          background: usr.isBlocked ? 'var(--danger-glow)' : 'var(--success-glow)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600
                        }}>
                          {usr.isBlocked ? 'BANNED' : 'ACTIVE'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleToggleBlockUser(usr._id, usr.name, usr.isBlocked)}
                          className="btn"
                          style={{
                            padding: '6px 12px',
                            background: usr.isBlocked ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            border: usr.isBlocked ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
                            color: usr.isBlocked ? 'var(--success)' : 'var(--danger)',
                            fontSize: '12px'
                          }}
                        >
                          {usr.isBlocked ? 'Unban User' : 'Ban User'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tab: Listings Management */}
      {activeTab === 'listings' && (
        <div>
          {/* Search bar */}
          <div style={{ position: 'relative', marginBottom: '24px', maxWidth: '400px' }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="input-field"
              placeholder="Search listings by title..."
              value={listingSearch}
              onChange={(e) => setListingSearch(e.target.value)}
              style={{ paddingLeft: '44px' }}
            />
          </div>

          <div className="glass-panel" style={{ overflowX: 'auto', padding: '20px' }}>
            {loadingListings ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Searching listings...</div>
            ) : listingsList.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No listings found.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px' }}>Item</th>
                    <th style={{ padding: '12px' }}>Category</th>
                    <th style={{ padding: '12px' }}>Price</th>
                    <th style={{ padding: '12px' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {listingsList.map((item) => (
                    <tr key={item._id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      <td style={{ padding: '14px 12px', fontWeight: 600, color: 'var(--text-main)' }}>{item.title}</td>
                      <td style={{ padding: '14px 12px' }}>{item.category}</td>
                      <td style={{ padding: '14px 12px' }}>${item.price.toFixed(2)}</td>
                      <td style={{ padding: '14px 12px' }}>{item.status}</td>
                      <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleRemoveListing(item._id, item.title)}
                          className="btn"
                          style={{
                            padding: '6px 12px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            color: 'var(--danger)',
                            fontSize: '12px'
                          }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tab: Moderation Reports */}
      {activeTab === 'reports' && (
        <div className="glass-panel" style={{ padding: '20px', overflowX: 'auto' }}>
          {loadingReports ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading platform audits...</div>
          ) : reports.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>All clean! No reports filed.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px' }}>Reporter</th>
                  <th style={{ padding: '12px' }}>Reason</th>
                  <th style={{ padding: '12px' }}>Description</th>
                  <th style={{ padding: '12px' }}>Target</th>
                  <th style={{ padding: '12px' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report._id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <td style={{ padding: '16px 12px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{report.reporter?.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{report.reporter?.email}</div>
                    </td>
                    <td style={{ padding: '16px 12px' }}>
                      <span style={{
                        backgroundColor: 'var(--danger-glow)',
                        color: 'var(--danger)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600
                      }}>
                        {report.reason}
                      </span>
                    </td>
                    <td style={{ padding: '16px 12px', maxWidth: '250px', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.4' }}>
                      {report.description || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No additional details</span>}
                    </td>
                    <td style={{ padding: '16px 12px' }}>
                      {report.reportedListing ? (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>[Product] {report.reportedListing.title}</span>
                            <Link to={`/listings/${report.reportedListing._id}`} style={{ color: 'var(--primary)' }}>
                              <ExternalLink size={12} />
                            </Link>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Price: ${report.reportedListing.price} | Status: {report.reportedListing.status}
                          </div>
                        </div>
                      ) : report.reportedUser ? (
                        <div>
                          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>[User] {report.reportedUser.name}</span>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Email: {report.reportedUser.email} {report.reportedUser.isBlocked && <strong style={{ color: 'var(--danger)' }}>(Suspended)</strong>}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Unknown</span>
                      )}
                    </td>
                    <td style={{ padding: '16px 12px' }}>
                      <span style={{
                        color: report.status === 'Resolved' ? 'var(--success)' : 'var(--warning)',
                        background: report.status === 'Resolved' ? 'var(--success-glow)' : 'var(--warning-glow)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600
                      }}>
                        {report.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px 12px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        {report.status === 'Pending' && (
                          <button
                            onClick={() => handleResolveReport(report._id)}
                            className="btn"
                            style={{ padding: '6px 10px', fontSize: '11px', color: 'var(--success)', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}
                            title="Dismiss / Resolve"
                          >
                            <Check size={14} /> Dismiss
                          </button>
                        )}
                        {report.reportedListing && report.reportedListing.status !== 'Deleted' && (
                          <button
                            onClick={() => handleRemoveListing(report.reportedListing._id, report.reportedListing.title)}
                            className="btn"
                            style={{ padding: '6px 10px', fontSize: '11px', color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                            title="Delete Listing Override"
                          >
                            <Trash2 size={14} /> Remove Listing
                          </button>
                        )}
                        {report.reportedUser && (
                          <button
                            onClick={() => handleToggleBlockUser(report.reportedUser._id, report.reportedUser.name, report.reportedUser.isBlocked)}
                            className="btn"
                            style={{
                              padding: '6px 10px',
                              fontSize: '11px',
                              color: report.reportedUser.isBlocked ? 'var(--success)' : 'var(--danger)',
                              background: report.reportedUser.isBlocked ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              border: report.reportedUser.isBlocked ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)'
                            }}
                            title={report.reportedUser.isBlocked ? 'Unban User' : 'Ban User'}
                          >
                            <UserX size={14} /> {report.reportedUser.isBlocked ? 'Unban User' : 'Ban User'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

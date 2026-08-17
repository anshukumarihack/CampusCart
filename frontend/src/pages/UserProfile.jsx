import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Star, ShieldAlert, Edit3, Save, X, ShoppingBag, Award, MapPin, Calendar, Camera } from 'lucide-react';

const PRESET_AVATARS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=Felix',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Harley',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Buster',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Shadow',
];

export default function UserProfile() {
  const { id } = useParams();
  const { user: currentUser, token, updateProfile } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [profileUser, setProfileUser] = useState(null);
  const [listings, setListings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [saving, setSaving] = useState(false);

  // Report User state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('Abusive Behavior');
  const [reportDesc, setReportDesc] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const profileId = id || currentUser?.id;
  const isOwnProfile = profileId === currentUser?.id;

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://127.0.0.1:5050/api/users/${profileId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setProfileUser(data.user);
        setListings(data.listings);
        setReviews(data.reviews);

        // Prep edit values
        setEditName(data.user.name);
        setEditAvatar(data.user.avatar || PRESET_AVATARS[0]);
      } else {
        addToast(data.message || 'Failed to load profile', 'error');
        if (!id) navigate('/login');
      }
    } catch (error) {
      console.error('Fetch profile details failed:', error);
      addToast('Server error loading profile details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && profileId) {
      fetchProfileData();
    }
  }, [token, profileId]);

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      addToast('Name cannot be blank.', 'error');
      return;
    }

    setSaving(true);
    try {
      await updateProfile(editName, editAvatar);
      addToast('Profile updated successfully!', 'success');
      setIsEditing(false);
      fetchProfileData();
    } catch (error) {
      addToast(error.message || 'Failed to save changes.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    setSubmittingReport(true);

    try {
      const response = await fetch('http://127.0.0.1:5050/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          reportedUserId: profileId,
          reason: reportReason,
          description: reportDesc
        })
      });

      const data = await response.json();
      if (response.ok) {
        addToast('Report submitted. Administrators will inspect this account.', 'success');
        setShowReportModal(false);
        setReportDesc('');
      } else {
        addToast(data.message || 'Failed to submit report', 'error');
      }
    } catch (error) {
      console.error('Submit report failed:', error);
      addToast('Server error reporting user.', 'error');
    } finally {
      setSubmittingReport(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 'calc(100vh - 73px)',
        color: 'var(--text-secondary)'
      }}>
        Loading Student Profile...
      </div>
    );
  }

  if (!profileUser) return null;

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1000px', margin: '0 auto', minHeight: 'calc(100vh - 73px)' }}>
      {/* Upper Grid Card */}
      <div className="glass-panel" style={{ padding: '40px', display: 'flex', flexWrap: 'wrap', gap: '32px', alignItems: 'center', position: 'relative', marginBottom: '40px' }}>
        {/* Profile Avatar / Photo */}
        <div style={{ position: 'relative' }}>
          <img
            src={profileUser.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=default'}
            alt={profileUser.name}
            style={{ width: '120px', height: '120px', borderRadius: '32px', objectFit: 'cover', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          />
          {isOwnProfile && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              style={{
                position: 'absolute',
                bottom: '-4px',
                right: '-4px',
                background: 'var(--primary)',
                border: 'none',
                color: '#ffffff',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
              }}
            >
              <Camera size={14} />
            </button>
          )}
        </div>

        {/* User metadata */}
        <div style={{ flex: 1, minWidth: '240px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '30px', color: 'var(--text-main)', fontWeight: 700 }}>{profileUser.name}</h1>
            <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', padding: '4px 10px', borderRadius: '20px' }}>
              Student Account
            </span>
          </div>

          <div style={{ display: 'flex', gap: '20px', margin: '16px 0', flexWrap: 'wrap', color: 'var(--text-secondary)', fontSize: '14px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={16} /> {profileUser.college || 'CAMPUS'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={16} /> Joined {new Date(profileUser.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </span>
          </div>

          {/* Rating overview */}
          <div style={{ display: 'flex', gap: '32px', marginTop: '16px' }}>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {profileUser.averageRating.toFixed(1)} <Star size={20} fill="#f59e0b" color="#f59e0b" style={{ display: 'inline' }} />
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>({profileUser.ratingCount} reviews)</span>
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-main)' }}>{listings.length}</div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Active Listings</span>
            </div>
          </div>
        </div>

        {/* Edit details form or report user option */}
        {!isOwnProfile && (
          <button
            onClick={() => setShowReportModal(true)}
            style={{
              position: 'absolute',
              top: '24px',
              right: '24px',
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px'
            }}
          >
            <ShieldAlert size={16} /> Flag User
          </button>
        )}
      </div>

      {/* Edit Mode Panel */}
      {isEditing && isOwnProfile && (
        <div className="glass-panel animate-fade" style={{ padding: '32px', marginBottom: '40px' }}>
          <h3 style={{ fontSize: '18px', color: 'var(--text-main)', marginBottom: '20px' }}>Edit Profile Information</h3>
          <form onSubmit={handleUpdateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Full Name
              </label>
              <input
                type="text"
                className="input-field"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Name"
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Choose Profile Avatar Icon
              </label>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
                {PRESET_AVATARS.map((avatarUrl) => (
                  <img
                    key={avatarUrl}
                    src={avatarUrl}
                    alt="Preset Seed"
                    onClick={() => setEditAvatar(avatarUrl)}
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      border: editAvatar === avatarUrl ? '3px solid var(--primary)' : '2px solid transparent',
                      background: 'rgba(255,255,255,0.03)',
                      transition: 'all 0.15s ease'
                    }}
                  />
                ))}
              </div>
              <input
                type="text"
                className="input-field"
                value={editAvatar}
                onChange={(e) => setEditAvatar(e.target.value)}
                placeholder="Or paste custom image link..."
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '6px' }}
                disabled={saving}
              >
                <Save size={16} /> {saving ? 'Saving...' : 'Save Profile'}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="btn"
                style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-main)' }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Profile Body: Active listings & reviews */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '40px', flexWrap: 'wrap' }}>
        {/* Listings Section */}
        <div>
          <h2 style={{ fontSize: '20px', color: 'var(--text-main)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingBag size={20} style={{ color: 'var(--primary)' }} /> Active Listings ({listings.length})
          </h2>

          {listings.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>This student has no active items for sale.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {listings.map((item) => (
                <Link to={`/listings/${item._id}`} key={item._id} style={{ textDecoration: 'none', display: 'block' }}>
                  <div className="glass-panel card-hover" style={{ padding: '16px', display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <img
                      src={item.images && item.images.length > 0 ? `http://127.0.0.1:5050${item.images[0]}` : 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=400'}
                      alt={item.title}
                      style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '8px' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{ color: 'var(--text-main)', fontSize: '15px', fontWeight: 600, marginBottom: '4px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {item.title}
                      </h4>
                      <span style={{ fontSize: '12px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', padding: '2px 6px', borderRadius: '4px' }}>
                        {item.condition}
                      </span>
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--primary)', flexShrink: 0 }}>
                      ${item.price.toFixed(2)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Reviews Section */}
        <div>
          <h2 style={{ fontSize: '20px', color: 'var(--text-main)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={20} style={{ color: 'var(--primary)' }} /> Student Reviews ({reviews.length})
          </h2>

          {reviews.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No reviews have been written for this student yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {reviews.map((rev) => (
                <div key={rev._id} className="glass-panel" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <img
                        src={rev.reviewer.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=reviewer'}
                        alt={rev.reviewer.name}
                        style={{ width: '24px', height: '24px', borderRadius: '50%' }}
                      />
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>{rev.reviewer.name}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={12}
                          fill={s <= rev.rating ? '#f59e0b' : 'none'}
                          color={s <= rev.rating ? '#f59e0b' : 'rgba(255,255,255,0.1)'}
                        />
                      ))}
                    </div>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4', fontStyle: 'italic' }}>
                    "{rev.comment || 'No comment left'}"
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="glass-panel animate-scale" style={{
            width: '100%',
            maxWidth: '450px',
            padding: '32px',
            position: 'relative'
          }}>
            <button
              onClick={() => setShowReportModal(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '20px', color: 'var(--text-main)', marginBottom: '8px' }}>Report Student Profile</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '24px' }}>
              Report rule violations, scam behavior, or harassment.
            </p>

            <form onSubmit={handleReportSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Reason for Report
                </label>
                <select
                  className="input-field"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}
                >
                  <option value="Abusive Behavior">Abusive Behavior</option>
                  <option value="Fraud">Fraud / Scam</option>
                  <option value="Spam">Spam</option>
                  <option value="Prohibited Item">Prohibited Listing Content</option>
                  <option value="Other">Other Reason</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Additional Information
                </label>
                <textarea
                  className="input-field"
                  value={reportDesc}
                  onChange={(e) => setReportDesc(e.target.value)}
                  placeholder="Give details about the transaction, behavior, or violation..."
                  style={{ minHeight: '100px', resize: 'vertical', padding: '12px' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="btn"
                  style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-main)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '12px' }}
                  disabled={submittingReport}
                >
                  {submittingReport ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

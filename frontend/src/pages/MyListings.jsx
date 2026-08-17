import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Edit2, Trash2, Plus, AlertCircle, ShoppingBag, Eye, DollarSign, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function MyListings() {
  const { token } = useAuth();
  const { addToast } = useToast();

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState(null); // for edit
  const [showEditModal, setShowEditModal] = useState(false);

  // Edit fields state
  const [editTitle, setEditTitle] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editCondition, setEditCondition] = useState('');
  const [editErrors, setEditErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchMyListings = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:5050/api/listings/my', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setListings(data.listings);
      } else {
        addToast(data.message || 'Failed to fetch your listings', 'error');
      }
    } catch (error) {
      console.error('Fetch my listings failed:', error);
      addToast('Server error fetching listings.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchMyListings();
    }
  }, [token]);

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to remove the listing for "${title}"? This cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`http://127.0.0.1:5050/api/listings/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        addToast('Listing removed successfully', 'success');
        setListings((prev) => prev.filter((item) => item._id !== id));
      } else {
        addToast(data.message || 'Failed to delete listing', 'error');
      }
    } catch (error) {
      console.error('Delete listing error:', error);
      addToast('Server error deleting listing.', 'error');
    }
  };

  const openEditModal = (listing) => {
    setSelectedListing(listing);
    setEditTitle(listing.title);
    setEditPrice(listing.price);
    setEditDescription(listing.description);
    setEditCategory(listing.category);
    setEditCondition(listing.condition);
    setEditErrors({});
    setShowEditModal(true);
  };

  const validateEditForm = () => {
    const tempErrors = {};
    if (!editTitle.trim()) tempErrors.title = 'Title is required';
    if (!editDescription.trim()) tempErrors.description = 'Description is required';
    if (!editPrice || parseFloat(editPrice) <= 0) tempErrors.price = 'Price must be greater than 0';
    if (!editCategory) tempErrors.category = 'Category is required';
    if (!editCondition) tempErrors.condition = 'Condition is required';
    setEditErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!validateEditForm()) return;

    setSaving(true);

    try {
      const response = await fetch(`http://127.0.0.1:5050/api/listings/${selectedListing._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: editTitle,
          price: parseFloat(editPrice),
          description: editDescription,
          category: editCategory,
          condition: editCondition,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        addToast('Listing updated successfully', 'success');
        setShowEditModal(false);
        fetchMyListings(); // reload
      } else {
        addToast(data.message || 'Failed to update listing', 'error');
      }
    } catch (error) {
      console.error('Update listing error:', error);
      addToast('Server error updating listing.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto', minHeight: 'calc(100vh - 73px)' }}>
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
          <h1 style={{ fontSize: '32px', color: 'var(--text-main)', marginBottom: '8px' }}>My Listings</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your selling inventory and active offers.</p>
        </div>
        <Link to="/sell" className="btn btn-primary" style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} /> Sell New Item
        </Link>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '24px'
        }}>
          {[1, 2, 3].map((n) => (
            <div key={n} className="skeleton-card" style={{
              height: '350px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div className="skeleton-glow" style={{ height: '180px', borderRadius: 'var(--radius-sm)', background: 'rgba(255, 255, 255, 0.05)' }} />
              <div className="skeleton-glow" style={{ height: '24px', width: '70%', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px' }} />
              <div className="skeleton-glow" style={{ height: '16px', width: '40%', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px' }} />
              <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                <div className="skeleton-glow" style={{ height: '36px', flex: 1, background: 'rgba(255, 255, 255, 0.05)', borderRadius: 'var(--radius-sm)' }} />
                <div className="skeleton-glow" style={{ height: '36px', flex: 1, background: 'rgba(255, 255, 255, 0.05)', borderRadius: 'var(--radius-sm)' }} />
              </div>
            </div>
          ))}
        </div>
      ) : listings.length === 0 ? (
        /* Empty State */
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
            color: 'var(--primary)'
          }}>
            <ShoppingBag size={40} />
          </div>
          <div>
            <h3 style={{ fontSize: '20px', color: 'var(--text-main)', marginBottom: '8px' }}>No Active Listings</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>
              You haven't listed any items for sale yet. Turn your unused textbooks, electronics, or gear into cash!
            </p>
          </div>
          <Link to="/sell" className="btn btn-primary" style={{ padding: '12px 24px' }}>
            List Your First Item
          </Link>
        </div>
      ) : (
        /* Listings Grid */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '24px'
        }}>
          {listings.map((item) => (
            <div key={item._id} className="glass-panel card-hover" style={{
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              padding: '0'
            }}>
              {/* Image Banner */}
              <div style={{ position: 'relative', height: '180px', background: 'rgba(0,0,0,0.2)' }}>
                <img
                  src={item.images && item.images.length > 0 ? `http://127.0.0.1:5050${item.images[0]}` : 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=400'}
                  alt={item.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  backgroundColor: 'rgba(0, 0, 0, 0.65)',
                  backdropFilter: 'blur(4px)',
                  color: 'var(--primary)',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  padding: '4px 10px',
                  borderRadius: '8px'
                }}>
                  ${item.price.toFixed(2)}
                </div>

                <div style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '12px',
                  backgroundColor: item.status === 'Completed' ? 'var(--success-glow)' : 'var(--primary-glow)',
                  border: item.status === 'Completed' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(99, 102, 241, 0.2)',
                  color: item.status === 'Completed' ? 'var(--success)' : 'var(--primary)',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  textTransform: 'uppercase'
                }}>
                  {item.status}
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '18px', color: 'var(--text-main)', marginBottom: '8px', lineClamp: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {item.title}
                </h3>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '11px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: '4px' }}>
                    {item.category}
                  </span>
                  <span style={{ fontSize: '11px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: '4px' }}>
                    {item.condition}
                  </span>
                </div>
                <p style={{
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  lineHeight: '1.4',
                  marginBottom: '20px',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  height: '36px'
                }}>
                  {item.description}
                </p>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                  <Link to={`/listings/${item._id}`} className="btn" style={{ padding: '8px 12px', flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-main)', fontSize: '13px' }}>
                    <Eye size={14} /> View
                  </Link>
                  <button onClick={() => openEditModal(item)} className="btn" style={{ padding: '8px 12px', flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', color: 'var(--primary)', fontSize: '13px' }}>
                    <Edit2 size={14} /> Edit
                  </button>
                  <button onClick={() => handleDelete(item._id, item.title)} className="btn" style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
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
            maxWidth: '550px',
            padding: '32px',
            position: 'relative'
          }}>
            <button
              onClick={() => setShowEditModal(false)}
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

            <h2 style={{ fontSize: '22px', color: 'var(--text-main)', marginBottom: '24px' }}>Edit Listing</h2>

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Item Title
                </label>
                <input
                  type="text"
                  className={`input-field ${editErrors.title ? 'input-error' : ''}`}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="e.g. Organic Chemistry Textbook"
                />
                {editErrors.title && <span style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px', display: 'block' }}>{editErrors.title}</span>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Price ($)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <DollarSign size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="number"
                      className={`input-field ${editErrors.price ? 'input-error' : ''}`}
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      style={{ paddingLeft: '32px' }}
                      step="0.01"
                      placeholder="0.00"
                    />
                  </div>
                  {editErrors.price && <span style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px', display: 'block' }}>{editErrors.price}</span>}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Condition
                  </label>
                  <select
                    className={`input-field ${editErrors.condition ? 'input-error' : ''}`}
                    value={editCondition}
                    onChange={(e) => setEditCondition(e.target.value)}
                    style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}
                  >
                    <option value="">Select Condition</option>
                    <option value="New">New</option>
                    <option value="Like New">Like New</option>
                    <option value="Good">Good</option>
                    <option value="Used">Used</option>
                  </select>
                  {editErrors.condition && <span style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px', display: 'block' }}>{editErrors.condition}</span>}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Category
                </label>
                <select
                  className={`input-field ${editErrors.category ? 'input-error' : ''}`}
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}
                >
                  <option value="">Select Category</option>
                  <option value="Textbooks">Textbooks</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Calculators">Calculators</option>
                  <option value="Furniture">Furniture</option>
                  <option value="Bicycles">Bicycles</option>
                  <option value="Clothing">Clothing</option>
                  <option value="Hostel Essentials">Hostel Essentials</option>
                  <option value="Other">Other</option>
                </select>
                {editErrors.category && <span style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px', display: 'block' }}>{editErrors.category}</span>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Description
                </label>
                <textarea
                  className={`input-field ${editErrors.description ? 'input-error' : ''}`}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Describe your item, meetup details, or reason for selling..."
                  style={{ minHeight: '100px', resize: 'vertical', padding: '12px' }}
                />
                {editErrors.description && <span style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px', display: 'block' }}>{editErrors.description}</span>}
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn"
                  style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-main)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '12px' }}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSS injection for animations */}
      <style>{`
        .skeleton-card {
          animation: skeletonPulse 1.5s infinite ease-in-out;
        }
        @keyframes skeletonPulse {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
        .skeleton-glow {
          position: relative;
          overflow: hidden;
        }
        .skeleton-glow::after {
          content: "";
          position: absolute;
          top: 0; right: 0; bottom: 0; left: 0;
          transform: translateX(-100%);
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.05), transparent);
          animation: skeletonShimmer 1.5s infinite;
        }
        @keyframes skeletonShimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

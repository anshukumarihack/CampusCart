import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Heart, ShoppingBag, Star } from 'lucide-react';

export default function Wishlist() {
  const { token } = useAuth();
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchWishlist = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5050/api/users/wishlist', {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });
      const data = await response.json();
      
      if (response.ok) {
        setWishlist(data.wishlist);
      } else {
        setError(data.message || 'Failed to load wishlist.');
      }
    } catch (err) {
      console.error(err);
      setError('Connection to server failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const handleRemoveFromWishlist = async (e, id) => {
    e.preventDefault(); // Prevent navigating to item details
    e.stopPropagation();

    try {
      const response = await fetch(`http://127.0.0.1:5050/api/users/wishlist/${id}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });
      
      if (response.ok) {
        // Filter out from local state
        setWishlist(prev => prev.filter(item => item._id !== id));
      }
    } catch (err) {
      console.error('Failed to remove from wishlist', err);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 20px' }} className="animate-fade">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '30px' }}>
        <div style={{
          background: 'var(--secondary-gradient)',
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white'
        }}>
          <Heart size={20} fill="white" />
        </div>
        <div>
          <h2 style={{ fontSize: '24px', fontFamily: 'var(--font-title)' }}>My Saved Items</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Manage items you are interested in buying.</p>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Loading saved items...
        </div>
      ) : error ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--danger)' }}>
          {error}
        </div>
      ) : wishlist.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <ShoppingBag size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
          <p style={{ fontSize: '16px', marginBottom: '20px' }}>Your wishlist is currently empty.</p>
          <Link to="/" className="btn btn-primary">
            Explore Marketplace
          </Link>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '24px'
        }}>
          {wishlist.map(item => (
            <Link 
              to={`/listings/${item._id}`} 
              key={item._id}
              className="glass-panel animate-scale"
              style={{
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                height: '100%',
                position: 'relative'
              }}
            >
              {/* Product Card Image Wrapper */}
              <div style={{
                height: '180px',
                width: '100%',
                background: 'var(--bg-input)',
                position: 'relative',
                borderBottom: '1px solid var(--border-color)',
                overflow: 'hidden'
              }}>
                {item.images && item.images.length > 0 ? (
                  <img 
                    src={`http://127.0.0.1:5050${item.images[0]}`} 
                    alt={item.title} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    No Image
                  </div>
                )}
                
                {/* Condition Badge */}
                <div style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 1 }}>
                  <span className="badge badge-listed">{item.condition}</span>
                </div>

                {/* Price Tag */}
                <div style={{ position: 'absolute', bottom: '12px', right: '12px', zIndex: 1 }}>
                  <span style={{ 
                    background: 'var(--bg-main)',
                    color: 'var(--text-main)',
                    fontWeight: 'bold',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    border: '1px solid var(--border-color)'
                  }}>
                    {item.price === 0 ? 'Free' : `$${item.price.toFixed(2)}`}
                  </span>
                </div>

                {/* Remove button */}
                <button 
                  onClick={(e) => handleRemoveFromWishlist(e, item._id)}
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: 'rgba(239, 68, 68, 0.2)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: 'var(--danger)',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 2,
                    transition: 'var(--transition)'
                  }}
                  title="Remove from saved items"
                  onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <Heart size={16} fill="var(--danger)" />
                </button>
              </div>

              {/* Product Info Description */}
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1, gap: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--primary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  {item.category}
                </span>
                
                <h3 style={{ 
                  fontSize: '15px', 
                  color: 'var(--text-main)', 
                  fontWeight: 700,
                  lineHeight: '1.4'
                }}>
                  {item.title}
                </h3>

                {/* Seller Bio Details */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  marginTop: 'auto', 
                  paddingTop: '12px',
                  borderTop: '1px solid var(--border-color)' 
                }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    By {item.owner.name}
                  </span>

                  {item.owner.averageRating > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: 'var(--warning)', fontSize: '11px', fontWeight: 'bold' }}>
                      <Star size={12} fill="var(--warning)" />
                      <span>{item.owner.averageRating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

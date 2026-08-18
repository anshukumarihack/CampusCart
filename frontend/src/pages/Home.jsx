import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Search, 
  SlidersHorizontal, 
  BookOpen, 
  Laptop, 
  Cpu, 
  Armchair, 
  Bike, 
  Shirt, 
  Home as HomeIcon, 
  Sparkles,
  Star,
  Pencil
} from 'lucide-react';

const CATEGORY_ICONS = {
  'Stationery': <Pencil size={16} />,
  'Electronics': <Laptop size={16} />,
  'Calculators': <Cpu size={16} />,
  'Furniture': <Armchair size={16} />,
  'Vehicles': <Bike size={16} />,
  'Clothing': <Shirt size={16} />,
  'Hostel Essentials': <HomeIcon size={16} />,
  'Other': <Sparkles size={16} />
};

const CATEGORIES = Object.keys(CATEGORY_ICONS);

export default function Home() {
  const { user } = useAuth();
  
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter states
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCondition, setSelectedCondition] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [modeFilter, setModeFilter] = useState('All'); // 'All', 'Buy', 'Rent'
  
  const [showFilters, setShowFilters] = useState(false);

  const fetchListings = async () => {
    setLoading(true);
    try {
      // Build query string
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedCondition) params.append('condition', selectedCondition);
      if (minPrice) params.append('minPrice', minPrice);
      if (maxPrice) params.append('maxPrice', maxPrice);
      if (sortBy) params.append('sortBy', sortBy);
      if (modeFilter === 'Buy') params.append('listingType', 'Sale');
      if (modeFilter === 'Rent') params.append('listingType', 'Rent');

      const response = await fetch(`http://127.0.0.1:5050/api/listings?${params.toString()}`);
      const data = await response.json();
      
      if (response.ok) {
        setListings(data.listings);
      } else {
        setError(data.message || 'Failed to load listings');
      }
    } catch (err) {
      console.error(err);
      setError('Connection to backend failed.');
    } finally {
      setLoading(false);
    }
  };

  // Debounced search / trigger on parameters change
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchListings();
    }, 300); // 300ms debounce for text search input

    return () => clearTimeout(delayDebounceFn);
  }, [search, selectedCategory, selectedCondition, minPrice, maxPrice, sortBy, modeFilter]);

  const clearFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setSelectedCondition('');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('newest');
    setModeFilter('All');
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 20px' }} className="animate-fade">
      {/* Banner / Header Hero */}
      <div className="glass-panel" style={{ 
        padding: '50px 40px', 
        textAlign: 'center', 
        marginBottom: '40px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <h1 style={{ fontSize: '34px', marginBottom: '12px', fontFamily: 'var(--font-title)', fontWeight: 700, color: 'var(--text-main)' }}>
          Campus peer-to-peer <span style={{ color: 'var(--primary)' }}>negotiable marketplace</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px', maxWidth: '650px', margin: '0 auto 24px auto', lineHeight: '1.6' }}>
          Exclusively for verified students. Buy used stationery, calculators, furniture, or hostel essentials directly from fellow students. Secure online card payments & price negotiations.
        </p>

        {/* Big Search Bar */}
        <div style={{ 
          maxWidth: '650px', 
          margin: '0 auto', 
          display: 'flex', 
          gap: '12px',
          position: 'relative',
          zIndex: 1
        }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="input-field"
              placeholder="Search listings by stationery, vehicles, calculators..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '48px', height: '48px' }}
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-secondary" 
            style={{ padding: '0 16px', height: '48px', display: 'flex', gap: '8px' }}
          >
            <SlidersHorizontal size={18} />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* Marketplace Mode Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        {['All', 'Buy', 'Rent'].map((tab) => (
          <button
            key={tab}
            onClick={() => setModeFilter(tab)}
            style={{
              padding: '10px 24px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: modeFilter === tab ? 'var(--primary-gradient)' : 'transparent',
              color: modeFilter === tab ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '15px',
              cursor: 'pointer',
              transition: 'var(--transition)'
            }}
          >
            {tab === 'All' ? '🌐 All Listings' : tab === 'Buy' ? '🛒 Buy Items' : '🏠 Rental Deals'}
          </button>
        ))}
      </div>

      {/* Category Horizontal Scrolling Tags */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        overflowX: 'auto', 
        paddingBottom: '15px', 
        marginBottom: '30px',
        scrollbarWidth: 'none', // Firefox
        msOverflowStyle: 'none' // IE/Edge
      }}>
        <button
          onClick={() => setSelectedCategory('')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderRadius: 'var(--radius-full)',
            background: selectedCategory === '' ? 'var(--primary-gradient)' : 'var(--bg-card)',
            border: '1px solid',
            borderColor: selectedCategory === '' ? 'transparent' : 'var(--border-color)',
            color: selectedCategory === '' ? '#ffffff' : 'var(--text-main)',
            fontWeight: 600,
            fontSize: '14px',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            transition: 'var(--transition)'
          }}
        >
          All Items
        </button>

        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: 'var(--radius-full)',
              background: selectedCategory === cat ? 'var(--primary-gradient)' : 'var(--bg-card)',
              border: '1px solid',
              borderColor: selectedCategory === cat ? 'transparent' : 'var(--border-color)',
              color: selectedCategory === cat ? '#ffffff' : 'var(--text-main)',
              fontWeight: 600,
              fontSize: '14px',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              transition: 'var(--transition)'
            }}
          >
            {CATEGORY_ICONS[cat]}
            {cat}
          </button>
        ))}
      </div>

      {/* Filters Expansion Drawer */}
      {showFilters && (
        <div className="glass-panel animate-fade" style={{ padding: '24px', marginBottom: '30px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', alignItems: 'end' }}>
            {/* Condition */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Item Condition
              </label>
              <select 
                className="input-field"
                value={selectedCondition}
                onChange={(e) => setSelectedCondition(e.target.value)}
              >
                <option value="">Any Condition</option>
                <option value="New">New</option>
                <option value="Like New">Like New</option>
                <option value="Good">Good</option>
                <option value="Used">Used</option>
              </select>
            </div>

            {/* Min Price */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Min Price ($)
              </label>
              <input 
                type="number"
                className="input-field"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                min="0"
              />
            </div>

            {/* Max Price */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Max Price ($)
              </label>
              <input 
                type="number"
                className="input-field"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                min="0"
              />
            </div>

            {/* Sort */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Sort By
              </label>
              <select 
                className="input-field"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">Newest First</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </div>

            {/* Reset Filters */}
            <div>
              <button 
                onClick={clearFilters}
                className="btn btn-secondary" 
                style={{ width: '100%', padding: '12px' }}
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid View */}
      {loading ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '24px'
        }}>
          {[1, 2, 3, 4].map((n) => (
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
              <div className="skeleton-glow" style={{ height: '24px', width: '75%', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px' }} />
              <div className="skeleton-glow" style={{ height: '16px', width: '45%', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px' }} />
              <div className="skeleton-glow" style={{ height: '36px', width: '90%', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', marginTop: 'auto' }} />
            </div>
          ))}
          
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
      ) : error ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--danger)' }}>
          {error}
        </div>
      ) : listings.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <p style={{ fontSize: '18px', marginBottom: '16px' }}>No active listings found matching your search parameters.</p>
          <button onClick={clearFilters} className="btn btn-primary">Clear Search & Filters</button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '24px'
        }}>
          {listings.map(item => (
            <Link 
              to={`/listings/${item._id}`} 
              key={item._id}
              className="glass-panel animate-scale"
              style={{
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                height: '100%',
                transition: 'var(--transition)'
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
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  />
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    No Image Provided
                  </div>
                )}
                
                {/* Condition Badge */}
                <div style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 1 }}>
                  <span className="badge badge-listed" style={{ 
                    backdropFilter: 'blur(8px)',
                    background: 'rgba(99, 102, 241, 0.15)',
                    border: '1px solid rgba(99, 102, 241, 0.3)'
                  }}>
                    {item.condition}
                  </span>
                </div>

                {/* Mode Badge */}
                <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 1 }}>
                  <span style={{ 
                    backdropFilter: 'blur(8px)',
                    background: item.listingType === 'Rent' ? 'rgba(16, 185, 129, 0.15)' : item.listingType === 'Both' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                    color: item.listingType === 'Rent' ? 'var(--success)' : item.listingType === 'Both' ? 'var(--warning)' : 'var(--primary)',
                    border: '1px solid currentColor',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '4px 8px',
                    borderRadius: '4px'
                  }}>
                    {item.listingType === 'Rent' ? '🏠 RENT' : item.listingType === 'Both' ? '🔄 SALE + RENT' : '🛒 SALE'}
                  </span>
                </div>

                {/* Price Tag */}
                <div style={{ position: 'absolute', bottom: '12px', right: '12px', zIndex: 1 }}>
                  <span style={{ 
                    background: 'var(--bg-main)',
                    color: 'var(--text-main)',
                    fontWeight: 'bold',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    boxShadow: 'var(--card-shadow)',
                    border: '1px solid var(--border-color)',
                    whiteSpace: 'nowrap'
                  }}>
                    {item.listingType === 'Rent' 
                      ? `$${item.rentalPrice}/${item.rentalPriceUnit}`
                      : item.listingType === 'Both'
                        ? `$${item.price ? item.price.toFixed(2) : 0} | $${item.rentalPrice}/${item.rentalPriceUnit}`
                        : (item.price === 0 ? 'Free' : `$${item.price.toFixed(2)}`)}
                  </span>
                </div>
              </div>

              {/* Product Info Description */}
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1, gap: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--primary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  {item.category}
                </span>
                
                <h3 style={{ 
                  fontSize: '16px', 
                  color: 'var(--text-main)', 
                  fontWeight: 700,
                  lineHeight: '1.4',
                  maxHeight: '44px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical'
                }}>
                  {item.title}
                </h3>

                <p style={{ 
                  fontSize: '13px', 
                  color: 'var(--text-secondary)',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  height: '36px',
                  lineHeight: '1.4'
                }}>
                  {item.description}
                </p>

                {/* Rental Details Sub-Info */}
                {['Rent', 'Both'].includes(item.listingType) && (
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '2px', padding: '6px 10px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)' }}>
                    <div>💰 Deposit: <strong>${item.securityDeposit || 0}</strong></div>
                    {item.availableFrom && item.availableUntil && (
                      <div>📅 Available: <strong>{new Date(item.availableFrom).toLocaleDateString([], {day: 'numeric', month: 'short'})} – {new Date(item.availableUntil).toLocaleDateString([], {day: 'numeric', month: 'short'})}</strong></div>
                    )}
                  </div>
                )}

                {/* Seller Bio Details */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  marginTop: 'auto', 
                  paddingTop: '12px',
                  borderTop: '1px solid var(--border-color)' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'var(--bg-panel)',
                      color: 'var(--primary)',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden'
                    }}>
                      {item.owner.avatar ? (
                        <img src={item.owner.avatar} alt="seller" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        item.owner.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>{item.owner.name}</span>
                  </div>

                  {/* Rating Stars */}
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

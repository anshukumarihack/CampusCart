import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Heart, 
  MessageSquare, 
  Trash2, 
  Star, 
  DollarSign, 
  Calendar, 
  Tag, 
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CreditCard
} from 'lucide-react';

export default function ListingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token, setUser } = useAuth();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Gallery state
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Wishlist state
  const [isWishlisted, setIsWishlisted] = useState(false);

  // Offer states
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [offerLoading, setOfferLoading] = useState(false);
  const [offerSuccess, setOfferSuccess] = useState('');
  const [offerError, setOfferError] = useState('');

  // Rental specific states
  const [listingMode, setListingMode] = useState('Sale'); // 'Sale' or 'Rental'
  const [rentalStartDate, setRentalStartDate] = useState('');
  const [rentalEndDate, setRentalEndDate] = useState('');

  // Direct Purchase state
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  // Flag/Report states
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSuccess, setReportSuccess] = useState('');
  const [reportError, setReportError] = useState('');

  // Fetch listing data
  const fetchListingDetails = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:5050/api/listings/${id}`);
      const data = await response.json();

      if (response.ok) {
        setListing(data.listing);
        if (data.listing.listingType === 'Rent') {
          setListingMode('Rental');
          setOfferAmount(data.listing.rentalPrice.toString());
        } else {
          setListingMode('Sale');
          setOfferAmount(data.listing.price ? data.listing.price.toString() : '');
        }
        // Set wishlist state based on user data
        if (user && user.wishlist) {
          setIsWishlisted(user.wishlist.includes(data.listing._id));
        }
      } else {
        setError(data.message || 'Listing not found.');
      }
    } catch (err) {
      console.error(err);
      setError('Connection to server failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchListingDetails();
    }
  }, [id]);

  const handleToggleWishlist = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`http://127.0.0.1:5050/api/users/wishlist/${listing._id}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });
      const data = await response.json();

      if (response.ok) {
        setIsWishlisted(data.isWishlisted);
        // Sync wishlist in Auth Context
        setUser({ ...user, wishlist: data.wishlist });
      }
    } catch (err) {
      console.error('Toggle wishlist failed', err);
    }
  };

  const handleDeleteListing = async () => {
    if (!window.confirm('Are you sure you want to delete this listing? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`http://127.0.0.1:5050/api/listings/${listing._id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });
      
      const data = await response.json();
      if (response.ok) {
        alert('Listing removed successfully.');
        navigate('/');
      } else {
        alert(data.message || 'Failed to remove listing.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to connect to server.');
    }
  };

  const getRentalDuration = () => {
    if (!rentalStartDate || !rentalEndDate) return 0;
    const start = new Date(rentalStartDate);
    const end = new Date(rentalEndDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleMakeOffer = async (e) => {
    e.preventDefault();
    if (!offerAmount || parseFloat(offerAmount) < 0) {
      setOfferError('Please enter a valid offer amount.');
      return;
    }

    if (listingMode === 'Rental') {
      if (!rentalStartDate || !rentalEndDate) {
        setOfferError('Please select both start date and end date.');
        return;
      }
      const duration = getRentalDuration();
      if (listing.minimumRentalDuration && duration < listing.minimumRentalDuration) {
        setOfferError(`Minimum rental duration is ${listing.minimumRentalDuration} days.`);
        return;
      }
      if (listing.maximumRentalDuration && duration > listing.maximumRentalDuration) {
        setOfferError(`Maximum rental duration is ${listing.maximumRentalDuration} days.`);
        return;
      }
    }

    setOfferLoading(true);
    setOfferError('');
    setOfferSuccess('');

    try {
      const body = {
        listingId: listing._id,
        amount: parseFloat(offerAmount),
        message: offerMessage,
        offerType: listingMode === 'Rental' ? 'Rental' : 'Sale',
      };

      if (listingMode === 'Rental') {
        const duration = getRentalDuration();
        const dailyPrice = parseFloat(offerAmount);
        const rentalCost = duration * dailyPrice;
        const deposit = listing.securityDeposit || 0;
        
        body.rentalStartDate = rentalStartDate;
        body.rentalEndDate = rentalEndDate;
        body.rentalDuration = duration;
        body.rentalAmount = rentalCost;
        body.securityDeposit = deposit;
        body.totalAmount = rentalCost + deposit;
      }

      const response = await fetch('http://127.0.0.1:5050/api/offers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (response.ok) {
        setOfferSuccess(listingMode === 'Rental'
          ? 'Your rental request has been sent successfully!'
          : 'Your negotiation offer was sent to the seller successfully!'
        );
        setOfferAmount('');
        setOfferMessage('');
        setRentalStartDate('');
        setRentalEndDate('');
        // Automatically redirect to chat after 2 seconds
        setTimeout(() => {
          navigate(`/chat?listingId=${listing._id}&buyerId=${user.id || user._id}`);
        }, 2000);
      } else {
        setOfferError(data.message || 'Failed to send offer.');
      }
    } catch (err) {
      console.error(err);
      setOfferError('Failed to connect to server.');
    } finally {
      setOfferLoading(false);
    }
  };

  const handleDirectPurchase = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setPurchaseLoading(true);
    setOfferError('');
    setOfferSuccess('');
    try {
      const response = await fetch(`http://127.0.0.1:5050/api/payments/direct-checkout/${listing._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setOfferError(data.message || 'Direct checkout initialization failed');
      }
    } catch (err) {
      console.error('Direct purchase error:', err);
      setOfferError('Failed to connect to payment server.');
    } finally {
      setPurchaseLoading(false);
    }
  };

  const handleReportListing = async (e) => {
    e.preventDefault();
    if (!reportReason) {
      setReportError('Please select a reason.');
      return;
    }

    setReportLoading(true);
    setReportError('');
    setReportSuccess('');

    try {
      const response = await fetch('http://127.0.0.1:5050/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          reportedListingId: listing._id,
          reportedUserId: listing.owner._id,
          reason: reportReason,
          description: reportDescription,
        })
      });

      const data = await response.json();
      if (response.ok) {
        setReportSuccess('Thank you. The listing has been flagged for admin review.');
        setReportReason('');
        setReportDescription('');
        setTimeout(() => {
          setShowReportModal(false);
          setReportSuccess('');
        }, 3000);
      } else {
        setReportError(data.message || 'Report submission failed.');
      }
    } catch (err) {
      console.error(err);
      setReportError('Connection to server failed.');
    } finally {
      setReportLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '80px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading listing details...
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px', textAlign: 'center' }}>
        <div className="glass-panel" style={{ padding: '40px', color: 'var(--danger)' }}>
          <h3>Error</h3>
          <p style={{ marginTop: '10px' }}>{error || 'Listing not found.'}</p>
          <Link to="/" className="btn btn-secondary" style={{ marginTop: '20px', display: 'inline-flex' }}>
            Back to Catalog
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = user && (listing.owner._id === user.id || listing.owner._id === user._id);

  return (
    <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 20px' }} className="animate-fade">
      {/* Breadcrumb / Back button */}
      <div style={{ marginBottom: '20px' }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '14px', transition: 'var(--transition)' }}>
          <ChevronLeft size={16} />
          <span>Back to Marketplace</span>
        </Link>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '40px',
        alignItems: 'start'
      }}>
        {/* Left Side: Images Gallery */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="glass-panel" style={{
            height: '400px',
            width: '100%',
            position: 'relative',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {listing.images && listing.images.length > 0 ? (
              <>
                <img 
                  src={`http://127.0.0.1:5050${listing.images[activeImageIndex]}`} 
                  alt={listing.title} 
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
                
                {/* Carousel Navigation Arrows */}
                {listing.images.length > 1 && (
                  <>
                    <button 
                      onClick={() => setActiveImageIndex(prev => prev === 0 ? listing.images.length - 1 : prev - 1)}
                      style={{
                        position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
                        background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', width: '36px', height: '36px',
                        borderRadius: '50%', display: 'flex', alignItems: 'center', justify: 'center', cursor: 'pointer'
                      }}
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button 
                      onClick={() => setActiveImageIndex(prev => prev === listing.images.length - 1 ? 0 : prev + 1)}
                      style={{
                        position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)',
                        background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', width: '36px', height: '36px',
                        borderRadius: '50%', display: 'flex', alignItems: 'center', justify: 'center', cursor: 'pointer'
                      }}
                    >
                      <ChevronRight size={20} />
                    </button>
                  </>
                )}
              </>
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>No images available</span>
            )}

            {/* Wishlist Button Overlay */}
            {!isOwner && (
              <button 
                onClick={handleToggleWishlist}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'rgba(11, 15, 25, 0.7)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid var(--border-color)',
                  color: isWishlisted ? 'var(--secondary)' : 'var(--text-secondary)',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'var(--transition)'
                }}
              >
                <Heart size={20} fill={isWishlisted ? 'var(--secondary)' : 'none'} />
              </button>
            )}
          </div>

          {/* Gallery Thumbnails */}
          {listing.images && listing.images.length > 1 && (
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' }}>
              {listing.images.map((img, index) => (
                <div 
                  key={index}
                  onClick={() => setActiveImageIndex(index)}
                  style={{
                    width: '70px',
                    height: '70px',
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: '2px solid',
                    borderColor: activeImageIndex === index ? 'var(--primary)' : 'transparent',
                    background: 'var(--bg-input)',
                    transition: 'var(--transition)'
                  }}
                >
                  <img src={`http://127.0.0.1:5050${img}`} alt="thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Product Details & Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <span className="badge badge-listed">{listing.condition}</span>
              <span className="badge" style={{ backgroundColor: 'var(--bg-panel)', color: 'var(--text-secondary)' }}>
                {listing.category}
              </span>
            </div>

            <h1 style={{ fontSize: '32px', marginBottom: '8px', fontFamily: 'var(--font-title)', color: 'var(--text-main)' }}>
              {listing.title}
            </h1>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '24px', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-title)' }}>
              {listing.listingType === 'Rent' ? (
                <div>🏠 ${listing.rentalPrice.toFixed(2)} / {listing.rentalPriceUnit}</div>
              ) : listing.listingType === 'Both' ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
                  <span>🛒 ${listing.price ? listing.price.toFixed(2) : 0}</span>
                  <span style={{ fontSize: '18px', fontWeight: 'normal', color: 'var(--text-muted)' }}>or</span>
                  <span>🏠 ${listing.rentalPrice.toFixed(2)} / {listing.rentalPriceUnit}</span>
                </div>
              ) : (
                <div>🛒 {listing.price === 0 ? 'Free' : `$${listing.price.toFixed(2)}`}</div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '10px', color: 'var(--text-main)' }}>Description</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
              {listing.description}
            </p>
          </div>

          {/* Seller Profile Card */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              background: 'var(--bg-panel)',
              color: 'var(--primary)',
              fontWeight: 'bold',
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}>
              {listing.owner.avatar ? (
                <img src={listing.owner.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                listing.owner.name.charAt(0).toUpperCase()
              )}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{listing.owner.name}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={12} style={{ color: 'var(--success)' }} />
                  Verified Student
                </span>
              </div>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{listing.owner.email}</span>
            </div>

            {listing.owner.averageRating > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--warning)', fontWeight: 'bold' }}>
                  <Star size={16} fill="var(--warning)" />
                  <span>{listing.owner.averageRating.toFixed(1)}</span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({listing.owner.ratingCount} reviews)</span>
              </div>
            ) : (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No reviews yet</span>
            )}
          </div>

          {/* Action Boxes */}
          {isOwner ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{
                padding: '16px',
                backgroundColor: 'rgba(99, 102, 241, 0.05)',
                border: '1px dashed var(--primary)',
                borderRadius: 'var(--radius-md)',
                fontSize: '14px',
                color: 'var(--text-secondary)',
                textAlign: 'center'
              }}>
                This is your listing. You can manage or delete this listing below.
              </div>
              <button 
                onClick={handleDeleteListing}
                className="btn btn-danger" 
                style={{ padding: '12px', display: 'flex', gap: '8px', width: '100%' }}
              >
                <Trash2 size={18} />
                <span>Remove Listing</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Buy / Rent Toggle Tabs if Both is selected */}
              {listing.listingType === 'Both' && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => {
                      setListingMode('Sale');
                      setOfferAmount(listing.price ? listing.price.toString() : '');
                    }}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      background: listingMode === 'Sale' ? 'var(--primary-gradient)' : 'var(--bg-input)',
                      color: listingMode === 'Sale' ? 'white' : 'var(--text-main)',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    🛒 Buy Mode
                  </button>
                  <button
                    onClick={() => {
                      setListingMode('Rental');
                      setOfferAmount(listing.rentalPrice.toString());
                    }}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      background: listingMode === 'Rental' ? 'var(--primary-gradient)' : 'var(--bg-input)',
                      color: listingMode === 'Rental' ? 'white' : 'var(--text-main)',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    🏠 Rent Mode
                  </button>
                </div>
              )}

              {listingMode === 'Rental' && (
                <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid var(--success-glow)' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                    <Calendar size={16} /> Rental Booking Details
                  </h4>
                  
                  {listing.availableFrom && listing.availableUntil && (
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Available Dates: <strong>{new Date(listing.availableFrom).toLocaleDateString()}</strong> to <strong>{new Date(listing.availableUntil).toLocaleDateString()}</strong>
                    </div>
                  )}
                  {listing.minimumRentalDuration && (
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Min Duration: {listing.minimumRentalDuration} days | Max Duration: {listing.maximumRentalDuration || 'No limit'} days
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Start Date</label>
                      <input 
                        type="date"
                        className="input-field"
                        value={rentalStartDate}
                        onChange={(e) => setRentalStartDate(e.target.value)}
                        min={listing.availableFrom ? new Date(listing.availableFrom).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                        max={listing.availableUntil ? new Date(listing.availableUntil).toISOString().split('T')[0] : undefined}
                        style={{ height: '36px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>End Date</label>
                      <input 
                        type="date"
                        className="input-field"
                        value={rentalEndDate}
                        onChange={(e) => setRentalEndDate(e.target.value)}
                        min={rentalStartDate || (listing.availableFrom ? new Date(listing.availableFrom).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])}
                        max={listing.availableUntil ? new Date(listing.availableUntil).toISOString().split('T')[0] : undefined}
                        style={{ height: '36px' }}
                      />
                    </div>
                  </div>

                  {getRentalDuration() > 0 && (
                    <div style={{ padding: '12px', borderRadius: '6px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justify: 'space-between' }}>
                        <span>Duration:</span>
                        <strong>{getRentalDuration()} days</strong>
                      </div>
                      <div style={{ display: 'flex', justify: 'space-between' }}>
                        <span>Rental Rate:</span>
                        <strong>${parseFloat(offerAmount || listing.rentalPrice).toFixed(2)} / {listing.rentalPriceUnit}</strong>
                      </div>
                      <div style={{ display: 'flex', justify: 'space-between', color: 'var(--text-main)', borderTop: '1px solid var(--border-color)', paddingTop: '6px' }}>
                        <span>Rental Charges:</span>
                        <strong>${(getRentalDuration() * parseFloat(offerAmount || listing.rentalPrice)).toFixed(2)}</strong>
                      </div>
                      <div style={{ display: 'flex', justify: 'space-between', color: 'var(--text-muted)' }}>
                        <span>Refundable Deposit:</span>
                        <strong>${(listing.securityDeposit || 0).toFixed(2)}</strong>
                      </div>
                      <div style={{ display: 'flex', justify: 'space-between', color: 'var(--success)', borderTop: '1px solid var(--border-color)', paddingTop: '6px', fontSize: '15px', fontWeight: 'bold' }}>
                        <span>Total Payable:</span>
                        <span>${((getRentalDuration() * parseFloat(offerAmount || listing.rentalPrice)) + (listing.securityDeposit || 0)).toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  {listing.rentalTerms && (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                      <strong>Terms:</strong> {listing.rentalTerms}
                    </div>
                  )}
                </div>
              )}

              {/* Direct Purchase (Buy Now) - Show only in Sale mode */}
              {listingMode === 'Sale' && (
                <button 
                  onClick={handleDirectPurchase}
                  className="btn btn-primary"
                  style={{ padding: '12px', width: '100%', gap: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  disabled={purchaseLoading}
                >
                  <CreditCard size={18} />
                  <span>{purchaseLoading ? 'Redirecting to Payment...' : 'Buy Now (Direct Checkout)'}</span>
                </button>
              )}

              {/* Message Seller */}
              <Link 
                to={`/chat?listingId=${listing._id}&buyerId=${user ? (user.id || user._id) : ''}`}
                className="btn btn-secondary"
                style={{ padding: '12px', width: '100%' }}
              >
                <MessageSquare size={18} />
                <span>{listingMode === 'Rental' ? 'Chat with Owner' : 'Chat with Seller'}</span>
              </Link>

              {/* Price Negotiation (Make Offer) */}
              <div className="glass-panel" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)', marginTop: 0 }}>
                  <Sparkles size={16} style={{ color: 'var(--primary)' }} />
                  {listingMode === 'Rental' ? 'Request Rental Booking' : 'Propose Price Offer'}
                </h3>

                {offerSuccess && (
                  <div style={{
                    backgroundColor: 'var(--success-glow)', color: 'var(--success)', padding: '12px',
                    borderRadius: 'var(--radius-sm)', fontSize: '13px', marginBottom: '16px'
                  }}>
                    {offerSuccess}
                  </div>
                )}

                {offerError && (
                  <div style={{
                    backgroundColor: 'var(--danger-glow)', color: 'var(--danger)', padding: '12px',
                    borderRadius: 'var(--radius-sm)', fontSize: '13px', marginBottom: '16px'
                  }}>
                    {offerError}
                  </div>
                )}

                <form onSubmit={handleMakeOffer} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      {listingMode === 'Rental' ? 'Proposed Price per Day ($)' : 'Proposed Amount ($)'}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <DollarSign size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="number"
                        className="input-field"
                        placeholder={listingMode === 'Rental' ? listing.rentalPrice.toFixed(2) : (listing.price ? listing.price.toFixed(2) : '0')}
                        value={offerAmount}
                        onChange={(e) => setOfferAmount(e.target.value)}
                        style={{ paddingLeft: '32px', height: '40px' }}
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      Message (Optional)
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder={listingMode === 'Rental' ? "e.g. I will keep it clean and return on time." : "e.g. Can meet in front of the Library tomorrow at 2 PM?"}
                      value={offerMessage}
                      onChange={(e) => setOfferMessage(e.target.value)}
                      style={{ height: '40px' }}
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ padding: '12px', width: '100%', fontSize: '14px' }}
                    disabled={offerLoading}
                  >
                    {offerLoading ? 'Submitting request...' : (listingMode === 'Rental' ? 'Send Rental Request' : 'Send Negotiation Offer')}
                  </button>
                </form>
              </div>
              <button 
                onClick={() => setShowReportModal(true)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', fontSize: '12px', alignSelf: 'center',
                  marginTop: '10px', transition: 'var(--transition)'
                }}
                onMouseOver={(e) => e.currentTarget.style.color = 'var(--danger)'}
                onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                Flag this listing as suspicious
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Flag Report Modal Overlay */}
      {showReportModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '20px',
          backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-panel animate-scale" style={{ width: '100%', maxWidth: '450px', padding: '30px', background: 'var(--bg-main)' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '10px', color: 'var(--text-main)' }}>Flag Listing</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Help us keep the campus community safe. If this listing is spam, duplicate, fraudulent, or abusive, let the moderators know.
            </p>

            {reportSuccess && (
              <div style={{ backgroundColor: 'var(--success-glow)', color: 'var(--success)', padding: '10px', borderRadius: 'var(--radius-sm)', fontSize: '13px', marginBottom: '15px' }}>
                {reportSuccess}
              </div>
            )}
            
            {reportError && (
              <div style={{ backgroundColor: 'var(--danger-glow)', color: 'var(--danger)', padding: '10px', borderRadius: 'var(--radius-sm)', fontSize: '13px', marginBottom: '15px' }}>
                {reportError}
              </div>
            )}

            <form onSubmit={handleReportListing} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Reason</label>
                <select 
                  className="input-field"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  required
                >
                  <option value="">Select Reason</option>
                  <option value="Fraud">Fraud / Scam</option>
                  <option value="Spam">Spam / Duplicate</option>
                  <option value="Prohibited Item">Prohibited Item</option>
                  <option value="Abusive Behavior">Abusive Behavior</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Details</label>
                <textarea 
                  className="input-field"
                  placeholder="Provide additional details..."
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowReportModal(false)} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px', background: 'var(--danger)' }} disabled={reportLoading}>
                  {reportLoading ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

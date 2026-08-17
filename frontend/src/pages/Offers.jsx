import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { MessageSquare, Check, X, ShieldAlert, Award, ArrowUpRight, ArrowDownLeft, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Offers() {
  const { token, user } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('received'); // 'received' | 'sent'
  const [receivedOffers, setReceivedOffers] = useState([]);
  const [sentOffers, setSentOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Counter offer state
  const [counteringOfferId, setCounteringOfferId] = useState(null);
  const [counterPrice, setCounterPrice] = useState('');
  const [submittingCounter, setSubmittingCounter] = useState(false);

  const fetchOffers = async () => {
    setLoading(true);
    try {
      // Fetch received offers
      const resReceived = await fetch('http://127.0.0.1:5050/api/offers/received', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const dataReceived = await resReceived.json();

      // Fetch sent offers
      const resSent = await fetch('http://127.0.0.1:5050/api/offers/sent', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const dataSent = await resSent.json();

      if (resReceived.ok && resSent.ok) {
        setReceivedOffers(dataReceived.offers);
        setSentOffers(dataSent.offers);
      } else {
        addToast('Failed to fetch offers data', 'error');
      }
    } catch (error) {
      console.error('Fetch offers error:', error);
      addToast('Server error loading offers.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchOffers();
    }
  }, [token]);

  const handleRespond = async (offerId, responseStatus) => {
    try {
      const response = await fetch(`http://127.0.0.1:5050/api/offers/${offerId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: responseStatus })
      });

      const data = await response.json();
      if (response.ok) {
        addToast(`Offer ${responseStatus.toLowerCase()} successfully`, 'success');
        fetchOffers(); // reload
      } else {
        addToast(data.message || 'Failed to submit response', 'error');
      }
    } catch (error) {
      console.error('Offer respond error:', error);
      addToast('Server error processing response.', 'error');
    }
  };

  const handleCounterSubmit = async (e) => {
    e.preventDefault();
    if (!counterPrice || parseFloat(counterPrice) <= 0) {
      addToast('Please enter a valid price.', 'error');
      return;
    }

    setSubmittingCounter(true);

    try {
      const response = await fetch(`http://127.0.0.1:5050/api/offers/${counteringOfferId}/counter`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ counterAmount: parseFloat(counterPrice) })
      });

      const data = await response.json();
      if (response.ok) {
        addToast('Counter-offer proposed successfully!', 'success');
        setCounteringOfferId(null);
        setCounterPrice('');
        fetchOffers();
      } else {
        addToast(data.message || 'Failed to propose counter-offer', 'error');
      }
    } catch (error) {
      console.error('Counter offer error:', error);
      addToast('Server error proposing counter-offer.', 'error');
    } finally {
      setSubmittingCounter(false);
    }
  };

  const currentOffers = activeTab === 'received' ? receivedOffers : sentOffers;

  const getStatusColor = (status) => {
    switch (status) {
      case 'Accepted': return 'var(--success)';
      case 'Paid': return 'var(--success)';
      case 'Completed': return 'var(--success)';
      case 'Rejected': return 'var(--danger)';
      case 'Countered': return 'var(--warning)';
      default: return 'var(--primary)';
    }
  };

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1000px', margin: '0 auto', minHeight: 'calc(100vh - 73px)' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', color: 'var(--text-main)', marginBottom: '8px' }}>Negotiation Hub</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Track price negotiations, counter offers, and active bids.</p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        marginBottom: '24px',
        gap: '24px'
      }}>
        <button
          onClick={() => setActiveTab('received')}
          style={{
            background: 'none',
            border: 'none',
            padding: '12px 4px',
            color: activeTab === 'received' ? 'var(--text-main)' : 'var(--text-muted)',
            fontSize: '16px',
            fontWeight: 600,
            cursor: 'pointer',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'var(--transition)'
          }}
        >
          <ArrowDownLeft size={18} style={{ color: activeTab === 'received' ? 'var(--primary)' : 'var(--text-muted)' }} />
          Offers Received
          {receivedOffers.filter(o => o.status === 'Pending' || (o.status === 'Countered' && o.counteredBy !== user.id)).length > 0 && (
            <span style={{
              background: 'var(--primary)',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 'bold',
              borderRadius: '10px',
              padding: '2px 6px',
              lineHeight: 1
            }}>
              {receivedOffers.filter(o => o.status === 'Pending' || (o.status === 'Countered' && o.counteredBy !== user.id)).length}
            </span>
          )}
          {activeTab === 'received' && (
            <div style={{ position: 'absolute', bottom: '-1px', left: 0, right: 0, height: '2px', backgroundColor: 'var(--primary)' }} />
          )}
        </button>

        <button
          onClick={() => setActiveTab('sent')}
          style={{
            background: 'none',
            border: 'none',
            padding: '12px 4px',
            color: activeTab === 'sent' ? 'var(--text-main)' : 'var(--text-muted)',
            fontSize: '16px',
            fontWeight: 600,
            cursor: 'pointer',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'var(--transition)'
          }}
        >
          <ArrowUpRight size={18} style={{ color: activeTab === 'sent' ? 'var(--primary)' : 'var(--text-muted)' }} />
          Offers Sent
          {activeTab === 'sent' && (
            <div style={{ position: 'absolute', bottom: '-1px', left: 0, right: 0, height: '2px', backgroundColor: 'var(--primary)' }} />
          )}
        </button>
      </div>

      {/* Main List */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[1, 2].map((n) => (
            <div key={n} className="glass-panel" style={{ height: '120px', display: 'flex', gap: '20px', alignItems: 'center', opacity: 0.6 }}>
              <div style={{ width: '80px', height: '80px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ height: '18px', width: '40%', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} />
                <div style={{ height: '14px', width: '20%', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} />
              </div>
            </div>
          ))}
        </div>
      ) : currentOffers.length === 0 ? (
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
            <Sparkles size={40} />
          </div>
          <div>
            <h3 style={{ fontSize: '20px', color: 'var(--text-main)', marginBottom: '8px' }}>No Offers Yet</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>
              {activeTab === 'received' 
                ? "You haven't received any purchase offers from other students yet." 
                : "You haven't placed any purchase offers on listed items yet."}
            </p>
          </div>
        </div>
      ) : (
        /* Offers List */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {currentOffers.map((offer) => {
            const isTargetOfAction = offer.status === 'Pending' || 
              (offer.status === 'Countered' && offer.counteredBy !== user.id);

            const displayAmount = offer.status === 'Countered' ? offer.counterAmount : offer.amount;

            return (
              <div key={offer._id} className="glass-panel card-hover" style={{
                padding: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1, minWidth: '280px' }}>
                  {/* Listing Image */}
                  <img
                    src={offer.listing.images && offer.listing.images.length > 0 ? `http://127.0.0.1:5050${offer.listing.images[0]}` : 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=400'}
                    alt={offer.listing.title}
                    style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '12px' }}
                  />

                  {/* Details */}
                  <div>
                    <h3 style={{ fontSize: '18px', color: 'var(--text-main)', marginBottom: '4px' }}>
                      {offer.listing.title}
                    </h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      {activeTab === 'received' ? (
                        <>Buyer: <strong style={{ color: 'var(--text-main)' }}>{offer.buyer.name}</strong></>
                      ) : (
                        <>Seller: <strong style={{ color: 'var(--text-main)' }}>{offer.seller.name}</strong></>
                      )}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-main)' }}>
                        ${displayAmount.toFixed(2)}
                      </span>
                      {offer.status === 'Countered' && (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                          Original: ${offer.amount.toFixed(2)}
                        </span>
                      )}
                      <span style={{
                        fontSize: '11px',
                        background: `${getStatusColor(offer.status)}20`,
                        color: getStatusColor(offer.status),
                        border: `1px solid ${getStatusColor(offer.status)}30`,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontWeight: 600,
                        textTransform: 'uppercase'
                      }}>
                        {offer.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {isTargetOfAction && activeTab === 'received' && (
                    <>
                      <button
                        onClick={() => handleRespond(offer._id, 'Accepted')}
                        className="btn btn-primary"
                        style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--success)', border: 'none' }}
                      >
                        <Check size={14} /> Accept
                      </button>
                      <button
                        onClick={() => openEditModal(offer._id, displayAmount)}
                        className="btn"
                        style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-main)' }}
                      >
                        Counter
                      </button>
                      <button
                        onClick={() => handleRespond(offer._id, 'Rejected')}
                        className="btn"
                        style={{ padding: '8px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)' }}
                      >
                        <X size={14} /> Reject
                      </button>
                    </>
                  )}

                  {isTargetOfAction && activeTab === 'sent' && (
                    <>
                      <button
                        onClick={() => handleRespond(offer._id, 'Accepted')}
                        className="btn btn-primary"
                        style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--success)', border: 'none' }}
                      >
                        <Check size={14} /> Accept Counter
                      </button>
                      <button
                        onClick={() => handleRespond(offer._id, 'Rejected')}
                        className="btn"
                        style={{ padding: '8px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)' }}
                      >
                        <X size={14} /> Reject
                      </button>
                    </>
                  )}

                  <Link
                    to={`/chat?listingId=${offer.listing._id}&buyerId=${offer.buyer._id || offer.buyer}`}
                    className="btn"
                    style={{
                      padding: '8px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: 'var(--text-main)'
                    }}
                  >
                    <MessageSquare size={14} /> Chat
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Counter Modal */}
      {counteringOfferId && (
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
            maxWidth: '400px',
            padding: '32px',
            position: 'relative'
          }}>
            <button
              onClick={() => setCounteringOfferId(null)}
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

            <h2 style={{ fontSize: '20px', color: 'var(--text-main)', marginBottom: '8px' }}>Propose Counter-Offer</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '24px' }}>
              Set a counter price that you would accept to make this sale.
            </p>

            <form onSubmit={handleCounterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Counter Price ($)
                </label>
                <input
                  type="number"
                  className="input-field"
                  value={counterPrice}
                  onChange={(e) => setCounterPrice(e.target.value)}
                  step="0.01"
                  placeholder="0.00"
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setCounteringOfferId(null)}
                  className="btn"
                  style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-main)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '12px' }}
                  disabled={submittingCounter}
                >
                  {submittingCounter ? 'Submitting...' : 'Submit Counter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  function openEditModal(offerId, currentAmt) {
    setCounteringOfferId(offerId);
    setCounterPrice((currentAmt + 5).toString()); // suggest slightly higher/lower helper default
  }
}

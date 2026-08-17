import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Calendar, MapPin, CheckCircle, Clock, ShieldCheck, DollarSign, ExternalLink } from 'lucide-react';

export default function TransactionTracker() {
  const { token, user } = useAuth();
  const { addToast } = useToast();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Meetup scheduling fields
  const [schedulingTxId, setSchedulingTxId] = useState(null);
  const [location, setLocation] = useState('');
  const [time, setTime] = useState('');
  const [submittingMeetup, setSubmittingMeetup] = useState(false);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:5050/api/transactions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setTransactions(data.transactions);
      } else {
        addToast(data.message || 'Failed to fetch transactions', 'error');
      }
    } catch (error) {
      console.error('Fetch transactions error:', error);
      addToast('Server error fetching transactions.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchTransactions();
    }
  }, [token]);

  const handleCheckout = async (offerId) => {
    try {
      const response = await fetch(`http://127.0.0.1:5050/api/payments/checkout-session/${offerId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        addToast('Redirecting to secure checkout...', 'success');
        window.location.href = data.checkoutUrl;
      } else {
        addToast(data.message || 'Payment initialization failed', 'error');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      addToast('Server error initializing payment.', 'error');
    }
  };

  const handleMeetupSubmit = async (e) => {
    e.preventDefault();
    if (!location || !time) {
      addToast('Please fill out all meetup details.', 'error');
      return;
    }

    setSubmittingMeetup(true);

    try {
      const response = await fetch(`http://127.0.0.1:5050/api/transactions/${schedulingTxId}/meetup`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ location, time })
      });

      const data = await response.json();
      if (response.ok) {
        addToast('Meetup details scheduled successfully!', 'success');
        setSchedulingTxId(null);
        setLocation('');
        setTime('');
        fetchTransactions();
      } else {
        addToast(data.message || 'Failed to schedule meetup', 'error');
      }
    } catch (error) {
      console.error('Meetup scheduling error:', error);
      addToast('Server error scheduling meetup.', 'error');
    } finally {
      setSubmittingMeetup(false);
    }
  };

  const handleComplete = async (txId) => {
    try {
      const response = await fetch(`http://127.0.0.1:5050/api/transactions/${txId}/complete`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (response.ok) {
        addToast(
          data.transaction.status === 'Completed'
            ? 'Transaction completed successfully!'
            : 'You confirmed meetup completion. Waiting for the other party...',
          'success'
        );
        fetchTransactions();
      } else {
        addToast(data.message || 'Failed to complete transaction', 'error');
      }
    } catch (error) {
      console.error('Complete transaction error:', error);
      addToast('Server error confirming completion.', 'error');
    }
  };

  const getStepIndex = (status) => {
    const steps = ['Listed', 'Interested', 'Offer Made', 'Accepted', 'Meetup Scheduled', 'Completed'];
    return steps.indexOf(status);
  };

  const renderStepper = (currentStatus) => {
    const steps = ['Listed', 'Interested', 'Offer Made', 'Accepted', 'Meetup Scheduled', 'Completed'];
    const currentIndex = getStepIndex(currentStatus);

    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        margin: '24px 0',
        position: 'relative',
        overflowX: 'auto',
        paddingBottom: '8px'
      }}>
        {/* Connecting line */}
        <div style={{
          position: 'absolute',
          top: '15px',
          left: '5%',
          right: '5%',
          height: '2px',
          backgroundColor: 'rgba(255,255,255,0.08)',
          zIndex: 0
        }} />
        <div style={{
          position: 'absolute',
          top: '15px',
          left: '5%',
          width: `${(currentIndex / (steps.length - 1)) * 90}%`,
          height: '2px',
          backgroundColor: 'var(--primary)',
          transition: 'width 0.5s ease',
          zIndex: 0
        }} />

        {steps.map((step, idx) => {
          const isCompleted = idx <= currentIndex;
          const isActive = idx === currentIndex;

          return (
            <div key={step} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              zIndex: 1,
              flex: 1,
              minWidth: '70px',
              textAlign: 'center'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: isCompleted ? 'var(--primary)' : 'var(--bg-card)',
                border: isCompleted ? 'none' : '2px solid rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isCompleted ? '#ffffff' : 'var(--text-muted)',
                fontWeight: 'bold',
                fontSize: '12px',
                boxShadow: isActive ? '0 0 12px var(--primary)' : 'none',
                transition: 'all 0.3s ease'
              }}>
                {isCompleted ? '✓' : idx + 1}
              </div>
              <span style={{
                fontSize: '11px',
                color: isActive ? 'var(--text-main)' : 'var(--text-secondary)',
                fontWeight: isActive ? 600 : 400,
                marginTop: '8px',
                whiteSpace: 'nowrap'
              }}>
                {step}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1000px', margin: '0 auto', minHeight: 'calc(100vh - 73px)' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', color: 'var(--text-main)', marginBottom: '8px' }}>Transaction Tracker</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Securely track your campus trades step-by-step.</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {[1, 2].map((n) => (
            <div key={n} className="glass-panel" style={{ height: '220px', opacity: 0.6 }} />
          ))}
        </div>
      ) : transactions.length === 0 ? (
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
            <CheckCircle size={40} />
          </div>
          <div>
            <h3 style={{ fontSize: '20px', color: 'var(--text-main)', marginBottom: '8px' }}>No Active Transactions</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>
              You don't have any sales or purchases currently in progress. Complete negotiations to trigger a tracker.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {transactions.map((tx) => {
            const isSeller = tx.seller._id === user.id;
            const otherPartyName = isSeller ? tx.buyer.name : tx.seller.name;
            const userConfirmed = isSeller ? tx.sellerConfirmed : tx.buyerConfirmed;
            const otherConfirmed = isSeller ? tx.buyerConfirmed : tx.sellerConfirmed;

            return (
              <div key={tx._id} className="glass-panel" style={{ padding: '32px' }}>
                {/* Upper bar */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  paddingBottom: '20px',
                  flexWrap: 'wrap',
                  gap: '16px'
                }}>
                  <div>
                    <span style={{
                      fontSize: '11px',
                      background: isSeller ? 'rgba(99, 102, 241, 0.15)' : 'rgba(236, 72, 153, 0.15)',
                      color: isSeller ? 'var(--primary)' : '#ec4899',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      marginBottom: '8px',
                      display: 'inline-block'
                    }}>
                      {isSeller ? 'Selling' : 'Buying'}
                    </span>
                    <h3 style={{ fontSize: '20px', color: 'var(--text-main)', fontWeight: 600 }}>
                      {tx.listing.title}
                    </h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {isSeller ? `Buyer: ${tx.buyer.name}` : `Seller: ${tx.seller.name}`}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-main)' }}>
                      ${tx.offer ? tx.offer.amount.toFixed(2) : tx.listing.price.toFixed(2)}
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Transaction Value</span>
                  </div>
                </div>

                {/* Visual Progress Stepper */}
                {renderStepper(tx.status)}

                {/* State-specific controls */}
                <div style={{
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '20px',
                  marginTop: '20px',
                  border: '1px solid rgba(255,255,255,0.04)'
                }}>
                  {/* Status: Accepted (Awaiting Online Checkout) */}
                  {tx.status === 'Accepted' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                      <div>
                        <h4 style={{ color: 'var(--text-main)', fontSize: '15px', marginBottom: '4px' }}>
                          {isSeller ? 'Awaiting Buyer Payment' : 'Complete Online Payment'}
                        </h4>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                          {isSeller 
                            ? 'The offer is accepted. Waiting for the buyer to submit card payment via Stripe.' 
                            : 'The seller accepted your price. Please proceed to checkout to reserve the item.'}
                        </p>
                      </div>
                      {!isSeller && (
                        <button
                          onClick={() => handleCheckout(tx.offer._id || tx.offer)}
                          className="btn btn-primary"
                          style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <DollarSign size={16} /> Pay Online
                        </button>
                      )}
                    </div>
                  )}

                  {/* Status: Meetup Scheduled / Scheduling State */}
                  {(tx.status === 'Meetup Scheduled' || tx.status === 'Accepted') && (
                    <div>
                      {tx.meetupLocation ? (
                        /* Meetup details display */
                        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
                          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <MapPin size={18} style={{ color: 'var(--primary)' }} />
                              <div>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Location</span>
                                <span style={{ fontSize: '14px', color: 'var(--text-main)', fontWeight: 500 }}>{tx.meetupLocation}</span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <Calendar size={18} style={{ color: 'var(--primary)' }} />
                              <div>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Meetup Date/Time</span>
                                <span style={{ fontSize: '14px', color: 'var(--text-main)', fontWeight: 500 }}>
                                  {new Date(tx.meetupTime).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Completion Confirmation buttons */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {userConfirmed ? (
                              <span style={{ fontSize: '13px', color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                ✓ Marked Complete
                              </span>
                            ) : (
                              <button
                                onClick={() => handleComplete(tx._id)}
                                className="btn btn-primary"
                                style={{ padding: '8px 16px', background: 'var(--success)', border: 'none' }}
                              >
                                Confirm Meetup Complete
                              </button>
                            )}
                            {!otherConfirmed && (
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                Awaiting {otherPartyName} confirmation
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        /* Meetup not scheduled yet */
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                          <div>
                            <h4 style={{ color: 'var(--text-main)', fontSize: '15px', marginBottom: '4px' }}>
                              {isSeller ? 'Schedule Campus Meetup' : 'Waiting for Seller Meetup Details'}
                            </h4>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.4' }}>
                              {isSeller 
                                ? 'Set a safe campus meetup point (e.g. Student Union, Library Lobby) and a time for transfer.' 
                                : 'The item is successfully paid. Seller will schedule the meetup time and location shortly.'}
                            </p>
                          </div>
                          {isSeller && (
                            <button
                              onClick={() => {
                                setSchedulingTxId(tx._id);
                                setLocation('');
                                setTime('');
                              }}
                              className="btn btn-primary"
                              style={{ padding: '8px 16px' }}
                            >
                              Schedule Meetup
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Status: Completed */}
                  {tx.status === 'Completed' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--success)' }}>
                      <CheckCircle size={20} />
                      <div>
                        <span style={{ fontWeight: 600, display: 'block' }}>Transaction Completed Successfully!</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          This deal is complete. You can view user profile reviews to submit a rating.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Meetup Schedule Modal */}
      {schedulingTxId && (
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
            <h2 style={{ fontSize: '20px', color: 'var(--text-main)', marginBottom: '8px' }}>Schedule Meetup Details</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '24px' }}>
              Choose a well-lit, public location on campus to hand off the item.
            </p>

            <form onSubmit={handleMeetupSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Meetup Location
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Science Library Lobby"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Meetup Date & Time
                </label>
                <input
                  type="datetime-local"
                  className="input-field"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                  style={{ color: 'var(--text-main)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setSchedulingTxId(null)}
                  className="btn"
                  style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-main)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '12px' }}
                  disabled={submittingMeetup}
                >
                  {submittingMeetup ? 'Scheduling...' : 'Set Meetup'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

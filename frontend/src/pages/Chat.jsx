import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { 
  Send, 
  Tag, 
  MessageSquare, 
  AlertCircle, 
  Star, 
  DollarSign, 
  ShieldCheck,
  CheckCircle,
  XCircle,
  HelpCircle
} from 'lucide-react';

const STATUS_STEPS = ['Listed', 'Offer Made', 'Accepted', 'Meetup Scheduled', 'Completed'];

const TransactionTracker = ({ status }) => {
  const currentIndex = STATUS_STEPS.indexOf(status);
  
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      padding: '12px 20px', 
      background: 'var(--bg-panel)', 
      borderBottom: '1px solid var(--border-color)', 
      overflowX: 'auto', 
      gap: '8px' 
    }}>
      {STATUS_STEPS.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isActive = index === currentIndex;
        
        let color = 'var(--text-muted)';
        let weight = 'normal';
        if (isCompleted) color = 'var(--success)';
        if (isActive) {
          color = 'var(--primary)';
          weight = 'bold';
        }
        
        return (
          <React.Fragment key={step}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
              <div style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: isCompleted ? 'var(--success)' : isActive ? 'var(--primary)' : 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                color: isCompleted || isActive ? 'white' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 'bold'
              }}>
                {index + 1}
              </div>
              <span style={{ fontSize: '11px', color, fontWeight: weight }}>{step}</span>
            </div>
            {index < STATUS_STEPS.length - 1 && (
              <div style={{ 
                flex: 1, 
                minWidth: '15px', 
                height: '2px', 
                background: index < currentIndex ? 'var(--success)' : 'var(--border-color)' 
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default function Chat() {
  const { user, token } = useAuth();
  const socket = useSocket();
  const [searchParams] = useSearchParams();
  
  const listingIdQuery = searchParams.get('listingId');
  const buyerIdQuery = searchParams.get('buyerId');
  const paymentStatus = searchParams.get('payment_status');

  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  // Counter offer state
  const [counterAmount, setCounterAmount] = useState('');
  const [showCounterInput, setShowCounterInput] = useState(null); // stores offerId

  // Review states
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewError, setReviewError] = useState('');

  const messagesEndRef = useRef(null);

  const currentUserId = user ? (user.id || user._id) : '';
  const isSeller = activeChat && activeChat.listing && (activeChat.listing.owner === currentUserId);

  // 1. Fetch chat threads list
  const fetchChats = async (selectRoomId = null) => {
    try {
      const response = await fetch('http://127.0.0.1:5050/api/chats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setChats(data.chats);
        
        // If a specific room is targeted to select
        if (selectRoomId) {
          const room = data.chats.find(c => c._id === selectRoomId);
          if (room) {
            handleSelectChat(room);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingChats(false);
    }
  };

  // 2. Fetch or create a specific room from query parameters
  const resolveQueryRoom = async () => {
    if (!listingIdQuery || !buyerIdQuery) {
      fetchChats();
      return;
    }

    try {
      // Find seller from listing info first or fallback
      const listingRes = await fetch(`http://127.0.0.1:5050/api/listings/${listingIdQuery}`);
      const listingData = await listingRes.json();
      
      if (!listingRes.ok) throw new Error('Listing not found');
      
      const sellerId = listingData.listing.owner._id;

      const response = await fetch(
        `http://127.0.0.1:5050/api/chats/room?listingId=${listingIdQuery}&buyerId=${buyerIdQuery}&sellerId=${sellerId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();

      if (response.ok) {
        // Reload all chats and auto-select this room
        fetchChats(data.room._id);
      }
    } catch (err) {
      console.error('Resolve query room failed', err);
      fetchChats();
    }
  };

  useEffect(() => {
    if (token) {
      resolveQueryRoom();
    }
  }, [listingIdQuery, buyerIdQuery, token]);

  // 3. Setup Socket message listeners
  useEffect(() => {
    if (!socket) return;

    const handleReceivedMessage = (data) => {
      // If the received message belongs to the currently active chat
      if (activeChat && activeChat._id === data.roomId) {
        setMessages(prev => [...prev, data.message]);
        
        // Mark message room as updated in threads list
        setChats(prev => prev.map(chat => {
          if (chat._id === data.roomId) {
            return {
              ...chat,
              messages: [...chat.messages, data.message],
              lastUpdated: new Date()
            };
          }
          return chat;
        }));
      } else {
        // Reload chats to show unread message preview
        fetchChats();
      }
    };

    socket.on('message_received', handleReceivedMessage);
    
    // Listen for live offer changes to update negotiation view
    socket.on('offer_changed', () => {
      if (activeChat) {
        // Refetch active room details to load new statuses
        refetchActiveRoomMessages();
      }
      fetchChats();
    });

    return () => {
      socket.off('message_received', handleReceivedMessage);
      socket.off('offer_changed');
    };
  }, [socket, activeChat]);

  // Auto-scroll chat log to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const refetchActiveRoomMessages = async () => {
    if (!activeChat) return;
    try {
      const response = await fetch(
        `http://127.0.0.1:5050/api/chats/room?listingId=${activeChat.listing._id}&buyerId=${activeChat.buyer._id}&sellerId=${activeChat.seller._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      if (response.ok) {
        // Resolve and load detailed populated messages
        setMessages(data.room.messages);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectChat = (chat) => {
    setActiveChat(chat);
    setMessages(chat.messages);
    setShowCounterInput(null);
    setCounterAmount('');

    if (socket) {
      socket.emit('join_chat', chat._id);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChat) return;

    const messageText = inputText;
    setInputText('');

    try {
      const response = await fetch(`http://127.0.0.1:5050/api/chats/room/${activeChat._id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ text: messageText })
      });
      const data = await response.json();

      if (response.ok) {
        setMessages(prev => [...prev, data.message]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 4. Offer responses inside the chat bubble
  const handleOfferResponse = async (offerId, responseStatus, customAmount = null) => {
    try {
      const body = { status: responseStatus };
      if (customAmount) {
        body.counterAmount = parseFloat(customAmount);
      }

      const response = await fetch(`http://127.0.0.1:5050/api/offers/${offerId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (response.ok) {
        setShowCounterInput(null);
        setCounterAmount('');
        // Refetch room messages to update statuses
        refetchActiveRoomMessages();
        
        // Notify other socket client
        if (socket) {
          socket.emit('trigger_offer_change', { roomId: activeChat._id });
        }
      } else {
        alert(data.message || 'Action failed.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to process offer response.');
    }
  };

  const handleCheckout = async (offerId) => {
    try {
      const response = await fetch(`http://127.0.0.1:5050/api/payments/checkout-session/${offerId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert(data.message || 'Checkout session failed to start');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to connect to checkout service.');
    }
  };

  const handleMarkCompleted = async () => {
    if (!window.confirm('Mark this transaction as Completed? This confirms you completed the meetup and hand-off.')) {
      return;
    }

    try {
      const response = await fetch(`http://127.0.0.1:5050/api/listings/${activeChat.listing._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'Completed' })
      });
      const data = await response.json();

      if (response.ok) {
        if (socket) {
          socket.emit('trigger_offer_change', { roomId: activeChat._id });
        }
        refetchActiveRoomMessages();
        fetchChats();
      } else {
        alert(data.message || 'Failed to complete meetup.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to connect to server.');
    }
  };

  const handleSendReview = async (e) => {
    e.preventDefault();
    if (reviewRating === 0) {
      setReviewError('Please select a star rating.');
      return;
    }

    setReviewLoading(true);
    setReviewError('');

    try {
      const response = await fetch('http://127.0.0.1:5050/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          listingId: activeChat.listing._id,
          rating: reviewRating,
          comment: reviewComment
        })
      });

      const data = await response.json();
      if (response.ok) {
        setReviewSubmitted(true);
        setReviewRating(0);
        setReviewComment('');
      } else {
        setReviewError(data.message || 'Failed to submit review.');
      }
    } catch (err) {
      console.error(err);
      setReviewError('Failed to connect to server.');
    } finally {
      setReviewLoading(false);
    }
  };

  const getRecipient = (chat) => {
    if (!chat || !user) return null;
    const currentUserId = user.id || user._id;
    return chat.buyer._id === currentUserId ? chat.seller : chat.buyer;
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '30px auto', padding: '0 20px' }} className="animate-fade">
      <div style={{
        display: 'grid',
        gridTemplateColumns: '320px 1fr',
        gap: '24px',
        height: 'calc(100vh - 150px)',
        minHeight: '500px'
      }}>
        {/* Left Side: Active Threads Panel */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-title)' }}>
              <MessageSquare size={20} style={{ color: 'var(--primary)' }} />
              Chat Inbox
            </h3>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loadingChats ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
                Loading conversations...
              </div>
            ) : chats.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No active chat conversations. Browse items and click "Chat with Seller" to start.
              </div>
            ) : (
              chats.map(chat => {
                const recipient = getRecipient(chat);
                const isSelected = activeChat && activeChat._id === chat._id;
                const lastMsg = chat.messages[chat.messages.length - 1];

                return (
                  <div
                    key={chat._id}
                    onClick={() => handleSelectChat(chat)}
                    style={{
                      padding: '16px',
                      borderBottom: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      background: isSelected ? 'var(--primary-glow)' : 'transparent',
                      transition: 'var(--transition)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    {/* User Avatar */}
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      background: 'var(--bg-panel)', color: 'var(--primary)',
                      fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      overflow: 'hidden', flexShrink: 0
                    }}>
                      {recipient?.avatar ? (
                        <img src={recipient.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        recipient?.name?.charAt(0).toUpperCase()
                      )}
                    </div>

                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>{recipient?.name}</span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {chat.listing?.price === 0 ? 'Free' : `$${chat.listing?.price}`}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 600, marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {chat.listing?.title}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {lastMsg ? lastMsg.text : 'No messages yet'}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Conversation window */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {activeChat ? (
            <>
              {/* Active Conversation Header Details */}
              <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--bg-card)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '50%',
                    background: 'var(--bg-panel)', color: 'var(--primary)',
                    fontWeight: 'bold', display: 'flex', alignItems: 'center', justify: 'center'
                  }}>
                    {getRecipient(activeChat)?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>
                      {getRecipient(activeChat)?.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <ShieldCheck size={12} style={{ color: 'var(--success)' }} />
                      Student Seller
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {/* Complete Meetup Action (Only visible to seller during Meetup Scheduled phase) */}
                  {isSeller && activeChat.listing?.status === 'Meetup Scheduled' && (
                    <button 
                      onClick={handleMarkCompleted}
                      className="btn btn-primary"
                      style={{ padding: '6px 12px', fontSize: '12px', background: 'var(--success)' }}
                    >
                      Complete Exchange
                    </button>
                  )}

                  {/* Listing Link Header banner */}
                  <Link to={`/listings/${activeChat.listing?._id}`} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '6px 12px', background: 'var(--bg-panel)', borderRadius: '8px',
                    border: '1px solid var(--border-color)', fontSize: '12px', transition: 'var(--transition)'
                  }}>
                    <div style={{ fontWeight: 600 }}>{activeChat.listing?.title}</div>
                    <div style={{ color: 'var(--primary)', fontWeight: 'bold' }}>
                      {activeChat.listing?.price === 0 ? 'Free' : `$${activeChat.listing?.price}`}
                    </div>
                  </Link>
                </div>
              </div>

              {/* Visual Transaction Step Tracker */}
              <TransactionTracker status={activeChat.listing?.status} />

              {/* Payment Success Alert Banner */}
              {paymentStatus === 'success' && (
                <div style={{
                  margin: '16px 20px 0 20px',
                  padding: '12px 16px',
                  backgroundColor: 'var(--success-glow)',
                  border: '1px solid var(--success)',
                  color: 'var(--success)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '13px',
                  fontWeight: 600,
                  textAlign: 'center'
                }}>
                  🎉 Checkout Payment confirmed! Your funds are secure. Please coordinate a safe meetup spot on campus to collect your item.
                </div>
              )}

              {/* Review Panel Overlay when Listing is Completed */}
              {activeChat.listing?.status === 'Completed' && !reviewSubmitted && (
                <div className="glass-panel" style={{
                  margin: '16px 20px 0 20px',
                  padding: '16px 20px',
                  border: '1px solid var(--warning)',
                  background: 'rgba(245, 158, 11, 0.04)',
                  borderRadius: 'var(--radius-md)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                      🎉 Meetup Completed! Share your transaction review
                    </h4>
                    {reviewError && (
                      <span style={{ fontSize: '11px', color: 'var(--danger)' }}>{reviewError}</span>
                    )}
                  </div>
                  <form onSubmit={handleSendReview} style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {/* Star Selection */}
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star 
                          key={star}
                          size={18}
                          onClick={() => setReviewRating(star)}
                          fill={reviewRating >= star ? 'var(--warning)' : 'none'}
                          style={{ color: 'var(--warning)', cursor: 'pointer' }}
                        />
                      ))}
                    </div>

                    <input 
                      type="text"
                      className="input-field"
                      placeholder="Comment on communication, punctuality, item condition..."
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      style={{ flex: 1, height: '36px', fontSize: '12px' }}
                      required
                    />

                    <button 
                      type="submit" 
                      className="btn btn-primary" 
                      style={{ padding: '0 16px', height: '36px', fontSize: '12px' }}
                      disabled={reviewLoading}
                    >
                      {reviewLoading ? 'Submitting...' : 'Submit Rating'}
                    </button>
                  </form>
                </div>
              )}

              {/* Chat Message Logs Area */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {messages.map((msg, index) => {
                  const currentUserId = user.id || user._id;
                  const isMe = msg.sender === currentUserId;

                  // Render embedded Negotiation Offer
                  if (msg.offerAttached && typeof msg.offerAttached === 'object') {
                    const isBuyer = activeChat.buyer._id === currentUserId;
                    const offer = msg.offerAttached;
                    
                    // Determine if countered by other party
                    const isCounteredByOther = offer.status === 'Countered' && offer.counteredBy !== currentUserId;
                    const isCounteredByMe = offer.status === 'Countered' && offer.counteredBy === currentUserId;
                    
                    return (
                      <div key={index} style={{ alignSelf: 'center', width: '100%', maxWidth: '420px', margin: '15px 0' }} className="animate-fade">
                        <div className="glass-panel" style={{
                          padding: '20px',
                          border: offer.status === 'Accepted' ? '1px solid var(--success)' : offer.status === 'Paid' ? '1px solid var(--success)' : '1px solid var(--primary)',
                          background: 'rgba(99, 102, 241, 0.04)',
                          borderRadius: 'var(--radius-lg)',
                          textAlign: 'center',
                          boxShadow: 'var(--card-shadow)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--primary)', fontWeight: 'bold', fontSize: '15px', marginBottom: '8px' }}>
                            <Tag size={16} />
                            {offer.offerType === 'Rental' ? '🏠 Rental Request' : '🛒 Negotiation Offer'}
                          </div>
                          
                          {offer.offerType === 'Rental' ? (
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px', margin: '10px 0', border: '1px solid var(--border-color)', padding: '10px', borderRadius: '6px', backgroundColor: 'var(--bg-input)', textAlign: 'left' }}>
                              <div>Proposed Rate: <strong>${offer.status === 'Countered' ? offer.counterAmount.toFixed(2) : offer.amount.toFixed(2)} / day</strong></div>
                              <div>Dates: <strong>{new Date(offer.rentalStartDate).toLocaleDateString()} – {new Date(offer.rentalEndDate).toLocaleDateString()}</strong></div>
                              <div>Duration: <strong>{offer.rentalDuration} days</strong></div>
                              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '4px', marginTop: '4px', fontWeight: 600, color: 'var(--text-main)', fontSize: '12px' }}>
                                Total Payable: ${(offer.rentalAmount + offer.securityDeposit).toFixed(2)} (Charges: ${offer.rentalAmount.toFixed(2)} + Deposit: ${offer.securityDeposit.toFixed(2)})
                              </div>
                            </div>
                          ) : (
                            <p style={{ color: 'var(--text-main)', fontSize: '14px', marginBottom: '14px', fontWeight: 600 }}>
                              {offer.status === 'Countered' 
                                ? `Counter Offer Amount: $${offer.counterAmount.toFixed(2)}` 
                                : `Offered Amount: $${offer.amount.toFixed(2)}`}
                            </p>
                          )}

                          {/* Action Controls for Seller/Buyer if Pending or Countered by Other */}
                          {((offer.status === 'Pending' && !isBuyer) || (isCounteredByOther)) && (
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '12px' }}>
                              <button 
                                onClick={() => handleOfferResponse(offer._id, 'Accepted')}
                                className="btn btn-primary" 
                                style={{ padding: '8px 14px', fontSize: '12px', display: 'flex', gap: '4px' }}
                              >
                                <CheckCircle size={14} /> Accept
                              </button>
                              <button 
                                onClick={() => handleOfferResponse(offer._id, 'Rejected')}
                                className="btn btn-danger" 
                                style={{ padding: '8px 14px', fontSize: '12px', display: 'flex', gap: '4px' }}
                              >
                                <XCircle size={14} /> Reject
                              </button>
                              <button 
                                onClick={() => setShowCounterInput(offer._id)}
                                className="btn btn-secondary" 
                                style={{ padding: '8px 14px', fontSize: '12px', display: 'flex', gap: '4px' }}
                              >
                                <HelpCircle size={14} /> Counter
                              </button>
                            </div>
                          )}

                          {/* Buyer Checkout trigger if Offer is Accepted */}
                          {offer.status === 'Accepted' && isBuyer && (
                            <div style={{ marginTop: '12px' }}>
                              <p style={{ fontSize: '12px', color: 'var(--success)', marginBottom: '10px', fontWeight: 600 }}>
                                {offer.offerType === 'Rental' 
                                  ? 'Seller has accepted the rental request! Pay online to book the item.' 
                                  : 'Seller has accepted the offer! Pay online to book the item.'}
                              </p>
                              <button 
                                onClick={() => handleCheckout(offer._id)}
                                className="btn btn-primary" 
                                style={{ padding: '10px 20px', fontSize: '13px', width: '100%', background: 'var(--success)' }}
                              >
                                <DollarSign size={16} /> Pay Securely Online
                              </button>
                            </div>
                          )}

                          {/* Seller Checkout status if Offer is Accepted */}
                          {offer.status === 'Accepted' && !isBuyer && (
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                              {offer.offerType === 'Rental'
                                ? 'Rental request accepted. Waiting for the renter to submit card payment.'
                                : 'Offer accepted. Waiting for the buyer to submit card payment.'}
                            </p>
                          )}

                          {/* Paid Status */}
                          {offer.status === 'Paid' && (
                            <div style={{ marginTop: '8px', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
                              <CheckCircle size={16} fill="var(--success-glow)" />
                              <span>{offer.offerType === 'Rental' ? 'Paid & Booked Securely' : 'Paid Securely Online'}</span>
                            </div>
                          )}

                          {/* Counter Offer Propose Form */}
                          {showCounterInput === offer._id && (
                            <div className="animate-fade" style={{ marginTop: '14px', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
                              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Propose Counter Price ($)</label>
                              <div style={{ display: 'flex', gap: '8px', maxWidth: '250px', margin: '0 auto' }}>
                                <input 
                                  type="number"
                                  className="input-field"
                                  placeholder="Counter amount"
                                  value={counterAmount}
                                  onChange={(e) => setCounterAmount(e.target.value)}
                                  style={{ height: '34px', fontSize: '12px' }}
                                />
                                <button 
                                  onClick={() => handleOfferResponse(offer._id, 'Countered', counterAmount)}
                                  className="btn btn-primary"
                                  style={{ padding: '0 12px', height: '34px', fontSize: '12px' }}
                                >
                                  Submit
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Status Badge */}
                          <div style={{ marginTop: '14px', fontSize: '11px', color: 'var(--text-muted)' }}>
                            Status: <span style={{ 
                              fontWeight: 'bold', 
                              color: offer.status === 'Accepted' || offer.status === 'Paid' ? 'var(--success)' : 'var(--primary)' 
                            }}>
                              {offer.status === 'Pending' && (isBuyer ? 'Pending Seller' : 'Requires Response')}
                              {offer.status === 'Countered' && (isCounteredByMe ? 'Counter Sent (Pending)' : 'Counter Received')}
                              {offer.status === 'Accepted' && 'Accepted'}
                              {offer.status === 'Paid' && 'Paid'}
                              {offer.status === 'Rejected' && 'Declined'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Render standard text message bubble
                  return (
                    <div
                      key={index}
                      style={{
                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                        maxWidth: '70%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isMe ? 'flex-end' : 'flex-start'
                      }}
                    >
                      <div style={{
                        padding: '10px 16px',
                        borderRadius: '16px',
                        borderTopRightRadius: isMe ? '4px' : '16px',
                        borderTopLeftRadius: isMe ? '16px' : '4px',
                        background: isMe ? 'var(--primary-gradient)' : 'var(--bg-panel)',
                        color: isMe ? 'white' : 'var(--text-main)',
                        fontSize: '14px',
                        boxShadow: 'var(--card-shadow)',
                        border: isMe ? 'none' : '1px solid var(--border-color)',
                        lineHeight: '1.4',
                        wordBreak: 'break-word'
                      }}>
                        {msg.text}
                      </div>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', padding: '0 4px' }}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Send Bar */}
              <form onSubmit={handleSendMessage} style={{
                padding: '16px 20px',
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                background: 'var(--bg-card)'
              }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Type a message to discuss meetups, item checkouts..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  style={{ flex: 1, height: '42px' }}
                />
                <button type="submit" className="btn btn-primary" style={{ width: '42px', height: '42px', padding: 0, borderRadius: '50%' }}>
                  <Send size={16} />
                </button>
              </form>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', gap: '12px' }}>
              <AlertCircle size={40} style={{ color: 'var(--text-muted)' }} />
              <p style={{ fontSize: '15px' }}>Select a chat thread on the left to start negotiating.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success', duration = 3000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prevToasts) => [...prevToasts, { id, message, type }]);

    setTimeout(() => {
      setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast Container */}
      <div style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxWidth: '350px',
        width: '100%'
      }}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            style={{
              padding: '16px 20px',
              borderRadius: '12px',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 500,
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              userSelect: 'none',
              animation: 'slideIn 0.3s ease forwards',
              border: toast.type === 'success' 
                ? '1px solid rgba(16, 185, 129, 0.4)' 
                : '1px solid rgba(239, 68, 68, 0.4)',
              background: toast.type === 'success' 
                ? '#10b981' 
                : '#ef4444',
              transition: 'all 0.2s ease-in-out',
            }}
          >
            <span>{toast.message}</span>
            <span style={{ marginLeft: '12px', opacity: 0.7, fontSize: '12px' }}>✕</span>
          </div>
        ))}
      </div>
      
      {/* Dynamic Keyframes injection for styling */}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateY(-20px) scale(0.9);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
};

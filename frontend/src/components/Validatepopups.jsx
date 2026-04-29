import React, { useEffect } from 'react';

export default function ValidatePopups({ type, message, onClose }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  const styles = {
    base: {
      position: 'fixed',
      top: 32,
      left: '50%',
      transform: 'translateX(-50%)',
      minWidth: 280,
      maxWidth: '90vw',
      padding: '18px 32px 18px 24px',
      borderRadius: 12,
      color: '#222',
      fontWeight: 500,
      zIndex: 9999,
      boxShadow: '0 4px 24px rgba(0,0,0,0.13)',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      background: '#fff',
      border: type === 'success' ? '1.5px solid #22c55e' : '1.5px solid #ef4444',
      animation: 'fadeInDown 0.4s',
    },
    iconCircle: {
      width: 32,
      height: 32,
      borderRadius: '50%',
      background: type === 'success' ? '#22c55e' : '#ef4444',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontSize: 20,
      flexShrink: 0,
    },
    closeBtn: {
      marginLeft: 16,
      background: 'none',
      border: 'none',
      color: '#888',
      fontSize: 20,
      cursor: 'pointer',
      alignSelf: 'flex-start',
    }
  };

  // Optional: Add fade-in animation
  const styleSheet = document.createElement("style");
  styleSheet.innerText = `
    @keyframes fadeInDown {
      from { opacity: 0; transform: translateY(-30px) translateX(-50%);}
      to { opacity: 1; transform: translateY(0) translateX(-50%);}
    }
  `;
  document.head.appendChild(styleSheet);

  return (
    <div style={styles.base} role="alert">
      <span style={styles.iconCircle}>
        {type === 'success' ? '✔' : '✖'}
      </span>
      <span>{message}</span>
      <button style={styles.closeBtn} onClick={onClose} title="Close">&times;</button>
    </div>
  );
}
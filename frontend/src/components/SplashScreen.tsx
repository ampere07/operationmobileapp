import React from 'react';
import logo1 from '../assets/logo1.png';

const SplashScreen: React.FC = () => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#ffffff',
      color: '#1a1a1a',
      fontSize: '18px',
      fontWeight: '600'
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px'
      }}>
        <img 
          src={logo1} 
          alt="Sync Logo" 
          style={{
            height: '80px',
            marginBottom: '10px'
          }}
        />
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid',
          borderColor: '#e5e7eb',
          borderTopColor: '#6d28d9',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <div>Loading...</div>
      </div>
      <style>{`
        * {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;

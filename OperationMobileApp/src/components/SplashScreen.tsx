import React from 'react';
import logo1 from '../assets/logo1.png';

const SplashScreen: React.FC = () => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#282c34',
      color: '#61dafb',
      fontSize: '18px',
      fontWeight: '500'
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
          borderColor: '#444',
          borderTopColor: '#61dafb',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <div>Loading...</div>
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;

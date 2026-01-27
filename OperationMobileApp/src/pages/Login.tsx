import React, { useState, useEffect } from 'react';
import { login, forgotPassword } from '../services/api';
import { UserData } from '../types/api';
import { formUIService } from '../services/formUIService';
import { settingsColorPaletteService } from '../services/settingsColorPaletteService';

interface LoginProps {
  onLogin: (userData: UserData) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState<string>('#9333ea');

  const convertGoogleDriveUrl = (url: string): string => {
    if (!url) return '';
    
    console.log('[Logo] Original URL:', url);
    
    // Use backend proxy to avoid CORS issues
    const apiUrl = process.env.REACT_APP_API_URL || 'https://backend.atssfiber.ph/api';
    const proxyUrl = `${apiUrl}/proxy/image?url=${encodeURIComponent(url)}`;
    
    console.log('[Logo] Using proxy URL:', proxyUrl);
    return proxyUrl;
  };

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        console.log('[Logo] Fetching config from form_ui table...');
        const config = await formUIService.getConfig();
        console.log('[Logo] Config received:', config);
        
        if (config && config.logo_url) {
          console.log('[Logo] Logo URL from database:', config.logo_url);
          const directUrl = convertGoogleDriveUrl(config.logo_url);
          setLogoUrl(directUrl);
        } else {
          console.log('[Logo] No logo_url in config');
        }
      } catch (error) {
        console.error('[Logo] Error fetching logo:', error);
      }
    };
    
    const fetchColorPalette = async () => {
      try {
        console.log('[Color] Fetching active color palette...');
        const activePalette = await settingsColorPaletteService.getActive();
        console.log('[Color] Active palette:', activePalette);
        
        if (activePalette && activePalette.primary) {
          console.log('[Color] Using primary color:', activePalette.primary);
          setPrimaryColor(activePalette.primary);
        }
      } catch (error) {
        console.error('[Color] Error fetching color palette:', error);
      }
    };
    
    fetchLogo();
    fetchColorPalette();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError('Please enter your username/email and password');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const demoEmail = process.env.REACT_APP_DEMO_EMAIL;
      const demoPassword = process.env.REACT_APP_DEMO_PASSWORD;
      
      if (identifier === demoEmail && password === demoPassword) {
        const mockUserData: UserData = {
          id: 1,
          username: 'admin',
          email: identifier,
          full_name: 'Admin User',
          role: 'administrator'
        };
        onLogin(mockUserData);
        return;
      }
      
      const response = await login(identifier, password);
      if (response.status === 'success') {
        const userData: UserData = {
          id: response.data.user.id,
          username: response.data.user.username,
          email: response.data.user.email,
          full_name: response.data.user.full_name,
          role: response.data.user.role,
          organization: response.data.user.organization
        };
        onLogin(userData);
      } else {
        setError('Login failed. Please try again.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      setError('Please enter your email address');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await forgotPassword(forgotEmail);
      if (response.status === 'success') {
        setForgotMessage(response.message);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send reset instructions.');
    } finally {
      setIsLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#ffffff',
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          padding: '40px',
          borderRadius: '12px',
          border: '1px solid #e0e0e0',
          width: '100%',
          maxWidth: '400px',
          boxShadow: '0 4px 20px rgba(147, 51, 234, 0.1)'
        }}>
          <div style={{
            textAlign: 'center',
            marginBottom: '30px'
          }}>
            {logoUrl && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '20px'
              }}>
                <img 
                  src={logoUrl} 
                  alt="Logo" 
                  style={{
                    height: '80px',
                    objectFit: 'contain'
                  }}
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    console.error('[Logo] Failed to load image from:', logoUrl);
                    console.error('[Logo] Make sure the Google Drive file is shared as "Anyone with the link"');
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
            <h2 style={{
            color: primaryColor,
            fontSize: '24px',
            marginBottom: '10px'
            }}>
            Reset Password
            </h2>
          </div>
          
          {forgotMessage ? (
            <div>
              <div style={{
                color: '#16a34a',
                textAlign: 'center',
                marginBottom: '20px',
                padding: '15px',
                backgroundColor: '#f0fdf4',
                borderRadius: '8px',
                border: '1px solid #16a34a'
              }}>
                {forgotMessage}
              </div>
              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotMessage('');
                  setForgotEmail('');
                  setError('');
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: primaryColor,
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Back to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  color: '#6b7280',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: '#f9fafb',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    color: '#111827',
                    fontSize: '16px'
                  }}
                  placeholder="Enter your email address"
                />
              </div>
              
              {error && (
                <div style={{
                  color: '#dc2626',
                  marginBottom: '20px',
                  textAlign: 'center',
                  fontSize: '14px'
                }}>
                  {error}
                </div>
              )}
              
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: isLoading ? '#d1d5db' : '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  marginBottom: '15px',
                  fontWeight: '600'
                }}
              >
                {isLoading ? 'Sending...' : 'Send Reset Instructions'}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setError('');
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: 'transparent',
                  color: primaryColor,
                  border: `1px solid ${primaryColor}`,
                  borderRadius: '8px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Back to Login
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#ffffff',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        padding: '40px',
        borderRadius: '12px',
        border: '1px solid #e0e0e0',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 4px 20px rgba(147, 51, 234, 0.1)'
      }}>
        <div style={{
          textAlign: 'center',
          marginBottom: '30px'
        }}>
          {logoUrl && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '20px'
            }}>
              <img 
                src={logoUrl} 
                alt="Logo" 
                style={{
                  height: '80px',
                  objectFit: 'contain'
                }}
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  console.error('[Logo] Failed to load image from:', logoUrl);
                  console.error('[Logo] Make sure the Google Drive file is shared as "Anyone with the link"');
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
          <h1 style={{
            color: primaryColor,
            fontSize: '28px',
            marginBottom: '10px',
            fontWeight: '700'
          }}>
            Powered by Sync
          </h1>
          <p style={{
            color: '#6b7280',
            fontSize: '16px'
          }}>
            Sign in to your account
          </p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              color: '#6b7280',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Email or Username
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#f9fafb',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                color: '#111827',
                fontSize: '16px'
              }}
              placeholder="Enter your email or username"
            />
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              color: '#6b7280',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#f9fafb',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                color: '#111827',
                fontSize: '16px'
              }}
              placeholder="Enter your password"
            />
          </div>
          
          {error && (
            <div style={{
              color: '#dc2626',
              marginBottom: '20px',
              textAlign: 'center',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: isLoading ? '#d1d5db' : primaryColor,
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              marginBottom: '15px'
            }}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
          
          <div style={{
            textAlign: 'center'
          }}>
            <button
              type="button"
              onClick={() => {
                setShowForgotPassword(true);
                setError('');
              }}
              style={{
                backgroundColor: 'transparent',
                color: primaryColor,
                border: 'none',
                fontSize: '14px',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontWeight: '500'
              }}
            >
              Forgot your password?
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;

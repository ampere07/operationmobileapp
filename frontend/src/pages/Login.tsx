import React, { useState, useEffect } from 'react';
import { login, forgotPassword } from '../services/api';
import { UserData } from '../types/api';
import { formUIService } from '../services/formUIService';
import { settingsColorPaletteService } from '../services/settingsColorPaletteService';
import { ArrowRight } from 'lucide-react';

interface LoginProps {
  onLogin: (userData: UserData) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [accountNo, setAccountNo] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const convertGoogleDriveUrl = (url: string): string => {
    if (!url) return '';
    const apiUrl = process.env.REACT_APP_API_URL || 'https://backend.atssfiber.ph/api';
    return `${apiUrl}/proxy/image?url=${encodeURIComponent(url)}`;
  };

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const config = await formUIService.getConfig();
        if (config && config.logo_url) {
          setLogoUrl(convertGoogleDriveUrl(config.logo_url));
        }
      } catch (error) {
        console.error('[Logo] Error fetching logo:', error);
      }
    };

    fetchLogo();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountNo || !mobileNo) {
      setError('Please enter your account number and mobile number');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await login(accountNo, mobileNo);
      if (response.status === 'success') {
        const userData: UserData = {
          id: response.data.user.id,
          username: response.data.user.username,
          email: response.data.user.email,
          full_name: response.data.user.full_name,
          role: response.data.user.role,
          role_id: response.data.user.role_id,
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
        backgroundColor: '#f3f4f6',
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          padding: '40px',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '400px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            textAlign: 'center',
            marginBottom: '30px'
          }}>
            <h2 style={{
              color: '#6d28d9',
              fontSize: '24px',
              marginBottom: '10px',
              fontWeight: '600'
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
                borderRadius: '30px',
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
                  padding: '14px',
                  backgroundColor: '#6d28d9',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '30px',
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
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '14px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #d1d5db',
                    borderRadius: '30px',
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
                  padding: '14px',
                  backgroundColor: isLoading ? '#d1d5db' : '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '30px',
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
                  padding: '14px',
                  backgroundColor: 'transparent',
                  color: '#6d28d9',
                  border: '1px solid #6d28d9',
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
    <>
      <style>{`
        * {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
        }
        @media (max-width: 768px) {
          .login-container {
            flex-direction: column !important;
          }
          .login-left {
            order: 2 !important;
            border-radius: 0 0 16px 16px !important;
            box-shadow: none !important;
          }
          .login-right {
            order: 1 !important;
            padding: 40px 30px !important;
          }
        }
      `}</style>
      <div style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: '#f3f4f6'
      }}>
        <div style={{
          display: 'flex',
          width: '100%',
          maxWidth: '1200px',
          margin: 'auto',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
        }} className="login-container">
          <div style={{
            flex: 1,
            background: 'linear-gradient(135deg, #6d28d9 0%, #7c3aed 100%)',
            padding: '60px 50px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            borderTopRightRadius: '16px',
            borderBottomRightRadius: '16px',
            boxShadow: '4px 0 15px rgba(0, 0, 0, 0.1)'
          }} className="login-left">
            <div style={{ marginBottom: '40px' }}>
              <h1 style={{
                fontSize: '32px',
                fontWeight: '700',
                color: '#ffffff',
                marginBottom: '10px'
              }}>
                Welcome Back
              </h1>
              <p style={{
                fontSize: '14px',
                color: '#ffffff',
                opacity: 0.9,
                fontWeight: '700'
              }}>
                Please login to your account.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '24px' }}>
                <input
                  type="text"
                  value={accountNo}
                  onChange={(e) => setAccountNo(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '14px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    color: '#111827',
                    fontSize: '15px',
                    outline: 'none',
                    fontWeight: '600'
                  }}
                  placeholder="Username or Email"
                />
              </div>

              <div style={{ marginBottom: '32px' }}>
                <input
                  type="password"
                  value={mobileNo}
                  onChange={(e) => setMobileNo(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '14px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    color: '#111827',
                    fontSize: '15px',
                    outline: 'none',
                    fontWeight: '600'
                  }}
                  placeholder="Password"
                />
              </div>

              {error && (
                <div style={{
                  color: '#dc2626',
                  marginBottom: '20px',
                  fontSize: '14px',
                  backgroundColor: '#fee2e2',
                  padding: '12px',
                  borderRadius: '6px'
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '16px',
                  backgroundColor: isLoading ? '#6b7280' : '#ffffff',
                  color: isLoading ? '#ffffff' : '#6d28d9',
                  border: 'none',
                  borderRadius: '30px',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                  }
                }}
              >
                {isLoading ? 'LOGGING IN...' : 'SECURE LOGIN'}
                {!isLoading && <ArrowRight size={20} />}
              </button>

              <div style={{
                textAlign: 'center',
                marginTop: '20px'
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(true);
                    setError('');
                  }}
                  style={{
                    backgroundColor: 'transparent',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '14px',
                    cursor: 'pointer',
                    textDecoration: 'none',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    margin: '0 auto'
                  }}
                >
                  Forgot Password?
                </button>
              </div>
            </form>
          </div>

          <div style={{
            flex: 1,
            backgroundColor: '#ffffff',
            padding: '60px 50px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }} className="login-right">
            <div style={{
              textAlign: 'center',
              marginBottom: '40px'
            }}>
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt="Logo"
                  style={{
                    height: '120px',
                    objectFit: 'contain',
                    marginBottom: '10px'
                  }}
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              <p style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#6b7280',
                marginTop: '10px'
              }}>
                Powered by <span style={{ color: '#6d28d9' }}>Sync</span>
              </p>
            </div>

            <div style={{
              textAlign: 'center',
              marginBottom: '30px'
            }}>
              <h2 style={{
                fontSize: '36px',
                fontWeight: '700',
                marginBottom: '15px',
                color: '#6d28d9'
              }}>
                New Here?
              </h2>
              <p style={{
                fontSize: '16px',
                color: '#6b7280'
              }}>
                Apply online in just 2 minutes.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                window.open('https://apply.atssfiber.ph', '_blank');
              }}
              style={{
                padding: '16px 48px',
                backgroundColor: '#6d28d9',
                color: '#ffffff',
                border: 'none',
                borderRadius: '30px',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
              }}
            >
              APPLY NOW
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;

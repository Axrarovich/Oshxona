import React, { useState } from 'react';
import './Login.css';

const BRAND_ASSET_PATH = `${process.env.PUBLIC_URL}/assets/brand`;

const Login = ({ onLogin }) => {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (login && password) {
      onLogin();
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-logo" role="img" aria-label="Keng Makon">
          <img
            className="brand-logo-image brand-logo-image-on-light"
            src={`${BRAND_ASSET_PATH}/km-logo-mark-on-light.png`}
            alt=""
            aria-hidden="true"
          />
          <img
            className="brand-logo-image brand-logo-image-on-dark"
            src={`${BRAND_ASSET_PATH}/km-logo-mark-on-dark.png`}
            alt=""
            aria-hidden="true"
          />
        </div>
        
        <h2>Hisobga kirish</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Login<span className="required">*</span></label>
            <input 
              type="text" 
              className="login-input"
              value={login} 
              onChange={(e) => setLogin(e.target.value)} 
              required 
            />
          </div>
          
          <div className="form-group">
            <label>Parol<span className="required">*</span></label>
            <div className="password-input-wrapper">
              <input 
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
              <button 
                type="button" 
                className="toggle-password" 
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
          
          <div className="form-options">
            <label className="checkbox-container">
              <input 
                type="checkbox" 
                checked={rememberMe} 
                onChange={(e) => setRememberMe(e.target.checked)} 
              />
              Eslab qolish
            </label>
          </div>
          
          <button type="submit" className="login-button">Kirish</button>
        </form>
      </div>
    </div>
  );
};

export default Login;

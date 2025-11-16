import React, { useState } from 'react';

function Login({ onLogin, onSwitchToRegister }) {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password) {
      return;
    }

    setIsLoading(true);
    try {
      await onLogin(formData.username, formData.password);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label" htmlFor="username">
          Username
        </label>
        <input
          type="text"
          id="username"
          name="username"
          className="form-input"
          value={formData.username}
          onChange={handleChange}
          placeholder="Enter your username"
          required
          disabled={isLoading}
          autoComplete="username"
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="password">
          Password
        </label>
        <div style={{ position: 'relative' }}>
          <input
            type={showPassword ? 'text' : 'password'}
            id="password"
            name="password"
            className="form-input"
            style={{ paddingRight: '45px' }}
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter your password"
            required
            disabled={isLoading}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              fontSize: '18px',
              padding: '4px 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            disabled={isLoading}
            title={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? '👁️' : '👁️‍🗨️'}
          </button>
        </div>
      </div>

      <button 
        type="submit" 
        className="btn btn-primary"
        disabled={isLoading || !formData.username || !formData.password}
      >
        {isLoading ? (
          <div className="loading">
            <div className="spinner"></div>
            <span>Signing in...</span>
          </div>
        ) : (
          'Sign In'
        )}
      </button>

      <button 
        type="button" 
        className="btn btn-secondary"
        onClick={onSwitchToRegister}
        disabled={isLoading}
      >
        Create New Account
      </button>
    </form>
  );
}

export default Login;
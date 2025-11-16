import React, { useState } from 'react';

function Register({ onRegister, onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    
    // Clear specific error when user starts typing
    if (errors[e.target.name]) {
      setErrors({
        ...errors,
        [e.target.name]: ''
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Username validation
    if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters long';
    } else if (formData.username.length > 50) {
      newErrors.username = 'Username must be less than 50 characters';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, hyphens, and underscores';
    }

    // Password validation
    if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      await onRegister(formData.username, formData.password);
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
          placeholder="Choose a username"
          required
          disabled={isLoading}
          autoComplete="username"
        />
        {errors.username && (
          <div style={{ 
            marginTop: '6px', 
            fontSize: '12px',
            color: '#ef4444' 
          }}>
            {errors.username}
          </div>
        )}
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
            placeholder="Create a password"
            required
            disabled={isLoading}
            autoComplete="new-password"
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
        {errors.password && (
          <div style={{ 
            marginTop: '6px', 
            fontSize: '12px',
            color: '#ef4444' 
          }}>
            {errors.password}
          </div>
        )}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="confirmPassword">
          Confirm Password
        </label>
        <div style={{ position: 'relative' }}>
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            id="confirmPassword"
            name="confirmPassword"
            className="form-input"
            style={{ paddingRight: '45px' }}
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Confirm your password"
            required
            disabled={isLoading}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
            title={showConfirmPassword ? 'Hide password' : 'Show password'}
          >
            {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
          </button>
        </div>
        {errors.confirmPassword && (
          <div style={{ 
            marginTop: '6px', 
            fontSize: '12px',
            color: '#ef4444' 
          }}>
            {errors.confirmPassword}
          </div>
        )}
      </div>

      <div className="security-info">
        🔒 Your encryption keys will be generated locally and stored securely on your device
      </div>

      <button 
        type="submit" 
        className="btn btn-primary"
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="loading">
            <div className="spinner"></div>
            <span>Creating Account...</span>
          </div>
        ) : (
          'Create Account'
        )}
      </button>

      <button 
        type="button" 
        className="btn btn-secondary"
        onClick={onSwitchToLogin}
        disabled={isLoading}
      >
        Back to Sign In
      </button>
    </form>
  );
}

export default Register;
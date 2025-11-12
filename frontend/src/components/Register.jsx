import React, { useState } from 'react';

function Register({ onRegister, onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

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
        />
        {errors.username && (
          <div className="error-message" style={{ marginTop: '5px', fontSize: '12px' }}>
            {errors.username}
          </div>
        )}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="password">
          Password
        </label>
        <input
          type="password"
          id="password"
          name="password"
          className="form-input"
          value={formData.password}
          onChange={handleChange}
          placeholder="Create a password"
          required
          disabled={isLoading}
        />
        {errors.password && (
          <div className="error-message" style={{ marginTop: '5px', fontSize: '12px' }}>
            {errors.password}
          </div>
        )}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="confirmPassword">
          Confirm Password
        </label>
        <input
          type="password"
          id="confirmPassword"
          name="confirmPassword"
          className="form-input"
          value={formData.confirmPassword}
          onChange={handleChange}
          placeholder="Confirm your password"
          required
          disabled={isLoading}
        />
        {errors.confirmPassword && (
          <div className="error-message" style={{ marginTop: '5px', fontSize: '12px' }}>
            {errors.confirmPassword}
          </div>
        )}
      </div>

      <div className="security-info" style={{ 
        background: 'rgba(102, 126, 234, 0.1)', 
        padding: '10px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        fontSize: '12px',
        color: '#4a5568'
      }}>
        🔒 Your encryption keys will be generated locally and never leave your device
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
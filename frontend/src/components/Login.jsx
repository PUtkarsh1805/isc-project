import React, { useState } from 'react';

function Login({ onLogin, onSwitchToRegister }) {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);

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
        />
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
          placeholder="Enter your password"
          required
          disabled={isLoading}
        />
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
        Create Account
      </button>
    </form>
  );
}

export default Login;
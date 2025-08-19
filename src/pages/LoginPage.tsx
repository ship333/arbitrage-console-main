import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const [token, setToken] = useState('');
  const navigate = useNavigate();
  const location = useLocation() as any;
  const from = location.state?.from?.pathname || '/';

  const onSubmit: React.FormEventHandler = (e) => {
    e.preventDefault();
    if (token.trim()) {
      localStorage.setItem('authToken', token.trim());
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 border rounded-md p-6 bg-background">
        <h1 className="text-xl font-semibold">Login</h1>
        <p className="text-sm text-muted-foreground">Enter an API token to continue.</p>
        <input
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Paste token"
          className="w-full border rounded px-3 py-2"
          data-testid="login-token-input"
        />
        <button type="submit" className="w-full bg-primary text-primary-foreground rounded px-3 py-2" data-testid="login-submit">
          Continue
        </button>
      </form>
    </div>
  );
};

export default LoginPage;

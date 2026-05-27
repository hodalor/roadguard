import React, { useState } from 'react';

import { postJson } from '../services/api';

export default function AdminLoginPage({ onLogin }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pin, setPin] = useState('1234');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await postJson('/admin/auth/login', {
        phoneNumber,
        pin,
      });

      onLogin(response.data);
    } catch (requestError) {
      setError(requestError.message || 'Unable to log in admin.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="login-card__brand">RoadGuide Ghana</div>
        <h1 className="login-card__title">Admin Login</h1>
        <p className="login-card__subtitle">
          Sign in with the seeded super admin or any approved admin account.
        </p>

        {error ? <div className="page-notice page-notice--error">{error}</div> : null}

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="login-form__field">
            <span>Phone number</span>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(event) =>
                setPhoneNumber(event.target.value.replace(/\D/g, '').slice(0, 11))
              }
              placeholder="0200000000"
              required
            />
          </label>

          <label className="login-form__field">
            <span>4-digit PIN</span>
            <input
              type="password"
              value={pin}
              onChange={(event) =>
                setPin(event.target.value.replace(/\D/g, '').slice(0, 4))
              }
              placeholder="1234"
              required
            />
          </label>

          <button type="submit" className="primary-button login-form__submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Login'}
          </button>
        </form>
      </section>
    </main>
  );
}

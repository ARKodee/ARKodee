import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthFlow } from '../../hooks/userAuthFlow'
import { loginUser, registerUser } from '../../lib/auth'
import { useAuth } from '../../store/AuthContext'

export function AuthForm() {
  const { setAuth } = useAuth()
  const navigate = useNavigate()
  const { step, isLoading, error, handleCheckEmail } = useAuthFlow()

  // Form states
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')

  // When user clicks "Get Started" or submits the final form
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (step === 'EMAIL') {
      await handleCheckEmail(email)
    }
    else if (step === 'LOGIN') {
      try {
        const response = await loginUser(email, password)
        setAuth(response.token, response.user)
        navigate('/dashboard')
      } catch (err) {
        alert('Wrong password or connection failed!')
      }
    }
    else if (step === 'REGISTER') {
      try {
        const response = await registerUser({ email, password, fullName })
        setAuth(response.token, response.user)
        navigate('/dashboard')
      } catch (err) {
        alert('Registration failed.')
      }
    }
  }

  // Fallback dev login bypass
  const handleDevBypass = () => {
    setAuth('mock-token', {
      email: 'dev@arkodee.io',
      fullName: 'Developer Operator',
      name: 'Developer'
    })
    navigate('/dashboard')
  }

  return (
    <div className="auth-container">
      {/* Decorative scanline and grids */}
      <div className="pointer-events-none fixed inset-x-0 z-50 animate-scan-line" style={{
        height: 3,
        background: 'linear-gradient(transparent 0%, rgba(245,158,11,0.045) 50%, transparent 100%)',
      }} />
      <div className="auth-bg-grid" />
      <div className="auth-bg-glow" />

      <div className="auth-card">
        {/* Logo/Icon */}
        <div className="auth-logo-row">
          <span className="auth-logo-dot animate-pulse" />
          <span className="auth-logo-text">ARKODEE // GATEKEEPER</span>
        </div>

        <h2>{step === 'EMAIL' ? 'Get Started' : step === 'LOGIN' ? 'Welcome Back' : 'Create Account'}</h2>
        <p className="auth-subtitle">
          {step === 'EMAIL' 
            ? 'Enter your operator email to initialize authentication sequence.' 
            : step === 'LOGIN' 
              ? 'Provide access credentials to decrypt dashboard portal.' 
              : 'Register new operator node credentials in system database.'}
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label>Operator Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@arkodee.io"
              disabled={step !== 'EMAIL'}
              required
            />
          </div>

          {/* STEP 2: Existing user gets password option */}
          {step === 'LOGIN' && (
            <div className="auth-field">
              <label>Password</label>
              <input
                type="password"
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoFocus
              />
            </div>
          )}

          {/* STEP 2: New user gets full registration options */}
          {step === 'REGISTER' && (
            <>
              <div className="auth-field">
                <label>Full Name</label>
                <input
                  type="text"
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  required
                  autoFocus
                />
              </div>
              <div className="auth-field">
                <label>Create Password</label>
                <input
                  type="password"
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            </>
          )}

          {error && <p className="auth-error-msg">{error}</p>}

          <button type="submit" disabled={isLoading} className="auth-submit-btn">
            {isLoading ? 'Decrypting...' : step === 'EMAIL' ? 'Proceed' : 'Submit Credentials'}
          </button>
        </form>

        {/* Developer Offline Bypass Option */}
        <div className="auth-bypass-container">
          <div className="auth-bypass-divider">
            <span>DEVELOPER OPERATIONS</span>
          </div>
          <button
            type="button"
            onClick={handleDevBypass}
            className="auth-bypass-btn"
            id="dev-bypass-btn"
          >
            Bypass Verification (Offline Mode)
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { useAuthFlow } from '../../hooks/userAuthFlow'
import { googleLoginUser, loginUser, registerUser } from '../../lib/auth'
import { useAuth } from '../../store/AuthContext'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import './AuthForm.css'

const IconCode = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
  </svg>
)

const COPY = {
  EMAIL:    { heading: 'Welcome',       sub: 'Enter your email to get started.' },
  LOGIN:    { heading: 'Welcome back',  sub: 'Enter your password to sign in.' },
  REGISTER: { heading: 'Create account', sub: 'Fill in your details to register.' },
}

export function AuthForm() {
  const { setAuth } = useAuth()
  const navigate = useNavigate()
  const { step, isLoading, error, handleCheckEmail } = useAuthFlow()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [googleError, setGoogleError]       = useState('')
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (step === 'EMAIL') {
      await handleCheckEmail(email)
    } else if (step === 'LOGIN') {
      try {
        const res = await loginUser(email, password)
        setAuth(res.token, res.user)
        navigate('/dashboard')
      } catch {
        // error surfaced via hook
      }
    } else if (step === 'REGISTER') {
      try {
        const res = await registerUser({ email, password, fullName })
        setAuth(res.token, res.user)
        navigate('/dashboard')
      } catch {
        // error surfaced via hook
      }
    }
  }

  const handleGoogleSuccess = async (credentialResponse) => {
    const idToken = credentialResponse?.credential
    if (!idToken) { setGoogleError('Google sign-in did not return a valid credential.'); return }
    setIsGoogleLoading(true)
    setGoogleError('')
    try {
      const res = await googleLoginUser(idToken)
      setAuth(res.token, res.user)
      navigate('/dashboard')
    } catch (err) {
      setGoogleError(err?.message || 'Google sign-in failed. Please try again.')
    } finally {
      setIsGoogleLoading(false)
    }
  }

  const handleDevBypass = () => {
    setAuth('mock-token', { email: 'dev@arkodee.io', fullName: 'Developer', name: 'Developer' })
    navigate('/dashboard')
  }

  const { heading, sub } = COPY[step] || COPY.EMAIL
  const btnLabel = isLoading
    ? 'Please wait…'
    : step === 'EMAIL' ? 'Continue'
    : step === 'LOGIN' ? 'Sign in'
    : 'Create account'

  return (
    <div className="auth-page">
      <div className="auth-card">

        {/* Brand */}
        <div className="auth-brand">
          <span className="auth-brand-icon"><IconCode /></span>
          <span className="auth-brand-name">ARKodee</span>
        </div>

        {/* Heading */}
        <div>
          <h1 className="auth-heading">{heading}</h1>
          <p className="auth-subheading">{sub}</p>
        </div>

        {/* Panel */}
        <div className="auth-panel">

          {/* Google */}
          <div className="auth-google-wrap">
            {googleClientId ? (
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setGoogleError('Google sign-in was cancelled or failed.')}
                useOneTap={false}
                theme="filled_black"
                shape="rectangular"
                text="continue_with"
                size="large"
                width="320"
              />
            ) : (
              <p className="auth-google-unavail">Google login unavailable — set VITE_GOOGLE_CLIENT_ID.</p>
            )}
            {isGoogleLoading && <p className="auth-google-unavail">Verifying with Google…</p>}
            {googleError && <p style={{ color: 'var(--danger)', fontSize: 'var(--text-xs)' }}>{googleError}</p>}
          </div>

          {/* Divider */}
          <div className="auth-or">or continue with email</div>

          {/* Form */}
          <form className="auth-form" onSubmit={handleSubmit}>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={step !== 'EMAIL'}
              required
            />

            {step === 'REGISTER' && (
              <Input
                label="Full name"
                type="text"
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                required
                autoFocus
              />
            )}

            {(step === 'LOGIN' || step === 'REGISTER') && (
              <Input
                label={step === 'REGISTER' ? 'Create password' : 'Password'}
                type="password"
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoFocus={step === 'LOGIN'}
              />
            )}

            {(error || googleError) && (
              <div className="auth-error">{error || googleError}</div>
            )}

            <Button variant="primary" size="lg" style={{ width: '100%' }} type="submit" loading={isLoading}>
              {btnLabel}
            </Button>
          </form>
        </div>

        {/* Dev bypass */}
        <div className="auth-dev">
          <span className="auth-dev-label">developer</span>
          <button className="auth-dev-btn" type="button" onClick={handleDevBypass} id="dev-bypass-btn">
            Bypass auth (offline mode)
          </button>
        </div>

      </div>
    </div>
  )
}

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthFlow } from '../hooks/userAuthFlow'
import { loginUser, registerUser } from '../lib/auth'
import { useAuth } from '../store/AuthContext'

export function AuthPage() {
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
        navigate('/')
      } catch (err) {
        alert('Wrong password!')
      }
    }
    else if (step === 'REGISTER') {
      try {
        const response = await registerUser({ email, password, fullName })
        setAuth(response.token, response.user)
        navigate('/')
      } catch (err) {
        alert('Registration failed.')
      }
    }
  }


// NOTE: Temporary UI.
  return (
    <div className="auth-card">
      <h2>{step === 'EMAIL' ? 'Get Started' : step === 'LOGIN' ? 'Welcome Back' : 'Create Account'}</h2>
      
      <form onSubmit={handleSubmit}>
        {/* Always visible or locked depending on step */}
        <input 
          type="email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          placeholder="Enter your email"
          disabled={step !== 'EMAIL'} 
          required 
        />

        {/* STEP 2: Existing user gets password option */}
        {step === 'LOGIN' && (
          <input 
            type="password" 
            onChange={(e) => setPassword(e.target.value)} 
            placeholder="Enter your password" 
            required 
          />
        )}

        {/* STEP 2: New user gets full registration options */}
        {step === 'REGISTER' && (
          <>
            <input 
              type="text" 
              onChange={(e) => setFullName(e.target.value)} 
              placeholder="Full Name" 
              required 
            />
            <input 
              type="password" 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Create a strong password" 
              required 
            />
          </>
        )}

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Processing...' : step === 'EMAIL' ? 'Get Started' : 'Submit'}
        </button>
      </form>
    </div>
  );
}
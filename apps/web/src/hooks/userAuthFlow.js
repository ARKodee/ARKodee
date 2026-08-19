import { useState } from 'react'
import { checkEmailExists } from '../lib/auth'

export function useAuthFlow() {
  const [step, setStep] = useState('EMAIL') // EMAIL -> LOGIN or REGISTER
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleCheckEmail = async (email) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await checkEmailExists(email)
      setStep(response.exists ? 'LOGIN' : 'REGISTER')
    } catch (err) {
      setError('Failed to check email. Please try again.');
    } finally {
      setIsLoading(false)
    }
  };

  return { step, isLoading, error, handleCheckEmail }
}
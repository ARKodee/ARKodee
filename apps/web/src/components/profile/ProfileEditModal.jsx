/**
 * ProfileEditModal - Simple profile editor for full name and avatar URL
 */

import React, { useEffect, useState } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import './ProfileComponents.css'

export function ProfileEditModal({
  isOpen,
  isSaving,
  error,
  initialValues,
  onClose,
  onSubmit,
}) {
  const [fullName, setFullName] = useState(initialValues.fullName || '')
  const [avatarUrl, setAvatarUrl] = useState(initialValues.avatarUrl || '')

  useEffect(() => {
    if (isOpen) {
      setFullName(initialValues.fullName || '')
      setAvatarUrl(initialValues.avatarUrl || '')
    }
  }, [isOpen, initialValues.fullName, initialValues.avatarUrl])

  useEffect(() => {
    if (!isOpen) return undefined

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit({
      fullName: fullName.trim(),
      avatar_url: avatarUrl.trim(),
    })
  }

  return (
    <div className="profile-modal" role="presentation" onClick={onClose}>
      <div
        className="profile-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-edit-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="profile-modal__header">
          <div>
            <h3 id="profile-edit-title" className="profile-modal__title">Edit profile</h3>
            <p className="profile-modal__subtitle">Update your display name and avatar link.</p>
          </div>
          <button type="button" className="profile-modal__close" onClick={onClose} aria-label="Close editor">
            ×
          </button>
        </div>

        <form className="profile-modal__form" onSubmit={handleSubmit}>
          <Input
            label="Full name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Your display name"
          />
          <Input
            label="Avatar URL"
            value={avatarUrl}
            onChange={(event) => setAvatarUrl(event.target.value)}
            placeholder="https://..."
            hint="Leave empty to use the default initials avatar."
          />

          {error && <div className="profile-modal__error" role="alert">{error}</div>}

          <div className="profile-modal__actions">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={isSaving}>
              Save changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
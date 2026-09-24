import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import useAuth from '../auth/useAuth.jsx'
import {
  getStoredOwnerSession,
  isOwnerUser,
  setStoredOwnerSession,
  verifyOwnerCredentials,
} from '../auth/ownerAuth.js'
import OwnerAccessModal from '../components/dashboard/OwnerAccessModal.jsx'

const OwnerRevenueContext = createContext(null)

export function OwnerRevenueProvider({ children }) {
  const { user } = useAuth()
  const [isUnlocked, setIsUnlocked] = useState(() => {
    return getStoredOwnerSession()
  })
  const [isModalOpen, setIsModalOpen] = useState(false)

  // If user logs in with owner account directly, automatically unlock
  useEffect(() => {
    if (isOwnerUser(user)) {
      setIsUnlocked(true)
      setStoredOwnerSession(true)
    }
  }, [user])

  const unlock = useCallback((email, password) => {
    const valid = verifyOwnerCredentials(email, password)
    if (valid) {
      setIsUnlocked(true)
      setStoredOwnerSession(true)
      return true
    }
    return false
  }, [])

  const lock = useCallback(() => {
    setIsUnlocked(false)
    setStoredOwnerSession(false)
  }, [])

  const openModal = useCallback(() => {
    setIsModalOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  const value = useMemo(
    () => ({
      isUnlocked,
      unlock,
      lock,
      isModalOpen,
      openModal,
      closeModal,
    }),
    [isUnlocked, unlock, lock, isModalOpen, openModal, closeModal],
  )

  return (
    <OwnerRevenueContext.Provider value={value}>
      {children}
      <OwnerAccessModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onUnlock={unlock}
      />
    </OwnerRevenueContext.Provider>
  )
}

export function useOwnerRevenue() {
  const ctx = useContext(OwnerRevenueContext)
  if (!ctx) {
    // Fallback safe state if used outside provider
    return {
      isUnlocked: false,
      unlock: () => false,
      lock: () => {},
      isModalOpen: false,
      openModal: () => {},
      closeModal: () => {},
    }
  }
  return ctx
}

export default OwnerRevenueContext

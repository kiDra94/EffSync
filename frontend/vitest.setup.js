import { afterEach, beforeEach, vi } from 'vitest'
import { cleanup } from '@testing-library/vue'
import { createPinia, setActivePinia } from 'pinia'

// M25 (decision Q19): components read through stores, so every test has a
// fresh Pinia; a spec may still set its own or mock a store
beforeEach(() => {
  setActivePinia(createPinia())
})

afterEach(() => {
  cleanup()
})

vi.mock('@/stores/authStore', async () => {
  const { ref } = await vi.importActual('vue')
  return {
    useAuthStore: vi.fn(() => ({
      token: ref('fake-token-123'),
      userId: ref(1),
      logout: vi.fn()
    }))
  }
})

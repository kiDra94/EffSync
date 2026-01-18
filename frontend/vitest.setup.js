import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/vue'

afterEach(() => {
  cleanup()
})

vi.mock('@/stores/authStore', () => {
  const { ref } = require('vue')
  return {
    useAuthStore: vi.fn(() => ({
      token: ref('fake-token-123'),
      userId: ref(1),
      logout: vi.fn()
    }))
  }
})

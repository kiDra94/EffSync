import { describe, it, expect } from 'vitest'
import { useTaskValidation } from './useTaskValidation'

// T100 (M16): COMPLETED needs 100 %; 100 % on an open task is allowed (the
// checkbox completes it), so it's only a hint
describe('useTaskValidation status and progress', () => {
  it('rejects COMPLETED below 100 %', () => {
    const { validateStatusProgress, errors } = useTaskValidation()

    expect(validateStatusProgress('COMPLETED', 80)).toBe(false)
    expect(errors.progress).toContain('100%')
  })

  it('accepts 100 % on an open task and only hints at completing it', () => {
    const { validateStatusProgress, errors, warnings } = useTaskValidation()

    expect(validateStatusProgress('IN_PROGRESS', 100)).toBe(true)
    expect(errors.status).toBe('')
    expect(warnings.status).toContain('abgeschlossen')
  })
})

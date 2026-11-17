import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DocumentGradeRow from './DocumentGradeRow.vue'

const inTable = (document) =>
  mount({ components: { DocumentGradeRow }, props: ['document'], template: '<table><tbody><DocumentGradeRow :document="document" /></tbody></table>' }, { props: { document } })

// a graded document's grade under its table row (Definition of done: out of DocumentView)
describe('DocumentGradeRow', () => {
  it('shows the grade, who gave it and the feedback', () => {
    const wrapper = inTable({ grade: '2', feedback: 'Gute Gliederung.', graded_at: '2026-11-10T09:00:00Z', graded_by_user: { firstname: 'Anna', lastname: 'Lehrerin' } })

    expect(wrapper.find('.grade-value').text()).toBe('2')
    expect(wrapper.find('.grade-teacher').text()).toBe('von Anna Lehrerin')
    expect(wrapper.find('.grade-feedback').text()).toBe('Gute Gliederung.')
  })

  it('shows a dash for feedback without a grade', () => {
    const wrapper = inTable({ grade: null, feedback: 'Bitte überarbeiten.', graded_by_user: null })

    expect(wrapper.find('.grade-value').text()).toBe('—')
  })
})

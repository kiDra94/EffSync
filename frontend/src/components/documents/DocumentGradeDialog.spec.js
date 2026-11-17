import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DocumentGradeDialog from './DocumentGradeDialog.vue'

// a teacher grades a document (Definition of done: out of DocumentView)
describe('DocumentGradeDialog', () => {
  it('starts from the document\'s grade and hands over what was entered', async () => {
    const wrapper = mount(DocumentGradeDialog, { props: { document: { document_id: 5, name: 'abgabe.pdf', grade: '3', feedback: '' } } })

    expect(wrapper.find('.modal-header p').text()).toBe('abgabe.pdf')
    expect(wrapper.find('#document-grade').element.value).toBe('3')
    await wrapper.find('#document-grade').setValue(' 2 ')
    await wrapper.find('#document-feedback').setValue('Quellen fehlen.')
    await wrapper.find('.btn-primary').trigger('click')

    expect(wrapper.emitted('save')).toEqual([[{ grade: '2', feedback: 'Quellen fehlen.' }]])
  })

  it('closes on the cross, the cancel button and a click beside it', async () => {
    const wrapper = mount(DocumentGradeDialog, { props: { document: { document_id: 5, name: 'a.pdf' } } })

    await wrapper.find('.close-btn').trigger('click')
    await wrapper.find('.btn-secondary').trigger('click')
    await wrapper.find('.modal-overlay').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(3)
  })

  it('shows that it is saving', () => {
    const wrapper = mount(DocumentGradeDialog, { props: { document: { document_id: 5, name: 'a.pdf' }, saving: true } })

    expect(wrapper.find('.btn-primary').attributes('disabled')).toBeDefined()
    expect(wrapper.find('.btn-primary').text()).toBe('Speichert…')
  })
})

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SearchResults from './SearchResults.vue'

// T43 (FA-53, M26): the search results grouped by category
describe('SearchResults', () => {
  const groups = [
    { key: 'project', label: 'Projekte', items: [{ type: 'project', icon: '📁', label: 'Mathe Projekt', sub: 'TODO', id: 1 }] },
    {
      key: 'user',
      label: 'Benutzer',
      items: [
        { type: 'user', icon: '👤', label: 'Felix Fuchs', sub: '@ffuchs', id: 4 },
        { type: 'user', icon: '👤', label: 'Anna Lehrer', sub: '@alehrerin', id: 7 },
      ],
      more: 2,
    },
  ]

  it('shows each category with its heading and its results', () => {
    const wrapper = mount(SearchResults, { props: { groups } })

    const sections = wrapper.findAll('.search-group')
    expect(sections.map((s) => s.find('.search-group-label').text())).toEqual(['Projekte', 'Benutzer'])
    expect(sections[1].findAll('.search-result-item').map((r) => r.find('.result-label').text())).toEqual([
      'Felix Fuchs',
      'Anna Lehrer',
    ])
    expect(sections[1].find('.result-sub').text()).toBe('@ffuchs')
  })

  it('tells which result was chosen', async () => {
    const wrapper = mount(SearchResults, { props: { groups } })

    await wrapper.findAll('.search-result-item')[2].trigger('click')

    expect(wrapper.emitted('select')).toEqual([[groups[1].items[1]]])
  })

  it('renders nothing without results', () => {
    expect(mount(SearchResults, { props: { groups: [] } }).find('.search-results').exists()).toBe(false)
  })

  // review M26: a listbox of named groups, usable from the keyboard
  it('names each group by its heading and the list as a whole', () => {
    const wrapper = mount(SearchResults, { props: { groups } })

    expect(wrapper.find('[role="listbox"]').attributes('aria-label')).toBe('Suchergebnisse')
    const group = wrapper.findAll('[role="group"]')[1]
    const heading = group.find('.search-group-label')
    expect(group.attributes('aria-labelledby')).toBe(heading.attributes('id'))
    expect(group.findAll('[role="option"]')).toHaveLength(2)
  })

  it('says how many results a group leaves out', () => {
    const wrapper = mount(SearchResults, { props: { groups } })

    expect(wrapper.findAll('[role="group"]')[1].find('.search-more').text()).toBe('+2 weitere')
    expect(wrapper.findAll('[role="group"]')[0].find('.search-more').exists()).toBe(false)
  })

  it('moves with the arrow keys, picks with Enter and closes with Escape', async () => {
    const wrapper = mount(SearchResults, { props: { groups }, attachTo: document.body })
    const options = wrapper.findAll('[role="option"]')

    wrapper.vm.focusFirst()
    expect(document.activeElement).toBe(options[0].element)
    await options[0].trigger('keydown', { key: 'ArrowDown' })
    expect(document.activeElement).toBe(options[1].element)
    await options[1].trigger('keydown', { key: 'ArrowUp' })
    expect(document.activeElement).toBe(options[0].element)

    await options[0].trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('select')).toEqual([[groups[0].items[0]]])
    await options[0].trigger('keydown', { key: 'Escape' })
    expect(wrapper.emitted('close')).toHaveLength(1)
    wrapper.unmount()
  })
})

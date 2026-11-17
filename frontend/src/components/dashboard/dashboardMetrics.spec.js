import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

const { fetchMetrics } = vi.hoisted(() => ({ fetchMetrics: vi.fn() }));
vi.mock('@/api/metrics', () => ({ fetchMetrics }));
// jsdom has no canvas: the charts are stubs that keep their data
vi.mock('vue-chartjs', () => ({
  Line: { name: 'Line', props: ['data', 'options'], template: '<div class="line-stub" />' },
  Doughnut: { name: 'Doughnut', props: ['data', 'options'], template: '<div class="doughnut-stub" />' },
}));

import TrendChart from './TrendChart.vue';
import ProjectProgressList from './ProjectProgressList.vue';
import TopMembersList from './TopMembersList.vue';

// M25: the components read through the real metrics store, on the mocked API
beforeEach(() => {
  vi.clearAllMocks();
  setActivePinia(createPinia());
});

// GOALS.md M24: the dashboard elements of FA-30 to FA-35
describe('TrendChart (FA-33)', () => {
  it('loads the weekly trends and switches to monthly', async () => {
    fetchMetrics.mockResolvedValue({ labels: ['KW 45', 'KW 46'], created: [2, 0], completed: [0, 1] });
    const wrapper = mount(TrendChart);
    await flushPromises();

    expect(fetchMetrics).toHaveBeenCalledWith('trends', { period: 'week' });
    const line = wrapper.findComponent({ name: 'Line' });
    expect(line.props('data').labels).toEqual(['KW 45', 'KW 46']);
    expect(line.props('data').datasets.map((d) => d.label)).toEqual(['Erstellt', 'Abgeschlossen']);

    await wrapper.findAll('.period-switch button')[1].trigger('click');
    await flushPromises();
    expect(fetchMetrics).toHaveBeenLastCalledWith('trends', { period: 'month' });
  });

  // review M24: a slow older answer doesn't replace the newer period's data
  it('keeps the data of the last chosen period', async () => {
    let answerWeek;
    fetchMetrics
      .mockImplementationOnce(() => new Promise((resolve) => (answerWeek = resolve)))
      .mockResolvedValueOnce({ labels: ['Nov 2026'], created: [5], completed: [1] });
    const wrapper = mount(TrendChart);
    await wrapper.findAll('.period-switch button')[1].trigger('click');
    await flushPromises();
    answerWeek({ labels: ['KW 46'], created: [1], completed: [0] });
    await flushPromises();

    expect(wrapper.findComponent({ name: 'Line' }).props('data').labels).toEqual(['Nov 2026']);
  });
});

describe('ProjectProgressList (FA-30, FA-34)', () => {
  it('shows each active project with a progress bar', async () => {
    fetchMetrics.mockResolvedValue([
      { task_id: 1, title: 'Diplomarbeit', deadline: null, subtask_count: 4, progress: 75 },
      { task_id: 2, title: 'Referat', deadline: null, subtask_count: 0, progress: 30 },
    ]);
    const wrapper = mount(ProjectProgressList);
    await flushPromises();

    expect(fetchMetrics).toHaveBeenCalledWith('projects');
    const projects = wrapper.findAll('.project');
    expect(projects).toHaveLength(2);
    expect(projects[0].text()).toContain('Diplomarbeit');
    expect(projects[0].find('.progress-fill').attributes('style')).toContain('width: 75%');
    expect(projects[0].find('[role="progressbar"]').attributes('aria-valuenow')).toBe('75');
  });

  it('says when there are no active projects', async () => {
    fetchMetrics.mockResolvedValue([]);
    const wrapper = mount(ProjectProgressList);
    await flushPromises();

    expect(wrapper.text()).toContain('Keine aktiven Projekte');
  });

  // review M24: a failed request is an error, not "no projects"
  it('shows an error when the projects fail to load', async () => {
    fetchMetrics.mockRejectedValue(new Error('500'));
    const wrapper = mount(ProjectProgressList);
    await flushPromises();

    expect(wrapper.text()).toContain('konnten nicht geladen werden');
    expect(wrapper.text()).not.toContain('Keine aktiven Projekte');
  });
});

describe('TopMembersList (FA-35)', () => {
  it('ranks the members by completed tasks', async () => {
    fetchMetrics.mockResolvedValue([
      { user_id: 5, firstname: 'Laura', lastname: 'Gruber', completed: 3 },
      { user_id: 4, firstname: 'Felix', lastname: 'Fuchs', completed: 1 },
    ]);
    const wrapper = mount(TopMembersList);
    await flushPromises();

    expect(fetchMetrics).toHaveBeenCalledWith('top-members');
    const rows = wrapper.findAll('.member');
    expect(rows.map((row) => row.find('.rank').text())).toEqual(['1', '2']);
    expect(rows[0].text()).toContain('Laura Gruber');
    expect(rows[0].text()).toContain('3 erledigt');
  });
});

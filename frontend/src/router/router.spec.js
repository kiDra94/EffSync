import { describe, it, expect } from 'vitest';
import router from './index';

// Guards deletions of unused code (GOALS.md M5): every route must still
// resolve to an existing component.
describe('router', () => {
  const records = router.getRoutes().filter((route) => route.components?.default);

  it.each(records.map((route) => [route.path, route]))('%s resolves its component', async (_path, route) => {
    const component = route.components.default;
    const resolved = typeof component === 'function' ? (await component()).default : component;

    expect(resolved).toBeTruthy();
  });

  it('finds the routes', () => {
    expect(records.length).toBeGreaterThan(0);
  });

  // M27: the grades view (UC-13) and the audit log (UC-32) are routed
  it.each([
    ['Grades', '/grades'],
    ['AuditLog', '/admin/audit-log'],
  ])('routes %s at %s', (name, path) => {
    expect(router.resolve({ name }).path).toBe(path);
  });
});

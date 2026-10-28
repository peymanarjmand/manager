import { expect, it } from 'vitest';
import { DASHBOARD_ITEMS } from './constants';
it('keeps the one-time saved order, independent of Supabase hydration',()=>{
  expect(DASHBOARD_ITEMS.map(i=>i.id)).toEqual(['my-car','smart-accountant','customers','daily-tasks','health-dashboard','password-manager','assets','settings','phone-book']);
});

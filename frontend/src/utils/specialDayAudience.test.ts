import { describe, expect, it } from 'vitest';
import { audienceOf, groupTodos } from './specialDayAudience.js';
import { SPECIAL_DAYS } from './islamicCalendar.js';

const friday = SPECIAL_DAYS.find((d) => d.id === 'friday')!;
const actions = (gender: string | null) =>
  groupTodos(friday.todos, gender).map((g) => [g.audience, g.items.map((x) => x.todo.action)]);

describe('special-day guidance per person', () => {
  it('reads gender as brothers, sisters or unknown', () => {
    expect(audienceOf('male')).toBe('brothers');
    expect(audienceOf('female')).toBe('sisters');
    expect(audienceOf(null)).toBeNull();
    expect(audienceOf('')).toBeNull();
  });

  it('a brother sees the shared items and his own, never the sisters’ section', () => {
    const groups = groupTodos(friday.todos, 'male');
    expect(groups.map((g) => g.audience)).toEqual([null, 'brothers']);
    expect(JSON.stringify(actions('male'))).toContain("Attend Jumu'ah prayer");
    expect(JSON.stringify(actions('male'))).not.toContain('Pray Ẓuhr, 4 rakʿahs, at home');
  });

  it('a sister sees the shared items and her own, never the brothers’ section', () => {
    const groups = groupTodos(friday.todos, 'female');
    expect(groups.map((g) => g.audience)).toEqual([null, 'sisters']);
    const text = JSON.stringify(actions('female'));
    expect(text).toContain('Pray Ẓuhr, 4 rakʿahs, at home');
    expect(text).not.toContain("Attend Jumu'ah prayer in congregation");
    expect(text).not.toContain('Perform ghusl');
  });

  it('without a gender both sections show, each labelled', () => {
    expect(groupTodos(friday.todos, undefined).map((g) => g.audience)).toEqual([
      null,
      'brothers',
      'sisters',
    ]);
  });

  it('keeps each to-do’s own index (the translation keys are numbered)', () => {
    for (const g of groupTodos(friday.todos, null))
      for (const { todo, index } of g.items) expect(friday.todos[index]).toBe(todo);
  });

  it('every source a Friday to-do cites is in the day’s references', () => {
    const refs = friday.references.map((r) => r.text).join('\n');
    for (const cite of [
      'Sunan Abū Dāwūd 1067',
      'Sunan Abū Dāwūd 567',
      'Ṣaḥīḥ Muslim 873a',
      'Ṣaḥīḥ Muslim 443b',
      'Quran 24:31',
      'al-Ijmāʿ',
      'Ṣaḥīḥ al-Bukhārī 881',
      'Ṣaḥīḥ al-Bukhārī 934',
      'Sunan Abū Dāwūd 1052',
    ])
      expect(refs, cite).toContain(cite);
  });

  it('days without tagged items are unchanged: one group for everyone', () => {
    const ashura = SPECIAL_DAYS.find((d) => d.id === 'ashura')!;
    expect(groupTodos(ashura.todos, 'female')).toEqual([
      { audience: null, items: ashura.todos.map((todo, index) => ({ todo, index })) },
    ]);
  });
});

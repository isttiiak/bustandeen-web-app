// Personalised special-day guidance: a to-do tagged `for: 'brothers'` or `'sisters'` is
// shown only to that person; someone whose gender is unknown (a guest, or a profile
// without it) sees both groups, each under its own heading. Untagged to-dos are for all.

export type Audience = 'brothers' | 'sisters';

export interface TodoGroup<T> {
  /** null: for everyone, shown without a heading. */
  audience: Audience | null;
  /** Each to-do with its index in the day's list (the translation keys are numbered). */
  items: { todo: T; index: number }[];
}

export function audienceOf(gender: string | null | undefined): Audience | null {
  if (gender === 'male') return 'brothers';
  if (gender === 'female') return 'sisters';
  return null;
}

export function groupTodos<T extends { for?: Audience }>(
  todos: readonly T[],
  gender: string | null | undefined
): TodoGroup<T>[] {
  const mine = audienceOf(gender);
  const indexed = todos.map((todo, index) => ({ todo, index }));
  const groups: TodoGroup<T>[] = [
    { audience: null, items: indexed.filter(({ todo }) => !todo.for) },
  ];
  for (const audience of ['brothers', 'sisters'] as const) {
    if (mine && mine !== audience) continue;
    const items = indexed.filter(({ todo }) => todo.for === audience);
    if (items.length) groups.push({ audience, items });
  }
  return groups.filter((g) => g.items.length > 0);
}

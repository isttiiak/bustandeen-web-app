import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BTN_PRIMARY, CARD } from '../../bustanStyles.js';
import { ADMIN_INPUT_SM, BTN_DANGER } from '../adminParts.js';
import { useAddExpense, useDeleteExpense, useExpenses } from '../../../hooks/useAdminSadaqah.js';

export function ExpensesTab({ isServant }: { isServant: boolean }) {
  const { t } = useTranslation();
  const { data: expenses } = useExpenses();
  const [expForm, setExpForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    amount: '',
    description: '',
  });
  const addExpense = useAddExpense();
  const deleteExpense = useDeleteExpense();
  const totalExpenses = expenses?.reduce((sum, e) => sum + e.amount, 0) ?? 0;

  const saveExpense = () => {
    const amount = Number(expForm.amount);
    if (!expForm.date || !expForm.description.trim() || !(amount >= 0)) return;
    addExpense.mutate(
      { date: expForm.date, amount, description: expForm.description.trim() },
      {
        onSuccess: () =>
          setExpForm({ date: new Date().toISOString().slice(0, 10), amount: '', description: '' }),
      }
    );
  };
  const [confirmDeleteExpenseId, setConfirmDeleteExpenseId] = useState<string | null>(null);
  const clickDeleteExpense = (id: string) => {
    if (confirmDeleteExpenseId !== id) {
      setConfirmDeleteExpenseId(id);
      setTimeout(() => setConfirmDeleteExpenseId((cur) => (cur === id ? null : cur)), 6000);
      return;
    }
    setConfirmDeleteExpenseId(null);
    deleteExpense.mutate(id);
  };

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-white font-bold text-sm uppercase tracking-widest text-white/70">
          {t('adminSadaqah.expensesTitle', 'Project costs')}
        </h2>
        <p className="text-white/70 text-xs mt-0.5">
          {t(
            'adminSadaqah.expensesNote',
            'Internal record only, never shown publicly. This is also what the Analytics tab sums to auto-calculate a quarter\'s "spent" figure.'
          )}
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className={`${CARD} p-4 space-y-2`}>
          {expenses?.length === 0 && (
            <p className="text-white/70 text-sm">
              {t('adminSadaqah.noExpenses', 'No costs recorded yet.')}
            </p>
          )}
          {expenses?.map((e) => (
            <div
              key={e._id}
              className="flex items-center justify-between gap-3 border-b border-brand-border/60 pb-2 last:border-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="text-white font-bold text-sm">
                  {e.amount.toLocaleString()} <span className="text-xs text-white/70">BDT</span>
                </p>
                <p className="text-white/70 text-xs truncate">
                  {e.date.slice(0, 10)} · {e.description}
                </p>
              </div>
              {isServant && (
                <button
                  onClick={() => clickDeleteExpense(e._id)}
                  className={`${BTN_DANGER} shrink-0`}
                >
                  {confirmDeleteExpenseId === e._id
                    ? t('adminSadaqah.confirmDelete', 'Confirm?')
                    : t('adminSadaqah.delete', 'Delete')}
                </button>
              )}
            </div>
          ))}
          {!!expenses?.length && (
            <p className="text-white/70 text-xs font-bold pt-1">
              {t('adminSadaqah.totalCosts', 'Total: {{amount}} BDT', {
                amount: totalExpenses.toLocaleString(),
              })}
            </p>
          )}
        </div>

        <div className={`${CARD} p-4 space-y-2 h-fit`}>
          <p className="text-white/70 text-xs font-bold">
            {t('adminSadaqah.addExpense', 'Record a cost')}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={expForm.date}
              onChange={(e) => setExpForm((f) => ({ ...f, date: e.target.value }))}
              className={ADMIN_INPUT_SM}
            />
            <input
              type="number"
              value={expForm.amount}
              onChange={(e) => setExpForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder={t('adminSadaqah.amountBdt', 'Amount (BDT)')}
              aria-label={t('adminSadaqah.amountBdt', 'Amount (BDT)')}
              className={ADMIN_INPUT_SM}
            />
          </div>
          <input
            value={expForm.description}
            onChange={(e) => setExpForm((f) => ({ ...f, description: e.target.value }))}
            placeholder={t('adminSadaqah.expenseDescPlaceholder', 'e.g. Server hosting, September')}
            aria-label={t('adminSadaqah.expenseDescPlaceholder', 'e.g. Server hosting, September')}
            className={`${ADMIN_INPUT_SM} w-full`}
          />
          <button
            onClick={saveExpense}
            disabled={
              !expForm.date ||
              !expForm.description.trim() ||
              !(Number(expForm.amount) >= 0) ||
              addExpense.isPending
            }
            className={BTN_PRIMARY}
          >
            {t('adminSadaqah.save', 'Save')}
          </button>
        </div>
      </div>
    </section>
  );
}

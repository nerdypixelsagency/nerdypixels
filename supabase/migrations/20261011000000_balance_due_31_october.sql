-- Early-bird balance is now due when early bird closes: Saturday 31 October 2026.
UPDATE public.cohorts SET balance_due_date = '2026-10-31' WHERE status = 'open';

-- Add the combined role only after the fisher enum value has been committed.

alter type public.user_role add value if not exists 'farmer_fisher' after 'fisher';

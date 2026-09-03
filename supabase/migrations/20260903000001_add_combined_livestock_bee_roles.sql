-- Combined producer roles for farmers who also raise animals or bees.
-- Follows the same pattern as farmer_fisher — must be in its own
-- migration because the base values (stockbreeder, beekeeper) become
-- referenceable only after the previous transaction commits.

alter type public.user_role add value if not exists 'farmer_stockbreeder' after 'farmer_fisher';
alter type public.user_role add value if not exists 'farmer_beekeeper' after 'farmer_stockbreeder';

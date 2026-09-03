-- Add "rent_supply" to price_list_kind so agri_supplier accounts
-- (γεωπόνοι / αγροεφόδια) can list rental equipment — τιναχτίρια
-- ελιάς, κλαδευτικά, ψεκαστικά, μηχανήματα κ.λπ. — with the same
-- price_listings machinery. Variants store the period (ημέρα, μήνα,
-- εργασία, έτος …) as a normal attribute so the schema stays intact.
--
-- Postgres requires new enum values to commit before another
-- migration can reference them, so this file only adds the value.

alter type public.price_list_kind add value if not exists 'rent_supply' after 'sell_retail';

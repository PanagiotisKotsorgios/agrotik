-- Add the "Γεωπόνος / Αγροεφόδια" role. This is an input-supplier
-- account (fertilisers, plant-protection, seeds, tools, agronomy
-- services) — the flip side of the current merchant/factory roles.
-- Suppliers sell to producers, so they list their catalogue prices
-- and expect direct phone contact rather than an in-app checkout.
--
-- PostgreSQL requires new enum values to be committed before another
-- migration can reference them, so this file only adds the value.

alter type public.user_role add value if not exists 'agri_supplier' after 'factory';

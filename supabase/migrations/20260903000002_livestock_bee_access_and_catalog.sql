-- Extend read/write access for the new producer roles and seed
-- livestock and beekeeping products with attribute schemas. Mirrors
-- the fisher_access_and_seafood migration: additive only, no existing
-- row is modified, all policies are recreated with `drop … if exists`.
--
-- The full producer role set is now:
--   farmer, fisher, farmer_fisher,
--   stockbreeder, beekeeper,
--   farmer_stockbreeder, farmer_beekeeper.
--
-- Every producer-scoped policy below enumerates the complete set so a
-- future role addition is a single grep-and-add.

drop policy if exists "profiles public read" on public.profiles;
create policy "profiles public read"
  on public.profiles for select
  using (
    is_active = true
    and is_public = true
    and deleted_at is null
    and role in (
      'farmer', 'fisher', 'farmer_fisher',
      'stockbreeder', 'beekeeper',
      'farmer_stockbreeder', 'farmer_beekeeper',
      'merchant', 'factory'
    )
  );

drop policy if exists "production_listings public read" on public.production_listings;
create policy "production_listings public read"
  on public.production_listings for select
  using (
    is_active = true
    and exists (
      select 1 from public.profiles p
      where p.id = owner_id
        and p.is_active = true
        and p.is_public = true
        and p.deleted_at is null
        and p.role in (
          'farmer', 'fisher', 'farmer_fisher',
          'stockbreeder', 'beekeeper',
          'farmer_stockbreeder', 'farmer_beekeeper'
        )
    )
  );

drop policy if exists "production_listings owner write" on public.production_listings;
create policy "production_listings owner write"
  on public.production_listings for all
  using (
    auth.uid() = owner_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_active = true
        and p.deleted_at is null
        and p.role in (
          'farmer', 'fisher', 'farmer_fisher',
          'stockbreeder', 'beekeeper',
          'farmer_stockbreeder', 'farmer_beekeeper'
        )
    )
  )
  with check (
    auth.uid() = owner_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_active = true
        and p.deleted_at is null
        and p.role in (
          'farmer', 'fisher', 'farmer_fisher',
          'stockbreeder', 'beekeeper',
          'farmer_stockbreeder', 'farmer_beekeeper'
        )
    )
  );

-- =====================================================================
-- Livestock catalog (Κτηνοτροφικά προϊόντα)
-- =====================================================================
insert into public.products (slug, name_el, category, unit, attributes_schema, status)
values
  ('milk_cow', 'Αγελαδινό γάλα', 'Κτηνοτροφικά προϊόντα', 'λίτρο',
    jsonb_build_object(
      'fat_pct',       jsonb_build_object('type', 'number', 'label', 'Λιπαρά %'),
      'protein_pct',   jsonb_build_object('type', 'number', 'label', 'Πρωτεΐνη %'),
      'breed',         jsonb_build_object('type', 'text',   'label', 'Φυλή αγελάδας'),
      'refrigeration', jsonb_build_object('type', 'text',   'label', 'Ψύξη / συντήρηση')
    ), 'active'),
  ('milk_sheep', 'Πρόβειο γάλα', 'Κτηνοτροφικά προϊόντα', 'λίτρο',
    jsonb_build_object(
      'fat_pct',     jsonb_build_object('type', 'number', 'label', 'Λιπαρά %'),
      'protein_pct', jsonb_build_object('type', 'number', 'label', 'Πρωτεΐνη %'),
      'breed',       jsonb_build_object('type', 'text',   'label', 'Φυλή προβάτου')
    ), 'active'),
  ('milk_goat', 'Γίδινο γάλα', 'Κτηνοτροφικά προϊόντα', 'λίτρο',
    jsonb_build_object(
      'fat_pct', jsonb_build_object('type', 'number', 'label', 'Λιπαρά %'),
      'breed',   jsonb_build_object('type', 'text',   'label', 'Φυλή')
    ), 'active'),
  ('milk_buffalo', 'Βουβαλίσιο γάλα', 'Κτηνοτροφικά προϊόντα', 'λίτρο',
    jsonb_build_object(
      'fat_pct', jsonb_build_object('type', 'number', 'label', 'Λιπαρά %')
    ), 'active'),
  ('beef', 'Βοδινό κρέας', 'Κτηνοτροφικά προϊόντα', 'κιλό',
    jsonb_build_object(
      'cut',        jsonb_build_object('type', 'text',   'label', 'Κοπή'),
      'breed',      jsonb_build_object('type', 'text',   'label', 'Φυλή'),
      'age_months', jsonb_build_object('type', 'number', 'label', 'Ηλικία (μήνες)'),
      'organic',    jsonb_build_object('type', 'text',   'label', 'Βιολογικό')
    ), 'active'),
  ('pork', 'Χοιρινό κρέας', 'Κτηνοτροφικά προϊόντα', 'κιλό',
    jsonb_build_object(
      'cut',     jsonb_build_object('type', 'text', 'label', 'Κοπή'),
      'organic', jsonb_build_object('type', 'text', 'label', 'Βιολογικό')
    ), 'active'),
  ('lamb', 'Αρνί', 'Κτηνοτροφικά προϊόντα', 'κιλό',
    jsonb_build_object(
      'age_weeks', jsonb_build_object('type', 'number', 'label', 'Ηλικία (εβδομάδες)'),
      'milk_fed',  jsonb_build_object('type', 'text',   'label', 'Γαλακτούχο')
    ), 'active'),
  ('goat_meat', 'Κατσίκι / ερίφι', 'Κτηνοτροφικά προϊόντα', 'κιλό',
    jsonb_build_object(
      'age_weeks', jsonb_build_object('type', 'number', 'label', 'Ηλικία (εβδομάδες)')
    ), 'active'),
  ('chicken_meat', 'Κοτόπουλο', 'Κτηνοτροφικά προϊόντα', 'κιλό',
    jsonb_build_object(
      'free_range', jsonb_build_object('type', 'text', 'label', 'Ελευθέρας βοσκής'),
      'organic',    jsonb_build_object('type', 'text', 'label', 'Βιολογικό')
    ), 'active'),
  ('eggs_hen', 'Αυγά κότας', 'Κτηνοτροφικά προϊόντα', 'τεμάχιο',
    jsonb_build_object(
      'grade', jsonb_build_object('type', 'text', 'label', 'Μέγεθος (S/M/L/XL)'),
      'class', jsonb_build_object('type', 'text', 'label', 'Κατηγορία (0 βιολογικά / 1 ελευθέρας / 2 αχυρώνα / 3 κλωβοστ.)')
    ), 'active'),
  ('eggs_quail', 'Αυγά ορτυκιού', 'Κτηνοτροφικά προϊόντα', 'τεμάχιο', '{}'::jsonb, 'active'),
  ('cheese_feta', 'Φέτα ΠΟΠ', 'Κτηνοτροφικά προϊόντα', 'κιλό',
    jsonb_build_object(
      'aged_days', jsonb_build_object('type', 'number', 'label', 'Ωρίμανση (ημέρες)'),
      'milk_mix',  jsonb_build_object('type', 'text',   'label', 'Είδος γάλακτος (πρόβειο / γίδινο / μικτό)')
    ), 'active'),
  ('cheese_kefalotyri', 'Κεφαλοτύρι', 'Κτηνοτροφικά προϊόντα', 'κιλό',
    jsonb_build_object(
      'aged_months', jsonb_build_object('type', 'number', 'label', 'Ωρίμανση (μήνες)')
    ), 'active'),
  ('cheese_myzithra', 'Μυζήθρα', 'Κτηνοτροφικά προϊόντα', 'κιλό',
    jsonb_build_object(
      'kind', jsonb_build_object('type', 'text', 'label', 'Τύπος (φρέσκια / ξηρή)')
    ), 'active'),
  ('yogurt_sheep', 'Πρόβειο γιαούρτι', 'Κτηνοτροφικά προϊόντα', 'κιλό',
    jsonb_build_object(
      'fat_pct', jsonb_build_object('type', 'number', 'label', 'Λιπαρά %')
    ), 'active'),
  ('wool_raw', 'Ακατέργαστο μαλλί', 'Κτηνοτροφικά προϊόντα', 'κιλό',
    jsonb_build_object(
      'breed', jsonb_build_object('type', 'text', 'label', 'Φυλή προβάτου'),
      'color', jsonb_build_object('type', 'text', 'label', 'Χρώμα')
    ), 'active'),
  ('manure', 'Κοπριά', 'Κτηνοτροφικά προϊόντα', 'τόνος',
    jsonb_build_object(
      'animal',    jsonb_build_object('type', 'text', 'label', 'Ζώο προέλευσης'),
      'composted', jsonb_build_object('type', 'text', 'label', 'Κομποστοποιημένη')
    ), 'active'),

-- =====================================================================
-- Beekeeping catalog (Μελισσοκομικά προϊόντα)
-- =====================================================================
  ('honey_thyme', 'Θυμαρίσιο μέλι', 'Μελισσοκομικά προϊόντα', 'κιλό',
    jsonb_build_object(
      'region',       jsonb_build_object('type', 'text',   'label', 'Περιοχή συλλογής'),
      'harvest_year', jsonb_build_object('type', 'number', 'label', 'Έτος συγκομιδής'),
      'raw',          jsonb_build_object('type', 'text',   'label', 'Ωμό / αθέρμαστο')
    ), 'active'),
  ('honey_pine', 'Πευκόμελο', 'Μελισσοκομικά προϊόντα', 'κιλό',
    jsonb_build_object(
      'region',       jsonb_build_object('type', 'text',   'label', 'Περιοχή συλλογής'),
      'harvest_year', jsonb_build_object('type', 'number', 'label', 'Έτος συγκομιδής')
    ), 'active'),
  ('honey_fir', 'Ελατίσιο μέλι (βανίλια)', 'Μελισσοκομικά προϊόντα', 'κιλό',
    jsonb_build_object(
      'region',       jsonb_build_object('type', 'text',   'label', 'Περιοχή συλλογής'),
      'harvest_year', jsonb_build_object('type', 'number', 'label', 'Έτος συγκομιδής')
    ), 'active'),
  ('honey_forest', 'Δασόμελο / ανθόμελο', 'Μελισσοκομικά προϊόντα', 'κιλό',
    jsonb_build_object(
      'blossom_source', jsonb_build_object('type', 'text',   'label', 'Ανθοφορία'),
      'harvest_year',   jsonb_build_object('type', 'number', 'label', 'Έτος συγκομιδής')
    ), 'active'),
  ('honey_orange', 'Πορτοκαλανθόμελο', 'Μελισσοκομικά προϊόντα', 'κιλό',
    jsonb_build_object(
      'region',       jsonb_build_object('type', 'text',   'label', 'Περιοχή'),
      'harvest_year', jsonb_build_object('type', 'number', 'label', 'Έτος συγκομιδής')
    ), 'active'),
  ('honey_heather', 'Ρεικίσιο μέλι', 'Μελισσοκομικά προϊόντα', 'κιλό',
    jsonb_build_object(
      'region',       jsonb_build_object('type', 'text',   'label', 'Περιοχή'),
      'harvest_year', jsonb_build_object('type', 'number', 'label', 'Έτος συγκομιδής')
    ), 'active'),
  ('royal_jelly', 'Βασιλικός πολτός', 'Μελισσοκομικά προϊόντα', 'γραμμάριο',
    jsonb_build_object(
      'freshness', jsonb_build_object('type', 'text', 'label', 'Νωπός / συντηρημένος'),
      'batch',     jsonb_build_object('type', 'text', 'label', 'Παρτίδα')
    ), 'active'),
  ('propolis', 'Πρόπολη', 'Μελισσοκομικά προϊόντα', 'γραμμάριο',
    jsonb_build_object(
      'form',       jsonb_build_object('type', 'text', 'label', 'Μορφή (κομμάτια / εκχύλισμα)'),
      'purity_pct', jsonb_build_object('type', 'number', 'label', 'Καθαρότητα %')
    ), 'active'),
  ('bee_pollen', 'Γύρη', 'Μελισσοκομικά προϊόντα', 'κιλό',
    jsonb_build_object(
      'drying', jsonb_build_object('type', 'text', 'label', 'Ξήρανση')
    ), 'active'),
  ('beeswax', 'Κερί μελισσών', 'Μελισσοκομικά προϊόντα', 'κιλό',
    jsonb_build_object(
      'color', jsonb_build_object('type', 'text', 'label', 'Χρώμα')
    ), 'active'),
  ('bee_venom', 'Δηλητήριο μέλισσας', 'Μελισσοκομικά προϊόντα', 'γραμμάριο',
    jsonb_build_object(
      'purity_pct', jsonb_build_object('type', 'number', 'label', 'Καθαρότητα %')
    ), 'active'),
  ('bee_colony', 'Μελίσσι / παραφυάδα', 'Μελισσοκομικά προϊόντα', 'τεμάχιο',
    jsonb_build_object(
      'breed',        jsonb_build_object('type', 'text',   'label', 'Φυλή (Μακεδονική / Ιταλική / Καρνιόλα)'),
      'frames_count', jsonb_build_object('type', 'number', 'label', 'Αριθμός πλαισίων'),
      'queen_year',   jsonb_build_object('type', 'number', 'label', 'Έτος βασίλισσας')
    ), 'active'),
  ('bee_queen', 'Βασίλισσα', 'Μελισσοκομικά προϊόντα', 'τεμάχιο',
    jsonb_build_object(
      'breed',      jsonb_build_object('type', 'text',   'label', 'Φυλή'),
      'queen_year', jsonb_build_object('type', 'number', 'label', 'Έτος')
    ), 'active')
on conflict (slug) do nothing;

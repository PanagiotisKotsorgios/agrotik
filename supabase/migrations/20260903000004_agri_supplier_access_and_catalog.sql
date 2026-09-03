-- Grant agri_supplier read/write on the same tables merchants and
-- factories use (price_listings), and seed the "Αγροεφόδια &
-- υπηρεσίες" product catalog. Additive only, all existing rows
-- untouched, all policies drop-then-recreate.

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
      'merchant', 'factory', 'agri_supplier'
    )
  );

-- Suppliers use price_listings to publish their catalogue. The
-- existing price_listings policies key off "authenticated" plus
-- ownership and do not enumerate role explicitly for INSERT/UPDATE,
-- so no policy body needs a role list added. If a future migration
-- restricts price_listings by role, agri_supplier must be added to
-- that list next to merchant/factory.

-- =====================================================================
-- Αγροεφόδια & υπηρεσίες (agri-input products + agronomy services)
-- =====================================================================
insert into public.products (slug, name_el, category, unit, attributes_schema, status)
values
  -- Fertilisers
  ('fertilizer_granular', 'Κοκκώδες λίπασμα', 'Αγροεφόδια & υπηρεσίες', 'κιλό',
    jsonb_build_object(
      'npk',        jsonb_build_object('type', 'text',   'label', 'Ανάλυση NPK'),
      'brand',      jsonb_build_object('type', 'text',   'label', 'Μάρκα / εμπορικό όνομα'),
      'pack_size',  jsonb_build_object('type', 'number', 'label', 'Μέγεθος συσκευασίας (κιλά)')
    ), 'active'),
  ('fertilizer_liquid', 'Υγρό λίπασμα', 'Αγροεφόδια & υπηρεσίες', 'λίτρο',
    jsonb_build_object(
      'npk',        jsonb_build_object('type', 'text',   'label', 'Ανάλυση NPK'),
      'brand',      jsonb_build_object('type', 'text',   'label', 'Μάρκα'),
      'application',jsonb_build_object('type', 'text',   'label', 'Εφαρμογή (φύλλου / ρίζας)')
    ), 'active'),
  ('fertilizer_organic', 'Βιολογικό λίπασμα', 'Αγροεφόδια & υπηρεσίες', 'κιλό',
    jsonb_build_object(
      'source',    jsonb_build_object('type', 'text', 'label', 'Πηγή (κοπριά / φυτική / χούμος)'),
      'certified', jsonb_build_object('type', 'text', 'label', 'Πιστοποιημένο')
    ), 'active'),
  ('substrate_soil', 'Χώμα / υπόστρωμα', 'Αγροεφόδια & υπηρεσίες', 'λίτρο',
    jsonb_build_object(
      'kind',    jsonb_build_object('type', 'text',   'label', 'Τύπος (γενικής χρήσης / κάκτων / λαχανικών / ...)'),
      'ph',      jsonb_build_object('type', 'number', 'label', 'pH')
    ), 'active'),

  -- Plant protection
  ('pesticide_fungicide', 'Μυκητοκτόνο', 'Αγροεφόδια & υπηρεσίες', 'λίτρο',
    jsonb_build_object(
      'active_ingredient', jsonb_build_object('type', 'text', 'label', 'Δραστική ουσία'),
      'target',            jsonb_build_object('type', 'text', 'label', 'Στόχος / ασθένεια'),
      'reg_number',        jsonb_build_object('type', 'text', 'label', 'Αρ. έγκρισης κυκλοφορίας')
    ), 'active'),
  ('pesticide_insecticide', 'Εντομοκτόνο', 'Αγροεφόδια & υπηρεσίες', 'λίτρο',
    jsonb_build_object(
      'active_ingredient', jsonb_build_object('type', 'text', 'label', 'Δραστική ουσία'),
      'target',            jsonb_build_object('type', 'text', 'label', 'Έντομο-στόχος'),
      'reg_number',        jsonb_build_object('type', 'text', 'label', 'Αρ. έγκρισης')
    ), 'active'),
  ('pesticide_herbicide', 'Ζιζανιοκτόνο', 'Αγροεφόδια & υπηρεσίες', 'λίτρο',
    jsonb_build_object(
      'active_ingredient', jsonb_build_object('type', 'text', 'label', 'Δραστική ουσία'),
      'target',            jsonb_build_object('type', 'text', 'label', 'Ζιζάνια-στόχος')
    ), 'active'),
  ('bio_control', 'Βιολογικός έλεγχος', 'Αγροεφόδια & υπηρεσίες', 'τεμάχιο',
    jsonb_build_object(
      'organism', jsonb_build_object('type', 'text', 'label', 'Οργανισμός'),
      'target',   jsonb_build_object('type', 'text', 'label', 'Στόχος')
    ), 'active'),

  -- Seeds & propagation material
  ('seeds', 'Σπόροι', 'Αγροεφόδια & υπηρεσίες', 'κιλό',
    jsonb_build_object(
      'crop',     jsonb_build_object('type', 'text', 'label', 'Καλλιέργεια'),
      'variety',  jsonb_build_object('type', 'text', 'label', 'Ποικιλία'),
      'organic',  jsonb_build_object('type', 'text', 'label', 'Βιολογικοί')
    ), 'active'),
  ('seedlings', 'Φύτρα / φυτάρια', 'Αγροεφόδια & υπηρεσίες', 'τεμάχιο',
    jsonb_build_object(
      'crop',    jsonb_build_object('type', 'text', 'label', 'Καλλιέργεια'),
      'variety', jsonb_build_object('type', 'text', 'label', 'Ποικιλία'),
      'age',     jsonb_build_object('type', 'text', 'label', 'Ηλικία')
    ), 'active'),
  ('rootstock', 'Υποκείμενα / εμβόλια', 'Αγροεφόδια & υπηρεσίες', 'τεμάχιο',
    jsonb_build_object(
      'crop',    jsonb_build_object('type', 'text', 'label', 'Καλλιέργεια'),
      'variety', jsonb_build_object('type', 'text', 'label', 'Ποικιλία')
    ), 'active'),

  -- Tools & equipment
  ('tools_small', 'Χειροκίνητα εργαλεία', 'Αγροεφόδια & υπηρεσίες', 'τεμάχιο',
    jsonb_build_object(
      'kind',  jsonb_build_object('type', 'text', 'label', 'Είδος (κλαδευτήρι / τσάπα / ...)'),
      'brand', jsonb_build_object('type', 'text', 'label', 'Μάρκα')
    ), 'active'),
  ('irrigation_supplies', 'Είδη άρδευσης', 'Αγροεφόδια & υπηρεσίες', 'τεμάχιο',
    jsonb_build_object(
      'kind', jsonb_build_object('type', 'text', 'label', 'Είδος (σταλάκτης / σωλήνας / ...)'),
      'flow', jsonb_build_object('type', 'text', 'label', 'Παροχή / διάμετρος')
    ), 'active'),
  ('machinery', 'Γεωργικά μηχανήματα', 'Αγροεφόδια & υπηρεσίες', 'τεμάχιο',
    jsonb_build_object(
      'kind',      jsonb_build_object('type', 'text',   'label', 'Είδος'),
      'condition', jsonb_build_object('type', 'text',   'label', 'Κατάσταση (καινούριο / μεταχειρισμένο)'),
      'power_hp',  jsonb_build_object('type', 'number', 'label', 'Ιπποδύναμη (HP)')
    ), 'active'),
  ('packaging_supplies', 'Υλικά συσκευασίας', 'Αγροεφόδια & υπηρεσίες', 'τεμάχιο',
    jsonb_build_object(
      'kind', jsonb_build_object('type', 'text', 'label', 'Είδος (κιβώτια / σακούλες / ...)')
    ), 'active'),

  -- Services
  ('agronomy_consulting', 'Γεωπονική συμβουλευτική', 'Αγροεφόδια & υπηρεσίες', 'επίσκεψη',
    jsonb_build_object(
      'scope',  jsonb_build_object('type', 'text', 'label', 'Αντικείμενο (κλάδεμα / λίπανση / φυτοπροστασία / ...)'),
      'travel', jsonb_build_object('type', 'text', 'label', 'Ακτίνα επίσκεψης (χλμ)')
    ), 'active'),
  ('soil_analysis', 'Εδαφολογική ανάλυση', 'Αγροεφόδια & υπηρεσίες', 'δείγμα',
    jsonb_build_object(
      'includes', jsonb_build_object('type', 'text', 'label', 'Περιλαμβάνει (pH, μακροστοιχεία, ιχνοστοιχεία, ...)')
    ), 'active'),
  ('spray_service', 'Υπηρεσία ψεκασμού', 'Αγροεφόδια & υπηρεσίες', 'στρέμμα',
    jsonb_build_object(
      'equipment', jsonb_build_object('type', 'text', 'label', 'Εξοπλισμός (drone / τρακτέρ / ...)')
    ), 'active'),
  ('subsidies_help', 'Βοήθεια επιδοτήσεων / ΟΣΔΕ', 'Αγροεφόδια & υπηρεσίες', 'δήλωση',
    jsonb_build_object(
      'scope', jsonb_build_object('type', 'text', 'label', 'Αντικείμενο')
    ), 'active')
on conflict (slug) do nothing;

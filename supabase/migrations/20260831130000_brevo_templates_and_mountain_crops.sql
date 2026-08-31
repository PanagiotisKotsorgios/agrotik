-- Complete Brevo template flags and extend the built-in product catalog.

insert into public.app_settings (key, value)
values (
  'brevo',
  jsonb_build_object(
    'enabled', false,
    'api_key', '',
    'sender_email', 'info@agrotik.gr',
    'sender_name', 'AGROTIK',
    'templates', jsonb_build_object(
      'price_changed', true,
      'new_better_price', true,
      'new_message', true,
      'welcome', true,
      'password_reset', true,
      'contact', true,
      'admin_notice', true
    )
  )
)
on conflict (key) do update
set
  value = jsonb_set(
    app_settings.value,
    '{templates}',
    coalesce(app_settings.value -> 'templates', '{}'::jsonb) || jsonb_build_object(
      'price_changed', true,
      'new_better_price', true,
      'new_message', true,
      'welcome', true,
      'password_reset', true,
      'contact', true,
      'admin_notice', true
    ),
    true
  ),
  updated_at = now();

insert into public.products (slug, name_el, category, unit, attributes_schema, status)
values
  (
    'cherries',
    'Κεράσια',
    'Πυρηνόκαρπα',
    'κιλό',
    '{
      "variety": {
        "type": "enum",
        "label": "Ποικιλία",
        "values": ["Τραγανά Εδέσσης", "Ferrovia", "Μπακιρτζέικα", "Lapins", "Άλλη"]
      },
      "size": { "type": "text", "label": "Μέγεθος / διαλογή" }
    }'::jsonb,
    'active'
  ),
  (
    'mountain-chestnuts',
    'Κάστανα',
    'Ορεινές καλλιέργειες',
    'κιλό',
    '{ "variety": { "type": "text", "label": "Ποικιλία" } }'::jsonb,
    'active'
  ),
  (
    'mountain-walnuts',
    'Καρύδια',
    'Ορεινές καλλιέργειες',
    'κιλό',
    '{ "condition": { "type": "enum", "label": "Μορφή", "values": ["Με κέλυφος", "Ψίχα"] } }'::jsonb,
    'active'
  ),
  (
    'mountain-apples',
    'Μήλα ορεινής καλλιέργειας',
    'Ορεινές καλλιέργειες',
    'κιλό',
    '{ "variety": { "type": "text", "label": "Ποικιλία" } }'::jsonb,
    'active'
  ),
  (
    'mountain-potatoes',
    'Πατάτες ορεινής καλλιέργειας',
    'Ορεινές καλλιέργειες',
    'κιλό',
    '{ "variety": { "type": "text", "label": "Ποικιλία" } }'::jsonb,
    'active'
  ),
  (
    'mountain-dry-beans',
    'Φασόλια ορεινών περιοχών',
    'Ορεινές καλλιέργειες',
    'κιλό',
    '{ "variety": { "type": "text", "label": "Ποικιλία / τύπος" } }'::jsonb,
    'active'
  ),
  (
    'other-mountain-crop',
    'Άλλη ορεινή καλλιέργεια',
    'Ορεινές καλλιέργειες',
    'κιλό',
    '{ "crop": { "type": "text", "label": "Καλλιέργεια / ποικιλία" } }'::jsonb,
    'active'
  )
on conflict (slug) do update
set
  name_el = excluded.name_el,
  category = excluded.category,
  unit = excluded.unit,
  attributes_schema = excluded.attributes_schema,
  status = 'active';

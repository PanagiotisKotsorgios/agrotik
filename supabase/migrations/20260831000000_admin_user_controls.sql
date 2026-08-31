-- Administrative user controls.
-- Permanent account deletion must be able to remove every row owned by or
-- linked to the deleted profile without leaving generic report targets behind.

alter type public.notification_kind add value if not exists 'admin_notice';

alter table public.purchases
  drop constraint if exists purchases_farmer_id_fkey;

alter table public.purchases
  add constraint purchases_farmer_id_fkey
  foreign key (farmer_id) references public.profiles(id) on delete cascade;

create or replace function public.cleanup_reports_for_deleted_target()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  report_type public.report_target_type;
begin
  report_type := case tg_table_name
    when 'profiles' then 'profile'::public.report_target_type
    when 'price_listings' then 'price_listing'::public.report_target_type
    when 'production_listings' then 'production_listing'::public.report_target_type
    when 'messages' then 'message'::public.report_target_type
  end;

  if report_type is not null then
    delete from public.reports
    where target_type = report_type and target_id = old.id;
  end if;

  return old;
end;
$$;

drop trigger if exists profiles_cleanup_reports on public.profiles;
create trigger profiles_cleanup_reports
  before delete on public.profiles
  for each row execute function public.cleanup_reports_for_deleted_target();

drop trigger if exists price_listings_cleanup_reports on public.price_listings;
create trigger price_listings_cleanup_reports
  before delete on public.price_listings
  for each row execute function public.cleanup_reports_for_deleted_target();

drop trigger if exists production_listings_cleanup_reports on public.production_listings;
create trigger production_listings_cleanup_reports
  before delete on public.production_listings
  for each row execute function public.cleanup_reports_for_deleted_target();

drop trigger if exists messages_cleanup_reports on public.messages;
create trigger messages_cleanup_reports
  before delete on public.messages
  for each row execute function public.cleanup_reports_for_deleted_target();

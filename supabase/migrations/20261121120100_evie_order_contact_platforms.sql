-- Allow OnlyFans and Stripchat as checkout contact platforms.
-- Do not apply to live until Evie reviews: the live check is still
-- ('snapchat','telegram','x') and would reject the new chips until this ships.

alter table public.evie_order_requests
  drop constraint if exists evie_order_requests_contact_platform_check;

alter table public.evie_order_requests
  add constraint evie_order_requests_contact_platform_check
  check (contact_platform in ('snapchat','telegram','x','onlyfans','stripchat'));

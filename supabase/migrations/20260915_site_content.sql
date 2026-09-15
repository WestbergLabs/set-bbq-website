-- SET BBQ: database-backed content for frequently changing Home and Contact copy.
create table if not exists public.site_home_content (
  id integer primary key default 1 check (id = 1),
  hero_eyebrow text not null default 'South East Texas BBQ & Catering',
  hero_heading text not null default 'BBQ for your next gathering.',
  hero_lead text not null default 'Smoked meats, family-style sides, desserts, and delivery for your event.',
  hero_menu_button text not null default 'View Menu',
  hero_order_button text not null default 'Request Catering',
  eyebrow text not null default 'Catering & Delivery',
  heading text not null default 'Catering made simple.',
  intro text not null default 'Choose your meats, sides, and desserts. Tell us about your event and we''ll get back to you.',
  delivery_text text not null default 'Delivery is available for a simple additional fee. There is no storefront or dine-in service.',
  serve_eyebrow text not null default 'What We Serve',
  serve_heading text not null default 'Something for the whole table.',
  serve_categories text not null default 'Meats • Sides • Desserts by Irene',
  serve_description text not null default 'Brisket, ribs, chicken, pulled pork, sausage, turkey, family-style sides, and homemade desserts.',
  serve_link_text text not null default 'View full menu →',
  cta_eyebrow text not null default 'Planning an Event?',
  cta_heading text not null default 'Let''s talk BBQ.',
  cta_text text not null default 'Tell us what you''re planning, how many people you''re serving, and what you''d like.',
  cta_button_text text not null default 'Request Catering',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table if not exists public.site_contact_content (
  id integer primary key default 1 check (id = 1),
  page_eyebrow text not null default 'Contact',
  page_heading text not null default 'Let’s plan your next BBQ event.',
  page_intro text not null default 'Reach out for catering, delivery, or custom order questions. We’d be happy to talk through your event.',
  intro_eyebrow text not null default 'Get in touch',
  intro_heading text not null default 'South East Texas BBQ & Catering',
  intro_text text not null default 'For event availability, menu planning, delivery, or custom order questions, contact Erric directly or start a catering request.',
  business_name text not null default 'South East Texas BBQ & Catering',
  contact_person text not null default 'Erric Chaney',
  phone text not null default '(214) 995-9377',
  email text not null default 'northquarterscook@yahoo.com',
  address_line1 text not null default '2337 Wilmer Dr.',
  address_line2 text not null default 'Grand Prairie, TX 75052',
  cta_eyebrow text not null default 'Catering & Delivery',
  cta_heading text not null default 'Planning an event?',
  cta_text_1 text not null default 'Tell us your date, guest count, location, menu selections, and any special requests.',
  cta_text_2 text not null default 'We’ll review your request and follow up to confirm the details.',
  cta_button_text text not null default 'Request Catering',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

insert into public.site_home_content (id) values (1) on conflict (id) do nothing;
insert into public.site_contact_content (id) values (1) on conflict (id) do nothing;

alter table public.site_home_content enable row level security;
alter table public.site_contact_content enable row level security;

drop policy if exists "Public can read home content" on public.site_home_content;
create policy "Public can read home content" on public.site_home_content for select using (true);
drop policy if exists "Admins can update home content" on public.site_home_content;
create policy "Admins can update home content" on public.site_home_content for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public can read contact content" on public.site_contact_content;
create policy "Public can read contact content" on public.site_contact_content for select using (true);
drop policy if exists "Admins can update contact content" on public.site_contact_content;
create policy "Admins can update contact content" on public.site_contact_content for update using (public.is_admin()) with check (public.is_admin());

grant select on public.site_home_content to anon, authenticated;
grant update on public.site_home_content to authenticated;
grant select on public.site_contact_content to anon, authenticated;
grant update on public.site_contact_content to authenticated;
-- =====================================================================
-- Outil Visas (ab-ing/visas) — base Supabase « ab-ing-outils »
-- Toutes les tables de l'outil commencent par visas_. Le projet Supabase
-- est partagé avec les autres outils du bureau.
--
-- Accès : les inscriptions libres sont fermées (Authentication > Sign In /
-- Providers > « Allow new users to sign up » désactivé). Un compte n'existe
-- donc que si un administrateur l'a créé : tout utilisateur connecté a accès.
-- Le script se rejoue sans risque (if not exists / drop policy if exists).
-- =====================================================================

-- Projets suivis (un chantier = un projet ; « fgh » = Fairmont Grand Hôtel)
create table if not exists public.visas_projets (
  id      text primary key check (id ~ '^[a-z0-9-]{2,30}$'),
  nom     text not null check (char_length(nom) between 1 and 200),
  cree_le timestamptz not null default now()
);

-- Relevés : chaque import d'une version « Recap visas » d'Hubert (données
-- tirées des exports Kairnial et des PDF de réponse). Le plus récent fait foi ;
-- les anciens restent pour l'historique.
create table if not exists public.visas_releves (
  id          uuid primary key default gen_random_uuid(),
  projet      text not null references public.visas_projets(id) on delete cascade,
  importe_le  timestamptz not null default now(),
  importe_par text not null default coalesce(auth.jwt() ->> 'email', ''),
  source      text not null default '' check (char_length(source) <= 300),
  meta        jsonb not null default '{}'::jsonb,
  donnees     jsonb not null,
  nb_docs     integer not null default 0
);
create index if not exists visas_releves_projet on public.visas_releves (projet, importe_le desc);

-- Suivi partagé : une ligne par plan et indice (clé « CODE-INDICE »), même
-- contenu que l'entrée du suivi de la page d'Hubert :
-- m main · x non traité · p en cours · w responsable · n commentaire AB ·
-- r commentaire après reprise · t heure de saisie · v version.
create table if not exists public.visas_suivi (
  projet  text not null references public.visas_projets(id) on delete cascade,
  cle     text not null check (char_length(cle) between 3 and 120),
  etat    jsonb not null check (pg_column_size(etat) < 16000),
  maj_le  timestamptz not null default now(),
  maj_par text not null default '',
  primary key (projet, cle)
);

-- Journal : chaque modification du suivi, qui et quand (lecture seule)
create table if not exists public.visas_suivi_journal (
  id      bigint generated always as identity primary key,
  projet  text not null,
  cle     text not null,
  etat    jsonb,
  maj_le  timestamptz not null default now(),
  maj_par text not null default ''
);
create index if not exists visas_suivi_journal_cle on public.visas_suivi_journal (projet, cle, maj_le desc);

create or replace function public.visas_suivi_signe()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.maj_le  := now();
  new.maj_par := coalesce(auth.jwt() ->> 'email', '');
  return new;
end $$;
create or replace function public.visas_suivi_trace()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.visas_suivi_journal (projet, cle, etat, maj_le, maj_par)
  values (new.projet, new.cle, new.etat, new.maj_le, new.maj_par);
  return null;
end $$;
revoke all on function public.visas_suivi_signe(), public.visas_suivi_trace() from public, anon, authenticated;
drop trigger if exists visas_suivi_signe on public.visas_suivi;
create trigger visas_suivi_signe before insert or update on public.visas_suivi
  for each row execute function public.visas_suivi_signe();
drop trigger if exists visas_suivi_trace on public.visas_suivi;
create trigger visas_suivi_trace after insert or update on public.visas_suivi
  for each row execute function public.visas_suivi_trace();

-- Liens vers les PDF de réponse chez Kairnial (même logique que la table
-- visas_pj de l'outil /fgh/vis/ de str-bim-tools) : une ligne par pièce jointe
-- de visa, posée depuis la page Kairnial (message « visas-pj »).
create table if not exists public.visas_pdf_liens (
  projet    text not null references public.visas_projets(id) on delete cascade,
  code      text not null check (char_length(code) between 1 and 200),
  url       text not null check (char_length(url) between 20 and 500 and url like 'https://ws-eu-1.kairnial.com/%'),
  indice    integer check (indice between 0 and 999),
  visa      text not null default '' check (char_length(visa) <= 100),
  date_visa timestamptz,
  nom       text not null default '' check (char_length(nom) <= 300),
  ajoute_le timestamptz not null default now(),
  primary key (projet, code, url)   -- une même pièce jointe peut servir à deux plans
);
create index if not exists visas_pdf_liens_code on public.visas_pdf_liens (projet, code);

-- Droits : tout compte connecté (créé par un administrateur) lit et écrit ;
-- le journal ne se lit que ; un relevé ne se modifie pas.
alter table public.visas_projets       enable row level security;
alter table public.visas_releves       enable row level security;
alter table public.visas_suivi         enable row level security;
alter table public.visas_suivi_journal enable row level security;
alter table public.visas_pdf_liens     enable row level security;
revoke all on public.visas_projets, public.visas_releves, public.visas_suivi,
              public.visas_suivi_journal, public.visas_pdf_liens from anon, authenticated;
grant select                         on public.visas_projets, public.visas_suivi_journal to authenticated;
grant select, insert, delete         on public.visas_releves   to authenticated;
grant select, insert, update         on public.visas_suivi     to authenticated;
grant select, insert, update, delete on public.visas_pdf_liens to authenticated;

drop policy if exists "visas : lecture" on public.visas_projets;
create policy "visas : lecture" on public.visas_projets for select to authenticated using (true);

drop policy if exists "visas : lecture" on public.visas_releves;
drop policy if exists "visas : import"  on public.visas_releves;
drop policy if exists "visas : retrait" on public.visas_releves;
create policy "visas : lecture" on public.visas_releves for select to authenticated using (true);
create policy "visas : import"  on public.visas_releves for insert to authenticated
  with check (importe_par = coalesce(auth.jwt() ->> 'email', '') and importe_le between now() - interval '5 minutes' and now() + interval '5 minutes');
create policy "visas : retrait" on public.visas_releves for delete to authenticated
  using (importe_par = coalesce(auth.jwt() ->> 'email', ''));

drop policy if exists "visas : lecture"      on public.visas_suivi;
drop policy if exists "visas : saisie"       on public.visas_suivi;
drop policy if exists "visas : modification" on public.visas_suivi;
create policy "visas : lecture"      on public.visas_suivi for select to authenticated using (true);
create policy "visas : saisie"       on public.visas_suivi for insert to authenticated with check (true);
create policy "visas : modification" on public.visas_suivi for update to authenticated using (true) with check (true);

drop policy if exists "visas : lecture" on public.visas_suivi_journal;
create policy "visas : lecture" on public.visas_suivi_journal for select to authenticated using (true);

drop policy if exists "visas : lecture"      on public.visas_pdf_liens;
drop policy if exists "visas : écriture"     on public.visas_pdf_liens;
drop policy if exists "visas : modification" on public.visas_pdf_liens;
drop policy if exists "visas : retrait"      on public.visas_pdf_liens;
create policy "visas : lecture"      on public.visas_pdf_liens for select to authenticated using (true);
create policy "visas : écriture"     on public.visas_pdf_liens for insert to authenticated with check (true);
create policy "visas : modification" on public.visas_pdf_liens for update to authenticated using (true) with check (true);
create policy "visas : retrait"      on public.visas_pdf_liens for delete to authenticated using (true);

-- Temps réel : une coche posée par l'un apparaît chez les autres
do $$ begin
  alter publication supabase_realtime add table public.visas_suivi;
exception when duplicate_object then null; end $$;

-- PDF de réponse déposés dans la base (seau privé, 25 Mo par fichier),
-- rangés sous <projet>/<nom du fichier>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('visas-pdf', 'visas-pdf', false, 26214400, array['application/pdf'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "visas-pdf : lecture" on storage.objects;
drop policy if exists "visas-pdf : dépôt"   on storage.objects;
drop policy if exists "visas-pdf : remplacement" on storage.objects;
create policy "visas-pdf : lecture" on storage.objects for select to authenticated using (bucket_id = 'visas-pdf');
create policy "visas-pdf : dépôt"   on storage.objects for insert to authenticated with check (bucket_id = 'visas-pdf');
create policy "visas-pdf : remplacement" on storage.objects for update to authenticated using (bucket_id = 'visas-pdf') with check (bucket_id = 'visas-pdf');

insert into public.visas_projets (id, nom) values ('fgh', 'Fairmont Grand Hôtel Genève')
on conflict (id) do nothing;

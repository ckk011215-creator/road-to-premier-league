-- 英超之路：雲端存檔（同步碼）
-- 存檔以「同步碼」的 SHA-256 雜湊作為鑰匙；資料表本身不開放給公開 key 直接讀寫，
-- 只能透過下面兩個函數，並且必須提供正確的同步碼。
create table if not exists public.cloud_saves (
  key_hash text primary key,
  data text not null check (char_length(data) < 3000000),
  updated_at timestamptz not null default now()
);
alter table public.cloud_saves enable row level security;
revoke all on public.cloud_saves from anon, authenticated;

create or replace function public.cloud_put(p_key text, p_data text)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare t timestamptz := now();
begin
  if p_key is null or char_length(p_key) < 24 then raise exception 'invalid key'; end if;
  insert into public.cloud_saves(key_hash, data, updated_at)
  values (encode(sha256(convert_to(p_key, 'UTF8')), 'hex'), p_data, t)
  on conflict (key_hash) do update set data = excluded.data, updated_at = t;
  return t;
end $$;

create or replace function public.cloud_get(p_key text)
returns table(data text, updated_at timestamptz) language sql security definer set search_path = public as $$
  select c.data, c.updated_at from public.cloud_saves c
  where c.key_hash = encode(sha256(convert_to(p_key, 'UTF8')), 'hex');
$$;

revoke all on function public.cloud_put(text, text) from public;
revoke all on function public.cloud_get(text) from public;
grant execute on function public.cloud_put(text, text) to anon, authenticated;
grant execute on function public.cloud_get(text) to anon, authenticated;

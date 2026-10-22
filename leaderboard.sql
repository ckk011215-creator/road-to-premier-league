-- 英超之路：全球排行榜（Supabase）
-- 在 Supabase 專案的 SQL Editor 貼上並執行一次。
create table if not exists public.scores (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 16),
  score int not null check (score between 0 and 10000),
  tier text not null check (char_length(tier) <= 12),
  pos text check (char_length(pos) <= 8),
  diff text not null default 'normal' check (diff in ('easy','normal','hard')),
  pl_apps int check (pl_apps between 0 and 1000),
  goals int check (goals between 0 and 2000),
  caps int check (caps between 0 and 300),
  honours text check (char_length(honours) <= 200),
  ver text check (char_length(ver) <= 12)
);
alter table public.scores enable row level security;
-- 任何人可讀取及新增；不設更新／刪除權限，玩家無法修改或刪除別人的紀錄
create policy "anyone can read" on public.scores for select using (true);
create policy "anyone can insert" on public.scores for insert with check (true);
create index if not exists scores_score_idx on public.scores (score desc);

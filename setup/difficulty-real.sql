-- 1.2.0：排行榜接受新增的「現實」難度（real）
-- 在 Supabase 的 SQL Editor 執行一次即可。
alter table public.scores drop constraint if exists scores_diff_check;
alter table public.scores add constraint scores_diff_check check (diff in ('easy','normal','hard','real'));

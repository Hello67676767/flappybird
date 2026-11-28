create table if not exists public.leaderboard_scores (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 20),
  best_score integer not null check (best_score > 0),
  updated_at timestamptz not null default now()
);

alter table public.leaderboard_scores enable row level security;

revoke all on public.leaderboard_scores from anon, authenticated;
grant select on public.leaderboard_scores to anon, authenticated;

drop policy if exists leaderboard_scores_public_read on public.leaderboard_scores;
create policy leaderboard_scores_public_read
  on public.leaderboard_scores
  for select
  to anon, authenticated
  using (true);

create or replace function public.submit_leaderboard_score(
  p_score integer,
  p_display_name text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  player_id uuid := auth.uid();
  nickname text := btrim(p_display_name);
begin
  if player_id is null then
    raise exception 'Sign in before submitting a score.';
  end if;

  if p_score is null or p_score <= 0 then
    raise exception 'Score must be a positive integer.';
  end if;

  if nickname is null or char_length(nickname) not between 2 and 20 then
    raise exception 'Nickname must be between 2 and 20 characters.';
  end if;

  insert into public.leaderboard_scores (user_id, display_name, best_score)
  values (player_id, nickname, p_score)
  on conflict (user_id) do update
  set display_name = excluded.display_name,
      best_score = greatest(public.leaderboard_scores.best_score, excluded.best_score),
      updated_at = case
        when excluded.best_score > public.leaderboard_scores.best_score then now()
        else public.leaderboard_scores.updated_at
      end;
end;
$$;

revoke all on function public.submit_leaderboard_score(integer, text) from public;
grant execute on function public.submit_leaderboard_score(integer, text) to authenticated;

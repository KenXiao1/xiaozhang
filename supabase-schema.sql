-- Session 表
create table sessions (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Session 1',
  creator text not null,
  created_at timestamptz default now()
);

-- 消息表
create table messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  sender text not null,
  content text not null,
  is_ai_generated boolean default false,
  thread_id uuid references messages(id),
  created_at timestamptz default now()
);

-- 注释表
create table annotations (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references messages(id) on delete cascade,
  annotator text not null,
  start_offset int not null,
  end_offset int not null,
  highlighted_text text,
  note text,
  created_at timestamptz default now()
);

-- RLS
alter table sessions enable row level security;
alter table messages enable row level security;
alter table annotations enable row level security;

-- 允许匿名读写（通过 anon key，实际由 JWT 控制访问）
create policy "allow all" on sessions for all using (true) with check (true);
create policy "allow all" on messages for all using (true) with check (true);
create policy "allow all" on annotations for all using (true) with check (true);

-- Realtime
alter publication supabase_realtime add table sessions;
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table annotations;

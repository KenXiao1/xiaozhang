# Session 功能数据库迁移

## 需要执行的 SQL

在 Supabase 控制台的 SQL Editor 中执行以下语句：

```sql
-- 1. 创建 sessions 表
create table sessions (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Session 1',
  creator text not null,
  created_at timestamptz default now()
);

-- 2. 为 messages 表添加 session_id 列
alter table messages add column session_id uuid references sessions(id) on delete cascade;

-- 3. 启用 RLS
alter table sessions enable row level security;

-- 4. 添加策略
create policy "allow all" on sessions for all using (true) with check (true);

-- 5. 添加到 Realtime
alter publication supabase_realtime add table sessions;
```

## 迁移现有数据（可选）

如果你已经有消息数据，需要为它们创建一个默认 session：

```sql
-- 创建默认 session
insert into sessions (name, creator) values ('历史消息', 'system');

-- 将所有现有消息关联到这个 session
update messages set session_id = (select id from sessions where name = '历史消息' limit 1);
```

## 验证

执行以下查询验证迁移成功：

```sql
-- 检查 sessions 表
select * from sessions;

-- 检查 messages 是否有 session_id
select id, sender, session_id from messages limit 5;
```

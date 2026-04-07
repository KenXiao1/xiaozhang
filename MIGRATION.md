# Session 功能和 @ 跨对话引用 - 数据库迁移

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

-- 3. 为 messages 表添加 cross_session_refs 列（支持 @ 跨对话引用）
alter table messages add column cross_session_refs jsonb;

-- 4. 启用 RLS
alter table sessions enable row level security;

-- 5. 添加策略
create policy "allow all" on sessions for all using (true) with check (true);

-- 6. 添加到 Realtime
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

-- 检查 messages 是否有 session_id 和 cross_session_refs
select id, sender, session_id, cross_session_refs from messages limit 5;
```

## @ 功能使用说明

1. 在输入框中输入 `@` 符号
2. 会弹出其他 session 的选择列表
3. 选择一个 session 后，显示该 session 的消息列表
4. 选择具体消息后，会在输入框插入引用标记，如 `[@历史消息:Cheny]`
5. 发送后，消息会显示跨 session 引用的预览卡片

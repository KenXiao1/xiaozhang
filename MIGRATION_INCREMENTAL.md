# 增量迁移 - 只添加 cross_session_refs 字段

由于 sessions 表已经存在，只需要执行以下 SQL：

```sql
-- 为 messages 表添加 cross_session_refs 列（支持 @ 跨对话引用）
alter table messages add column cross_session_refs jsonb;
```

## 验证

执行以下查询验证迁移成功：

```sql
-- 检查 messages 表结构
select column_name, data_type
from information_schema.columns
where table_name = 'messages';
```

应该能看到 `cross_session_refs` 字段，类型为 `jsonb`。

## 如果已经添加过该字段

如果执行时报错说字段已存在，说明迁移已完成，无需再执行。

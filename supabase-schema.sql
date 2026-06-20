-- ============================================
-- Exoo chat history schema
-- Run this in: Supabase dashboard → SQL Editor → New query → Run
-- ============================================

-- One row per conversation (shown in the sidebar)
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per message inside a conversation
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null default '',
  created_at timestamptz not null default now()
);

-- Helpful index for loading a conversation's messages in order
create index if not exists messages_conversation_id_idx on messages(conversation_id, created_at);
create index if not exists conversations_user_id_idx on conversations(user_id, updated_at desc);

-- ============================================
-- Row Level Security — each user can only see their own data
-- ============================================
alter table conversations enable row level security;
alter table messages enable row level security;

create policy "Users can view their own conversations"
  on conversations for select
  using (auth.uid() = user_id);

create policy "Users can create their own conversations"
  on conversations for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own conversations"
  on conversations for update
  using (auth.uid() = user_id);

create policy "Users can delete their own conversations"
  on conversations for delete
  using (auth.uid() = user_id);

create policy "Users can view messages in their own conversations"
  on messages for select
  using (
    exists (
      select 1 from conversations
      where conversations.id = messages.conversation_id
      and conversations.user_id = auth.uid()
    )
  );

create policy "Users can create messages in their own conversations"
  on messages for insert
  with check (
    exists (
      select 1 from conversations
      where conversations.id = messages.conversation_id
      and conversations.user_id = auth.uid()
    )
  );

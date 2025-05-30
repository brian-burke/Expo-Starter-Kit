-- Users are managed by Supabase Auth (auth.users)

-- Table: user_profiles
create table public.user_profiles (
  id uuid primary key references auth.users(id),
  full_name text,
  created_at timestamp with time zone default now()
);

-- Table: user_links (relationships between users)
create table public.user_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  linked_user_id uuid references auth.users(id),
  status text check (status in ('pending', 'accepted', 'rejected')) default 'pending',
  type text, -- e.g. "full", "folder-only"
  created_at timestamp with time zone default now(),
  unique (user_id, linked_user_id)
);

-- Table: folders
create table public.folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users(id),
  created_at timestamp with time zone default now()
);

-- Table: folder_users (permissions on folders)
create table public.folder_users (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid references folders(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  can_upload boolean default false,
  can_view boolean default true,
  can_comment boolean default false,
  created_at timestamp with time zone default now(),
  unique (folder_id, user_id)
);

-- Table: photos (metadata for Supabase Storage items)
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid references folders(id),
  uploaded_by uuid references auth.users(id),
  file_name text,
  storage_path text not null,
  visible_after timestamp with time zone,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Table: photo_links (link photos to specific users)
create table public.photo_links (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid references photos(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique (photo_id, user_id)
);

-- Table: reminders
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  photo_id uuid references photos(id),
  message text,
  remind_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Table: journals
create table public.journals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  content text,
  created_at timestamp with time zone default now()
);

-- Enable Row-Level Security
alter table user_profiles enable row level security;
alter table user_links enable row level security;
alter table folders enable row level security;
alter table folder_users enable row level security;
alter table photos enable row level security;
alter table photo_links enable row level security;
alter table reminders enable row level security;
alter table journals enable row level security; 
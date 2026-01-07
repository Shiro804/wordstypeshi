-- Create game_preferences table
create table "public"."game_preferences" (
    "user_id" uuid not null,
    "game_id" text not null,
    "preferences" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    
    constraint "game_preferences_pkey" primary key ("user_id", "game_id"),
    constraint "game_preferences_user_id_fkey" foreign key ("user_id") references "public"."profiles"("id") on delete cascade
);

-- Enable RLS
alter table "public"."game_preferences" enable row level security;

-- RLS Policies
create policy "Users can view their own preferences"
on "public"."game_preferences"
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert/update their own preferences"
on "public"."game_preferences"
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Trigger for updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger handle_game_preferences_updated_at
before update on public.game_preferences
for each row
execute procedure public.handle_updated_at();

-- Enum values must be committed before they can be used by the next migration.
alter type public.user_role add value if not exists 'teacher';

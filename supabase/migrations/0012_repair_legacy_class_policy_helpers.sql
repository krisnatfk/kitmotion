-- Repair helper functions left by the pre-classroom schema. Legacy profile
-- policies may still call these names, so keep the signatures while targeting
-- the current classrooms/class_memberships columns.

create or replace function public.owns_class(requested_class_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
    from public.classrooms classroom
    where classroom.id = requested_class_id
      and classroom.teacher_id = auth.uid()
  );
$$;

create or replace function public.is_class_member(requested_class_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
    from public.class_memberships membership
    where membership.classroom_id = requested_class_id
      and membership.student_id = auth.uid()
      and membership.status = 'active'
  );
$$;

create or replace function public.teacher_has_approved_student(requested_student_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
    from public.classrooms classroom
    join public.class_memberships membership
      on membership.classroom_id = classroom.id
    where classroom.teacher_id = auth.uid()
      and classroom.is_active
      and membership.student_id = requested_student_id
      and membership.status = 'active'
      and membership.consented_at is not null
  );
$$;

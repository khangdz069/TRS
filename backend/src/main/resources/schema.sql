create or replace function public.trs_json_to_text_array(value json)
returns varchar[]
language plpgsql
immutable
as $$
declare
    result varchar[];
begin
    if value is null then
        return array[]::varchar[];
    end if;

    if json_typeof(value) = 'array' then
        select coalesce(array_agg(coalesce(item->>'path', item->>'filename', item #>> '{}')), array[]::varchar[])
        into result
        from json_array_elements(value) as item;
        return result;
    end if;

    return array[]::varchar[];
end;
$$;
@@

create or replace function public.trs_json_to_int_array(value json)
returns integer[]
language plpgsql
immutable
as $$
declare
    result integer[];
begin
    if value is null then
        return array[]::integer[];
    end if;

    if json_typeof(value) = 'array' then
        select coalesce(array_agg(item::integer order by ord), array[]::integer[])
        into result
        from json_array_elements_text(value) with ordinality as items(item, ord)
        where item ~ '^-?[0-9]+$';
        return result;
    end if;

    if json_typeof(value) = 'object' then
        select coalesce(array_agg(item_value::integer order by
                case when item_key ~ '^[0-9]+$' then item_key::integer else 2147483647 end,
                item_key), array[]::integer[])
        into result
        from json_each_text(value) as items(item_key, item_value)
        where item_value ~ '^-?[0-9]+$';
        return result;
    end if;

    return array[]::integer[];
end;
$$;
@@

create or replace function public.trs_json_to_bool_array(value json)
returns boolean[]
language plpgsql
immutable
as $$
declare
    result boolean[];
begin
    if value is null then
        return array[]::boolean[];
    end if;

    if json_typeof(value) = 'array' then
        select coalesce(array_agg(item::boolean order by ord), array[]::boolean[])
        into result
        from json_array_elements_text(value) with ordinality as items(item, ord)
        where lower(item) in ('true', 'false');
        return result;
    end if;

    if json_typeof(value) = 'object' then
        select coalesce(array_agg(item_value::boolean order by
                case when item_key ~ '^[0-9]+$' then item_key::integer else 2147483647 end,
                item_key), array[]::boolean[])
        into result
        from json_each_text(value) as items(item_key, item_value)
        where lower(item_value) in ('true', 'false');
        return result;
    end if;

    return array[]::boolean[];
end;
$$;
@@

do $$
begin
    if to_regclass('public.forms') is null and to_regclass('public.feedback_forms') is not null then
        alter table public.feedback_forms rename to forms;
    end if;

    if to_regclass('public.matrixfactorizations') is null and to_regclass('public.matrix_factorizations') is not null then
        alter table public.matrix_factorizations rename to matrixfactorizations;
    end if;
end $$;
@@

do $$
declare
    tbl text;
begin
    foreach tbl in array array[
        'accounts',
        'teachers',
        'students',
        'assignments',
        'student_on_assignments',
        'teacher_on_assignments',
        'submissions',
        'matrixfactorizations',
        'forms',
        'recommendations'
    ]
    loop
        if to_regclass('public.' || tbl) is not null then
            execute format('alter table public.%I add column if not exists is_active boolean', tbl);
            execute format('update public.%I set is_active = true where is_active is null', tbl);
            execute format('alter table public.%I alter column is_active set default true', tbl);
            execute format('alter table public.%I alter column is_active set not null', tbl);
            execute format('alter table public.%I add column if not exists deleted_at timestamp with time zone', tbl);
        end if;
    end loop;
end $$;
@@

do $$
begin
    if to_regclass('public.accounts') is not null then
        if exists (
            select 1 from information_schema.columns
            where table_schema = 'public' and table_name = 'accounts' and column_name = 'role'
        ) and not exists (
            select 1 from information_schema.columns
            where table_schema = 'public' and table_name = 'accounts' and column_name = 'type'
        ) then
            alter table public.accounts rename column role to type;
        end if;

        alter table public.accounts add column if not exists type varchar(50);
        update public.accounts set type = 'STUDENT' where type is null;
        alter table public.accounts alter column type set not null;
    end if;
end $$;
@@

do $$
begin
    if to_regclass('public.submissions') is not null then
        if exists (
            select 1 from information_schema.columns
            where table_schema = 'public' and table_name = 'submissions' and column_name = 'files' and data_type <> 'ARRAY'
        ) then
            alter table public.submissions
                alter column files type varchar[]
                using public.trs_json_to_text_array(files);
        end if;

        if exists (
            select 1 from information_schema.columns
            where table_schema = 'public' and table_name = 'submissions' and column_name = 'scores' and data_type <> 'ARRAY'
        ) then
            alter table public.submissions
                alter column scores type boolean[]
                using public.trs_json_to_bool_array(scores);
        end if;

        alter table public.submissions alter column files set default array[]::varchar[];
        update public.submissions set files = array[]::varchar[] where files is null;
        alter table public.submissions alter column files set not null;
    end if;
end $$;
@@

do $$
begin
    if to_regclass('public.forms') is not null then
        if exists (
            select 1 from information_schema.columns
            where table_schema = 'public' and table_name = 'forms' and column_name = 'list_used_tcids' and data_type <> 'ARRAY'
        ) then
            alter table public.forms
                alter column list_used_tcids type integer[]
                using public.trs_json_to_int_array(list_used_tcids);
        end if;

        if exists (
            select 1 from information_schema.columns
            where table_schema = 'public' and table_name = 'forms' and column_name = 'time_ordered_tcids' and data_type <> 'ARRAY'
        ) then
            alter table public.forms
                alter column time_ordered_tcids type integer[]
                using public.trs_json_to_int_array(time_ordered_tcids);
        end if;
    end if;
end $$;
@@

do $$
begin
    if to_regclass('public.recommendations') is not null then
        alter table public.recommendations add column if not exists list_testcase_id integer[];
        alter table public.recommendations add column if not exists list_false_tcids integer[];

        if exists (
            select 1 from information_schema.columns
            where table_schema = 'public' and table_name = 'recommendations' and column_name = 'recommended_testcases'
        ) then
            update public.recommendations
            set list_testcase_id = public.trs_json_to_int_array(recommended_testcases)
            where list_testcase_id is null;
        end if;

        if exists (
            select 1 from information_schema.columns
            where table_schema = 'public' and table_name = 'recommendations' and column_name = 'failed_testcases'
        ) then
            update public.recommendations
            set list_false_tcids = public.trs_json_to_int_array(failed_testcases)
            where list_false_tcids is null;
        end if;

        update public.recommendations set list_testcase_id = array[]::integer[] where list_testcase_id is null;
        update public.recommendations set list_false_tcids = array[]::integer[] where list_false_tcids is null;
        alter table public.recommendations alter column list_testcase_id set default array[]::integer[];
        alter table public.recommendations alter column list_false_tcids set default array[]::integer[];
        alter table public.recommendations alter column list_testcase_id set not null;
        alter table public.recommendations alter column list_false_tcids set not null;

        if exists (
            select 1 from information_schema.columns
            where table_schema = 'public' and table_name = 'recommendations' and column_name = 'status' and data_type <> 'integer'
        ) then
            alter table public.recommendations
                alter column status type integer
                using case status
                    when 'READY' then 1
                    when 'NO_TESTCASE' then 2
                    when 'DAILY_LIMIT_REACHED' then 3
                    when 'PREVIOUS_TESTCASE_NOT_COMPLETED' then 4
                    when 'FAILED' then 5
                    else 0
                end;
        end if;
    end if;
end $$;
@@

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

do $$
begin
    if to_regclass('public.feedback_forms') is not null and to_regclass('public.forms') is not null then
        insert into public.forms (
            id,
            submission_id,
            list_used_tcids,
            time_ordered_tcids,
            scores,
            feedback,
            created_at,
            updated_at,
            is_active,
            deleted_at
        )
        select
            id,
            submission_id,
            public.trs_json_to_int_array(list_used_tcids),
            public.trs_json_to_int_array(time_ordered_tcids),
            scores,
            feedback,
            created_at,
            updated_at,
            true,
            null
        from public.feedback_forms
        on conflict (id) do nothing;

        drop table public.feedback_forms cascade;
    end if;

    if to_regclass('public.matrix_factorizations') is not null and to_regclass('public.matrixfactorizations') is not null then
        insert into public.matrixfactorizations (
            id,
            assignment_id,
            model_name,
            matrix_npz_path,
            list_student_ids,
            list_testcase_ids,
            created_at,
            updated_at,
            is_active,
            deleted_at
        )
        select
            id,
            assignment_id,
            model_name,
            matrix_npz_path,
            public.trs_json_to_text_array(list_student_ids),
            public.trs_json_to_int_array(list_testcase_ids),
            created_at,
            updated_at,
            true,
            null
        from public.matrix_factorizations
        on conflict (id) do nothing;

        drop table public.matrix_factorizations cascade;
    end if;
end $$;
@@

do $$
begin
    if to_regclass('public.assignments') is not null then
        alter table public.assignments add column if not exists assignment_type varchar(50);
        alter table public.assignments add column if not exists supported_languages text;
        alter table public.assignments add column if not exists testcase_samples text;
        alter table public.assignments add column if not exists testcase_generation_strategy varchar(50);
        alter table public.assignments add column if not exists testcase_seed_count integer;
        alter table public.assignments add column if not exists generated_testcase_count integer;
        alter table public.assignments add column if not exists duration_minutes integer;
        alter table public.assignments add column if not exists problem_statement text;
        alter table public.assignments add column if not exists starter_code text;
        alter table public.assignments add column if not exists reference_solution text;
        alter table public.assignments add column if not exists type_config text;

        update public.assignments set assignment_type = 'STANDARD' where assignment_type is null;
        update public.assignments set supported_languages = 'cpp' where supported_languages is null;
        update public.assignments set testcase_samples = '' where testcase_samples is null;
        update public.assignments set testcase_generation_strategy = 'MUTATION' where testcase_generation_strategy is null;
        update public.assignments set testcase_seed_count = 0 where testcase_seed_count is null;
        update public.assignments set generated_testcase_count = 0 where generated_testcase_count is null;
        update public.assignments set duration_minutes = 0 where duration_minutes is null;
        update public.assignments set problem_statement = '' where problem_statement is null;
        update public.assignments set starter_code = '' where starter_code is null;
        update public.assignments set reference_solution = '' where reference_solution is null;
        update public.assignments set type_config = '' where type_config is null;

        alter table public.assignments alter column assignment_type set default 'STANDARD';
        alter table public.assignments alter column supported_languages set default 'cpp';
        alter table public.assignments alter column testcase_samples set default '';
        alter table public.assignments alter column testcase_generation_strategy set default 'MUTATION';
        alter table public.assignments alter column testcase_seed_count set default 0;
        alter table public.assignments alter column generated_testcase_count set default 0;
        alter table public.assignments alter column duration_minutes set default 0;
        alter table public.assignments alter column problem_statement set default '';
        alter table public.assignments alter column starter_code set default '';
        alter table public.assignments alter column reference_solution set default '';
        alter table public.assignments alter column type_config set default '';

        alter table public.assignments alter column assignment_type set not null;
        alter table public.assignments alter column testcase_generation_strategy set not null;
        alter table public.assignments alter column testcase_seed_count set not null;
        alter table public.assignments alter column generated_testcase_count set not null;
        alter table public.assignments alter column duration_minutes set not null;
    end if;
end $$;
@@

do $$
begin
    if to_regclass('public.student_on_assignments') is not null then
        alter table public.student_on_assignments add column if not exists class_section varchar(120);
        update public.student_on_assignments set class_section = 'Default' where class_section is null or class_section = '';
        alter table public.student_on_assignments alter column class_section set default 'Default';
        alter table public.student_on_assignments alter column class_section set not null;
    end if;
end $$;
@@

do $$
begin
    if to_regclass('public.recommendations') is not null then
        alter table public.recommendations drop column if exists recommended_testcases;
        alter table public.recommendations drop column if exists failed_testcases;
        alter table public.recommendations drop column if exists model_used;
        alter table public.recommendations drop column if exists sampling_group;
        alter table public.recommendations drop column if exists is_fallback;
    end if;

    if to_regclass('public.submissions') is not null then
        alter table public.submissions drop column if exists compile_error;
        alter table public.submissions drop column if exists runtime_error;
        alter table public.submissions drop column if exists failed_outputs;
    end if;
end $$;
@@

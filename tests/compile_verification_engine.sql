-- Compilation test for wmg_verification_engine package
-- This script compiles the package and reports any compilation errors

set serveroutput on
set echo on

prompt Compiling wmg_verification_engine package specification...
@@../packages/wmg_verification_engine.pks

prompt Compiling wmg_verification_engine package body...
@@../packages/wmg_verification_engine.pkb

prompt Checking for compilation errors...
select object_name, object_type, status
from user_objects
where object_name = 'WMG_VERIFICATION_ENGINE'
order by object_type;

prompt Checking for detailed errors if any...
select line, position, text
from user_errors
where name = 'WMG_VERIFICATION_ENGINE'
order by sequence;

prompt Compilation test complete.
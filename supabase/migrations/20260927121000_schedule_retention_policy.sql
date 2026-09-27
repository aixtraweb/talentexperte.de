-- Löschkonzept: tägliche Ausführung der automatischen Fristen R1–R6 (docs/LOESCHKONZEPT.md).
select cron.unschedule(jobid) from cron.job where jobname = 'apply-retention-policy-daily';
select cron.schedule('apply-retention-policy-daily', '30 3 * * *', $$select public.apply_retention_policy();$$);

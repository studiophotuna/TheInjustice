-- Phone alerts: the database wakes the game server every 5 minutes to send alerts that are due.
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule(
  'conspira-push-tick',
  '*/5 * * * *',
  $$ select net.http_get(url := 'https://injustice-booking-cms.vercel.app/api/push/tick', timeout_milliseconds := 55000) $$
);

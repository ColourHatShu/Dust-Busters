-- Ensure exactly one settings row exists.
insert into settings (id, hourly_rate, deposit_percent, currency)
values (1, 20, 60, 'CAD')
on conflict (id) do nothing;

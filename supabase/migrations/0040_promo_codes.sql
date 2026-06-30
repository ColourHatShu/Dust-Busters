-- 0040_promo_codes.sql
-- Referral / first-clean discount — a growth lever for a tight local market.
-- Promo codes (percent or flat amount, optional expiry / max-uses / first-clean-
-- only) applied at booking. PLATFORM-ABSORBS model: the discount reduces what the
-- CUSTOMER pays, but the cleaner's payout is unchanged (computed on the full
-- pre-discount total) — a marketing promo never cuts a cleaner's pay (honest-money
-- aligned, 0015). The platform funds it (platform_fee = discounted_total − payout,
-- which can shrink/negative for a generous promo — that's the acquisition cost).
-- Test-mode safe: ordinary deposit/balance flow, no live keys.

CREATE TABLE IF NOT EXISTS promo_codes (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code             text        NOT NULL UNIQUE,
  kind             text        NOT NULL CHECK (kind IN ('percent', 'amount')),
  value            numeric     NOT NULL CHECK (value > 0),
  active           boolean     NOT NULL DEFAULT true,
  max_uses         int,
  used_count       int         NOT NULL DEFAULT 0,
  expires_at       timestamptz,
  first_clean_only boolean     NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS promo_code text;

ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
-- Admins manage codes; customers never read the table directly (validation +
-- application go through the SECURITY DEFINER functions below).
DROP POLICY IF EXISTS promo_codes_admin_all ON promo_codes;
CREATE POLICY promo_codes_admin_all ON promo_codes
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Read-only validation for the booking form (preview "code applied / why not").
CREATE OR REPLACE FUNCTION validate_promo(p_code text)
RETURNS TABLE (valid boolean, kind text, value numeric, message text)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
declare
  v_customer uuid := auth.uid();
  p promo_codes%rowtype;
begin
  if p_code is null or btrim(p_code) = '' then
    return query select false, null::text, null::numeric, 'Enter a promo code.'; return;
  end if;
  select * into p from promo_codes where code = upper(btrim(p_code));
  if not found then
    return query select false, null::text, null::numeric, 'That promo code isn''t valid.'; return;
  end if;
  if not p.active then
    return query select false, null::text, null::numeric, 'That promo code is no longer active.'; return;
  end if;
  if p.expires_at is not null and p.expires_at < now() then
    return query select false, null::text, null::numeric, 'That promo code has expired.'; return;
  end if;
  if p.max_uses is not null and p.used_count >= p.max_uses then
    return query select false, null::text, null::numeric, 'That promo code has reached its limit.'; return;
  end if;
  if p.first_clean_only and exists (select 1 from bookings b where b.customer_id = v_customer) then
    return query select false, null::text, null::numeric, 'That code is for your first booking only.'; return;
  end if;
  return query select true, p.kind, p.value, 'Code applied.'::text;
end; $$;

GRANT EXECUTE ON FUNCTION validate_promo(text) TO authenticated;

-- Recreate request_booking (0037 body) with an 8th param p_promo_code and the
-- platform-absorbs discount math. Old 7-arg signature dropped; callers that pass
-- 7 args (create_recurring_series / generate_due_recurring) still resolve via the
-- DEFAULT.
DROP FUNCTION IF EXISTS request_booking(timestamptz, numeric, text, text, uuid, text, text[]);

CREATE OR REPLACE FUNCTION request_booking(
  p_scheduled_at timestamptz,
  p_hours numeric,
  p_area text,
  p_full_address text,
  p_preferred_cleaner uuid DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_checklist text[] DEFAULT NULL,
  p_promo_code text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
declare
  v_customer uuid := auth.uid();
  v_rate numeric;
  v_deposit_pct int;
  v_commission_pct numeric;
  v_total numeric;
  v_total_after numeric;
  v_discount numeric := 0;
  v_deposit numeric;
  v_platform_fee numeric;
  v_payout numeric;
  v_booking uuid;
  v_count int;
  v_promo promo_codes%rowtype;
  v_service_date date := (p_scheduled_at at time zone 'America/Vancouver')::date;
  v_dow int := extract(dow from (p_scheduled_at at time zone 'America/Vancouver'))::int;
begin
  if v_customer is null then
    raise exception 'Not authenticated';
  end if;

  select hourly_rate, deposit_percent, commission_percent
    into v_rate, v_deposit_pct, v_commission_pct
  from settings where id = 1;

  v_total := round(v_rate * p_hours, 2);
  -- Cleaner is paid for the full work regardless of any customer promo.
  v_payout := v_total - round(v_total * coalesce(v_commission_pct, 15) / 100.0, 2);

  -- Apply a valid promo (platform-absorbs). Lock the row so used_count is atomic.
  if p_promo_code is not null and btrim(p_promo_code) <> '' then
    select * into v_promo from promo_codes
      where code = upper(btrim(p_promo_code)) for update;
    if found and v_promo.active
       and (v_promo.expires_at is null or v_promo.expires_at >= now())
       and (v_promo.max_uses is null or v_promo.used_count < v_promo.max_uses)
       and (not v_promo.first_clean_only
            or not exists (select 1 from bookings b where b.customer_id = v_customer))
    then
      if v_promo.kind = 'percent' then
        v_discount := round(v_total * v_promo.value / 100.0, 2);
      else
        v_discount := v_promo.value;
      end if;
      v_discount := least(greatest(v_discount, 0), v_total);
      update promo_codes set used_count = used_count + 1 where id = v_promo.id;
    end if;
  end if;

  v_total_after := v_total - v_discount;
  v_deposit := round(v_total_after * v_deposit_pct / 100.0, 2);
  v_platform_fee := v_total_after - v_payout;  -- platform funds the discount

  insert into bookings (customer_id, scheduled_at, hours, area,
                        total_amount, deposit_amount, balance_amount,
                        platform_fee, cleaner_payout, discount_amount, promo_code,
                        notes, checklist, status)
  values (v_customer, p_scheduled_at, p_hours, p_area,
          v_total_after, v_deposit, v_total_after - v_deposit,
          v_platform_fee, v_payout, v_discount,
          case when v_discount > 0 then upper(btrim(p_promo_code)) else null end,
          nullif(btrim(coalesce(p_notes, '')), ''),
          case when coalesce(array_length(p_checklist, 1), 0) = 0
               then null else p_checklist end,
          'broadcasting')
  returning id into v_booking;

  insert into booking_addresses (booking_id, full_address)
  values (v_booking, p_full_address);

  if p_preferred_cleaner is not null and exists (
    select 1 from cleaner_details cd
    where cd.profile_id = p_preferred_cleaner
      and cd.active and cd.id_verified and cd.accepting_jobs
      and p_area = any (cd.areas_served)
      and not exists (
        select 1 from cleaner_time_off t
        where t.cleaner_id = cd.profile_id and t.off_date = v_service_date
      )
      and (coalesce(cardinality(cd.work_days), 0) = 0 or v_dow = any (cd.work_days))
  ) then
    insert into booking_offers (booking_id, cleaner_id)
    values (v_booking, p_preferred_cleaner);
    v_count := 1;
  else
    insert into booking_offers (booking_id, cleaner_id)
    select v_booking, cd.profile_id
    from cleaner_details cd
    where cd.active and cd.id_verified and cd.accepting_jobs
      and p_area = any (cd.areas_served)
      and not exists (
        select 1 from cleaner_time_off t
        where t.cleaner_id = cd.profile_id and t.off_date = v_service_date
      )
      and (coalesce(cardinality(cd.work_days), 0) = 0 or v_dow = any (cd.work_days));
    get diagnostics v_count = row_count;
  end if;

  if v_count = 0 then
    update bookings set status = 'no_cleaner_found' where id = v_booking;
  end if;

  return v_booking;
end;
$$;

-- Seed two launch codes (founder can manage these once an admin UI lands).
INSERT INTO promo_codes (code, kind, value, first_clean_only, active) VALUES
  ('WELCOME15', 'percent', 15, false, true),
  ('FIRST20',   'amount',  20, true,  true)
ON CONFLICT (code) DO NOTHING;

-- ربط equipment_rentals بجدول profiles بدلاً من auth.users
-- لتمكين PostgREST من اكتشاف العلاقات مع profiles

ALTER TABLE equipment_rentals
  DROP CONSTRAINT IF EXISTS equipment_rentals_renter_id_fkey;

ALTER TABLE equipment_rentals
  DROP CONSTRAINT IF EXISTS equipment_rentals_owner_id_fkey;

ALTER TABLE equipment_rentals
  ADD CONSTRAINT equipment_rentals_renter_id_fkey
    FOREIGN KEY (renter_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE equipment_rentals
  ADD CONSTRAINT equipment_rentals_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

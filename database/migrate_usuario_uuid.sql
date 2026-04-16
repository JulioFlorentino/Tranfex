-- ============================================================
-- Migrate reservaciones.usuario_id from INT to UUID
-- referencing auth.users(id) directly.
-- Run this in Supabase SQL Editor BEFORE the RLS policies.
-- ============================================================

-- 1. Drop the old foreign key (adjust name if different)
ALTER TABLE reservaciones
  DROP CONSTRAINT IF EXISTS reservaciones_usuario_id_fkey;

-- 2. Change column type to UUID
ALTER TABLE reservaciones
  ALTER COLUMN usuario_id TYPE uuid USING usuario_id::text::uuid;

-- 3. Add foreign key to auth.users
ALTER TABLE reservaciones
  ADD CONSTRAINT reservaciones_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE;

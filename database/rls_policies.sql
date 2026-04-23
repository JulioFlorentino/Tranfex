-- ============================================================
-- RLS Policies for rutas, paradas, ruta_paradas, reservaciones and tickets
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Enable RLS
ALTER TABLE rutas ENABLE ROW LEVEL SECURITY;
ALTER TABLE paradas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ruta_paradas ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- 2. Public read policies for map data (anon + authenticated)
DROP POLICY IF EXISTS "Public can view active rutas" ON rutas;
CREATE POLICY "Public can view active rutas"
  ON rutas FOR SELECT
  TO anon, authenticated
  USING (activo = true);

DROP POLICY IF EXISTS "Public can view active paradas" ON paradas;
CREATE POLICY "Public can view active paradas"
  ON paradas FOR SELECT
  TO anon, authenticated
  USING (activo = true);

DROP POLICY IF EXISTS "Public can view ruta_paradas" ON ruta_paradas;
CREATE POLICY "Public can view ruta_paradas"
  ON ruta_paradas FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM rutas r
      WHERE r.id_ruta = ruta_paradas.ruta_id
        AND r.activo = true
    )
    AND EXISTS (
      SELECT 1
      FROM paradas p
      WHERE p.id_parada = ruta_paradas.parada_id
        AND p.activo = true
    )
  );

-- 3. Reservaciones: users can SELECT their own reservations
DROP POLICY IF EXISTS "Users can view own reservaciones" ON reservaciones;
CREATE POLICY "Users can view own reservaciones"
  ON reservaciones FOR SELECT
  TO authenticated
  USING (usuario_id = auth.uid());

-- 4. Reservaciones: users can INSERT their own reservations
DROP POLICY IF EXISTS "Users can insert own reservaciones" ON reservaciones;
CREATE POLICY "Users can insert own reservaciones"
  ON reservaciones FOR INSERT
  TO authenticated
  WITH CHECK (usuario_id = auth.uid());

-- 5. Tickets: users can SELECT tickets linked to their reservations
DROP POLICY IF EXISTS "Users can view own tickets" ON tickets;
CREATE POLICY "Users can view own tickets"
  ON tickets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reservaciones r
      WHERE r.id_reservacion = tickets.reservacion_id
        AND r.usuario_id = auth.uid()
    )
  );

-- 6. Tickets: users can INSERT tickets for their own reservations
DROP POLICY IF EXISTS "Users can insert own tickets" ON tickets;
CREATE POLICY "Users can insert own tickets"
  ON tickets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reservaciones r
      WHERE r.id_reservacion = tickets.reservacion_id
        AND r.usuario_id = auth.uid()
    )
  );

-- 7. Tickets: users can DELETE tickets linked to their own reservations
DROP POLICY IF EXISTS "Users can delete own tickets" ON tickets;
CREATE POLICY "Users can delete own tickets"
  ON tickets FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reservaciones r
      WHERE r.id_reservacion = tickets.reservacion_id
        AND r.usuario_id = auth.uid()
    )
  );

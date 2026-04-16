-- ============================================================
-- RLS Policies for reservaciones and tickets tables
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Enable RLS
ALTER TABLE reservaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- 2. Reservaciones: users can SELECT their own reservations
CREATE POLICY "Users can view own reservaciones"
  ON reservaciones FOR SELECT
  USING (usuario_id = auth.uid());

-- 3. Reservaciones: users can INSERT their own reservations
CREATE POLICY "Users can insert own reservaciones"
  ON reservaciones FOR INSERT
  WITH CHECK (usuario_id = auth.uid());

-- 4. Tickets: users can SELECT tickets linked to their reservations
CREATE POLICY "Users can view own tickets"
  ON tickets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reservaciones r
      WHERE r.id_reservacion = tickets.reservacion_id
        AND r.usuario_id = auth.uid()
    )
  );

-- 5. Tickets: users can INSERT tickets for their own reservations
CREATE POLICY "Users can insert own tickets"
  ON tickets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reservaciones r
      WHERE r.id_reservacion = tickets.reservacion_id
        AND r.usuario_id = auth.uid()
    )
  );

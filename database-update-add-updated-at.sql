-- Script para agregar columna updated_at a la tabla mood_entries
-- Ejecuta esto en el SQL Editor de Supabase

-- PASO 1: Agregar columna updated_at
ALTER TABLE mood_entries 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- PASO 2: Crear trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- PASO 3: Crear trigger si no existe
DROP TRIGGER IF EXISTS update_mood_entries_updated_at ON mood_entries;
CREATE TRIGGER update_mood_entries_updated_at 
    BEFORE UPDATE ON mood_entries 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- PASO 4: Actualizar registros existentes para que tengan updated_at
UPDATE mood_entries 
SET updated_at = created_at 
WHERE updated_at IS NULL;

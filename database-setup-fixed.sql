-- Script CORREGIDO para configurar la base de datos en Supabase
-- Ejecuta esto en el SQL Editor de Supabase

-- Primero, eliminar las políticas problemáticas si existen
DROP POLICY IF EXISTS "Admin can view all data" ON users;
DROP POLICY IF EXISTS "Admin can view all mood entries" ON mood_entries;

-- Crear tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de entradas de mood
CREATE TABLE IF NOT EXISTS mood_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  color VARCHAR(7) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_mood_entries_user_date ON mood_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_mood_entries_date ON mood_entries(date);

-- Insertar usuario admin por defecto (si no existe)
INSERT INTO users (username, password, role) VALUES 
('admin', 'admin123', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Insertar usuario demo para la niña (si no existe)
INSERT INTO users (username, password, role) VALUES 
('niña123', 'mood2024', 'user')
ON CONFLICT (username) DO NOTHING;

-- Habilitar Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_entries ENABLE ROW LEVEL SECURITY;

-- Políticas SIMPLES para usuarios (sin recursión)
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (true); -- Permitir que todos vean usuarios (necesario para login)

CREATE POLICY "Users can insert their own profile" ON users
  FOR INSERT WITH CHECK (true); -- Permitir inserción (para registro)

-- Políticas para mood_entries
CREATE POLICY "Users can view their own mood entries" ON mood_entries
  FOR SELECT USING (true); -- Permitir que todos vean entradas (necesario para admin)

CREATE POLICY "Users can insert their own mood entries" ON mood_entries
  FOR INSERT WITH CHECK (true); -- Permitir inserción

CREATE POLICY "Users can update their own mood entries" ON mood_entries
  FOR UPDATE USING (true); -- Permitir actualización

CREATE POLICY "Users can delete their own mood entries" ON mood_entries
  FOR DELETE USING (true); -- Permitir eliminación

-- NOTA: Para producción, deberías usar políticas más restrictivas como:
-- CREATE POLICY "Users can only see their own entries" ON mood_entries
--   FOR SELECT USING (auth.uid()::text = user_id::text);
-- 
-- Pero para este demo, usamos políticas permisivas para que funcione

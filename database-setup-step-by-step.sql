-- Script PASO A PASO para crear la base de datos
-- Ejecuta esto en el SQL Editor de Supabase, UNO POR UNO

-- PASO 1: Crear tabla de usuarios
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PASO 2: Crear tabla de entradas de mood (con thumbnail)
CREATE TABLE mood_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  color TEXT NOT NULL, -- Almacena la imagen completa como data URL
  thumbnail TEXT, -- Almacena el thumbnail como data URL
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- PASO 3: Crear índices
CREATE INDEX idx_mood_entries_user_date ON mood_entries(user_id, date);
CREATE INDEX idx_mood_entries_date ON mood_entries(date);

-- PASO 4: Insertar usuarios por defecto
INSERT INTO users (username, password, role) VALUES 
('admin', 'admin123', 'admin');

INSERT INTO users (username, password, role) VALUES 
('niña123', 'mood2024', 'user');

-- PASO 5: Habilitar RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_entries ENABLE ROW LEVEL SECURITY;

-- PASO 6: Crear políticas simples (sin recursión)
CREATE POLICY "Allow all operations on users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all operations on mood_entries" ON mood_entries FOR ALL USING (true);

-- PASO 7: Verificar que todo esté creado
SELECT 'Tablas creadas:' as status;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

SELECT 'Usuarios creados:' as status;
SELECT username, role FROM users;

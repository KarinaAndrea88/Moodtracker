# Mood Tracker con Login y Dashboard Admin

Un sistema completo de seguimiento del estado de ánimo con autenticación de usuarios y dashboard administrativo.

## 🚀 Características

- **Login simple** con usuario y contraseña
- **Mood Tracker** para registrar el estado de ánimo diario
- **Dashboard Admin** para ver estadísticas y datos de todos los usuarios
- **Base de datos Supabase** gratuita y persistente
- **Interfaz moderna** con Tailwind CSS
- **Responsive** para móviles y desktop

## 🛠️ Instalación

### 1. Configurar Supabase

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta gratuita
2. Crea un nuevo proyecto
3. Ve a **Settings > API** y copia:
   - **Project URL**
   - **anon public key**
4. Ejecuta el script SQL en **SQL Editor**:
   ```sql
   -- Copia y pega el contenido de database-setup.sql
   ```

### 2. Configurar el proyecto

1. Instala las dependencias:
   ```bash
   npm install
   ```

2. Edita `supabase.js` con tus credenciales:
   ```javascript
   const supabaseUrl = 'TU_SUPABASE_URL'
   const supabaseAnonKey = 'TU_SUPABASE_ANON_KEY'
   ```

### 3. Ejecutar

```bash
npm run dev
```

La aplicación se abrirá en `http://localhost:3000`

## 👥 Usuarios por defecto

### Admin
- **Usuario:** `admin`
- **Contraseña:** `admin123`
- **Acceso:** Dashboard completo con todas las estadísticas

### Usuario Demo
- **Usuario:** `niña123`
- **Contraseña:** `mood2024`
- **Acceso:** Solo su propio mood tracker

## 📊 Dashboard Admin

El dashboard incluye:

- **Estadísticas generales** (total entradas, usuarios activos)
- **Filtros por usuario** y período de tiempo
- **Estadísticas por color** con porcentajes
- **Tabla de entradas recientes**
- **Filtros por semana, mes o año**

## 🎨 Paleta de Colores

Cada color representa un estado de ánimo:

- 🟢 **Verde** - Feliz
- 🔵 **Azul** - Tranquilo  
- 🔵 **Cian** - Energético
- 🟣 **Índigo** - Creativo
- 🔴 **Rojo** - Enojado
- 🟠 **Naranja** - Emocionado
- 🩷 **Rosa** - Amoroso
- 🟣 **Púrpura** - Misterioso
- 🟢 **Esmeralda** - Equilibrado
- 🟡 **Amarillo** - Alegre
- ⚫ **Negro** - Triste
- ⚪ **Blanco** - Neutral

## 🔒 Seguridad

- **Row Level Security (RLS)** habilitado en Supabase
- Los usuarios solo pueden ver y modificar sus propios datos
- El admin puede ver todos los datos
- Contraseñas almacenadas en texto plano (para demo - en producción usar hash)

## 📱 Uso

### Para usuarios regulares:
1. Inicia sesión con tus credenciales
2. Haz clic en cualquier día del calendario
3. Selecciona un color que represente tu estado de ánimo
4. Guarda tu entrada

### Para administradores:
1. Inicia sesión como admin
2. Accede al dashboard completo
3. Filtra por usuario y período
4. Revisa estadísticas y tendencias

## 🗄️ Base de Datos

### Tablas principales:
- **`users`**: Información de usuarios y roles
- **`mood_entries`**: Entradas diarias de estado de ánimo

### Estructura:
```sql
users:
  - id (UUID, PK)
  - username (VARCHAR, UNIQUE)
  - password (VARCHAR)
  - role (admin/user)
  - created_at (TIMESTAMP)

mood_entries:
  - id (UUID, PK)
  - user_id (UUID, FK a users)
  - date (DATE)
  - color (VARCHAR)
  - created_at (TIMESTAMP)
```

## 🚀 Despliegue

### Vercel (Recomendado):
1. Conecta tu repositorio de GitHub
2. Configura las variables de entorno de Supabase
3. Deploy automático

### Netlify:
1. Conecta tu repositorio
2. Build command: `npm run build`
3. Publish directory: `dist`

## 🔧 Personalización

### Agregar nuevos usuarios:
```sql
INSERT INTO users (username, password, role) VALUES 
('nuevo_usuario', 'contraseña123', 'user');
```

### Modificar colores:
Edita el array `PALETTE` en `MoodTracker.jsx`

### Cambiar idioma:
Modifica las constantes `MONTHS_ES` y `FULL_MONTHS_ES`

## 📞 Soporte

Si tienes problemas:
1. Verifica que las credenciales de Supabase sean correctas
2. Asegúrate de haber ejecutado el script SQL
3. Revisa la consola del navegador para errores

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

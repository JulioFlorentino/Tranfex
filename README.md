# Tranfex

Aplicación de transporte público para Santo Domingo, República Dominicana. Permite a los usuarios consultar rutas, reservar asientos y gestionar sus tickets digitales.

Desarrollada con **Expo SDK 54**, **React Native**, **TypeScript** y **Supabase**.

---

## Requisitos previos

- Node.js 18+
- npm
- Expo CLI (`npm install -g expo-cli`)
- Cuenta de Supabase con proyecto activo

---

## Instalación

```bash
npm install
```

---

## Variables de entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
EXPO_PUBLIC_SUPABASE_URL=https://<tu-proyecto>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<tu-anon-key>
```

Hay un archivo `.env.example` como referencia.

---

## Iniciar la app

```bash
# Web
npm run web

# Android
npm run android

# iOS
npm run ios
```

---

## Estructura del proyecto

```
app/
  _layout.tsx              # Layout raíz con AuthProvider y RutasProvider
  modal.tsx
  (tabs)/
    _layout.tsx            # Barra de navegación inferior (5 tabs)
    index.tsx              # Pantalla de inicio con saldo y búsqueda
    mapa.tsx               # Mapa nativo (iOS/Android) — react-native-maps
    mapa.web.tsx           # Mapa web — MapLibre GL + OpenFreeMap + OSRM
    reservar.tsx           # Reserva de asientos con modal de confirmación
    tickets.tsx            # Tickets del usuario con QR y eliminación
    ajustes.tsx            # Perfil y configuración con logout modal
assets/
components/
constants/
  theme.ts                 # Colores y tema de la app
context/
  auth.tsx                 # AuthContext — sesión de Supabase
  rutas.tsx                # RutasContext — carga de rutas desde Supabase
database/
  rls_policies.sql         # Políticas RLS de Supabase (ejecutar en SQL Editor)
  migrate_usuario_uuid.sql # Migración de usuario a UUID
hooks/
lib/
  supabase.ts              # Cliente de Supabase configurado (web + native storage)
metro.config.js            # Stub de react-native-maps en plataforma web
src/
  stubs/
    react-native-maps-stub.js  # Módulo vacío para evitar errores en web
types/
  database.ts              # Tipos generados de la base de datos Supabase
```

---

## Pantallas

### index.tsx — Inicio

- Tarjeta de saludo con nombre del usuario
- Balance disponible: **RD$1,500.00** (hardcodeado)
- Barra de búsqueda

### mapa.tsx / mapa.web.tsx — Mapa

- 8 rutas definidas (R-001 a R-008) con waypoints reales de Santo Domingo
- Panel de leyenda de rutas con colores diferenciados
- Tarjeta de información al seleccionar una ruta
- **Web**: MapLibre GL con tiles de OpenFreeMap, routing via OSRM
- **Nativo (iOS/Android)**: `react-native-maps` con `MapView`, `Polyline` y `Marker`

### reservar.tsx — Reservar

- Listado de rutas activas desde Supabase
- Modal de confirmación de reserva con:
  - Selector de asientos (+/-)
  - Resumen de precio (`RD$150 por asiento`)
  - Saldo disponible (`RD$1,500`)
- Modal de éxito tras confirmar
- Escribe la reserva en la tabla `reservaciones` de Supabase

### tickets.tsx — Tickets

- Lista de tickets del usuario autenticado
- Refresco automático al enfocar la pantalla (`useFocusEffect`)
- Modal de confirmación antes de eliminar un ticket
- Modal QR para visualizar el código del ticket
- Elimina de la tabla `tickets` con política RLS activa

### ajustes.tsx — Ajustes

- Datos del perfil del usuario
- Botón de cerrar sesión con modal de confirmación personalizado (sin `Alert.alert`)
- Llama a `supabase.auth.signOut()`

---

## Base de datos (Supabase)

### Tablas utilizadas

| Tabla           | Descripción                           |
| --------------- | ------------------------------------- |
| `rutas`         | Rutas de transporte disponibles       |
| `reservaciones` | Reservas de asientos por usuario      |
| `tickets`       | Tickets generados después de reservar |

### Políticas RLS

El archivo `database/rls_policies.sql` contiene las políticas necesarias. Debe ejecutarse manualmente en el **SQL Editor** de Supabase, incluyendo la política `DELETE` para tickets por usuario autenticado.

---

## Compatibilidad de plataformas

### react-native-maps en web

`react-native-maps` es un módulo nativo incompatible con web. Para evitar errores de bundling se configuró:

- `metro.config.js`: intercepta la resolución del módulo en plataforma `web` y redirige a un stub vacío
- `src/stubs/react-native-maps-stub.js`: exporta `null` para `MapView`, `Marker`, `Polyline`, etc.
- Expo resuelve `mapa.web.tsx` en web y `mapa.tsx` como fallback en nativo

### Alert.alert en web

`Alert.alert` no funciona en web. En todas las pantallas que requieren confirmación del usuario se usa un componente `Modal` de React Native con botones `Pressable`.

---

## Autenticación

Manejada por `context/auth.tsx` usando `supabase.auth`. Soporta:

- Login con email y contraseña (`signInWithPassword`)
- Cierre de sesión (`signOut`)
- Persistencia de sesión:
  - **Web**: `localStorage`
  - **Nativo**: `AsyncStorage`

---

## Comandos útiles

```bash
# Limpiar caché y reiniciar
npx expo start --clear

# Solo web
npx expo start --web

# Lint
npm run lint
```

---

## Notas de red

Si el DNS local no resuelve `*.supabase.co`, configurar el servidor DNS del adaptador de red a `8.8.8.8` (Google DNS). El dominio de Supabase resuelve correctamente con DNS públicos.

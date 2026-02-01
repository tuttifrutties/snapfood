# 📱 SNAPFOOD - Configuración de Build y Estado Actual

> **IMPORTANTE:** Leer este archivo COMPLETO antes de continuar.
> **Última actualización:** Enero 2026 - Build v62+
> **Usuario:** Facu (Argentina) - Responder SIEMPRE en español

---

## 🚨 ESTADO ACTUAL - TRABAJO EN PROGRESO

### ⚠️ TAREAS PENDIENTES (CONTINUAR DESDE AQUÍ)

El fork anterior estaba trabajando en estas tareas que quedaron INCOMPLETAS:

#### 1. COLORES DINÁMICOS - Tipografías según tema (PARCIALMENTE HECHO)
**Problema:** En tema oscuro hay textos en negro que no se leen. En tema claro hay textos blancos que no se leen.

**Regla a implementar:**
- **Tema OSCURO:** Todas las tipografías deben ser BLANCAS o GRIS CLARO (excepto las que usan el color primario del usuario)
- **Tema CLARO:** Todas las tipografías deben ser NEGRAS o GRIS OSCURO (excepto las que usan el color primario del usuario)

**Archivos afectados:**
- `app/cooking/index.tsx` - Parcialmente corregido, revisar
- `app/cooking/recipe/[id].tsx` - Parcialmente corregido, revisar
- `app/track-food/index.tsx` - Pendiente
- `app/profile.tsx` - Pendiente
- `app/onboarding.tsx` - Pendiente

**Cómo hacerlo:**
```tsx
// En JSX, usar colores del theme inline:
<Text style={[styles.texto, { color: theme.text }]}>Texto normal</Text>
<Text style={[styles.texto, { color: theme.textSecondary }]}>Texto secundario</Text>
<Text style={[styles.texto, { color: theme.textMuted }]}>Texto apagado</Text>
<Text style={[styles.texto, { color: theme.primary }]}>Texto con color del usuario</Text>
```

**Colores disponibles en theme:**
- `theme.text` - Blanco en oscuro, negro en claro
- `theme.textSecondary` - Gris claro en oscuro, gris oscuro en claro
- `theme.textMuted` - Gris más apagado
- `theme.primary` - Color elegido por usuario (coral por defecto)
- `theme.success` - Verde (#4CAF50) para indicadores positivos
- `theme.warning` - Amarillo (#FFC107) para advertencias
- `theme.surface` - Fondo de tarjetas
- `theme.surfaceVariant` - Fondo de secciones
- `theme.border` - Bordes

#### 2. COLOR PRIMARIO DINÁMICO (PENDIENTE)
**Problema:** Cuando el usuario elige verde, púrpura o naranja en Settings, hay colores que siguen siendo coral (#FF6B6B) hardcodeados.

**Lo que debe pasar:** TODO lo que sea coral debe cambiar al color que el usuario eligió.

**Archivos con colores hardcodeados (#FF6B6B):**
```bash
# Para encontrar todos los lugares:
grep -rn "#FF6B6B" app/ --include="*.tsx"
```

**Solución:** Reemplazar `#FF6B6B` por `theme.primary` en los estilos inline.

**NOTA:** Los `StyleSheet.create()` NO pueden usar variables. Los colores deben aplicarse INLINE en el JSX.

#### 3. IMAGEN DE COMPARTIR RECETA (PARCIALMENTE HECHO)
**Ubicación:** `app/cooking/recipe/[id].tsx`

**Pendiente:**
- ✅ Títulos "Ingredientes" e "Instrucciones" en blanco (HECHO)
- ⏳ Agregar estilos para el logo (shareCardLogo, shareCardLogoContainer, shareCardLogoText)

**Agregar estos estilos al final de StyleSheet.create():**
```tsx
shareCardLogoContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
},
shareCardLogo: {
  width: 32,
  height: 32,
  borderRadius: 8,
  backgroundColor: '#FF6B6B',
  alignItems: 'center',
  justifyContent: 'center',
},
shareCardLogoText: {
  color: '#fff',
  fontSize: 18,
  fontWeight: 'bold',
},
```

#### 4. EDITAR INGREDIENTES DETECTADOS POR IA (NO IMPLEMENTADO)
**Ubicación:** `app/track-food/index.tsx`

**Requerimiento:** Cuando la IA detecta ingredientes de una foto, el usuario debe poder:
1. Ver un ícono de lápiz (✏️) al lado de cada ingrediente
2. Al tocar el lápiz, mostrar opciones: "Cambiar ingrediente" o "Eliminar"
3. Si cambia el ingrediente (ej: "chocolate" → "dulce de leche"), la IA debe RECALCULAR las calorías

**Flujo:**
1. Usuario saca foto de comida
2. IA detecta: "Flan con chocolate"
3. Usuario toca lápiz en "chocolate"
4. Elige "Cambiar ingrediente"
5. Buscador aparece, escribe "dulce de leche"
6. Backend recalcula calorías con dulce de leche en vez de chocolate
7. Se actualiza la vista

**Backend necesario:** Endpoint para recalcular nutrición con ingrediente modificado.

**Cache:** Guardar las correcciones del usuario en AsyncStorage para futuras referencias.

---

## 🚨 REGLAS CRÍTICAS PARA BUILD

1. **USAR NPM** (nunca yarn)
2. **slug:** `foodsnap` (NO "snapfood")
3. **versionCode:** Editar MANUALMENTE en `app.json`
4. **newArchEnabled:** DEBE ser `true`

---

## 📦 Comandos PowerShell para Build

```powershell
cd W:\EMERGENT\APPS\snapfood\snapfood

git fetch origin

git reset --hard origin/main

cd frontend
```

**⚠️ EDITAR `frontend/app.json` - cambiar versionCode a 62 (o el siguiente)**

```powershell
Remove-Item -Recurse -Force android -ErrorAction SilentlyContinue

npm install --legacy-peer-deps

npx expo prebuild --clean --platform android

cd ..

git add .

git commit -m "v62: Descripcion del build"

git push origin main

cd frontend

eas build --platform android --profile production
```

---

## 🎨 SISTEMA DE TEMAS

### ThemeContext (`src/contexts/ThemeContext.tsx`)

El usuario puede elegir:
- **Modo:** `light` o `dark`
- **Color primario:** coral, green, purple, orange

### Cómo usar en componentes:

```tsx
import { useTheme } from '../src/contexts/ThemeContext';

function MiComponente() {
  const { theme } = useTheme();
  
  return (
    <View style={{ backgroundColor: theme.background }}>
      <Text style={{ color: theme.text }}>Texto normal</Text>
      <Text style={{ color: theme.primary }}>Texto con color del usuario</Text>
    </View>
  );
}
```

### Propiedades del theme:
```typescript
theme.mode          // 'light' | 'dark'
theme.primary       // Color elegido (#FF6B6B, #4CAF50, etc)
theme.background    // Fondo principal
theme.surface       // Fondo de tarjetas
theme.surfaceVariant // Fondo de secciones
theme.text          // Texto principal
theme.textSecondary // Texto secundario
theme.textMuted     // Texto apagado
theme.border        // Bordes
theme.success       // Verde
theme.warning       // Amarillo
theme.error         // Rojo
```

---

## ✅ FUNCIONALIDADES COMPLETADAS

- Selector de porciones en recetas
- Popup "¿Cuántas porciones comiste?"
- Compartir recetas como imagen (parcial - falta logo)
- Horarios de notificaciones personalizables
- Salud y restricciones en onboarding y perfil
- Permisos de galería
- Notificaciones clickeables → llevan a recetas
- Calorías SIN grasas de cocción
- Recordatorio "añadirlo en grasas"
- Iconos actualizados (coral con fondo transparente)
- Barra de navegación Android oculta (modo inmersivo)

---

## 📁 Archivos Clave

```
app/cooking/index.tsx         - Selección ingredientes, sugerencia recetas
app/cooking/recipe/[id].tsx   - Detalle receta, compartir, porciones
app/track-food/index.tsx      - Foto comida, galería, buscar
app/profile.tsx               - Mi Ficha, editar salud
app/onboarding.tsx            - Onboarding con paso de salud
app/(tabs)/settings.tsx       - Ajustes, horarios, tema, color
src/contexts/ThemeContext.tsx - Sistema de temas y colores
```

---

## 🔑 Integraciones

- **OpenAI GPT-4o:** Via Emergent LLM Key
- **RevenueCat:** Suscripciones
- **expo-notifications:** Recordatorios
- **expo-sharing + react-native-view-shot:** Compartir imágenes

---

## ⚠️ RECORDATORIOS

**CAMBIOS EN BACKEND:** → Recordar REDEPLOY en Emergent
**CAMBIOS EN FRONTEND:** → Save to Git + Build con comandos PowerShell
**PowerShell NO acepta &&** → Usar comandos separados
**El usuario NO es programador** → Dar instrucciones paso a paso

---

*Última actualización: Enero 2026*

# 📱 SNAPFOOD - Configuración de Build y Estado Actual

> **IMPORTANTE:** Leer este archivo COMPLETO antes de continuar.
> **Última actualización:** Febrero 2026 - Build v62
> **Usuario:** Facu (Argentina) - Responder SIEMPRE en español

---

## 🚨 ESTADO ACTUAL - V62 EN PRODUCCIÓN

### ✅ TRABAJO COMPLETADO EN ESTA SESIÓN

#### 1. COLORES DINÁMICOS - COMPLETADO ✅
Se refactorizó TODA la app para usar colores dinámicos del ThemeContext.

**Archivos actualizados:**
- ✅ `app/index.tsx` - Colores dinámicos aplicados
- ✅ `app/onboarding.tsx` - Todos los 7 pasos con colores del tema
- ✅ `app/cooking/index.tsx` - Completamente refactorizado
- ✅ `app/cooking/recipe/[id].tsx` - Completamente refactorizado
- ✅ `app/track-food/index.tsx` - Completamente refactorizado
- ✅ `app/profile.tsx` - Ya estaba bien, verificado
- ✅ `app/(tabs)/home.tsx` - Ya estaba bien, verificado

**Regla implementada:**
- **Tema OSCURO:** Tipografías BLANCAS o GRIS CLARO
- **Tema CLARO:** Tipografías NEGRAS o GRIS OSCURO
- **Color primario:** Dinámico según elección del usuario (coral, verde, púrpura, naranja)

#### 2. LOGO EN IMAGEN DE COMPARTIR - COMPLETADO ✅
**Ubicación:** `app/cooking/recipe/[id].tsx`

- Se usa el logo real de la app (`assets/images/icon.png`) en vez de la "S" estilizada
- Estilos agregados: `shareCardLogoImage`, `shareCardLogoContainer`

#### 3. EDITAR INGREDIENTES DETECTADOS POR IA - IMPLEMENTADO ✅
**Ubicación:** `app/track-food/index.tsx`

**Funcionalidad:**
- ✏️ Ícono de lápiz al lado de cada ingrediente detectado por IA
- Modal de búsqueda para encontrar el ingrediente correcto
- Recálculo automático de calorías al cambiar ingrediente

**Backend nuevo:** 
- Endpoint `POST /api/recalculate-nutrition` en `server.py`
- Usa GPT-4o para recalcular calorías manteniendo la porción detectada

**Estados agregados:**
```tsx
const [editingIngredientIndex, setEditingIngredientIndex] = useState<number | null>(null);
const [editIngredientSearch, setEditIngredientSearch] = useState('');
const [editSearchResults, setEditSearchResults] = useState<ApiFoodItem[]>([]);
const [isSearchingEditIngredient, setIsSearchingEditIngredient] = useState(false);
const [isRecalculatingNutrition, setIsRecalculatingNutrition] = useState(false);
```

---

## ⚠️ POSIBLES ISSUES PENDIENTES

### 1. Editar ingrediente - Verificar funcionamiento
El modal de búsqueda abre correctamente, pero hay que verificar:
- Que el recálculo de calorías funcione bien en producción
- Que el modal se cierre después de seleccionar
- Que las calorías se actualicen en pantalla

**Si hay problemas, revisar:**
- Función `handleSelectNewIngredient` en `track-food/index.tsx`
- Endpoint `/api/recalculate-nutrition` en `server.py`
- Logs del backend para ver errores

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

**⚠️ EDITAR `frontend/app.json` - cambiar versionCode al siguiente número**

```powershell
Remove-Item -Recurse -Force android -ErrorAction SilentlyContinue
npm install --legacy-peer-deps
npx expo prebuild --clean --platform android
cd ..
git add .
git commit -m "vXX: Descripcion del build"
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
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.texto, { color: theme.text }]}>Texto normal</Text>
      <Text style={[styles.texto, { color: theme.primary }]}>Texto destacado</Text>
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
theme.surfaceVariant // Fondo de secciones/inputs
theme.text          // Texto principal
theme.textSecondary // Texto secundario
theme.textMuted     // Texto apagado
theme.border        // Bordes
theme.success       // Verde (#4CAF50)
theme.warning       // Amarillo (#FFC107)
theme.error         // Rojo
```

---

## ✅ FUNCIONALIDADES COMPLETADAS

### Núcleo
- Análisis de fotos de comida con IA
- Seguimiento de calorías diarias
- Sugerencias de recetas basadas en ingredientes
- Sistema de ingredientes en memoria

### UI/UX
- ✅ Colores dinámicos en toda la app (modo claro/oscuro)
- ✅ Color primario personalizable
- ✅ Editar ingredientes detectados por IA con recálculo
- ✅ Selector de porciones en recetas
- ✅ Popup "¿Cuántas porciones comiste?"
- ✅ Compartir recetas como imagen con logo
- ✅ Barra de navegación Android oculta (modo inmersivo)

### Notificaciones
- ✅ Horarios personalizables
- ✅ Notificaciones clickeables → llevan a recetas
- ✅ Re-registro de notificaciones al abrir app

### Onboarding
- ✅ Selección de país
- ✅ Actividades físicas con días/duración
- ✅ Salud y restricciones alimentarias
- ✅ Buscador de alergias

### Permisos
- ✅ Cámara
- ✅ Galería (READ_MEDIA_IMAGES)
- ✅ Notificaciones

---

## 📁 Archivos Clave

```
app/index.tsx                 - Pantalla inicial, redirección
app/onboarding.tsx            - Onboarding completo (7 pasos)
app/cooking/index.tsx         - Selección ingredientes, sugerencia recetas
app/cooking/recipe/[id].tsx   - Detalle receta, compartir, porciones
app/track-food/index.tsx      - Foto comida, galería, editar ingredientes
app/profile.tsx               - Mi Ficha, editar salud
app/(tabs)/home.tsx           - Dashboard principal
app/(tabs)/settings.tsx       - Ajustes, horarios, tema, color
src/contexts/ThemeContext.tsx - Sistema de temas y colores
backend/server.py             - API endpoints incluyendo recalculate-nutrition
```

---

## 🔑 Integraciones

- **OpenAI GPT-4o:** Via Emergent LLM Key (análisis fotos, recálculo nutrición)
- **RevenueCat:** Suscripciones
- **expo-notifications:** Recordatorios
- **expo-sharing + react-native-view-shot:** Compartir imágenes
- **expo-image-picker:** Cámara y galería

---

## ⚠️ RECORDATORIOS IMPORTANTES

| Cambio | Acción requerida |
|--------|------------------|
| **Cambios en BACKEND** | Save to Git + **REDEPLOY** en Emergent |
| **Cambios solo en FRONTEND** | Save to Git (NO necesita redeploy) |
| **Para buildear** | Comandos PowerShell de arriba |

**PowerShell NO acepta &&** → Usar comandos separados
**El usuario NO es programador** → Dar instrucciones paso a paso claras

---

## 📝 HISTORIAL DE VERSIONES RECIENTES

| Versión | Cambios principales |
|---------|---------------------|
| v62 | Colores dinámicos completos, logo compartir, editar ingredientes IA |
| v61 | Notificaciones clickeables, permisos galería |
| v60 | Iconos nuevos, modo inmersivo Android |

---

*Última actualización: Febrero 2026*

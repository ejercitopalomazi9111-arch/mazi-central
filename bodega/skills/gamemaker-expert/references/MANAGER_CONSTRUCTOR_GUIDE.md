# Manager Constructor Guide (Generic)

**Purpose**: Step-by-step guide for creating manager constructors in GameMaker Studio 2 projects

**Audience**: All GameMaker developers using GML

**Last Updated**: 2025-10-29

---

## Table of Contents

1. [When to Use Manager vs Object](#when-to-use-manager-vs-object)
2. [Step-by-Step Creation Template](#step-by-step-creation-template)
3. [Public API Design](#public-api-design)
4. [Reference Exposure Pattern](#reference-exposure-pattern)
5. [Cleanup Responsibilities](#cleanup-responsibilities)
6. [Testing Managers](#testing-managers)
7. [Debug Helpers](#debug-helpers)
8. [Built-in Variable Conflict Checklist](#built-in-variable-conflict-checklist)
9. [Migration from Globals](#migration-from-globals)
10. [Generic Examples](#generic-examples)

---

## When to Use Manager vs Object

### Decision Tree

```
Does the system need Step/Draw/Collision events?
├─ YES → Use Object (objGameController, objUIManager, objCameraController)
└─ NO → Does it manage game-wide state?
    ├─ YES → Use Manager Constructor
    └─ NO → Use regular Struct
```

### Manager Constructor Use Cases

Use a Manager Constructor when:
- [ ] Managing game-wide state (resources, statistics, configuration)
- [ ] Does NOT need Step/Draw/Collision events
- [ ] Requires encapsulation (internal state + public API)
- [ ] Needs backwards compatibility with existing code
- [ ] Requires cleanup of ds_* structures
- [ ] Benefits from testability (can instantiate multiple for testing)

**Examples**:
- `ResourceManager` - Track and manipulate game resources
- `StatisticsManager` - Track player statistics
- `ConfigManager` - Manage game settings and configuration
- `SaveLoadManager` - Handle save file operations
- `AudioManager` - Manage sound volumes and music state

### Object Use Cases

Use an Object when:
- [ ] Needs Step event (logic every frame)
- [ ] Needs Draw event (rendering)
- [ ] Needs Collision event (physics interactions)
- [ ] Represents a visible game entity (player, enemy, UI element)
- [ ] Requires persistent flag (survives room transitions)

**Examples**:
- `objGameController` - Game loop manager (needs Step event)
- `objUIManager` - UI rendering (needs Draw GUI event)
- `objPlayer` - Player character (needs Step/Draw/Collision events)

---

## Step-by-Step Creation Template

### Step 1: Create Script File

**Location**: `scripts/scrYourManager/scrYourManager.gml`

**Naming Convention**:
- Start with `scr` prefix (GameMaker convention)
- Use PascalCase: `scrResourceManager`, `scrStatisticsManager`
- Descriptive name indicating purpose

### Step 2: Define Constructor with Internal State

```gml
/// @description Your Manager - Brief description of purpose
/// @example global.your_manager = new YourManager();
function YourManager() constructor {
    // Pseudo-private members (internal use only - __ prefix)
    __internal_cache = {};
    __last_update_time = 0;
    __validation_rules = {};

    // Public state (exposed if needed for backwards compatibility)
    state_data = { active: true, value: 0, count: 0 };

    // Initialization logic (if needed)
    __initialize();
}
```

**Key Points**:
- Use `__` prefix for internal-only members (documentation convention)
- Initialize ALL state in constructor (no undefined properties)
- Public state should be struct (for reference exposure pattern if needed)
- Add initialization helper if setup logic is complex

### Step 3: Add Public API Methods

```gml
    // Public API - Accessor methods
    /// @description Get value by key
    /// @param {string} _key Property name
    /// @return {real} Property value or 0 if not found
    static get = function(_key) {
        if (variable_struct_exists(state_data, _key)) {
            return state_data[$ _key];
        }
        return 0; // Safe default
    }

    /// @description Set value by key
    /// @param {string} _key Property name
    /// @param {real} _value New value
    static set = function(_key, _value) {
        if (__validate_value(_value)) {
            state_data[$ _key] = _value;
        }
    }

    /// @description Add to existing value
    /// @param {string} _key Property name
    /// @param {real} _amount Amount to add
    /// @return {real} New value after addition
    static add = function(_key, _amount) {
        state_data[$ _key] += _amount;
        return state_data[$ _key];
    }

    /// @description Reset all state to defaults
    static reset = function() {
        state_data = { active: true, value: 0, count: 0 };
        __internal_cache = {};
    }
```

**Key Points**:
- Use `static` for shared methods (memory efficient)
- Provide `get()`, `set()`, `add()`, `subtract()` as needed
- Always include `reset()` for testing/new game
- Use safe accessors with default values
- Document parameters and return values with JSDoc tags

### Step 4: Add Internal Helpers

```gml
    // Internal helpers (not part of public API - __ prefix)
    /// @description Initialize manager state (internal)
    static __initialize = function() {
        __internal_cache = {};
        __last_update_time = current_time;
    }

    /// @description Rebuild internal cache (internal)
    static __rebuild_cache = function() {
        __internal_cache.average = state_data.value / max(1, state_data.count);
        __last_update_time = current_time;
    }

    /// @description Validate input value (internal)
    /// @param {real} _value Value to validate
    /// @return {boolean} True if valid
    static __validate_value = function(_value) {
        return is_real(_value) && _value >= 0;
    }
```

**Key Points**:
- Use `__` prefix to signal "internal use only"
- Don't document these in public API comments (or mark as `@ignore`)
- Can be refactored freely without breaking external code
- Good for validation, caching, or complex calculations

### Step 5: Add Cleanup Method (If Needed)

```gml
    /// @description Clean up ds_* structures
    /// @note Only call when manager is being destroyed
    static cleanup = function() {
        // Only needed if using ds_* structures
        if (variable_struct_exists(self, "__ds_map_id")) {
            ds_map_destroy(__ds_map_id);
        }
        if (variable_struct_exists(self, "__ds_list_id")) {
            ds_list_destroy(__ds_list_id);
        }
    }
```

**Note**: Only needed for ds_* structures. Structs auto-garbage collect!

### Step 6: Instantiate in Controller Object

**File**: `objects/objGameController/Create_0.gml` (or similar)

```gml
// Create manager
global.your_manager = new YourManager();

// Optional: Expose internal state for backwards compatibility
global.your_data = global.your_manager.state_data;  // Reference exposure!
```

**⚠️ CRITICAL**: See [Reference Exposure Pattern](#reference-exposure-pattern) for details

---

## Public API Design

### Method Naming Conventions

| Method Type | Naming Pattern | Example | Side Effects | Return Value |
|-------------|----------------|---------|--------------|--------------|
| **Query** | `get_*()` or `is_*()` | `get_value()`, `is_active()` | ❌ No | Value or boolean |
| **Command** | `add_*()`, `set_*()`, `update_*()` | `add_resource(10)`, `set_state()` | ✅ Yes | New value or void |
| **Utility** | `convert_*()`, `calculate_*()` | `convert_to_units()`, `calculate_total()` | ❌ No | Calculated value |
| **State** | `reset()`, `initialize()`, `clear()` | `reset()`, `initialize()` | ✅ Yes | void |

### Command-Query Separation (CQS)

**Principle**: Methods should either:
- **Query**: Return information without changing state
- **Command**: Change state without returning information

**Example**:

```gml
function ResourceManager() constructor {
    resources = { wood: 0, stone: 0, gold: 0 };

    // Queries (no side effects) - READ
    static get = function(_type) { return resources[$ _type] ?? 0; }
    static has_enough = function(_type, _amount) { return get(_type) >= _amount; }
    static get_total = function() { return resources.wood + resources.stone + resources.gold; }

    // Commands (mutate state) - WRITE
    static add = function(_type, _amount) { resources[$ _type] += _amount; }
    static subtract = function(_type, _amount) { resources[$ _type] -= _amount; }
    static reset = function() { resources = { wood: 0, stone: 0, gold: 0 }; }
}
```

---

## Reference Exposure Pattern

### Why Reference Exposure?

**Problem**: Existing code uses `global.resource_data` directly. Migrating all code to use `global.resource_manager.get()` is expensive.

**Solution**: Expose manager's internal struct as a global reference for backwards compatibility.

### Implementation

```gml
// objGameController/Create_0.gml
global.resource_manager = new ResourceManager();
global.resource_data = global.resource_manager.resources;  // Reference!
```

**What this does**:
- `global.resource_data` is a **reference** to `global.resource_manager.resources`
- Both point to the SAME struct in memory
- Mutating properties works: `global.resource_data.wood += 10;`
- Both see the same changes instantly

### CRITICAL RULE: Never Reassign Exposed References

```gml
// ✅ CORRECT: Mutate properties (preserves reference)
global.resource_data.wood += 10;
global.resource_data.stone = 50;
global.resource_data.gold = 100;

// ✅ CORRECT: Use manager methods
global.resource_manager.add("wood", 10);
global.resource_manager.set("stone", 50);

// ❌ WRONG: Reassign struct (breaks reference!)
global.resource_data = { wood: 100, stone: 50, gold: 0 };
// Now global.resource_data is a NEW struct, disconnected from manager!
// Manager methods operate on the OLD struct - your changes are lost!

// ✅ CORRECT: Reset via manager method
global.resource_manager.reset();
```

### Save/Load Integration

```gml
// ✅ CORRECT: Mutate properties, not reassign
function load_resources(_save_data) {
    global.resource_data.wood = _save_data.resources.wood;
    global.resource_data.stone = _save_data.resources.stone;
    global.resource_data.gold = _save_data.resources.gold;
}

// ❌ WRONG: Reassigns struct (breaks reference)
function load_resources(_save_data) {
    global.resource_data = _save_data.resources;  // BREAKS MANAGER!
}

// ✅ ALSO CORRECT: Use manager method
function load_resources(_save_data) {
    global.resource_manager.reset();
    global.resource_manager.add("wood", _save_data.resources.wood);
    global.resource_manager.add("stone", _save_data.resources.stone);
    global.resource_manager.add("gold", _save_data.resources.gold);
}
```

---

## Cleanup Responsibilities

### When Cleanup is Needed

Implement `cleanup()` method if manager uses:
- `ds_map_create()`
- `ds_list_create()`
- `ds_grid_create()`
- `ds_priority_create()`, `ds_queue_create()`, `ds_stack_create()`

**Structs/Arrays/Primitives do NOT need cleanup** - they are auto-garbage collected!

### Example with Cleanup

```gml
/// @description Database Manager - Manages game databases
function DatabaseManager() constructor {
    // ds_map structures need manual cleanup
    __items_map = ds_map_create();
    __entities_map = ds_map_create();

    static load_all = function() {
        // Load JSON files into ds_maps
        var _items_json = json_parse(file_text_read_all("items.json"));
        // Process and store in __items_map...
    }

    static get_item = function(_item_id) {
        return __items_map[? _item_id];
    }

    static cleanup = function() {
        ds_map_destroy(__items_map);
        ds_map_destroy(__entities_map);
    }
}
```

### Cleanup Registration

**File**: `objects/objGameController/CleanUp_0.gml`

```gml
/// @description Cleanup managers on game end

// Cleanup managers that use ds_* structures
if (variable_global_exists("database_manager") && global.database_manager != undefined) {
    global.database_manager.cleanup();
}

// Note: Managers using only structs don't need cleanup (auto-garbage collected)
```

---

## Testing Managers

### Why Managers are Testable

**Objects**: Hard to test (require game running, instance_create)
**Manager Constructors**: Easy to test (instantiate directly)

### Test Pattern

```gml
// In test suite
function test_resource_manager_add() {
    // Setup: Create test manager (NOT using global)
    var _test_manager = new ResourceManager();

    // Act: Add resource
    _test_manager.add("wood", 10);

    // Assert: Verify result
    assert_equal(_test_manager.get("wood"), 10, "Should add 10 wood");

    // No cleanup needed (auto-garbage collected)
}
```

### Test Isolation

```gml
function test_setup() {
    // Reset global managers for clean state
    if (variable_global_exists("resource_manager")) {
        global.resource_manager.reset();
    }
}
```

---

## Debug Helpers

### Optional Debug Method

```gml
/// @description Resource Manager
function ResourceManager() constructor {
    resources = { wood: 0, stone: 0, gold: 0 };

    // ... public API methods ...

    /// @description Debug dump (not in public API)
    /// @ignore
    static debug_dump = function() {
        show_debug_message("=== Resource Manager State ===");
        show_debug_message("Wood: " + string(resources.wood));
        show_debug_message("Stone: " + string(resources.stone));
        show_debug_message("Gold: " + string(resources.gold));
        show_debug_message("Total: " + string(get_total()));
    }
}
```

### Usage

```gml
// In debug build or when troubleshooting
if (keyboard_check_pressed(vk_f12)) {
    global.resource_manager.debug_dump();
}
```

---

## Built-in Variable Conflict Checklist

### Before Creating Manager Variables

Check variable names against:

**Built-in Instance Variables**:
- `x`, `y`, `speed`, `direction` (position/movement)
- `sprite_index`, `image_index`, `image_speed` (sprites)
- `id`, `object_index`, `visible`, `depth`, `layer` (object info)

**Deprecated Global Built-ins**:
- `health`, `score`, `lives`

**Reference**: [BUILT_IN_VARIABLES.md](BUILT_IN_VARIABLES.md) - Complete list

### Safe Naming Patterns

| ❌ Avoid | ✅ Use Instead |
|---------|---------------|
| `health` | `hp`, `max_hp`, `health_points` |
| `score` | `points`, `total_points`, `game_score` |
| `speed` | `move_speed`, `velocity`, `movement_rate` |
| `direction` | `facing_angle`, `movement_direction`, `heading` |

---

## Migration from Globals

### Step 1: Identify Global State

Search for direct global assignments:
```bash
# Using ripgrep or similar
rg "global\.\w+ =" --type gml
```

### Step 2: Create Manager Constructor

Move global state into manager:
```gml
// Before: Direct global
global.game_resources = { wood: 0, stone: 0, gold: 0 };

// After: Manager encapsulation
function ResourceManager() constructor {
    resources = { wood: 0, stone: 0, gold: 0 };
    // ... methods ...
}
```

### Step 3: Update Controller Object

```gml
// objGameController/Create_0.gml
global.resource_manager = new ResourceManager();
global.game_resources = global.resource_manager.resources;  // Backwards compat
```

### Step 4: Migrate Call Sites (Gradually)

**Option A**: Keep using exposed reference (no code changes)
```gml
// Existing code works unchanged
global.game_resources.wood += 10;
```

**Option B**: Migrate to manager methods (preferred for new code)
```gml
// New code uses manager
global.resource_manager.add("wood", 10);
```

### Step 5: Validation

Search for struct reassignments (these break reference):
```bash
# Should only appear in controller Create event
rg "global\.game_resources =" --type gml
```

---

## Generic Examples

### Example 1: Resource Manager

**Purpose**: Manage game resources (wood, stone, gold, etc.)

```gml
/// @description Resource Manager - Manages collectible resources
function ResourceManager() constructor {
    // Internal conversion rates (private)
    __base_value_wood = 1;
    __base_value_stone = 2;
    __base_value_gold = 10;

    // Public state
    resources = { wood: 0, stone: 0, gold: 0 };

    // Public API
    static get = function(_type) {
        return resources[$ _type] ?? 0;
    }

    static add = function(_type, _amount) {
        resources[$ _type] += _amount;
        return resources[$ _type];
    }

    static subtract = function(_type, _amount) {
        if (get(_type) >= _amount) {
            resources[$ _type] -= _amount;
            return true;
        }
        return false;
    }

    static has_enough = function(_type, _amount) {
        return get(_type) >= _amount;
    }

    static get_total_value = function() {
        return (resources.wood * __base_value_wood) +
               (resources.stone * __base_value_stone) +
               (resources.gold * __base_value_gold);
    }

    static reset = function() {
        resources = { wood: 0, stone: 0, gold: 0 };
    }
}
```

### Example 2: Statistics Manager

**Purpose**: Track game statistics (kills, deaths, time played)

```gml
/// @description Statistics Manager - Tracks player statistics
function StatisticsManager() constructor {
    stats = {
        enemies_defeated: 0,
        deaths: 0,
        playtime_seconds: 0,
        distance_traveled: 0
    };

    // Public API
    static get = function(_key) {
        return stats[$ _key] ?? 0;
    }

    static increment = function(_key) {
        stats[$ _key]++;
        return stats[$ _key];
    }

    static add = function(_key, _amount) {
        stats[$ _key] += _amount;
        return stats[$ _key];
    }

    static reset_all = function() {
        stats = {
            enemies_defeated: 0,
            deaths: 0,
            playtime_seconds: 0,
            distance_traveled: 0
        };
    }

    // Convenience methods
    static on_enemy_defeated = function() {
        increment("enemies_defeated");
    }

    static on_death = function() {
        increment("deaths");
    }

    static update_playtime = function(_delta_seconds) {
        add("playtime_seconds", _delta_seconds);
    }
}
```

### Example 3: Config Manager

**Purpose**: Manage game settings and configuration

```gml
/// @description Config Manager - Manages game settings
function ConfigManager() constructor {
    __default_config = {
        fullscreen: false,
        resolution_width: 1280,
        resolution_height: 720,
        master_volume: 1.0,
        music_volume: 0.7,
        sfx_volume: 0.8,
        difficulty: "normal"
    };

    config = struct_copy(__default_config);

    // Public API
    static get = function(_key) {
        return config[$ _key] ?? undefined;
    }

    static set = function(_key, _value) {
        if (variable_struct_exists(__default_config, _key)) {
            config[$ _key] = _value;
            __save_config();
            return true;
        }
        return false;
    }

    static reset_to_defaults = function() {
        config = struct_copy(__default_config);
        __save_config();
    }

    static load = function() {
        if (file_exists("config.json")) {
            var _json = file_text_read_all("config.json");
            var _loaded = json_parse(_json);
            if (_loaded != undefined) {
                config = _loaded;
            }
        }
    }

    // Internal helpers
    static __save_config = function() {
        var _json = json_stringify(config);
        file_text_write_all("config.json", _json);
    }

    // Auto-load on creation
    load();
}
```

---

## Summary Checklist

When creating a new manager:

- [ ] Determine if manager is appropriate (no Step/Draw/Collision needed)
- [ ] Create script file (`scripts/scrYourManager/scrYourManager.gml`)
- [ ] Use `__` prefix for internal-only members
- [ ] Initialize ALL state in constructor
- [ ] Provide public API methods (get, set, add, subtract, reset)
- [ ] Add `cleanup()` if using ds_* structures
- [ ] Instantiate in game controller's Create event
- [ ] Use reference exposure for backwards compatibility (if needed)
- [ ] Add cleanup call in controller's CleanUp event (if cleanup method exists)
- [ ] Validate no struct reassignments in codebase
- [ ] Check for built-in variable conflicts
- [ ] Test with isolated manager instances
- [ ] Document public API with JSDoc tags (@description, @param, @return)
- [ ] Optional: Add debug_dump() method

---

## Additional Resources

- **ARCHITECTURE_PATTERNS.md**: Encapsulation Patterns section
- **BUILT_IN_VARIABLES.md**: Complete list of GameMaker reserved variables
- **GameMaker Manual**: [Structs and Constructors](https://manual.gamemaker.io/monthly/en/GameMaker_Language/GML_Overview/Structs.htm)

**Last Updated**: 2025-10-29

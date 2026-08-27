# GameMaker Architecture Patterns Reference

**Purpose**: Guide for designing maintainable, scalable GameMaker Studio 2 projects using appropriate architectural patterns and design principles.

**Last Updated**: 2025-10-29

---

## Table of Contents

1. [GameMaker Architecture Philosophy](#gamemaker-architecture-philosophy)
2. [Core Architectural Patterns](#core-architectural-patterns)
3. [SOLID Principles in GML](#solid-principles-in-gml)
4. [Additional Design Principles](#additional-design-principles)
5. [Performance Patterns](#performance-patterns)
6. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
7. [Encapsulation Patterns](#encapsulation-patterns)

---

## GameMaker Architecture Philosophy

### Why NOT MVC/MVP for GameMaker?

**TL;DR**: MVC/MVP assumes stateless request/response cycles (web apps, CRUD applications). GameMaker runs **persistent, stateful event loops** at 60 FPS. Forcing MVC creates unnecessary complexity without benefits.

**Key Differences**:

| Aspect | MVC/MVP (Web Apps) | GameMaker Event System |
|--------|-------------------|------------------------|
| **Execution Model** | Request → Process → Response (stateless) | Continuous 60 FPS event loop (stateful) |
| **View Behavior** | Passive (Controller pushes data) | Active (Objects poll state every frame) |
| **Model Location** | Separate POCO classes | Objects themselves (state + behavior) |
| **State Lifecycle** | Per-request (ephemeral) | Persistent across frames (long-lived) |
| **Separation** | Formal class boundaries | Event type boundaries (Step vs Draw) |

**Why GameMaker Objects Aren't MVC Models**:
- MVC Models are "Plain Old CLR/Java Objects" (POCOs) - data-only classes with no framework dependencies
- GameMaker Objects inherit from GameMaker's engine (x, y, sprite_index, Step/Draw events)
- Objects ARE the Model (state), Controller (Step event logic), AND View (Draw event rendering) in one entity
- Creating separate "model" Structs duplicates state (e.g., `objPlayer.health` vs `PlayerModel.health`) without benefit

**What GameMaker Uses Instead**:
- **Event-Driven Architecture**: Step events (logic) naturally separated from Draw events (rendering)
- **Service Locator Pattern**: Centralized global state initialization
- **Command Pattern**: Decoupled input handling
- **Data-Driven Design**: JSON configs for extensibility
- **Procedural Logic**: Pure functions in script files

---

## Core Architectural Patterns

### 1. Service Locator Pattern

**Purpose**: Centralize initialization of global registries, managers, and databases

**When to Use**:
- Game-wide state that persists across rooms (player data, item database, settings)
- Manager objects that coordinate systems (turn manager, input controller)
- Loading and caching JSON configurations

**Implementation**:
```gml
/// objController Create event (persistent object, runs once at game start)

// Initialize global registries
global.item_database = load_items_from_json("items.json");
global.actor_database = load_actors_from_json("actors.json");
global.ability_database = load_abilities_from_json("abilities.json");

// Initialize global settings
global.nsfw_enabled = false;
global.debug_mode = false;

// Create persistent managers
global.turn_manager = instance_create_depth(0, 0, 0, objTurnManager);
global.input_controller = instance_create_depth(0, 0, 0, objInputController);

// Initialize player data
global.player_data = {
    currency: { copper: 0, silver: 0, gold: 0 },
    inventory: ds_list_create(),
    quest_flags: ds_map_create()
};
```

**Usage**:
```gml
// Anywhere in the game
var _item = global.item_database[? "sword_iron"];
inventory_add_item(global.player_data.inventory, _item);
```

**Benefits**:
- Single source of truth for game-wide state
- Survives room transitions (persistent object)
- Easy to test (mock global state)
- Centralized error handling for data loading

---

### 1.1. Manager Constructors (Service Locator Implementation)

**Purpose**: Encapsulate global state and operations using lightweight constructor-based managers

**When to Use**:
- Managing complex state with multiple related operations (currency systems, resource pools, statistics)
- Centralizing business logic that operates on global data
- Providing clean APIs for common operations (add, subtract, validate, reset)
- Avoiding code duplication across multiple objects

**Why Constructors Over Objects**:
- Lightweight (no event overhead - no Step/Draw/Collision events)
- Auto-garbage collected (no manual cleanup unless using ds_* structures)
- Ideal for stateless/utility managers that don't need GameMaker events
- Faster instantiation than `instance_create_depth()`

**Implementation**:
```gml
/// scripts/scrResourceManager/scrResourceManager.gml

/// @description Manages player resources (gold, gems, tokens, etc.)
function ResourceManager() constructor {
    // Internal state (private-like)
    resources = {
        gold: 0,
        gems: 0,
        tokens: 0
    };

    /// @function get(resource_type)
    /// @param {String} resource_type - Type of resource ("gold", "gems", "tokens")
    /// @return {Real} Current amount of resource
    static get = function(_resource_type) {
        if (variable_struct_exists(resources, _resource_type)) {
            return resources[$ _resource_type];
        }
        return 0;
    }

    /// @function add(resource_type, amount)
    /// @param {String} resource_type - Type of resource
    /// @param {Real} amount - Amount to add
    static add = function(_resource_type, _amount) {
        if (variable_struct_exists(resources, _resource_type)) {
            resources[$ _resource_type] += _amount;
            return true;
        }
        return false;
    }

    /// @function subtract(resource_type, amount)
    /// @param {String} resource_type - Type of resource
    /// @param {Real} amount - Amount to subtract
    /// @return {Bool} True if successful, false if insufficient resources
    static subtract = function(_resource_type, _amount) {
        if (variable_struct_exists(resources, _resource_type)) {
            if (resources[$ _resource_type] >= _amount) {
                resources[$ _resource_type] -= _amount;
                return true;
            }
        }
        return false;
    }

    /// @function can_afford(cost_struct)
    /// @param {Struct} cost_struct - Struct with resource costs (e.g., {gold: 100, gems: 5})
    /// @return {Bool} True if player can afford the cost
    static can_afford = function(_cost_struct) {
        var _keys = variable_struct_get_names(_cost_struct);
        for (var _i = 0; _i < array_length(_keys); _i++) {
            var _resource_type = _keys[_i];
            var _required_amount = _cost_struct[$ _resource_type];

            if (!variable_struct_exists(resources, _resource_type)) {
                return false;
            }

            if (resources[$ _resource_type] < _required_amount) {
                return false;
            }
        }
        return true;
    }

    /// @function reset()
    /// @description Reset all resources to zero (useful for testing or new game)
    static reset = function() {
        resources.gold = 0;
        resources.gems = 0;
        resources.tokens = 0;
    }
}

/// scripts/scrStateManager/scrStateManager.gml

/// @description Manages game state tracking (counters, flags, statistics)
function StateManager() constructor {
    // Internal state
    state = {
        total_plays: 0,
        high_score: 0,
        unlocked_levels: 0,
        achievements_earned: 0
    };

    /// @function increment(stat_name, amount)
    /// @param {String} stat_name - Name of stat to increment
    /// @param {Real} amount - Amount to add (default 1)
    static increment = function(_stat_name, _amount = 1) {
        if (variable_struct_exists(state, _stat_name)) {
            state[$ _stat_name] += _amount;
        }
    }

    /// @function get(stat_name)
    /// @param {String} stat_name - Name of stat to retrieve
    /// @return {Real} Stat value
    static get = function(_stat_name) {
        if (variable_struct_exists(state, _stat_name)) {
            return state[$ _stat_name];
        }
        return 0;
    }

    /// @function set(stat_name, value)
    /// @param {String} stat_name - Name of stat to set
    /// @param {Real} value - New value
    static set = function(_stat_name, _value) {
        if (variable_struct_exists(state, _stat_name)) {
            state[$ _stat_name] = _value;
        }
    }

    /// @function reset()
    static reset = function() {
        state.total_plays = 0;
        state.high_score = 0;
        state.unlocked_levels = 0;
        state.achievements_earned = 0;
    }
}
```

**Instantiation in objController**:
```gml
/// objController Create event (persistent object, runs once at game start)

// Create manager constructors
global.resource_manager = new ResourceManager();
global.state_manager = new StateManager();

// Expose backwards compatibility references (CRITICAL: never reassign these!)
global.player_resources = global.resource_manager.resources;
global.game_state = global.state_manager.state;

show_debug_message("Manager constructors initialized");
```

**CRITICAL RULE: Reference Preservation**

When exposing manager structs as globals, **NEVER reassign the struct** - only mutate properties:

```gml
// ✅ CORRECT: Mutate properties (preserves reference to manager's internal struct)
global.player_resources.gold += 100;
global.player_resources.gems = 50;
global.game_state.total_plays++;

// ❌ WRONG: Reassign struct (breaks reference to manager's internal struct)
global.player_resources = { gold: 100, gems: 0, tokens: 0 };  // BREAKS ResourceManager!
global.game_state = { total_plays: 0, ... };  // BREAKS StateManager!
```

**Why This Matters**:
- `global.player_resources` is a **reference** to `global.resource_manager.resources`
- Reassigning it creates a new struct, breaking the connection to the manager
- Manager methods will operate on the old struct, not your new one
- Result: `global.resource_manager.add("gold", 10)` won't update `global.player_resources`

**Usage Examples**:

```gml
// Legacy approach (still works due to reference exposure)
global.player_resources.gold += 100;

// Preferred approach (uses manager methods with validation)
global.resource_manager.add("gold", 100);
global.resource_manager.subtract("gems", 5);

// Check affordability before purchase
if (global.resource_manager.can_afford({ gold: 500, gems: 10 })) {
    global.resource_manager.subtract("gold", 500);
    global.resource_manager.subtract("gems", 10);
    item_unlock_purchase();
}

// State tracking
global.state_manager.increment("total_plays");
global.state_manager.set("high_score", 9999);
var _unlocked = global.state_manager.get("unlocked_levels");
```

**Save/Load Integration**:

When saving/loading, use manager methods to preserve references:

```gml
/// Save system
var _save_data = {
    resources: {
        gold: global.resource_manager.get("gold"),
        gems: global.resource_manager.get("gems"),
        tokens: global.resource_manager.get("tokens")
    },
    state: {
        total_plays: global.state_manager.get("total_plays"),
        high_score: global.state_manager.get("high_score")
    }
};

/// Load system (CORRECT: reset then mutate properties)
global.resource_manager.reset();
global.resource_manager.resources.gold = _loaded_resources.gold;
global.resource_manager.resources.gems = _loaded_resources.gems;
global.resource_manager.resources.tokens = _loaded_resources.tokens;

global.state_manager.reset();
global.state_manager.state.total_plays = _loaded_state.total_plays;
global.state_manager.state.high_score = _loaded_state.high_score;

// ❌ WRONG: Reassigning breaks the reference
global.player_resources = _loaded_resources;  // DON'T DO THIS!
```

**Benefits**:
- ✅ **Encapsulation**: Operations (add, subtract, can_afford) in one place
- ✅ **Backwards Compatibility**: Existing code works via reference exposure
- ✅ **Clear API**: Manager methods document available operations
- ✅ **Easier Testing**: Can reset managers via `.reset()` methods
- ✅ **Type Safety**: Methods validate inputs (e.g., can_afford checks existence)
- ✅ **Performance**: No event overhead, no manual cleanup (unless using ds_*)

**When to Use Manager Constructors**:
- Managing currency/resource systems with multiple operations
- Tracking statistics with convenience methods
- Encapsulating complex state transitions
- Providing validation logic (can_afford, has_unlocked, etc.)

**When NOT to Use Manager Constructors**:
- Objects needing Step/Draw/Collision events (use Objects instead)
- Simple globals with no operations (e.g., `global.game_paused = false`)
- Temporary calculations (use local variables)

---

### 2. Command Pattern for Input

**Purpose**: Decouple input detection from game logic execution

**When to Use**:
- Centralized keyboard/mouse/gamepad handling
- Context-sensitive actions (same key, different actions based on target)
- Input remapping without changing game logic
- Preventing duplicate input handlers after room transitions

**Implementation**:
```gml
/// objInputController (persistent object)

// Step event - Detect input
if (keyboard_check_pressed(vk_space)) {
    execute_command("ACTION");
}

if (keyboard_check_pressed(ord("I"))) {
    execute_command("TOGGLE_INVENTORY");
}

if (keyboard_check_pressed(ord("F"))) {
    execute_command("READY_FIRE_TOGGLE");
}

// Execute registered handler for command
function execute_command(_command_id) {
    if (ds_map_exists(command_handlers, _command_id)) {
        var _handler = command_handlers[? _command_id];
        _handler(); // Call handler function
    }
}

// Registration system
function register_command_handler(_command_id, _handler_function) {
    command_handlers[? _command_id] = _handler_function;
}

function clear_all_handlers() {
    ds_map_clear(command_handlers);
}
```

**Usage** (in room creation code or objPlayer Create event):
```gml
/// Room creation code
global.input_controller.clear_all_handlers(); // CRITICAL: Prevent duplicates

// Register handlers
global.input_controller.register_command_handler("ACTION", function() {
    objPlayer.execute_action(); // Context-sensitive action
});

global.input_controller.register_command_handler("TOGGLE_INVENTORY", function() {
    window_toggle("inventory");
});

global.input_controller.register_command_handler("READY_FIRE_TOGGLE", function() {
    objPlayer.ready_fire = !objPlayer.ready_fire;
});
```

**Benefits**:
- Input remapping in one place (objInputController)
- No duplicate input checks across objects
- Easy to add new commands without changing existing code
- Context-dependent behavior (different handlers per room/mode)

---

### 3. Event-Driven Flow (Step = Logic, Draw = View)

**Purpose**: Separate game logic from rendering using GameMaker's event system

**Rules**:
- **Step events** MUST contain game logic (state updates, AI, physics, input processing)
- **Draw events** MUST contain rendering only (sprite drawing, UI, effects)
- **NO game logic in Draw events** (violates separation of concerns, causes bugs)
- **NO rendering in Step events** (causes visual glitches, order-of-operations issues)

**Implementation**:
```gml
/// objPlayer Step event (LOGIC ONLY)
if (keyboard_check(vk_right)) {
    x += move_speed; // State update
}

if (keyboard_check_pressed(vk_space)) {
    var _target = instance_nearest(x, y, objEnemy);
    if (_target != noone && point_distance(x, y, _target.x, _target.y) <= 32) {
        var _damage = combat_calculate_damage(attack, _target.defense, _target.health);
        combat_apply_damage(_target, _damage); // Game logic
        last_damage_dealt = _damage; // Store for display
    }
}

/// objPlayer Draw event (RENDERING ONLY)
draw_sprite(sprite_index, image_index, x, y);

// Draw health bar
var _bar_width = 32;
var _bar_height = 4;
var _health_percent = health / max_health;
draw_rectangle_color(x - 16, y - 24, x - 16 + _bar_width, y - 24 + _bar_height, c_red, c_red, c_red, c_red, false);
draw_rectangle_color(x - 16, y - 24, x - 16 + _bar_width * _health_percent, y - 24 + _bar_height, c_green, c_green, c_green, c_green, false);

/// objPlayer Draw GUI event (UI RENDERING ONLY)
if (last_damage_dealt > 0) {
    draw_text(100, 100, "Damage: " + string(last_damage_dealt));
}
```

**Why This Matters**:
- GameMaker guarantees Step runs BEFORE Draw every frame
- Drawing in Step event may execute before other objects' Step events (visual desync)
- Logic in Draw event runs after physics/collision (late by 1 frame)
- Separation makes debugging easier ("rendering bug" vs "logic bug")

---

### 4. Procedural Logic (Pure Functions in Scripts)

**Purpose**: Centralize reusable calculations and business logic in pure functions

**When to Use**:
- Combat calculations used by player, enemies, and abilities
- Inventory management functions called from multiple objects
- Stat calculations (XP, leveling, damage formulas)
- Utility functions (array search, string formatting, math helpers)

**Implementation**:
```gml
/// scripts/scrCombat/scrCombat.gml

/// @function combat_calculate_damage(attacker_attack, defender_defense, defender_health)
/// @param {Real} attacker_attack - Attacker's attack stat
/// @param {Real} defender_defense - Defender's defense stat
/// @param {Real} defender_health - Defender's current health
/// @return {Real} Final damage value
function combat_calculate_damage(_attacker_attack, _defender_defense, _defender_health) {
    // Ratio-based damage formula
    var _base_damage = power(_attacker_attack, 1.1) / (power(_defender_defense, 0.9) + 1);

    // Percentage-based damage component
    var _percent_damage = (_defender_health * 0.02) * (_attacker_attack / max(1, _defender_defense));

    // Hybrid formula (50% base, 50% percent)
    var _damage = _base_damage * 0.5 + _percent_damage * 0.5;

    // Apply variance (±15%)
    _damage *= random_range(0.85, 1.15);

    return _damage;
}

/// @function combat_apply_damage(target, damage)
/// @param {Id.Instance} target - Target instance
/// @param {Real} damage - Damage amount
function combat_apply_damage(_target, _damage) {
    if (!instance_exists(_target)) return;

    // Universal damage application (works for player and enemies)
    if (variable_instance_exists(_target, "health")) {
        _target.health -= _damage;

        if (_target.health <= 0) {
            instance_destroy(_target);
        }
    }
}
```

**Usage**:
```gml
/// objPlayer Step event
if (keyboard_check_pressed(vk_space)) {
    var _target = instance_nearest(x, y, objEnemy);
    var _damage = combat_calculate_damage(attack, _target.defense, _target.health);
    combat_apply_damage(_target, _damage);
}

/// objEnemy AI Step event
if (alarm[0] <= 0) {
    var _damage = combat_calculate_damage(attack, objPlayer.defense, objPlayer.health);
    combat_apply_damage(objPlayer, _damage);
    alarm[0] = attack_cooldown;
}
```

**Benefits**:
- DRY principle (Don't Repeat Yourself)
- Consistent behavior across all callers
- Easy to test (no dependencies on game state)
- Single source of truth for formulas

---

### 5. Data-Driven Design (JSON Configs)

**Purpose**: Extend gameplay without code changes (Open/Closed Principle)

**When to Use**:
- Item definitions (weapons, armor, consumables)
- Enemy/NPC templates (stats, AI behavior, loot tables)
- Ability/skill definitions (effects, cooldowns, costs)
- Dungeon generation parameters (room sizes, spawn rates)

**Implementation**:
```json
// datafiles/items.json
{
  "sword_iron": {
    "name": "Iron Sword",
    "type": "weapon",
    "subtype": "melee",
    "equip_slot": 0,
    "weapon_damage": 10,
    "weapon_range": 1,
    "value_copper": 500,
    "sprite": "sprSwordIron",
    "description": "A sturdy iron blade."
  },
  "potion_health": {
    "name": "Health Potion",
    "type": "consumable",
    "restore_health": 50,
    "value_copper": 25,
    "sprite": "sprPotionRed",
    "description": "Restores 50 HP."
  }
}
```

```gml
/// objController Create event (load once at game start)
global.item_database = load_items_from_json("items.json");

/// Anywhere in game
var _item = global.item_database[? "sword_iron"];
show_debug_message(_item.name); // "Iron Sword"
show_debug_message(_item.weapon_damage); // 10
```

**Benefits**:
- Add new items/enemies/abilities without modifying code
- Designers can balance stats without programmer involvement
- Easy to mod (players can edit JSON files)
- Version control friendly (JSON diffs are readable)

---

## SOLID Principles in GML

### Single Responsibility Principle (SRP)

**Rule**: Each Object/Script/Constructor MUST have ONE clear responsibility

**Good Example**:
```gml
// ✅ CORRECT: Separate responsibilities
// objPlayer: Player state and input
// objHUD: Player stats display
// scrCombat: Combat calculations
// scrSaveLoad: Persistence logic
```

**Bad Example**:
```gml
// ❌ WRONG: objPlayer doing everything
/// objPlayer Step event
// Movement
// Combat calculations
// UI rendering
// Save game logic
// All mixed together!
```

**Validation**:
- Can you describe the Object/Script's purpose in one sentence without "and"?
- If feature X changes, do you need to modify this file?

---

### Open/Closed Principle (OCP)

**Rule**: Open for extension, closed for modification

**Good Example**:
```gml
// ✅ CORRECT: Extended via inheritance
// objEnemy (parent): Base enemy AI
// objEnemyMelee (child): Melee attack behavior
// objEnemyRanged (child): Ranged attack behavior
// Adding new enemy type doesn't modify objEnemy

// ✅ CORRECT: Extended via data
// items.json defines new items without changing item system code
```

**Bad Example**:
```gml
// ❌ WRONG: Modifying objEnemy for each new enemy type
/// objEnemy Step event
if (enemy_type == "melee") {
    // Melee logic
} else if (enemy_type == "ranged") {
    // Ranged logic
} else if (enemy_type == "mage") {
    // Must edit objEnemy to add mage!
}
```

---

### Liskov Substitution Principle (LSP)

**Rule**: Child Objects MUST be substitutable for parent Objects

**Good Example**:
```gml
// ✅ CORRECT: Child honors parent contract
// objEnemy (parent): Has health, take_damage() function
// objEnemyBoss (child): Adds boss_phase, but still has health and take_damage()

function combat_deal_damage(_target, _damage) {
    if (object_is_ancestor(_target.object_index, objEnemy)) {
        enemy_take_damage(_target, _damage); // Works for ALL enemy types
    }
}
```

**Bad Example**:
```gml
// ❌ WRONG: Child breaks parent contract
// objEnemyGhost (child): Removes health, uses ghost_essence instead
// Now combat_deal_damage() breaks when hitting ghosts!
```

---

### Interface Segregation Principle (ISP)

**Rule**: Don't force Objects to depend on properties they don't use

**Good Example**:
```gml
// ✅ CORRECT: Check only needed properties
function item_can_be_equipped(_item) {
    return variable_struct_exists(_item, "equip_slot") && _item.equip_slot >= 0;
}

function weapon_calculate_damage(_weapon) {
    if (variable_struct_exists(_weapon, "weapon_damage")) {
        return _weapon.weapon_damage;
    }
    return 0;
}
```

**Bad Example**:
```gml
// ❌ WRONG: Forcing all items to have weapon properties
// ItemDefinition constructor requires weapon_damage for ALL items
// Now potions have meaningless weapon_damage: 0
```

---

### Dependency Inversion Principle (DIP)

**Rule**: Depend on abstractions, not concrete implementations

**Good Example**:
```gml
// ✅ CORRECT: High-level depends on abstraction
function turn_manager_process_actor(_actor) {
    // Expects ANY actor with action_points variable
    if (variable_instance_exists(_actor, "action_points")) {
        if (_actor.action_points >= 100) {
            actor_execute_turn(_actor); // Works for player, enemies, NPCs
        }
    }
}
```

**Bad Example**:
```gml
// ❌ WRONG: Hardcoded dependency on specific Object
/// objTurnManager Step event
if (instance_exists(objPlayer)) {
    if (objPlayer.action_points >= 100) {
        objPlayer.execute_turn(); // ONLY works for objPlayer!
    }
}
// Can't add objNPC or objSummon without editing objTurnManager
```

---

## Additional Design Principles

### DRY (Don't Repeat Yourself)

**Rule**: Extract repeated logic into reusable functions

**Good Example**:
```gml
/// scripts/scrInventory/scrInventory.gml
function inventory_add_item(_inventory, _item) {
    if (ds_list_size(_inventory) < INVENTORY_MAX_SIZE) {
        ds_list_add(_inventory, _item);
        return true;
    }
    return false;
}

// Used by: objPlayer, objMerchant, objChest, objLootDrop
```

**Bad Example**:
```gml
// ❌ WRONG: Duplicated inventory logic in objPlayer, objMerchant, objChest
/// objPlayer Step event
if (ds_list_size(inventory) < 20) {
    ds_list_add(inventory, item);
}

/// objMerchant Step event
if (ds_list_size(inventory) < 20) { // Duplicated!
    ds_list_add(inventory, item);
}
```

---

### KISS (Keep It Simple, Stupid)

**Rule**: Avoid unnecessary complexity

**Function Complexity Guidelines**:
- Functions > 50 lines → break into smaller functions
- Nested conditionals > 3 levels → refactor
- Repeated logic (3+ lines, 2+ times) → extract

**Good Example**:
```gml
// ✅ CORRECT: Simple, focused function
function inventory_can_add_item(_item) {
    return ds_list_size(global.player_inventory) < INVENTORY_MAX_SIZE;
}
```

**Bad Example**:
```gml
// ❌ WRONG: Overly complex nested logic
function inventory_process_item(_item, _action, _slot, _equip, _consume) {
    if (_action == "add") {
        if (_equip) {
            if (_slot == EQUIP_WEAPON) {
                if (_item.weapon_type == "melee") {
                    // 20 more lines of nested logic...
                }
            }
        }
    }
    // Extract into: inventory_add_item(), inventory_equip_item(), inventory_consume_item()
}
```

---

### YAGNI (You Aren't Gonna Need It)

**Rule**: Don't implement features until actually needed

**Good Example**:
```gml
// ✅ CORRECT: Simple implementation for current needs
function combat_apply_damage(_target, _damage) {
    _target.health -= _damage;
    if (_target.health <= 0) {
        instance_destroy(_target);
    }
}
```

**Bad Example**:
```gml
// ❌ WRONG: Over-engineered for future features that don't exist yet
function combat_apply_damage(_target, _damage, _damage_type, _resist_type, _crit_chance, _lifesteal, _reflect) {
    // Implementing critical hits, lifesteal, damage reflection that aren't in the spec
}
```

---

## Performance Patterns

### 1. Hot Path Optimization

**Rule**: Step events run 60 times/second - optimize carefully

**Good Practices**:
- Inline small functions (<3 lines) in hot paths
- Cache calculations that don't change every frame
- Use alarms for periodic checks instead of frame-by-frame

**Example**:
```gml
/// objPlayer Create event
cached_sprite_width = sprite_get_width(sprite_index);
cached_collision_radius = 16;

/// objPlayer Step event
// ✅ CORRECT: Use cached value
var _half_width = cached_sprite_width / 2;

// ❌ WRONG: Recalculate every frame
var _half_width = sprite_get_width(sprite_index) / 2; // 60 lookups/second!
```

---

### 2. struct vs ds_map

**Rule**: Use struct for static data, ds_map for dynamic data

**When to Use struct**:
- Item definitions (loaded once, never modified)
- Actor templates (read-only reference data)
- Configuration data (settings, constants)

**When to Use ds_map**:
- Dynamic key insertion/deletion needed
- Key names determined at runtime
- Interfacing with legacy code that uses ds_map

**Performance**:
- struct: Faster access, auto-garbage-collected (GameMaker 2.3+)
- ds_map: Slower access, requires manual `ds_map_destroy()`

**Example**:
```gml
// ✅ CORRECT: struct for static item database
global.item_database = load_items_from_json("items.json"); // Returns struct
var _item = global.item_database.sword_iron; // Fast access

// ✅ CORRECT: ds_map for dynamic runtime data
global.active_quests = ds_map_create();
ds_map_add(global.active_quests, "quest_" + string(quest_id), quest_data);

// Remember to destroy in CleanUp event!
ds_map_destroy(global.active_quests);
```

---

### 3. Avoid Repeated Searches

**Rule**: Convert arrays to lookup maps for O(1) access

**Bad Example**:
```gml
// ❌ WRONG: Linear search every frame (O(n) per search)
/// objAI Step event
for (var _i = 0; _i < ds_list_size(enemies); _i++) {
    var _enemy = enemies[| _i];
    if (_enemy.actor_id == target_id) {
        // Found enemy - but this runs 60 times/second!
    }
}
```

**Good Example**:
```gml
// ✅ CORRECT: Use lookup map (O(1) per search)
/// objController Create event
global.enemy_lookup_map = ds_map_create();

/// When spawning enemy
var _enemy = instance_create_depth(x, y, 0, objEnemy);
_enemy.actor_id = "goblin_archer_1";
global.enemy_lookup_map[? _enemy.actor_id] = _enemy; // O(1) insert

/// objAI Step event
var _enemy = global.enemy_lookup_map[? target_id]; // O(1) lookup
if (instance_exists(_enemy)) {
    // Process enemy
}
```

---

## Anti-Patterns to Avoid

### 1. Global Variable Abuse

**Problem**: Overusing `global.*` for everything

**Why It's Bad**:
- Tight coupling (every file depends on global state)
- Hard to test (can't isolate systems)
- Namespace pollution (name conflicts)

**When to Use global**:
- Truly game-wide state (player data, item database, managers)
- Data that persists across rooms
- Configuration settings

**When NOT to Use global**:
- Temporary calculations
- Object-to-object communication (use function parameters instead)
- Local state (use instance variables)

---

### 2. Deep Object Hierarchies

**Problem**: Parent → Child → Grandchild → Great-Grandchild inheritance

**Why It's Bad**:
- Fragile (changes to parent break all descendants)
- Hard to understand (must read 4+ objects to understand behavior)
- Violates YAGNI (over-engineered)

**Better Approach**:
- Max 2 levels (Parent → Child)
- Use composition instead of inheritance when possible

**Example**:
```gml
// ✅ CORRECT: Flat hierarchy
// objEnemy (parent)
// ├── objEnemyMelee
// ├── objEnemyRanged
// └── objEnemyMage

// ❌ WRONG: Deep hierarchy
// objEntity
// └── objCreature
//     └── objEnemy
//         └── objEnemyMelee
//             └── objEnemyMeleeGoblin
//                 └── objEnemyMeleeGoblinArcher // Too deep!
```

---

### 3. Function Redefinition in Tick Events

**Problem**: Defining functions inside Step/Draw events

**Why It's Bad**:
- Function redefined 60 times/second (performance overhead)
- Confusing scope (function not available outside event)

**Good Example**:
```gml
// ✅ CORRECT: Function in Script file (defined once at load)
/// scripts/scrCurrency/scrCurrency.gml
function currency_calculate_value(_amount, _rate) {
    return _amount * _rate;
}

/// objCurrencyDrop Step event
if (!value_calculated) {
    value_copper = currency_calculate_value(amount, rate);
    value_calculated = true;
}

// ✅ ALSO ACCEPTABLE: Function defined once in Create event
/// objCurrencyDrop Create event
calculate_value = function() {
    return amount * rate;
};
```

**Bad Example**:
```gml
// ❌ WRONG: Function defined in Step event (runs 60 times/second!)
/// objCurrencyDrop Step event
if (!value_calculated) {
    function calculate_value() {  // WRONG: Redefined every frame
        return amount * rate;
    }
    value_copper = calculate_value();
    value_calculated = true;
}
```

---

## Summary Checklist

**Core Patterns**:
- [ ] Service Locator for global state (objController)
- [ ] Command Pattern for input (objInputController)
- [ ] Event-Driven Flow (Step = logic, Draw = rendering)
- [ ] Procedural Logic (pure functions in scripts)
- [ ] Data-Driven Design (JSON configs)

**SOLID Principles**:
- [ ] Single Responsibility (one purpose per Object/Script)
- [ ] Open/Closed (extend via inheritance/data, not modification)
- [ ] Liskov Substitution (children substitutable for parents)
- [ ] Interface Segregation (don't force unused properties)
- [ ] Dependency Inversion (depend on abstractions, not concrete Objects)

**Other Principles**:
- [ ] DRY (extract repeated logic to functions)
- [ ] KISS (avoid unnecessary complexity)
- [ ] YAGNI (don't implement speculative features)

**Performance**:
- [ ] Hot paths optimized (cache calculations, inline small functions)
- [ ] struct for static data, ds_map for dynamic data
- [ ] Lookup maps instead of repeated searches

**Anti-Patterns Avoided**:
- [ ] No global variable abuse
- [ ] No deep object hierarchies (max 2 levels)
- [ ] No function definitions in tick events

---

## Encapsulation Patterns

**Purpose**: Hide internal data and logic behind controlled interfaces, preventing direct state mutation and enabling modular code growth.

### Variable Scope Conventions

| Prefix/Scope | Example | Use Case | Notes |
|--------------|---------|----------|-------|
| `_` | `var _damage = 10;` | Local variable | REQUIRED for all local vars (prevents scope conflicts) |
| (none) | `entity_hp = 100;` | Instance variable | No prefix for custom instance vars |
| `global.` | `global.item_database` | Global variable | REQUIRED prefix for all globals |
| `__` | `__internal_cache = {};` | Pseudo-private member | Documentation convention - signals "internal use only" |

**Note**: GML has no `private` keyword. The `__` prefix is a **documentation convention** for readability, signaling internal-only members to other developers.

---

### Manager Constructor Pattern

**Purpose**: Encapsulate game-wide state and operations using lightweight constructor-based managers.

**When to Use**:
- Managing game-wide state (currency, inventory, statistics)
- Does NOT need Step/Draw/Collision events
- Requires encapsulation (internal state + public API)
- Needs backwards compatibility with existing code
- Benefits from testability (can instantiate multiple for testing)

**Example: Generic Data Manager**

```gml
/// @description Data Manager - Encapsulates game-wide data operations
function DataManager() constructor {
    // Pseudo-private members (internal use only - __ prefix)
    __cache = {};
    __last_update_time = 0;
    __conversion_factor = 1.5;

    // Public state (exposed if needed for backwards compatibility)
    entity_data = { count: 0, total: 0, active: true };

    // Public API - Query methods (no side effects)
    static get = function(_key) {
        if (variable_struct_exists(entity_data, _key)) {
            return entity_data[$ _key];
        }
        return 0; // Safe default
    }

    static get_total = function() {
        return entity_data.total;
    }

    // Public API - Command methods (mutate state)
    static add = function(_key, _amount) {
        entity_data[$ _key] += _amount;
        __rebuild_cache(); // Internal helper
        return entity_data[$ _key];
    }

    static set = function(_key, _value) {
        if (__validate_input(_value)) {
            entity_data[$ _key] = _value;
            __rebuild_cache();
        }
    }

    static reset = function() {
        entity_data = { count: 0, total: 0, active: true };
        __cache = {};
    }

    // Internal helpers (not part of public API - __ prefix)
    static __rebuild_cache = function() {
        __cache.average = entity_data.total / max(1, entity_data.count);
        __last_update_time = current_time;
    }

    static __validate_input = function(_value) {
        return is_real(_value) && _value >= 0;
    }
}
```

**Usage**:

```gml
// objController/Create_0.gml - Initialize manager
global.data_manager = new DataManager();

// Anywhere in game - Use manager methods
global.data_manager.add("total", 10);
global.data_manager.set("count", 5);
var _total = global.data_manager.get("total");
```

---

### Reference Exposure Pattern

**Purpose**: Maintain backwards compatibility with existing code that accesses global state directly, while encapsulating state in managers.

**Problem**: Existing code uses `global.entity_data` directly. Migrating all code to use `global.data_manager.get()` is expensive.

**Solution**: Expose manager's internal struct as a global reference.

**Implementation**:

```gml
// objController/Create_0.gml
global.data_manager = new DataManager();
global.entity_data = global.data_manager.entity_data;  // Reference exposure!
```

**What this does**:
- `global.entity_data` is a **reference** to `global.data_manager.entity_data`
- Both point to the SAME struct in memory
- Mutating properties works: `global.entity_data.count += 1;`

**⚠️ CRITICAL RULE: Never Reassign Exposed References**

```gml
// ✅ CORRECT: Mutate properties (preserves reference)
global.entity_data.count += 1;
global.entity_data.total = 100;

// ✅ CORRECT: Use manager methods
global.data_manager.add("total", 10);

// ❌ WRONG: Reassign struct (breaks reference!)
global.entity_data = { count: 0, total: 0, active: true };
// Now global.entity_data is a NEW struct, disconnected from manager!

// ✅ CORRECT: Reset via manager method
global.data_manager.reset();
```

**Save/Load Integration**:

```gml
// ✅ CORRECT: Mutate properties, not reassign
function load_entity_data(_save_data) {
    global.entity_data.count = _save_data.entity.count;
    global.entity_data.total = _save_data.entity.total;
    global.entity_data.active = _save_data.entity.active;
}

// ❌ WRONG: Reassigns struct (breaks reference)
function load_entity_data(_save_data) {
    global.entity_data = _save_data.entity;  // BREAKS MANAGER!
}
```

---

### Public vs Internal API

**Naming Conventions**:

| Method Type | Naming Pattern | Example | Side Effects |
|-------------|----------------|---------|--------------|
| **Query** | `get_*()` or `is_*()` | `get_count()`, `is_active()` | ❌ No |
| **Command** | `add_*()`, `set_*()`, `update_*()` | `add_value(10)`, `set_status()` | ✅ Yes |
| **Utility** | `calculate_*()`, `convert_*()` | `calculate_average()` | ❌ No |
| **State** | `reset()`, `initialize()` | `reset()` | ✅ Yes |
| **Internal** | `__*()` | `__rebuild_cache()`, `__validate()` | N/A (private) |

**Example Separation**:

```gml
function StateManager() constructor {
    state = { active: false, value: 0 };

    // Public Query (no side effects)
    static is_active = function() {
        return state.active;
    }

    // Public Command (mutates state)
    static activate = function() {
        state.active = true;
        __log_state_change();  // Internal helper
    }

    // Internal helper (not documented in public API)
    static __log_state_change = function() {
        show_debug_message("State changed: " + string(state.active));
    }
}
```

---

### Performance Considerations

**Rule**: Avoid accessor overhead in hot loops (Step events running 60 times/second).

**Example**:

```gml
// ❌ WRONG: Accessor overhead in hot path (Step event)
for (var _i = 0; _i < entity_count; _i++) {
    var _value = global.data_manager.get("total");  // Function call every iteration!
    if (_value > threshold) {
        // Do something
    }
}

// ✅ CORRECT: Cache value outside loop
var _total = global.data_manager.get("total");  // Call once
for (var _i = 0; _i < entity_count; _i++) {
    if (_total > threshold) {
        // Do something
    }
}

// ✅ ALSO CORRECT: Direct access via reference exposure
for (var _i = 0; _i < entity_count; _i++) {
    if (global.entity_data.total > threshold) {  // No function call overhead
        // Do something
    }
}
```

**Hot Path Guidelines**:
- Cache manager method results before loops
- Use reference exposure for read-heavy hot paths
- Reserve manager methods for write operations (mutation with validation)
- Prefer pure functions (no closure captures) for math-heavy calculations

---

### Cleanup Responsibilities

**Rule**: Implement `cleanup()` method if manager uses GameMaker data structures (ds_* functions).

**What Needs Cleanup**:
- `ds_map_create()` → needs `ds_map_destroy()`
- `ds_list_create()` → needs `ds_list_destroy()`
- `ds_grid_create()` → needs `ds_grid_destroy()`
- `ds_priority_create()`, `ds_queue_create()`, `ds_stack_create()`

**What Doesn't Need Cleanup**:
- **Structs** - auto-garbage collected!
- Arrays - auto-garbage collected!
- Strings, numbers, booleans - primitives

**Example with Cleanup**:

```gml
/// @description Inventory Manager
function InventoryManager() constructor {
    // ds_list requires manual cleanup
    items = ds_list_create();
    equipped_slots = ds_map_create();

    static add_item = function(_item) {
        ds_list_add(items, _item);
    }

    static cleanup = function() {
        ds_list_destroy(items);
        ds_map_destroy(equipped_slots);
    }
}

// objController/CleanUp_0.gml
if (variable_global_exists("inventory_manager") && global.inventory_manager != undefined) {
    global.inventory_manager.cleanup();
}
```

---

### Encapsulation Checklist

When designing managers or encapsulating state:

- [ ] State stored inside struct members, not globals
- [ ] Use `__` prefix for internal-only members (readability)
- [ ] Public API uses accessor methods (get/set/add/subtract)
- [ ] Reference Preservation respected (never reassign exposed globals)
- [ ] Safe accessors use `struct[$ "property"] ?? default`
- [ ] Constructor fully initializes all state
- [ ] One responsibility per manager (SRP)
- [ ] Provide `cleanup()` for ds_* or persistent data
- [ ] Document public API with @description/@param/@return
- [ ] Validate in setters (reject invalid states early)
- [ ] **Performance**: Avoid accessor overhead in hot loops
- [ ] **Performance**: Prefer pure functions for hot paths

---

**See Also**:
- [GML Reference](GML_REFERENCE.md) - Language syntax and built-in functions
- [Common Pitfalls](COMMON_PITFALLS.md) - Frequent mistakes and solutions
- [Quick Reference](QUICK_REFERENCE.md) - Cheat sheet for common patterns
- [Advanced Topics](ADVANCED_TOPICS.md) - Shaders, networking, platform-specific features

# GameMaker Built-in Variables Reference

**Purpose**: Comprehensive list of GameMaker's reserved built-in variables to avoid naming conflicts in custom code.

**Official Reference**: https://manual.gamemaker.io/beta/en/GameMaker_Language/GML_Reference/Asset_Management/Instances/Instance_Variables/Instance_Variables.htm

**Last Updated**: 2025-10-29

---

## Table of Contents

1. [Overview](#overview)
2. [Position & Movement](#position--movement)
3. [Sprites & Drawing](#sprites--drawing)
4. [Object Properties](#object-properties)
5. [Paths](#paths)
6. [Timelines](#timelines)
7. [Physics](#physics)
8. [Audio](#audio)
9. [Deprecated Global Built-ins](#deprecated-global-built-ins)
10. [Safe Alternatives](#safe-alternatives)
11. [Validation Checklist](#validation-checklist)

---

## Overview

**What are Built-in Variables?**

GameMaker provides pre-defined variables that are automatically available on all instance objects. These variables are managed by the GameMaker engine and should **NOT** be used as custom variable names.

**Why This Matters:**

Using built-in variable names for custom variables can cause:
- Silent bugs (engine overwrites your values)
- Unexpected behavior (engine reads your value as configuration)
- Compatibility issues (future GameMaker versions may add new built-ins)
- Debugging nightmares (conflicts with engine expectations)

**Rule**: ❌ **NEVER use built-in variable names as custom instance variables**

---

## Position & Movement

**Category**: Instance position, movement, and velocity

### Core Position Variables

| Variable | Type | Description | Read-Only |
|----------|------|-------------|-----------|
| `x` | real | X position in room (pixels) | No |
| `y` | real | Y position in room (pixels) | No |
| `xstart` | real | Starting X position (set at instance creation) | Yes |
| `ystart` | real | Starting Y position (set at instance creation) | Yes |
| `xprevious` | real | X position in previous frame | Yes |
| `yprevious` | real | Y position in previous frame | Yes |

### Movement Variables

| Variable | Type | Description | Read-Only |
|----------|------|-------------|-----------|
| `speed` | real | Current movement speed (pixels per step) | No |
| `direction` | real | Current movement direction (0-360 degrees) | No |
| `hspeed` | real | Horizontal speed component | No |
| `vspeed` | real | Vertical speed component | No |
| `friction` | real | Friction applied to speed each step | No |
| `gravity` | real | Gravity strength applied to speed | No |
| `gravity_direction` | real | Direction of gravity force (0-360 degrees) | No |

**⚠️ Common Conflicts**:
- `x`, `y` - Use `grid_x`, `grid_y` or `tile_x`, `tile_y` for tile-based games
- `speed` - Use `move_speed`, `actual_speed`, or `movement_rate`
- `direction` - Use `facing_direction`, `move_angle`, or `heading`

---

## Sprites & Drawing

**Category**: Sprite rendering, animation, and visual effects

### Sprite Properties

| Variable | Type | Description | Read-Only |
|----------|------|-------------|-----------|
| `sprite_index` | asset | Currently displayed sprite asset | No |
| `sprite_width` | real | Width of current sprite (pixels) | Yes |
| `sprite_height` | real | Height of current sprite (pixels) | Yes |
| `sprite_xoffset` | real | Horizontal offset of sprite origin | Yes |
| `sprite_yoffset` | real | Vertical offset of sprite origin | Yes |

### Animation Variables

| Variable | Type | Description | Read-Only |
|----------|------|-------------|-----------|
| `image_index` | real | Current animation frame (0-based index) | No |
| `image_number` | integer | Total number of frames in sprite | Yes |
| `image_speed` | real | Animation speed (frames per game frame) | No |

### Visual Effects

| Variable | Type | Description | Read-Only |
|----------|------|-------------|-----------|
| `image_xscale` | real | Horizontal scale factor (1.0 = normal) | No |
| `image_yscale` | real | Vertical scale factor (1.0 = normal) | No |
| `image_angle` | real | Rotation angle (0-360 degrees) | No |
| `image_alpha` | real | Opacity (0.0 = transparent, 1.0 = opaque) | No |
| `image_blend` | color | Color tint applied to sprite | No |

**⚠️ Common Conflicts**:
- `image_index` - Use `animation_frame`, `sprite_frame`, or `current_frame`
- `image_speed` - Use `animation_speed` or `anim_rate`

---

## Object Properties

**Category**: Object identification, visibility, and instance management

### Identification

| Variable | Type | Description | Read-Only |
|----------|------|-------------|-----------|
| `object_index` | asset | Object type this instance belongs to | Yes |
| `id` | instance | Unique instance ID | Yes |
| `persistent` | boolean | Survives room transitions if true | No |

### Visibility & Rendering

| Variable | Type | Description | Read-Only |
|----------|------|-------------|-----------|
| `visible` | boolean | Whether instance is rendered (Draw events) | No |
| `solid` | boolean | Whether instance blocks movement (legacy, rarely used) | No |
| `depth` | real | Rendering depth (lower = drawn on top) | No |
| `layer` | layer_id | Layer this instance belongs to | No |

### Collision Mask

| Variable | Type | Description | Read-Only |
|----------|------|-------------|-----------|
| `mask_index` | asset | Sprite used for collision detection | No |
| `bbox_left` | real | Left edge of bounding box | Yes |
| `bbox_right` | real | Right edge of bounding box | Yes |
| `bbox_top` | real | Top edge of bounding box | Yes |
| `bbox_bottom` | real | Bottom edge of bounding box | Yes |

**⚠️ Common Conflicts**:
- `id` - Don't use as custom variable (use `entity_id`, `actor_id`, or `unique_id`)

---

## Paths

**Category**: Path following and movement along predefined trajectories

| Variable | Type | Description | Read-Only |
|----------|------|-------------|-----------|
| `path_index` | asset | Current path being followed | No |
| `path_position` | real | Position along path (0.0 to 1.0) | No |
| `path_positionprevious` | real | Previous position along path | Yes |
| `path_speed` | real | Speed of movement along path | No |
| `path_scale` | real | Scale factor for path coordinates | No |
| `path_orientation` | real | Rotation applied to path direction | No |
| `path_endaction` | constant | Action when path ends (stop, restart, etc.) | No |

**⚠️ Common Conflicts**:
- `path_*` variables - If not using path system, safe to use with different prefix (e.g., `pathfinding_*`)

---

## Timelines

**Category**: Timeline playback and position

| Variable | Type | Description | Read-Only |
|----------|------|-------------|-----------|
| `timeline_index` | asset | Current timeline asset | No |
| `timeline_position` | real | Current moment in timeline | No |
| `timeline_speed` | real | Playback speed multiplier | No |
| `timeline_running` | boolean | Whether timeline is actively playing | No |
| `timeline_loop` | boolean | Whether timeline loops when finished | No |

**⚠️ Common Conflicts**:
- `timeline_*` variables - If not using timeline system, safe to use with different prefix

---

## Physics

**Category**: Physics engine variables (when using Box2D physics)

**Pattern**: All physics variables start with `phy_` prefix

### Core Physics Properties

| Variable | Type | Description | Read-Only |
|----------|------|-------------|-----------|
| `phy_active` | boolean | Whether physics is enabled | No |
| `phy_position_x` | real | Physics body X position | Yes |
| `phy_position_y` | real | Physics body Y position | Yes |
| `phy_speed_x` | real | Horizontal velocity | No |
| `phy_speed_y` | real | Vertical velocity | No |
| `phy_rotation` | real | Physics body rotation (radians) | No |
| `phy_angular_velocity` | real | Rotational speed | No |
| `phy_mass` | real | Physics body mass | No |
| `phy_inertia` | real | Rotational inertia | Yes |
| `phy_fixed_rotation` | boolean | Prevents rotation if true | No |

### Collision & Forces

| Variable | Type | Description | Read-Only |
|----------|------|-------------|-----------|
| `phy_collision_points` | integer | Number of collision points in current frame | Yes |
| `phy_collision_x` | real | X position of collision | Yes |
| `phy_collision_y` | real | Y position of collision | Yes |
| `phy_linear_damping` | real | Linear velocity damping | No |
| `phy_angular_damping` | real | Angular velocity damping | No |

**Rule**: ❌ **NEVER use `phy_` prefix for custom variables** - Reserved for physics system

---

## Audio

**Category**: Audio system variables

**Pattern**: Audio variables often use `audio_` prefix or specific sound variable names

| Variable | Type | Description | Read-Only |
|----------|------|-------------|-----------|
| `audio_listener_orientation` | array | 3D audio listener direction | No |
| `audio_listener_position` | array | 3D audio listener position | No |
| `audio_listener_velocity` | array | 3D audio listener velocity | No |

**Note**: Most audio is controlled via functions, not instance variables. Safe to use `sound_*` prefix for custom audio state.

---

## Deprecated Global Built-ins

**Category**: Legacy global variables from old GameMaker versions (pre-Studio)

**Status**: Deprecated but still reserved - DO NOT USE

| Variable | Type | Description | Why Deprecated |
|----------|------|-------------|----------------|
| `health` | real | Player health (global) | Moved to instance-specific design |
| `lives` | real | Player lives (global) | Moved to instance-specific design |
| `score` | real | Player score (global) | Moved to instance-specific design |

**⚠️ CRITICAL**: These are the most common naming conflicts!

**Why They're Still Reserved**:
- May be used by legacy projects or tutorials
- GameMaker might reference them internally for backwards compatibility
- Using them can cause confusion with old documentation

---

## Safe Alternatives

### Common Variable Replacements

| ❌ Avoid | ✅ Use Instead | Reason |
|---------|---------------|--------|
| `health` | `hp`, `max_hp`, `entity_health` | Conflicts with deprecated global |
| `lives` | `life_count`, `remaining_lives`, `respawn_count` | Conflicts with deprecated global |
| `score` | `points`, `total_points`, `player_score` | Conflicts with deprecated global |
| `x` | `grid_x`, `tile_x`, `logical_x` | Built-in position (use for display only) |
| `y` | `grid_y`, `tile_y`, `logical_y` | Built-in position (use for display only) |
| `speed` | `move_speed`, `actual_speed`, `movement_rate` | Built-in movement |
| `direction` | `facing_direction`, `move_angle`, `heading` | Built-in movement |
| `image_index` | `animation_frame`, `sprite_frame` | Built-in sprite animation |
| `id` | `entity_id`, `actor_id`, `unique_id` | Built-in instance ID |
| `visible` | `is_visible`, `render_enabled` | Built-in visibility flag |

### Naming Pattern Guidelines

**For Tile-Based Games**:
- Use `grid_x`, `grid_y` for logical tile coordinates
- Use `x`, `y` for rendering position (synced from grid)

**For Health/Resources**:
- Pattern: `resource` and `max_resource` (matches GML convention)
- Examples: `hp` + `max_hp`, `mana` + `max_mana`, `stamina` + `max_stamina`

**For Movement**:
- Use descriptive prefixes: `move_*`, `actual_*`, `target_*`
- Examples: `move_speed`, `actual_velocity`, `target_position`

**For Animation**:
- Use `animation_*` or `anim_*` prefix
- Examples: `animation_frame`, `anim_speed`, `animation_state`

---

## Validation Checklist

Before adding new instance variables, check:

- [ ] Variable name not in "Position & Movement" list
- [ ] Variable name not in "Sprites & Drawing" list
- [ ] Variable name not in "Object Properties" list
- [ ] Variable name not in "Paths" list
- [ ] Variable name not in "Timelines" list
- [ ] Variable name does NOT start with `phy_` (physics reserved)
- [ ] Variable name not in "Deprecated Global Built-ins" list (`health`, `score`, `lives`)
- [ ] If using common name (x, y, speed), prefixed with descriptive word (`grid_x`, `move_speed`)
- [ ] Name follows project naming conventions (lowercase with underscores)
- [ ] Name is self-documenting (clear what it represents)

### Quick Validation Script

```gml
/// @description Check if variable name conflicts with built-ins
/// @param {string} _var_name Variable name to check
/// @return {boolean} Returns true if name is safe to use
function is_safe_variable_name(_var_name) {
    // List of dangerous variable names
    var _reserved = [
        "x", "y", "xstart", "ystart", "xprevious", "yprevious",
        "speed", "direction", "hspeed", "vspeed",
        "sprite_index", "image_index", "image_speed",
        "health", "lives", "score",  // Deprecated globals
        "id", "object_index", "visible", "depth", "layer"
    ];

    // Check if name is in reserved list
    for (var _i = 0; _i < array_length(_reserved); _i++) {
        if (_var_name == _reserved[_i]) {
            return false;
        }
    }

    // Check for physics prefix
    if (string_pos("phy_", _var_name) == 1) {
        return false;
    }

    return true;
}
```

---

## Additional Resources

**Official GameMaker Manual**:
- [Instance Variables](https://manual.gamemaker.io/beta/en/GameMaker_Language/GML_Reference/Asset_Management/Instances/Instance_Variables/Instance_Variables.htm) - Complete built-in variable list
- [Physics Variables](https://manual.gamemaker.io/monthly/en/GameMaker_Language/GML_Reference/Physics/Physics_Variables/Physics_Variables.htm) - All `phy_*` variables
- [Sprite Variables](https://manual.gamemaker.io/monthly/en/GameMaker_Language/GML_Reference/Asset_Management/Sprites/Sprite_Instance_Variables/Sprite_Instance_Variables.htm) - Sprite-specific built-ins

**Related References**:
- [ARCHITECTURE_PATTERNS.md](ARCHITECTURE_PATTERNS.md) - Encapsulation patterns to avoid variable conflicts
- [COMMON_PITFALLS.md](COMMON_PITFALLS.md) - Frequent mistakes with built-in variables

---

**Last Updated**: 2025-10-29

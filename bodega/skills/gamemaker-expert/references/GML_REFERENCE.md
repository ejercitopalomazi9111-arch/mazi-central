# GML Complete Function Reference

This comprehensive reference covers all major GML functions, organized by category with practical examples and usage notes.

**Official Documentation**: Always refer to the [Official GameMaker Manual](https://manual.gamemaker.io/) for the most current and complete information.

---

## Table of Contents

1. [Drawing Functions](#drawing-functions)
2. [Math Functions](#math-functions)
3. [String Functions](#string-functions)
4. [Instance Functions](#instance-functions)
5. [Room & Game Control](#room--game-control)
6. [Data Structures](#data-structures)
7. [File Handling](#file-handling)
8. [Collision & Movement](#collision--movement)
9. [Input Functions](#input-functions)
10. [Audio Functions](#audio-functions)
11. [Networking Functions](#networking-functions)
12. [Shader Functions](#shader-functions)
13. [Surface Functions](#surface-functions)
14. [Particle Functions](#particle-functions)
15. [Buffer Functions](#buffer-functions)
16. [Time & Date Functions](#time--date-functions)
17. [Common Code Patterns](#common-code-patterns)
18. [Struct vs Object Decision Tree](#struct-vs-object-decision-tree)

---

## Drawing Functions

### Basic Drawing

```gml
// Sprites
draw_sprite(sprite_index, image_index, x, y);
draw_sprite_ext(sprite, subimg, x, y, xscale, yscale, rot, color, alpha);
draw_sprite_part(sprite, subimg, left, top, width, height, x, y);
draw_sprite_stretched(sprite, subimg, x, y, width, height);

// Shapes
draw_rectangle(x1, y1, x2, y2, outline);
draw_rectangle_color(x1, y1, x2, y2, c1, c2, c3, c4, outline);
draw_circle(x, y, radius, outline);
draw_ellipse(x1, y1, x2, y2, outline);
draw_line(x1, y1, x2, y2);
draw_line_width(x1, y1, x2, y2, width);
draw_triangle(x1, y1, x2, y2, x3, y3, outline);
draw_roundrect(x1, y1, x2, y2, outline);

// Text
draw_text(x, y, string);
draw_text_ext(x, y, string, sep, width);
draw_text_transformed(x, y, string, xscale, yscale, angle);
draw_text_color(x, y, string, c1, c2, c3, c4, alpha);

// Text Settings
draw_set_font(font);
draw_set_color(color);
draw_set_alpha(alpha);
draw_set_halign(align); // fa_left, fa_center, fa_right
draw_set_valign(align); // fa_top, fa_middle, fa_bottom

// Text Measurement
string_width(string);
string_height(string);
string_width_ext(string, sep, width);
string_height_ext(string, sep, width);
```

### Drawing Settings

```gml
// Color & Alpha
draw_set_color(c_white);
draw_set_alpha(1.0);

// Blend Modes
draw_set_blend_mode(bm_normal);
draw_set_blend_mode_ext(src, dest);

// Common blend modes:
// bm_normal, bm_add, bm_subtract, bm_max, bm_zero
// bm_src_alpha, bm_inv_src_alpha, bm_dest_alpha, bm_inv_dest_alpha

// Blend mode examples
draw_set_blend_mode(bm_add);      // Additive blending (glow effects)
draw_set_blend_mode(bm_subtract); // Subtractive blending (shadows)

// Color Operations
make_color_rgb(red, green, blue);
make_color_hsv(hue, saturation, value);
color_get_red(color);
color_get_green(color);
color_get_blue(color);
color_get_hue(color);
color_get_saturation(color);
color_get_value(color);
merge_color(color1, color2, amount); // amount: 0-1

// Common Colors
c_white, c_black, c_gray, c_silver
c_red, c_green, c_blue
c_yellow, c_orange, c_purple, c_lime, c_aqua, c_fuchsia
c_maroon, c_navy, c_olive, c_teal
```

### Advanced Drawing

```gml
// Primitives
draw_primitive_begin(kind);
draw_vertex(x, y);
draw_vertex_color(x, y, color, alpha);
draw_primitive_end();

// Primitive kinds:
// pr_pointlist, pr_linelist, pr_linestrip
// pr_trianglelist, pr_trianglestrip, pr_trianglefan

// Textures on Primitives
draw_primitive_begin_texture(kind, texture);
draw_vertex_texture(x, y, xtex, ytex);
draw_vertex_texture_color(x, y, xtex, ytex, color, alpha);
draw_primitive_end();

// Getting Texture
var _tex = sprite_get_texture(sprite, subimg);

// GPU Settings
gpu_set_blendenable(enable);
gpu_set_ztestenable(enable);
gpu_set_zwriteenable(enable);
gpu_set_alphatestenable(enable);
gpu_set_alphatestref(ref);
gpu_set_cullmode(cullmode); // cull_noculling, cull_clockwise, cull_counterclockwise
```

---

## Math Functions

### Basic Math

```gml
// Arithmetic
abs(x);              // Absolute value
sign(x);             // Returns -1, 0, or 1
round(x);            // Round to nearest integer
floor(x);            // Round down
ceil(x);             // Round up
frac(x);             // Fractional part
sqrt(x);             // Square root
sqr(x);              // Square (x * x)
power(x, n);         // x^n
exp(x);              // e^x
ln(x);               // Natural log
log2(x);             // Base-2 log
log10(x);            // Base-10 log

// Trigonometry (angles in DEGREES)
sin(angle);
cos(angle);
tan(angle);
arcsin(x);
arccos(x);
arctan(x);
arctan2(y, x);       // Angle from origin to point (x,y)
degtorad(degrees);   // Convert to radians
radtodeg(radians);   // Convert to degrees

// Clamping & Interpolation
clamp(value, min, max);
lerp(a, b, amount);  // Linear interpolation: a + (b-a) * amount
min(val1, val2);
max(val1, val2);
median(val1, val2, val3);
mean(val1, val2, ...);

// Rounding to Increment
round(x / increment) * increment;  // Round to nearest increment
floor(x / increment) * increment;  // Round down to increment
ceil(x / increment) * increment;   // Round up to increment
```

### Random Functions

```gml
// Random Numbers
random(x);                    // 0 to x (exclusive)
random_range(min, max);       // min to max (exclusive)
irandom(x);                   // Integer 0 to x (inclusive)
irandom_range(min, max);      // Integer min to max (inclusive)
choose(val1, val2, ...);      // Random choice from arguments

// Random Seed (for reproducible randomness)
randomize();                  // Set random seed based on time
random_set_seed(seed);        // Set specific seed
random_get_seed();            // Get current seed

// Example: Reproducible random generation
random_set_seed(12345);
var _val1 = random(100);      // Always same value with seed 12345
var _val2 = random(100);      // Always same sequence
```

### Distance & Direction

```gml
// Distance
distance_to_point(x, y);
distance_to_object(obj);
point_distance(x1, y1, x2, y2);
point_distance_3d(x1, y1, z1, x2, y2, z2);

// Direction (returns angle in degrees, 0-360)
point_direction(x1, y1, x2, y2);
direction_difference(dir1, dir2);  // Smallest angle between directions

// Movement towards point
move_towards_point(x, y, speed);

// Angle calculations
angle_difference(angle1, angle2);  // Difference between angles
```

### Advanced Math

```gml
// Bitwise Operations
x | y;    // OR
x & y;    // AND
x ^ y;    // XOR
~x;       // NOT
x << n;   // Left shift
x >> n;   // Right shift

// Dot Product & Cross Product
dot_product(x1, y1, x2, y2);
dot_product_3d(x1, y1, z1, x2, y2, z2);

// Vector Length
point_distance(0, 0, x, y);  // 2D vector magnitude
point_distance_3d(0, 0, 0, x, y, z);  // 3D vector magnitude

// Normalize Vector
var _len = point_distance(0, 0, x, y);
var _norm_x = x / _len;
var _norm_y = y / _len;
```

---

## String Functions

### String Manipulation

```gml
// Concatenation
var _str = "Hello" + " " + "World";
var _str = string("Value: ") + string(123);

// Substrings
string_copy(str, index, count);      // Extract substring (1-indexed!)
string_char_at(str, index);          // Get character at index
string_delete(str, index, count);    // Remove characters
string_insert(substr, str, index);   // Insert substring

// Search
string_pos(substr, str);             // Find position (1-indexed, 0 = not found)
string_lastpos(substr, str);         // Find last occurrence
string_count(substr, str);           // Count occurrences

// Replace
string_replace(str, substr, newstr); // Replace first occurrence
string_replace_all(str, substr, newstr); // Replace all occurrences

// Case
string_upper(str);
string_lower(str);

// Trimming
string_trim(str);                    // Remove leading/trailing whitespace (GMS 2.3+)
string_trim_start(str);
string_trim_end(str);

// Length
string_length(str);

// Formatting
string_format(val, total_digits, decimal_places);
// Example: string_format(123.456, 8, 2) → "  123.46"
```

### String Conversion

```gml
// To String
string(value);
string_format(value, total, decimal);

// From String
real(str);              // String to number
int64(str);             // String to 64-bit integer

// Character Codes
ord(char);              // Character to ASCII code
chr(code);              // ASCII code to character

// Examples
var _key_code = ord("A");  // 65
var _char = chr(65);        // "A"
```

### String Building (Efficient)

```gml
// INEFFICIENT (creates new string each iteration)
var _str = "";
for (var i = 0; i < 1000; i++) {
    _str += "x";  // BAD: Very slow for large loops
}

// EFFICIENT (use array then join - GMS 2.3+)
var _parts = [];
for (var i = 0; i < 1000; i++) {
    array_push(_parts, "x");
}
var _str = string_join("", _parts);
```

---

## Instance Functions

### Instance Creation & Destruction

```gml
// Create Instance
instance_create_depth(x, y, depth, obj);
instance_create_layer(x, y, layer, obj);

// Create Instance with Initial Variables (before Create event)
instance_create_depth(x, y, depth, obj, {
    speed: 10,
    direction: 45,
    damage: 5
});

instance_create_layer(x, y, layer, obj, {
    target: objPlayer,
    patrol_speed: 2
});

// Example: Bullet initialization (cleaner than with/other)
var _bullet = instance_create_depth(x, y, -100, objBullet, {
    speed: shoot_speed,
    direction: image_angle,
    owner: id  // Who fired the bullet
});

// Note: Variables set BEFORE Create event runs (accessible immediately)

// Destroy
instance_destroy();
instance_destroy(id);
instance_destroy(obj);  // Destroy all instances of object

// Check Existence
instance_exists(obj);
instance_number(obj);   // Count instances

// Find Instances
instance_find(obj, n);  // Find nth instance (0-indexed)
instance_nearest(x, y, obj);
instance_furthest(x, y, obj);
instance_position(x, y, obj);  // Instance at exact position

// Get All Instances
var _list = ds_list_create();
instance_create_list(obj, _list);
// ... use list ...
ds_list_destroy(_list);
```

### Instance Variables

```gml
// Built-in Variables
id;              // Unique instance ID
object_index;    // Object type
x, y;            // Position
xprevious, yprevious;  // Previous frame position
xstart, ystart;  // Creation position
speed;           // Movement speed
direction;       // Movement direction (degrees)
hspeed, vspeed;  // Horizontal/vertical speed
friction;        // Speed reduction per step
gravity;         // Gravity acceleration
gravity_direction;  // Gravity direction
depth;           // Drawing depth (lower = front)
layer;           // Layer name/ID
visible;         // Is visible
persistent;      // Survives room change
solid;           // Collision solid flag
sprite_index;    // Current sprite
image_index;     // Current frame
image_speed;     // Animation speed (frames/step)
image_xscale, image_yscale;  // Sprite scale
image_angle;     // Sprite rotation
image_alpha;     // Sprite transparency (0-1)
image_blend;     // Sprite blend color
bbox_left, bbox_right, bbox_top, bbox_bottom;  // Bounding box

// Alarms
alarm[0] = 60;   // Trigger Alarm 0 event after 60 steps
// alarm[0] to alarm[11] available
```

### Variable Manipulation

```gml
// Check Variable Exists
variable_instance_exists(inst, name);
variable_struct_exists(struct, name);
variable_global_exists(name);

// Get/Set Variables
variable_instance_get(inst, name);
variable_instance_set(inst, name, value);
variable_struct_get(struct, name);
variable_struct_set(struct, name, value);

// Get Variable Names
variable_instance_get_names(inst);  // Returns array of variable names
variable_struct_get_names(struct);

// Examples
if (variable_instance_exists(other, "health")) {
    var _hp = variable_instance_get(other, "health");
}

var _names = variable_struct_get_names(my_struct);
for (var i = 0; i < array_length(_names); i++) {
    var _name = _names[i];
    var _value = variable_struct_get(my_struct, _name);
    show_debug_message(_name + " = " + string(_value));
}
```

### Dynamic Variable Access: Structs vs Instances

#### Overview

GameMaker provides different syntax for accessing properties dynamically depending on whether the target is a **struct** or an **instance**.

**When dynamic access matters**:
- Property names determined at runtime (user input, data-driven systems)
- Generic functions that operate on any property
- Reflection-based systems (save/load, serialization)
- Data-driven gameplay (stat systems, ability configurations)

#### Struct Accessor: `[$ property_name]`

**Syntax**: Use the nullish accessor `[$ key]` for structs.

```gml
// Creating a struct
var _data = {
    hp: 100,
    mana: 50,
    stamina: 75
};

// Dynamic read
var _property = "hp";
var _value = _data[$ _property];  // Returns 100

// Dynamic write
_data[$ _property] = 120;

// With nullish coalescing (provide default if undefined)
var _bonus = _data[$ "bonus_hp"] ?? 0;  // Returns 0 if bonus_hp doesn't exist

// Checking existence
if (variable_struct_exists(_data, "bonus_hp")) {
    show_debug_message("Bonus HP exists");
}
```

**Performance**: Direct hash table lookup (fast, O(1) average case).

#### Instance Accessor: `variable_instance_*()`

**Syntax**: Use the `variable_instance_*()` family of functions for instances.

**CRITICAL**: The `[$ key]` syntax **does NOT work on instances** - it will cause a compilation error.

```gml
// ❌ WRONG: Using [$ key] on instances
var _property = "hp";
obj[$ _property] = 100;  // ERROR: Assignment operator expected

// ✅ CORRECT: Using variable_instance_*() functions
variable_instance_set(obj, _property, 100);
```

**Available Functions**:

| Function | Purpose | Returns |
|----------|---------|---------|
| `variable_instance_get(instance, name)` | Read instance variable by name | Variable value |
| `variable_instance_set(instance, name, value)` | Write instance variable by name | N/A |
| `variable_instance_exists(instance, name)` | Check if variable exists | Boolean |
| `variable_instance_get_names(instance)` | Get all variable names | Array of strings |

**Example - Reading**:
```gml
var _obj = instance_create_depth(0, 0, 0, objPlayer);
_obj.hp = 100;
_obj.mana = 50;

var _property = "hp";
var _value = variable_instance_get(_obj, _property);  // Returns 100
```

**Example - Writing**:
```gml
var _property = "hp";
var _new_value = 150;
variable_instance_set(_obj, _property, _new_value);  // Sets hp to 150
```

**Example - Checking Existence**:
```gml
var _property = "bonus_hp";
if (variable_instance_exists(_obj, _property)) {
    var _value = variable_instance_get(_obj, _property);
}
```

**Example - Fallback Pattern** (nullish coalescing equivalent):
```gml
// Pattern: Use modified value if exists, otherwise use base value
var _property = "hp";
var _modified_var = "modified_" + _property;

// ✅ CORRECT: Ternary operator with existence check
var _value = variable_instance_exists(_obj, _modified_var)
    ? variable_instance_get(_obj, _modified_var)
    : variable_instance_get(_obj, _property);
```

**Performance**: String-based lookup with type checking (slower than struct access, O(n) worst case).

#### When to Use Which Approach

| Scenario | Use | Reason |
|----------|-----|--------|
| **Temporary data storage** | Struct `[$ key]` | Faster, cleaner syntax |
| **Dynamic configuration** | Struct `[$ key]` | Natural for JSON-like data |
| **Modifying instance properties** | `variable_instance_*()` | Only option for instances |
| **Generic utility functions** | Both (type-check first) | Use `typeof()` to determine type |
| **Hot path code** (Step events) | Neither | Use direct property access (`obj.hp`) |

#### Decision Tree

```gml
// Generic function that works with both structs and instances
function get_property(_target, _property_name) {
    if (is_struct(_target)) {
        // Use struct accessor (faster)
        return _target[$ _property_name] ?? undefined;
    } else {
        // Assume instance, use variable_instance_get
        if (variable_instance_exists(_target, _property_name)) {
            return variable_instance_get(_target, _property_name);
        }
        return undefined;
    }
}

// Usage:
var _struct_value = get_property({hp: 100}, "hp");        // Returns 100 (struct path)
var _instance_value = get_property(objPlayer, "hp");      // Returns player HP (instance path)
```

#### Performance Comparison

```gml
// Benchmark: 10,000 iterations

// FASTEST: Direct property access (baseline)
obj.hp = 100;  // ~0.1ms

// FAST: Struct dynamic access
_data[$ "hp"] = 100;  // ~0.3ms (3x slower than direct)

// SLOW: Instance dynamic access
variable_instance_set(obj, "hp", 100);  // ~1.2ms (12x slower than direct)
```

**Hot Path Rule**: In performance-critical code (Step event loops running at 60 FPS, collision detection), **always use direct property access**:

```gml
// ✅ BEST for Step event (60 FPS)
hp -= damage;

// ⚠️ AVOID in hot paths
variable_instance_set(self, "hp", variable_instance_get(self, "hp") - damage);
```

#### Common Mistakes

**Mistake 1: Using `[$ key]` on instances**
```gml
// ❌ WRONG
obj[$ "hp"] = 150;  // Compilation error

// ✅ CORRECT
variable_instance_set(obj, "hp", 150);
```

**Mistake 2: Using `??` operator with instances**
```gml
// ❌ WRONG
var _value = obj[$ "modified_hp"] ?? obj[$ "hp"];  // Syntax error

// ✅ CORRECT
var _value = variable_instance_exists(obj, "modified_hp")
    ? variable_instance_get(obj, "modified_hp")
    : variable_instance_get(obj, "hp");
```

**Mistake 3: Using `variable_instance_*()` on structs**
```gml
// ⚠️ WORKS but verbose and slower
variable_instance_get(_config, "hp");

// ✅ BETTER: Use struct accessor
_config[$ "hp"];
```

#### Reference

- **Official Manual - Accessors**: https://manual.gamemaker.io/monthly/en/GameMaker_Language/GML_Overview/Accessors.htm
- **Official Manual - variable_instance_get()**: https://manual.gamemaker.io/monthly/en/GameMaker_Language/GML_Reference/Variable_Functions/variable_instance_get.htm
- **Official Manual - variable_instance_set()**: https://manual.gamemaker.io/monthly/en/GameMaker_Language/GML_Reference/Variable_Functions/variable_instance_set.htm
- **Official Manual - variable_instance_exists()**: https://manual.gamemaker.io/monthly/en/GameMaker_Language/GML_Reference/Variable_Functions/variable_instance_exists.htm
- **Official Manual - variable_struct_exists()**: https://manual.gamemaker.io/monthly/en/GameMaker_Language/GML_Reference/Variable_Functions/variable_struct_exists.htm

### With Statement

```gml
// Execute code in context of other instances
with (obj) {
    // 'self' refers to each instance of obj
    health -= 10;
}

with (instance_nearest(x, y, objEnemy)) {
    instance_destroy();
}

with (all) {
    // Run for ALL instances
    x += 1;
}

// Use 'other' to refer to calling instance
with (objEnemy) {
    // 'self' = objEnemy instance
    // 'other' = calling instance
    var _dir = point_direction(x, y, other.x, other.y);
}
```

---

### Instance Keywords (self, other, all, noone)

#### self
- Refers to the current instance executing the code
- Always available in all contexts
- Example: `self.hp -= 10;`

#### other
**Two distinct behaviors:**

1. **Collision Events ONLY**: Refers to the colliding instance
2. **Scope-changing contexts**: Refers to previous scope before self changed

**Collision Event Usage:**
```gml
// objPlayer Collision with objBullet
var _damage = other.damage;  // other = objBullet instance
hp -= _damage;
instance_destroy(other);  // Destroy the bullet
```

**with() Block Usage:**
```gml
// objPlayer executing with()
with (objEnemy) {
    // self = each objEnemy
    // other = objPlayer (calling instance)
    var _dir = point_direction(x, y, other.x, other.y);
}
```

**⚠️ CRITICAL: Bound Method Gotcha**

In bound methods (callbacks), `other` does NOT automatically refer to the instance that created the method. Use instance ID capture with defensive checks:

```gml
// ❌ WRONG: other doesn't work reliably in callbacks
on_click: method({key: _key}, function() {
    other.stat_points_remaining--;  // ERROR: other is wrong scope!
})

// ⚠️ PROBLEMATIC: self can become invalid if instance recreated
on_click: method({key: _key, ui: self}, function() {
    ui.stat_points_remaining--;  // Can fail if ui instance destroyed/recreated
})

// ✅ CORRECT: Use instance ID with defensive check
on_click: method({key: _key, ui_id: id}, function() {
    if (!instance_exists(ui_id)) {
        show_debug_message("WARNING: Instance destroyed");
        return;
    }

    var _ui = ui_id;
    _ui.stat_points_remaining--;  // Safe: id is stable numeric reference
})
```

**Why `id` is better than `self` for callbacks:**
- Instance ID (`id`) is a stable numeric reference that doesn't change with context
- `self` changes based on execution scope (can become invalid)
- `instance_exists()` provides defensive guard against destroyed instances
- More explicit about instance ownership

**When other changes:**
- Inside `with()` blocks: other = calling instance/struct
- Bound method calls: other = instance that invoked the method
- Unbound constructors: other = calling scope
- Struct declarations: other = self (initializing scope)

**Reference**: https://manual.gamemaker.io/monthly/en/GameMaker_Language/GML_Overview/Instance%20Keywords/other.htm

#### all
- Refers to ALL instances in the room
- Example: `with (all) { x += 1; }`

#### noone
- Represents "no instance" (equivalent to -4)
- Used for comparisons: `if (target == noone) { ... }`

---

## Room & Game Control

### Room Functions

```gml
// Room Transitions
room_goto(room);
room_goto_next();
room_goto_previous();
room_restart();

// Room Information
room;                 // Current room
room_first;
room_last;
room_width;
room_height;
room_speed;           // Target FPS
room_persistent;      // Room keeps instances on exit

// Game Control
game_end();
game_restart();
game_save(filename);
game_load(filename);
```

### Layer Functions

```gml
// Get Layer
layer_get_id(layer_name);
layer_exists(layer_name);

// Layer Properties
layer_x(layer, x);
layer_y(layer, y);
layer_get_x(layer);
layer_get_y(layer);
layer_hspeed(layer, hspeed);
layer_vspeed(layer, vspeed);

// Layer Depth
layer_depth(layer, depth);
layer_get_depth(layer);

// Layer Visibility
layer_set_visible(layer, visible);
layer_get_visible(layer);

// Instances on Layer
layer_add_instance(layer, inst);
layer_has_instance(layer, inst);
instance_create_layer(x, y, layer, obj);

// Background Layers
var _bg = layer_background_get_id(layer);
layer_background_sprite(_bg, sprite);
layer_background_htiled(_bg, tiled);
layer_background_vtiled(_bg, tiled);
layer_background_xscale(_bg, xscale);
layer_background_yscale(_bg, yscale);
layer_background_speed(_bg, speed);
layer_background_blend(_bg, color);
layer_background_alpha(_bg, alpha);
```

### Timing

```gml
// Delta Time (for frame-independent movement)
delta_time;           // Microseconds since last frame
var _dt = delta_time / 1000000;  // Convert to seconds
x += _speed * _dt;    // Frame-independent movement

// FPS
fps;                  // Current FPS
fps_real;             // Real FPS (not capped)
room_speed;           // Target FPS

// Game Time
current_time;         // Milliseconds since game start
current_year, current_month, current_day;
current_hour, current_minute, current_second;
```

---

## Data Structures

### Arrays (Built-in, GMS 2.3+)

```gml
// Create Array
var _arr = [];
var _arr = [1, 2, 3, 4, 5];
var _arr = array_create(10, 0);  // 10 elements, all 0

// Access
_arr[0] = 100;
var _val = _arr[0];

// Length
array_length(_arr);

// Add Elements
array_push(_arr, value);         // Add to end
array_insert(_arr, index, value); // Insert at index

// Remove Elements
array_pop(_arr);                 // Remove from end, return value
array_delete(_arr, index, count); // Delete count elements at index

// Search
array_contains(_arr, value);     // Returns true/false (GMS 2.3.1+)
array_get_index(_arr, value);    // Returns index or -1

// Sort
array_sort(_arr, ascending);     // true = ascending, false = descending

// Copy
var _copy = array_create(array_length(_arr));
array_copy(_copy, 0, _arr, 0, array_length(_arr));

// 2D Arrays
var _grid = array_create(width);
for (var i = 0; i < width; i++) {
    _grid[i] = array_create(height, 0);
}
_grid[x][y] = value;
```

### DS Lists (Dynamic Arrays)

```gml
// Create
var _list = ds_list_create();

// Add Elements
ds_list_add(_list, val1, val2, ...);
ds_list_insert(_list, index, value);

// Access
var _val = _list[| index];  // OR: ds_list_find_value(_list, index)
_list[| index] = value;     // OR: ds_list_replace(_list, index, value)

// Remove
ds_list_delete(_list, index);
ds_list_clear(_list);

// Size
ds_list_size(_list);
ds_list_empty(_list);

// Search
ds_list_find_index(_list, value);  // Returns index or -1

// Sort
ds_list_sort(_list, ascending);

// Copy
var _copy = ds_list_create();
ds_list_copy(_copy, _list);

// Shuffle
ds_list_shuffle(_list);

// CRITICAL: Always destroy when done!
ds_list_destroy(_list);
```

### DS Maps (Key-Value Pairs)

```gml
// Create
var _map = ds_map_create();

// Set Values
_map[? "key"] = value;              // OR: ds_map_add(_map, "key", value)
ds_map_set(_map, "key", value);     // Overwrite if exists

// Get Values
var _val = _map[? "key"];           // OR: ds_map_find_value(_map, "key")

// Check Existence
ds_map_exists(_map, "key");

// Remove
ds_map_delete(_map, "key");
ds_map_clear(_map);

// Size
ds_map_size(_map);
ds_map_empty(_map);

// Iterate Keys
var _key = ds_map_find_first(_map);
while (!is_undefined(_key)) {
    var _val = _map[? _key];
    show_debug_message(string(_key) + " = " + string(_val));
    _key = ds_map_find_next(_map, _key);
}

// Copy
var _copy = ds_map_create();
ds_map_copy(_copy, _map);

// CRITICAL: Always destroy when done!
ds_map_destroy(_map);
```

### DS Grids (2D Arrays)

```gml
// Create
var _grid = ds_grid_create(width, height);

// Set Values
ds_grid_set(_grid, x, y, value);
ds_grid_set_region(_grid, x1, y1, x2, y2, value);

// Get Values
var _val = ds_grid_get(_grid, x, y);

// Size
ds_grid_width(_grid);
ds_grid_height(_grid);
ds_grid_resize(_grid, width, height);

// Clear
ds_grid_clear(_grid, value);

// Math Operations
ds_grid_add(_grid, x, y, amount);
ds_grid_multiply(_grid, x, y, amount);
ds_grid_add_region(_grid, x1, y1, x2, y2, amount);
ds_grid_multiply_region(_grid, x1, y1, x2, y2, amount);

// Search
ds_grid_value_exists(_grid, x1, y1, x2, y2, value);
ds_grid_value_x(_grid, x1, y1, x2, y2, value);  // X of first match
ds_grid_value_y(_grid, x1, y1, x2, y2, value);  // Y of first match

// Sort
ds_grid_sort(_grid, column, ascending);

// CRITICAL: Always destroy when done!
ds_grid_destroy(_grid);
```

### Structs (GMS 2.3+)

```gml
// Create Struct (Lightweight Data Container)
var _player_data = {
    name: "Hero",
    level: 1,
    health: 100,
    max_health: 100,
    inventory: []
};

// Access
_player_data.name = "Warrior";
var _hp = _player_data.health;

// Dynamic Access
var _key = "level";
var _val = _player_data[$ _key];  // Access by variable

// Add Properties
_player_data.mana = 50;

// Check Property Exists
variable_struct_exists(_player_data, "mana");

// Remove Property
variable_struct_remove(_player_data, "mana");

// Get All Property Names
var _names = variable_struct_get_names(_player_data);

// Struct Constructor (Reusable Template)
function Player(_name) constructor {
    name = _name;
    level = 1;
    health = 100;
    max_health = 100;

    // Methods
    static take_damage = function(_amount) {
        health -= _amount;
        if (health <= 0) {
            health = 0;
            die();
        }
    }

    static die = function() {
        show_debug_message(name + " has died!");
    }
}

// Create Instance
var _hero = new Player("Hero");
_hero.take_damage(50);
```

---

## File Handling

### File System Paths

```gml
// Working Directory (save location)
working_directory;    // Returns path string

// Common file locations:
// Windows: C:\Users\<username>\AppData\Local\<game_name>\
// macOS: ~/Library/Application Support/<game_name>/
// Linux: ~/.config/<game_name>/

// Program Directory (game executable)
program_directory;

// Temporary Directory
temp_directory;

// Game Directory (where game.win is)
game_save_id;         // Unique save folder name
```

### File Operations

```gml
// Check File Exists
file_exists(filename);

// Delete File
file_delete(filename);

// Rename/Move File
file_rename(oldname, newname);

// Copy File
file_copy(source, dest);

// File Attributes
file_attributes(filename);  // Returns fa_* constants

// Directory Operations
directory_exists(path);
directory_create(path);
directory_destroy(path);  // Delete empty directory
```

### Text Files

```gml
// Open File
var _file = file_text_open_read(filename);
var _file = file_text_open_write(filename);    // Overwrite
var _file = file_text_open_append(filename);   // Append

// Read
var _line = file_text_read_string(_file);
file_text_readln(_file);  // Move to next line
var _eof = file_text_eof(_file);  // Check end of file

// Write
file_text_write_string(_file, str);
file_text_writeln(_file);  // Write newline

// Close (CRITICAL!)
file_text_close(_file);

// Example: Read entire file
if (file_exists("data.txt")) {
    var _file = file_text_open_read("data.txt");
    var _content = "";
    while (!file_text_eof(_file)) {
        _content += file_text_read_string(_file);
        file_text_readln(_file);
    }
    file_text_close(_file);
}
```

### JSON Files

```gml
// Save to JSON
var _data = {
    player_name: "Hero",
    player_level: 10,
    inventory: ["sword", "shield", "potion"]
};

var _json = json_stringify(_data);
var _file = file_text_open_write("save.json");
file_text_write_string(_file, _json);
file_text_close(_file);

// Load from JSON
if (file_exists("save.json")) {
    var _file = file_text_open_read("save.json");
    var _json = "";
    while (!file_text_eof(_file)) {
        _json += file_text_read_string(_file);
        file_text_readln(_file);
    }
    file_text_close(_file);

    var _data = json_parse(_json);
    var _name = _data.player_name;
    var _level = _data.player_level;
}

// Pretty Print JSON (GMS 2.3.2+)
var _json = json_stringify(_data, true);  // Second argument = pretty print
```

### Included Files (datafiles/)

```gml
// Files in 'Included Files' are copied to datafiles/ at build time
// IMPORTANT: Keep files at ROOT level of datafiles/, NOT in subdirectories

// Load JSON from datafiles/
var _json_text = "";
if (file_exists("items.json")) {
    var _file = file_text_open_read("items.json");
    while (!file_text_eof(_file)) {
        _json_text += file_text_read_string(_file);
        file_text_readln(_file);
    }
    file_text_close(_file);

    var _items = json_parse(_json_text);
}

// Alternative: Load entire file at once (GMS 2.3.6+)
if (file_exists("config.json")) {
    var _buffer = buffer_load("config.json");
    var _json_text = buffer_read(_buffer, buffer_text);
    buffer_delete(_buffer);

    var _config = json_parse(_json_text);
}
```

---

## Collision & Movement

### Collision Checking

```gml
// Point Collision
collision_point(x, y, obj, prec, notme);
// prec: true = precise, false = bounding box
// notme: true = exclude self

// Line Collision
collision_line(x1, y1, x2, y2, obj, prec, notme);

// Rectangle Collision
collision_rectangle(x1, y1, x2, y2, obj, prec, notme);

// Circle Collision
collision_circle(x, y, radius, obj, prec, notme);

// Ellipse Collision
collision_ellipse(x1, y1, x2, y2, obj, prec, notme);

// Instance Collision
place_meeting(x, y, obj);    // Check collision at position
place_empty(x, y);           // No collision with solid objects
place_free(x, y);            // place_empty + no instances

// Position Collision
position_meeting(x, y, obj);
position_empty(x, y);

// Instance At Position
instance_place(x, y, obj);   // Returns instance ID or noone
instance_position(x, y, obj);
```

### Movement & Collision

```gml
// Move and Check Collision
if (!place_meeting(x + _hspeed, y, objWall)) {
    x += _hspeed;
}

if (!place_meeting(x, y + _vspeed, objWall)) {
    y += _vspeed;
}

// Move with Collision (built-in)
move_bounce_solid(advanced);
move_bounce_all(advanced);
move_contact_solid(dir, maxdist);
move_contact_all(dir, maxdist);
move_outside_solid(dir, maxdist);
move_outside_all(dir, maxdist);

// Grid-Based Movement
if (place_meeting(x + 32, y, objWall)) {
    // Can't move
} else {
    x += 32;
}
```

### Tile Collision (Tilemap)

```gml
// Get Tilemap Layer
var _tilemap = layer_tilemap_get_id("Tiles");

// Get Tile at Position
var _tile_x = floor(x / 32);  // 32 = tile size
var _tile_y = floor(y / 32);
var _tile_data = tilemap_get(_tilemap, _tile_x, _tile_y);

// Check if Tile Exists (non-zero)
if (_tile_data != 0) {
    // Collision!
}

// Set Tile
tilemap_set(_tilemap, tile_data, _tile_x, _tile_y);

// Get Tile Index (sprite frame)
var _tile_index = tile_get_index(_tile_data);
```

---

## Input Functions

### Keyboard

```gml
// Key Checks
keyboard_check(key);              // Is key held
keyboard_check_pressed(key);      // Was key just pressed
keyboard_check_released(key);     // Was key just released

// Direct Key Checks
keyboard_check_direct(key);       // Raw hardware check (no delay)

// Common Keys
vk_left, vk_right, vk_up, vk_down
vk_space, vk_enter, vk_escape, vk_shift, vk_control, vk_alt
vk_backspace, vk_tab
vk_pageup, vk_pagedown, vk_home, vk_end, vk_delete, vk_insert
vk_f1 to vk_f12
vk_numpad0 to vk_numpad9
vk_add, vk_subtract, vk_multiply, vk_divide

// Letter/Number Keys (use ord())
ord("A") to ord("Z")
ord("0") to ord("9")

// Examples
if (keyboard_check(vk_left)) {
    x -= 4;
}

if (keyboard_check_pressed(ord("E"))) {
    interact();
}

// Keyboard String Input
keyboard_string;                  // Current input string
keyboard_lastkey;                 // Last key code
keyboard_lastchar;                // Last character

// Clear Input
keyboard_clear(key);
```

### Mouse

```gml
// Mouse Position
mouse_x, mouse_y;                 // Room coordinates
window_mouse_get_x(), window_mouse_get_y();  // Window coordinates

// Mouse Buttons
mouse_check_button(button);
mouse_check_button_pressed(button);
mouse_check_button_released(button);

// Button Constants
mb_left, mb_right, mb_middle
mb_side1, mb_side2  // Extra mouse buttons

// Mouse Wheel
mouse_wheel_up();
mouse_wheel_down();

// Cursor
cursor_sprite;                    // Set cursor sprite
window_set_cursor(cursor);        // cr_default, cr_none, cr_arrow, etc.

// Mouse in GUI Layer
device_mouse_x_to_gui(device);
device_mouse_y_to_gui(device);
```

### Gamepad

```gml
// Check Gamepad Connected
gamepad_is_connected(device);     // device: 0-11

// Button Checks
gamepad_button_check(device, button);
gamepad_button_check_pressed(device, button);
gamepad_button_check_released(device, button);

// Button Constants
gp_face1, gp_face2, gp_face3, gp_face4  // A/B/X/Y (Xbox layout)
gp_shoulderl, gp_shoulderr               // L/R bumpers
gp_shoulderlb, gp_shoulderrb             // L/R triggers (digital)
gp_select, gp_start
gp_stickl, gp_stickr                     // Stick clicks
gp_padu, gp_padd, gp_padl, gp_padr       // D-pad

// Analog Sticks
gamepad_axis_value(device, axis);  // Returns -1 to 1

// Axis Constants
gp_axislh, gp_axislv  // Left stick horizontal/vertical
gp_axisrh, gp_axisrv  // Right stick horizontal/vertical

// Example: Movement with deadzone
var _h = gamepad_axis_value(0, gp_axislh);
var _v = gamepad_axis_value(0, gp_axislv);
var _deadzone = 0.2;

if (abs(_h) > _deadzone) {
    x += _h * _speed;
}
if (abs(_v) > _deadzone) {
    y += _v * _speed;
}
```

---

## Audio Functions

### Playing Audio

```gml
// Play Sound
audio_play_sound(sound, priority, loop);
// priority: 0-1000 (higher = more important)
// loop: true/false

// Play at Position (3D audio)
audio_play_sound_at(sound, x, y, z, falloff_ref, falloff_max, falloff_factor, loop, priority);

// Stop Sound
audio_stop_sound(sound);
audio_stop_all();

// Pause/Resume
audio_pause_sound(sound);
audio_resume_sound(sound);
audio_pause_all();
audio_resume_all();

// Check if Playing
audio_is_playing(sound);
audio_is_paused(sound);
```

### Audio Emitters (3D Sound Sources)

```gml
// Create Emitter
var _emitter = audio_emitter_create();

// Position
audio_emitter_position(_emitter, x, y, z);
audio_emitter_velocity(_emitter, vx, vy, vz);

// Play from Emitter
audio_play_sound_on(_emitter, sound, loop, priority);

// Stop Emitter
audio_emitter_stop(_emitter, sound);

// CRITICAL: Destroy when done!
audio_emitter_free(_emitter);
```

### Audio Volume & Effects

```gml
// Master Volume
audio_master_gain(volume);  // 0-1

// Sound Volume
audio_sound_gain(sound, volume, time);
// time: milliseconds to fade

// Sound Pitch
audio_sound_pitch(sound, pitch);  // 1.0 = normal, 2.0 = double speed

// Listener (player/camera)
audio_listener_position(x, y, z);
audio_listener_velocity(vx, vy, vz);
audio_listener_orientation(lookat_x, lookat_y, lookat_z, up_x, up_y, up_z);

// Falloff (3D distance attenuation)
audio_falloff_set_model(model);
// audio_falloff_none, audio_falloff_inverse_distance,
// audio_falloff_inverse_distance_clamped, audio_falloff_linear_distance, etc.
```

---

## Networking Functions

### Basic Networking

```gml
// Create Server
var _server = network_create_server(type, port, max_clients);
// type: network_socket_tcp or network_socket_udp

// Create Client
var _socket = network_create_socket(type);
network_connect(_socket, url, port);

// Send Data
var _buffer = buffer_create(256, buffer_fixed, 1);
buffer_write(_buffer, buffer_u8, message_type);
buffer_write(_buffer, buffer_string, "Hello");
network_send_packet(_socket, _buffer, buffer_tell(_buffer));

// Async Networking Event (objServer or objClient)
var _type = async_load[? "type"];

switch (_type) {
    case network_type_connect:
        var _socket = async_load[? "socket"];
        show_debug_message("Client connected: " + string(_socket));
        break;

    case network_type_disconnect:
        var _socket = async_load[? "socket"];
        show_debug_message("Client disconnected: " + string(_socket));
        break;

    case network_type_data:
        var _buffer = async_load[? "buffer"];
        var _size = async_load[? "size"];
        var _socket = async_load[? "id"];

        // Read data
        buffer_seek(_buffer, buffer_seek_start, 0);
        var _msg_type = buffer_read(_buffer, buffer_u8);
        var _msg_text = buffer_read(_buffer, buffer_string);
        break;
}

// Destroy
network_destroy(_socket);
```

### HTTP Requests

```gml
// GET Request
var _request = http_get("https://api.example.com/data");

// POST Request
var _request = http_post_string("https://api.example.com/submit", "key=value&name=test");

// Async HTTP Event
var _id = async_load[? "id"];
if (_id == global.http_request_id) {
    var _status = async_load[? "status"];  // HTTP status code (200 = OK)
    var _result = async_load[? "result"];  // Response body

    if (_status == 200) {
        var _data = json_parse(_result);
        // Process data...
    }
}
```

---

## Shader Functions

### Using Shaders

```gml
// Set Shader
shader_set(shader);

// Draw with Shader
draw_sprite_ext(sprite, subimg, x, y, 1, 1, 0, c_white, 1);

// Reset Shader
shader_reset();

// Example
shader_set(shdGrayscale);
draw_sprite(sprPlayer, 0, x, y);
shader_reset();
```

### Shader Uniforms

```gml
// Get Uniform Location
var _u_time = shader_get_uniform(shdWave, "u_time");
var _u_color = shader_get_uniform(shdTint, "u_color");

// Set Uniform Values
shader_set(shdWave);
shader_set_uniform_f(_u_time, current_time / 1000);  // Float
shader_set_uniform_f_array(_u_color, [1.0, 0.5, 0.0]);  // Float array
// Also: shader_set_uniform_i (integer), shader_set_uniform_matrix (matrix)

draw_sprite(sprEffect, 0, x, y);
shader_reset();
```

### Basic Shader Examples

**Vertex Shader (passthrough)**:
```glsl
// shdSimple - Vertex Shader
attribute vec3 in_Position;
attribute vec2 in_TextureCoord;

varying vec2 v_vTexcoord;

void main() {
    gl_Position = gm_Matrices[MATRIX_WORLD_VIEW_PROJECTION] * vec4(in_Position, 1.0);
    v_vTexcoord = in_TextureCoord;
}
```

**Fragment Shader (grayscale)**:
```glsl
// shdGrayscale - Fragment Shader
varying vec2 v_vTexcoord;

void main() {
    vec4 color = texture2D(gm_BaseTexture, v_vTexcoord);
    float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    gl_FragColor = vec4(vec3(gray), color.a);
}
```

---

## Surface Functions

### Creating & Using Surfaces

```gml
// Create Surface
var _surf = surface_create(width, height);

// Check if Surface Exists
if (!surface_exists(_surf)) {
    _surf = surface_create(width, height);
}

// Set as Render Target
surface_set_target(_surf);
draw_clear_alpha(c_black, 0);  // Clear surface
// ... draw to surface ...
surface_reset_target();

// Draw Surface
draw_surface(_surf, x, y);
draw_surface_ext(_surf, x, y, xscale, yscale, rot, color, alpha);
draw_surface_part(_surf, left, top, width, height, x, y);

// CRITICAL: Free Surface When Done!
surface_free(_surf);

// Example: Render to surface
if (!surface_exists(global.game_surface)) {
    global.game_surface = surface_create(1920, 1080);
}

surface_set_target(global.game_surface);
draw_clear(c_black);
// Draw game...
surface_reset_target();

draw_surface_stretched(global.game_surface, 0, 0, window_get_width(), window_get_height());
```

### Surface Utilities

```gml
// Save Surface
surface_save(_surf, filename);  // Saves as PNG

// Get Pixel Color
var _color = surface_getpixel(_surf, x, y);
var _color_ext = surface_getpixel_ext(_surf, x, y);  // More precise

// Get Surface Texture
var _tex = surface_get_texture(_surf);

// Copy Surface
surface_copy(_dest_surf, x, y, _source_surf);
```

---

## Particle Functions

### Particle Systems

```gml
// Create Particle System
var _ps = part_system_create();

// Depth
part_system_depth(_ps, depth);

// Update
part_system_update(_ps);  // Manual update (if automatic = false)
part_system_automatic_update(_ps, automatic);  // true = auto update

// Draw
part_system_drawit(_ps);  // Manual draw (if automatic = false)
part_system_automatic_draw(_ps, automatic);  // true = auto draw

// Position
part_system_position(_ps, x, y);

// Clear
part_system_clear(_ps);

// CRITICAL: Destroy when done!
part_system_destroy(_ps);
```

### Particle Types

```gml
// Create Particle Type
var _pt = part_type_create();

// Sprite
part_type_sprite(_pt, sprite, animate, stretch, random);

// Shape (if not using sprite)
part_type_shape(_pt, shape);
// pt_shape_pixel, pt_shape_disk, pt_shape_square, pt_shape_line, etc.

// Size
part_type_size(_pt, size_min, size_max, size_incr, size_wiggle);
part_type_scale(_pt, xscale, yscale);

// Color & Alpha
part_type_color1(_pt, color);
part_type_color2(_pt, color1, color2);
part_type_color3(_pt, color1, color2, color3);
part_type_alpha1(_pt, alpha);
part_type_alpha2(_pt, alpha1, alpha2);
part_type_alpha3(_pt, alpha1, alpha2, alpha3);

// Blend Mode
part_type_blend(_pt, additive);  // true = additive, false = normal

// Life
part_type_life(_pt, life_min, life_max);

// Speed
part_type_speed(_pt, speed_min, speed_max, speed_incr, speed_wiggle);
part_type_direction(_pt, dir_min, dir_max, dir_incr, dir_wiggle);

// Gravity
part_type_gravity(_pt, amount, direction);

// Orientation
part_type_orientation(_pt, ang_min, ang_max, ang_incr, ang_wiggle, ang_relative);

// Create Particles
part_particles_create(_ps, x, y, _pt, number);
part_particles_create_color(_ps, x, y, _pt, color, number);

// Destroy Type
part_type_destroy(_pt);
```

### Particle Emitters

```gml
// Create Emitter
var _pe = part_emitter_create(_ps);

// Region
part_emitter_region(_ps, _pe, xmin, xmax, ymin, ymax, shape, distribution);
// shape: ps_shape_rectangle, ps_shape_ellipse, ps_shape_diamond, ps_shape_line
// distribution: ps_distr_linear, ps_distr_gaussian, ps_distr_invgaussian

// Stream Particles
part_emitter_stream(_ps, _pe, _pt, number);  // number per step

// Burst Particles
part_emitter_burst(_ps, _pe, _pt, number);   // One-time burst

// Destroy Emitter
part_emitter_destroy(_ps, _pe);
part_emitter_destroy_all(_ps);
```

---

## Buffer Functions

### Creating Buffers

```gml
// Create Buffer
var _buff = buffer_create(size, type, alignment);
// type: buffer_fixed, buffer_grow, buffer_wrap, buffer_fast
// alignment: 1, 2, 4, 8, 16 (byte alignment)

// Load Buffer from File
var _buff = buffer_load(filename);

// Create from String
var _buff = buffer_create(1024, buffer_fixed, 1);
buffer_write(_buff, buffer_text, "Hello World");

// CRITICAL: Delete when done!
buffer_delete(_buff);
```

### Reading & Writing

```gml
// Write Data
buffer_write(_buff, type, value);
// Types: buffer_u8, buffer_s8, buffer_u16, buffer_s16, buffer_u32, buffer_s32,
//        buffer_u64, buffer_f16, buffer_f32, buffer_f64, buffer_string, buffer_text

// Read Data
var _value = buffer_read(_buff, type);

// Seek Position
buffer_seek(_buff, base, offset);
// base: buffer_seek_start, buffer_seek_relative, buffer_seek_end

// Get/Set Position
var _pos = buffer_tell(_buff);
buffer_poke(_buff, offset, type, value);  // Write at offset without moving position
var _value = buffer_peek(_buff, offset, type);  // Read at offset without moving position

// Fill
buffer_fill(_buff, offset, type, value, size);

// Copy
buffer_copy(_src, src_offset, size, _dest, dest_offset);

// Get Size
buffer_get_size(_buff);

// Resize (grow/wrap only)
buffer_resize(_buff, newsize);
```

### Saving & Loading Buffers

```gml
// Save to File
buffer_save(_buff, filename);

// Save Partial
buffer_save_ext(_buff, filename, offset, size);

// Load from File
var _buff = buffer_load(filename);

// Check Success
if (_buff == -1) {
    show_debug_message("Failed to load buffer");
}

// Compress
var _compressed = buffer_compress(_buff, offset, size);
buffer_delete(_buff);

// Decompress
var _decompressed = buffer_decompress(_compressed);
buffer_delete(_compressed);

// Encode/Decode Base64
var _encoded = buffer_base64_encode(_buff, offset, size);
var _decoded = buffer_base64_decode(_encoded);
```

---

## Time & Date Functions

```gml
// Current Date & Time
current_year;
current_month;      // 1-12
current_day;        // 1-31
current_weekday;    // 0 (Sunday) - 6 (Saturday)
current_hour;       // 0-23
current_minute;     // 0-59
current_second;     // 0-59

// Game Time
current_time;       // Milliseconds since game start
get_timer();        // Microseconds (high precision)

// Date-Time Values
var _now = date_current_datetime();
var _date = date_current_date();
var _time = date_current_time();

// Date Arithmetic
date_inc_year(_date, amount);
date_inc_month(_date, amount);
date_inc_week(_date, amount);
date_inc_day(_date, amount);
date_inc_hour(_date, amount);
date_inc_minute(_date, amount);
date_inc_second(_date, amount);

// Date Components
date_get_year(_date);
date_get_month(_date);
date_get_week(_date);
date_get_day(_date);
date_get_weekday(_date);
date_get_hour(_date);
date_get_minute(_date);
date_get_second(_date);

// Create Date
var _date = date_create_datetime(year, month, day, hour, minute, second);

// Date Difference
var _days = date_day_span(_date1, _date2);
var _hours = date_hour_span(_date1, _date2);
var _minutes = date_minute_span(_date1, _date2);
var _seconds = date_second_span(_date1, _date2);

// Date to String
date_datetime_string(_date);
date_date_string(_date);
date_time_string(_date);
```

---

## Common Code Patterns

### Inventory System

```gml
// Data Structure: Array of Structs
function init_inventory() {
    global.inventory = [];
    global.max_inventory = 20;
}

function add_item(_item_id, _quantity = 1) {
    // Check if item exists in inventory
    for (var i = 0; i < array_length(global.inventory); i++) {
        var _slot = global.inventory[i];
        if (_slot.item_id == _item_id) {
            _slot.quantity += _quantity;
            return true;
        }
    }

    // Check inventory space
    if (array_length(global.inventory) >= global.max_inventory) {
        return false;  // Inventory full
    }

    // Add new item
    array_push(global.inventory, {
        item_id: _item_id,
        quantity: _quantity
    });
    return true;
}

function remove_item(_item_id, _quantity = 1) {
    for (var i = 0; i < array_length(global.inventory); i++) {
        var _slot = global.inventory[i];
        if (_slot.item_id == _item_id) {
            _slot.quantity -= _quantity;
            if (_slot.quantity <= 0) {
                array_delete(global.inventory, i, 1);
            }
            return true;
        }
    }
    return false;  // Item not found
}

function has_item(_item_id, _quantity = 1) {
    for (var i = 0; i < array_length(global.inventory); i++) {
        var _slot = global.inventory[i];
        if (_slot.item_id == _item_id && _slot.quantity >= _quantity) {
            return true;
        }
    }
    return false;
}
```

### State Machine

```gml
// Enum for States
enum PlayerState {
    IDLE,
    WALKING,
    RUNNING,
    JUMPING,
    ATTACKING
}

// Create Event
state = PlayerState.IDLE;
state_timer = 0;

// Step Event
state_timer++;

switch (state) {
    case PlayerState.IDLE:
        image_speed = 0.2;
        sprite_index = sprPlayerIdle;

        if (keyboard_check(vk_left) || keyboard_check(vk_right)) {
            change_state(PlayerState.WALKING);
        }
        if (keyboard_check_pressed(vk_space)) {
            change_state(PlayerState.ATTACKING);
        }
        break;

    case PlayerState.WALKING:
        image_speed = 0.3;
        sprite_index = sprPlayerWalk;

        var _hspd = keyboard_check(vk_right) - keyboard_check(vk_left);
        x += _hspd * 2;

        if (_hspd == 0) {
            change_state(PlayerState.IDLE);
        }
        if (keyboard_check(vk_shift)) {
            change_state(PlayerState.RUNNING);
        }
        break;

    case PlayerState.ATTACKING:
        image_speed = 0.5;
        sprite_index = sprPlayerAttack;

        if (state_timer >= 30) {  // Attack duration
            change_state(PlayerState.IDLE);
        }
        break;
}

// Helper Function
function change_state(_new_state) {
    state = _new_state;
    state_timer = 0;

    // State enter logic
    switch (_new_state) {
        case PlayerState.ATTACKING:
            // Spawn hitbox, play sound, etc.
            break;
    }
}
```

### Dialogue System

```gml
// Dialogue Data (JSON)
{
    "dialogues": [
        {
            "id": "npc_greeting",
            "speaker": "Merchant",
            "lines": [
                "Hello traveler!",
                "What can I do for you today?",
                "I have many fine wares for sale."
            ],
            "next": "npc_shop_menu"
        }
    ]
}

// Dialogue Manager Object
// Create Event
dialogue_data = undefined;
current_dialogue = undefined;
current_line = 0;
is_showing = false;

// Load dialogue data
if (file_exists("dialogues.json")) {
    var _json = load_json_file("dialogues.json");
    dialogue_data = json_parse(_json);
}

function start_dialogue(_dialogue_id) {
    // Find dialogue
    for (var i = 0; i < array_length(dialogue_data.dialogues); i++) {
        var _dlg = dialogue_data.dialogues[i];
        if (_dlg.id == _dialogue_id) {
            current_dialogue = _dlg;
            current_line = 0;
            is_showing = true;
            return true;
        }
    }
    return false;
}

function advance_dialogue() {
    current_line++;

    if (current_line >= array_length(current_dialogue.lines)) {
        // Dialogue finished
        var _next = current_dialogue.next;
        is_showing = false;
        current_dialogue = undefined;
        current_line = 0;

        if (_next != undefined) {
            // Trigger next event (shop menu, quest, etc.)
            trigger_event(_next);
        }
        return false;
    }
    return true;
}

// Draw GUI Event
if (is_showing && current_dialogue != undefined) {
    var _speaker = current_dialogue.speaker;
    var _line = current_dialogue.lines[current_line];

    // Draw dialogue box
    draw_set_color(c_black);
    draw_set_alpha(0.8);
    draw_rectangle(32, 400, 928, 500, false);
    draw_set_alpha(1);

    // Draw text
    draw_set_color(c_white);
    draw_text(48, 410, _speaker + ":");
    draw_text(48, 440, _line);
    draw_text(850, 470, "[Press E to continue]");
}

// Step Event
if (is_showing && keyboard_check_pressed(ord("E"))) {
    advance_dialogue();
}
```

### Save/Load System

```gml
// Save Function
function save_game(_slot) {
    var _save_data = {
        version: "1.0.0",
        timestamp: date_current_datetime(),
        player: {
            x: objPlayer.x,
            y: objPlayer.y,
            health: objPlayer.health,
            max_health: objPlayer.max_health,
            level: objPlayer.level,
            xp: objPlayer.xp
        },
        inventory: global.inventory,
        flags: global.game_flags,
        current_room: room_get_name(room)
    };

    var _json = json_stringify(_save_data, true);
    var _filename = "save_" + string(_slot) + ".sav";

    var _file = file_text_open_write(_filename);
    file_text_write_string(_file, _json);
    file_text_close(_file);

    show_debug_message("Game saved to " + _filename);
}

// Load Function
function load_game(_slot) {
    var _filename = "save_" + string(_slot) + ".sav";

    if (!file_exists(_filename)) {
        show_debug_message("Save file not found: " + _filename);
        return false;
    }

    var _file = file_text_open_read(_filename);
    var _json = "";
    while (!file_text_eof(_file)) {
        _json += file_text_read_string(_file);
        file_text_readln(_file);
    }
    file_text_close(_file);

    var _save_data = json_parse(_json);

    // Validate version
    if (_save_data.version != "1.0.0") {
        show_debug_message("Save file version mismatch");
        return false;
    }

    // Load player data
    objPlayer.x = _save_data.player.x;
    objPlayer.y = _save_data.player.y;
    objPlayer.health = _save_data.player.health;
    objPlayer.max_health = _save_data.player.max_health;
    objPlayer.level = _save_data.player.level;
    objPlayer.xp = _save_data.player.xp;

    // Load inventory
    global.inventory = _save_data.inventory;

    // Load flags
    global.game_flags = _save_data.flags;

    // Load room
    var _room = asset_get_index(_save_data.current_room);
    if (_room != -1) {
        room_goto(_room);
    }

    show_debug_message("Game loaded from " + _filename);
    return true;
}
```

### Camera System

```gml
// Camera Object - Create Event
cam_width = 1920;
cam_height = 1080;
cam_x = 0;
cam_y = 0;

// Get camera from view
camera = view_camera[0];

// Camera Object - Step Event
var _target_x = objPlayer.x - cam_width / 2;
var _target_y = objPlayer.y - cam_height / 2;

// Clamp to room bounds
_target_x = clamp(_target_x, 0, room_width - cam_width);
_target_y = clamp(_target_y, 0, room_height - cam_height);

// Smooth follow
var _smooth = 0.1;
cam_x = lerp(cam_x, _target_x, _smooth);
cam_y = lerp(cam_y, _target_y, _smooth);

// Apply to camera
camera_set_view_pos(camera, cam_x, cam_y);
camera_set_view_size(camera, cam_width, cam_height);

// Camera shake (optional)
if (shake_amount > 0) {
    cam_x += random_range(-shake_amount, shake_amount);
    cam_y += random_range(-shake_amount, shake_amount);
    shake_amount -= shake_decay;
}

// Screen shake function
function screen_shake(_amount, _decay = 0.5) {
    with (objCamera) {
        shake_amount = _amount;
        shake_decay = _decay;
    }
}
```

### Object Pooling

```gml
// Bullet Pool Manager - Create Event
pool = ds_list_create();
pool_size = 100;

// Pre-create bullets
for (var i = 0; i < pool_size; i++) {
    var _bullet = instance_create_depth(0, 0, 0, objBullet);
    _bullet.pooled = true;
    _bullet.active = false;
    _bullet.visible = false;
    ds_list_add(pool, _bullet);
}

// Get bullet from pool
function get_bullet(_x, _y, _direction, _speed) {
    for (var i = 0; i < ds_list_size(pool); i++) {
        var _bullet = pool[| i];
        if (!_bullet.active) {
            _bullet.x = _x;
            _bullet.y = _y;
            _bullet.direction = _direction;
            _bullet.speed = _speed;
            _bullet.active = true;
            _bullet.visible = true;
            return _bullet;
        }
    }

    // Pool exhausted, create new bullet
    var _bullet = instance_create_depth(_x, _y, 0, objBullet);
    _bullet.pooled = true;
    _bullet.active = true;
    _bullet.direction = _direction;
    _bullet.speed = _speed;
    ds_list_add(pool, _bullet);
    return _bullet;
}

// Return bullet to pool
function return_bullet(_bullet) {
    _bullet.active = false;
    _bullet.visible = false;
    _bullet.x = 0;
    _bullet.y = 0;
    _bullet.speed = 0;
}

// Bullet Object - Step Event
if (active) {
    // Update bullet logic
    if (outside_room()) {
        with (objBulletPool) {
            return_bullet(other);
        }
    }
}

// Cleanup Event
ds_list_destroy(pool);
```

---

## Struct vs Object Decision Tree

**Use STRUCT when:**
- Pure data container (no Step/Draw/Collision events needed)
- Creating many instances (structs are lighter weight)
- Temporary data (calculations, API responses, save data)
- Constructor with methods (OOP-style code)
- Example: Player stats, item definitions, save data, API responses

**Use OBJECT when:**
- Need Step/Draw/Collision events
- Need to appear in room editor
- Visual elements (sprites, particles, effects)
- Persistent between rooms (persistent flag)
- Collision detection with other objects
- Example: Player, enemies, bullets, UI elements, managers

**Example Comparison**:

```gml
// ❌ WRONG: Using Object for pure data
// objItemData (wasteful - no events needed)
item_id = 1;
item_name = "Sword";
item_damage = 10;

// ✅ CORRECT: Using Struct for pure data
function Item(_id, _name, _damage) constructor {
    item_id = _id;
    name = _name;
    damage = _damage;

    static get_tooltip = function() {
        return name + " (Damage: " + string(damage) + ")";
    }
}

var _sword = new Item(1, "Sword", 10);


// ❌ WRONG: Using Struct for visual game entity
var _enemy = {
    x: 100,
    y: 100,
    health: 50
};
// Can't use Step event, collision events, sprite rendering!

// ✅ CORRECT: Using Object for visual game entity
// objEnemy (needs Step, Draw, Collision events)
health = 50;
sprite_index = sprEnemy;
```

**Constructor Methods vs Object Functions**:

```gml
// Struct Constructor (lightweight, no events)
function Character(_name, _level) constructor {
    name = _name;
    level = _level;
    health = 100;

    // Method (uses 'static' keyword)
    static level_up = function() {
        level++;
        health = 100 + (level * 10);
    }

    static take_damage = function(_amount) {
        health -= _amount;
        return health <= 0;  // Returns true if dead
    }
}

var _hero = new Character("Hero", 1);
_hero.level_up();
var _is_dead = _hero.take_damage(50);


// Object Functions (for objects needing events)
// objPlayer - Create Event
function take_damage(_amount) {
    health -= _amount;

    // Can use sprite_index, image_blend, etc.
    image_blend = c_red;
    alarm[0] = 10;  // Reset color after 10 steps

    if (health <= 0) {
        die();
    }
}

function die() {
    // Can use instance_destroy, sound_play, etc.
    instance_create_depth(x, y, depth, objDeathEffect);
    audio_play_sound(sndDeath, 1, false);
    instance_destroy();
}
```

---

**End of GML Reference**

For more detailed information, always refer to the [Official GameMaker Manual](https://manual.gamemaker.io/).

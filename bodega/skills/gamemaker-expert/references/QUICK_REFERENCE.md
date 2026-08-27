# GameMaker Quick Reference

Fast lookup tables and code snippets for common GameMaker tasks.

---

## Table of Contents

1. [Event Types & Numbers](#event-types--numbers)
2. [Keyboard Constants](#keyboard-constants)
3. [Mouse Constants](#mouse-constants)
4. [Color Constants](#color-constants)
5. [Blend Modes](#blend-modes)
6. [Common GML Patterns](#common-gml-patterns)
7. [Frequently Used Functions](#frequently-used-functions)
8. [IDE Version Reference](#ide-version-reference)

---

## Event Types & Numbers

### Event Type Reference

| Event Type | Type Number | Common Event Numbers | File Naming |
|------------|-------------|---------------------|-------------|
| Create | 0 | 0 | `Create_0.gml` |
| Destroy | 1 | 0 | `Destroy_0.gml` |
| Alarm | 2 | 0-11 | `Alarm_0.gml` to `Alarm_11.gml` |
| Step | 3 | 0 (Normal), 1 (Begin), 2 (End) | `Step_0.gml`, `Step_1.gml`, `Step_2.gml` |
| Collision | 4 | Object index | `Collision_objWall.gml` |
| Keyboard | 5 | Key code | `KeyPress_32.gml` (Space) |
| Mouse | 6 | Button | `Mouse_4.gml` (Left button) |
| Other | 7 | Various | `Other_10.gml` (Room Start) |
| Draw | 8 | 0 (Normal), 64 (GUI), 72 (Pre), 73 (Post), 74 (GUI Begin), 75 (GUI End) | `Draw_0.gml`, `Draw_64.gml` |
| Key Press | 9 | Key code | `KeyPress_32.gml` |
| Key Release | 10 | Key code | `KeyRelease_32.gml` |
| Gesture | 13 | Gesture type | `Gesture_0.gml` |
| Async | 70 | 68 (Networking), 70 (Dialog), 62 (HTTP), etc. | `Async_68.gml` |
| Clean Up | 12 | 0 | `CleanUp_0.gml` |

### Execution Order (Per Frame)

```
1. Begin Step Event (Step_1.gml)
2. Alarm Events (Alarm_0.gml through Alarm_11.gml)
3. Keyboard Events, Key Press Events
4. Mouse Events
5. Step Event (Step_0.gml) - MAIN GAME LOGIC HERE
6. Collision Events
7. End Step Event (Step_2.gml)
8. Animation Update (image_index increments)
9. Draw Begin Event (Draw_72.gml)
10. Draw Event (Draw_0.gml)
11. Draw End Event (Draw_73.gml)
12. Draw GUI Begin Event (Draw_74.gml)
13. Draw GUI Event (Draw_64.gml) - HUD/UI DRAWING HERE
14. Draw GUI End Event (Draw_75.gml)
```

### Other Event Numbers

| Event Number | Event Name | File Name |
|--------------|------------|-----------|
| 0 | Outside Room | `Other_0.gml` |
| 1 | Intersect Boundary | `Other_1.gml` |
| 2 | Game Start | `Other_2.gml` |
| 3 | Game End | `Other_3.gml` |
| 4 | Room Start | `Other_4.gml` |
| 5 | Room End | `Other_5.gml` |
| 7 | Animation End | `Other_7.gml` |
| 10 | User Event 0 | `Other_10.gml` |
| 11 | User Event 1 | `Other_11.gml` |
| ... | User Events 2-15 | `Other_12.gml` to `Other_25.gml` |
| 40 | Outside View 0 | `Other_40.gml` |
| 41 | Outside View 1 | `Other_41.gml` |

---

## Keyboard Constants

### Special Keys

```gml
vk_nokey       // 0 - No key
vk_anykey      // 1 - Any key

// Arrow Keys
vk_left        // 37
vk_right       // 39
vk_up          // 38
vk_down        // 40

// Common Keys
vk_space       // 32
vk_enter       // 13
vk_escape      // 27
vk_backspace   // 8
vk_tab         // 9

// Modifiers
vk_shift       // 16
vk_control     // 17
vk_alt         // 18

// Navigation
vk_home        // 36
vk_end         // 35
vk_pageup      // 33
vk_pagedown    // 34
vk_delete      // 46
vk_insert      // 45

// Function Keys
vk_f1          // 112
vk_f2          // 113
vk_f3          // 114
// ... through vk_f12 (123)

// Numpad
vk_numpad0     // 96
vk_numpad1     // 97
// ... through vk_numpad9 (105)
vk_add         // 107 (Numpad +)
vk_subtract    // 109 (Numpad -)
vk_multiply    // 106 (Numpad *)
vk_divide      // 111 (Numpad /)
```

### Letter & Number Keys

Use `ord()` function:
```gml
ord("A")       // 65
ord("B")       // 66
// ... through ord("Z") (90)

ord("0")       // 48
ord("1")       // 49
// ... through ord("9") (57)
```

### Keyboard Check Examples

```gml
// Check if key is held
if (keyboard_check(vk_left)) {
    x -= 4;
}

// Check if key just pressed
if (keyboard_check_pressed(vk_space)) {
    jump();
}

// Check if key just released
if (keyboard_check_released(ord("E"))) {
    stop_interacting();
}

// Check multiple keys
if (keyboard_check(vk_shift) && keyboard_check_pressed(ord("S"))) {
    quick_save();
}
```

---

## Mouse Constants

### Mouse Buttons

```gml
mb_none        // -1 - No button
mb_any         // -2 - Any button
mb_left        // 1
mb_right       // 2
mb_middle      // 3
mb_side1       // 4  // Extra button 1
mb_side2       // 5  // Extra button 2
```

### Mouse Event Numbers

```gml
0  // Left Button
1  // Right Button
2  // Middle Button
3  // No Button
4  // Left Pressed
5  // Right Pressed
6  // Middle Pressed
7  // Left Released
8  // Right Released
9  // Middle Released
10 // Mouse Enter
11 // Mouse Leave
```

### Mouse Position

```gml
// Room Coordinates
mouse_x
mouse_y

// Window Coordinates
window_mouse_get_x()
window_mouse_get_y()

// GUI Layer Coordinates
device_mouse_x_to_gui(0)
device_mouse_y_to_gui(0)

// Previous Frame Position
mouse_lastx
mouse_lasty
```

### Mouse Examples

```gml
// Check if mouse button held
if (mouse_check_button(mb_left)) {
    fire_weapon();
}

// Check if mouse button just pressed
if (mouse_check_button_pressed(mb_right)) {
    aim_weapon();
}

// Mouse wheel
if (mouse_wheel_up()) {
    zoom_in();
}
if (mouse_wheel_down()) {
    zoom_out();
}

// Mouse position in room
var _mx = mouse_x;
var _my = mouse_y;

// Check if mouse over instance
if (position_meeting(mouse_x, mouse_y, id)) {
    // Mouse is over this instance
}
```

---

## Color Constants

### Basic Colors

```gml
c_white        // #FFFFFF
c_black        // #000000
c_gray         // #808080
c_silver       // #C0C0C0
c_ltgray       // #C0C0C0 (same as silver)
c_dkgray       // #404040

// Primary Colors
c_red          // #FF0000
c_green        // #008000
c_blue         // #0000FF

// Secondary Colors
c_yellow       // #FFFF00
c_orange       // #FFA500
c_purple       // #800080
c_lime         // #00FF00
c_aqua         // #00FFFF
c_fuchsia      // #FF00FF

// Other Colors
c_maroon       // #800000
c_navy         // #000080
c_olive        // #808000
c_teal         // #008080
```

### Color Functions

```gml
// Create Color from RGB (0-255)
make_color_rgb(255, 128, 0);   // Orange

// Create Color from HSV
make_color_hsv(hue, sat, val);
// hue: 0-255, sat: 0-255, val: 0-255

// Extract Color Components
color_get_red(color);          // Returns 0-255
color_get_green(color);
color_get_blue(color);
color_get_hue(color);          // Returns 0-255
color_get_saturation(color);   // Returns 0-255
color_get_value(color);        // Returns 0-255

// Merge Colors
merge_color(c_red, c_blue, 0.5);  // 50% between red and blue
merge_color(c1, c2, 0.0);          // 100% c1
merge_color(c1, c2, 1.0);          // 100% c2
```

### Color Examples

```gml
// Draw with color
draw_set_color(c_red);
draw_rectangle(x, y, x + 32, y + 32, false);

// Draw sprite with color blend
draw_sprite_ext(sprPlayer, 0, x, y, 1, 1, 0, c_yellow, 1);

// Gradient rectangle
draw_rectangle_color(x, y, x + 100, y + 100, c_red, c_yellow, c_blue, c_green, false);

// Custom color
var _orange = make_color_rgb(255, 165, 0);
draw_set_color(_orange);
```

---

## Blend Modes

### Standard Blend Modes

```gml
bm_normal      // Standard blending (default)
bm_add         // Additive blending (glow effects)
bm_max         // Maximum blending
bm_subtract    // Subtractive blending
bm_zero        // Zero blending
```

### Blend Mode Components

```gml
bm_src_color
bm_inv_src_color
bm_src_alpha
bm_inv_src_alpha
bm_dest_alpha
bm_inv_dest_alpha
bm_dest_color
bm_inv_dest_color
bm_src_alpha_sat
```

### Extended Blend Modes

```gml
// Custom blend mode
draw_set_blend_mode_ext(src, dest);

// Examples:
draw_set_blend_mode_ext(bm_src_alpha, bm_inv_src_alpha);  // Normal alpha blending
draw_set_blend_mode_ext(bm_one, bm_one);                   // Additive blending
draw_set_blend_mode_ext(bm_zero, bm_src_color);            // Multiply blending
```

### Blend Mode Examples

```gml
// Glow effect (additive)
draw_set_blend_mode(bm_add);
draw_sprite(sprGlow, 0, x, y);
draw_set_blend_mode(bm_normal);

// Shadow (subtractive)
draw_set_blend_mode(bm_subtract);
draw_sprite(sprShadow, 0, x, y + 16);
draw_set_blend_mode(bm_normal);

// Always reset to normal after drawing!
```

---

## Common GML Patterns

### Distance Check with Direction

```gml
// Get distance to target
var _dist = point_distance(x, y, target_x, target_y);

// Get direction to target
var _dir = point_direction(x, y, target_x, target_y);

// Move towards target
if (_dist > 32) {
    x += lengthdir_x(speed, _dir);
    y += lengthdir_y(speed, _dir);
}
```

### Collision Check Before Movement

```gml
// Horizontal movement
if (!place_meeting(x + hspeed, y, objWall)) {
    x += hspeed;
}

// Vertical movement
if (!place_meeting(x, y + vspeed, objWall)) {
    y += vspeed;
}
```

### Random Range (Inclusive)

```gml
// Random integer between min and max (inclusive)
irandom_range(1, 6);          // Dice roll (1-6)

// Random float between min and max
random_range(10.0, 20.0);     // 10.0 to 20.0
```

### Clamp Value

```gml
// Keep value within range
health = clamp(health, 0, max_health);

// Clamp position to room
x = clamp(x, 0, room_width);
y = clamp(y, 0, room_height);
```

### Lerp (Linear Interpolation)

```gml
// Smooth camera follow
cam_x = lerp(cam_x, target_x, 0.1);  // 10% towards target each frame

// Smooth value changes
alpha = lerp(alpha, target_alpha, 0.05);
```

### Approach Value

```gml
// Move value towards target by step amount
function approach(_current, _target, _step) {
    if (_current < _target) {
        return min(_current + _step, _target);
    } else {
        return max(_current - _step, _target);
    }
}

// Usage
x = approach(x, target_x, 2);  // Move 2 pixels towards target
```

### Wrap Value

```gml
// Wrap value within range (e.g., angles)
function wrap(_value, _min, _max) {
    var _range = _max - _min;
    while (_value < _min) _value += _range;
    while (_value >= _max) _value -= _range;
    return _value;
}

// Usage
direction = wrap(direction, 0, 360);  // Keep angle 0-360
```

### Check if Instance Exists

```gml
// Check if specific instance exists
if (instance_exists(inst_id)) {
    inst_id.health -= 10;
}

// Check if any instance of object exists
if (instance_exists(objPlayer)) {
    with (objPlayer) {
        health -= 10;
    }
}
```

### Find Nearest Instance

```gml
// Find nearest enemy
var _nearest = instance_nearest(x, y, objEnemy);
if (_nearest != noone) {
    // Do something with _nearest
    var _dir = point_direction(x, y, _nearest.x, _nearest.y);
}
```

### Screen Shake

```gml
// In camera object - Create Event
shake_amount = 0;
shake_decay = 0.5;

// Step Event
if (shake_amount > 0) {
    cam_x += random_range(-shake_amount, shake_amount);
    cam_y += random_range(-shake_amount, shake_amount);
    shake_amount -= shake_decay;
}

// Trigger shake
function screen_shake(_amount) {
    shake_amount = _amount;
}

// Usage
screen_shake(10);  // Shake with intensity 10
```

### Timer with Cooldown

```gml
// Create Event
fire_cooldown = 0;

// Step Event
if (fire_cooldown > 0) {
    fire_cooldown--;
}

if (keyboard_check_pressed(vk_space) && fire_cooldown <= 0) {
    fire_bullet();
    fire_cooldown = 30;  // 30 frames (0.5 seconds at 60 FPS)
}
```

### Cycle Through Array

```gml
// Create Event
weapons = ["Sword", "Bow", "Staff"];
current_weapon = 0;

// Step Event
if (keyboard_check_pressed(ord("Q"))) {
    current_weapon = (current_weapon + 1) mod array_length(weapons);
}

// current_weapon cycles: 0 → 1 → 2 → 0 → 1 → ...
```

---

## Frequently Used Functions

### Math

```gml
abs(x)                    // Absolute value
sign(x)                   // -1, 0, or 1
round(x)                  // Round to nearest integer
floor(x)                  // Round down
ceil(x)                   // Round up
sqrt(x)                   // Square root
power(x, n)               // x^n
clamp(val, min, max)      // Restrict to range
lerp(a, b, amount)        // Linear interpolation
min(a, b)                 // Minimum value
max(a, b)                 // Maximum value
```

### String

```gml
string(value)                         // Convert to string
string_length(str)                    // Length of string
string_copy(str, index, count)        // Substring (1-indexed!)
string_pos(substr, str)               // Find position (1-indexed, 0 = not found)
string_replace(str, substr, newstr)   // Replace first occurrence
string_replace_all(str, sub, new)     // Replace all
string_upper(str)                     // Uppercase
string_lower(str)                     // Lowercase
```

### Instance

```gml
instance_create_depth(x, y, depth, obj, [vars])  // Create instance (vars = optional struct)
instance_create_layer(x, y, layer, obj, [vars])  // Create on layer (vars = optional struct)

// Example: Pass variables before Create event
instance_create_depth(x, y, -100, objBullet, { speed: 10, direction: 45 })

instance_destroy()                        // Destroy self
instance_destroy(id)                      // Destroy specific instance
instance_exists(obj)                      // Check if exists
instance_number(obj)                      // Count instances
instance_nearest(x, y, obj)               // Find nearest
instance_find(obj, n)                     // Find nth instance (0-indexed)
```

### Collision

```gml
place_meeting(x, y, obj)                  // Check collision at position
collision_point(x, y, obj, prec, notme)   // Point collision
collision_line(x1, y1, x2, y2, obj, p, n) // Line collision
distance_to_point(x, y)                   // Distance to point
distance_to_object(obj)                   // Distance to nearest instance
point_direction(x1, y1, x2, y2)           // Angle from point 1 to point 2
```

### Drawing

```gml
draw_sprite(spr, subimg, x, y)                          // Draw sprite
draw_sprite_ext(spr, sub, x, y, xs, ys, rot, col, a)   // Draw sprite extended
draw_text(x, y, str)                                    // Draw text
draw_rectangle(x1, y1, x2, y2, outline)                 // Draw rectangle
draw_circle(x, y, radius, outline)                      // Draw circle
draw_line(x1, y1, x2, y2)                               // Draw line
draw_set_color(color)                                   // Set draw color
draw_set_alpha(alpha)                                   // Set transparency (0-1)
```

### Room & Game

```gml
room_goto(room)            // Go to room
room_restart()             // Restart current room
game_end()                 // End game
game_restart()             // Restart game from beginning
room_width                 // Room width in pixels
room_height                // Room height in pixels
room_speed                 // Target FPS
```

---

## IDE Version Reference

### GameMaker Studio 2 Versions

| Version | Release Date | Key Features |
|---------|--------------|--------------|
| 2.0 | Nov 2016 | Initial release |
| 2.1 | May 2017 | GMS2 syntax improvements |
| 2.2 | Aug 2018 | Sequences, layer functions |
| 2.3 | Apr 2020 | **Major update**: Structs, method variables, script functions |
| 2.3.1 | Jan 2021 | Improved struct performance |
| 2.3.2 | Mar 2021 | Bug fixes, stability |
| 2.3.3 | Jul 2021 | Asset browser improvements |
| 2.3.4 | Sep 2021 | Asset compiler improvements |
| 2.3.5 | Nov 2021 | YYC optimizations |
| 2.3.6 | Dec 2021 | Better JSON handling |
| 2023.x | 2023 | LTS (Long-Term Support) |
| 2024.x | 2024 | Current stable |

### Version-Specific Features

**GMS 2.3+ Only**:
```gml
// Structs
var _data = { name: "Player", health: 100 };

// Constructors
function Player() constructor {
    health = 100;
}

// Method variables
static my_method = function() {
    // ...
}

// Template strings (2.3.1+)
var _msg = $"Health: {health}/{max_health}";

// Array functions
array_push(arr, value);
array_pop(arr);
array_length(arr);
```

**Pre-2.3 (Legacy)**:
```gml
// No structs, use ds_map
var _data = ds_map_create();
_data[? "name"] = "Player";
_data[? "health"] = 100;

// No constructors, use scripts
// script_create_player()

// No method variables, use scripts
// script_my_method()

// No template strings, use string concatenation
var _msg = "Health: " + string(health) + "/" + string(max_health);

// Arrays created differently
var _arr;
_arr[0] = "value";
```

### Checking IDE Version

```gml
// Get IDE version
show_debug_message("IDE Version: " + GM_version);

// Runtime version
show_debug_message("Runtime Version: " + GM_runtime_version);

// Build number
show_debug_message("Build: " + string(GM_build_date));
```

---

## Quick Code Snippets

### Basic Movement (8-Direction)

```gml
// Step Event
var _hspd = keyboard_check(vk_right) - keyboard_check(vk_left);
var _vspd = keyboard_check(vk_down) - keyboard_check(vk_up);

if (_hspd != 0 || _vspd != 0) {
    var _dir = point_direction(0, 0, _hspd, _vspd);
    x += lengthdir_x(4, _dir);
    y += lengthdir_y(4, _dir);
}
```

### Health Bar

```gml
// Draw GUI Event
var _bar_x = 20;
var _bar_y = 20;
var _bar_width = 200;
var _bar_height = 20;

// Background
draw_set_color(c_dkgray);
draw_rectangle(_bar_x, _bar_y, _bar_x + _bar_width, _bar_y + _bar_height, false);

// Health
var _health_percent = health / max_health;
var _health_width = _bar_width * _health_percent;
draw_set_color(c_red);
draw_rectangle(_bar_x, _bar_y, _bar_x + _health_width, _bar_y + _bar_height, false);

// Border
draw_set_color(c_white);
draw_rectangle(_bar_x, _bar_y, _bar_x + _bar_width, _bar_y + _bar_height, true);

// Text
draw_text(_bar_x + 5, _bar_y + 2, string(health) + "/" + string(max_health));
draw_set_color(c_white);
```

### Simple AI (Chase Player)

```gml
// Step Event
if (instance_exists(objPlayer)) {
    var _dir = point_direction(x, y, objPlayer.x, objPlayer.y);
    var _dist = point_distance(x, y, objPlayer.x, objPlayer.y);

    if (_dist > 32) {
        // Chase
        x += lengthdir_x(2, _dir);
        y += lengthdir_y(2, _dir);
    } else {
        // Attack
        if (attack_cooldown <= 0) {
            objPlayer.health -= 10;
            attack_cooldown = 60;
        }
    }
}

if (attack_cooldown > 0) {
    attack_cooldown--;
}
```

---

**End of Quick Reference**

For more detailed information:
- [GML_REFERENCE.md](GML_REFERENCE.md) - Complete function reference
- [COMMON_PITFALLS.md](COMMON_PITFALLS.md) - Common mistakes and solutions
- [Official GameMaker Manual](https://manual.gamemaker.io/) - Official documentation

# Common GameMaker Pitfalls & Solutions

This guide covers the most common mistakes GameMaker developers make and how to avoid them.

---

## Table of Contents

1. [Object Creation Issues](#object-creation-issues)
2. [File System Issues](#file-system-issues)
3. [GML Syntax Traps](#gml-syntax-traps)
4. [Memory Management](#memory-management)
5. [Performance Issues](#performance-issues)
6. [Collision Detection](#collision-detection)
7. [Networking Issues](#networking-issues)
8. [Shader Issues](#shader-issues)
9. [Rendering Issues](#rendering-issues)
10. [Event Order Confusion](#event-order-confusion)
11. [Common Logic Errors](#common-logic-errors)

---

## Object Creation Issues

### Problem: Missing .yy File

**Symptom**: Object doesn't appear in IDE, compile errors about missing object

**Cause**: Created object directory and event files but forgot .yy definition file

**Solution**: Always create ALL 4 required components:
1. Object directory (`objects/objYourObject/`)
2. Event .gml files (`Create_0.gml`, etc.)
3. Object .yy file (`objYourObject.yy`)
4. Registration in `MyGame.yyp` (your project file)

**Template for .yy file**:
```json
{
  "$GMObject":"",
  "%Name":"objYourObject",
  "eventList":[
    {"$GMEvent":"v1","%Name":"","collisionObjectId":null,"eventNum":0,"eventType":0,"isDnD":false,"name":"","resourceType":"GMEvent","resourceVersion":"2.0",},
  ],
  "managed":true,
  "name":"objYourObject",
  "parentObjectId":null,
  "persistent":false,
  "resourceType":"GMObject",
  "resourceVersion":"2.0",
  "visible":true,
}
```

---

### Problem: Missing .yyp Registration

**Symptom**: Object exists but won't compile, "resource not found" errors

**Cause**: Object .yy file exists but not registered in main project file

**Solution**: Add object to `resources` array in `MyGame.yyp`:
```json
{
  "id": {
    "name": "objYourObject",
    "path": "objects/objYourObject/objYourObject.yy"
  },
  "order": 0
}
```

**Quick Check**: Search .yyp file for your object name. If not found, it's not registered.

---

### Problem: Wrong Event File Names

**Symptom**: Events don't trigger, code doesn't run

**Cause**: Event file named incorrectly (e.g., `create.gml` instead of `Create_0.gml`)

**Common Event Names**:
- `Create_0.gml` (Create Event)
- `Step_0.gml` (Step Event)
- `Step_1.gml` (Begin Step Event)
- `Step_2.gml` (End Step Event)
- `Draw_0.gml` (Draw Event)
- `Draw_64.gml` (Draw GUI Event)
- `Collision_objWall.gml` (Collision with objWall)
- `KeyPress_32.gml` (Space key press - ASCII 32)
- `Mouse_4.gml` (Left mouse button)
- `Alarm_0.gml` (Alarm 0)
- `CleanUp_0.gml` (Clean Up Event)

**Solution**: Use exact naming convention `EventName_EventNumber.gml`

---

### Problem: JSON Syntax Errors in .yy Files

**Symptom**: "Failed to load project" error, IDE won't open project

**Cause**: Trailing commas, missing quotes, or malformed JSON in .yy files

**Common JSON Mistakes**:
```json
// ❌ WRONG: Trailing comma in last element
{
  "name": "objPlayer",
  "health": 100,
}

// ✅ CORRECT: No trailing comma
{
  "name": "objPlayer",
  "health": 100
}

// ❌ WRONG: Missing quotes around property names
{
  name: "objPlayer"
}

// ✅ CORRECT: Quotes around property names
{
  "name": "objPlayer"
}
```

**Solution**: Use JSON validator (online or `python -m json.tool file.yy`) to check syntax

**Validation Command**:
```powershell
python -m json.tool objects/objPlayer/objPlayer.yy
```

---

### Problem: Parent Object Not Set Correctly

**Symptom**: Child objects don't inherit parent events/variables

**Cause**: `parentObjectId` is null when it should reference parent

**Solution**: Set parent in .yy file:
```json
{
  "name": "objEnemyMelee",
  "parentObjectId": {
    "name": "objEnemy",
    "path": "objects/objEnemy/objEnemy.yy"
  }
}
```

---

## File System Issues

### Problem: datafiles/ Subdirectories Don't Work

**Symptom**: file_exists() returns false, can't load JSON from subdirectories

**Cause**: GameMaker exports `Included Files` to flat `datafiles/` directory in some configurations

**Solution**: Keep ALL included files at ROOT level of `datafiles/`:
```
✅ CORRECT:
datafiles/items.json
datafiles/config.json
datafiles/enemies.json

❌ WRONG (may fail on some platforms):
datafiles/configs/game.json
datafiles/data/items/weapons.json
```

**Workaround if subdirectories are required**: Use filename prefixes instead
```
datafiles/config_game.json
datafiles/config_audio.json
datafiles/items_weapons.json
datafiles/items_armor.json
```

---

### Problem: Forgetting to Register in .yyp

**Symptom**: Included file exists in IDE but not found at runtime

**Cause**: File added to `datafiles/` but not registered in `MyGame.yyp`

**Solution**: Add to `IncludedFiles` section of .yyp:
```json
"IncludedFiles": [
  {"$GMIncludedFile":"","%Name":"items.json","CopyToMask":-1,"filePath":"datafiles","name":"items.json","resourceType":"GMIncludedFile","resourceVersion":"2.0",}
]
```

**Quick Test**: After adding file, run game and check `file_exists("filename.json")`

---

### Problem: working_directory vs game_save_id

**Symptom**: Save files work on Windows but not on other platforms

**Cause**: Hardcoding paths instead of using `working_directory`

**Solution**: Always use built-in path variables:
```gml
// ❌ WRONG: Hardcoded path
var _file = file_text_open_write("C:\\Users\\Player\\save.json");

// ✅ CORRECT: Use working_directory
var _file = file_text_open_write(working_directory + "save.json");

// ✅ BETTER: Just use filename (already in working_directory)
var _file = file_text_open_write("save.json");
```

**Platform Save Locations**:
- Windows: `C:\Users\<username>\AppData\Local\<game_name>\`
- macOS: `~/Library/Application Support/<game_name>/`
- Linux: `~/.config/<game_name>/`

---

### Problem: Forgetting to Close Files

**Symptom**: File corruption, "file in use" errors, memory leaks

**Cause**: Opening file but not calling `file_text_close()`

**Solution**: Always close files, even on error:
```gml
// ❌ BAD: No error handling, file left open
var _file = file_text_open_read("data.txt");
var _content = file_text_read_string(_file);
// What if file_text_read_string fails? File never closed!

// ✅ GOOD: Always close
var _file = file_text_open_read("data.txt");
if (_file != -1) {
    var _content = file_text_read_string(_file);
    file_text_close(_file);  // CRITICAL!
}
```

---

## GML Syntax Traps

### Problem: Chained Ternary Operators

**Symptom**: Compile error "unexpected symbol"

**Cause**: GML requires double parentheses around nested ternary conditions

**Solution**: Wrap nested ternary in double parentheses:
```gml
// ❌ WRONG: Will cause compile error!
var _result = a ? "foo" : b ? "bar" : "baz";

// ✅ CORRECT: Double parentheses around nested ternary
var _result = a ? "foo" : ((b ? "bar" : "baz"));

// Alternative: Use if/else for clarity
var _result;
if (a) {
    _result = "foo";
} else if (b) {
    _result = "bar";
} else {
    _result = "baz";
}
```

**Reference**: [Official GameMaker Manual - Ternary Operators](https://manual.gamemaker.io/beta/en/GameMaker_Language/GML_Overview/Expressions_And_Operators.htm)

---

### Problem: Variable Scope Confusion

**Symptom**: Variables have wrong values, unpredictable behavior

**Cause**: Mixing local, instance, and global variables without `var` keyword

**Solution**: ALWAYS use `var` for local variables (starting with underscore):
```gml
// ❌ WRONG: No 'var' keyword = creates instance variable!
_player_x = objPlayer.x;  // Creates instance variable '_player_x'
health = 100;             // Creates instance variable 'health'

// ✅ CORRECT: Use 'var' for local variables
var _player_x = objPlayer.x;  // Local variable
var _temp_health = 100;        // Local variable
health = 100;                  // Instance variable (intentional)
```

**Scope Rules**:
- **Local**: `var _name` (exists only in current code block)
- **Instance**: `name` (exists for lifetime of instance)
- **Global**: `global.name` (exists for entire game)

---

### Problem: Using "other" in Callbacks/Bound Methods

**Symptom**: "Variable X.property not set before reading it" when accessing `other.property` in a callback

**Cause**: Assuming `other` refers to the instance that created a callback. In bound methods, `other` refers to the **previous scope when the method executes**, NOT the instance that created it. The `other` keyword only has special meaning in Collision events.

**Example of the Problem**:
```gml
// objUI creating a button callback
var _button = new UIButton({
    on_click: method({}, function() {
        other.refresh();  // ❌ ERROR: other doesn't point to objUI!
    })
});
```

**Root Cause**: In bound methods, `other` refers to the **previous scope when the method executes**, NOT the instance that created it.

**Solution**: Capture the instance ID (not `self`) with defensive checks:

```gml
// ⚠️ PROBLEMATIC: self can become invalid if instance recreated
var _button = new UIButton({
    on_click: method({ui: self}, function() {
        ui.refresh();  // Can fail if ui instance destroyed/recreated
    })
});

// ✅ CORRECT: Use instance ID with defensive check
var _button = new UIButton({
    on_click: method({ui_id: id}, function() {
        if (!instance_exists(ui_id)) {
            show_debug_message("WARNING: Instance destroyed");
            return;
        }

        var _ui = ui_id;
        _ui.refresh();  // Safe: id is stable numeric reference
    })
});
```

**Why `id` is better than `self`:**
- Instance ID (`id`) is a stable numeric reference that doesn't change with context
- `self` changes based on execution scope (can become invalid)
- `instance_exists()` provides defensive guard against destroyed instances
- More explicit about instance ownership

**Real-World Example** (from character creation UI):
```gml
// ❌ WRONG: other doesn't work in callbacks
var _plus_btn = new UIButton({
    on_click: method({stat_key: _stat_key}, function() {
        if (other.stat_points_remaining > 0) {  // ERROR!
            other.stat_points_remaining--;
        }
    })
});

// ⚠️ PROBLEMATIC: self becomes <unknown_object> when buttons recreated
var _plus_btn = new UIButton({
    on_click: method({stat_key: _stat_key, ui: self}, function() {
        if (ui.stat_points_remaining > 0) {  // Fails after rebuild_stats_page_buttons()
            ui.stat_points_remaining--;
        }
    })
});

// ✅ CORRECT: Use instance ID with defensive check
var _plus_btn = new UIButton({
    on_click: method({stat_key: _stat_key, ui_id: id}, function() {
        if (!instance_exists(ui_id)) {
            show_debug_message("WARNING: objCharacterCreationUI destroyed");
            return;
        }

        var _ui = ui_id;
        if (_ui.stat_points_remaining > 0) {
            _ui.stat_points_remaining--;
        }
    })
});
```

**When this matters:**
- Callbacks passed to UI buttons, timers, event handlers
- Async callbacks (HTTP, file operations)
- Any method that executes later in a different context

**Best Practice**: Always capture instance ID (not `self`) in callback bindings:
```gml
// ✅ Use instance ID with defensive check
method({owner_id: id}, function() {
    if (!instance_exists(owner_id)) return;
    var _owner = owner_id;
    _owner.doSomething();
})
```

**Reference**:
- [GameMaker Manual: other keyword](https://manual.gamemaker.io/monthly/en/GameMaker_Language/GML_Overview/Instance%20Keywords/other.htm)
- See also: GML_REFERENCE.md → Instance Keywords → other

---

### Problem: Array Out of Bounds

**Symptom**: Crash with "array index out of bounds" error

**Cause**: Accessing array element that doesn't exist

**Solution**: Always check array length:
```gml
// ❌ WRONG: No bounds checking
var _val = my_array[5];  // Crashes if array has < 6 elements

// ✅ CORRECT: Check bounds
if (array_length(my_array) > 5) {
    var _val = my_array[5];
}

// ✅ BETTER: Iterate with length check
for (var i = 0; i < array_length(my_array); i++) {
    var _val = my_array[i];
}
```

---

### Problem: Undefined Variable Access

**Symptom**: Errors about "undefined" variables, unexpected behavior

**Cause**: Accessing variable that doesn't exist on instance

**Solution**: Check variable exists before accessing:
```gml
// ❌ WRONG: Assumes all instances have 'health'
with (all) {
    health -= 10;  // Crashes if some instances don't have 'health'
}

// ✅ CORRECT: Check variable exists
with (all) {
    if (variable_instance_exists(self, "health")) {
        health -= 10;
    }
}

// ✅ BETTER: Use parent object or specific object
with (objCreature) {  // All creatures have health
    health -= 10;
}
```

---

### Problem: String Concatenation Type Errors

**Symptom**: "cannot concatenate number to string" errors

**Cause**: Trying to concatenate number directly to string

**Solution**: Use `string()` to convert:
```gml
// ❌ WRONG: Can't concatenate number to string
var _msg = "Health: " + health;

// ✅ CORRECT: Convert to string first
var _msg = "Health: " + string(health);

// ✅ ALSO CORRECT: String concatenation operator
var _msg = $"Health: {health}";  // GMS 2.3+ template strings
```

---

### Problem: = vs == Confusion

**Symptom**: Conditions always true, unexpected assignments

**Cause**: Using `=` (assignment) instead of `==` (comparison)

**Solution**: Use `==` for comparisons:
```gml
// ❌ WRONG: This ASSIGNS health to 0, doesn't compare!
if (health = 0) {
    die();
}
// Result: health is now 0, and condition is true!

// ✅ CORRECT: Use == for comparison
if (health == 0) {
    die();
}
```

---

## Memory Management

### Problem: ds_list/ds_map/ds_grid Memory Leaks

**Symptom**: Game slows down over time, memory usage increases

**Cause**: Creating data structures but never destroying them

**Solution**: ALWAYS destroy data structures when done:
```gml
// ❌ WRONG: Memory leak!
var _list = ds_list_create();
ds_list_add(_list, 1, 2, 3);
// _list is never destroyed!

// ✅ CORRECT: Destroy when done
var _list = ds_list_create();
ds_list_add(_list, 1, 2, 3);
// ... use list ...
ds_list_destroy(_list);  // CRITICAL!

// ✅ BETTER: Use arrays instead (GMS 2.3+)
var _arr = [1, 2, 3];  // No manual cleanup needed
```

**Cleanup Pattern for Instance Variables**:
```gml
// Create Event
inventory_list = ds_list_create();

// Clean Up Event (runs when instance destroyed)
ds_list_destroy(inventory_list);
```

---

### Problem: Surface Leaks

**Symptom**: "Out of video memory" errors, surfaces disappear

**Cause**: Creating surfaces but not freeing them

**Solution**: Always free surfaces AND recreate if they don't exist:
```gml
// Create Event
game_surface = -1;

// Step Event (surfaces can be destroyed by OS!)
if (!surface_exists(game_surface)) {
    game_surface = surface_create(1920, 1080);
}

// Clean Up Event
if (surface_exists(game_surface)) {
    surface_free(game_surface);
}

// Draw Event
if (surface_exists(game_surface)) {
    surface_set_target(game_surface);
    // ... draw to surface ...
    surface_reset_target();

    draw_surface(game_surface, 0, 0);
}
```

**Critical**: Surfaces can be destroyed by OS (alt-tab, screen resize). Always check `surface_exists()`!

---

### Problem: Buffer Leaks

**Symptom**: Memory usage increases, networking slows down

**Cause**: Creating buffers but not deleting them

**Solution**: Delete buffers when done:
```gml
// ❌ WRONG: Buffer leak
var _buff = buffer_create(256, buffer_fixed, 1);
buffer_write(_buff, buffer_string, "Hello");
// _buff is never deleted!

// ✅ CORRECT: Delete buffer
var _buff = buffer_create(256, buffer_fixed, 1);
buffer_write(_buff, buffer_string, "Hello");
// ... use buffer ...
buffer_delete(_buff);  // CRITICAL!
```

---

### Problem: Particle System Leaks

**Symptom**: FPS drops over time, particle effects multiply

**Cause**: Creating particle systems/types/emitters but not destroying them

**Solution**: Destroy all particle components:
```gml
// Create Event
particle_sys = part_system_create();
particle_type = part_type_create();
particle_emit = part_emitter_create(particle_sys);

// Clean Up Event
part_emitter_destroy(particle_sys, particle_emit);
part_type_destroy(particle_type);
part_system_destroy(particle_sys);
```

---

## Performance Issues

### Problem: Drawing in Step Event

**Symptom**: "Drawing in Step Event" warnings, rendering issues

**Cause**: Calling draw functions outside Draw events

**Solution**: Move all drawing to Draw/Draw GUI events:
```gml
// ❌ WRONG: Drawing in Step Event
// Step Event
draw_sprite(sprPlayer, 0, x, y);  // Don't draw here!

// ✅ CORRECT: Draw in Draw Event
// Draw Event
draw_sprite(sprPlayer, 0, x, y);
```

**Valid Draw Events**:
- Draw (Draw_0.gml) - World drawing
- Draw GUI (Draw_64.gml) - HUD/UI drawing
- Draw Begin/End - Special draw setup/cleanup

---

### Problem: Excessive Collision Checks

**Symptom**: FPS drops when many instances exist

**Cause**: Checking collision every frame for all instances

**Solution**: Optimize collision checks:
```gml
// ❌ BAD: Checks collision with EVERY enemy instance
with (objEnemy) {
    if (place_meeting(x, y, objPlayer)) {
        // Handle collision
    }
}

// ✅ BETTER: Use collision event instead
// objPlayer - Collision with objEnemy event
// Automatically triggered only for actual collisions

// ✅ ALSO GOOD: Check distance first
with (objEnemy) {
    if (distance_to_object(objPlayer) < 64) {
        if (place_meeting(x, y, objPlayer)) {
            // Handle collision
        }
    }
}
```

---

### Problem: Creating/Destroying Instances Every Frame

**Symptom**: FPS drops, stuttering

**Cause**: Repeatedly creating and destroying instances

**Solution**: Use object pooling:
```gml
// ❌ BAD: Create/destroy every frame
// Step Event
instance_destroy(objBullet);  // Destroy old bullet
instance_create_depth(x, y, 0, objBullet);  // Create new bullet

// ✅ GOOD: Reuse instances (object pooling)
// Get inactive bullet from pool, reset position
with (objBulletPool) {
    var _bullet = get_bullet(other.x, other.y);
}

// ✅ BEST: For new instances, use struct parameter (no with/other needed!)
var _bullet = instance_create_depth(x, y, -100, objBullet, {
    speed: shoot_speed,
    direction: image_angle,
    owner: id
});
// Variables set BEFORE Create event runs - cleaner than with()/other
```

See [GML_REFERENCE.md - Object Pooling](#object-pooling) for implementation.

---

### Problem: Inefficient String Building

**Symptom**: FPS drops when building large strings

**Cause**: String concatenation in loop creates new string each iteration

**Solution**: Use array then join (GMS 2.3+):
```gml
// ❌ BAD: Very slow for large loops
var _str = "";
for (var i = 0; i < 10000; i++) {
    _str += "x";  // Creates new string each time!
}

// ✅ GOOD: Use array then join
var _parts = [];
for (var i = 0; i < 10000; i++) {
    array_push(_parts, "x");
}
var _str = string_join("", _parts);  // Much faster
```

---

### Problem: Too Many Draw Calls

**Symptom**: Low FPS despite few instances

**Cause**: Changing sprite/color/alpha between each draw call

**Solution**: Batch similar draw calls:
```gml
// ❌ BAD: Changes blend mode 100 times
for (var i = 0; i < 100; i++) {
    draw_set_blend_mode(bm_add);
    draw_sprite(sprStar, 0, _x[i], _y[i]);
    draw_set_blend_mode(bm_normal);
}

// ✅ GOOD: Set blend mode once
draw_set_blend_mode(bm_add);
for (var i = 0; i < 100; i++) {
    draw_sprite(sprStar, 0, _x[i], _y[i]);
}
draw_set_blend_mode(bm_normal);
```

---

## Collision Detection

### Problem: Collision Not Detected

**Symptom**: Objects pass through each other

**Cause**: Multiple possible causes

**Solutions**:

1. **Check sprite has collision mask**:
   - Sprite properties → Collision Mask → should not be empty

2. **Check object is visible**:
   - Hidden objects may not collide in some events

3. **Speed too high**:
   - Object moves so fast it skips over collision
   - Solution: Use `move_contact_solid()` or divide movement into smaller steps

```gml
// ❌ BAD: Fast movement can skip collision
if (!place_meeting(x + hspeed, y, objWall)) {
    x += hspeed;  // If hspeed is 20, might skip thin walls
}

// ✅ GOOD: Check collision in steps
var _steps = abs(hspeed);
var _sign = sign(hspeed);
repeat (_steps) {
    if (!place_meeting(x + _sign, y, objWall)) {
        x += _sign;
    } else {
        break;
    }
}
```

4. **Using wrong collision function**:
   - `place_meeting()` - checks mask
   - `position_meeting()` - checks exact position (bounding box center)
   - `collision_point()` - checks precise pixel

---

### Problem: Sticking to Walls

**Symptom**: Player gets stuck against walls when moving diagonally

**Cause**: Checking both X and Y movement together

**Solution**: Check X and Y movement separately:
```gml
// ❌ BAD: Checks diagonal movement together
if (!place_meeting(x + hspeed, y + vspeed, objWall)) {
    x += hspeed;
    y += vspeed;
}
// If diagonal movement blocked, no movement at all!

// ✅ GOOD: Check X and Y separately
if (!place_meeting(x + hspeed, y, objWall)) {
    x += hspeed;
}

if (!place_meeting(x, y + vspeed, objWall)) {
    y += vspeed;
}
// Can slide along walls
```

---

## Networking Issues

### Problem: Forgetting Async Networking Event

**Symptom**: Network functions don't work, no data received

**Cause**: Not creating Async - Networking event in network objects

**Solution**: Add Async - Networking event (Async_68.gml):
```gml
// objServer or objClient - Async Networking Event (Async_68.gml)
var _type = async_load[? "type"];

switch (_type) {
    case network_type_connect:
        // Handle connection
        break;

    case network_type_disconnect:
        // Handle disconnection
        break;

    case network_type_data:
        // Handle data
        break;
}
```

---

### Problem: Not Cleaning Up Network Resources

**Symptom**: "Too many sockets" errors, connection failures

**Cause**: Creating sockets/servers but not destroying them

**Solution**: Always destroy network resources:
```gml
// Create Event
server = network_create_server(network_socket_tcp, 6510, 32);

// Clean Up Event
network_destroy(server);  // CRITICAL!

// Room End Event (if server should close on room change)
network_destroy(server);
```

---

### Problem: Buffer Type Mismatches

**Symptom**: Garbage data received, crashes

**Cause**: Writing buffer_u8 but reading buffer_u16, etc.

**Solution**: ALWAYS match write/read types:
```gml
// Sender
var _buff = buffer_create(256, buffer_fixed, 1);
buffer_write(_buff, buffer_u8, 1);       // Write u8
buffer_write(_buff, buffer_string, "Hello");
network_send_packet(socket, _buff, buffer_tell(_buff));
buffer_delete(_buff);

// Receiver
var _buff = async_load[? "buffer"];
buffer_seek(_buff, buffer_seek_start, 0);
var _msg_type = buffer_read(_buff, buffer_u8);       // Read u8 (matches!)
var _msg_text = buffer_read(_buff, buffer_string);   // Read string (matches!)
```

**Common Type Pairs**:
- buffer_u8 (0-255) / buffer_s8 (-128 to 127)
- buffer_u16 (0-65535) / buffer_s16 (-32768 to 32767)
- buffer_u32 / buffer_s32
- buffer_f32 (32-bit float)
- buffer_string (null-terminated string)

---

## Shader Issues

### Problem: Shader Doesn't Appear

**Symptom**: Shader has no visible effect

**Cause**: Multiple possible causes

**Solutions**:

1. **Forgot to set shader**:
```gml
// ❌ WRONG: Shader never set
draw_sprite(sprPlayer, 0, x, y);  // No shader applied!

// ✅ CORRECT: Set shader before drawing
shader_set(shdGrayscale);
draw_sprite(sprPlayer, 0, x, y);
shader_reset();
```

2. **Forgot to reset shader**:
```gml
// ❌ WRONG: Shader affects all subsequent drawing!
shader_set(shdGrayscale);
draw_sprite(sprPlayer, 0, x, y);
// shader_reset() forgotten!
// Now EVERYTHING is grayscale!

// ✅ CORRECT: Always reset
shader_set(shdGrayscale);
draw_sprite(sprPlayer, 0, x, y);
shader_reset();  // CRITICAL!
```

---

### Problem: Uniform Name Mismatch

**Symptom**: "Uniform not found" warnings, shader behaves incorrectly

**Cause**: Uniform name in GML doesn't match shader code

**Solution**: Ensure exact name match:
```glsl
// Shader Code
uniform float u_time;
uniform vec3 u_color;
```

```gml
// GML Code
var _u_time = shader_get_uniform(shdEffect, "u_time");    // Exact match!
var _u_color = shader_get_uniform(shdEffect, "u_color");  // Exact match!

shader_set(shdEffect);
shader_set_uniform_f(_u_time, current_time / 1000);
shader_set_uniform_f_array(_u_color, [1.0, 0.5, 0.0]);
```

**Common Mistake**: Typo in uniform name
- Shader: `u_time`
- GML: `u_Time` (wrong - case sensitive!)

---

### Problem: GLSL ES Compatibility

**Symptom**: Shader works on desktop but fails on mobile/HTML5

**Cause**: Using GLSL features not available in GLSL ES

**Solution**: Use GLSL ES compatible code:
```glsl
// ❌ WRONG: Desktop GLSL (won't work on mobile)
#version 330
out vec4 FragColor;

void main() {
    FragColor = vec4(1.0, 0.0, 0.0, 1.0);
}

// ✅ CORRECT: GLSL ES (works everywhere)
precision mediump float;

varying vec2 v_vTexcoord;

void main() {
    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
}
```

**Key Differences**:
- Use `gl_FragColor` not `out vec4 FragColor`
- Always specify precision: `precision mediump float;`
- Use `varying` not `in`/`out` (except for vertex inputs)

---

## Rendering Issues

### Problem: Font State Bleeding Between Objects

**Symptom**:
- Text uses wrong font unexpectedly
- Text appears correct AFTER opening menus, but wrong at game start
- Some objects' text looks correct while others use default font

**Cause**: Not setting font at the beginning of Draw GUI event, causing font state to bleed from other objects

**How GameMaker Font State Works**:
1. **Default State**: Without `draw_set_font()`, GameMaker uses the default system font
2. **Global State**: `draw_set_font(fntA)` affects ALL subsequent drawing until another `draw_set_font()` call
3. **Bleed Across Objects**: If objMenu calls `draw_set_font(fntMenu)`, then objHUD's draw event runs without setting font, objHUD uses fntMenu (unintended!)

**Example of the Problem**:
```gml
// === objMenu Draw GUI Event ===
draw_set_font(fntMenuLarge);
draw_text(100, 50, "Main Menu");  // Uses fntMenuLarge ✅

// === objHUD Draw GUI Event (runs AFTER objMenu) ===
// ❌ NO draw_set_font() call!
draw_text(10, 10, "HP: 100");  // Uses fntMenuLarge from objMenu ❌ (unintended!)
```

**Why Opening Menus "Fixes" It**:
- Menu's draw event sets a font
- That font bleeds to other draw events
- Creates illusion that fonts are working (but only by accident)

**Solution**: ALWAYS set font at the top of EVERY draw event:

```gml
/// @description objHUD - Draw GUI Event - CORRECT
// ✅ Set font FIRST, EVERY TIME
draw_set_font(fntGameFont);

// Now guaranteed to use fntGameFont, regardless of other objects' fonts
draw_text(10, 10, "HP: " + string(player.hp));
draw_text(10, 30, "MP: " + string(player.mana));
```

```gml
/// @description objMenu - Draw GUI Event - CORRECT
// ✅ Set font explicitly
draw_set_font(fntMenuLarge);

draw_text(100, 50, "Main Menu");
```

**Best Practice**:
- Set font at the TOP of EVERY Draw_64.gml (Draw GUI) event
- Set font at the TOP of EVERY Draw_0.gml (Draw) event
- NEVER assume font state from other objects or previous frames
- Treat font state as global and volatile (like `draw_set_color()`, `draw_set_alpha()`)

**Related Global States** (also need explicit setting):
- `draw_set_color()` - Color bleeds between objects
- `draw_set_alpha()` - Alpha bleeds between objects
- `draw_set_halign() / draw_set_valign()` - Alignment bleeds between objects
- `gpu_set_blendmode()` - Blend mode bleeds between objects

**Rule of Thumb**: Any `draw_set_*()` or `gpu_set_*()` function affects GLOBAL state and must be set explicitly in each draw event.

---

## Event Order Confusion

### Problem: Variables Not Initialized Yet

**Symptom**: "Undefined variable" errors, wrong initial values, objects trying to access globals that don't exist yet

**Cause**: Misunderstanding when Room Creation Code executes relative to Create Events

**Official Order** ([GameMaker Event Order](https://manual.gamemaker.io/lts/en/The_Asset_Editors/Object_Properties/Event_Order.htm)):

---

#### Room Entry Event Sequence

When entering a room:

**Step 1-2: For EACH instance (in Instance Creation Order):**
1. **Create Event** - Object variables initialize, Create Event executes
2. **Instance Creation Code** - Per-instance code set in IDE (if exists)

**Step 3-5: After ALL instances complete Step 1-2:**
3. **Game Start Event** - First room only (or after `game_restart()`)
4. **Room Creation Code** - RoomCreationCode.gml executes
5. **Room Start Event** - All instances' Room Start (Other_4)

---

#### Every Step/Frame Event Sequence

After initialization, every frame:

1. **Begin Step Event**
2. **Timelines**
3. **Time Sources** (ticks/callbacks)
4. **Alarms**
5. **Keyboard/Mouse/Gesture Events**
6. **Step Event**
7. **Path Ended/Animation Ended/Room End**
8. **End Step Event**
9. **Pre-Draw Event**
10. **Draw Begin Event**
11. **Draw Event**
12. **Draw End Event**
13. **Post-Draw Event**
14. **Draw GUI Begin Event**
15. **Draw GUI Event**
16. **Draw GUI End Event**

---

### Common Mistakes

**❌ WRONG**: Setting globals in Room Creation Code for Create Events to read
```gml
// Room Creation Code
global.dungeon_id = "cave_level_1";  // TOO LATE!

// objDungeonGenerator Create Event (runs BEFORE Room Creation Code!)
var _id = global.dungeon_id;  // ERROR: Not set yet!
```

**✅ CORRECT**: Set globals BEFORE entering room
```gml
// Before room_goto()
global.dungeon_id = "cave_level_1";
room_goto(rmGameplay);

// objDungeonGenerator Create Event
var _id = global.dungeon_id;  // OK: Set before room entered
```

**✅ ALSO CORRECT**: Use persistent object
```gml
// objController (persistent) - survives room transitions
global.dungeon_id = "cave_level_1";

// Later, in any room
room_goto(rmGameplay);  // Global already set by persistent object
```

---

### Event Timing Best Practices

**Begin Step**: Use for input/decisions BEFORE game logic
```gml
// Begin Step: Process input
if (keyboard_check_pressed(vk_space)) {
    wants_to_jump = true;
}
```

**Step**: Use for main game logic
```gml
// Step: Apply jump
if (wants_to_jump && on_ground) {
    vspeed = -jump_power;
    wants_to_jump = false;
}
```

**End Step**: Use for cleanup/camera AFTER game logic
```gml
// End Step: Camera follows player (after player moved)
camera_x = objPlayer.x - (camera_width / 2);
camera_y = objPlayer.y - (camera_height / 2);
```

**Draw GUI**: Use for HUD (fixed screen position)
```gml
// Draw GUI: Health bar always top-left
draw_sprite(sprHealthBar, 0, 10, 10);
```

---

### Problem: Draw Order Issues

**Symptom**: Objects drawn in wrong order (behind/in front)

**Cause**: Depth values wrong

**Solution**: Lower depth = drawn in front:
```gml
// Depth values (lower = front)
depth = -1000;  // Very front (UI, effects)
depth = 0;      // Middle (player, enemies)
depth = 1000;   // Very back (backgrounds)

// Example
objPlayer.depth = 0;     // Player
objEnemy.depth = 10;     // Enemies (behind player)
objShadow.depth = 100;   // Shadows (behind everything)
objGUI.depth = -1000;    // GUI (in front of everything)
```

---

### Problem: Alarm Not Triggering

**Symptom**: Alarm event code never runs

**Cause**: Multiple possible causes

**Solutions**:

1. **Forgot to set alarm**:
```gml
// ❌ WRONG: Alarm event exists but never set
// Alarm 0 Event
show_message("This never runs!");

// ✅ CORRECT: Set alarm first
// Create Event or other event
alarm[0] = 60;  // Trigger after 60 steps

// Alarm 0 Event
show_message("This runs after 60 steps!");
```

2. **Instance destroyed before alarm triggers**:
```gml
// Create Event
alarm[0] = 60;
instance_destroy();  // Destroyed immediately, alarm never triggers!
```

3. **Alarm already running**:
```gml
// Step Event (runs every frame)
if (keyboard_check_pressed(vk_space)) {
    alarm[0] = 60;  // Resets alarm every time space pressed
}

// May never trigger if space pressed repeatedly!
```

**Solution**: Check if alarm is running:
```gml
if (alarm[0] <= 0) {  // Not running
    alarm[0] = 60;
}
```

---

## Common Logic Errors

### Problem: Infinite Loops

**Symptom**: Game freezes, "Script timeout" errors

**Cause**: While loop never exits

**Solution**: Ensure loop has exit condition:
```gml
// ❌ WRONG: Infinite loop!
while (true) {
    x += 1;  // Runs forever, game freezes!
}

// ✅ CORRECT: Loop has exit condition
var _attempts = 0;
while (_attempts < 100) {
    if (find_target()) {
        break;  // Found target, exit loop
    }
    _attempts++;
}

// ✅ ALSO GOOD: Use for loop with limit
for (var i = 0; i < 100; i++) {
    if (find_target()) {
        break;
    }
}
```

---

### Problem: Off-by-One Errors

**Symptom**: Array out of bounds, loop runs too many/few times

**Cause**: Wrong loop bounds

**Solution**: Remember arrays are 0-indexed:
```gml
var _arr = [10, 20, 30, 40, 50];  // Indices: 0, 1, 2, 3, 4

// ❌ WRONG: Goes out of bounds (i = 5 doesn't exist)
for (var i = 0; i <= array_length(_arr); i++) {
    var _val = _arr[i];  // Crashes when i = 5
}

// ✅ CORRECT: Use < not <=
for (var i = 0; i < array_length(_arr); i++) {
    var _val = _arr[i];  // i goes 0-4, perfect
}
```

---

### Problem: Modifying Collection While Iterating

**Symptom**: Skipped elements, crashes

**Cause**: Deleting from array/list while looping

**Solution**: Iterate backwards or use separate deletion list:
```gml
// ❌ WRONG: Forward iteration + deletion
for (var i = 0; i < array_length(enemies); i++) {
    if (enemies[i].health <= 0) {
        array_delete(enemies, i, 1);  // Skips next element!
    }
}

// ✅ CORRECT: Backward iteration
for (var i = array_length(enemies) - 1; i >= 0; i--) {
    if (enemies[i].health <= 0) {
        array_delete(enemies, i, 1);  // Safe when going backwards
    }
}

// ✅ ALSO CORRECT: Collect indices to delete, then delete
var _to_delete = [];
for (var i = 0; i < array_length(enemies); i++) {
    if (enemies[i].health <= 0) {
        array_push(_to_delete, i);
    }
}

// Delete backwards
for (var i = array_length(_to_delete) - 1; i >= 0; i--) {
    array_delete(enemies, _to_delete[i], 1);
}
```

---

### Problem: Persistent Object Doesn't Reset

**Symptom**: Object keeps state from previous room

**Cause**: Object is persistent, survives room change

**Solution**: Either make non-persistent OR manually reset:
```gml
// Option 1: Make non-persistent
// In .yy file:
"persistent": false

// Option 2: Reset in Room Start Event
// Room Start Event
health = max_health;
x = xstart;
y = ystart;
// Reset other variables...
```

---

### Problem: Integer Division Truncation

**Symptom**: Math results always whole numbers

**Cause**: Dividing integers truncates decimal

**Solution**: Use real numbers:
```gml
// ❌ WRONG: Integer division
var _half = 5 / 2;  // Result: 2 (not 2.5!)

// ✅ CORRECT: Use real numbers
var _half = 5 / 2.0;  // Result: 2.5

// ✅ ALSO CORRECT: Cast to real
var _half = real(5) / real(2);  // Result: 2.5
```

---

### Problem: Floating Point Precision

**Symptom**: Equality checks fail, values "close enough" not equal

**Cause**: Floating point arithmetic imprecision

**Solution**: Use epsilon comparison:
```gml
// ❌ WRONG: Direct float comparison
if (x == 100.0) {  // May never be true!
    // x might be 99.999999 or 100.000001
}

// ✅ CORRECT: Epsilon comparison
var _epsilon = 0.001;
if (abs(x - 100.0) < _epsilon) {  // True if close enough
    // x is approximately 100
}
```

---

**End of Common Pitfalls Guide**

For more information, see:
- [GML_REFERENCE.md](GML_REFERENCE.md) - Complete GML function reference
- [Official GameMaker Manual](https://manual.gamemaker.io/) - Official documentation

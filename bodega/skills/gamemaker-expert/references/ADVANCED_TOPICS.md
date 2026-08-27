# Advanced GameMaker Topics

Comprehensive guide to advanced GameMaker development including shaders, networking, platform-specific features, and performance optimization.

---

## Table of Contents

1. [Shader Programming](#shader-programming)
2. [Networking Patterns](#networking-patterns)
3. [Platform-Specific Development](#platform-specific-development)
4. [Advanced Graphics](#advanced-graphics)
5. [Performance Profiling](#performance-profiling)

---

## Shader Programming

### GLSL ES Basics

GameMaker uses **GLSL ES** (OpenGL ES Shading Language) for cross-platform compatibility.

**Key Constraints**:
- GLSL ES 1.0 (based on GLSL 1.20)
- No `in`/`out` keywords for fragment shader (use `varying` and `gl_FragColor`)
- Must specify precision: `precision mediump float;`
- Limited texture units (usually 8)
- No 3D textures, texture arrays, or compute shaders

---

### Shader File Structure

**Vertex Shader** (`.vsh` file):
```glsl
//
// Simple passthrough vertex shader
//
attribute vec3 in_Position;        // (x, y, z)
attribute vec4 in_Colour;          // (r, g, b, a)
attribute vec2 in_TextureCoord;    // (u, v)

varying vec2 v_vTexcoord;
varying vec4 v_vColour;

void main()
{
    vec4 object_space_pos = vec4(in_Position.x, in_Position.y, in_Position.z, 1.0);
    gl_Position = gm_Matrices[MATRIX_WORLD_VIEW_PROJECTION] * object_space_pos;

    v_vColour = in_Colour;
    v_vTexcoord = in_TextureCoord;
}
```

**Fragment Shader** (`.fsh` file):
```glsl
//
// Simple passthrough fragment shader
//
precision mediump float;

varying vec2 v_vTexcoord;
varying vec4 v_vColour;

void main()
{
    gl_FragColor = v_vColour * texture2D(gm_BaseTexture, v_vTexcoord);
}
```

---

### Built-in Shader Variables

**Vertex Shader**:
```glsl
// Attributes (input from GameMaker)
attribute vec3 in_Position;
attribute vec3 in_Normal;
attribute vec4 in_Colour;
attribute vec2 in_TextureCoord;

// Matrices (provided by GameMaker)
uniform mat4 gm_Matrices[MATRIX_MAX];
// MATRIX_WORLD (0)
// MATRIX_VIEW (1)
// MATRIX_PROJECTION (2)
// MATRIX_WORLD_VIEW (3)
// MATRIX_WORLD_VIEW_PROJECTION (4)

// Varyings (output to fragment shader)
varying vec2 v_vTexcoord;
varying vec4 v_vColour;
```

**Fragment Shader**:
```glsl
// Varyings (input from vertex shader)
varying vec2 v_vTexcoord;
varying vec4 v_vColour;

// Built-in textures
uniform sampler2D gm_BaseTexture;  // Current sprite/surface texture

// Output
gl_FragColor  // Output color (RGBA)
```

---

### Common Shader Effects

#### Grayscale Shader

```glsl
// Fragment Shader
precision mediump float;

varying vec2 v_vTexcoord;
varying vec4 v_vColour;

void main()
{
    vec4 color = texture2D(gm_BaseTexture, v_vTexcoord);

    // Luminance formula (perceptual brightness)
    float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));

    gl_FragColor = v_vColour * vec4(vec3(gray), color.a);
}
```

#### Outline Shader

```glsl
// Fragment Shader
precision mediump float;

varying vec2 v_vTexcoord;
varying vec4 v_vColour;

uniform vec2 u_texel_size;    // 1.0 / texture_size
uniform vec4 u_outline_color;
uniform float u_outline_width;

void main()
{
    vec4 color = texture2D(gm_BaseTexture, v_vTexcoord);

    // Sample surrounding pixels
    float alpha_sum = 0.0;
    for (float x = -u_outline_width; x <= u_outline_width; x++) {
        for (float y = -u_outline_width; y <= u_outline_width; y++) {
            vec2 offset = vec2(x, y) * u_texel_size;
            alpha_sum += texture2D(gm_BaseTexture, v_vTexcoord + offset).a;
        }
    }

    // If any surrounding pixel has alpha, draw outline
    if (color.a == 0.0 && alpha_sum > 0.0) {
        gl_FragColor = u_outline_color;
    } else {
        gl_FragColor = v_vColour * color;
    }
}
```

**GML Usage**:
```gml
// Get uniform locations (in Create Event)
u_texel_size = shader_get_uniform(shdOutline, "u_texel_size");
u_outline_color = shader_get_uniform(shdOutline, "u_outline_color");
u_outline_width = shader_get_uniform(shdOutline, "u_outline_width");

// Draw with shader
shader_set(shdOutline);

var _sprite = sprite_get_texture(sprPlayer, 0);
var _tex_width = texture_get_texel_width(_sprite);
var _tex_height = texture_get_texel_height(_sprite);

shader_set_uniform_f(u_texel_size, _tex_width, _tex_height);
shader_set_uniform_f_array(u_outline_color, [1.0, 1.0, 1.0, 1.0]);  // White
shader_set_uniform_f(u_outline_width, 1.0);

draw_sprite(sprPlayer, 0, x, y);
shader_reset();
```

#### Wave Distortion Shader

```glsl
// Fragment Shader
precision mediump float;

varying vec2 v_vTexcoord;
varying vec4 v_vColour;

uniform float u_time;
uniform float u_wave_amount;
uniform float u_wave_speed;
uniform float u_wave_frequency;

void main()
{
    vec2 uv = v_vTexcoord;

    // Apply wave distortion
    float wave = sin(uv.y * u_wave_frequency + u_time * u_wave_speed) * u_wave_amount;
    uv.x += wave;

    vec4 color = texture2D(gm_BaseTexture, uv);
    gl_FragColor = v_vColour * color;
}
```

**GML Usage**:
```gml
// Create Event
u_time = shader_get_uniform(shdWave, "u_time");
u_wave_amount = shader_get_uniform(shdWave, "u_wave_amount");
u_wave_speed = shader_get_uniform(shdWave, "u_wave_speed");
u_wave_frequency = shader_get_uniform(shdWave, "u_wave_frequency");

// Draw Event
shader_set(shdWave);
shader_set_uniform_f(u_time, current_time / 1000);
shader_set_uniform_f(u_wave_amount, 0.01);
shader_set_uniform_f(u_wave_speed, 2.0);
shader_set_uniform_f(u_wave_frequency, 10.0);

draw_sprite(sprWater, 0, x, y);
shader_reset();
```

#### Glow/Bloom Shader

```glsl
// Fragment Shader
precision mediump float;

varying vec2 v_vTexcoord;
varying vec4 v_vColour;

uniform vec2 u_texel_size;
uniform float u_glow_intensity;

void main()
{
    vec4 color = texture2D(gm_BaseTexture, v_vTexcoord);

    // Simple box blur
    vec4 blur = vec4(0.0);
    float samples = 0.0;

    for (float x = -2.0; x <= 2.0; x++) {
        for (float y = -2.0; y <= 2.0; y++) {
            vec2 offset = vec2(x, y) * u_texel_size;
            blur += texture2D(gm_BaseTexture, v_vTexcoord + offset);
            samples += 1.0;
        }
    }

    blur /= samples;

    // Add glow to bright areas
    vec4 glow = blur * u_glow_intensity;
    gl_FragColor = v_vColour * (color + glow);
}
```

---

### Multi-Pass Rendering

For complex effects like blur, use multiple passes:

```gml
// Create Event
blur_surface = -1;
blur_passes = 3;

// Draw Event
if (!surface_exists(blur_surface)) {
    blur_surface = surface_create(sprite_width, sprite_height);
}

// First pass: Draw sprite to surface
surface_set_target(blur_surface);
draw_clear_alpha(c_black, 0);
draw_sprite(sprGlow, 0, 0, 0);
surface_reset_target();

// Multiple blur passes
shader_set(shdBlur);
for (var i = 0; i < blur_passes; i++) {
    surface_set_target(blur_surface);
    draw_surface(blur_surface, 0, 0);
    surface_reset_target();
}
shader_reset();

// Draw result
draw_surface(blur_surface, x, y);
```

---

### Shader Debugging

**Common Issues**:

1. **Shader compiles but nothing renders**:
   - Check `gl_FragColor` is being set
   - Check alpha channel (might be 0)
   - Verify texture coordinates are correct

2. **Shader works on desktop but not mobile**:
   - Check precision qualifiers (`precision mediump float;`)
   - Avoid desktop-only GLSL features
   - Test on actual device, not just emulator

3. **"Uniform not found" warnings**:
   - Verify uniform name matches exactly (case-sensitive)
   - Check uniform is actually used in shader (unused uniforms may be optimized out)

**Debug Techniques**:
```glsl
// Output texture coordinates as color
gl_FragColor = vec4(v_vTexcoord, 0.0, 1.0);

// Output red if condition true
if (some_condition) {
    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
    return;
}

// Visualize normal vectors
gl_FragColor = vec4(normal * 0.5 + 0.5, 1.0);
```

---

## Networking Patterns

### Client-Server Architecture

**Server Object** (objServer):
```gml
// Create Event
server = network_create_server(network_socket_tcp, 6510, 32);
clients = ds_map_create();  // socket_id → client_data

// Clean Up Event
ds_map_destroy(clients);
network_destroy(server);

// Async - Networking Event
var _type = async_load[? "type"];
var _socket = async_load[? "socket"];

switch (_type) {
    case network_type_connect:
        show_debug_message("Client connected: " + string(_socket));

        // Store client data
        clients[? _socket] = {
            socket: _socket,
            player_name: "Player" + string(_socket),
            x: 400,
            y: 300,
            connected_time: current_time
        };

        // Send welcome message
        send_packet(_socket, MSG_WELCOME, { server_name: "My Server" });
        break;

    case network_type_disconnect:
        show_debug_message("Client disconnected: " + string(_socket));
        ds_map_delete(clients, _socket);
        break;

    case network_type_data:
        var _buffer = async_load[? "buffer"];
        handle_packet(_socket, _buffer);
        break;
}
```

**Client Object** (objClient):
```gml
// Create Event
socket = network_create_socket(network_socket_tcp);
network_connect(socket, "127.0.0.1", 6510);
connected = false;

// Clean Up Event
network_destroy(socket);

// Async - Networking Event
var _type = async_load[? "type"];

switch (_type) {
    case network_type_connect:
        show_debug_message("Connected to server!");
        connected = true;

        // Send player info
        send_packet(socket, MSG_JOIN, { player_name: "Hero" });
        break;

    case network_type_disconnect:
        show_debug_message("Disconnected from server");
        connected = false;
        break;

    case network_type_data:
        var _buffer = async_load[? "buffer"];
        handle_packet(_buffer);
        break;
}
```

---

### Packet Structure

**Message Type Enum**:
```gml
enum MSG {
    WELCOME,      // Server → Client: Welcome message
    JOIN,         // Client → Server: Join request
    PLAYER_MOVE,  // Client → Server: Player movement
    WORLD_STATE,  // Server → Clients: World state update
    CHAT,         // Bidirectional: Chat message
    DISCONNECT    // Client → Server: Graceful disconnect
}
```

**Sending Packets**:
```gml
function send_packet(_socket, _msg_type, _data) {
    var _buff = buffer_create(256, buffer_grow, 1);

    // Write message type
    buffer_write(_buff, buffer_u8, _msg_type);

    // Write data based on message type
    switch (_msg_type) {
        case MSG.PLAYER_MOVE:
            buffer_write(_buff, buffer_f32, _data.x);
            buffer_write(_buff, buffer_f32, _data.y);
            buffer_write(_buff, buffer_f32, _data.direction);
            break;

        case MSG.CHAT:
            buffer_write(_buff, buffer_string, _data.message);
            break;

        case MSG.JOIN:
            buffer_write(_buff, buffer_string, _data.player_name);
            break;
    }

    // Send packet
    network_send_packet(_socket, _buff, buffer_tell(_buff));
    buffer_delete(_buff);
}
```

**Receiving Packets**:
```gml
function handle_packet(_socket, _buffer) {
    // Reset buffer position
    buffer_seek(_buffer, buffer_seek_start, 0);

    // Read message type
    var _msg_type = buffer_read(_buffer, buffer_u8);

    // Handle based on type
    switch (_msg_type) {
        case MSG.PLAYER_MOVE:
            var _x = buffer_read(_buffer, buffer_f32);
            var _y = buffer_read(_buffer, buffer_f32);
            var _dir = buffer_read(_buffer, buffer_f32);

            // Update player position
            update_player_position(_socket, _x, _y, _dir);
            break;

        case MSG.CHAT:
            var _message = buffer_read(_buffer, buffer_string);
            show_chat_message(_message);
            break;

        case MSG.WELCOME:
            var _server_name = buffer_read(_buffer, buffer_string);
            show_debug_message("Welcome to " + _server_name);
            break;
    }
}
```

---

### Latency Compensation

**Client-Side Prediction**:
```gml
// Client predicts movement locally, then reconciles with server
// Step Event (Client)
if (connected) {
    // Predict movement
    var _input_h = keyboard_check(vk_right) - keyboard_check(vk_left);
    var _input_v = keyboard_check(vk_down) - keyboard_check(vk_up);

    x += _input_h * move_speed;
    y += _input_v * move_speed;

    // Send movement to server
    if (_input_h != 0 || _input_v != 0) {
        send_packet(socket, MSG.PLAYER_MOVE, { x: x, y: y, direction: direction });
    }

    // Reconcile with server position (smoothly)
    if (server_x != undefined) {
        x = lerp(x, server_x, 0.2);
        y = lerp(y, server_y, 0.2);
    }
}
```

**Server Authority**:
```gml
// Server validates and broadcasts state
// Async - Networking (Server)
case MSG.PLAYER_MOVE:
    var _x = buffer_read(_buffer, buffer_f32);
    var _y = buffer_read(_buffer, buffer_f32);

    // Validate movement (anti-cheat)
    var _client = clients[? _socket];
    var _dist = point_distance(_client.x, _client.y, _x, _y);

    if (_dist <= max_move_distance) {
        // Valid movement
        _client.x = _x;
        _client.y = _y;

        // Broadcast to all clients
        broadcast_world_state();
    } else {
        // Invalid movement (teleport/speed hack)
        show_debug_message("Client " + string(_socket) + " sent invalid movement");
    }
    break;
```

---

### Lobby System

```gml
// Server lobby management
lobbies = ds_list_create();  // List of lobby structs

function create_lobby(_name, _max_players) {
    var _lobby = {
        id: ds_list_size(lobbies),
        name: _name,
        max_players: _max_players,
        players: ds_list_create(),
        host: noone
    };

    ds_list_add(lobbies, _lobby);
    return _lobby.id;
}

function join_lobby(_socket, _lobby_id) {
    if (_lobby_id < 0 || _lobby_id >= ds_list_size(lobbies)) {
        return false;
    }

    var _lobby = lobbies[| _lobby_id];

    if (ds_list_size(_lobby.players) >= _lobby.max_players) {
        return false;  // Lobby full
    }

    ds_list_add(_lobby.players, _socket);

    if (_lobby.host == noone) {
        _lobby.host = _socket;  // First player is host
    }

    return true;
}

function broadcast_to_lobby(_lobby_id, _msg_type, _data) {
    var _lobby = lobbies[| _lobby_id];

    for (var i = 0; i < ds_list_size(_lobby.players); i++) {
        var _socket = _lobby.players[| i];
        send_packet(_socket, _msg_type, _data);
    }
}
```

---

## Platform-Specific Development

### Mobile (iOS/Android)

**Touch Input**:
```gml
// Step Event
if (device_mouse_check_button_pressed(0, mb_left)) {
    var _touch_x = device_mouse_x_to_gui(0);
    var _touch_y = device_mouse_y_to_gui(0);

    // Handle touch at (_touch_x, _touch_y)
}

// Multi-touch
for (var i = 0; i < 5; i++) {
    if (device_mouse_check_button_pressed(i, mb_left)) {
        var _touch_x = device_mouse_x_to_gui(i);
        var _touch_y = device_mouse_y_to_gui(i);

        show_debug_message("Touch " + string(i) + " at " + string(_touch_x) + ", " + string(_touch_y));
    }
}
```

**Accelerometer**:
```gml
// Step Event
if (os_type == os_android || os_type == os_ios) {
    var _accel_x = device_get_tilt_x();  // -1 to 1
    var _accel_y = device_get_tilt_y();
    var _accel_z = device_get_tilt_z();

    // Use for tilt controls
    x += _accel_x * 5;
}
```

**Virtual Buttons**:
```gml
// Create Event
virtual_key_add(20, 540, 120, 120, vk_left);   // Left button
virtual_key_add(140, 540, 120, 120, vk_right);  // Right button
virtual_key_add(900, 540, 120, 120, ord("A"));  // Action button

virtual_key_show(virtual_key_add(...));  // Show all buttons
```

**In-App Purchases (IAP)**:
```gml
// Purchase product
var _product_id = "com.mycompany.mygame.coins_100";
iap_activate(_product_id);

// Async - IAP Event
var _product_id = async_load[? "product_id"];
var _status = async_load[? "status"];

if (_status == iap_purchased) {
    show_debug_message("Purchased: " + _product_id);

    // Grant coins
    if (_product_id == "com.mycompany.mygame.coins_100") {
        coins += 100;
    }
}
```

---

### Console (PlayStation, Xbox, Nintendo Switch)

**Note**: Console development requires platform-specific SDK access and NDA.

**Gamepad Support**:
```gml
// Step Event
for (var i = 0; i < 4; i++) {
    if (gamepad_is_connected(i)) {
        var _h = gamepad_axis_value(i, gp_axislh);
        var _v = gamepad_axis_value(i, gp_axislv);

        var _deadzone = 0.2;
        if (abs(_h) > _deadzone || abs(_v) > _deadzone) {
            players[i].x += _h * 4;
            players[i].y += _v * 4;
        }

        if (gamepad_button_check_pressed(i, gp_face1)) {
            players[i].jump();
        }
    }
}
```

**Achievements**:
```gml
// Unlock achievement
achievement_post("achievement_complete_level_1", 100);

// Async - Social Event
var _type = async_load[? "type"];

if (_type == "achievement_post") {
    var _id = async_load[? "id"];
    var _success = async_load[? "success"];

    if (_success) {
        show_debug_message("Achievement unlocked: " + _id);
    }
}
```

---

### HTML5 (Web)

**Browser Detection**:
```gml
if (os_browser != browser_not_a_browser) {
    show_debug_message("Running in browser: " + string(os_browser));
    // browser_chrome, browser_firefox, browser_safari, etc.
}
```

**JavaScript Execution**:
```gml
// Execute JavaScript code
var _js = "alert('Hello from GameMaker!');";
html5_run_script(_js);

// Call JavaScript function
html5_run_script("myCustomFunction(" + string(arg1) + ", '" + arg2 + "');");
```

**Local Storage**:
```gml
// Save to browser local storage
var _data = { player_name: "Hero", high_score: 1000 };
var _json = json_stringify(_data);
html5_run_script("localStorage.setItem('save_data', '" + _json + "');");

// Load from local storage
var _js = "localStorage.getItem('save_data')";
var _json = html5_run_script(_js);
var _data = json_parse(_json);
```

---

### Desktop (Windows, macOS, Linux)

**File Dialogs**:
```gml
// Open file dialog
var _filename = get_open_filename("Images|*.png;*.jpg", "");
if (_filename != "") {
    var _sprite = sprite_add(_filename, 0, false, false, 0, 0);
}

// Save file dialog
var _filename = get_save_filename("Save File|*.sav", "save.sav");
if (_filename != "") {
    save_game(_filename);
}
```

**Registry Access (Windows)**:
```gml
// Write to registry
registry_write_string("MyGame\\Settings", "player_name", "Hero");

// Read from registry
var _name = registry_read_string("MyGame\\Settings", "player_name");
```

**Command Line Arguments**:
```gml
// Get command line arguments
var _param_count = parameter_count();
for (var i = 0; i < _param_count; i++) {
    var _param = parameter_string(i);
    show_debug_message("Arg " + string(i) + ": " + _param);
}

// Example: game.exe --debug --level=5
// Arg 0: game.exe
// Arg 1: --debug
// Arg 2: --level=5
```

---

## Advanced Graphics

### Lighting System (2D)

**Light Object** (objLight):
```gml
// Create Event
light_surface = -1;
light_radius = 200;
light_color = c_white;
light_intensity = 1.0;

// Draw Event (in lighting layer)
if (!surface_exists(light_surface)) {
    light_surface = surface_create(room_width, room_height);
}

// Clear to black (darkness)
surface_set_target(light_surface);
draw_clear(c_black);

// Draw all lights additively
gpu_set_blendmode(bm_add);

with (objLight) {
    draw_circle_color(x, y, light_radius,
        light_color, c_black, false);
}

gpu_set_blendmode(bm_normal);
surface_reset_target();

// Draw lighting surface over scene (multiply blend)
gpu_set_blendmode_ext(bm_dest_color, bm_zero);
draw_surface(light_surface, 0, 0);
gpu_set_blendmode(bm_normal);
```

---

### Normal Mapping

**Normal Map Shader**:
```glsl
// Fragment Shader
precision mediump float;

varying vec2 v_vTexcoord;
varying vec4 v_vColour;

uniform sampler2D u_normal_map;
uniform vec3 u_light_pos;  // Light position (x, y, z)

void main()
{
    vec4 color = texture2D(gm_BaseTexture, v_vTexcoord);
    vec3 normal = texture2D(u_normal_map, v_vTexcoord).rgb;

    // Convert normal from [0,1] to [-1,1]
    normal = normal * 2.0 - 1.0;

    // Light direction (assuming surface at z=0)
    vec3 light_dir = normalize(u_light_pos - vec3(gl_FragCoord.xy, 0.0));

    // Diffuse lighting
    float diffuse = max(dot(normal, light_dir), 0.0);

    gl_FragColor = color * vec4(vec3(diffuse), 1.0);
}
```

**GML Usage**:
```gml
// Create Event
u_normal_map = shader_get_sampler_index(shdNormalMap, "u_normal_map");
u_light_pos = shader_get_uniform(shdNormalMap, "u_light_pos");

// Draw Event
shader_set(shdNormalMap);

var _normal_tex = sprite_get_texture(sprPlayerNormal, image_index);
texture_set_stage(u_normal_map, _normal_tex);

shader_set_uniform_f(u_light_pos, mouse_x, mouse_y, 50.0);

draw_sprite(sprPlayer, image_index, x, y);
shader_reset();
```

---

### Particle Systems (Advanced)

**Custom Particle System**:
```gml
// Create Event
ps = part_system_create();
part_system_depth(ps, -1000);

// Fire particle type
pt_fire = part_type_create();
part_type_sprite(pt_fire, sprParticleFire, false, false, false);
part_type_size(pt_fire, 0.5, 1.0, -0.01, 0);
part_type_alpha2(pt_fire, 1.0, 0.0);
part_type_color3(pt_fire, c_yellow, c_orange, c_red);
part_type_life(pt_fire, 30, 60);
part_type_speed(pt_fire, 1, 3, -0.05, 0);
part_type_direction(pt_fire, 80, 100, 0, 0);
part_type_gravity(pt_fire, 0.1, 90);

// Smoke particle type
pt_smoke = part_type_create();
part_type_sprite(pt_smoke, sprParticleSmoke, false, false, false);
part_type_size(pt_smoke, 0.3, 0.8, 0.01, 0);
part_type_alpha3(pt_smoke, 0.0, 0.5, 0.0);
part_type_color1(pt_smoke, c_gray);
part_type_life(pt_smoke, 60, 120);
part_type_speed(pt_smoke, 0.5, 1.5, -0.01, 0);
part_type_direction(pt_smoke, 85, 95, 0, 5);

// Emitter
pe_campfire = part_emitter_create(ps);
part_emitter_region(ps, pe_campfire, x - 5, x + 5, y - 5, y + 5, ps_shape_rectangle, ps_distr_linear);

// Step Event
part_emitter_stream(ps, pe_campfire, pt_fire, 3);    // 3 fire particles per step
part_emitter_stream(ps, pe_campfire, pt_smoke, 1);   // 1 smoke particle per step

// Clean Up Event
part_type_destroy(pt_fire);
part_type_destroy(pt_smoke);
part_emitter_destroy(ps, pe_campfire);
part_system_destroy(ps);
```

---

### Tilemaps (Advanced)

**Procedural Tilemap Generation**:
```gml
// Create Event
tilemap = layer_tilemap_get_id("Tiles");
tile_size = 32;
room_tiles_w = room_width div tile_size;
room_tiles_h = room_height div tile_size;

// Generate random tilemap
for (var _tx = 0; _tx < room_tiles_w; _tx++) {
    for (var _ty = 0; _ty < room_tiles_h; _ty++) {
        var _tile_index = irandom(3);  // 4 tile types (0-3)
        var _tile_data = tile_set_index(0, _tile_index);
        tilemap_set(tilemap, _tile_data, _tx, _ty);
    }
}

// Get tile at position
function get_tile_at(_x, _y) {
    var _tx = _x div tile_size;
    var _ty = _y div tile_size;

    var _tile_data = tilemap_get(tilemap, _tx, _ty);
    return tile_get_index(_tile_data);
}

// Check if tile is solid
function is_tile_solid(_x, _y) {
    var _tile_index = get_tile_at(_x, _y);
    return (_tile_index == 1 || _tile_index == 2);  // Tiles 1 and 2 are solid
}
```

---

## Performance Profiling

### Built-in Profiler

**Enable Profiler**:
```gml
// Game Options → Main → Enable debugging
// Then press F3 in-game to show debug overlay

// F3: Show FPS and debug info
// F4: Show bounding boxes
// F5: Reload room
```

**Debug Overlay Info**:
- FPS (frames per second)
- Real FPS (uncapped)
- Room speed (target FPS)
- Instance count
- Texture memory usage
- Draw calls

---

### Manual Profiling

**Measure Code Performance**:
```gml
// Start timer
var _start_time = get_timer();  // Microseconds

// Code to profile
for (var i = 0; i < 10000; i++) {
    // Some expensive operation
}

// End timer
var _end_time = get_timer();
var _elapsed = _end_time - _start_time;

show_debug_message("Execution time: " + string(_elapsed / 1000) + "ms");
```

**Profiling Functions**:
```gml
function profile_start(_name) {
    if (!variable_global_exists("__profile_timers")) {
        global.__profile_timers = ds_map_create();
    }

    global.__profile_timers[? _name] = get_timer();
}

function profile_end(_name) {
    if (!ds_map_exists(global.__profile_timers, _name)) {
        show_debug_message("Error: No timer started for " + _name);
        return;
    }

    var _start = global.__profile_timers[? _name];
    var _elapsed = get_timer() - _start;

    show_debug_message(_name + ": " + string(_elapsed / 1000) + "ms");

    ds_map_delete(global.__profile_timers, _name);
}

// Usage
profile_start("pathfinding");
find_path_to_target();
profile_end("pathfinding");
```

---

### Performance Optimization Checklist

**Draw Optimization**:
- [ ] Minimize texture swaps (batch similar sprites)
- [ ] Use texture pages/groups effectively
- [ ] Avoid changing blend mode frequently
- [ ] Use surfaces for static content
- [ ] Disable depth sorting if not needed (`gpu_set_ztestenable(false)`)

**Collision Optimization**:
- [ ] Use broad-phase checks (distance_to_object) before precise collision
- [ ] Limit collision checks to nearby objects
- [ ] Use spatial partitioning (grid-based collision)
- [ ] Avoid `with (all)` in collision checks

**Instance Optimization**:
- [ ] Use object pooling for frequently created/destroyed instances
- [ ] Deactivate off-screen instances (`instance_deactivate_region`)
- [ ] Avoid Step events in instances that don't need them
- [ ] Use alarms instead of cooldown variables where possible

**Data Structure Optimization**:
- [ ] Use arrays instead of ds_list for fixed-size collections (GMS 2.3+)
- [ ] Use structs instead of ds_map for data storage (GMS 2.3+)
- [ ] Destroy data structures when done (prevent memory leaks)
- [ ] Cache frequently accessed values (don't recalculate every frame)

**Code Optimization**:
- [ ] Move constant calculations outside loops
- [ ] Use `++i` instead of `i += 1` (compiler optimization)
- [ ] Avoid string concatenation in loops (use arrays + join)
- [ ] Cache array_length() result instead of calling every iteration

**Example**:
```gml
// ❌ BAD: Slow
for (var i = 0; i < array_length(enemies); i++) {
    var _dist = point_distance(x, y, enemies[i].x, enemies[i].y);
    if (_dist < 500) {
        // Process enemy
    }
}

// ✅ GOOD: Faster
var _len = array_length(enemies);  // Cache length
for (var i = 0; i < _len; i++) {
    var _enemy = enemies[i];  // Cache array access

    // Broad-phase check (distance squared, no sqrt)
    var _dx = _enemy.x - x;
    var _dy = _enemy.y - y;
    var _dist_sqr = _dx * _dx + _dy * _dy;

    if (_dist_sqr < 250000) {  // 500 * 500
        // Process enemy
    }
}
```

---

### Memory Profiling

**Check Memory Usage**:
```gml
// Show texture memory
show_debug_message("Texture memory: " + string(texture_get_texel_width(sprite_get_texture(sprPlayer, 0))));

// Show instance count
show_debug_message("Instances: " + string(instance_count));

// Show specific object count
show_debug_message("Enemies: " + string(instance_number(objEnemy)));
```

**Memory Leaks to Avoid**:
- Data structures not destroyed (ds_list, ds_map, ds_grid, etc.)
- Surfaces not freed
- Buffers not deleted
- Particle systems/types/emitters not destroyed
- Shaders referencing freed resources
- Event listeners not removed

**Memory Leak Detection**:
```gml
// Track data structure creation
function ds_list_create_tracked() {
    if (!variable_global_exists("__ds_list_count")) {
        global.__ds_list_count = 0;
    }

    global.__ds_list_count++;
    show_debug_message("DS Lists: " + string(global.__ds_list_count));

    return ds_list_create();
}

function ds_list_destroy_tracked(_list) {
    global.__ds_list_count--;
    show_debug_message("DS Lists: " + string(global.__ds_list_count));

    ds_list_destroy(_list);
}
```

---

**End of Advanced Topics**

For more information:
- [GML_REFERENCE.md](GML_REFERENCE.md) - Complete GML function reference
- [COMMON_PITFALLS.md](COMMON_PITFALLS.md) - Common mistakes and solutions
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - Quick lookup tables
- [Official GameMaker Manual](https://manual.gamemaker.io/) - Official documentation

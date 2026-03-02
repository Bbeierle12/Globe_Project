use bytemuck::{Pod, Zeroable};
use iced::Rectangle;
use iced::widget::shader::{Pipeline, Primitive, Viewport};
use wgpu::util::DeviceExt;

use crate::renderer::mesh::generate_sphere;

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_MARKERS: u32 = 2048;
const SPHERE_LAT_SEGS: u32 = 32;
const SPHERE_LON_SEGS: u32 = 64;

/// Pre-processed country border line segments (pairs of XYZ f32 triples).
const BORDERS_BIN: &[u8] = include_bytes!("../../assets/borders.bin");

// ─── GPU data structures ──────────────────────────────────────────────────────

/// Uniform data for the globe sphere shader (80 bytes).
#[repr(C)]
#[derive(Debug, Copy, Clone, Pod, Zeroable)]
pub struct GlobeUniforms {
    pub mvp:         [[f32; 4]; 4], // 64 bytes
    pub time:        f32,           // 4 bytes
    pub use_texture: f32,           // 4 bytes  0.0 = procedural, 1.0 = satellite
    pub _pad:        [f32; 2],      // 8 bytes
}

/// Uniform data for the marker billboard shader (112 bytes).
#[repr(C)]
#[derive(Debug, Copy, Clone, Pod, Zeroable)]
pub struct MarkerUniforms {
    pub view_proj: [[f32; 4]; 4], // 64 bytes
    pub camera_right: [f32; 4],   // 16 bytes (xyz used, w=0)
    pub camera_up: [f32; 4],      // 16 bytes
    pub camera_eye: [f32; 4],     // 16 bytes
}

/// Per-instance data for each country marker (32 bytes).
#[repr(C)]
#[derive(Debug, Copy, Clone, Pod, Zeroable)]
pub struct MarkerInstance {
    pub world_pos: [f32; 3], // 12 bytes
    pub color: [f32; 3],     // 12 bytes
    pub size: f32,           // 4 bytes
    pub _pad: f32,           // 4 bytes
}

/// Per-vertex data for the billboard quad.
#[repr(C)]
#[derive(Copy, Clone, Pod, Zeroable)]
struct QuadVertex {
    corner: [f32; 2],
}

const QUAD_VERTICES: [QuadVertex; 4] = [
    QuadVertex { corner: [-0.5, -0.5] },
    QuadVertex { corner: [0.5, -0.5] },
    QuadVertex { corner: [-0.5, 0.5] },
    QuadVertex { corner: [0.5, 0.5] },
];
const QUAD_INDICES: [u16; 6] = [0, 1, 2, 1, 3, 2];

// ─── WGSL shaders ─────────────────────────────────────────────────────────────

const BORDER_SHADER: &str = r#"
struct Uniforms { mvp: mat4x4<f32>, time: f32, use_texture: f32, _p0: f32, _p1: f32 }
@group(0) @binding(0) var<uniform> u: Uniforms;

@vertex fn vs_main(@location(0) pos: vec3<f32>) -> @builtin(position) vec4<f32> {
    return u.mvp * vec4<f32>(pos, 1.0);
}
@fragment fn fs_main() -> @location(0) vec4<f32> {
    return vec4<f32>(0.50, 0.78, 0.68, 1.0);  // muted coastal teal
}
"#;

const GLOBE_SHADER: &str = r#"
struct GlobeUniforms {
    mvp:         mat4x4<f32>,
    time:        f32,
    use_texture: f32,
    _p0:         f32,
    _p1:         f32,
}
@group(0) @binding(0) var<uniform>   u:         GlobeUniforms;
@group(0) @binding(1) var           t_sampler:  sampler;
@group(0) @binding(2) var           t_texture:  texture_2d<f32>;

struct VertIn  { @location(0) position: vec3<f32>, @location(1) normal: vec3<f32> }
struct VertOut {
    @builtin(position) clip_pos:   vec4<f32>,
    @location(0)       world_pos:  vec3<f32>,
    @location(1)       world_norm: vec3<f32>,
}

@vertex fn vs_main(in: VertIn) -> VertOut {
    var o: VertOut;
    o.clip_pos   = u.mvp * vec4<f32>(in.position, 1.0);
    o.world_pos  = in.position;
    o.world_norm = in.normal;
    return o;
}

@fragment fn fs_main(in: VertOut) -> @location(0) vec4<f32> {
    let pi  = 3.14159265;
    let lon = atan2(in.world_pos.x, in.world_pos.z);
    let lat = asin(clamp(in.world_pos.y, -1.0, 1.0));

    var base: vec3<f32>;
    if u.use_texture > 0.5 {
        // Sample equirectangular satellite texture.
        // u_tex: 0 = lon -180°, 1 = lon +180°  (prime meridian at 0.5)
        // v_tex: 0 = north pole, 1 = south pole
        let u_tex = (lon + pi) / (2.0 * pi);
        let v_tex = (pi / 2.0 - lat) / pi;
        base = textureSample(t_texture, t_sampler, vec2<f32>(u_tex, v_tex)).rgb;
    } else {
        let deep    = vec3<f32>(0.02, 0.06, 0.20);
        let mid     = vec3<f32>(0.04, 0.14, 0.42);
        let shallow = vec3<f32>(0.07, 0.22, 0.55);
        let lat_n   = (lat / 1.5708 + 1.0) * 0.5;
        base = mix(
            mix(deep, mid, clamp(lat_n * 2.0, 0.0, 1.0)),
            shallow,       clamp(lat_n * 2.0 - 1.0, 0.0, 1.0)
        );
    }

    let sun  = normalize(vec3<f32>(1.0, 0.5, 1.0));
    let diff = max(dot(in.world_norm, sun), 0.0);
    let lit  = base * (0.35 + diff * 0.65);

    // Graticule only in procedural mode.
    if u.use_texture < 0.5 {
        let x_lon = fract((lon / pi + 1.0) * 6.0);
        let x_lat = fract((lat / pi + 0.5) * 6.0);
        let grid  = 1.0 - smoothstep(0.0, 0.04,
            min(min(x_lon, 1.0 - x_lon), min(x_lat, 1.0 - x_lat)));
        return vec4<f32>(lit + grid * vec3<f32>(0.04, 0.08, 0.15), 1.0);
    }
    return vec4<f32>(lit, 1.0);
}
"#;

const MARKER_SHADER: &str = r#"
struct MarkerUniforms {
    view_proj:    mat4x4<f32>,
    camera_right: vec4<f32>,
    camera_up:    vec4<f32>,
    camera_eye:   vec4<f32>,
}
@group(0) @binding(0) var<uniform> u: MarkerUniforms;

struct VertIn { @location(0) corner: vec2<f32> }
struct InstIn {
    @location(1) world_pos: vec3<f32>,
    @location(2) color:     vec3<f32>,
    @location(3) size:      f32,
}
struct VertOut {
    @builtin(position) clip_pos: vec4<f32>,
    @location(0)       color:    vec3<f32>,
    @location(1)       uv:       vec2<f32>,
}

@vertex fn vs_main(v: VertIn, inst: InstIn) -> VertOut {
    var o: VertOut;
    let to_cam  = normalize(u.camera_eye.xyz);
    let facing  = dot(normalize(inst.world_pos), to_cam);
    if facing < 0.1 {
        o.clip_pos = vec4<f32>(2.0, 2.0, 2.0, 1.0);
        o.color    = vec3<f32>(0.0);
        o.uv       = vec2<f32>(0.0);
        return o;
    }
    let world  = inst.world_pos
                 + u.camera_right.xyz * v.corner.x * inst.size
                 + u.camera_up.xyz    * v.corner.y * inst.size;
    o.clip_pos = u.view_proj * vec4<f32>(world, 1.0);
    o.color    = inst.color;
    o.uv       = v.corner + vec2<f32>(0.5, 0.5);
    return o;
}

@fragment fn fs_main(in: VertOut) -> @location(0) vec4<f32> {
    let d = length(in.uv - vec2<f32>(0.5, 0.5));
    if d > 0.5 { discard; }
    let alpha = 1.0 - smoothstep(0.35, 0.5, d);
    let glow  = pow(max(1.0 - d * 2.0, 0.0), 2.0);
    return vec4<f32>(in.color + glow * 0.3, alpha);
}
"#;

// ─── GlobePipeline ────────────────────────────────────────────────────────────

/// Holds all persistent wgpu GPU resources for globe rendering.
pub struct GlobePipeline {
    // Sphere
    sphere_pipeline:      wgpu::RenderPipeline,
    sphere_vbuf:          wgpu::Buffer,
    sphere_ibuf:          wgpu::Buffer,
    sphere_idx_count:     u32,
    globe_ubuf:           wgpu::Buffer,
    globe_bind_group:     wgpu::BindGroup,
    globe_bgl:            wgpu::BindGroupLayout,
    // Satellite texture resources
    globe_texture:        wgpu::Texture,
    globe_texture_view:   wgpu::TextureView,
    globe_sampler:        wgpu::Sampler,
    has_satellite:        bool,

    // Country border lines (static, never updated)
    borders_pipeline:  wgpu::RenderPipeline,
    borders_vbuf:      wgpu::Buffer,
    borders_vtx_count: u32,

    // Markers
    marker_pipeline:   wgpu::RenderPipeline,
    marker_quad_vbuf:  wgpu::Buffer,
    marker_quad_ibuf:  wgpu::Buffer,
    marker_inst_buf:   wgpu::Buffer,
    marker_ubuf:       wgpu::Buffer,
    marker_bind_group: wgpu::BindGroup,
    marker_count:      u32,
}

impl Pipeline for GlobePipeline {
    fn new(device: &wgpu::Device, _queue: &wgpu::Queue, format: wgpu::TextureFormat) -> Self {
        // ── Sphere mesh ──────────────────────────────────────────────────────
        let mesh = generate_sphere(SPHERE_LAT_SEGS, SPHERE_LON_SEGS);
        let sphere_vbuf = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label:    Some("sphere_vbuf"),
            contents: bytemuck::cast_slice(&mesh.vertices),
            usage:    wgpu::BufferUsages::VERTEX,
        });
        let sphere_ibuf = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label:    Some("sphere_ibuf"),
            contents: bytemuck::cast_slice(&mesh.indices),
            usage:    wgpu::BufferUsages::INDEX,
        });
        let sphere_idx_count = mesh.indices.len() as u32;

        // ── Globe uniform buffer, texture, sampler & bind group ──────────────
        let bgl = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label:   Some("globe_bgl"),
            entries: &[
                // binding 0: uniform buffer
                wgpu::BindGroupLayoutEntry {
                    binding:    0,
                    visibility: wgpu::ShaderStages::VERTEX_FRAGMENT,
                    ty: wgpu::BindingType::Buffer {
                        ty:                 wgpu::BufferBindingType::Uniform,
                        has_dynamic_offset: false,
                        min_binding_size:   None,
                    },
                    count: None,
                },
                // binding 1: sampler
                wgpu::BindGroupLayoutEntry {
                    binding:    1,
                    visibility: wgpu::ShaderStages::FRAGMENT,
                    ty:         wgpu::BindingType::Sampler(wgpu::SamplerBindingType::Filtering),
                    count:      None,
                },
                // binding 2: satellite texture
                wgpu::BindGroupLayoutEntry {
                    binding:    2,
                    visibility: wgpu::ShaderStages::FRAGMENT,
                    ty: wgpu::BindingType::Texture {
                        sample_type:    wgpu::TextureSampleType::Float { filterable: true },
                        view_dimension: wgpu::TextureViewDimension::D2,
                        multisampled:   false,
                    },
                    count: None,
                },
            ],
        });

        // 1×1 dark-ocean placeholder until satellite texture is fetched.
        let placeholder_data: [u8; 4] = [20, 30, 80, 255];
        let globe_texture = device.create_texture_with_data(
            _queue,
            &wgpu::TextureDescriptor {
                label:                 Some("globe_tex"),
                size:                  wgpu::Extent3d { width: 1, height: 1, depth_or_array_layers: 1 },
                mip_level_count:       1,
                sample_count:          1,
                dimension:             wgpu::TextureDimension::D2,
                format:                wgpu::TextureFormat::Rgba8UnormSrgb,
                usage:                 wgpu::TextureUsages::TEXTURE_BINDING | wgpu::TextureUsages::COPY_DST,
                view_formats:          &[],
            },
            wgpu::util::TextureDataOrder::LayerMajor,
            &placeholder_data,
        );
        let globe_texture_view = globe_texture.create_view(&wgpu::TextureViewDescriptor::default());
        let globe_sampler = device.create_sampler(&wgpu::SamplerDescriptor {
            label:            Some("globe_sampler"),
            address_mode_u:   wgpu::AddressMode::Repeat,
            address_mode_v:   wgpu::AddressMode::ClampToEdge,
            address_mode_w:   wgpu::AddressMode::ClampToEdge,
            mag_filter:       wgpu::FilterMode::Linear,
            min_filter:       wgpu::FilterMode::Linear,
            ..Default::default()
        });

        let globe_ubuf = device.create_buffer(&wgpu::BufferDescriptor {
            label:              Some("globe_ubuf"),
            size:               std::mem::size_of::<GlobeUniforms>() as u64,
            usage:              wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });
        let globe_bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label:   Some("globe_bg"),
            layout:  &bgl,
            entries: &[
                wgpu::BindGroupEntry { binding: 0, resource: globe_ubuf.as_entire_binding() },
                wgpu::BindGroupEntry { binding: 1, resource: wgpu::BindingResource::Sampler(&globe_sampler) },
                wgpu::BindGroupEntry { binding: 2, resource: wgpu::BindingResource::TextureView(&globe_texture_view) },
            ],
        });

        // ── Globe render pipeline ────────────────────────────────────────────
        let globe_shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label:  Some("globe_shader"),
            source: wgpu::ShaderSource::Wgsl(GLOBE_SHADER.into()),
        });
        let globe_pl = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label:                Some("globe_pl"),
            bind_group_layouts:   &[&bgl],
            push_constant_ranges: &[],
        });
        let sphere_pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label:  Some("sphere_pipeline"),
            layout: Some(&globe_pl),
            vertex: wgpu::VertexState {
                module:      &globe_shader,
                entry_point: Some("vs_main"),
                buffers: &[wgpu::VertexBufferLayout {
                    array_stride: 24, // 2 × vec3<f32>
                    step_mode:    wgpu::VertexStepMode::Vertex,
                    attributes:   &[
                        wgpu::VertexAttribute { format: wgpu::VertexFormat::Float32x3, offset:  0, shader_location: 0 },
                        wgpu::VertexAttribute { format: wgpu::VertexFormat::Float32x3, offset: 12, shader_location: 1 },
                    ],
                }],
                compilation_options: wgpu::PipelineCompilationOptions::default(),
            },
            fragment: Some(wgpu::FragmentState {
                module:      &globe_shader,
                entry_point: Some("fs_main"),
                targets: &[Some(wgpu::ColorTargetState {
                    format,
                    blend:      None,
                    write_mask: wgpu::ColorWrites::ALL,
                })],
                compilation_options: wgpu::PipelineCompilationOptions::default(),
            }),
            primitive: wgpu::PrimitiveState {
                topology:           wgpu::PrimitiveTopology::TriangleList,
                cull_mode:          Some(wgpu::Face::Back),
                ..Default::default()
            },
            depth_stencil: None,
            multisample:   wgpu::MultisampleState::default(),
            multiview:     None,
            cache:         None,
        });

        // ── Country border lines ─────────────────────────────────────────────
        let borders_vbuf = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label:    Some("borders_vbuf"),
            contents: BORDERS_BIN,
            usage:    wgpu::BufferUsages::VERTEX,
        });
        let borders_vtx_count = (BORDERS_BIN.len() / 12) as u32; // 3 × f32 per vertex

        let border_shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label:  Some("border_shader"),
            source: wgpu::ShaderSource::Wgsl(BORDER_SHADER.into()),
        });
        let borders_pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label:  Some("borders_pipeline"),
            layout: Some(&globe_pl),   // reuse globe pipeline layout (same bind group)
            vertex: wgpu::VertexState {
                module:      &border_shader,
                entry_point: Some("vs_main"),
                buffers: &[wgpu::VertexBufferLayout {
                    array_stride: 12,
                    step_mode:    wgpu::VertexStepMode::Vertex,
                    attributes:   &[wgpu::VertexAttribute {
                        format: wgpu::VertexFormat::Float32x3,
                        offset: 0,
                        shader_location: 0,
                    }],
                }],
                compilation_options: wgpu::PipelineCompilationOptions::default(),
            },
            fragment: Some(wgpu::FragmentState {
                module:      &border_shader,
                entry_point: Some("fs_main"),
                targets: &[Some(wgpu::ColorTargetState {
                    format,
                    blend:      None,
                    write_mask: wgpu::ColorWrites::ALL,
                })],
                compilation_options: wgpu::PipelineCompilationOptions::default(),
            }),
            primitive: wgpu::PrimitiveState {
                topology: wgpu::PrimitiveTopology::LineList,
                ..Default::default()
            },
            depth_stencil: None,
            multisample:   wgpu::MultisampleState::default(),
            multiview:     None,
            cache:         None,
        });

        // ── Marker resources ─────────────────────────────────────────────────
        let marker_quad_vbuf = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label:    Some("marker_quad_vbuf"),
            contents: bytemuck::cast_slice(&QUAD_VERTICES),
            usage:    wgpu::BufferUsages::VERTEX,
        });
        let marker_quad_ibuf = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label:    Some("marker_quad_ibuf"),
            contents: bytemuck::cast_slice(&QUAD_INDICES),
            usage:    wgpu::BufferUsages::INDEX,
        });
        let marker_inst_buf = device.create_buffer(&wgpu::BufferDescriptor {
            label:              Some("marker_inst_buf"),
            size:               (std::mem::size_of::<MarkerInstance>() * MAX_MARKERS as usize) as u64,
            usage:              wgpu::BufferUsages::VERTEX | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });

        // Separate 1-binding layout for marker and border shaders (uniform only).
        let ubuf_bgl = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label:   Some("ubuf_bgl"),
            entries: &[wgpu::BindGroupLayoutEntry {
                binding:    0,
                visibility: wgpu::ShaderStages::VERTEX_FRAGMENT,
                ty: wgpu::BindingType::Buffer {
                    ty:                 wgpu::BufferBindingType::Uniform,
                    has_dynamic_offset: false,
                    min_binding_size:   None,
                },
                count: None,
            }],
        });

        let marker_ubuf = device.create_buffer(&wgpu::BufferDescriptor {
            label:              Some("marker_ubuf"),
            size:               std::mem::size_of::<MarkerUniforms>() as u64,
            usage:              wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });
        let marker_bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label:   Some("marker_bg"),
            layout:  &ubuf_bgl,
            entries: &[wgpu::BindGroupEntry {
                binding:  0,
                resource: marker_ubuf.as_entire_binding(),
            }],
        });

        // ── Marker render pipeline ───────────────────────────────────────────
        let marker_shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label:  Some("marker_shader"),
            source: wgpu::ShaderSource::Wgsl(MARKER_SHADER.into()),
        });
        let marker_pl = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label:                Some("marker_pl"),
            bind_group_layouts:   &[&ubuf_bgl],
            push_constant_ranges: &[],
        });
        let marker_pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label:  Some("marker_pipeline"),
            layout: Some(&marker_pl),
            vertex: wgpu::VertexState {
                module:      &marker_shader,
                entry_point: Some("vs_main"),
                buffers: &[
                    // Per-vertex: quad corner
                    wgpu::VertexBufferLayout {
                        array_stride: 8,
                        step_mode:    wgpu::VertexStepMode::Vertex,
                        attributes:   &[
                            wgpu::VertexAttribute { format: wgpu::VertexFormat::Float32x2, offset: 0, shader_location: 0 },
                        ],
                    },
                    // Per-instance: world_pos, color, size (+ pad)
                    wgpu::VertexBufferLayout {
                        array_stride: 32,
                        step_mode:    wgpu::VertexStepMode::Instance,
                        attributes:   &[
                            wgpu::VertexAttribute { format: wgpu::VertexFormat::Float32x3, offset:  0, shader_location: 1 },
                            wgpu::VertexAttribute { format: wgpu::VertexFormat::Float32x3, offset: 12, shader_location: 2 },
                            wgpu::VertexAttribute { format: wgpu::VertexFormat::Float32,   offset: 24, shader_location: 3 },
                        ],
                    },
                ],
                compilation_options: wgpu::PipelineCompilationOptions::default(),
            },
            fragment: Some(wgpu::FragmentState {
                module:      &marker_shader,
                entry_point: Some("fs_main"),
                targets: &[Some(wgpu::ColorTargetState {
                    format,
                    blend:      Some(wgpu::BlendState::ALPHA_BLENDING),
                    write_mask: wgpu::ColorWrites::ALL,
                })],
                compilation_options: wgpu::PipelineCompilationOptions::default(),
            }),
            primitive: wgpu::PrimitiveState {
                topology: wgpu::PrimitiveTopology::TriangleList,
                ..Default::default()
            },
            depth_stencil: None,
            multisample:   wgpu::MultisampleState::default(),
            multiview:     None,
            cache:         None,
        });

        Self {
            sphere_pipeline,
            sphere_vbuf,
            sphere_ibuf,
            sphere_idx_count,
            globe_ubuf,
            globe_bind_group,
            globe_bgl: bgl,
            globe_texture,
            globe_texture_view,
            globe_sampler,
            has_satellite: false,
            borders_pipeline,
            borders_vbuf,
            borders_vtx_count,
            marker_pipeline,
            marker_quad_vbuf,
            marker_quad_ibuf,
            marker_inst_buf,
            marker_ubuf,
            marker_bind_group,
            marker_count: 0,
        }
    }
}

// ─── GlobePrimitive ───────────────────────────────────────────────────────────

/// Per-frame data produced by GlobeProgram::draw().
#[derive(Debug, Clone)]
pub struct GlobePrimitive {
    pub globe_uniforms:  GlobeUniforms,
    pub marker_uniforms: MarkerUniforms,
    pub markers:         Vec<MarkerInstance>,
    /// Satellite texture pixels (RGBA). Only Some until first GPU upload.
    pub texture_pixels:  Option<std::sync::Arc<Vec<u8>>>,
    pub texture_width:   u32,
    pub texture_height:  u32,
}

impl Primitive for GlobePrimitive {
    type Pipeline = GlobePipeline;

    fn prepare(
        &self,
        pipeline: &mut GlobePipeline,
        device: &wgpu::Device,
        queue: &wgpu::Queue,
        _bounds: &Rectangle,
        _viewport: &Viewport,
    ) {
        // Upload satellite texture the first time it arrives.
        if let Some(pixels) = &self.texture_pixels {
            if !pipeline.has_satellite && self.texture_width > 0 && self.texture_height > 0 {
                let new_tex = device.create_texture_with_data(
                    queue,
                    &wgpu::TextureDescriptor {
                        label:               Some("globe_sat_tex"),
                        size:                wgpu::Extent3d {
                            width:                 self.texture_width,
                            height:                self.texture_height,
                            depth_or_array_layers: 1,
                        },
                        mip_level_count:     1,
                        sample_count:        1,
                        dimension:           wgpu::TextureDimension::D2,
                        format:              wgpu::TextureFormat::Rgba8UnormSrgb,
                        usage:               wgpu::TextureUsages::TEXTURE_BINDING
                                           | wgpu::TextureUsages::COPY_DST,
                        view_formats:        &[],
                    },
                    wgpu::util::TextureDataOrder::LayerMajor,
                    pixels,
                );
                let new_view = new_tex.create_view(&wgpu::TextureViewDescriptor::default());
                let new_bg = device.create_bind_group(&wgpu::BindGroupDescriptor {
                    label:   Some("globe_bg_sat"),
                    layout:  &pipeline.globe_bgl,
                    entries: &[
                        wgpu::BindGroupEntry { binding: 0, resource: pipeline.globe_ubuf.as_entire_binding() },
                        wgpu::BindGroupEntry { binding: 1, resource: wgpu::BindingResource::Sampler(&pipeline.globe_sampler) },
                        wgpu::BindGroupEntry { binding: 2, resource: wgpu::BindingResource::TextureView(&new_view) },
                    ],
                });
                pipeline.globe_texture      = new_tex;
                pipeline.globe_texture_view = new_view;
                pipeline.globe_bind_group   = new_bg;
                pipeline.has_satellite      = true;
            }
        }

        queue.write_buffer(&pipeline.globe_ubuf, 0, bytemuck::bytes_of(&self.globe_uniforms));
        queue.write_buffer(&pipeline.marker_ubuf, 0, bytemuck::bytes_of(&self.marker_uniforms));

        let count = self.markers.len().min(MAX_MARKERS as usize) as u32;
        if count > 0 {
            queue.write_buffer(
                &pipeline.marker_inst_buf,
                0,
                bytemuck::cast_slice(&self.markers[..count as usize]),
            );
        }
        pipeline.marker_count = count;
    }

    fn draw(
        &self,
        pipeline: &GlobePipeline,
        render_pass: &mut wgpu::RenderPass<'_>,
    ) -> bool {
        // Draw sphere
        render_pass.set_pipeline(&pipeline.sphere_pipeline);
        render_pass.set_bind_group(0, &pipeline.globe_bind_group, &[]);
        render_pass.set_vertex_buffer(0, pipeline.sphere_vbuf.slice(..));
        render_pass.set_index_buffer(pipeline.sphere_ibuf.slice(..), wgpu::IndexFormat::Uint32);
        render_pass.draw_indexed(0..pipeline.sphere_idx_count, 0, 0..1);

        // Draw country border lines (reuses globe bind group / MVP uniform)
        render_pass.set_pipeline(&pipeline.borders_pipeline);
        render_pass.set_bind_group(0, &pipeline.globe_bind_group, &[]);
        render_pass.set_vertex_buffer(0, pipeline.borders_vbuf.slice(..));
        render_pass.draw(0..pipeline.borders_vtx_count, 0..1);

        // Draw markers (instanced)
        if pipeline.marker_count > 0 {
            render_pass.set_pipeline(&pipeline.marker_pipeline);
            render_pass.set_bind_group(0, &pipeline.marker_bind_group, &[]);
            render_pass.set_vertex_buffer(0, pipeline.marker_quad_vbuf.slice(..));
            render_pass.set_vertex_buffer(1, pipeline.marker_inst_buf.slice(..));
            render_pass.set_index_buffer(pipeline.marker_quad_ibuf.slice(..), wgpu::IndexFormat::Uint16);
            render_pass.draw_indexed(0..6, 0, 0..pipeline.marker_count);
        }

        true
    }
}

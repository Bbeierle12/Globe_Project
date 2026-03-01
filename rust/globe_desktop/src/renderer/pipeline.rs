use bytemuck::{Pod, Zeroable};
use iced::Rectangle;
use iced::widget::shader::{Pipeline, Primitive, Viewport};
use wgpu::util::DeviceExt;

use crate::renderer::mesh::generate_sphere;

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_MARKERS: u32 = 2048;
const SPHERE_LAT_SEGS: u32 = 32;
const SPHERE_LON_SEGS: u32 = 64;

// ─── GPU data structures ──────────────────────────────────────────────────────

/// Uniform data for the globe sphere shader (80 bytes).
#[repr(C)]
#[derive(Debug, Copy, Clone, Pod, Zeroable)]
pub struct GlobeUniforms {
    pub mvp: [[f32; 4]; 4], // 64 bytes
    pub time: f32,           // 4 bytes
    pub _pad: [f32; 3],      // 12 bytes
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

// ─── WGSL shaders ────────────────────────────────────────────────────────────

const GLOBE_SHADER: &str = r#"
struct GlobeUniforms {
    mvp:  mat4x4<f32>,
    time: f32,
    _p0:  f32,
    _p1:  f32,
    _p2:  f32,
}
@group(0) @binding(0) var<uniform> u: GlobeUniforms;

struct VertIn  { @location(0) position: vec3<f32>, @location(1) normal: vec3<f32> }
struct VertOut {
    @builtin(position) clip_pos:    vec4<f32>,
    @location(0)       world_pos:   vec3<f32>,
    @location(1)       world_norm:  vec3<f32>,
}

@vertex fn vs_main(in: VertIn) -> VertOut {
    var o: VertOut;
    o.clip_pos   = u.mvp * vec4<f32>(in.position, 1.0);
    o.world_pos  = in.position;
    o.world_norm = in.normal;
    return o;
}

@fragment fn fs_main(in: VertOut) -> @location(0) vec4<f32> {
    let deep    = vec3<f32>(0.02, 0.06, 0.20);
    let mid     = vec3<f32>(0.04, 0.14, 0.42);
    let shallow = vec3<f32>(0.07, 0.22, 0.55);

    let lat_n = (asin(clamp(in.world_pos.y, -1.0, 1.0)) / 1.5708 + 1.0) * 0.5;
    let base  = mix(
        mix(deep, mid,     clamp(lat_n * 2.0,       0.0, 1.0)),
        shallow,           clamp(lat_n * 2.0 - 1.0, 0.0, 1.0)
    );

    let sun  = normalize(vec3<f32>(1.0, 0.5, 1.0));
    let diff = max(dot(in.world_norm, sun), 0.0);
    let lit  = base * (0.3 + diff * 0.7);

    let pi    = 3.14159265;
    let lon   = atan2(in.world_pos.x, in.world_pos.z);
    let lat   = asin(clamp(in.world_pos.y, -1.0, 1.0));
    let x_lon = fract((lon / pi + 1.0) * 6.0);
    let x_lat = fract((lat / pi + 0.5) * 6.0);
    let grid  = 1.0 - smoothstep(0.0, 0.04, min(min(x_lon, 1.0 - x_lon), min(x_lat, 1.0 - x_lat)));

    return vec4<f32>(lit + grid * vec3<f32>(0.04, 0.08, 0.15), 1.0);
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
    sphere_pipeline:   wgpu::RenderPipeline,
    sphere_vbuf:       wgpu::Buffer,
    sphere_ibuf:       wgpu::Buffer,
    sphere_idx_count:  u32,
    globe_ubuf:        wgpu::Buffer,
    globe_bind_group:  wgpu::BindGroup,

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

        // ── Globe uniform buffer & bind group ────────────────────────────────
        let bgl = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label:   Some("globe_bgl"),
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

        let globe_ubuf = device.create_buffer(&wgpu::BufferDescriptor {
            label:              Some("globe_ubuf"),
            size:               std::mem::size_of::<GlobeUniforms>() as u64,
            usage:              wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });
        let globe_bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label:   Some("globe_bg"),
            layout:  &bgl,
            entries: &[wgpu::BindGroupEntry {
                binding:  0,
                resource: globe_ubuf.as_entire_binding(),
            }],
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

        let marker_ubuf = device.create_buffer(&wgpu::BufferDescriptor {
            label:              Some("marker_ubuf"),
            size:               std::mem::size_of::<MarkerUniforms>() as u64,
            usage:              wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });
        let marker_bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label:   Some("marker_bg"),
            layout:  &bgl,
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
            bind_group_layouts:   &[&bgl],
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
}

impl Primitive for GlobePrimitive {
    type Pipeline = GlobePipeline;

    fn prepare(
        &self,
        pipeline: &mut GlobePipeline,
        _device: &wgpu::Device,
        queue: &wgpu::Queue,
        _bounds: &Rectangle,
        _viewport: &Viewport,
    ) {
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

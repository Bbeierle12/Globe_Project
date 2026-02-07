/**
 * WebGPU Compute Shaders for county boundary rendering and population heat mapping.
 * Falls back to CPU when WebGPU is unavailable.
 */

var gpuDevice = null;
var gpuReady = false;
var gpuFailed = false;

// Population heat map compute shader (WGSL)
var HEAT_MAP_SHADER = /* wgsl */`
  struct Params {
    count: u32,
    maxPop: f32,
    width: u32,
    height: u32,
  }

  struct County {
    population: f32,
    minX: f32,
    minY: f32,
    maxX: f32,
    maxY: f32,
    _pad0: f32,
    _pad1: f32,
    _pad2: f32,
  }

  @group(0) @binding(0) var<uniform> params: Params;
  @group(0) @binding(1) var<storage, read> counties: array<County>;
  @group(0) @binding(2) var<storage, read_write> output: array<u32>;

  fn popToColor(t: f32) -> vec4<f32> {
    let s0 = vec3<f32>(25.0, 60.0, 110.0) / 255.0;
    let s1 = vec3<f32>(18.0, 125.0, 125.0) / 255.0;
    let s2 = vec3<f32>(35.0, 165.0, 75.0) / 255.0;
    let s3 = vec3<f32>(195.0, 195.0, 45.0) / 255.0;
    let s4 = vec3<f32>(225.0, 135.0, 28.0) / 255.0;
    let s5 = vec3<f32>(215.0, 38.0, 38.0) / 255.0;

    let idx = t * 5.0;
    let lo = u32(floor(idx));
    let f = idx - floor(idx);

    var c0: vec3<f32>;
    var c1: vec3<f32>;

    switch(lo) {
      case 0u: { c0 = s0; c1 = s1; }
      case 1u: { c0 = s1; c1 = s2; }
      case 2u: { c0 = s2; c1 = s3; }
      case 3u: { c0 = s3; c1 = s4; }
      default: { c0 = s4; c1 = s5; }
    }

    return vec4<f32>(mix(c0, c1, f), 1.0);
  }

  @compute @workgroup_size(256)
  fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let i = id.x;
    if (i >= params.count) { return; }

    let county = counties[i];
    let t = pow(county.population / params.maxPop, 0.3);
    let color = popToColor(t);

    // Write RGBA as packed u32 for each county bounding box pixel
    let r = u32(color.r * 255.0);
    let g = u32(color.g * 255.0);
    let b = u32(color.b * 255.0);
    let a = 255u;
    output[i] = (a << 24u) | (b << 16u) | (g << 8u) | r;
  }
`;

// Arc delta-decode + transform compute shader (WGSL)
var ARC_TRANSFORM_SHADER = /* wgsl */`
  struct Transform {
    scaleX: f32,
    scaleY: f32,
    translateX: f32,
    translateY: f32,
  }

  @group(0) @binding(0) var<uniform> tr: Transform;
  @group(0) @binding(1) var<storage, read> deltas: array<vec2<f32>>;
  @group(0) @binding(2) var<storage, read_write> coords: array<vec2<f32>>;
  @group(0) @binding(3) var<uniform> arcLen: u32;

  @compute @workgroup_size(1)
  fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    // Sequential prefix sum for delta decoding (must be single workgroup)
    var x: f32 = 0.0;
    var y: f32 = 0.0;
    for (var i: u32 = 0u; i < arcLen; i = i + 1u) {
      x = x + deltas[i].x;
      y = y + deltas[i].y;
      coords[i] = vec2<f32>(
        x * tr.scaleX + tr.translateX,
        y * tr.scaleY + tr.translateY
      );
    }
  }
`;

/**
 * Initialize WebGPU device. Returns the device or null if unavailable.
 */
async function initGPU() {
  if (gpuReady) return gpuDevice;
  if (gpuFailed) return null;

  try {
    if (!navigator.gpu) {
      console.log("WebGPU not available, using CPU fallback");
      gpuFailed = true;
      return null;
    }

    var adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      console.log("WebGPU adapter not found, using CPU fallback");
      gpuFailed = true;
      return null;
    }

    gpuDevice = await adapter.requestDevice();
    gpuReady = true;
    console.log("WebGPU compute initialized");
    return gpuDevice;
  } catch (e) {
    console.log("WebGPU init failed, using CPU fallback:", e.message);
    gpuFailed = true;
    return null;
  }
}

/**
 * Compute population colors for counties using GPU.
 * Returns array of {r, g, b} objects, one per county.
 *
 * @param {Array} counties - Array of {population: number}
 * @param {number} maxPop - Maximum population for normalization
 * @returns {Promise<Uint32Array|null>} Packed RGBA values or null if GPU unavailable
 */
async function computePopulationColors(counties, maxPop) {
  var device = await initGPU();
  if (!device) return null;

  var count = counties.length;

  // Create uniform buffer for params
  var paramsData = new ArrayBuffer(16);
  var paramsView = new DataView(paramsData);
  paramsView.setUint32(0, count, true);
  paramsView.setFloat32(4, maxPop, true);
  paramsView.setUint32(8, 0, true);
  paramsView.setUint32(12, 0, true);

  var paramsBuffer = device.createBuffer({
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(paramsBuffer, 0, paramsData);

  // Create county data buffer (8 floats per county for alignment)
  var countyData = new Float32Array(count * 8);
  for (var i = 0; i < count; i++) {
    countyData[i * 8] = counties[i].p || 0;
    // Bounding box fields (reserved for future use)
    countyData[i * 8 + 1] = 0;
    countyData[i * 8 + 2] = 0;
    countyData[i * 8 + 3] = 0;
    countyData[i * 8 + 4] = 0;
    countyData[i * 8 + 5] = 0;
    countyData[i * 8 + 6] = 0;
    countyData[i * 8 + 7] = 0;
  }

  var countyBuffer = device.createBuffer({
    size: countyData.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(countyBuffer, 0, countyData);

  // Create output buffer
  var outputSize = count * 4; // u32 per county
  var outputBuffer = device.createBuffer({
    size: outputSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });

  var readBuffer = device.createBuffer({
    size: outputSize,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });

  // Create compute pipeline
  var shaderModule = device.createShaderModule({ code: HEAT_MAP_SHADER });
  var pipeline = device.createComputePipeline({
    layout: "auto",
    compute: { module: shaderModule, entryPoint: "main" },
  });

  var bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: paramsBuffer } },
      { binding: 1, resource: { buffer: countyBuffer } },
      { binding: 2, resource: { buffer: outputBuffer } },
    ],
  });

  // Dispatch
  var commandEncoder = device.createCommandEncoder();
  var pass = commandEncoder.beginComputePass();
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup);
  pass.dispatchWorkgroups(Math.ceil(count / 256));
  pass.end();

  commandEncoder.copyBufferToBuffer(outputBuffer, 0, readBuffer, 0, outputSize);
  device.queue.submit([commandEncoder.finish()]);

  // Read back results
  await readBuffer.mapAsync(GPUMapMode.READ);
  var result = new Uint32Array(readBuffer.getMappedRange().slice(0));
  readBuffer.unmap();

  // Cleanup
  paramsBuffer.destroy();
  countyBuffer.destroy();
  outputBuffer.destroy();
  readBuffer.destroy();

  return result;
}

/**
 * CPU fallback: compute population colors without WebGPU.
 * Matches the same pClr gradient as the globe shader.
 *
 * @param {Array} counties - Array of {p: number}
 * @param {number} maxPop - Maximum population
 * @returns {Array<{r: number, g: number, b: number}>}
 */
function computePopulationColorsCPU(counties, maxPop) {
  var stops = [[25,60,110],[18,125,125],[35,165,75],[195,195,45],[225,135,28],[215,38,38]];
  return counties.map(function(c) {
    var t = Math.pow((c.p || 0) / maxPop, 0.3);
    var idx = t * (stops.length - 1);
    var lo = Math.floor(idx);
    var hi = Math.min(lo + 1, stops.length - 1);
    var f = idx - lo;
    return {
      r: Math.round(stops[lo][0] + (stops[hi][0] - stops[lo][0]) * f),
      g: Math.round(stops[lo][1] + (stops[hi][1] - stops[lo][1]) * f),
      b: Math.round(stops[lo][2] + (stops[hi][2] - stops[lo][2]) * f)
    };
  });
}

/**
 * Decode TopoJSON arcs using GPU compute.
 * Falls back to CPU if WebGPU is unavailable.
 *
 * @param {Array} arcDeltas - Array of [dx, dy] delta pairs
 * @param {Object} transform - {scale: [sx, sy], translate: [tx, ty]}
 * @returns {Promise<Float32Array|null>} Decoded coordinates or null
 */
async function decodeArcGPU(arcDeltas, transform) {
  var device = await initGPU();
  if (!device || arcDeltas.length === 0) return null;

  var len = arcDeltas.length;

  // Transform uniform
  var trData = new Float32Array([
    transform.scale[0], transform.scale[1],
    transform.translate[0], transform.translate[1]
  ]);
  var trBuffer = device.createBuffer({
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(trBuffer, 0, trData);

  // Arc length uniform
  var lenData = new Uint32Array([len]);
  var lenBuffer = device.createBuffer({
    size: 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(lenBuffer, 0, lenData);

  // Delta input
  var deltaData = new Float32Array(len * 2);
  for (var i = 0; i < len; i++) {
    deltaData[i * 2] = arcDeltas[i][0];
    deltaData[i * 2 + 1] = arcDeltas[i][1];
  }
  var deltaBuffer = device.createBuffer({
    size: deltaData.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(deltaBuffer, 0, deltaData);

  // Output
  var outputSize = len * 8; // 2 floats per point
  var outputBuffer = device.createBuffer({
    size: outputSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });
  var readBuffer = device.createBuffer({
    size: outputSize,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });

  var shaderModule = device.createShaderModule({ code: ARC_TRANSFORM_SHADER });
  var pipeline = device.createComputePipeline({
    layout: "auto",
    compute: { module: shaderModule, entryPoint: "main" },
  });

  var bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: trBuffer } },
      { binding: 1, resource: { buffer: deltaBuffer } },
      { binding: 2, resource: { buffer: outputBuffer } },
      { binding: 3, resource: { buffer: lenBuffer } },
    ],
  });

  var commandEncoder = device.createCommandEncoder();
  var pass = commandEncoder.beginComputePass();
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup);
  pass.dispatchWorkgroups(1);
  pass.end();

  commandEncoder.copyBufferToBuffer(outputBuffer, 0, readBuffer, 0, outputSize);
  device.queue.submit([commandEncoder.finish()]);

  await readBuffer.mapAsync(GPUMapMode.READ);
  var result = new Float32Array(readBuffer.getMappedRange().slice(0));
  readBuffer.unmap();

  trBuffer.destroy();
  lenBuffer.destroy();
  deltaBuffer.destroy();
  outputBuffer.destroy();
  readBuffer.destroy();

  return result;
}

/**
 * Check if WebGPU compute is available.
 * @returns {boolean}
 */
function isGPUAvailable() {
  return typeof navigator !== "undefined" && !!navigator.gpu;
}

export {
  initGPU,
  isGPUAvailable,
  computePopulationColors,
  computePopulationColorsCPU,
  decodeArcGPU,
  HEAT_MAP_SHADER,
  ARC_TRANSFORM_SHADER
};

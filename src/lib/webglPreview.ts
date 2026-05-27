export interface PreviewParams {
  brightness: number;
  contrast: number;
  saturation: number;
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
}

export const defaultParams: PreviewParams = {
  brightness: 0,
  contrast: 1,
  saturation: 1,
  cropX: 0,
  cropY: 0,
  cropWidth: 1,
  cropHeight: 1,
};

const vertexShaderSource = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;
  void main() {
    gl_Position = vec4(a_position, 0, 1);
    v_texCoord = a_texCoord;
  }
`;

const fragmentShaderSource = `
  precision mediump float;
  uniform sampler2D u_image;
  uniform float u_brightness;
  uniform float u_contrast;
  uniform float u_saturation;
  uniform vec4 u_crop;
  varying vec2 v_texCoord;
  void main() {
    vec2 croppedCoord = u_crop.xy + v_texCoord * u_crop.zw;
    vec4 color = texture2D(u_image, croppedCoord);
    color.rgb += u_brightness;
    color.rgb = (color.rgb - 0.5) * u_contrast + 0.5;
    float grey = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    color.rgb = mix(vec3(grey), color.rgb, u_saturation);
    color.rgb = clamp(color.rgb, 0.0, 1.0);
    gl_FragColor = color;
  }
`;

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error('Shader error: ' + gl.getShaderInfoLog(shader));
  }
  return shader;
}

export class WebGLPreview {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private texture: WebGLTexture;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl');
    if (!gl) throw new Error('WebGL not supported');
    this.gl = gl;

    const vertShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    const program = gl.createProgram()!;
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);
    gl.useProgram(program);
    this.program = program;

    const positions = new Float32Array([-1,-1, 1,-1, -1,1, 1,1]);
    const texCoords = new Float32Array([0,1, 1,1, 0,0, 1,0]);

    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const texBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
    const texLoc = gl.getAttribLocation(program, 'a_texCoord');
    gl.enableVertexAttribArray(texLoc);
    gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);

    this.texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  render(videoElement: HTMLVideoElement, params: PreviewParams) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, videoElement);
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_brightness'), params.brightness);
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_contrast'), params.contrast);
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_saturation'), params.saturation);
    gl.uniform4f(gl.getUniformLocation(this.program, 'u_crop'),
      params.cropX, params.cropY, params.cropWidth, params.cropHeight);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  destroy() {
    this.gl.deleteTexture(this.texture);
    this.gl.deleteProgram(this.program);
  }
}
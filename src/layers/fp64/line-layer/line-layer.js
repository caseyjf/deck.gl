// Copyright (c) 2015 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
import {Layer, assembleShaders} from '../../../lib';
import {GL, Model, Program, Geometry} from 'luma.gl';
import {fp64ify} from '../../../lib/utils/fp64';

const glslify = require('glslify');

const DEFAULT_COLOR = [0, 255, 0];

const defaultGetSourcePosition = x => x.sourcePosition;
const defaultGetTargetPosition = x => x.targetPosition;
const defaultGetColor = x => x.color || DEFAULT_COLOR;

export default class LineLayer extends Layer {
  /**
   * @classdesc
   * LineLayer
   *
   * @class
   * @param {object} opts
   */
  constructor({
    strokeWidth = 9,
    getSourcePosition = defaultGetSourcePosition,
    getTargetPosition = defaultGetTargetPosition,
    getColor = defaultGetColor,
    ...opts
  } = {}) {
    super({
      strokeWidth,
      getSourcePosition,
      getTargetPosition,
      getColor,
      ...opts
    });
  }

  initializeState() {
    const {gl} = this.context;
    this.setState({model: this.createModel(gl)});

    const {attributeManager} = this.state;
    attributeManager.addInstanced({
      instanceSourcePositionsFP64: {size: 4, update: this.calculateInstanceSourcePositions},
      instanceTargetPositionsFP64: {size: 4, update: this.calculateInstanceTargetPositions},
      instanceColors: {size: 3, update: this.calculateInstanceColors}
    });
  }

  willReceiveProps(oldProps, nextProps) {
    super.willReceiveProps(oldProps, nextProps);
    this.state.model.userData.strokeWidth = nextProps.strokeWidth;
  }

  draw({uniforms}) {
    const {gl} = this.context;
    const oldStrokeWidth = gl.getParameter(GL.LINE_WIDTH);
    gl.lineWidth(this.props.strokeWidth || 1);
    this.state.model.render(uniforms);
    gl.lineWidth(oldStrokeWidth || 1);
  }

  createModel(gl) {
    const positions = [0, 0, 0, 1, 1, 1];

    return new Model({
      id: this.props.id,
      program: new Program(gl, assembleShaders(gl, {
        vs: glslify('./line-layer-vertex.glsl'),
        fs: glslify('./line-layer-fragment.glsl'),
        fp64: true,
        project64: true
      })),
      geometry: new Geometry({
        drawMode: 'LINE_STRIP',
        positions: new Float32Array(positions)
      }),
      isInstanced: true
    });
  }

  calculateInstanceSourcePositions(attribute) {
    const {data, getSourcePosition} = this.props;
    const {value, size} = attribute;
    let i = 0;
    for (const object of data) {
      const sourcePosition = getSourcePosition(object);
      [value[i + 0], value[i + 1]] = fp64ify(sourcePosition[0]);
      [value[i + 2], value[i + 3]] = fp64ify(sourcePosition[1]);
      i += size;
    }
  }

  calculateInstanceTargetPositions(attribute) {
    const {data, getTargetPosition} = this.props;
    const {value, size} = attribute;
    let i = 0;
    for (const object of data) {
      const targetPosition = getTargetPosition(object);
      [value[i + 0], value[i + 1]] = fp64ify(targetPosition[0]);
      [value[i + 2], value[i + 3]] = fp64ify(targetPosition[1]);
      i += size;
    }
  }

  calculateInstanceColors(attribute) {
    const {data, getColor} = this.props;
    const {value, size} = attribute;
    let i = 0;
    for (const object of data) {
      const color = getColor(object);
      value[i + 0] = color[0];
      value[i + 1] = color[1];
      value[i + 2] = color[2];
      i += size;
    }
  }

}
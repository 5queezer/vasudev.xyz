const test = require('node:test');
const assert = require('node:assert/strict');
const { imageLayout } = require('../assets/js/image-viewer.js');

for (const [width, height] of [
  [1200, 630],
  [600, 1800],
  [800, 400],
  [500, 500],
]) {
  for (const [viewportWidth, viewportHeight] of [
    [1440, 850],
    [288, 740],
  ]) {
    test(`${width}×${height} fits ${viewportWidth}×${viewportHeight} without cropping`, () => {
      const fit = imageLayout(width, height, viewportWidth, viewportHeight, 1);
      assert(fit.width <= viewportWidth - 32 + 0.001);
      assert(fit.height <= viewportHeight - 32 + 0.001);
      assert(Math.abs(fit.width / fit.height - width / height) < 0.000001);
      assert.equal(fit.canvasWidth, viewportWidth);
      assert.equal(fit.canvasHeight, viewportHeight);
      const zoomed = imageLayout(
        width,
        height,
        viewportWidth,
        viewportHeight,
        4,
      );
      assert.equal(zoomed.width, fit.width * 4);
      assert.equal(zoomed.height, fit.height * 4);
      assert(zoomed.canvasWidth >= zoomed.width + 32);
      assert(zoomed.canvasHeight >= zoomed.height + 32);
    });
  }
}
test('unloaded images do not produce invalid dimensions', () => {
  assert.equal(imageLayout(0, 0, 390, 800, 1), null);
  assert.equal(imageLayout(1200, 630, 0, 0, 1), null);
});

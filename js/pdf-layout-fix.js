(() => {
  document.addEventListener('DOMContentLoaded', () => {
    const PDFPage = window.PDFLib?.PDFPage;
    if (!PDFPage || PDFPage.prototype.__setBbqHeaderFix) return;

    const originalDrawText = PDFPage.prototype.drawText;
    const headerLabels = new Map([
      ['ITEM', [34, 203]],
      ['QTY', [203, 242]],
      ['SIZE / UNIT', [242, 329]],
      ['OPTIONS', [329, 452]],
      ['UNIT', [452, 513]],
      ['TOTAL', [513, 578]]
    ]);

    PDFPage.prototype.drawText = function (value, options = {}) {
      const text = String(value ?? '');
      const isHeader = options.size === 6.7 && headerLabels.has(text) && options.font;

      if (isHeader) {
        const [left, right] = headerLabels.get(text);
        const textWidth = options.font.widthOfTextAtSize(text, options.size);
        return originalDrawText.call(this, text, {
          ...options,
          x: left + Math.max(3, ((right - left) - textWidth) / 2)
        });
      }

      return originalDrawText.call(this, value, options);
    };

    PDFPage.prototype.__setBbqHeaderFix = true;
  });
})();

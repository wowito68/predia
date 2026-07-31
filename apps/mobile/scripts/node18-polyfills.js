if (!Array.prototype.toReversed) {
  Object.defineProperty(Array.prototype, 'toReversed', {
    value: function toReversed() {
      return Array.from(this).reverse()
    },
    writable: true,
    configurable: true,
  })
}

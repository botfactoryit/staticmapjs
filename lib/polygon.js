class Polygon {
	constructor(options) {
		// TODO: more strict check
		if (!Array.isArray(options.coordinates)) {
			throw new Error('options.coordinates should be an array');
		}

		this.coordinates = options.coordinates;
		this.fillColor = options.fillColor || '';
		this.strokeColor = options.strokeColor || '#000000';
		this.strokeWidth = options.strokeWidth || 2;
		this.simplify = options.simplify || true;
	}

	get extent() {
		return [
			Math.min.apply(null, this.coordinates.map((c) => c[0])),
			Math.min.apply(null, this.coordinates.map((c) => c[1])),
			Math.max.apply(null, this.coordinates.map((c) => c[0])),
			Math.max.apply(null, this.coordinates.map((c) => c[1]))
		];
	}
}

module.exports = Polygon;

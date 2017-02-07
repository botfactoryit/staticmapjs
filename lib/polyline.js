class Polyline {
	constructor(options) {
		// TODO: more strict validation
		if (!Array.isArray(options.coordinates)) {
			throw new Error('options.coordinates should be an array');
		}

		this.coordinates = options.coordinates;
		this.strokeColor = options.strokeColor || '#ffffff';
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

module.exports = Polyline;

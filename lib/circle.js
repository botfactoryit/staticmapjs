class Circle {
	constructor(options) {
		// TODO: check array length
		if (!Array.isArray(options.coordinates)) {
			throw new Error('options.coordinates should be an array');
		}

		if (!options.radius) {
			throw new Error('options.radius in kilometers is required');
		}

		this.coordinates = options.coordinates;
		this.fillColor = options.fillColor || '';
		this.strokeColor = options.strokeColor || '#ffffff';
		this.strokeWidth = options.strokeWidth || 2;
		this.radius = options.radius;
	}
}

module.exports = Circle;

let { PI, log, tan, cos, pow, atan, sinh, round, sqrt } = Math;

module.exports = {
	longitudeToX(lon, zoom) {
		return ((lon + 180.) / 360) * pow(2, zoom);
	},

	latitudeToY(lat, zoom) {
		return (1 - log(tan(lat * PI / 180) + 1 / cos(lat * PI / 180)) / PI) / 2 * pow(2, zoom);
	},

	xToLongitude(x, zoom) {
		return x / pow(2, zoom) * 360.0 - 180.0;
	},
	
	yToLatitude(y, zoom) {
		return atan(sinh(PI * (1 - 2 * y / pow(2, zoom)))) / PI * 180;
	},

	xToPixels(width, tileSize, centerX, x) {
		let px = (x - centerX) * tileSize + width / 2;
		return round(px);
	},

	yToPixels(height, tileSize, centerY, y) {
		let px = (y - centerY) * tileSize + height / 2;
		return round(px);
	},

	pixelsToX(width, tileSize, centerX, px) {
		return (px - width / 2) / tileSize + centerX;
	},

	pixelsToY(height, tileSize, centerY, px) {
		return (px - height / 2) / tileSize + centerY;
	},

	toRadians(angle) {
		return angle * (PI / 180);
	},

	kmsPerPixel(latitude, zoom) {
		return 40075.016686 * cos(this.toRadians(latitude)) / pow(2, zoom + 8);
	},

	simplify(points, tolerance = 11) {
		if (!Array.isArray(points)) {
			return;
		}

		let newPoints = [];
		newPoints.push(points[0]);

		for (let i = 1; i < points.length - 1; i++) {
			let p = points[i];
			let lastPoint = newPoints[newPoints.length - 1];

			let distance = sqrt(pow(lastPoint[0] - p[0], 2) + pow(lastPoint[1] - p[1], 2));
			if (distance > tolerance) {
				newPoints.push(p);
			}
		}

		newPoints.push(points[points.length - 1]);

		return newPoints;
	}
};

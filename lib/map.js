const async    = require('async');
const gm       = require('gm');
const needle   = require('needle');
const tmp      = require('tmp');

const common   = require('./common.js');
const Polyline = require('./polyline.js');
const Circle   = require('./circle.js');
const Polygon  = require('./polygon.js');

tmp.setGracefulCleanup();

class StaticMap {
	constructor(options) {
		if (!options.width || !options.height) {
			throw new Error('Missing width or height option');
		}

		this.width = options.width;
		this.height = options.height;
		this.padding = options.padding || [0, 0];
		this.tileUrlTemplate = options.tileUrlTemplate || 'http://a.tile.openstreetmap.org/{z}/{x}/{y}.png';
		this.tileSize = options.tileSize || 256;
		this.zoom = options.zoom || 0;
		this.center = options.center || null;

		this.circles = [];
		this.lines = [];
		this.polygons = [];
	}

	addPolyline(line) {
		this.lines.push(new Polyline(line));
	}

	addPolygon(polygon) {
		this.polygons.push(new Polygon(polygon));
	}

	addCircle(circle) {
		this.circles.push(new Circle(circle));
	}
	
	render(outputFile, callback) {
		if (!outputFile) {
			callback && callback(new Error('Missing outputFile argument'));
		}

		if (!this.zoom) {
			try	{
				this.zoom = this._calculateZoom();
			}
			catch (e) {
				callback && callback(e);
			}
		}

		// Convert the map center from coordinates to tile numbers
		if (this.center) {
			this.centerX = common.longitudeToX(this.center[0], this.zoom);
			this.centerY = common.latitudeToY(this.center[1], this.zoom);
		}
		else {
			let extent = this._determineExtent();

			let centerLon = (extent[0] + extent[2]) / 2;
			let centerLat = (extent[1] + extent[3]) / 2;

			this.centerX = common.longitudeToX(centerLon, this.zoom);
			this.centerY = common.latitudeToY(centerLat, this.zoom);
		}

		// Create a blank image with GraphicsMagick
		let img = gm(this.width, this.height, '#ffffff');

		this._drawTiles(img, (err) => {
			if (err) {
				callback && callback(err);
				return;
			}

			this._drawFeatures(img);

			img.write(outputFile, (err) => {
				if (err) {
					callback && callback(err);
					return;
				}

				callback();
			});
		});
	}

	_calculateZoom() {
		let found = null;

		for (let z = 17; z >= 0 && found == null; z--) {
			let extent = this._determineExtent(z);

			let width = (common.longitudeToX(extent[2], z) - common.longitudeToX(extent[0], z)) * this.tileSize;
			let height = (common.latitudeToY(extent[1], z) - common.latitudeToY(extent[3], z)) * this.tileSize;

			if (width < this.width - this.padding[0] * 2 &&
				height < this.height - this.padding[1] * 2
			) {
				found = z;
			}
		}

		if (found) {
			return found;
		}
		else {
			throw new Error('Map dimensions (width, height, padding) are too small for the given features');
		}
	}

	_drawTiles(img, callback) {
		// Calculate the x and y indexes of the corner tiles
		let minX = Math.floor(this.centerX - (0.5 * this.width / this.tileSize));
		let minY = Math.floor(this.centerY - (0.5 * this.height / this.tileSize));
		let maxX = Math.ceil(this.centerX + (0.5 * this.width / this.tileSize));
		let maxY = Math.ceil(this.centerY + (0.5 * this.height / this.tileSize));

		// x and y may cross the date line
		// calculate the maximum number for a tile
		let maxTile = Math.pow(2, this.zoom);

		// tiles will be an array of [x, y] arrays,
		// representing the tiles
		let tiles = [];

		for (let x = minX; x <= maxX; x++) {
			for (let y = minY; y <= maxY; y++) {
				// Adjust x and y in case they exceeded the date line
				x = (x + maxTile) % maxTile;
				y = (y + maxTile) % maxTile;

				tiles.push([x, y]);
			}
		}

		// Loop through the tiles
		// For each tile, download the raster png file and paste it onto `img`
		async.eachSeries(tiles, (tile, callback) => {
			let url = this.tileUrlTemplate
						.replace('{x}', tile[0])
						.replace('{y}', tile[1])
						.replace('{z}', this.zoom);
			
			// Generate a temporary file names
			// The `tmp` module makes sure the correct OS tmp dir is used
			// And that the randomly generated file name hasn't been used already
			tmp.tmpName((err, fn) => {
				if (err) {
					callback(err);
					return;
				}

				let options = {
					output: fn,
					open_timeout: 3000, // connection timeout
					read_timeout: 3000  // data transfer timeout
				};
				
				async.retry(3, (cb) => {
					// Download the tile raster image file
					needle.get(url, options).on('end', (err) => {
						if (err) {
							cb(err);
							return;
						}

						// Calculate the position of the tile in pixels on the output image
						let x = common.xToPixels(this.width, this.tileSize, this.centerX, tile[0]);
						let y = common.yToPixels(this.height, this.tileSize, this.centerY, tile[1]);

						// "Paste" the tile on the image
						img.draw(`image over ${x},${y} 0,0 "${fn}"`);

						cb();
					});
				}, callback); // tile download .retry
			}); // .tmpName
		}, callback); // tiles .eachSeries
	}

	_drawFeatures(img) {
		this.lines.forEach((l) => {
			let points = l.coordinates.map((c) => {
				return [
					common.xToPixels(this.width, this.tileSize, this.centerX, common.longitudeToX(c[0], this.zoom)),
					common.yToPixels(this.height, this.tileSize, this.centerY, common.latitudeToY(c[1], this.zoom))
				];
			});

			if (l.simplify) {
				points = common.simplify(points);
			}

			img.fill('');
			img.stroke(l.strokeColor);
			img.strokeWidth(l.strokeWidth);
			img.drawPolyline(points);
		});

		this.polygons.forEach((p) => {
			let points = p.coordinates.map((c) => {
				return [
					common.xToPixels(this.width, this.tileSize, this.centerX, common.longitudeToX(c[0], this.zoom)),
					common.yToPixels(this.height, this.tileSize, this.centerY, common.latitudeToY(c[1], this.zoom))
				];
			});

			if (p.simplify) {
				points = common.simplify(points);
			}

			img.fill(p.fillColor);
			img.stroke(p.strokeColor);
			img.strokeWidth(p.strokeWidth);
			img.drawPolygon(points);
		});

		this.circles.forEach((c) => {
			let center = [
				common.xToPixels(this.width, this.tileSize, this.centerX, common.longitudeToX(c.coordinates[0], this.zoom)),
				common.yToPixels(this.height, this.tileSize, this.centerY, common.latitudeToY(c.coordinates[1], this.zoom))
			];

			img.fill(c.fillColor);
			img.stroke(c.strokeColor);
			img.strokeWidth(c.strokeWidth);

			let kmsPerPixel = common.kmsPerPixel(c.coordinates[1], this.zoom);
			let offset = c.radius / kmsPerPixel;

			img.drawCircle(
				Math.round(center[0]), // origin x
				Math.round(center[1]),
				Math.round(center[0] + offset), // outer border
				Math.round(center[1])
			);
		});
	}

	_determineExtent(zoom = this.zoom) {
		let extents = [];
		
		if (this.lines.length) {
			extents = extents.concat(this.lines.map((p) => p.extent));
		}

		this.circles.forEach((c) => {
			let centerX = common.longitudeToX(c.coordinates[0], zoom);
			let centerY = common.latitudeToY(c.coordinates[1], zoom);

			let offsetPixels = c.radius / common.kmsPerPixel(c.coordinates[1], zoom);
			let offset = offsetPixels / this.tileSize;
			
			let bounds = [
				common.xToLongitude(centerX - offset, zoom),
				common.yToLatitude(centerY + offset, zoom),
				common.xToLongitude(centerX + offset, zoom),
				common.yToLatitude(centerY - offset, zoom)
			];

			extents.push(bounds);
		});

		if (this.polygons.length) {
			extents = extents.concat(this.polygons.map((p) => p.extent));
		}

		return [
			Math.min.apply(null, extents.map((e) => e[0])),
			Math.min.apply(null, extents.map((e) => e[1])),
			Math.max.apply(null, extents.map((e) => e[2])),
			Math.max.apply(null, extents.map((e) => e[3]))
		];
	}
}

function createStaticMap(options) {
	return new StaticMap(options);
}

module.exports = createStaticMap;

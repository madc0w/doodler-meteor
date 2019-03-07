var context = null;
var canvas = null;
var imageDimensions = null;

Template.main.helpers({


});

Template.main.events({
	"change #contrast-range" : function(e) {
		if (imageDimensions) {

			const black = "rgba(0,0,0,255)";
			const white = "rgba(255,255,255,255)";

			//			const black = context.createImageData(1, 1);
			//			black.data = [ 0, 0, 0, 0 ];
			//			const white = context.createImageData(1, 1);
			//			white.data = [ (1 << 8) - 1, (1 << 8) - 1, (1 << 8) - 1, 0 ];

			const contrast = parseInt(e.target.value);
			const cutoff = (1 << 8) * contrast / 100;
			const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
			//			console.log(imageData);
			var offset = 0;
			for (var y = 0; y < imageData.height; y++) {
				console.log("% done", (y / imageData.height) * 100);
				for (var x = 0; x < imageData.width; x++) {
					// turns out value is just max of R, G, B
					const value = Math.max(
						imageData.data[offset++],
						imageData.data[offset++],
						imageData.data[offset++]
					);

					context.fillStyle = value < cutoff ? black : white;
					context.fillRect(x, y, 1, 1);
					//					context.putImageData(value < cutoff ? black : white, x, y);

					//					// RGB
					//					//					const offset = ((y * (imageData.width * 4)) + (x * 4));
					//					const color = [
					//						imageData.data[offset++],
					//						imageData.data[offset++],
					//						imageData.data[offset++]
					//					];
					//					color.alpha = imageData.data[((y * (imageData.width * 4)) + (x * 4)) + 3];
					offset++;
				}
			}
		}
	},

	"change #image-file-chooser" : function(e) {
		//		
		//	},
		//	
		//	"click #load-image-button" : function(e) {
		if (typeof window.FileReader !== "function") {
			alert("The file API isn't supported on this browser yet.");
			return;
		}

		const input = $("#image-file-chooser")[0];
		if (!input) {
			alert("Um, couldn't find the imgfile element.");
		} else if (!input.files) {
			alert("This browser doesn't seem to support the `files` property of file inputs.");
		} else if (!input.files[0]) {
			alert("Please select a file before clicking 'Load'");
		} else {
			const file = input.files[0];
			const fr = new FileReader();
			fr.onload = function() {
				const img = new Image();
				img.onload = function() {
					imageDimensions = {
						width : $(canvas).width(),
						height : img.height * $(canvas).width() / img.width
					}
					context.drawImage(img, 0, 0, imageDimensions.width, imageDimensions.height);
				//						alert(canvas.toDataURL("image/png"));
				};
				img.src = fr.result;
			};
			fr.readAsDataURL(file);
		}

	//		const imageUrl = $("#image-url-text-field").val();
	//		const img = new Image();
	//		img.onload = function() {
	//			//			console.log("scale", width / img.width);
	//			//				context.drawImage(img, 0, 0, img.width, img.height, 0, 0, width, img.height * width / img.width);
	//			imageDimensions = {
	//				width : $(canvas).width(),
	//				height : img.height * $(canvas).width() / img.width
	//			}
	//			context.drawImage(img, 0, 0, imageDimensions.width, imageDimensions.height);
	//		};
	//		img.src = imageUrl;
	//		img.setAttribute("crossOrigin", "");
	},
});


Template.main.onRendered(function() {
	canvas = $("#output-canvas")[0];
	canvas.setAttribute("width", innerWidth - $("#controls").width() - 42)
	//	$("#output-canvas").width(innerWidth - $("#controls").width() - 42);
	context = canvas.getContext("2d");
});


function rgb2hsv(color) {
	r = color.red / 255;
	g = color.green / 255;
	b = color.blue / 255;
	const minRGB = Math.min(r, g, b);
	const maxRGB = Math.max(r, g, b);
	const computedV = maxRGB;

	// Black-gray-white
	if (minRGB == maxRGB) {
		return [ 0, 0, computedV ];
	}

	// Colors other than black-gray-white:
	const d = r == minRGB ? g - b : (b == minRGB ? r - g : b - r);
	const h = r == minRGB ? 3 : (b == minRGB ? 1 : 5);
	const computedH = 60 * (h - d / (maxRGB - minRGB));
	const computedS = (maxRGB - minRGB) / maxRGB;
	return [ computedH, computedS, computedV ];
}

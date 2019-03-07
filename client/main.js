
const black = "rgba(0, 0, 0, 255)";
const white = "rgba(255, 255, 255, 255)";

var canvas = null;
var inputCanvas = null;
var context = null;
var inputContext = null;
var imageDimensions = null;

Template.main.helpers({


});

Template.main.events({
	"change #contrast-range" : function(e) {
		if (imageDimensions) {
			const contrast = parseInt(e.target.value);
			const cutoff = (1 << 8) * contrast / 100;
			const imageData = inputContext.getImageData(0, 0, canvas.width, canvas.height);
			var offset = 0;
			for (var y = 0; y < imageData.height; y++) {
				setProgress(y / imageData.height);
				//				console.log("% done", (y / imageData.height) * 100);
				for (var x = 0; x < imageData.width; x++) {
					// turns out value is just max of R, G, B
					const value = Math.max(
						imageData.data[offset++],
						imageData.data[offset++],
						imageData.data[offset++]
					);

					context.fillStyle = value < cutoff ? black : white;
					context.fillRect(x, y, 1, 1);

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
			setProgress(1);
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
					inputContext.drawImage(img, 0, 0, imageDimensions.width, imageDimensions.height);
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
	const canvasWidth = innerWidth - $("#controls").width() - 42;
	inputCanvas = $("#input-canvas")[0];
	inputCanvas.setAttribute("width", canvasWidth);
	canvas = $("#output-canvas")[0];
	canvas.setAttribute("width", canvasWidth);
	//	$("#output-canvas").width(innerWidth - $("#controls").width() - 42);
	context = canvas.getContext("2d");
	inputContext = inputCanvas.getContext("2d");
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

function setProgress(progress) {
	$("#progress").css("width", (progress * 100) + "%");
	$("#progress-container").css("display", progress >= 1 ? "none" : "block");
}

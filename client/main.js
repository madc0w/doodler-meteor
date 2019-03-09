const black = "#000000";
const white = "#ffffff";

const isContrastComputed = new ReactiveVar(false);
const isImageLoaded = new ReactiveVar(false);

var canvas = null;
var inputCanvas = null;
var context = null;
var inputContext = null;
var img = null;
var imageDimensions = null;

Template.main.helpers({
	isImageLoaded : function() {
		return isImageLoaded.get();
	},

	isContrastComputed : function() {
		return isContrastComputed.get();
	},
});

Template.main.events({
	"click #reset-button" : function(e) {
		isContrastComputed.set(false);
		context.clearRect(0, 0, canvas.width, canvas.height);
		context.drawImage(img, 0, 0, imageDimensions.width, imageDimensions.height);
		inputContext.drawImage(img, 0, 0, imageDimensions.width, imageDimensions.height);
	},

	"click #find-contours-button" : function(e) {
		const contour = [];
		const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
		context.fillStyle = white;
		context.fillRect(0, 0, canvas.width, canvas.height);
		for (var x = 1; x < canvas.width - 1; x++) {
			for (y = 1; y < canvas.height - 1; y++) {
				if (isWhite(getPixel(imageData, x, y)) && (
					isBlack(getPixel(imageData, x - 1, y)) ||
					isBlack(getPixel(imageData, x + 1, y)) ||
					isBlack(getPixel(imageData, x, y - 1)) ||
					isBlack(getPixel(imageData, x, y + 1)))) {
					contour.push([ x, y ]);
					setPixel(context, x, y, black);
				}
			}
		}

	},

	"change #contrast-range" : updateContrast,

	"change input[name='contrast-type']" : updateContrast,

	"change #image-file-chooser" : function(e) {
		isImageLoaded.set(false);
		if (typeof window.FileReader !== "function") {
			alert("The browser you are using sucks.\nTry using Firefox or Chrome instead.");
			return;
		}

		const input = $("#image-file-chooser")[0];
		if (!input) {
			alert("Failed to find the image-file-chooser element.");
		} else if (!input.files) {
			alert("The browser you are using sucks.\nTry using Firefox or Chrome instead.");
		} else if (!input.files[0]) {
			alert("Please select a file before clicking 'Load'.");
		} else {
			showSpinner();
			context.clearRect(0, 0, canvas.width, canvas.height);
			const file = input.files[0];
			const fr = new FileReader();
			fr.onload = function() {
				img = new Image();
				img.onload = function() {
					imageDimensions = {
						width : $(canvas).width(),
						height : img.height * $(canvas).width() / img.width
					}
					context.drawImage(img, 0, 0, imageDimensions.width, imageDimensions.height);
					inputContext.drawImage(img, 0, 0, imageDimensions.width, imageDimensions.height);
					//						alert(canvas.toDataURL("image/png"));
					isImageLoaded.set(true);
					hideSpinner();
				};
				img.onerror = function(e) {
					hideSpinner();
					alert("Well that failed.\nMaybe this file isn't an image?");
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
	inputCanvas = $("#input-canvas")[0];
	canvas = $("#output-canvas")[0];
	context = canvas.getContext("2d");
	inputContext = inputCanvas.getContext("2d");
	function f(c) {
		c.setAttribute("width", innerWidth - $("#controls").width() - 60);
		c.setAttribute("height", innerHeight - 40);
	}
	f(inputCanvas);
	f(canvas)
});


///////////////////////////////////////////////////////////////////////////////////////////////////

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
	const computedH = (h - d / (maxRGB - minRGB)) / 4;
	const computedS = (maxRGB - minRGB) / maxRGB;
	return [ computedH, computedS, computedV ];
}

//function setProgress(progress) {
//	$("#progress").progressbar({
//		value : progress * 100
//	});
//
////	$("#progress").css("width", (progress * 100) + "%");
////	$("#progress-container").css("display", progress >= 1 ? "none" : "block");
//}

function updateContrast() {
	isContrastComputed.set(false);
	if (imageDimensions) {
		showSpinner();
		Meteor.setTimeout(() => {
			const contrast = parseInt($("#contrast-range").val());
			const imageData = inputContext.getImageData(0, 0, canvas.width, canvas.height);
			const contrastType = $("[name='contrast-type']:checked").val();
			var cutoff = contrast / 100;
			if (contrastType == "val") {
				cutoff *= 1 << 8;
			}
			//			console.log("cutoff ", cutoff);
			var offset = 0;
			for (var y = 0; y < imageData.height; y++) {
				//				setProgress(y / imageData.height);
				//				console.log("% done", (y / imageData.height) * 100);
				for (var x = 0; x < imageData.width; x++) {
					var value;
					if (contrastType == "val") {
						// turns out value is just max of R, G, B
						value = Math.max(
							imageData.data[offset++],
							imageData.data[offset++],
							imageData.data[offset++]
						);
					} else {
						const color = {
							red : imageData.data[offset++],
							green : imageData.data[offset++],
							blue : imageData.data[offset++]
						};
						const hsv = rgb2hsv(color);
						if (contrastType == "sat") {
							value = hsv[1];
						} else if (contrastType == "hue") {
							value = hsv[0];
						}
					//						if (Math.random() < 0.02) {
					//							console.log("value ", value);
					//						}
					}

					setPixel(context, x, y, value < cutoff ? black : white);

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
			//			setProgress(1);
			isContrastComputed.set(true);
			hideSpinner();
		}, 0);
	}
}

function showSpinner() {
	$("#spinner").css("display", "block");
}

function hideSpinner() {
	$("#spinner").css("display", "none");
}

function getPixel(imageData, x, y) {
	var offset = 4 * ((y * imageData.width) + x);
	return {
		red : imageData.data[offset++],
		green : imageData.data[offset++],
		blue : imageData.data[offset++],
	//		alpha : imageData.data[offset],
	};
}

function setPixel(context, x, y, color) {
	context.fillStyle = color;
	context.fillRect(x, y, 1, 1);
}

function isBlack(pixel) {
	return pixel.red == 0 && pixel.green == 0 && pixel.blue == 0;
}

function isWhite(pixel) {
	return pixel.red == 255 && pixel.green == 255 && pixel.blue == 255;
}

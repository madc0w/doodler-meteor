import cannyEdgeDetector from "canny-edge-detector";
import Image from "image-js";

const gaussianSigmaDefault = 1.1;
const black = "#000000";
const white = "#ffffff";

const hysteresisThresholds = {
	low : 10,
	high : 30
};
const edgeDetectionType = new ReactiveVar("simple");
const isContrastComputed = new ReactiveVar(false);
const isImageLoaded = new ReactiveVar(false);
const isEdgesComputed = new ReactiveVar(false);
const isShowCannyParams = new ReactiveVar(false);
const isCountourDrawn = new ReactiveVar(false);
const gaussianSigma = new ReactiveVar(1.1);
const contourRadius = new ReactiveVar(6);

var img = null;
var edgeImg = null;
var previewCanvas = null;
var previewContext = null;
var outputContext = null;
var inputCanvas = null;
var inputContext = null;
var outputCanvas = null;
var edgePoints = [];

Template.main.helpers({
	gaussianSigma : function() {
		const n = gaussianSigma.get();
		return n.toFixed(2);
	},

	isImageLoaded : function() {
		return isImageLoaded.get();
	},

	isContrastComputed : function() {
		return isContrastComputed.get();
	},

	isEdgesComputed : function() {
		return isEdgesComputed.get();
	},

	isShowCannyParams : function() {
		return isShowCannyParams.get();
	},

	isCountourDrawn : function() {
		return isCountourDrawn.get();
	},

	contourRadius : function() {
		return contourRadius.get();
	},
});

Template.main.events({
	"click #save-image-button" : function(e) {
		const link = document.createElement("a");
		const base64 = outputCanvas.toDataURL();
		link.setAttribute("href", base64);
		link.setAttribute("download", "contour-doodler-output.png");
		//		link.setAttribute("target", "_blank");
		link.click();
		copyToPreview();
		console.log("saved");
	},

	"click #draw-contours-button" : function(e) {
		isCountourDrawn.set(false);
		showSpinner();
		Meteor.setTimeout(() => {
			const radius = contourRadius.get();
			const isFuzzy = $("#fuzzy-contours-checkbox").is(":checked");
			outputContext.fillStyle = black;
			for (var i in edgePoints) {
				const point = edgePoints[i];
				if (isFuzzy) {
					const grd = outputContext.createRadialGradient(point[0], point[1], 0, point[0], point[1], radius);
					grd.addColorStop(0, black);
					grd.addColorStop(1, "rgba(255, 255, 255, 0)");
					outputContext.fillStyle = grd;
				}
				outputContext.beginPath();
				outputContext.arc(point[0], point[1], radius, 0, 2 * Math.PI);
				outputContext.fill();
			}
			for (var i in edgePoints) {
				const point = edgePoints[i];
				setPixel(outputContext, point[0], point[1], white);
			}
			hideSpinner();
			copyToPreview();
			isCountourDrawn.set(true);
		}, 0);
	},

	"click #reset-button" : function(e) {
		isContrastComputed.set(false);
		isEdgesComputed.set(false);
		isCountourDrawn.set(false);
		previewContext.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
		outputContext.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
		repaint();
	},

	"click #detect-edges-button" : function(e) {
		const edgeAlgorithm = edgeDetectionType.get();
		showSpinner();
		isEdgesComputed.set(false);
		isCountourDrawn.set(false);
		Meteor.setTimeout(() => {
			if (edgeAlgorithm == "none") {
				edgePoints = [];
				const imageData = outputContext.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
				for (var x = 0; x < outputCanvas.width; x++) {
					for (y = 0; y < outputCanvas.height; y++) {
						if (isBlack(getPixel(imageData, x, y))) {
							edgePoints.push([ x, y ]);
						}
					}
				}
				isEdgesComputed.set(true);
				hideSpinner();
			} else if (edgeAlgorithm == "canny") {
				Image.load(outputCanvas.toDataURL()).then(function(image) {
					const gray = image.gray();
					const options = {
						gaussianBlur : gaussianSigma.get(),
						lowThreshold : hysteresisThresholds.low,
						highThreshold : hysteresisThresholds.high,
					};
					const edge = cannyEdgeDetector(gray, options);
					edgeImg.src = edge.toDataURL();
				});
			} else if (edgeAlgorithm == "simple") {
				edgePoints = [];
				const imageData = outputContext.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
				outputContext.fillStyle = white;
				outputContext.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
				for (var x = 1; x < outputCanvas.width - 1; x++) {
					for (y = 1; y < outputCanvas.height - 1; y++) {
						if (isWhite(getPixel(imageData, x, y)) && (
							isBlack(getPixel(imageData, x - 1, y)) ||
							isBlack(getPixel(imageData, x + 1, y)) ||
							isBlack(getPixel(imageData, x, y - 1)) ||
							isBlack(getPixel(imageData, x, y + 1)))) {
							edgePoints.push([ x, y ]);
							setPixel(outputContext, x, y, black);
						}
					}
				}
				isEdgesComputed.set(true);
				copyToPreview();
				hideSpinner();
			}
		}, 0);
	},

	"change input[name='edge-detection-type']" : function(e) {
		isEdgesComputed.set(false);
		isCountourDrawn.set(false);
		edgeDetectionType.set($("[name='edge-detection-type']:checked").val());
		isShowCannyParams.set(edgeDetectionType.get() == "canny");

		if (isShowCannyParams.get()) {
			Meteor.setTimeout(initHysteresisRange, 0);
		}
	},

	"click #contrast-range" : updateContrast,

	"change #contrast-range" : updateContrast,

	"change input[name='contrast-type']" : updateContrast,

	"input #gaussian-sigma-range" : function(e) {
		const value = parseInt($("#gaussian-sigma-range").val());
		gaussianSigma.set(Math.pow(value / 50, 2));
	},

	"input #contour-radius-range" : function(e) {
		const value = parseInt($("#contour-radius-range").val());
		contourRadius.set(value);
	},

	"change #image-file-chooser" : function(e) {
		isImageLoaded.set(false);
		isContrastComputed.set(false);
		isEdgesComputed.set(false);
		isCountourDrawn.set(false);
		if (typeof window.FileReader !== "function") {
			alert("The browser you are using sucks.\nTry using Firefox or Chrome instead.");
			return;
		}

		const input = $("#image-file-chooser")[0];
		if (!input) {
			alert("Failed to find the image-file-chooser element... somehow.");
		} else if (!input.files) {
			alert("The browser you are using sucks.\nTry using Firefox or Chrome instead.");
		} else if (!input.files[0]) {
			alert("Please select a file before clicking 'Load'.");
		} else {
			showSpinner();
			previewContext.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
			const file = input.files[0];
			const fr = new FileReader();
			fr.onload = function() {
				Image.load(fr.result).then(function(image) {
					img.src = image.toDataURL();
				}).then(null, function(err) {
					hideSpinner();
					alert("Well that failed.\n\nMaybe this file isn't an image?");
				});
			};
			fr.readAsDataURL(file);
		}
	},
});


Template.main.onRendered(function() {
	img = $("#input-image")[0];
	edgeImg = $("#edge-image")[0];
	inputCanvas = $("#input-canvas")[0];
	previewCanvas = $("#preview-canvas")[0];
	outputCanvas = $("#output-canvas")[0];
	previewContext = previewCanvas.getContext("2d");
	inputContext = inputCanvas.getContext("2d");
	outputContext = outputCanvas.getContext("2d");
	function f(c) {
		c.setAttribute("width", innerWidth - $("#controls").width() - 60);
		c.setAttribute("height", innerHeight - 40);
	}
	f(inputCanvas);
	f(previewCanvas);

	window.addEventListener("resize", function() {
		f(inputCanvas);
		f(previewCanvas);
	});

	$("#gaussian-sigma-range").val(50 * Math.sqrt(gaussianSigmaDefault));

	img.onload = function() {
		repaint();
		//						alert(previewCanvas.toDataURL("image/png"));
		isImageLoaded.set(true);
		hideSpinner();
	};

	edgeImg.onload = function() {
		outputContext.fillStyle = white;
		outputContext.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
		outputContext.drawImage(edgeImg, 0, 0, outputCanvas.width, outputCanvas.height);

		edgePoints = [];
		const imageData = outputContext.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
		for (var x = 1; x < outputCanvas.width - 1; x++) {
			for (y = 1; y < outputCanvas.height - 1; y++) {
				if (isWhite(getPixel(imageData, x, y))) {
					setPixel(outputContext, x, y, black);
					edgePoints.push([ x, y ]);
				} else {
					setPixel(previewContext, x, y, white);
				}
			}
		}
		isEdgesComputed.set(true);
		copyToPreview();

		hideSpinner();
	};
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
	showSpinner();
	Meteor.setTimeout(() => {
		const contrast = parseInt($("#contrast-range").val());
		const imageData = inputContext.getImageData(0, 0, inputCanvas.width, inputCanvas.height);
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

				setPixel(outputContext, x, y, value < cutoff ? black : white);

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

		copyToPreview();

		isContrastComputed.set(true);
		hideSpinner();
		Meteor.setTimeout(() => {
			$("input[name='edge-detection-type']").prop("checked", false);
			if (edgeDetectionType.get()) {
				$("#edge-detection-type-" + edgeDetectionType.get()).prop("checked", true);
			}
			initHysteresisRange();
		}, 0);
	}, 40);
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
	return !isWhite(pixel);
//	return pixel.red == 0 && pixel.green == 0 && pixel.blue == 0;
}

function isWhite(pixel) {
	return pixel.red == 255 && pixel.green == 255 && pixel.blue == 255;
}

function initHysteresisRange() {
	$("#hysteresis-threshold-range").slider({
		range : true,
		min : 0,
		max : 100,
		values : [ hysteresisThresholds.low, hysteresisThresholds.high ],
		slide : function(event, ui) {
			hysteresisThresholds.low = ui.values[0];
			hysteresisThresholds.high = ui.values[1];
			$($(".ui-slider-handle").get(0)).html(hysteresisThresholds.low);
			$($(".ui-slider-handle").get(1)).html(hysteresisThresholds.high);
		}
	});

	$($(".ui-slider-handle").get(0)).html(hysteresisThresholds.low);
	$($(".ui-slider-handle").get(1)).html(hysteresisThresholds.high);
}

function repaint() {
	const imageDimensions = {
		width : $(previewCanvas).width(),
		height : img.height * $(previewCanvas).width() / img.width
	}
	previewContext.drawImage(img, 0, 0, imageDimensions.width, imageDimensions.height);
	inputCanvas.setAttribute("width", img.width);
	inputCanvas.setAttribute("height", img.height);
	outputCanvas.setAttribute("width", img.width);
	outputCanvas.setAttribute("height", img.height);

	inputContext.drawImage(img, 0, 0, img.width, img.height);
}

function copyToPreview() {
	previewContext.drawImage(outputCanvas, 0, 0, outputCanvas.width, outputCanvas.height, 0, 0, previewCanvas.width, img.height * previewCanvas.width / img.width);
}

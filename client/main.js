var context = null;
var canvas = null;
var imageDimensions = null;

Template.main.helpers({


});

Template.main.events({
	"change #contrast-range" : function(e) {
		if (imageDimensions) {
			console.log("context", context);

			const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
			const contrast = parseInt(e.target.value);


			for (var x = 0; x < imageDimensions.width; x++) {
				for (var y = 0; x < imageDimensions.height; y++) {
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

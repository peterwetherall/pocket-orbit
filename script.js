//Setup global variables
window.mode = "earth";
window.menu = null;
window.focus = null;
window.offset = {x: 0, y: 0};
window.scale = 1;
let canvas = null;
let ctx = null;
let mouse = null;
let hist = null;
let trucs = [];
window.id = 0;
//Space object (e.g. planet, comet etc.)
class Truc {
	//Constructor
	constructor(a, b, c, d, e, f) {
		//Initisialise object's attributes
		this.x = a;
		this.y = b;
		this.v = c;
		this.rotation = 0;
		this.type = d;
		this.target = e;
		this.slider = f;
		//Assign the object a unique id
		this.id = "truc-" + window.id;
		window.id++;
		//Add a HTML image to the DOM
		$(".sprites").append("<div style=\"background: url(images/" + this.type + ".png) no-repeat;background-size:cover;\" id=\"" + this.id + "\"></div>");
		//Allow hover and zoom if orbiting the sun
		if (this.target === trucs[0]) {
			$(".sprites #" + this.id).addClass("white-hover");
		}		
		//Create method of changing the focus
		if (this.id !== "truc-0" && this.target === trucs[0]) {
			$(".sprites #" + this.id).click(e => {
				if (window.focus !== this.id) {
					//Zoom into planet
					window.focus = this.id;
					window.scale = 3; //Should be dynamic depending on the object - yet to come
					$("#zoom").removeClass("active");
				} else {
					//Zoom out of planet
					window.focus = null;
					window.scale = $("#zoom").val();
					$("#zoom").addClass("active");
				}
				e.stopPropagation();
			});
		}	
		//Position is accordindly
		$("#" + this.id).css("width", getSize(this.type, this.slider) + "px").css("height", getSize(this.type, this.slider) + "px");
		$("#" + this.id).css("left", this.x - (getSize(this.type, this.slider) / 2) + "px").css("top", this.y - (getSize(this.type, this.slider) / 2) + "px");
	}
	//Object draw function
	draw (ctx) {
		//Move HTML image according to the corresponding canvas object's position
        	$("#" + this.id).css("width", getSize(this.type, this.slider) * window.scale + "px").css("height", getSize(this.type, this.slider) * window.scale + "px");
        	$("#" + this.id).css("left", Math.round((canvas.width / 2 + (this.x * window.scale)) - (getSize(this.type, this.slider) * window.scale / 2) - (window.offset.x * window.scale)) + "px").css("top", Math.round((canvas.height / 2 + (this.y * window.scale)) - (getSize(this.type, this.slider) * window.scale / 2) - (window.offset.y * window.scale)) + "px");
		//Apply constant clockwise rotation to satelitte sprite
		if (this.type == "satellite") {
			$("#" + this.id).css("transform", "rotate(" + this.rotation + "deg)");
			this.rotation += 1;
		}
	}
	//Object move function - gravitational orbits and collisions
	move (trucs) {
	    //If this object is the current focus, move window appropriately
		if (window.focus == this.id) {
			window.offset.x = this.x;
			window.offset.y = this.y;
		}
		//If this object has a gravitational target
		if (this.target !== null) {
			//Move object towards target @ object's gravitational acceleration / (distance between object and target)^2
			let vector = {x: null, y: null};
			vector.x = this.target.x - this.x;
			vector.y = this.target.y - this.y;
			let r = Math.sqrt(Math.pow(vector.x, 2) + Math.pow(vector.y, 2));
			vector.x = vector.x * getGravity(this.type, this.slider) / Math.pow(r, 3);
			vector.y = vector.y * getGravity(this.type, this.slider) / Math.pow(r, 3);
			this.v.x += vector.x;
			this.v.y += vector.y;
			//If on non-sun gravitational target and out of range, re-assign target
			if (this.target !== trucs[0] && r > getSize(this.target.type, this.target.slider) * 5) {
				this.target = trucs[0];
			}
			//Add on higher-order velocity
			this.x += this.target.v.x;
			this.y += this.target.v.y;
		}
		//For object in space
		for (let cosa of trucs) {
			//If object is inside of other object
			if (this !== cosa && Math.pow(cosa.x - this.x, 2) + Math.pow(cosa.y - this.y, 2) < Math.pow((getSize(this.type, this.slider) / 2) + (getSize(cosa.type, cosa.slider) / 2), 2)) {
				//If other object is target^-1 of object (eg. sun => planet, then kill planet)
				if (cosa.target == this || this == trucs[0]) {
					//Kill other object
					cosa.kill();
					return;
				} else {
					//Calculate distance between centres of the circles
					let d = Math.sqrt(Math.pow(cosa.x - this.x, 2) + Math.pow(cosa.y - this.y, 2));
					//Calculate overlap
					let overLap = 0.5 * (d - (getSize(this.type, this.slider) / 2) - (getSize(cosa.type, cosa.slider) / 2));
					//Alter objects so they no longer overlap
					cosa.x -= overLap * (cosa.x - this.x) / d;
					cosa.y -= overLap * (cosa.y - this.y) / d;
					this.x += overLap * (cosa.x - this.x) / d;
					this.y += overLap * (cosa.y - this.y) / d;
					//Dynamic collision
					//Normal to the objects
					let n = {x: (cosa.x - this.x) / d, y: (cosa.y - this.y) / d};
					//Tangent to the objects
					let t = {x: -n.y, y: n.x};
					//Dot product of tangent and velocity vector
					let dpT = {truc: (this.v.x * t.x) + (this.v.y * t.y), cosa: (cosa.v.x * t.x) + (cosa.v.y * t.y)};
					//Dot product of normal
					let dpN = {truc: (this.v.x * n.x) + (this.v.y * n.y), cosa: (cosa.v.x * n.x) + (cosa.v.y * n.y)};
					//Momentum
					let m1 = 0.8 * (dpN.truc * (getSize(this.type, this.slider) - getSize(cosa.type, cosa.slider)) + 2 * getSize(cosa.type, cosa.slider) * dpN.cosa) / (getSize(this.type, this.slider) + getSize(cosa.type, cosa.slider));
					let m2 = 0.8 * (dpN.cosa * (getSize(cosa.type, cosa.slider) - getSize(this.type, this.slider)) + 2 * getSize(this.type, this.slider) * dpN.truc) / (getSize(this.type, this.slider) + getSize(cosa.type, cosa.slider));
					//Update velocities of objects accordingly
					if (this.target !== cosa && cosa.target !== this) {
						this.v.x = t.x * dpT.truc + n.x * m1;
						this.v.y = t.y * dpT.truc + n.y * m1;
						cosa.v.x = t.x * dpT.cosa + n.x * m2;
						cosa.v.y = t.y * dpT.cosa + n.y * m2;
					}
				}
			}
		}
		//Move object according to its velocity
		this.x += this.v.x;
		this.y += this.v.y;
		//Reset sun to centre with no velocity
		if (this.type == "sun") {
			this.v = {x: 0, y: 0};
			this.x = 0;
			this.y = 0;
		}
		return;
   	}
	//Self-destruct function
	kill () {
		//Remove gravitational pull on any satelittes around oneself
		for (let t of trucs) {
			if (t.target === this) {
				t.target = trucs[0];
			}
		}
		//Remove focus if it is on self
		if (window.focus == this.id) {
			window.focus = null;
			window.scale = $("#zoom").val();
			$("#zoom").addClass("active");
		}
		//Remove self from the list of objects in space
		trucs.splice(trucs.indexOf(this), 1);
        	//Remove HTML image respresenting self
		$("#" + this.id).remove();
		return;
	}
}
//Size determination function
function getSize(a, b) {
	let sizes = [Math.round(((b / 7) * 3) + 2), 100, 11, 29, 30, 16, 75, 60, 55, 40];
	let names = ["comet", "sun", "mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune"];
	return sizes[names.indexOf(a)];
}
//Gravity determination function
function getGravity(a, b) {
	switch (a) {
		case "sun":
			return 0;
			break;
		default:
			return getSize(a, b) * 50;
			break;
	}
}
//On page load ...
$(document).ready(() => {
	//Configure canvas and canvas context
    canvas = document.getElementById("c");
    ctx = canvas.getContext("2d");
	//Set canvas width and height to window size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
	//If the user resizes the window, reload the page
    window.addEventListener("resize", () => {
        location.reload();
    });
//When the mouse is moved/touch screen is interacted with
    $(document).on("mousemove mouseenter touchmove touchenter", e => {
        //If a touch screen
		if (e.originalEvent.touches !== undefined) {
			//Store x and y co-ords of the touch in variable
            mouse = {x: e.originalEvent.touches[0].clientX, y: e.originalEvent.touches[0].clientY};
        } else {
			//Store x and y co-ords of the mouse in variable
			mouse = {x: e.clientX, y: e.clientY};
        }
    });
    $("#massSlider").on("input", e => {
        let size = (($("#massSlider").val() / 7) * 20) + 10;
        $("#massSliderThumbs").html("#massSlider::-webkit-slider-thumb{width:" + size + "px;height:" + size + "px;}#massSlider::-moz-range-thumb{width:" + size + "px;height:" + size + "px;}");
    });
	$("#zoom").on("input", e => {
		if (window.focus === null) {
			window.scale = $("#zoom").val();
		}
	});
    $(".sprites").on("mousedown touchstart", e => {
        e.preventDefault();
        if (e.originalEvent.touches !== undefined) {
	        let mouse = {x: e.originalEvent.touches[0].clientX, y: e.originalEvent.touches[0].clientY};
       		hist = {x: e.originalEvent.touches[0].clientX,
               	    y: e.originalEvent.touches[0].clientY,
               	    g: $("#massSlider").val()
               	    };       
	} else {
         	hist = {x: e.clientX,
                	y: e.clientY,
                	g: $("#massSlider").val()
                	};
	}
    });
    $(".sprites").on("mouseup touchend", e => {
	//Prevent default click action
        e.preventDefault();
        //Set velocity according to drag action (bit dodgy!)
	let histV = {x: (hist.x - mouse.x) / 100, y: (hist.y - mouse.y) / 100};
	//Make sure object is not spawned inside of another
	let inside = false;
	for (let cosa of trucs) {
		if (Math.pow(cosa.x - ((hist.x - canvas.width / 2) / window.scale), 2) + Math.pow(cosa.y - ((hist.y - canvas.height / 2) / window.scale), 2) < Math.pow((getSize(window.mode, hist.g) / 2) + (getSize(cosa.type, cosa.slider) / 2), 2)) {
			inside = true;
		}
	}
	//If the space is clear
	if (inside == false) {
		//Check if NOT focusing in on a planet
		if (window.focus === null) {
			//Create the object and release it into space
			trucs.push(new Truc(((hist.x - canvas.width / 2) / window.scale), ((hist.y - canvas.height / 2) / window.scale), {x: histV.x, y: histV.y}, window.mode, trucs[0], hist.g));
		} else {
			//Create object relative to focused object
			console.log("hello");
			//Find actual orbital target - from truc id
			let actualTarget = null;
			for (let trucTemp of trucs) {
				if (trucTemp.id === window.focus) {
					actualTarget = trucTemp;
				}
			}
			trucs.push(new Truc(((hist.x - canvas.width / 2) / window.scale) + window.offset.x, ((hist.y - canvas.height / 2) / window.scale) + window.offset.y, {x: histV.x, y: histV.y}, window.mode, actualTarget, hist.g));
		}
	}
	//Reset history of mouse/touch movements
	hist = null;
    });
    $(".menu-item").click(e => {
		if (window.menu == "closed") {
			$("#menu").removeClass("closed");
			window.menu = "open";
		} else {
			$(".menu-item.active").removeClass("active");
			$(e.currentTarget).addClass("active");
			window.mode = $(e.currentTarget).attr("name");
			if (window.mode !== "comet") {
				$("#massSlider").removeClass("active");
			} else {
				$("#massSlider").addClass("active");
			}
			$("#menu").addClass("closed");
			window.menu = "closed";
		}
    });
    $(document).on("contextmenu", e => {
		//Prevent default right-click action
		e.preventDefault();
    });
    //Create the sun
    trucs.push(new Truc(0, 0, {x: 0, y: 0}, "sun", null, null));
    i();
});
//Animation loop 
function i() {
    requestAnimationFrame(i);
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (hist != null) {
        ctx.strokeStyle = "white";
        ctx.beginPath();
        ctx.moveTo(hist.x, hist.y);
        ctx.lineTo(mouse.x, mouse.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.fillStyle = "white";
        ctx.arc(hist.x, hist.y, 2, 0, 2 * Math.PI);
        ctx.fill();
    }
    //Set offsets if no focus
    if (window.focus === null) {
		window.offset = {x: 0, y: 0};
    }
    for (let truc of trucs) {
        truc.draw(ctx);
	truc.move(trucs);
    }
};
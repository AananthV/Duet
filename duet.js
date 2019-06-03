(function() {
	var timeouts = [];
	var messageName = "zero-timeout-message";

	function setZeroTimeout(fn) {
		timeouts.push(fn);
		window.postMessage(messageName, "*");
	}

	function handleMessage(event) {
		if (event.source == window && event.data == messageName) {
			event.stopPropagation();
			if (timeouts.length > 0) {
				var fn = timeouts.shift();
				fn();
			}
		}
	}

	window.addEventListener("message", handleMessage, true);

	window.setZeroTimeout = setZeroTimeout;
})();

let FPS = 90;
let highScores = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
let game = null;
let gameStarted = false;
let canvas = null;
let speed = function(fps) {
  FPS = parseInt(fps);
}

class Dot {
  constructor(center, radius) {
    this.center = center;
    this.radius = radius;
    this.colors = [
                  "#264b96",
                  "#27b376",
                  "#006f3c",
                  "#f9a73e",
                  "#bf212f",
                ];
    this.color = this.colors[Math.floor(Math.random() * this.colors.length)];
  }

  updateDot(center) {
    this.center = center;
  }

  isHittingObstacle(obstacles) {
    for(let i of obstacles) {
      if(i.isHittingDot(this.center, this.radius)){
        return true;
      }
    }
    return false;
  }

  returnDrawingCoordinates() {
    return [
      this.center[0],
      this.center[1],
      this.radius,
      0,
      2*Math.PI
    ]
  }
}

class DotGroup {
  constructor(center, orbitRadius, angularVelocity, dotRadius, numberOfDots = 2) {
    this.center = center;
    this.orbitRadius = orbitRadius;
    this.originalRadius = orbitRadius;
    this.dotRadius = dotRadius;
    this.numberOfDots = numberOfDots;
    this.angle = 0;
    this.angularVelocity = angularVelocity;
    this.originalAV = angularVelocity;
    this.direction = 0;
    this.dots = [];
    this.createDots();
  }

  createDots() {
    for(let i = 0; i < this.numberOfDots; i++) {
      this.dots.push(new Dot(this.calculateDotCenter(i), this.dotRadius));
    }
  }

  calculateDotCenter(dotId) {
    let angleOfDot = this.angle + (dotId * 2 * Math.PI / this.numberOfDots);
    return [Math.round(this.center[0] + this.orbitRadius * Math.cos(angleOfDot)),
            Math.round(this.center[1] + this.orbitRadius * Math.sin(angleOfDot))];
  }

  updateAngle() {
    this.angle += this.direction*this.angularVelocity;
  }

  updateGroup() {
    this.updateAngle();
    for(let i in this.dots) {
      this.dots[i].updateDot(this.calculateDotCenter(i));
    }
  }

  isHittingObstacle(obstacles) {
    for(let i in this.dots) {
      if(this.dots[i].isHittingObstacle(obstacles)){
        return true;
      }
    }
    return false;
  }

  returnDrawingCoordinates() {
    return [
      this.center[0],
      this.center[1],
      this.orbitRadius,
      0,
      2*Math.PI
    ];
  }

  combineDots() {
    this.orbitRadius -= 1;
    this.angularVelocity = 0.2;
    this.direction = this.direction || 1;
    let self = this;
    setTimeout(function() {
      if(self.orbitRadius <= 0) {
        self.orbitRadius = self.originalRadius;
        self.angularVelocity = self.originalAV;
        self.direction = 0;
        self.angle = 0;
      } else {
        self.combineDots();
      }
    }, 1000/FPS);
  }
}

class Obstacle {
  constructor(center, dimensions, velocity, angularVelocity = 0) {
    this.center = center.slice(0);
    this.dimensions = dimensions;
    this.velocity = velocity;
    this.angle = 0;
    this.angularVelocity = angularVelocity;
    if(this.angularVelocity != 0) {
      //this.angle = Math.PI*(2*(angularVelocity > 0) - 1);
    }

    // Define Vector Helper functions.
    this.vecSub = (x, y) => [x[0] - y[0], x[1] - y[1]];
    this.vecDot = (x, y) => x[0]*y[0] + x[1]*y[1];
    this.vecSlope = (x, y) => (y[1] - x[1])/(y[0] - x[0]);
    this.rotatePoint = function(point, angle) {
      return [
        point[0] * Math.cos(angle) - point[1] * Math.sin(angle),
        point[0] * Math.sin(angle) + point[1] * Math.cos(angle)
      ];
    }
  }

  update() {
    this.center[1] += this.velocity;
    this.angle += this.angularVelocity;
  }

  returnDrawingCoordinates() {
    return [- Math.round(this.dimensions[0] / 2),
            - Math.round(this.dimensions[1] / 2),
            this.dimensions[0],
            this.dimensions[1]];
  }

  /*returnRectangleCoordinates() {
    return [
      [this.center[0] - Math.round(this.dimensions[0] / 2),
       this.center[1] - Math.round(this.dimensions[1] / 2)],
      [this.center[0] - Math.round(this.dimensions[0] / 2),
       this.center[1] + Math.round(this.dimensions[1] / 2)],
      [this.center[0] + Math.round(this.dimensions[0] / 2),
       this.center[1] + Math.round(this.dimensions[1] / 2)],
      [this.center[0] + Math.round(this.dimensions[0] / 2),
       this.center[1] - Math.round(this.dimensions[1] / 2)],
    ]
  }

/*
    A point M is in the rectangle ABCD iff
      # 0 <= dot(AB,AM) <= dot(AB,AB) and
      # 0 <= dot(BC,BM) <= dot(BC,BC)
  pointInRectangle(point) {
    // Obtain Rectangle ABCD (in that order)
    let rectangle = this.returnRectangleCoordinates();
    let AMdotAB = this.vecDot(this.vecSub(rectangle[1], rectangle[0]),
                              this.vecSub(point, rectangle[0]));
    let ABdotAB = this.vecDot(this.vecSub(rectangle[1], rectangle[0]),
                              this.vecSub(rectangle[1], rectangle[0]));
    let BMdotBC = this.vecDot(this.vecSub(rectangle[2], rectangle[1]),
                              this.vecSub(point, rectangle[1]));
    let BCdotBC = this.vecDot(this.vecSub(rectangle[2], rectangle[1]),
                              this.vecSub(rectangle[2], rectangle[1]));

    // Check Condition
    if(0 <= AMdotAB && AMdotAB <= ABdotAB &&
       0 <= BMdotBC && BMdotBC <= BCdotBC) {
         return true;
    }

    return false;
  }

  intersectCircle(center) {
    // Obtain Rectangle ABCD
    let rectangle = this.returnRectangleCoordinates();

    for(let i = 0; i < 4; i++) {
      let PT1 = rectangle[i];
      let PT2 = rectangle[(i+1) % 4];

      // Find Slope of Perpendicular
      let Slope = -1/(this.vecSlope(PT2, PT1));

      //
    }
  }


  /*
    There exist 2 and only two cases where the circle and
    the rectangle might intersect.
      1. The center of the circle is inside the rectangle.
      2. An edge of the rectangle passes through the circle.


  /*

  */
  isHittingDot(dotCenter, dotRadius) {
    // Axis Align the Rectangle.
    let dotCenterAligned = this.rotatePoint(
      this.vecSub(dotCenter, this.center), - this.angle);

    let circleDistanceX = Math.abs(dotCenterAligned[0]);
    let circleDistanceY = Math.abs(dotCenterAligned[1]);

    if(circleDistanceX > (this.dimensions[0]/2 + dotRadius)) {
      return false;
    }
    if(circleDistanceY > (this.dimensions[1]/2 + dotRadius)) {
      return false;
    }

    if(circleDistanceX <= this.dimensions[0]/2) {
      return true;
    }

    if(circleDistanceY <= this.dimensions[1]/2) {
      return true;
    }

    let cornerDistanceSq = Math.pow(circleDistanceX - this.dimensions[0]/2, 2) -
                        Math.pow(circleDistanceY - this.dimensions[1]/2, 2);
    return (cornerDistanceSq <= Math.pow(dotRadius, 2));
  }

  isOut(canHeight) {
    if(this.center[1] - Math.round(this.dimensions[1]/2) > canHeight) {
      return true;
    }
    return false;
  }
}

class Game {
  constructor(canvas, players = 1, score = 0) {
    let self = this;
    this.canvas = canvas;
    document.addEventListener("keydown", function(e) { self.setDirection(e, self) }, true);
    document.addEventListener("keyup", function(e) { self.stopRotation(e, self) }, true);
    this.ctx = this.canvas.getContext("2d");
  	this.ctx.font="20px Oswald, sans-serif";
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.score = score;
    this.velocityFactor = 5;
    this.velocity = this.velocityFactor*60/FPS;
    this.shortSpawnInterval = 30*(5/this.velocity);
    this.longSpawnInterval = 60*(5/this.velocity);
    this.combineInterval = 80*(5/this.velocity);
    this.intervalType = 1; // 0 - Short, 1 - Long
    this.interval = 0;
    this.paused = false;
		this.gameStarted = true;

    this.players = players; // 1 - Single Player, 2 - MultiPlayer
    this.scores = [];

    this.numDots = 2;
    this.dotGroupRadius = Math.round(this.width * 0.25);
    this.dotRadius = Math.round(this.width/30);
    this.dotAngularVelocity = Math.PI/this.shortSpawnInterval;
    this.dotGroup = null;

    this.obstacles = [];
    this.obstacleTypes = [
      // Left Long Bar
      [
        [Math.round(this.width*0.26), 0],
        [Math.round(this.width*0.52), Math.round(this.height/25)],
        this.velocity
      ],
      // Right Long Bar
      [
        [this.width - Math.round(this.width*0.26), 0],
        [Math.round(this.width*0.52), Math.round(this.height/25)],
        this.velocity
      ],
      // Left Small Bar
      [
        [Math.round(this.width/8), 0],
        [Math.round(this.width/4), Math.round(this.height/25)],
        this.velocity
      ],
      // Right Small Bar
      [
        [this.width - Math.round(this.width/8), 0],
        [Math.round(this.width/4), Math.round(this.height/25)],
        this.velocity
      ],
      // Center Small Bar
      [
        [Math.round(this.width/2), 0],
        [Math.round(this.width/4), Math.round(this.height/25)],
        this.velocity
      ],
      // Left Square
      [
        [Math.round(this.width/3), 0],
        [Math.round(this.width/5), Math.round(this.width/6)],
        this.velocity
      ],
      // Right Square
      [
        [this.width - Math.round(this.width/3), 0],
        [Math.round(this.width/5), Math.round(this.width/6)],
        this.velocity
      ],
      // Center CCW Rotating Long Bar
      [
        [Math.round(this.width/2), 0],
        [Math.round(this.width*0.5), Math.round(this.height/25)],
        this.velocity,
        this.dotAngularVelocity*0.9
      ],
      // Center CW Rotating Long Bar
      [
        [Math.round(this.width/2), 0],
        [Math.round(this.width*0.5), Math.round(this.height/25)],
        this.velocity,
        - this.dotAngularVelocity*0.9
      ]
    ];
    this.powerupTypes = [

    ];
  }

  updateObstacleTypes() {
    this.obstacleTypes = [
      // Left Long Bar
      [
        [Math.round(this.width*0.26), 0],
        [Math.round(this.width*0.52), Math.round(this.height/25)],
        this.velocity
      ],
      // Right Long Bar
      [
        [this.width - Math.round(this.width*0.26), 0],
        [Math.round(this.width*0.52), Math.round(this.height/25)],
        this.velocity
      ],
      // Left Small Bar
      [
        [Math.round(this.width/8), 0],
        [Math.round(this.width/4), Math.round(this.height/25)],
        this.velocity
      ],
      // Right Small Bar
      [
        [this.width - Math.round(this.width/8), 0],
        [Math.round(this.width/4), Math.round(this.height/25)],
        this.velocity
      ],
      // Center Small Bar
      [
        [Math.round(this.width/2), 0],
        [Math.round(this.width/4), Math.round(this.height/25)],
        this.velocity
      ],
      // Left Square
      [
        [Math.round(this.width/3), 0],
        [Math.round(this.width/5), Math.round(this.width/6)],
        this.velocity
      ],
      // Right Square
      [
        [this.width - Math.round(this.width/3), 0],
        [Math.round(this.width/5), Math.round(this.width/6)],
        this.velocity
      ],
      // Center CCW Rotating Long Bar
      [
        [Math.round(this.width/2), 0],
        [Math.round(this.width*0.5), Math.round(this.height/25)],
        this.velocity,
        this.dotAngularVelocity*0.9
      ],
      // Center CW Rotating Long Bar
      [
        [Math.round(this.width/2), 0],
        [Math.round(this.width*0.5), Math.round(this.height/25)],
        this.velocity,
        - this.dotAngularVelocity*0.9
      ]
    ];
  }

  setDirection(e, self) {
    if(e.keyCode == 37) {
      self.dotGroup.direction = -1;
    }
    if(e.keyCode == 39) {
      self.dotGroup.direction = 1;
    }
    if(e.keyCode == 80 && self.paused == false) {
      self.paused = true;
    }
    if(e.keyCode == 82 && self.paused == true) {
      self.paused = false;
      self.update();
    }
  }

  stopRotation(e, self) {
    if(e.keyCode == 37 || e.keyCode == 39) {
      self.dotGroup.direction = 0;
    }
  }

	init() {
		this.scores = [];
	}

  start() {
    this.score = 0;
    this.interval = 0;
    this.intervalType = 0;
    this.dotGroup = new DotGroup(
      [
        Math.round(this.width/2),
        Math.round(this.height*4/5)
      ],
      this.dotGroupRadius,
      this.dotAngularVelocity,
      this.dotRadius,
      this.numDots);
    this.obstacles = [];
    this.obstacleId = 0;
    gameStarted = true;
		this.gameStarted = true;
		this.paused = false;
  }

  update() {
    if(this.paused == false && gameStarted == true && this.gameStarted == true) {
	    this.changeHighScores();
	    this.dotGroup.updateGroup();
	    if(this.dotGroup.isHittingObstacle(this.obstacles)) {
				console.log("lol");
	      this.stop();
				return;
	    }

	    for(let i = 0; i < this.obstacles.length; i++) {
	      this.obstacles[i].update();
	      if(this.obstacles[i].isOut(this.height)) {
	        this.obstacles.splice(i, 1);
	      }
	    }

	    if(this.interval <= 0) {
	      if(this.intervalType == 0) {
	        let obs = this.obstacleTypes[Math.floor(Math.random() * 7)];
	        this.obstacles.push(new Obstacle(...obs));

	        if(Math.random() < 0.8) {
	          this.interval = this.shortSpawnInterval;
	          this.intervalType = 0;
	        } else {
	          this.interval = this.longSpawnInterval;
	          this.intervalType = 1;
	        }
	      } else if (this.intervalType == 1) {
	        let obs = this.obstacleTypes[7 + Math.floor(Math.random() * 2)];
	        this.obstacles.push(new Obstacle(...obs));

	        if(Math.random() < 0.8) {
	          this.interval = this.longSpawnInterval;
	          this.intervalType = 0;
	        } else {
	          this.interval = 1.5*this.longSpawnInterval;
	          this.intervalType = 1;
	        }
	      }
	    }

	    this.interval--;
	    this.score++;

	    if(this.score%1000 == 0 && this.score <= 3000) {
	      this.velocityFactor += 1;
	      this.velocity = this.velocityFactor*60/FPS;
	      this.shortSpawnInterval = 30*(5/this.velocity);
	      this.longSpawnInterval = 60*(5/this.velocity);
	      this.dotAngularVelocity = Math.PI/this.shortSpawnInterval;
	      this.updateObstacleTypes();
	    }

	    if(this.score%1000 == 0) {
	      this.obstacles = [];
	      this.interval = this.combineInterval;
	      this.dotGroup.combineDots();
	    }

	    let self = this;
	    if(FPS == 0){
	      setZeroTimeout(function(){
	        self.update();
	      });
	    } else {
	      setTimeout(function(){
	        self.update();
	      }, 1000/FPS);
	    }
		}
  }

  stop() {
    highScores.push(this.score);
    this.scores.push(this.score);
    highScores.sort(function(a, b){return b - a});
    if(highScores.length > 10) {
      highScores = highScores.slice(0, 10);
    }
    gameStarted = false;
		this.gameStarted = false;
    this.displayScore(this.score);
    updateHighScores();
    localStorage.setItem("hs", JSON.stringify(highScores));
		let self = this;
    document.removeEventListener("keydown", function(e) { self.setDirection(e, self) });
    document.removeEventListener("keyup", function(e) { self.stopRotation(e, self) } );
  }

  changeHighScores() {
    if(gameStarted == true) {
      let tempHighscores = highScores.slice(0);
      highScores.push(this.score);
      highScores.sort(function(a, b){return b - a});
      if(highScores.length > 10) {
        highScores = highScores.slice(0, 10);
      }
      updateHighScores();
      highScores = tempHighscores;
    }
  }

  display() {
    if(gameStarted == false) return;
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.fillRect(0, 0, this.width, this.height);
    for(let obstacle of this.obstacles) {
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.translate(...obstacle.center);
      this.ctx.rotate(obstacle.angle);
      this.ctx.fillStyle = "#ffffff";
      this.ctx.fillRect(...obstacle.returnDrawingCoordinates());
      this.ctx.restore();
    }

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(...this.dotGroup.returnDrawingCoordinates());
    this.ctx.strokeStyle = "#eaeaea";
    this.ctx.stroke();
    this.ctx.strokeStyle = "#ff0000";
    this.ctx.lineWidth = 5;
    this.ctx.beginPath();
    this.ctx.arc(...this.dotGroup.center, this.dotGroup.orbitRadius, this.dotGroup.angle, this.dotGroup.angle + Math.PI*((this.score%1000)/1000));
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.arc(...this.dotGroup.center, this.dotGroup.orbitRadius, Math.PI + this.dotGroup.angle, Math.PI + this.dotGroup.angle + Math.PI*((this.score%1000)/1000));
    this.ctx.stroke();
    this.ctx.restore();

    for(let dot of this.dotGroup.dots) {
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.fillStyle = dot.color;
      this.ctx.arc(...dot.returnDrawingCoordinates());
      this.ctx.fill();
      this.ctx.restore();
    }

    this.ctx.save();
    this.ctx.fillStyle = "white";
  	this.ctx.fillText("Score : "+ this.score, 10, 25);
    this.ctx.restore();

    let self = this;
    requestAnimationFrame(function(){
      self.display();
    });
  }

  displayScore() {
    this.ctx.save();
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);
    this.ctx.textAlign = "center";
    this.ctx.fillStyle = "white";
    this.ctx.fillText("Your Score is: " + this.score, Math.round(canvas.width/2), Math.round(canvas.height/2));

    if(this.players == 1) {
      this.ctx.fillText("Press b to continue", Math.round(canvas.width/2), Math.round(canvas.height*0.9));
    } else {
      this.ctx.fillText("Player " + this.players +" starting in 2s.", Math.round(canvas.width/2), Math.round(canvas.height*0.9));
      let self = this;
      setTimeout(function() {
        self.players--;
        if(self.players > 0) {
          self.start();
          self.update();
          self.display();
        }
      }, 2000);
    }
		console.log(this.scores);
    if(this.scores.length > 1) {
      this.ctx.fillText("Player " + (this.scores.indexOf(Math.max(...this.scores)) + 1).toString() + " wins.", Math.round(canvas.width/2), Math.round(canvas.height*0.75));
    }
    this.ctx.restore();
  }
}

let displayMenu = function() {
  ctx = canvas.getContext("2d");
  this.ctx.font="20px Oswald, sans-serif";
  ctx.save();
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center";
  ctx.fillStyle = "white";
  ctx.fillText("1. Single Player", canvas.width/2, canvas.height*0.4);
  ctx.fillText("2. Multi Player", canvas.width/2, canvas.height*0.5);
  ctx.fillText("3. High Scores", canvas.width/2, canvas.height*0.6);
  ctx.restore();
}

let gamecontrol = function(e) {
  if(e.keyCode == 97 || e.keyCode == 49) {
    if(gameStarted == false) {
			game.players = 1;
			game.init();
      game.start();
      game.update();
      game.display();
    }
  }
  if(e.keyCode == 98 || e.keyCode == 50) {
    if(gameStarted == false) {
			game.players = 2;
			game.init();
      game.start();
      game.update();
      game.display();
    }
  }
  if(e.keyCode == 99 || e.keyCode == 51) {
    if(gameStarted == false) {
      displayHighScores();
    }
  }
  if(e.keyCode == 66) {
    if(gameStarted == false) {
      displayMenu();
    }
  }
}

let updateHighScores = function() {
  let highScoresDiv = document.querySelector("#high-scores");
  // Clear List
  highScoresDiv.innerHTML = "";

  for(let i in highScores) {
    if(highScores[i] <= 0) return;
    let textElement = document.createElement("p");
    textElement.innerHTML = (i).toString() + ". " + highScores[i];
    highScoresDiv.appendChild(textElement);
  }
}

let displayHighScores = function() {
  ctx = canvas.getContext("2d");
  this.ctx.font="20px Oswald, sans-serif";
  ctx.save();
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center";
  ctx.fillStyle = "white";
  for(let i in highScores) {
    ctx.fillText(i + ". " + highScores[i], Math.round(canvas.width/2), Math.round(canvas.height/4 + i*canvas.height*0.05));
  }
  ctx.restore();
}

window.onload = function() {
  canvas = document.querySelector("#duet");
	game = new Game(canvas);
  displayMenu(canvas);
  document.addEventListener("keydown", gamecontrol, true);
  highScores = JSON.parse(localStorage.getItem("hs")) || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  updateHighScores();
}

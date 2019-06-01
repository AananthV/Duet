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

let FPS = 60;
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
    this.dotRadius = dotRadius;
    this.numberOfDots = numberOfDots;
    this.angle = 0;
    this.angularVelocity = angularVelocity;
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
}

class Obstacle {
  constructor(center, dimensions, velocity, angularVelocity = 0) {
    this.center = center.slice(0);
    this.dimensions = dimensions;
    this.velocity = velocity;
    this.angle = 0;
    this.angularVelocity = angularVelocity;
    if(this.angularVelocity != 0) {
      this.angle = 1;
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
  constructor(canvas, score = 0) {
    let self = this;
    this.canvas = canvas;
    document.addEventListener("keydown", function(e) { self.setDirection(e, self) }, true);
    document.addEventListener("keyup", function(e) { self.stopRotation(e, self) }, true);
    this.ctx = this.canvas.getContext("2d");
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.score = score;
    this.velocity = FPS/12;
    this.shortSpawnInterval = 30*(5/this.velocity);
    this.longSpawnInterval = 60*(5/this.velocity);
    this.intervalType = 1; // 0 - Short, 1 - Long
    this.interval = 0;
    this.paused = true;

    this.numDots = 2;
    this.dotGroupRadius = Math.round(this.width * 0.25);
    this.dotRadius = Math.round(this.width/30);
    this.dotAngularVelocity = 1.5*this.velocity/this.dotGroupRadius;
    this.dotGroup = null;

    this.obstacles = [];
    this.obstacleTypes = [
      // Left Long Bar
      [
        [Math.round(this.width*0.26), 0],
        [Math.round(this.width*0.52), Math.round(this.height/20)],
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
    ]
  }

  setDirection(e, self) {
    if(e.keyCode == 37) {
      self.dotGroup.direction = -1;
    }
    if(e.keyCode == 39) {
      self.dotGroup.direction = 1;
    }
  }

  stopRotation(e, self) {
    if(e.keyCode == 37 || e.keyCode == 39) {
      self.dotGroup.direction = 0;
    }
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
  }

  update() {
    this.dotGroup.updateGroup();
    if(this.dotGroup.isHittingObstacle(this.obstacles)) {
      this.start();
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

  stop() {

  }

  display() {
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
    this.ctx.restore();

    for(let dot of this.dotGroup.dots) {
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.fillStyle = dot.color;
      this.ctx.arc(...dot.returnDrawingCoordinates());
      this.ctx.fill();
      this.ctx.restore();
    }

    let self = this;
    requestAnimationFrame(function(){
      self.display();
    });
  }
}

window.onload = function() {
  let canvas = document.querySelector("#duet");
  let game = new Game(canvas);
  game.start();
  game.update();
  game.display();
}

import '../../style.css';

import Rx from 'rx';

/* Graphics */

const canvas = document.querySelector('canvas');
const context = canvas.getContext('2d');
canvas.width = document.body.clientWidth;
canvas.height = document.body.clientHeight;

context.fillStyle = 'white';

const PADDLE_WIDTH = 150;
const PADDLE_HEIGHT = 30;
const BALL_RADIUS = 20;
const BRICK_ROWS = 10;
const BRICK_COLUMNS = 10;
const BRICK_HEIGHT = 40;
const BRICK_GAP = 3;

function drawGameOver(text) {
  context.textAlign = 'center';
  context.font = '10vw Avenir';
  context.fillStyle = 'black';
  context.fillText(text, canvas.width / 2, canvas.height / 2);
}

function drawScore(score) {
  context.textAlign = 'left';
  context.font = '10vw Avenir';
  context.fillText(score, 0, canvas.height);
}

function drawPaddle(position) {
  context.beginPath();
  context.rect(
    position - PADDLE_WIDTH / 2,
    context.canvas.height - PADDLE_HEIGHT,
    PADDLE_WIDTH,
    PADDLE_HEIGHT
  );
  context.fill();
  context.closePath();
}

function drawBall(ball) {
  context.beginPath();
  context.arc(ball.position.x, ball.position.y, BALL_RADIUS, 0, Math.PI * 2)
  context.fill();
  context.closePath();
}

function drawBrick(brick) {
  context.beginPath();
  context.rect(
    brick.x - brick.width / 2,
    brick.y - brick.height / 2,
    brick.width,
    brick.height
  );
  context.fill();
  context.closePath();
}

function drawBricks(bricks) {
  bricks.forEach(brick => drawBrick(brick));
}

/* Sounds */

const audio = new (window.AudioContext || window.webkitAudioContext)();
const beeper = new Rx.Subject();
beeper.sample(100).subscribe(key => {
  let oscillator = audio.createOscillator();
  oscillator.connect(audio.destination);
  oscillator.type = 'square';
  oscillator.frequency.value = Math.pow(2, (key - 49) / 12) * 440;
  oscillator.start();
  oscillator.stop(audio.currentTime + 0.100);
});

/* Ticker */

const TICKER_INTERVAL = 17;

const ticker$ = Rx.Observable
    .interval(TICKER_INTERVAL, Rx.Scheduler.requestAnimationFrame)
    .map(() => ({
        time: Date.now(),
        deltaTime: null
    }))
    .scan(
        (previous, current) => ({
            time: current.time,
            deltaTime: (current.time - previous.time) / 1000
        })
    );


/* Paddle */

const PADDLE_SPEED = 360;
const PADDLE_KEYS = {
    left: 37,
    right: 39
};

const input$ = Rx.Observable
    .merge(
        Rx.Observable.fromEvent(document, 'keydown', event => {
            switch (event.keyCode) {
                case PADDLE_KEYS.left:
                    return -1;
                case PADDLE_KEYS.right:
                    return 1;
                default:
                    return 0;
            }
        }),
        Rx.Observable.fromEvent(document, 'keyup', event => 0)
    )
    .distinctUntilChanged();

const paddle$ = ticker$
    .withLatestFrom(input$)
    .scan((position, [ticker, direction]) => {

        let next = position + direction * ticker.deltaTime * PADDLE_SPEED;
        return Math.max(Math.min(next, canvas.width - PADDLE_WIDTH / 2), PADDLE_WIDTH / 2);

    }, canvas.width / 2)
    .distinctUntilChanged();


/* Ball */

const BALL_SPEED = 100;
const INITIAL_OBJECTS = {
    ball: {
        position: {
            x: canvas.width / 2,
            y: canvas.height / 2
        },
        direction: {
            x: 2,
            y: 2
        }
    },
    bricks: factory(),
    score: 0
};

function hit(paddle, ball) {
    return ball.position.x > paddle - PADDLE_WIDTH / 2
        && ball.position.x < paddle + PADDLE_WIDTH / 2
        && ball.position.y > canvas.height - PADDLE_HEIGHT - BALL_RADIUS / 2;
}

const objects$ = ticker$
    .withLatestFrom(paddle$)
    .scan(({ball, bricks, collisions, score}, [ticker, paddle]) => {

        let survivors = [];
        collisions = {
            paddle: false,
            floor: false,
            wall: false,
            ceiling: false,
            brick: false
        };

        ball.position.x = ball.position.x + ball.direction.x * ticker.deltaTime * BALL_SPEED;
        ball.position.y = ball.position.y + ball.direction.y * ticker.deltaTime * BALL_SPEED;

        bricks.forEach((brick) => {
            if (!collision(brick, ball)) {
                survivors.push(brick);
            } else {
                collisions.brick = true;
                score = score + 10;
            }
        });

        collisions.paddle = hit(paddle, ball);

        if (ball.position.x < BALL_RADIUS || ball.position.x > canvas.width - BALL_RADIUS) {
            ball.direction.x = -ball.direction.x;
            collisions.wall = true;
        }

        collisions.ceiling = ball.position.y < BALL_RADIUS;

        if (collisions.brick || collisions.paddle || collisions.ceiling ) {
            ball.direction.y = -ball.direction.y;
        }

        return {
            ball: ball,
            bricks: survivors,
            collisions: collisions,
            score: score
        };

    }, INITIAL_OBJECTS);


/* Bricks */

function factory() {
    let width = (canvas.width - BRICK_GAP - BRICK_GAP * BRICK_COLUMNS) / BRICK_COLUMNS;
    let bricks = [];

    for (let i = 0; i < BRICK_ROWS; i++) {
        for (let j = 0; j < BRICK_COLUMNS; j++) {
            bricks.push({
                x: j * (width + BRICK_GAP) + width / 2 + BRICK_GAP,
                y: i * (BRICK_HEIGHT + BRICK_GAP) + BRICK_HEIGHT / 2 + BRICK_GAP + 20,
                width: width,
                height: BRICK_HEIGHT
            });
        }
    }

    return bricks;
}

function collision(brick, ball) {
    return ball.position.x + ball.direction.x > brick.x - brick.width / 2
        && ball.position.x + ball.direction.x < brick.x + brick.width / 2
        && ball.position.y + ball.direction.y > brick.y - brick.height / 2
        && ball.position.y + ball.direction.y < brick.y + brick.height / 2;
}

/* Game */

function update([ticker, paddle, objects]) {
  context.clearRect(0, 0, canvas.width, canvas.height);

  drawPaddle(paddle);
  drawBall(objects.ball);
  drawBricks(objects.bricks);
  drawScore(objects.score);

  if (objects.ball.position.y > canvas.height - BALL_RADIUS) {
    beeper.onNext(28);
    drawGameOver('GAME OVER!');
    game.dispose();
  }

  if (!objects.bricks.length) {
    beeper.onNext(25);
    drawGameOver('CONGRATULATIONS!');
    game.dispose();
  }

  if (objects.collisions.paddle) beeper.onNext(40);
  if (objects.collisions.wall || objects.collisions.ceiling) beeper.onNext(45);
  if (objects.collisions.brick) beeper.onNext(47 + Math.floor(objects.ball.position.y % 12));
}

const game = Rx.Observable
  .combineLatest(ticker$, paddle$, objects$)
  .sample(TICKER_INTERVAL)
  .subscribe(update);

import db from '../../utils/dynamodb';
import log from '../../utils/logging';

const { TABLE_GAME } = process.env;

const CANVAS_WIDTH = 750;
const CANVAS_HEIGHT = 585;
const GRID = 15;
const PADDLE_HEIGHT = GRID * 5;
const PADDLE_WIDTH = GRID;
const PADDLE_SPEED = 30;
const MAX_PADDLE_Y = CANVAS_HEIGHT - GRID - PADDLE_HEIGHT;
const BALL_SPEED = 10;
const BALL_WIDTH = GRID;
const BALL_HEIGHT = GRID;
const GAME_WINNING_SCORE = 10;

// Check for collision between two objects using axis-aligned bounding box.
function collides(ax, ay, aw, ah, bx, by, bw, bh) {
  return (
    ax < bx + bw
    && ax + aw > bx
    && ay < by + bh
    && ay + ah > by
  );
}

const deleteGame = async () => {
  const game = {
    TableName: TABLE_GAME,
    Key: {
      pk: 'GAME',
      sk: 'GAME',
    },
  };

  await db.delete(game);
};

const getGame = async () => {
  const game = {
    TableName: TABLE_GAME,
    Key: {
      pk: 'GAME',
      sk: 'GAME',
    },
  };

  const result = await db.get(game);
  return result;
};

class Game {
  static PADDLE_SPEED = PADDLE_SPEED;

  static async create() {
    const currentGame = await getGame();

    if (!currentGame) {
      log.info('Creating new Game, and saving into DB');
      const newGame = {
        TableName: TABLE_GAME,
        Item: {
          pk: 'GAME',
          sk: 'GAME',
        },
      };

      await db.put(newGame);

      return new Game();
    }
    log.info('Not Creating Game, returning nothing!');
    return null;
  }

  // Intended to be private but you can't do private constructors in normal JS.
  // To create a new game use the static method above.
  constructor() {
    this.state = {
      scores: [0, 0],
      paddles: [
        // Left paddle. Start unmoving in the vertical centre of the canvas.
        {
          x: GRID * 2,
          y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
          dy: 0,
        },
        // Right paddle. Start unmoving in the vertical centre of the canvas.
        {
          x: CANVAS_WIDTH - GRID * 3,
          y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
          dy: 0,
        },
      ],
      // Start the ball in the middle of the canvas moving towards the top right.
      ball: {
        x: CANVAS_WIDTH / 2,
        y: CANVAS_HEIGHT / 2,
        dx: BALL_SPEED,
        dy: -BALL_SPEED,
      },
    };
  }

  #movePaddles() {
    const { paddles: [leftPaddle, rightPaddle] } = this.state;

    // Move paddles by their velocity.
    leftPaddle.y += leftPaddle.dy;
    rightPaddle.y += rightPaddle.dy;

    // Prevent paddles from going through walls.
    if (leftPaddle.y < GRID) {
      leftPaddle.y = GRID;
    } else if (leftPaddle.y > MAX_PADDLE_Y) {
      leftPaddle.y = MAX_PADDLE_Y;
    }

    if (rightPaddle.y < GRID) {
      rightPaddle.y = GRID;
    } else if (rightPaddle.y > MAX_PADDLE_Y) {
      rightPaddle.y = MAX_PADDLE_Y;
    }
  }

  #moveBall() {
    const { ball, scores, paddles: [leftPaddle, rightPaddle] } = this.state;
    const result = {
      hasWinner: false,
      bounce: null,
    };

    // Move ball by its velocity.
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Prevent ball from going through walls by changing its velocity to simulate
    // a bounce.
    if (ball.y < GRID) {
      ball.y = GRID;
      ball.dy *= -1;
    } else if (ball.y + GRID > CANVAS_HEIGHT - GRID) {
      ball.y = CANVAS_HEIGHT - GRID * 2;
      ball.dy *= -1;
    }

    // Reset ball if it goes past paddle.
    if ((ball.x < 0 || ball.x > CANVAS_WIDTH)) {
      // Award points.
      if (ball.x < 0) {
        scores[1] += 1;
      } else {
        scores[0] += 1;
      }

      // See if we have a winner
      if (scores[0] > GAME_WINNING_SCORE || scores[1] > GAME_WINNING_SCORE) {
        result.hasWinner = true;
        return result;
      }

      // Reset Ball Position.
      ball.x = CANVAS_WIDTH / 2;
      ball.y = CANVAS_HEIGHT / 2;
    }

    // Check to see if ball collides with paddle. If so, change x velocity.
    if (collides(
      ball.x,
      ball.y,
      BALL_WIDTH,
      BALL_HEIGHT,
      leftPaddle.x,
      leftPaddle.y,
      PADDLE_WIDTH,
      PADDLE_HEIGHT,
    )) {
      ball.dx *= -1;
      result.bounce = 0;

      // Move ball next to the paddle otherwise the collision will happen again
      // in the next frame.
      ball.x = leftPaddle.x + PADDLE_WIDTH;
    } else if (collides(
      ball.x,
      ball.y,
      BALL_WIDTH,
      BALL_HEIGHT,
      rightPaddle.x,
      rightPaddle.y,
      PADDLE_WIDTH,
      PADDLE_HEIGHT,
    )) {
      ball.dx *= -1;
      result.bounce = 1;

      // Move ball next to the paddle otherwise the collision will happen again
      // in the next frame.
      ball.x = rightPaddle.x - BALL_WIDTH;
    }

    return result;
  }

  tick() {
    this.#movePaddles();
    return this.#moveBall();
  }

  getWinner() {
    return this.state.scores[0] > this.state.scores[1] ? 'Left Paddle' : 'Right Paddle';
  }
}

export {
  Game,
  getGame,
  deleteGame,
};

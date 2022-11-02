import { randomItem, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import ws from 'k6/ws';
import { check, sleep } from 'k6';

const sessionDuration = randomIntBetween(30000, 60000); // user session between 30s and 1m

export const options = {
  scenarios: {
    test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 250 },
        { duration: '30s', target: 500 },
      ],
    },
  },
};

export default function () {
  const url = 'wss://35nh7028u2.execute-api.eu-west-2.amazonaws.com/production';
  const params = { headers: { Origin: 'https://example.com' } };

  const res = ws.connect(url, params, (socket) => {
    socket.on('open', () => {
      socket.setInterval(() => {
        socket.send(JSON.stringify({ event: randomItem([1, -1]), paddle: randomItem([1, 0]) }));
      }, randomIntBetween(1000, 2000)); // say something every now and then.
    });

    socket.on('close', () => {
      console.log(`VU ${__VU}: disconnected`);
    });

    socket.on('message', (message) => {
      // console.log(message);
    });

    socket.on('error', (e) => {
      // console.log(e.error());
    });

    socket.setTimeout(() => {
      console.log('Closing the socket');
      socket.close();
    }, sessionDuration);
  });

  check(res, { 'Connected successfully': (r) => r && r.status === 101 });
}

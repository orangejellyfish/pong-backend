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
        { duration: '60s', target: 50 },
        { duration: '60s', target: 40 },
        { duration: '60s', target: 30 },
        { duration: '60s', target: 40 },
        { duration: '60s', target: 50 },
      ],
    },
  },
};

export default function () {
  const url = `wss://mr2kmmhhj4.execute-api.eu-west-1.amazonaws.com/production`;
  const params = { headers: { Origin: `https://example.com`} };

  const res = ws.connect(url, params, function (socket) {
    socket.on('open', function open() {

      socket.setInterval(function timeout() {
        socket.send(JSON.stringify({ event: randomItem([1,-1]), paddle: randomItem([1,0])}));
      }, randomIntBetween(1000, 2000)); // say something every now and then.
    });

    socket.on('ping', function () {
      console.log('PING!');
    });

    socket.on('pong', function () {
      console.log('PONG!');
    });

    socket.on('close', function () {
      console.log(`VU ${__VU}: disconnected`);
    });

    socket.on('message', function (message) {
      // try{
      //   const msg = JSON.parse(message);
      // } catch(err){
      //   console.log('error', message);
      // }
    });

    socket.on('error', function(e) {
      // console.log(e.error());
    })

    socket.setTimeout(function () {
      console.log(`Closing the socket`);
      socket.close();
    }, sessionDuration);
  });

  check(res, { 'Connected successfully': (r) => r && r.status === 101 });
}

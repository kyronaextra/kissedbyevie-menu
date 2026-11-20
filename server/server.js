import { createApp } from './app.js';

const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  console.error(JSON.stringify({ msg: 'invalid_port' }));
  process.exit(1);
}

const app = createApp();
app.listen(port, '0.0.0.0', () => {
  console.log(JSON.stringify({
    msg: 'listening',
    port,
    payments: app.locals.paymentsMode,
  }));
});

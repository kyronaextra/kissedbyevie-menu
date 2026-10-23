# Evie Admin Docker worker starter

A minimal **non-executing** service to host future trusted bot adapters.
The project currently runs as a Render static website; this template must
be deployed as a **separate Render Docker web service** if you choose to use it.

```sh
cd docker/evie-worker
docker build -t evie-worker-starter .
docker run --rm -p 10000:10000 -e EVIE_WORKER_CONTROL_TOKEN='YOUR_RANDOM_PRIVATE_TOKEN' evie-worker-starter
curl http://localhost:10000/healthz
```

Set `EVIE_WORKER_CONTROL_TOKEN` in your Docker/Render secrets, not in GitHub.
The `/admin/ping` endpoint requires that token and is *not yet called by*
the admin dashboard. No message sends, Dropbox reads, shell execution,
job scheduler, or unrestricted agent APIs are present.

The health route is for deployment readiness only. Before connecting
actual automation work, design individual action endpoints with allowlists,
strict user authorization, audit logs, timeouts, and manual approval
for actions like messaging or payments.

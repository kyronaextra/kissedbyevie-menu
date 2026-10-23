FROM node:22-alpine
ENV NODE_ENV=production PORT=10000
WORKDIR /app
COPY --chown=node:node package.json server.mjs ./
USER node
EXPOSE 10000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node","server.mjs"]

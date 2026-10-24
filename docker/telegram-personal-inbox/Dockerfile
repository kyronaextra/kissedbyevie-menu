FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt \
    && useradd --create-home --uid 10001 listener \
    && mkdir -p /app/private \
    && chown -R listener:listener /app
COPY --chown=listener:listener telegram_inbox.py ./
USER listener
# Outbound TLS only; no ports exposed and no browser-to-Telegram login.
CMD ["python","telegram_inbox.py","listen"]

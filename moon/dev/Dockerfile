FROM python:3.11-slim

WORKDIR /app

COPY requirements-deploy.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY app_server.py /app/app_server.py

ENV PORT=5050
EXPOSE 5050

CMD ["sh", "-c", "uvicorn app_server:app --host 0.0.0.0 --port ${PORT}"]

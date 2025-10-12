FROM --platform=linux/amd64 python:3.11-slim

WORKDIR /app

COPY . .

RUN pip install poetry

RUN poetry install
EXPOSE 8000

CMD ["poetry", "run", "uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
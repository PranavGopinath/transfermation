FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --upgrade pip setuptools wheel
RUN pip install -r requirements.txt

# Copy the rest of the application
COPY . .

# Set environment variables (you can override these)
ENV DB_HOST=localhost
ENV DB_NAME=test
ENV DB_USER=test
ENV DB_PASS=test
ENV DB_PORT=5432
ENV PORT=8000

# Expose port
EXPOSE 8000

# Start the application
CMD ["python", "-m", "uvicorn", "src.app.api.common.app:app", "--host", "0.0.0.0", "--port", "8000"]

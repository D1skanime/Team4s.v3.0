FROM golang:1.25-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/server
RUN CGO_ENABLED=0 GOOS=linux go build -o migrate ./cmd/migrate

FROM alpine:3.20
WORKDIR /app

COPY --from=builder /app/server ./server
COPY --from=builder /app/migrate ./migrate

EXPOSE 8092
CMD ["./server"]

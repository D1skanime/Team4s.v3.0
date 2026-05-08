FROM golang:1.25-alpine AS builder

# CGO build tools required for govips (libvips wrapper)
RUN apk add --no-cache build-base pkgconfig vips-dev

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
# CGO_ENABLED=1 required for govips — do NOT change back to 0
RUN CGO_ENABLED=1 GOOS=linux go build -o server ./cmd/server
RUN CGO_ENABLED=1 GOOS=linux go build -o migrate ./cmd/migrate

FROM alpine:3.20
WORKDIR /app

# Runtime shared library for govips dynamic linking
RUN apk add --no-cache vips

COPY --from=builder /app/server ./server
COPY --from=builder /app/migrate ./migrate

EXPOSE 8092
CMD ["./server"]

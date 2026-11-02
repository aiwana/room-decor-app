# Prometheus with the RoomDecor config copied in, so it also works when started by Jenkins
# (Jenkins runs in a container: bind-mounting files from its workspace would not reach Docker Desktop).
FROM prom/prometheus:v3.5.0
COPY prometheus.yml alert-rules.yml /etc/prometheus/

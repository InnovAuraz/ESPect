import argparse
import random
import socket
import subprocess
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.request import urlopen


TRAFFIC_TYPES = {
    "icmp",
    "web",
    "email",
    "video",
    "voip",
    "whatsapp",
}

ROLES = {
    "sender",
    "receiver",
    "peer",
}

# Dedicated ports so multiple traffic profiles can run independently.
WEB_PORT = 8080
EMAIL_PORT = 2525
VIDEO_PORT = 5001
VOIP_PORT = 5002
WHATSAPP_PORT = 8081

# ICMP
ICMP_COUNT = 10
ICMP_INTERVAL = 0.2

# WEB: 10 page loads with realistic response sizes and reading delay.
WEB_REQUESTS = 10
WEB_MIN_PAYLOAD = 50_000
WEB_MAX_PAYLOAD = 500_000
WEB_MIN_DELAY = 0.5
WEB_MAX_DELAY = 2.5
WEB_CONNECT_RETRIES = 20
WEB_CONNECT_RETRY_DELAY = 0.1
WEB_REQUEST_TIMEOUT = 10
WEB_RECEIVER_TIMEOUT = (
    WEB_REQUESTS * WEB_REQUEST_TIMEOUT
    + max(0, WEB_REQUESTS - 1) * WEB_MAX_DELAY
    + 15
)

# EMAIL
EMAIL_MIN_BODY = 500
EMAIL_MAX_BODY = 5_000
EMAIL_CONNECT_RETRIES = 20
EMAIL_CONNECT_RETRY_DELAY = 0.1
EMAIL_SOCKET_TIMEOUT = 15

# VIDEO: 30 FPS, with I-frame-like bursts and variable UDP packet sizes.
VIDEO_DURATION = 5
VIDEO_FPS = 30
VIDEO_MIN_PACKET_SIZE = 1_000
VIDEO_MAX_PACKET_SIZE = 1_400
VIDEO_I_FRAME_EVERY = 30
VIDEO_I_FRAME_PACKETS = (8, 15)
VIDEO_P_FRAME_PACKETS = (1, 4)
VIDEO_RECEIVER_GRACE = 3
VIDEO_RECEIVE_BUFFER = 65_535

# VOIP
VOIP_DURATION = 5
VOIP_INTERVAL = 0.02
VOIP_PACKET_SIZE = 160
VOIP_RECEIVE_BUFFER = 4096

# WHATSAPP-like controlled TCP messaging.
WHATSAPP_MESSAGES = 20
WHATSAPP_MIN_MESSAGE_SIZE = 10
WHATSAPP_MAX_MESSAGE_SIZE = 400
WHATSAPP_MIN_DELAY = 0.5
WHATSAPP_MAX_DELAY = 3.5
WHATSAPP_CONNECT_RETRIES = 20
WHATSAPP_CONNECT_RETRY_DELAY = 0.1
WHATSAPP_SOCKET_TIMEOUT = 15
WHATSAPP_LENGTH_PREFIX_SIZE = 4


class TrafficError(RuntimeError):
    """Raised when a generated traffic profile cannot complete."""


def _family(address: str) -> int:
    """Return IPv4/IPv6 socket family for a literal IP address."""
    try:
        socket.inet_pton(socket.AF_INET, address)
        return socket.AF_INET
    except OSError:
        pass

    try:
        socket.inet_pton(socket.AF_INET6, address)
        return socket.AF_INET6
    except OSError as exc:
        raise TrafficError(f"Invalid IP address: {address}") from exc


def _address(family: int, host: str, port: int) -> tuple:
    """Build a connect/send address for IPv4 or IPv6."""
    if family == socket.AF_INET:
        return host, port
    return host, port, 0, 0


def _bind_address(family: int, port: int) -> tuple:
    """Build a wildcard bind address for IPv4 or IPv6."""
    if family == socket.AF_INET:
        return "0.0.0.0", port
    return "::", port, 0, 0


def command(traffic_type: str, role: str, target: str) -> list[str]:
    """Build the subprocess command for the traffic profile."""
    if traffic_type not in TRAFFIC_TYPES:
        raise TrafficError(f"Unsupported traffic type: {traffic_type}")
    if role not in ROLES:
        raise TrafficError(f"Unsupported traffic role: {role}")
    if not target:
        raise TrafficError("Traffic target is required")

    _family(target)

    return [
        sys.executable,
        "-m",
        "src.traffic.traffic",
        "--run",
        traffic_type,
        "--role",
        role,
        "--target",
        target,
    ]


def run(traffic_type: str, role: str, target: str) -> None:
    """Run one traffic profile as a child Python process."""
    args = command(traffic_type, role, target)
    try:
        result = subprocess.run(args, check=False)
    except OSError as exc:
        raise TrafficError(f"Failed to execute {traffic_type} traffic") from exc

    if result.returncode != 0:
        raise TrafficError(f"Traffic command failed: {traffic_type}/{role}")


# ---------------------------------------------------------------------------
# ICMP
# ---------------------------------------------------------------------------


def _run_icmp(role: str, target: str) -> None:
    if role == "receiver":
        # Receiver is passive for ICMP; keep the process alive while packets arrive.
        time.sleep(ICMP_COUNT * ICMP_INTERVAL + 1)
        return

    if role == "peer":
        raise TrafficError("ICMP does not support the peer role")

    family = _family(target)
    if family == socket.AF_INET:
        args = [
            "ping",
            "-c",
            str(ICMP_COUNT),
            "-i",
            str(ICMP_INTERVAL),
            target,
        ]
    else:
        args = [
            "ping",
            "-6",
            "-c",
            str(ICMP_COUNT),
            "-i",
            str(ICMP_INTERVAL),
            target,
        ]

    try:
        result = subprocess.run(args, check=False)
    except OSError as exc:
        raise TrafficError("Failed to execute ICMP traffic") from exc

    if result.returncode != 0:
        raise TrafficError("ICMP traffic failed")


# ---------------------------------------------------------------------------
# WEB
# ---------------------------------------------------------------------------


class _WebHandler(BaseHTTPRequestHandler):
    """HTTP handler used only to generate controlled web traffic."""

    request_counter: dict[str, int] | None = None
    request_lock: threading.Lock | None = None
    request_event: threading.Event | None = None

    def do_GET(self) -> None:  # noqa: N802 - stdlib handler API
        body_length = random.randint(WEB_MIN_PAYLOAD, WEB_MAX_PAYLOAD)
        body = b"SIH_" + b"A" * (body_length - 4)

        self.send_response(200)
        self.send_header("Content-Type", "text/plain")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Connection", "close")
        self.end_headers()
        self.wfile.write(body)

        if (
            self.request_counter is not None
            and self.request_lock is not None
            and self.request_event is not None
        ):
            with self.request_lock:
                self.request_counter["count"] += 1
                if self.request_counter["count"] >= WEB_REQUESTS:
                    self.request_event.set()

    def log_message(self, format: str, *args: object) -> None:
        return


class _IPv6HTTPServer(ThreadingHTTPServer):
    address_family = socket.AF_INET6


def _create_http_server(family: int) -> ThreadingHTTPServer:
    server_class = (
        ThreadingHTTPServer if family == socket.AF_INET else _IPv6HTTPServer
    )
    return server_class(_bind_address(family, WEB_PORT), _WebHandler)


def _web_receiver(target: str) -> None:
    """Serve exactly WEB_REQUESTS requests, avoiding premature shutdown."""
    family = _family(target)
    server = _create_http_server(family)

    counter = {"count": 0}
    request_lock = threading.Lock()
    complete_event = threading.Event()

    _WebHandler.request_counter = counter
    _WebHandler.request_lock = request_lock
    _WebHandler.request_event = complete_event

    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    try:
        if not complete_event.wait(timeout=WEB_RECEIVER_TIMEOUT):
            raise TrafficError(
                f"Web sender completed only {counter['count']}/{WEB_REQUESTS} requests"
            )
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)
        _WebHandler.request_counter = None
        _WebHandler.request_lock = None
        _WebHandler.request_event = None


def _web_sender(target: str) -> None:
    family = _family(target)
    host = f"[{target}]" if family == socket.AF_INET6 else target
    url = f"http://{host}:{WEB_PORT}/"

    last_error: OSError | None = None

    # Wait for the receiver to become ready.
    for _ in range(WEB_CONNECT_RETRIES):
        try:
            with urlopen(url, timeout=WEB_REQUEST_TIMEOUT) as response:
                if response.status != 200:
                    raise TrafficError(
                        f"HTTP server returned status {response.status}"
                    )
                response.read()
            last_error = None
            break
        except OSError as exc:
            last_error = exc
            time.sleep(WEB_CONNECT_RETRY_DELAY)
    else:
        raise TrafficError("Web receiver was not reachable") from last_error

    # Remaining requests simulate page navigation/reading time.
    for _ in range(WEB_REQUESTS - 1):
        time.sleep(random.uniform(WEB_MIN_DELAY, WEB_MAX_DELAY))
        try:
            with urlopen(url, timeout=WEB_REQUEST_TIMEOUT) as response:
                if response.status != 200:
                    raise TrafficError("HTTP request failed")
                response.read()
        except OSError as exc:
            raise TrafficError("Web traffic failed") from exc


# ---------------------------------------------------------------------------
# EMAIL
# ---------------------------------------------------------------------------


def _email_receiver(target: str) -> None:
    family = _family(target)
    server = socket.socket(family, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.settimeout(EMAIL_SOCKET_TIMEOUT)
    server.bind(_bind_address(family, EMAIL_PORT))
    server.listen(1)

    try:
        connection, _ = server.accept()
        with connection:
            connection.settimeout(EMAIL_SOCKET_TIMEOUT)
            connection.sendall(b"220 SIH SMTP\r\n")

            expected = [b"HELO", b"MAIL FROM:", b"RCPT TO:", b"DATA"]
            for expected_command in expected:
                data = connection.recv(4096)
                if expected_command not in data.upper():
                    raise TrafficError("Invalid email sequence")

                if expected_command == b"DATA":
                    connection.sendall(b"354 End data\r\n")
                    data = connection.recv(65_536)
                    if not data:
                        raise TrafficError("Email body missing")
                    connection.sendall(b"250 OK\r\n")
                else:
                    connection.sendall(b"250 OK\r\n")

            data = connection.recv(4096)
            if data:
                connection.sendall(b"221 Bye\r\n")

    except socket.timeout as exc:
        raise TrafficError("Email sender did not connect or complete") from exc
    except OSError as exc:
        raise TrafficError("Email receiver failed") from exc
    finally:
        server.close()


def _email_sender(target: str) -> None:
    family = _family(target)
    connection: socket.socket | None = None
    last_error: OSError | None = None

    for _ in range(EMAIL_CONNECT_RETRIES):
        candidate = socket.socket(family, socket.SOCK_STREAM)
        candidate.settimeout(EMAIL_SOCKET_TIMEOUT)
        try:
            candidate.connect(_address(family, target, EMAIL_PORT))
            connection = candidate
            last_error = None
            break
        except OSError as exc:
            last_error = exc
            candidate.close()
            time.sleep(EMAIL_CONNECT_RETRY_DELAY)

    if connection is None:
        raise TrafficError("Email receiver was not reachable") from last_error

    try:
        if not connection.recv(4096):
            raise TrafficError("SMTP greeting missing")

        commands = [
            b"HELO sih\r\n",
            b"MAIL FROM:<vm@sih.local>\r\n",
            b"RCPT TO:<vm@sih.local>\r\n",
            b"DATA\r\n",
        ]

        for data in commands:
            connection.sendall(data)
            response = connection.recv(4096)
            if not response:
                raise TrafficError("SMTP response missing")

        body_length = random.randint(EMAIL_MIN_BODY, EMAIL_MAX_BODY)
        email_body = (
            b"Subject: SIH IPsec experiment\r\n"
            b"\r\n"
            b"Controlled email traffic.\r\n"
            + b"E" * body_length
            + b"\r\n.\r\n"
        )
        connection.sendall(email_body)

        if not connection.recv(4096):
            raise TrafficError("Email DATA response missing")

        connection.sendall(b"QUIT\r\n")
        connection.recv(4096)
    except OSError as exc:
        raise TrafficError("Email traffic failed") from exc
    finally:
        connection.close()


# ---------------------------------------------------------------------------
# VIDEO
# ---------------------------------------------------------------------------


def _video_receiver(target: str) -> None:
    family = _family(target)
    sock = socket.socket(family, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF, 4 * 1024 * 1024)
    sock.bind(_bind_address(family, VIDEO_PORT))
    sock.settimeout(1)

    received = 0
    deadline = time.monotonic() + VIDEO_DURATION + VIDEO_RECEIVER_GRACE

    try:
        while time.monotonic() < deadline:
            try:
                data, _ = sock.recvfrom(VIDEO_RECEIVE_BUFFER)
            except socket.timeout:
                continue
            if data:
                received += 1
    finally:
        sock.close()

    if received == 0:
        raise TrafficError("No video traffic was received")


def _video_sender(target: str) -> None:
    family = _family(target)
    sock = socket.socket(family, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, 4 * 1024 * 1024)
    address = _address(family, target, VIDEO_PORT)
    deadline = time.monotonic() + VIDEO_DURATION
    interval = 1.0 / VIDEO_FPS
    frame_count = 0

    try:
        while time.monotonic() < deadline:
            frame_count += 1
            is_i_frame = frame_count % VIDEO_I_FRAME_EVERY == 0
            packet_count_range = (
                VIDEO_I_FRAME_PACKETS if is_i_frame else VIDEO_P_FRAME_PACKETS
            )
            packets_in_frame = random.randint(*packet_count_range)

            for _ in range(packets_in_frame):
                packet_size = random.randint(
                    VIDEO_MIN_PACKET_SIZE, VIDEO_MAX_PACKET_SIZE
                )
                packet = b"VIDEO" + b"X" * (packet_size - 5)
                sock.sendto(packet, address)

            time.sleep(interval)
    except OSError as exc:
        raise TrafficError("Video traffic failed") from exc
    finally:
        sock.close()


# ---------------------------------------------------------------------------
# VOIP
# ---------------------------------------------------------------------------


def _voip_receiver(
    target: str,
    stop_event: threading.Event,
    counter: dict[str, int],
) -> None:
    family = _family(target)
    sock = socket.socket(family, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF, 2 * 1024 * 1024)
    sock.bind(_bind_address(family, VOIP_PORT))
    sock.settimeout(0.2)

    try:
        while not stop_event.is_set():
            try:
                data, _ = sock.recvfrom(VOIP_RECEIVE_BUFFER)
            except socket.timeout:
                continue
            if data:
                counter["received"] += 1
    finally:
        sock.close()


def _voip_peer(target: str) -> None:
    family = _family(target)
    stop_event = threading.Event()
    counter = {"received": 0}

    receiver = threading.Thread(
        target=_voip_receiver,
        args=(target, stop_event, counter),
        daemon=True,
    )
    receiver.start()
    time.sleep(0.1)

    sock = socket.socket(family, socket.SOCK_DGRAM)
    address = _address(family, target, VOIP_PORT)
    packet = b"VOIP" + b"X" * (VOIP_PACKET_SIZE - 4)
    deadline = time.monotonic() + VOIP_DURATION

    try:
        while time.monotonic() < deadline:
            sock.sendto(packet, address)
            time.sleep(VOIP_INTERVAL)
    except OSError as exc:
        raise TrafficError("VoIP traffic failed") from exc
    finally:
        sock.close()
        stop_event.set()

    receiver.join(timeout=2)

    # This local receive check is useful when two peer processes are exchanging traffic.
    if counter["received"] == 0:
        raise TrafficError("No VoIP traffic was received")


# ---------------------------------------------------------------------------
# WHATSAPP-LIKE CONTROLLED MESSAGING
# ---------------------------------------------------------------------------


def _recv_exact(sock: socket.socket, size: int) -> bytes:
    """Read exactly size bytes from a TCP stream."""
    chunks = bytearray()
    while len(chunks) < size:
        chunk = sock.recv(size - len(chunks))
        if not chunk:
            raise TrafficError("Connection closed before complete message")
        chunks.extend(chunk)
    return bytes(chunks)


def _whatsapp_receiver(target: str) -> None:
    family = _family(target)
    server = socket.socket(family, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.settimeout(WHATSAPP_SOCKET_TIMEOUT)
    server.bind(_bind_address(family, WHATSAPP_PORT))
    server.listen(1)

    try:
        connection, _ = server.accept()
        with connection:
            connection.settimeout(WHATSAPP_SOCKET_TIMEOUT)
            for _ in range(WHATSAPP_MESSAGES):
                raw_length = _recv_exact(connection, WHATSAPP_LENGTH_PREFIX_SIZE)
                message_length = int.from_bytes(raw_length, "big")

                if not (
                    WHATSAPP_MIN_MESSAGE_SIZE
                    <= message_length
                    <= WHATSAPP_MAX_MESSAGE_SIZE + 64
                ):
                    raise TrafficError("Invalid messaging payload length")

                _recv_exact(connection, message_length)
                connection.sendall(b"ACK")
    except socket.timeout as exc:
        raise TrafficError("Messaging peer did not connect or complete") from exc
    except OSError as exc:
        raise TrafficError("Messaging receiver failed") from exc
    finally:
        server.close()


def _whatsapp_sender(target: str) -> None:
    family = _family(target)
    connection: socket.socket | None = None
    last_error: OSError | None = None

    for _ in range(WHATSAPP_CONNECT_RETRIES):
        candidate = socket.socket(family, socket.SOCK_STREAM)
        candidate.settimeout(WHATSAPP_SOCKET_TIMEOUT)
        try:
            candidate.connect(_address(family, target, WHATSAPP_PORT))
            candidate.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
            connection = candidate
            last_error = None
            break
        except OSError as exc:
            last_error = exc
            candidate.close()
            time.sleep(WHATSAPP_CONNECT_RETRY_DELAY)

    if connection is None:
        raise TrafficError("Messaging peer was not reachable") from last_error

    try:
        for number in range(WHATSAPP_MESSAGES):
            # Random typing/read delay to avoid a perfectly periodic TCP pattern.
            time.sleep(random.uniform(WHATSAPP_MIN_DELAY, WHATSAPP_MAX_DELAY))

            message_length = random.randint(
                WHATSAPP_MIN_MESSAGE_SIZE,
                WHATSAPP_MAX_MESSAGE_SIZE,
            )
            message = f"msg-{number}-".encode() + b"W" * message_length

            connection.sendall(len(message).to_bytes(4, "big"))
            connection.sendall(message)

            if connection.recv(4096) != b"ACK":
                raise TrafficError("Messaging acknowledgement missing")
    except OSError as exc:
        raise TrafficError("Messaging traffic failed") from exc
    finally:
        connection.close()


# ---------------------------------------------------------------------------
# PROFILE DISPATCH
# ---------------------------------------------------------------------------


def _run_profile(traffic_type: str, role: str, target: str) -> None:
    if traffic_type == "icmp":
        _run_icmp(role, target)
        return

    if traffic_type == "web":
        if role == "sender":
            _web_sender(target)
        elif role == "receiver":
            _web_receiver(target)
        else:
            raise TrafficError("Web supports sender/receiver roles only")
        return

    if traffic_type == "email":
        if role == "sender":
            _email_sender(target)
        elif role == "receiver":
            _email_receiver(target)
        else:
            raise TrafficError("Email supports sender/receiver roles only")
        return

    if traffic_type == "video":
        if role == "sender":
            _video_sender(target)
        elif role == "receiver":
            _video_receiver(target)
        else:
            raise TrafficError("Video supports sender/receiver roles only")
        return

    if traffic_type == "voip":
        if role != "peer":
            raise TrafficError("VoIP requires the peer role")
        _voip_peer(target)
        return

    if traffic_type == "whatsapp":
        if role == "sender":
            _whatsapp_sender(target)
        elif role == "receiver":
            _whatsapp_receiver(target)
        else:
            raise TrafficError("WhatsApp traffic supports sender/receiver roles only")
        return

    raise TrafficError(f"Unsupported traffic type: {traffic_type}")


def _main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate controlled IPv4/IPv6 traffic profiles for IPsec/VPN analysis."
    )
    parser.add_argument(
        "--run",
        choices=sorted(TRAFFIC_TYPES),
        required=True,
        help="Traffic profile to generate",
    )
    parser.add_argument(
        "--role",
        choices=sorted(ROLES),
        required=True,
        help="sender, receiver, or peer",
    )
    parser.add_argument(
        "--target",
        required=True,
        help="Literal IPv4 or IPv6 address of the traffic peer",
    )

    args = parser.parse_args()

    try:
        _run_profile(args.run, args.role, args.target)
    except TrafficError as exc:
        print(str(exc), file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(_main())

"""Controlled application-like traffic generator for the ESPect VMs.

The public interface intentionally remains compatible with the existing agent:

    python -m src.traffic.traffic --run <type> --role <role> --target <IP>

Install this exact file as src/traffic/traffic.py on BOTH VM1 and VM2.
"""

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

ROLES = {"sender", "receiver", "peer"}

# Keep the existing service ports unchanged.
WEB_PORT = 8080
EMAIL_PORT = 2525
VIDEO_PORT = 5001
VOIP_PORT = 5002
WHATSAPP_PORT = 8081

# ---------------------------------------------------------------------------
# Profile controls
# ---------------------------------------------------------------------------

# ICMP: low-rate, small periodic request/reply flow.
ICMP_COUNT = 20
ICMP_INTERVAL = 0.25
ICMP_PAYLOAD_SIZE = 64
ICMP_RECEIVER_GRACE = 2.0

# WEB: several short-lived HTTP page loads with large, variable responses.
WEB_REQUESTS = 8
WEB_MIN_PAYLOAD = 80_000
WEB_MAX_PAYLOAD = 420_000
WEB_MIN_DELAY = 0.25
WEB_MAX_DELAY = 0.65
WEB_CONNECT_RETRIES = 30
WEB_CONNECT_RETRY_DELAY = 0.10
WEB_REQUEST_TIMEOUT = 8
WEB_RECEIVER_TIMEOUT = 15

# EMAIL: a small number of separate SMTP-like TCP sessions with medium bursts.
EMAIL_MESSAGES = 2
EMAIL_MIN_BODY = 4_000
EMAIL_MAX_BODY = 10_000
EMAIL_CONNECT_RETRIES = 30
EMAIL_CONNECT_RETRY_DELAY = 0.10
EMAIL_SOCKET_TIMEOUT = 10
EMAIL_INTER_MESSAGE_DELAY = (0.45, 0.90)

# VIDEO: UDP frame bursts. The one-second I-frame cadence is deliberately
# different from VoIP's steady 20 ms cadence.
VIDEO_DURATION = 5.0
VIDEO_FPS = 30
VIDEO_MIN_PACKET_SIZE = 1_050
VIDEO_MAX_PACKET_SIZE = 1_350
VIDEO_I_FRAME_EVERY = 30
VIDEO_I_FRAME_PACKETS = (10, 18)
VIDEO_P_FRAME_PACKETS = (2, 4)
VIDEO_STARTUP_DELAY = 0.30
VIDEO_RECEIVER_GRACE = 1.5
VIDEO_RECEIVE_BUFFER = 65_535

# VOIP: fixed-size RTP-like packets at a 20 ms cadence, bidirectional because
# both VMs run the peer role.
VOIP_DURATION = 5.0
VOIP_INTERVAL = 0.020
VOIP_PACKET_SIZE = 160
VOIP_JITTER = 0.0015
VOIP_STARTUP_DELAY = 0.30
VOIP_RECEIVE_BUFFER = 4_096

# WHATSAPP-like messaging: one long TCP session, tiny text bursts, irregular
# human-style gaps, length framing and ACKs.
WHATSAPP_MESSAGES = 12
WHATSAPP_MIN_MESSAGE_SIZE = 24
WHATSAPP_MAX_MESSAGE_SIZE = 600
WHATSAPP_MIN_DELAY = 0.20
WHATSAPP_MAX_DELAY = 0.55
WHATSAPP_CONNECT_RETRIES = 30
WHATSAPP_CONNECT_RETRY_DELAY = 0.10
WHATSAPP_SOCKET_TIMEOUT = 10
WHATSAPP_LENGTH_PREFIX_SIZE = 4


class TrafficError(RuntimeError):
    """Raised when a traffic profile cannot complete successfully."""


def _family(address: str) -> int:
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
    if family == socket.AF_INET:
        return host, port
    return host, port, 0, 0


def _bind_address(family: int, port: int) -> tuple:
    if family == socket.AF_INET:
        return "0.0.0.0", port
    return "::", port, 0, 0


def _sleep_until(deadline: float) -> None:
    remaining = deadline - time.monotonic()
    if remaining > 0:
        time.sleep(remaining)


def _connect_with_retry(
    family: int,
    address: tuple,
    retries: int,
    delay: float,
    timeout: float,
    description: str,
) -> socket.socket:
    last_error: OSError | None = None

    for _ in range(retries):
        candidate = socket.socket(family, socket.SOCK_STREAM)
        candidate.settimeout(timeout)
        try:
            candidate.connect(address)
            return candidate
        except OSError as exc:
            last_error = exc
            candidate.close()
            time.sleep(delay)

    raise TrafficError(f"{description} was not reachable") from last_error


def _recv_exact(sock: socket.socket, size: int) -> bytes:
    if size < 0:
        raise TrafficError("Invalid receive size")

    chunks = bytearray()
    while len(chunks) < size:
        chunk = sock.recv(size - len(chunks))
        if not chunk:
            raise TrafficError("Connection closed before complete payload")
        chunks.extend(chunk)
    return bytes(chunks)


def _recv_until(sock: socket.socket, marker: bytes, maximum: int) -> bytes:
    """Read a bounded TCP stream until marker is observed."""
    buffer = bytearray()
    while marker not in buffer:
        if len(buffer) >= maximum:
            raise TrafficError("TCP payload exceeded profile limit")
        chunk = sock.recv(min(4096, maximum - len(buffer)))
        if not chunk:
            raise TrafficError("Connection closed before terminator")
        buffer.extend(chunk)
    return bytes(buffer)


def command(traffic_type: str, role: str, target: str, duration: float | None = None) -> list[str]:
    if traffic_type not in TRAFFIC_TYPES:
        raise TrafficError(f"Unsupported traffic type: {traffic_type}")
    if role not in ROLES:
        raise TrafficError(f"Unsupported traffic role: {role}")
    if not target:
        raise TrafficError("Traffic target is required")

    _family(target)

    args = [
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

    if duration is not None:
        args.extend(
            [
                "--duration",
                str(duration),
            ]
        )

    return args


def run(traffic_type: str, role: str, target: str, duration: float | None = None) -> None:
    args = command(traffic_type, role, target, duration=duration)
    try:
        result = subprocess.run(args, check=False)
    except OSError as exc:
        raise TrafficError(f"Failed to execute {traffic_type} traffic") from exc

    if result.returncode != 0:
        raise TrafficError(f"Traffic command failed: {traffic_type}/{role}")


# ---------------------------------------------------------------------------
# ICMP
# ---------------------------------------------------------------------------


def _run_icmp(role: str, target: str, duration: float | None = None) -> None:
    if role == "receiver":
        # ICMP is handled by the kernel; the receiver simply remains alive long
        # enough for the sender's request/reply exchange to finish.
        receiver_duration = (
            ICMP_COUNT * ICMP_INTERVAL
            if duration is None
            else duration
        )
        time.sleep(receiver_duration + ICMP_RECEIVER_GRACE)
        return

    if role == "peer":
        raise TrafficError("ICMP does not support the peer role")

    family = _family(target)

    if duration is None:
        ping_count = ICMP_COUNT
    else:
        ping_count = max(
            1,
            int(duration / ICMP_INTERVAL),
        )

    args = [
        "ping",
        "-q",
        "-c",
        str(ping_count),
        "-i",
        str(ICMP_INTERVAL),
        "-s",
        str(ICMP_PAYLOAD_SIZE),
        "-W",
        "1",
    ]

    # A short ASCII pattern makes the payload identifiable if the inner packet
    # is ever available to the analyzer, while packet timing remains the main
    # distinguishing feature.
    if family == socket.AF_INET:
        args += ["-p", "49434d50", target]  # hex: ICMP
    else:
        args = [args[0], "-6", *args[1:]]
        args += ["-p", "49434d50", target]

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
    request_counter: dict[str, int] | None = None
    request_lock: threading.Lock | None = None
    request_event: threading.Event | None = None

    def do_GET(self) -> None:  # noqa: N802 - stdlib API
        path = self.path.split("?", 1)[0]
        if path.endswith(".html"):
            minimum, maximum = 120_000, 300_000
            prefix = b"<!doctype html>\n<html><body>ESPect web page "
        elif path.endswith(".json"):
            minimum, maximum = 80_000, 180_000
            prefix = b'{"project":"ESPect","traffic":"web","data":"'
        else:
            minimum, maximum = WEB_MIN_PAYLOAD, WEB_MAX_PAYLOAD
            prefix = b"ESPect WEB response "

        body_length = random.randint(minimum, maximum)
        prefix = prefix[:body_length]
        body = prefix + _web_payload(body_length - len(prefix), path)

        self.send_response(200)
        self.send_header("Content-Type", "text/html" if path.endswith(".html") else "application/octet-stream")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Connection", "close")
        self.end_headers()
        self.wfile.write(body)

        if self.request_counter is not None and self.request_lock is not None:
            with self.request_lock:
                self.request_counter["count"] += 1
                if (
                    self.request_event is not None
                    and self.request_counter["count"] >= WEB_REQUESTS
                ):
                    self.request_event.set()

    def log_message(self, format: str, *args: object) -> None:
        return


class _ReusableHTTPServer(ThreadingHTTPServer):
    allow_reuse_address = True


class _IPv6HTTPServer(_ReusableHTTPServer):
    address_family = socket.AF_INET6


def _web_payload(size: int, path: str) -> bytes:
    if size <= 0:
        return b""

    # A blend of structured text and non-repeating bytes avoids making every
    # application profile look like a constant-filled synthetic stream.
    seed = f"path={path};project=ESPect;".encode()
    chunks = bytearray(seed)
    while len(chunks) < size:
        if len(chunks) % 7 == 0:
            chunks.extend(random.randbytes(min(512, size - len(chunks))))
        else:
            chunks.extend(
                b"network-security ipsec vpn analysis experiment packet-flow "
            )
    return bytes(chunks[:size])


def _create_http_server(family: int) -> ThreadingHTTPServer:
    server_class = (
        _ReusableHTTPServer if family == socket.AF_INET else _IPv6HTTPServer
    )
    server = server_class(_bind_address(family, WEB_PORT), _WebHandler)
    return server



def _web_receiver(target: str, duration: float | None = None) -> None:
    family = _family(target)
    server = _create_http_server(family)

    counter = {"count": 0}
    lock = threading.Lock()
    complete = threading.Event()
    _WebHandler.request_counter = counter
    _WebHandler.request_lock = lock
    _WebHandler.request_event = complete

    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    try:
        if duration is None:
            if not complete.wait(timeout=WEB_RECEIVER_TIMEOUT):
                raise TrafficError(
                    f"Web sender completed only {counter['count']}/{WEB_REQUESTS} requests"
                )
        else:
            deadline = time.monotonic() + duration + WEB_RECEIVER_TIMEOUT
            while time.monotonic() < deadline:
                remaining = deadline - time.monotonic()
                if complete.wait(timeout=min(0.5, remaining)):
                    break
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)
        _WebHandler.request_counter = None
        _WebHandler.request_lock = None
        _WebHandler.request_event = None



def _web_sender(target: str, duration: float | None = None) -> None:
    family = _family(target)
    host = f"[{target}]" if family == socket.AF_INET6 else target
    base = f"http://{host}:{WEB_PORT}"

    paths = [
        "/index.html",
        "/assets/main.css",
        "/api/status.json",
        "/dashboard.html",
        "/assets/app.js",
        "/api/metrics.json",
        "/report.html",
        "/assets/data.bin",
    ]

    start = time.monotonic()
    number = 0

    while duration is None or time.monotonic() < start + duration:
        if number > 0:
            time.sleep(random.uniform(WEB_MIN_DELAY, WEB_MAX_DELAY))

        url = base + paths[number % len(paths)]
        try:
            with urlopen(url, timeout=WEB_REQUEST_TIMEOUT) as response:
                if response.status != 200:
                    raise TrafficError(
                        f"HTTP server returned status {response.status}"
                    )
                while response.read(64 * 1024):
                    pass
        except OSError:
            if number != 0:
                raise TrafficError("Web traffic failed")

            # The server may need a little longer to start. Retry the first
            # request independently, without changing the traffic pattern.
            last_error: OSError | None = None
            for _ in range(WEB_CONNECT_RETRIES):
                try:
                    with urlopen(url, timeout=WEB_REQUEST_TIMEOUT) as response:
                        if response.status != 200:
                            raise TrafficError(
                                f"HTTP server returned status {response.status}"
                            )
                        while response.read(64 * 1024):
                            pass
                    last_error = None
                    break
                except OSError as exc:
                    last_error = exc
                    time.sleep(WEB_CONNECT_RETRY_DELAY)
            if last_error is not None:
                raise TrafficError("Web receiver was not reachable") from last_error
        number += 1


# ---------------------------------------------------------------------------
# EMAIL
# ---------------------------------------------------------------------------


def _email_body(number: int) -> bytes:
    subject = f"ESPect controlled email {number}".encode()
    words = (
        b"IPsec experiment security telemetry VPN packet analysis "
        b"configuration performance traffic classifier. "
    )
    target = random.randint(EMAIL_MIN_BODY, EMAIL_MAX_BODY)
    body = bytearray()
    while len(body) < target:
        if len(body) % 1024 < 128:
            body.extend(random.randbytes(min(256, target - len(body))))
        else:
            body.extend(words[: min(len(words), target - len(body))])

    message = (
        b"Date: Thu, 24 Sep 2026 11:00:00 +0530\r\n"
        b"From: vm@sih.local\r\n"
        b"To: vm@sih.local\r\n"
        b"Message-ID: <"
        + str(number).encode()
        + b"@espest.local>\r\n"
        b"Subject: "
        + subject
        + b"\r\n"
        b"Content-Type: text/plain; charset=utf-8\r\n"
        b"\r\n"
        + bytes(body)
        + b"\r\n.\r\n"
    )
    return message


def _email_receiver(target: str, duration: float | None = None) -> None:
    family = _family(target)
    server = socket.socket(family, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(_bind_address(family, EMAIL_PORT))
    server.listen(2)

    deadline = None if duration is None else time.monotonic() + duration

    try:
        number = 0
        while duration is None or time.monotonic() < deadline:
            if deadline is None:
                server.settimeout(EMAIL_SOCKET_TIMEOUT)
            else:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    break
                server.settimeout(min(EMAIL_SOCKET_TIMEOUT, remaining))

            try:
                connection, _ = server.accept()
            except socket.timeout:
                if deadline is not None and time.monotonic() >= deadline:
                    break
                raise TrafficError("Email sender did not connect or complete")

            with connection:
                connection.settimeout(EMAIL_SOCKET_TIMEOUT)
                connection.sendall(b"220 ESPect SMTP\r\n")

                for expected in (b"HELO", b"MAIL FROM:", b"RCPT TO:"):
                    data = connection.recv(4096)
                    if expected not in data.upper():
                        raise TrafficError("Invalid SMTP command sequence")
                    connection.sendall(b"250 OK\r\n")

                data = connection.recv(4096)
                if b"DATA" not in data.upper():
                    raise TrafficError("SMTP DATA command missing")
                connection.sendall(b"354 End data with <CRLF>.<CRLF>\r\n")

                payload = _recv_until(connection, b"\r\n.\r\n", 64 * 1024)
                if len(payload) <= len(b"\r\n.\r\n"):
                    raise TrafficError("Email body missing")
                connection.sendall(b"250 2.0.0 OK\r\n")

                quit_data = connection.recv(4096)
                if quit_data and b"QUIT" in quit_data.upper():
                    connection.sendall(b"221 2.0.0 Bye\r\n")
                number += 1
    except socket.timeout as exc:
        raise TrafficError("Email sender did not connect or complete") from exc
    except OSError as exc:
        raise TrafficError("Email receiver failed") from exc
    finally:
        server.close()


def _email_sender(
    target: str,
    duration: float | None = None,
) -> None:
    family = _family(target)
    start = time.monotonic()
    number = 0

    while duration is None or time.monotonic() < start + duration:
        if number:
            time.sleep(random.uniform(*EMAIL_INTER_MESSAGE_DELAY))
            if duration is not None and time.monotonic() >= start + duration:
                break

        connection = _connect_with_retry(
            family,
            _address(family, target, EMAIL_PORT),
            EMAIL_CONNECT_RETRIES,
            EMAIL_CONNECT_RETRY_DELAY,
            EMAIL_SOCKET_TIMEOUT,
            "Email receiver",
        )

        try:
            connection.sendall(b"HELO espest\r\n")
            if not connection.recv(4096):
                raise TrafficError("SMTP HELO response missing")

            connection.sendall(b"MAIL FROM:<vm@sih.local>\r\n")
            if not connection.recv(4096):
                raise TrafficError("SMTP MAIL FROM response missing")

            connection.sendall(b"RCPT TO:<vm@sih.local>\r\n")
            if not connection.recv(4096):
                raise TrafficError("SMTP RCPT TO response missing")

            connection.sendall(b"DATA\r\n")
            if not connection.recv(4096):
                raise TrafficError("SMTP DATA response missing")

            message = _email_body(number)
            split = max(1, len(message) // 3)
            connection.sendall(message[:split])
            time.sleep(0.015)
            connection.sendall(message[split : 2 * split])
            time.sleep(0.015)
            connection.sendall(message[2 * split :])

            if not connection.recv(4096):
                raise TrafficError("SMTP DATA acknowledgement missing")

            connection.sendall(b"QUIT\r\n")
            connection.recv(4096)
        except OSError as exc:
            raise TrafficError("Email traffic failed") from exc
        finally:
            connection.close()

        number += 1


# ---------------------------------------------------------------------------
# VIDEO
# ---------------------------------------------------------------------------


def _video_receiver(target: str, duration: float | None = None) -> None:
    family = _family(target)
    sock = socket.socket(family, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF, 4 * 1024 * 1024)
    sock.bind(_bind_address(family, VIDEO_PORT))
    sock.settimeout(0.5)

    deadline = time.monotonic() + (
        VIDEO_DURATION if duration is None else duration
    ) + VIDEO_RECEIVER_GRACE
    received = 0

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


def _video_sender(target: str, duration: float | None = None) -> None:
    family = _family(target)
    sock = socket.socket(family, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, 4 * 1024 * 1024)
    address = _address(family, target, VIDEO_PORT)

    try:
        # Allow the peer's UDP receiver process to bind before the first burst.
        time.sleep(VIDEO_STARTUP_DELAY)
        start = time.monotonic()
        next_frame = start
        frame_number = 0

        while True:
            now = time.monotonic()
            if now >= start + (VIDEO_DURATION if duration is None else duration):
                break

            frame_number += 1
            is_i_frame = frame_number % VIDEO_I_FRAME_EVERY == 0
            count_low, count_high = (
                VIDEO_I_FRAME_PACKETS if is_i_frame else VIDEO_P_FRAME_PACKETS
            )
            packets = random.randint(count_low, count_high)

            for packet_number in range(packets):
                packet_size = random.randint(
                    VIDEO_MIN_PACKET_SIZE, VIDEO_MAX_PACKET_SIZE
                )
                header = (
                    b"VID"
                    + bytes((1 if is_i_frame else 0,))
                    + frame_number.to_bytes(4, "big", signed=False)
                    + packet_number.to_bytes(2, "big", signed=False)
                    + b"X"
                )
                body_size = packet_size - len(header)
                body = random.randbytes(body_size)
                sock.sendto(header + body, address)

            next_frame += 1.0 / VIDEO_FPS
            _sleep_until(next_frame)
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
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
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


def _voip_packet(sequence: int, timestamp: int) -> bytes:
    # 12-byte RTP-like header, keeping the total datagram size at exactly
    # VOIP_PACKET_SIZE bytes.
    payload_size = VOIP_PACKET_SIZE - 12
    header = (
        bytes((0x80, 0x11))
        + sequence.to_bytes(2, "big", signed=False)
        + timestamp.to_bytes(4, "big", signed=False)
        + (0x45535045).to_bytes(4, "big", signed=False)  # SSRC marker
    )
    payload = (b"VOIP" + random.randbytes(payload_size - 4))
    return header + payload


def _voip_peer(target: str, duration: float | None = None) -> None:
    family = _family(target)
    stop_event = threading.Event()
    counter = {"received": 0}

    receiver = threading.Thread(
        target=_voip_receiver,
        args=(target, stop_event, counter),
        daemon=True,
    )
    receiver.start()

    sock = socket.socket(family, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, 2 * 1024 * 1024)
    address = _address(family, target, VOIP_PORT)

    try:
        time.sleep(VOIP_STARTUP_DELAY)
        start = time.monotonic()
        next_packet = start
        sequence = random.randint(0, 65_535)
        timestamp = random.randint(0, 2**31 - 1)
        deadline = start + (VOIP_DURATION if duration is None else duration)

        while next_packet < deadline:
            _sleep_until(next_packet)
            if time.monotonic() >= deadline:
                break

            sock.sendto(_voip_packet(sequence, timestamp), address)
            sequence = (sequence + 1) & 0xFFFF
            timestamp = (timestamp + 160) & 0xFFFFFFFF
            next_packet += VOIP_INTERVAL + random.uniform(-VOIP_JITTER, VOIP_JITTER)

    except OSError as exc:
        raise TrafficError("VoIP traffic failed") from exc
    finally:
        sock.close()
        stop_event.set()
        receiver.join(timeout=2)

    if counter["received"] == 0:
        raise TrafficError("No VoIP traffic was received")


# ---------------------------------------------------------------------------
# WHATSAPP-LIKE MESSAGING
# ---------------------------------------------------------------------------


def _whatsapp_message(number: int) -> bytes:
    target_size = random.randint(
        WHATSAPP_MIN_MESSAGE_SIZE,
        WHATSAPP_MAX_MESSAGE_SIZE,
    )
    seed = (
        f"message-{number} ESPect IPsec traffic experiment "
        "status update "
    ).encode()
    message = bytearray(seed)
    while len(message) < target_size:
        message.extend(
            random.choice(
                [
                    b"hello ",
                    b"test ",
                    b"vpn ",
                    b"packet ",
                    b"analysis ",
                    b"secure ",
                    b"ok ",
                ]
            )
        )
    return bytes(message[:target_size])


def _whatsapp_receiver(
    target: str,
    duration: float | None = None,
) -> None:
    family = _family(target)
    server = socket.socket(family, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(_bind_address(family, WHATSAPP_PORT))
    server.listen(1)

    deadline = None if duration is None else time.monotonic() + duration

    try:
        while duration is None or time.monotonic() < deadline:
            if deadline is None:
                server.settimeout(WHATSAPP_SOCKET_TIMEOUT)
            else:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    break
                server.settimeout(min(WHATSAPP_SOCKET_TIMEOUT, remaining))

            try:
                connection, _ = server.accept()
            except socket.timeout:
                if deadline is not None and time.monotonic() >= deadline:
                    break
                raise TrafficError("Messaging peer did not connect or complete")

            with connection:
                connection.settimeout(WHATSAPP_SOCKET_TIMEOUT)
                while duration is None or time.monotonic() < deadline:
                    raw_length = _recv_exact(connection, WHATSAPP_LENGTH_PREFIX_SIZE)
                    message_length = int.from_bytes(raw_length, "big")
                    if not (
                        WHATSAPP_MIN_MESSAGE_SIZE
                        <= message_length
                        <= WHATSAPP_MAX_MESSAGE_SIZE
                    ):
                        raise TrafficError("Invalid messaging payload length")

                    _recv_exact(connection, message_length)
                    connection.sendall(b"ACK")
    except socket.timeout as exc:
        raise TrafficError(
            "Messaging peer did not connect or complete"
        ) from exc
    except OSError as exc:
        raise TrafficError("Messaging receiver failed") from exc
    finally:
        server.close()


def _whatsapp_sender(
    target: str,
    duration: float | None = None,
) -> None:
    family = _family(target)
    connection = _connect_with_retry(
        family,
        _address(family, target, WHATSAPP_PORT),
        WHATSAPP_CONNECT_RETRIES,
        WHATSAPP_CONNECT_RETRY_DELAY,
        WHATSAPP_SOCKET_TIMEOUT,
        "Messaging receiver",
    )

    start = time.monotonic()
    number = 0

    try:
        connection.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
        connection.setsockopt(socket.SOL_SOCKET, socket.SO_KEEPALIVE, 1)

        while duration is None or time.monotonic() < start + duration:
            time.sleep(random.uniform(WHATSAPP_MIN_DELAY, WHATSAPP_MAX_DELAY))
            if duration is not None and time.monotonic() >= start + duration:
                break

            message = _whatsapp_message(number)
            connection.sendall(len(message).to_bytes(4, "big"))
            connection.sendall(message)

            if connection.recv(16) != b"ACK":
                raise TrafficError("Messaging acknowledgement missing")
            number += 1
    except OSError as exc:
        raise TrafficError("Messaging traffic failed") from exc
    finally:
        connection.close()


# ---------------------------------------------------------------------------
# PROFILE DISPATCH
# ---------------------------------------------------------------------------


def _run_profile(
    traffic_type: str,
    role: str,
    target: str,
    duration: float | None = None,
) -> None:
    if traffic_type == "icmp":
        _run_icmp(role, target, duration=duration)
        return

    if traffic_type == "web":
        if role == "sender":
            _web_sender(target, duration=duration)
        elif role == "receiver":
            _web_receiver(target, duration=duration)
        else:
            raise TrafficError("Web supports sender/receiver roles only")
        return

    if traffic_type == "email":
        if role == "sender":
            _email_sender(target, duration=duration)
        elif role == "receiver":
            _email_receiver(target, duration=duration)
        else:
            raise TrafficError("Email supports sender/receiver roles only")
        return

    if traffic_type == "video":
        if role == "sender":
            _video_sender(target, duration=duration)
        elif role == "receiver":
            _video_receiver(target, duration=duration)
        else:
            raise TrafficError("Video supports sender/receiver roles only")
        return

    if traffic_type == "voip":
        if role != "peer":
            raise TrafficError("VoIP requires the peer role")
        _voip_peer(target, duration=duration)
        return

    if traffic_type == "whatsapp":
        if role == "sender":
            _whatsapp_sender(target, duration=duration)
        elif role == "receiver":
            _whatsapp_receiver(target, duration=duration)
        else:
            raise TrafficError(
                "WhatsApp traffic supports sender/receiver roles only"
            )
        return

    raise TrafficError(f"Unsupported traffic type: {traffic_type}")


def _main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate controlled IPv4/IPv6 traffic profiles for ESPect."
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
    # parser.add_argument(
    #     "--duration",
    #     type=float,
    #     default=None,
    # )
    
    parser.add_argument(
        "--duration",
        type=float,
        default=None,
        help="Experiment duration in seconds; omitted keeps the profile default",
    )

    args = parser.parse_args()
    if args.duration is not None and args.duration <= 0:
        parser.error("--duration must be greater than zero")
    try:
        _run_profile(
            args.run,
            args.role,
            args.target,
            duration=args.duration,
        )
    except TrafficError as exc:
        print(str(exc), file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(_main())

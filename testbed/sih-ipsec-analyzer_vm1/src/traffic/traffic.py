import argparse
import socket
import subprocess
import sys
import threading
import time
import random
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

WEB_PORT = 8080
EMAIL_PORT = 2525
VIDEO_PORT = 5001
VOIP_PORT = 5002
WHATSAPP_PORT = 8081

ICMP_COUNT = 10
ICMP_INTERVAL = 0.2

WEB_REQUESTS = 10

VIDEO_DURATION = 5
VIDEO_RATE = 100
VIDEO_PACKET_SIZE = 1200

VOIP_DURATION = 5
VOIP_INTERVAL = 0.02
VOIP_PACKET_SIZE = 160

WHATSAPP_MESSAGES = 20


class TrafficError(RuntimeError):
    pass


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
        raise TrafficError(
            f"Invalid IP address: {address}"
        ) from exc


def _address(family: int, host: str, port: int) -> tuple:
    if family == socket.AF_INET:
        return host, port

    return host, port, 0, 0


def _bind_address(family: int, port: int) -> tuple:
    if family == socket.AF_INET:
        return "0.0.0.0", port

    return "::", port, 0, 0


def command(
    traffic_type: str,
    role: str,
    target: str,
) -> list[str]:
    if traffic_type not in TRAFFIC_TYPES:
        raise TrafficError(
            f"Unsupported traffic type: {traffic_type}"
        )

    if role not in ROLES:
        raise TrafficError(
            f"Unsupported traffic role: {role}"
        )

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


def run(
    traffic_type: str,
    role: str,
    target: str,
) -> None:
    args = command(
        traffic_type,
        role,
        target,
    )

    try:
        result = subprocess.run(
            args,
            check=False,
        )
    except OSError as exc:
        raise TrafficError(
            f"Failed to execute {traffic_type} traffic"
        ) from exc

    if result.returncode != 0:
        raise TrafficError(
            f"Traffic command failed: "
            f"{traffic_type}/{role}"
        )


# ---------------------------------------------------------------------------
# ICMP
# ---------------------------------------------------------------------------

def _run_icmp(
    role: str,
    target: str,
) -> None:
    if role == "receiver":
        time.sleep(
            ICMP_COUNT * ICMP_INTERVAL + 1
        )
        return

    if role == "peer":
        raise TrafficError(
            "ICMP does not support the peer role"
        )

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
        result = subprocess.run(
            args,
            check=False,
        )
    except OSError as exc:
        raise TrafficError(
            "Failed to execute ICMP traffic"
        ) from exc

    if result.returncode != 0:
        raise TrafficError(
            "ICMP traffic failed"
        )


# ---------------------------------------------------------------------------
# WEB
# ---------------------------------------------------------------------------

class _WebHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        # VARIABLE PAYLOAD: Simulating web pages from 50KB to 500KB
        body_length = random.randint(50000, 500000)
        body = b"SIH_" + b"A" * (body_length - 4)

        self.send_response(200)
        self.send_header("Content-Type", "text/plain")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        return

# Keep _IPv6HTTPServer, _create_http_server, and _web_receiver EXACTLY as they are.

def _web_sender(target: str) -> None:
    family = _family(target)
    if family == socket.AF_INET6:
        host = f"[{target}]"
    else:
        host = target

    url = f"http://{host}:{WEB_PORT}/"
    last_error = None

    # Initial connection attempt loop
    for _ in range(20):
        try:
            with urlopen(url, timeout=5) as response:
                if response.status != 200:
                    raise TrafficError(f"HTTP server returned status {response.status}")
                response.read()
            last_error = None
            break
        except OSError as exc:
            last_error = exc
            time.sleep(0.1)

    if last_error is not None:
        raise TrafficError("Web receiver was not reachable") from last_error

    # Traffic generation loop
    for _ in range(WEB_REQUESTS - 1):
        # HUMAN ASYMMETRY: Reading delay before clicking the next link (0.5 to 2.5s)
        time.sleep(random.uniform(0.5, 2.5))
        try:
            with urlopen(url, timeout=5) as response: # Timeout increased for large payloads
                if response.status != 200:
                    raise TrafficError("HTTP request failed")
                response.read()
        except OSError as exc:
            raise TrafficError("Web traffic failed") from exc


# ---------------------------------------------------------------------------
# EMAIL
# ---------------------------------------------------------------------------

# Keep _email_receiver EXACTLY as it is.

def _email_sender(target: str) -> None:
    family = _family(target)
    last_error = None

    for _ in range(20):
        connection = socket.socket(family, socket.SOCK_STREAM)
        connection.settimeout(5)
        try:
            connection.connect(_address(family, target, EMAIL_PORT))
            last_error = None
            break
        except OSError as exc:
            last_error = exc
            connection.close()
            time.sleep(0.1)
    else:
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

        # VARIABLE PAYLOAD: Simulating an email body of random paragraph sizes
        body_length = random.randint(500, 5000)
        email_body = (
            b"Subject: SIH IPsec experiment\r\n"
            b"\r\n"
            b"Controlled email traffic.\r\n"
            + b"E" * body_length +
            b"\r\n.\r\n"
        )

        connection.sendall(email_body)

        if not connection.recv(4096):
            raise TrafficError("Email DATA response missing")

        connection.sendall(b"QUIT\r\n")

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
    sock.bind(_bind_address(family, VIDEO_PORT))
    sock.settimeout(1)

    received = 0
    deadline = time.monotonic() + (VIDEO_DURATION + 2)

    try:
        while time.monotonic() < deadline:
            try:
                # INCREASED BUFFER: to handle larger, variable video packets
                data, _ = sock.recvfrom(4096)
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
    address = _address(family, target, VIDEO_PORT)
    deadline = time.monotonic() + VIDEO_DURATION
    
    # 30 Frames per second
    interval = 1.0 / 30.0
    frame_count = 0

    try:
        while time.monotonic() < deadline:
            frame_count += 1
            
            # BURST LOGIC: Every 30th frame is a massive I-Frame, others are small P-Frames
            if frame_count % 30 == 0:
                packets_in_frame = random.randint(8, 15)
            else:
                packets_in_frame = random.randint(1, 4)
                
            for _ in range(packets_in_frame):
                # Variable packet sizes (1000 - 1400 bytes)
                pkt_size = random.randint(1000, 1400)
                packet = b"VIDEO" + b"X" * (pkt_size - 5)
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
    counter: dict,
) -> None:
    family = _family(target)

    sock = socket.socket(
        family,
        socket.SOCK_DGRAM,
    )

    sock.bind(
        _bind_address(
            family,
            VOIP_PORT,
        )
    )

    sock.settimeout(0.2)

    try:
        while not stop_event.is_set():
            try:
                data, _ = sock.recvfrom(
                    VOIP_PACKET_SIZE + 256
                )
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
        args=(
            target,
            stop_event,
            counter,
        ),
        daemon=True,
    )

    receiver.start()

    time.sleep(0.1)

    sock = socket.socket(
        family,
        socket.SOCK_DGRAM,
    )

    address = _address(
        family,
        target,
        VOIP_PORT,
    )

    packet = (
        b"VOIP"
        + b"X" * (
            VOIP_PACKET_SIZE - 4
        )
    )

    deadline = (
        time.monotonic()
        + VOIP_DURATION
    )

    try:
        while time.monotonic() < deadline:
            sock.sendto(
                packet,
                address,
            )
            time.sleep(VOIP_INTERVAL)

    except OSError as exc:
        raise TrafficError(
            "VoIP traffic failed"
        ) from exc

    finally:
        sock.close()
        stop_event.set()

    receiver.join(timeout=2)

    if counter["received"] == 0:
        raise TrafficError(
            "No VoIP traffic was received"
        )


# ---------------------------------------------------------------------------
# WHATSAPP-LIKE CONTROLLED MESSAGING
# ---------------------------------------------------------------------------

def _whatsapp_receiver(target: str) -> None:
    family = _family(target)
    server = socket.socket(family, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(_bind_address(family, WHATSAPP_PORT))
    server.listen(1)
    server.settimeout(8)

    try:
        connection, _ = server.accept()
        with connection:
            connection.settimeout(5)
            for _ in range(WHATSAPP_MESSAGES):
                data = connection.recv(4096)
                if not data:
                    break
                connection.sendall(b"ACK")
    except socket.timeout as exc:
        raise TrafficError("Messaging peer did not connect") from exc
    except OSError as exc:
        raise TrafficError("Messaging receiver failed") from exc
    finally:
        server.close()


def _whatsapp_sender(target: str) -> None:
    family = _family(target)
    last_error = None

    for _ in range(20):
        connection = socket.socket(family, socket.SOCK_STREAM)
        connection.settimeout(5)
        try:
            connection.connect(_address(family, target, WHATSAPP_PORT))
            last_error = None
            break
        except OSError as exc:
            last_error = exc
            connection.close()
            time.sleep(0.1)
    else:
        raise TrafficError("Messaging peer was not reachable") from last_error

    try:
        for number in range(WHATSAPP_MESSAGES):
            # HUMAN ASYMMETRY: Typing delay between 0.5s and 3.5s
            time.sleep(random.uniform(0.5, 3.5))
            
            # VARIABLE PAYLOAD: Message length between 10 bytes and 400 bytes
            msg_length = random.randint(10, 400)
            message = f"msg-{number}-".encode() + b"W" * msg_length

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

def _run_profile(
    traffic_type: str,
    role: str,
    target: str,
) -> None:
    if traffic_type == "icmp":
        _run_icmp(
            role,
            target,
        )
        return

    if traffic_type == "web":
        if role == "sender":
            _web_sender(target)
        elif role == "receiver":
            _web_receiver(target)
        else:
            raise TrafficError(
                "Web supports sender/receiver roles only"
            )
        return

    if traffic_type == "email":
        if role == "sender":
            _email_sender(target)
        elif role == "receiver":
            _email_receiver(target)
        else:
            raise TrafficError(
                "Email supports sender/receiver roles only"
            )
        return

    if traffic_type == "video":
        if role == "sender":
            _video_sender(target)
        elif role == "receiver":
            _video_receiver(target)
        else:
            raise TrafficError(
                "Video supports sender/receiver roles only"
            )
        return

    if traffic_type == "voip":
        if role != "peer":
            raise TrafficError(
                "VoIP requires the peer role"
            )

        _voip_peer(target)
        return

    if traffic_type == "whatsapp":
        if role == "sender":
            _whatsapp_sender(target)
        elif role == "receiver":
            _whatsapp_receiver(target)
        else:
            raise TrafficError(
                "WhatsApp traffic supports "
                "sender/receiver roles only"
            )
        return

    raise TrafficError(
        f"Unsupported traffic type: {traffic_type}"
    )


def _main() -> int:
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--run",
        choices=sorted(TRAFFIC_TYPES),
        required=True,
    )

    parser.add_argument(
        "--role",
        choices=sorted(ROLES),
        required=True,
    )

    parser.add_argument(
        "--target",
        required=True,
    )

    args = parser.parse_args()

    try:
        _run_profile(
            args.run,
            args.role,
            args.target,
        )
    except TrafficError as exc:
        print(
            str(exc),
            file=sys.stderr,
        )
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(_main())
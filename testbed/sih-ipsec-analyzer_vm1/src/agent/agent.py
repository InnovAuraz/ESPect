import json
import socket
import subprocess
import base64
from pathlib import Path

from .ipsec import apply, initiate, status, terminate
from src.capture import Capture
from src.traffic import command


class AgentError(RuntimeError):
    pass


class Agent:
    def __init__(self, host: str = ""):
        self.host = host
        self.configuration = None
        self.process = None
        self.capture = None
        self.capture_file = None

    def configure(self, configuration: dict) -> None:
        self.configuration = configuration

    def apply_ipsec(self, config_text: str) -> None:
        if self.configuration is None:
            raise AgentError("Agent is not configured")

        apply(config_text)

    def initiate_ipsec(self) -> None:
        if self.configuration is None:
            raise AgentError("Agent is not configured")

        initiate()

    def ipsec_status(self) -> str:
        return status()

    def start_traffic(
        self,
        target: str,
        role: str,
    ) -> None:
        if self.configuration is None:
            raise AgentError("Agent is not configured")

        if self.process is not None:
            raise AgentError("Traffic is already running")

        traffic_type = self.configuration["traffic_type"]

        try:
            args = command(
                traffic_type,
                role,
                target,
            )
        except Exception as exc:
            raise AgentError(str(exc)) from exc

        try:
            self.process = subprocess.Popen(args)
        except OSError as exc:
            raise AgentError(
                f"Failed to start {traffic_type} traffic"
            ) from exc

    def wait(self) -> None:
        if self.process is None:
            raise AgentError("Traffic is not running")

        result = self.process.wait()
        self.process = None

        if result != 0:
            raise AgentError(
                f"Traffic failed with exit code {result}"
            )

    def start_capture(
        self,
        interface: str,
        filename: str,
        capture_filter: str | None = None,
    ) -> None:
        if self.capture is not None:
            raise AgentError("Capture is already running")

        safe_name = Path(filename).name

        if safe_name != filename:
            raise AgentError("Capture filename must not contain a path")

        self.capture_file = Path("captures") / safe_name
        self.capture = Capture(
            interface=interface,
            output=self.capture_file,
            capture_filter=capture_filter,
        )
        self.capture.start()

    def stop_capture(self) -> None:
        if self.capture is None:
            raise AgentError("Capture is not running")

        self.capture.stop()
        self.capture = None

    def read_capture_chunk(
        self,
        offset: int,
        size: int,
    ) -> dict:
        if self.capture is not None:
            raise AgentError("Capture must be stopped before download")

        if self.capture_file is None:
            raise AgentError("No capture is available")

        try:
            with self.capture_file.open("rb") as file:
                file.seek(offset)
                data = file.read(size)
        except OSError as exc:
            raise AgentError("Failed to read capture") from exc

        return {
            "data": base64.b64encode(data).decode("ascii"),
            "eof": len(data) < size,
        }


_agent = Agent()


def serve(
    host: str = "0.0.0.0",
    port: int = 9000,
) -> None:
    _agent.host = host

    with socket.socket(
        socket.AF_INET,
        socket.SOCK_STREAM,
    ) as server:

        server.setsockopt(
            socket.SOL_SOCKET,
            socket.SO_REUSEADDR,
            1,
        )

        server.bind((host, port))
        server.listen()

        while True:
            connection, _ = server.accept()

            with connection:
                try:
                    data = connection.recv(65536)

                    if not data:
                        continue

                    request = json.loads(
                        data.decode()
                    )

                    response = _handle(request)

                except (
                    json.JSONDecodeError,
                    UnicodeDecodeError,
                ) as exc:
                    response = {
                        "ok": False,
                        "error": f"Invalid request: {exc}",
                    }

                connection.sendall(
                    json.dumps(response).encode()
                )


def _handle(request: dict) -> dict:
    try:
        action = request["action"]

        if action == "configure":
            _agent.configure(
                request["configuration"]
            )

        elif action == "apply_ipsec":
            _agent.apply_ipsec(
                request["config_text"]
            )

        elif action == "initiate_ipsec":
            _agent.initiate_ipsec()
            
        elif action == "terminate_ipsec":
            terminate()

        elif action == "ipsec_status":
            return {
                "ok": True,
                "status": _agent.ipsec_status(),
            }

        elif action == "start":
            _agent.start_traffic(
                request["target"],
                request["role"],
            )

        elif action == "wait":
            _agent.wait()

        elif action == "start_capture":
            _agent.start_capture(
                request["interface"],
                request["filename"],
                request.get("capture_filter"),
            )

        elif action == "stop_capture":
            _agent.stop_capture()

        elif action == "read_capture_chunk":
            return {
                "ok": True,
                **_agent.read_capture_chunk(
                    request["offset"],
                    request["size"],
                ),
            }

        else:
            raise AgentError(
                f"Unknown action: {action}"
            )

        return {"ok": True}

    except Exception as exc:
        return {
            "ok": False,
            "error": str(exc),
        }

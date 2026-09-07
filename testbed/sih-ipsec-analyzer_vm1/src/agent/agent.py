import json
import socket
import subprocess

from .ipsec import apply, initiate, status, terminate
from src.traffic import command


class AgentError(RuntimeError):
    pass


class Agent:
    def __init__(self, host: str = ""):
        self.host = host
        self.configuration = None
        self.process = None

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
import base64
import json
import os
import random
import signal
import socket
import subprocess
import sys
from pathlib import Path

import yaml

from .ipsec import apply, initiate, status, terminate
from src.capture import Capture
from src.experiment.validator import validate as validate_configuration
from src.traffic import command


class AgentError(RuntimeError):
    pass


TRAFFIC_TYPES = {
    "voip",
    "whatsapp",
    "email",
    "web",
    "icmp",
    "video",
}


class Agent:
    def __init__(self, host: str = ""):
        self.host = host
        self.configuration = None
        self.process = None
        self.capture = None
        self.capture_file = None
        self.experiment_process = None
        self.experiment_log = None
        self.experiment_config_file = None

    def configure(self, configuration: dict) -> None:
        errors = validate_configuration(configuration)
        if errors:
            raise AgentError(
                "Invalid configuration: " + "; ".join(errors)
            )
        self.configuration = dict(configuration)

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

    def start_traffic(self, target: str, role: str, duration: float | None = None) -> None:
        if self.configuration is None:
            raise AgentError("Agent is not configured")

        if self.process is not None:
            if self.process.poll() is None:
                self.process.terminate()
                self.process.wait(timeout=5)
            self.process = None

        traffic_type = self.configuration["traffic_type"]

        try:
            args = command(traffic_type, role, target, duration=duration)
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
            try:
                self.stop_capture()
            except AgentError:
                self.capture = None

        safe_name = Path(filename).name
        if safe_name != filename:
            raise AgentError("Capture filename must not contain a path")

        self.capture_file = Path("captures") / safe_name
        self.capture_file.unlink(missing_ok=True)
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

    def read_capture_chunk(self, offset: int, size: int) -> dict:
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

    @staticmethod
    def _load_base_configuration() -> dict:
        path = Path("config") / "configuration.yaml"
        if not path.is_file():
            raise AgentError(f"Configuration file not found: {path}")

        try:
            data = yaml.safe_load(path.read_text(encoding="utf-8"))
        except Exception as exc:
            raise AgentError(f"Failed to read {path}: {exc}") from exc

        if not isinstance(data, dict):
            raise AgentError("Configuration YAML must contain a mapping")

        configuration = data.get("configuration", data)
        if not isinstance(configuration, dict):
            raise AgentError("Configuration must be a mapping")

        return dict(configuration)

    @staticmethod
    def _randomize_traffic(configuration: dict) -> dict:
        configuration = dict(configuration)
        configuration["traffic_type"] = random.choice(sorted(TRAFFIC_TYPES))
        return configuration

    def start_experiment(
        self,
        duration: float,
        mode: str = "configured",
        traffic_type: str | None = None,
        configuration: dict | None = None,
    ) -> None:
        if duration <= 0:
            raise AgentError("Duration must be greater than zero")

        if self.experiment_process is not None and self.experiment_process.poll() is None:
            raise AgentError("A packet capture workflow is already running")

        effective = self._load_base_configuration()

        if configuration:
            effective.update(configuration)

        if traffic_type is not None:
            if traffic_type not in TRAFFIC_TYPES:
                raise AgentError(f"Unsupported traffic type: {traffic_type}")
            effective["traffic_type"] = traffic_type

        if mode == "random":
            effective = self._randomize_traffic(effective)
        elif mode not in {"configured", "manual", "fixed", "targeted"}:
            raise AgentError(
                f"Unsupported capture mode: {mode}. Use random or configured."
            )

        errors = validate_configuration(effective)
        if errors:
            raise AgentError(
                "Invalid experiment configuration: " + "; ".join(errors)
            )

        runtime_config = Path("captures") / "runtime_configuration.yaml"
        runtime_config.parent.mkdir(parents=True, exist_ok=True)
        Path("debug/logs/capture_status.json").unlink(missing_ok=True)
        runtime_config.write_text(
            yaml.safe_dump(effective, sort_keys=False),
            encoding="utf-8",
        )
        self.experiment_config_file = runtime_config

        output = Path("captures") / "live_capture.pcap"
        output.parent.mkdir(parents=True, exist_ok=True)
        log_path = Path("debug") / "logs" / "packet_capture.log"
        log_path.parent.mkdir(parents=True, exist_ok=True)
        self.experiment_log = log_path.open("ab")

        self.experiment_process = subprocess.Popen(
            [
                sys.executable,
                "scripts/packet_capture.py",
                str(runtime_config),
                str(duration),
                "--output",
                str(output),
            ],
            stdout=self.experiment_log,
            stderr=subprocess.STDOUT,
            start_new_session=True,
        )

    def experiment_status(self) -> dict:
        stage_file = Path("debug") / "logs" / "capture_status.json"
        stage = {}

        if stage_file.is_file():
            try:
                stage = json.loads(
                    stage_file.read_text(encoding="utf-8")
                )
            except (OSError, json.JSONDecodeError):
                stage = {}

        if self.experiment_process is None:
            stage_status = stage.get("status")

            if stage_status in {"completed", "failed"}:
                return {
                    **stage,
                    "status": stage_status,
                    "returncode": stage.get("returncode"),
                }

            return {
                **stage,
                "status": "idle",
                "returncode": None,
            }

        returncode = self.experiment_process.poll()

        if returncode is None:
            return {
                **stage,
                "status": "running",
                "returncode": None,
            }

        if self.experiment_log is not None:
            self.experiment_log.close()
            self.experiment_log = None

        final_status = "completed" if returncode == 0 else "failed"

        return {
            **stage,
            "status": final_status,
            "returncode": returncode,
        }

    def stop_experiment(self) -> None:
        if self.experiment_process is None or self.experiment_process.poll() is not None:
            return

        process = self.experiment_process
        try:
            os.killpg(process.pid, signal.SIGTERM)
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            os.killpg(process.pid, signal.SIGKILL)
            process.wait(timeout=5)
        except ProcessLookupError:
            pass

        if self.experiment_log is not None:
            self.experiment_log.close()
            self.experiment_log = None

    def read_file_chunk(self, filename: str, offset: int, size: int) -> dict:
        safe_name = Path(filename).name
        if safe_name != filename or safe_name != "live_capture.pcap":
            raise AgentError("Only the generated live capture can be downloaded")

        path = Path("captures") / safe_name
        if not path.is_file():
            raise AgentError("The generated capture file does not exist")

        with path.open("rb") as file:
            file.seek(offset)
            data = file.read(size)

        return {
            "data": base64.b64encode(data).decode("ascii"),
            "eof": len(data) < size,
        }


_agent = Agent()


def serve(host: str = "0.0.0.0", port: int = 9000) -> None:
    _agent.host = host

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server:
        server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server.bind((host, port))
        server.listen()

        while True:
            connection, _ = server.accept()
            with connection:
                try:
                    data = connection.recv(65536)
                    if not data:
                        continue

                    request = json.loads(data.decode())
                    response = _handle(request)
                except (json.JSONDecodeError, UnicodeDecodeError) as exc:
                    response = {"ok": False, "error": f"Invalid request: {exc}"}

                try:
                    connection.sendall(json.dumps(response).encode())
                except (BrokenPipeError, ConnectionResetError):
                    pass


def _handle(request: dict) -> dict:
    try:
        action = request["action"]

        if action == "configure":
            _agent.configure(request["configuration"])
        elif action == "apply_ipsec":
            _agent.apply_ipsec(request["config_text"])
        elif action == "initiate_ipsec":
            _agent.initiate_ipsec()
        elif action == "terminate_ipsec":
            terminate()
        elif action == "ipsec_status":
            return {"ok": True, "status": _agent.ipsec_status()}
        elif action == "start":
            _agent.start_traffic(request["target"], request["role"], duration=request.get("duration"),)
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
        elif action == "start_experiment":
            _agent.start_experiment(
                duration=float(request.get("duration", 30)),
                mode=request.get("mode", "configured"),
                traffic_type=request.get("traffic_type"),
                configuration=request.get("configuration"),
            )
        elif action == "experiment_status":
            return {"ok": True, **_agent.experiment_status()}
        elif action == "stop_experiment":
            _agent.stop_experiment()
        elif action == "read_file_chunk":
            return {
                "ok": True,
                **_agent.read_file_chunk(
                    request["filename"],
                    request["offset"],
                    request["size"],
                ),
            }
        else:
            raise AgentError(f"Unknown action: {action}")

        return {"ok": True}

    except Exception as exc:
        return {"ok": False, "error": str(exc)}

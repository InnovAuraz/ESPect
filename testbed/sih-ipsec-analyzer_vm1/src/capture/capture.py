import os
import signal
import subprocess
import time
from pathlib import Path


class CaptureError(RuntimeError):
    pass


class Capture:
    # Grace period between the traffic finishing and stop()
    # signalling tcpdump, so tcpdump's read loop has a chance to
    # drain packets the kernel has already queued for it.
    #
    # Without this, a fast/bursty experiment (e.g. traffic that
    # completes in well under a second) can finish before tcpdump
    # has done even one read cycle. The kernel-side BPF counters
    # still show the packets ("N packets received by filter"), but
    # tcpdump's own "packets captured" count is 0, because SIGINT
    # arrives before it ever reads them out - producing a PCAP
    # that is valid but empty.
    DRAIN_SECONDS = 1.5

    def __init__(
        self,
        interface: str,
        output: str | Path,
        capture_filter: str | None = None,
    ):
        self.interface = interface
        self.output = Path(output)
        self.capture_filter = capture_filter
        self.process: subprocess.Popen | None = None

        self.error_log = Path("debug/logs/tcpdump.log")
        self._log_file = None

    def _read_error_log(self) -> str:
        if not self.error_log.exists():
            return ""

        try:
            return self.error_log.read_text(
                encoding="utf-8",
                errors="replace",
            ).strip()
        except OSError:
            return ""

    def start(self) -> None:
        if self.process is not None:
            raise CaptureError("Capture is already running")

        self.output.parent.mkdir(
            parents=True,
            exist_ok=True,
        )
        
        self.error_log.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        self._log_file = self.error_log.open("wb")

        command = [
            "sudo",
            "-n",
            "tcpdump",
            "-i",
            self.interface,
            "-nn",
            "-U",
            "-w",
            str(self.output),
        ]

        if self.capture_filter:
            command.append(self.capture_filter)

        try:
            process = subprocess.Popen(
                command,
                stdin=subprocess.DEVNULL,
                stdout=subprocess.DEVNULL,
                stderr=self._log_file,
                start_new_session=True,
            )
        except OSError as exc:
            self._log_file.close()
            self._log_file = None
            raise CaptureError(
                "Failed to start tcpdump"
            ) from exc

        time.sleep(0.2)

        if process.poll() is not None:
            self._log_file.close()
            self._log_file = None

            detail = self._read_error_log()

            message = "tcpdump exited immediately"

            if detail:
                message = f"{message}: {detail}"

            raise CaptureError(message)

        self.process = process

    def stop(self) -> None:
        if self.process is None:
            raise CaptureError("Capture is not running")

        # Give tcpdump a chance to read out anything the kernel
        # has already queued before we signal it to exit. See
        # DRAIN_SECONDS above.
        if self.running:
            time.sleep(self.DRAIN_SECONDS)

        process = self.process

        try:
            os.killpg(
                process.pid,
                signal.SIGINT,
            )

            process.wait(timeout=5)

        except subprocess.TimeoutExpired:
            os.killpg(
                process.pid,
                signal.SIGTERM,
            )

            try:
                process.wait(timeout=2)

            except subprocess.TimeoutExpired:
                os.killpg(
                    process.pid,
                    signal.SIGKILL,
                )
                process.wait()

        except ProcessLookupError:
            pass

        finally:
            self.process = None

            if self._log_file is not None:
                try:
                    self._log_file.close()
                except OSError:
                    pass

                self._log_file = None

    @property
    def running(self) -> bool:
        return (
            self.process is not None
            and self.process.poll() is None
        )

    @property
    def error_output(self) -> str:
        return self._read_error_log()
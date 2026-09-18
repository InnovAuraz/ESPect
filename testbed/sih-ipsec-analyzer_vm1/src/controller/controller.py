import json
import socket
from threading import Thread

from src.agent.ipsec import build


class ControllerError(RuntimeError):
    pass


class Controller:
    def __init__(
        self,
        agent_a: str,
        agent_b: str,
        inner_a: str = "10.10.1.1",
        inner_b: str = "10.10.2.1",
        ipv6_outer_a: str = "fd00:160::128",
        ipv6_outer_b: str = "fd00:160::129",
        ipv6_inner_a: str = "fd00:10:10::1",
        ipv6_inner_b: str = "fd00:10:10::2",
    ):
        self.agent_a = agent_a
        self.agent_b = agent_b

        self.inner_a = inner_a
        self.inner_b = inner_b

        self.ipv6_outer_a = ipv6_outer_a
        self.ipv6_outer_b = ipv6_outer_b

        self.ipv6_inner_a = ipv6_inner_a
        self.ipv6_inner_b = ipv6_inner_b

    def _experiment_addresses(
        self,
        ip_version: str,
    ) -> tuple[str, str, str, str]:
        if ip_version == "ipv4":
            return (
                self.agent_a,
                self.agent_b,
                self.inner_a,
                self.inner_b,
            )

        if ip_version == "ipv6":
            return (
                self.ipv6_outer_a,
                self.ipv6_outer_b,
                self.ipv6_inner_a,
                self.ipv6_inner_b,
            )

        raise ControllerError(
            f"Unsupported IP version: {ip_version}"
        )

    def configure(
        self,
        configuration_a: dict,
        configuration_b: dict,
    ) -> None:
        send(
            self.agent_a,
            "configure",
            configuration=configuration_a,
        )

        send(
            self.agent_b,
            "configure",
            configuration=configuration_b,
        )

    def apply_ipsec(
        self,
        configuration: dict,
    ) -> None:
        (
            outer_a,
            outer_b,
            inner_a,
            inner_b,
        ) = self._experiment_addresses(
            configuration["ip_version"]
        )

        tunnel = configuration["ipsec_mode"] == "tunnel"

        if tunnel:
            config_a = build(
                configuration,
                outer_a,
                outer_b,
                local_inner_address=inner_a,
                remote_inner_address=inner_b,
            )

            config_b = build(
                configuration,
                outer_b,
                outer_a,
                local_inner_address=inner_b,
                remote_inner_address=inner_a,
            )

        else:
            config_a = build(
                configuration,
                outer_a,
                outer_b,
            )

            config_b = build(
                configuration,
                outer_b,
                outer_a,
            )

        send(
            self.agent_a,
            "apply_ipsec",
            config_text=config_a,
        )

        send(
            self.agent_b,
            "apply_ipsec",
            config_text=config_b,
        )

    def initiate_ipsec(self) -> None:
        try:
            send(
                self.agent_a,
                "initiate_ipsec",
            )
        except ControllerError as exc:
            raise ControllerError(
                str(exc)
            ) from exc

    def ipsec_status(
        self,
        host: str,
    ) -> str:
        return send(
            host,
            "ipsec_status",
        )["status"]

    def start_traffic(
        self,
        role_a: str,
        role_b: str,
        ipsec_mode: str = "transport",
        ip_version: str = "ipv4",
    ) -> None:
        errors = []

        (
            outer_a,
            outer_b,
            inner_a,
            inner_b,
        ) = self._experiment_addresses(
            ip_version
        )

        if ipsec_mode == "tunnel":
            target_a = inner_b
            target_b = inner_a

        elif ipsec_mode == "transport":
            target_a = outer_b
            target_b = outer_a

        else:
            raise ControllerError(
                f"Unsupported IPsec mode: {ipsec_mode}"
            )

        def start(
            host: str,
            target: str,
            role: str,
        ) -> None:
            try:
                send(
                    host,
                    "start",
                    target=target,
                    role=role,
                )
            except ControllerError as exc:
                errors.append(exc)

        thread_a = Thread(
            target=start,
            args=(
                self.agent_a,
                target_a,
                role_a,
            ),
        )

        thread_b = Thread(
            target=start,
            args=(
                self.agent_b,
                target_b,
                role_b,
            ),
        )

        thread_a.start()
        thread_b.start()

        thread_a.join()
        thread_b.join()

        if errors:
            raise ControllerError(
                str(errors[0])
            )

    def wait_for_traffic(self) -> None:
        errors = []

        def wait(host: str) -> None:
            try:
                send(
                    host,
                    "wait",
                )
            except ControllerError as exc:
                errors.append(exc)

        thread_a = Thread(
            target=wait,
            args=(self.agent_a,),
        )

        thread_b = Thread(
            target=wait,
            args=(self.agent_b,),
        )

        thread_a.start()
        thread_b.start()

        thread_a.join()
        thread_b.join()

        if errors:
            raise ControllerError(
                str(errors[0])
            )

    def terminate_ipsec(self) -> None:
        try:
            send(
                self.agent_a,
                "terminate_ipsec",
            )
        except ControllerError as exc:
            raise ControllerError(
                str(exc)
            ) from exc


def send(
    host: str,
    action: str,
    **data,
) -> dict:
    request = {
        "action": action,
        **data,
    }

    try:
        with socket.create_connection(
            (host, 9000),
            timeout=10,
        ) as connection:
            connection.sendall(
                json.dumps(request).encode()
            )

            response = json.loads(
                connection.recv(65536).decode()
            )

    except OSError as exc:
        raise ControllerError(
            f"Cannot communicate with agent {host}"
        ) from exc

    if not response["ok"]:
        raise ControllerError(
            f"Agent {host}: {response['error']}"
        )

    return response
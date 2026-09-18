from pathlib import Path
import csv

from src.capture import Capture, validate
from src.controller import Controller, ControllerError
from src.dataset import append
from src.experiment import (
    ExperimentSchema,
    advance,
    create,
    load,
    save,
)


ROOT = Path(__file__).resolve().parents[1]

SCHEMA_FILE = ROOT / "config" / "experiment_schema.yaml"
STATE_FILE = ROOT / "data" / "runner_state.json"

DATASET_DIR = ROOT / "dataset"
PCAP_DIR = DATASET_DIR / "pcaps"
METADATA_FILE = DATASET_DIR / "metadata.csv"

CAPTURE_INTERFACE = "ens34"

VM1 = "192.168.160.128"
VM2 = "192.168.160.129"


class RunnerError(RuntimeError):
    pass


def experiment_id(
    schema: ExperimentSchema,
    coordinate: list[int],
) -> str:
    """
    Convert a Cartesian coordinate into a stable 1-based ID.

    The last parameter changes fastest, matching advance().
    """
    index = 0
    multiplier = 1

    for i in range(len(coordinate) - 1, -1, -1):
        index += coordinate[i] * multiplier
        multiplier *= len(
            schema.values(
                schema.parameter_names[i]
            )
        )

    return f"exp{index + 1:06d}"


def initial_coordinate(
    schema: ExperimentSchema,
) -> list[int]:
    return [0] * len(schema.parameter_names)


def load_coordinate(
    schema: ExperimentSchema,
) -> list[int]:

    if not STATE_FILE.exists():
        return initial_coordinate(schema)

    coordinate = load(STATE_FILE)

    if len(coordinate) != len(schema.parameter_names):
        raise RunnerError(
            "Saved coordinate does not match "
            "the experiment schema"
        )

    if all(value == -1 for value in coordinate):
        return coordinate

    schema.configuration(coordinate)

    return coordinate


def save_coordinate(
    coordinate: list[int],
) -> None:
    save(
        STATE_FILE,
        coordinate,
    )


def dataset_contains(
    experiment_id: str,
) -> bool:
    """
    Check whether an experiment has already been committed
    to the dataset.

    This makes the Runner safe against an interruption between
    dataset.append() and state.save().
    """
    if not METADATA_FILE.exists():
        return False

    with METADATA_FILE.open(
        newline="",
        encoding="utf-8",
    ) as file:

        reader = csv.DictReader(file)

        for row in reader:
            if row.get("experiment_id") == experiment_id:
                return True

    return False


def should_skip(
    configuration: dict,
) -> bool:
    """
    Return True for configurations that should intentionally
    be skipped.

    Currently every configuration is executable.
    """
    return False


def cleanup_ipsec(
    controller: Controller,
) -> None:
    """
    Remove a possibly stale IKE_SA.

    No existing SA is acceptable.
    """
    try:
        controller.terminate_ipsec()
    except ControllerError:
        pass


def run_experiment(
    controller: Controller,
    configuration: dict,
    roles: tuple[str, str],
    pcap_path: Path,
) -> bool:

    ip_version = configuration["ip_version"]

    if ip_version == "ipv4":
        local_address = VM1
        remote_address = VM2

        capture_filter = (
            f"host {local_address} and "
            f"host {remote_address} and "
            "(udp port 500 or "
            "udp port 4500 or "
            "ip proto 50)"
        )

    elif ip_version == "ipv6":
        local_address = controller.ipv6_outer_a
        remote_address = controller.ipv6_outer_b

        capture_filter = (
            f"host {local_address} and "
            f"host {remote_address} and "
            "(udp port 500 or "
            "udp port 4500 or "
            "ip6 proto 50)"
        )

    else:
        raise RunnerError(
            f"Unsupported IP version: {ip_version}"
        )

    capture = Capture(
        interface=CAPTURE_INTERFACE,
        output=pcap_path,
        capture_filter=capture_filter,
    )

    initiated = False

    try:
        controller.configure(
            configuration,
            configuration,
        )

        controller.apply_ipsec(
            configuration,
        )

        # Capture must start before IKE negotiation.
        capture.start()

        controller.initiate_ipsec()
        initiated = True

        status_a = controller.ipsec_status(VM1)
        status_b = controller.ipsec_status(VM2)

        if "ESTABLISHED" not in status_a:
            raise RunnerError(
                "VM1 IKE_SA was not established"
            )

        if "INSTALLED" not in status_a:
            raise RunnerError(
                "VM1 CHILD_SA was not installed"
            )

        if "ESTABLISHED" not in status_b:
            raise RunnerError(
                "VM2 IKE_SA was not established"
            )

        if "INSTALLED" not in status_b:
            raise RunnerError(
                "VM2 CHILD_SA was not installed"
            )

        controller.start_traffic(
            roles[0],
            roles[1],
            configuration["ipsec_mode"],
            configuration["ip_version"],
        )

        controller.wait_for_traffic()

    finally:
        if capture.running:
            capture.stop()

        if initiated:
            cleanup_ipsec(controller)

    return validate(
        pcap_path,
        ip_version,
        local_address,
        remote_address,
    )


def main() -> None:

    if not SCHEMA_FILE.is_file():
        raise RunnerError(
            f"Experiment schema not found: {SCHEMA_FILE}"
        )

    schema = ExperimentSchema.from_yaml(
        SCHEMA_FILE
    )

    coordinate = load_coordinate(
        schema
    )

    if all(value == -1 for value in coordinate):
        print(
            "All experiments have already been completed."
        )
        return

    controller = Controller(
        VM1,
        VM2,
    )

    # Remove an SA left behind by a previous interrupted run.
    cleanup_ipsec(controller)

    try:
        while True:

            current_id = experiment_id(
                schema,
                coordinate,
            )
            
            try:
                configuration = create(
                    schema,
                    coordinate,
                )
            except ValueError as exc:
                print(
                    f"[{current_id}/{schema.size:06d}] "
                    f"skipped: {exc}"
                )

                if not advance(
                    coordinate,
                    [
                        len(schema.values(name))
                        for name in schema.parameter_names
                    ],
                ):
                    save_coordinate(
                        [-1] * len(schema.parameter_names)
                    )

                    print(
                        "All experiments completed."
                    )
                    return

                save_coordinate(coordinate)
                continue

            print(
                f"[{current_id}/{schema.size:06d}] "
                f"{configuration}"
            )

            # -------------------------------------------------
            # ALREADY COMMITTED
            # -------------------------------------------------

            if dataset_contains(current_id):

                print(
                    f"Experiment {current_id} is already "
                    "in the dataset. Resuming."
                )

                if not advance(
                    coordinate,
                    [
                        len(schema.values(name))
                        for name in schema.parameter_names
                    ],
                ):
                    save_coordinate(
                        [-1] * len(schema.parameter_names)
                    )

                    print(
                        "All experiments completed."
                    )
                    return

                save_coordinate(coordinate)
                continue

            # -------------------------------------------------
            # INTENTIONAL SKIP
            # -------------------------------------------------

            if should_skip(configuration):

                print(
                    f"Experiment {current_id} skipped."
                )

                if not advance(
                    coordinate,
                    [
                        len(schema.values(name))
                        for name in schema.parameter_names
                    ],
                ):
                    save_coordinate(
                        [-1] * len(schema.parameter_names)
                    )

                    print(
                        "All experiments completed."
                    )
                    return

                save_coordinate(coordinate)
                continue

            # -------------------------------------------------
            # EXECUTE EXPERIMENT
            # -------------------------------------------------

            pcap_path = (
                PCAP_DIR
                / f"{current_id}.pcap"
            )

            if pcap_path.exists():
                pcap_path.unlink()

            roles = schema.traffic_roles(
                configuration["traffic_type"]
            )

            try:
                valid = run_experiment(
                    controller,
                    configuration,
                    roles,
                    pcap_path,
                )

            except KeyboardInterrupt:
                if pcap_path.exists():
                    pcap_path.unlink()

                print(
                    "\nInterrupted."
                )
                print(
                    f"Experiment {current_id} "
                    "was not committed."
                )
                return

            except Exception as exc:
                if pcap_path.exists():
                    pcap_path.unlink()

                print(
                    f"Experiment {current_id} failed: {exc}"
                )
                print(
                    "Progress was not advanced."
                )
                return

            # -------------------------------------------------
            # INVALID PCAP
            # -------------------------------------------------

            if not valid:
                print(
                    f"Experiment {current_id} "
                    "produced an invalid PCAP."
                )
                print(
                    f"PCAP preserved at: {pcap_path}"
                )
                return

            # -------------------------------------------------
            # COMMIT
            # -------------------------------------------------

            append(
                METADATA_FILE,
                current_id,
                pcap_path.name,
                configuration,
            )

            print(
                f"Experiment {current_id} "
                "completed successfully."
            )

            # -------------------------------------------------
            # ADVANCE
            # -------------------------------------------------

            if not advance(
                coordinate,
                [
                    len(schema.values(name))
                    for name in schema.parameter_names
                ],
            ):
                save_coordinate(
                    [-1] * len(schema.parameter_names)
                )

                print(
                    "All experiments completed."
                )
                return

            save_coordinate(
                coordinate
            )

    except KeyboardInterrupt:

        print(
            "\nRunner interrupted."
        )
        print(
            "Saved progress remains valid."
        )

    finally:

        # Safety cleanup if Runner itself is interrupted
        # while an SA still exists.
        cleanup_ipsec(controller)


if __name__ == "__main__":
    main()